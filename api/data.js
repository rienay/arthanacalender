const fs = require('fs');
const path = require('path');
const { loadEnv, getSessionUser, sendJson, readBody, defaultInitialState } = require('./_utils');

// File cache path for local development
const LOCAL_DATA_DIR = path.resolve(process.cwd(), 'data');
const LOCAL_DATA_FILE = path.resolve(LOCAL_DATA_DIR, 'local-state.json');

// In-memory cache for serverless invocation reuse
let memoryState = null;

function getCachedState() {
  if (memoryState) return memoryState;
  try {
    if (fs.existsSync(LOCAL_DATA_FILE)) {
      const raw = fs.readFileSync(LOCAL_DATA_FILE, 'utf8');
      memoryState = JSON.parse(raw);
      return memoryState;
    }
  } catch (e) {
    // ignore
  }
  memoryState = JSON.parse(JSON.stringify(defaultInitialState));
  return memoryState;
}

function saveCachedState(newState) {
  memoryState = newState;
  try {
    if (!fs.existsSync(LOCAL_DATA_DIR)) {
      fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(LOCAL_DATA_FILE, JSON.stringify(newState, null, 2), 'utf8');
  } catch (e) {
    // In read-only serverless environment, local write may fail, memoryState retains it
  }
}

module.exports = async function handler(req, res) {
  loadEnv();

  // 1. MUST BE AUTHENTICATED
  const session = getSessionUser(req);
  if (!session) {
    return sendJson(res, 401, {
      error: 'Unauthorized: Sesi tidak valid. Silakan login terlebih dahulu.'
    });
  }

  const scriptUrl = process.env.GOOGLE_SHEETS_SCRIPT_URL;
  const scriptSecret = process.env.GOOGLE_SHEETS_SECRET || '';

  // 2. GET: Load Data
  if (req.method === 'GET') {
    if (scriptUrl) {
      try {
        const fetchUrl = new URL(scriptUrl);
        fetchUrl.searchParams.set('action', 'getState');
        if (scriptSecret) {
          fetchUrl.searchParams.set('secret', scriptSecret);
        }

        const response = await fetch(fetchUrl.toString(), {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          redirect: 'follow',
          signal: AbortSignal.timeout(12000) // 12s timeout
        });

        if (response.ok) {
          const result = await response.json();
          if (result && result.state && result.state.events) {
            saveCachedState(result.state);
            return sendJson(res, 200, {
              state: result.state,
              source: 'google_sheets',
              googleSheetsConnected: true,
              lastSynced: new Date().toISOString()
            });
          } else if (result && result.success) {
            // Google Sheets connected, but database is brand new (empty state)
            const initialState = getCachedState();
            return sendJson(res, 200, {
              state: initialState,
              source: 'local_init',
              googleSheetsConnected: true,
              message: 'Google Sheets terhubung, database siap diisi.',
              lastSynced: new Date().toISOString()
            });
          }
        }
      } catch (err) {
        console.warn('Failed to fetch from Google Sheets, falling back to cache:', err.message);
      }
    }

    // Fallback to cache / default
    const state = getCachedState();
    return sendJson(res, 200, {
      state,
      source: 'local_cache',
      googleSheetsConnected: Boolean(scriptUrl),
      warning: scriptUrl ? 'Gagal terhubung ke Google Sheets, menggunakan data cache.' : 'Google Sheets belum dikonfigurasi.',
      lastSynced: new Date().toISOString()
    });
  }

  // 3. POST: Save Data
  if (req.method === 'POST') {
    try {
      const body = await readBody(req);
      const newState = body.state;

      if (!newState || !Array.isArray(newState.events)) {
        return sendJson(res, 400, { error: 'Payload state tidak valid' });
      }

      saveCachedState(newState);

      let sheetsSynced = false;
      let sheetsError = null;

      if (scriptUrl) {
        try {
          const response = await fetch(scriptUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              action: 'saveState',
              secret: scriptSecret,
              state: newState,
              updatedAt: new Date().toISOString()
            }),
            redirect: 'follow',
            signal: AbortSignal.timeout(15000) // 15s timeout
          });

          if (response.ok) {
            const resJson = await response.json();
            if (resJson && resJson.success) {
              sheetsSynced = true;
            }
          } else {
            sheetsError = `Google Sheets returned HTTP ${response.status}`;
          }
        } catch (err) {
          console.warn('Failed to sync to Google Sheets:', err.message);
          sheetsError = err.message;
        }
      }

      return sendJson(res, 200, {
        success: true,
        message: sheetsSynced ? 'Data berhasil disimpan dan disinkronkan ke Google Sheets' : 'Data berhasil disimpan secara lokal',
        googleSheetsConnected: Boolean(scriptUrl),
        sheetsSynced,
        sheetsError
      });
    } catch (err) {
      console.error('Save state error:', err);
      return sendJson(res, 500, { error: 'Gagal menyimpan data' });
    }
  }

  return sendJson(res, 405, { error: 'Method Not Allowed' });
};
