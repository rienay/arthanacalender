const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Load environment variables if not already in process.env (for local dev/Vercel)
function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        content.split('\n').forEach(line => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const eqIdx = trimmed.indexOf('=');
            if (eqIdx !== -1) {
              const key = trimmed.slice(0, eqIdx).trim();
              let val = trimmed.slice(eqIdx + 1).trim();
              if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.slice(1, -1);
              }
              if (!process.env[key]) {
                process.env[key] = val;
              }
            }
          }
        });
      } catch (err) {
        // ignore
      }
    }
  }
}
loadEnv();

const SECRET_KEY = process.env.SESSION_SECRET || 'arthana_wedding_secret_key_2026_fallback';

function signToken(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', SECRET_KEY).update(data).digest('base64url');
  return `${data}.${signature}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [data, signature] = parts;
  try {
    const expectedSignature = crypto.createHmac('sha256', SECRET_KEY).update(data).digest('base64url');
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function parseCookies(req) {
  const list = {};
  const rc = req.headers.cookie;
  if (rc) {
    rc.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      const name = parts.shift().trim();
      const val = decodeURIComponent(parts.join('='));
      list[name] = val;
    });
  }
  return list;
}

function getSessionUser(req) {
  // Check cookie or Authorization Bearer header
  const cookies = parseCookies(req);
  let token = cookies['arthana_session'];
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.slice(7).trim();
  }
  return verifyToken(token);
}

function sendJson(res, statusCode, data, headers = {}) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, max-age=0',
    ...headers
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) { // 5MB limit
        reject(new Error('Body too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

const defaultInitialState = {
  events: [
    {
      id: 1792069645273,
      client: 'Yunita & Dafi',
      name: 'Intimatte Wedding',
      date: '2026-11-28',
      start: '06:00',
      end: '14:00',
      services: [
        'Wedding Organizer',
        'Bride Assistant',
        'Wedding Content Creator',
        'Photobooth Event'
      ],
      service: 'Wedding Organizer + Bride Assistant + Wedding Content Creator + Photobooth Event',
      pics: ['Said Rahman', 'Laeliya Hasanah'],
      pic: 'Said Rahman, Laeliya Hasanah',
      phone: '+62 851-6151-1869',
      location: 'Rumah mempelai wanita',
      status: 'PLANNING',
      notes: 'Meeting terdekat 21 November 2026',
      targetDurationSeconds: 28800,
      targetDurationMinutes: 480,
      team: ['Said Rahman', 'Laeliya Hasanah', 'Sulis', 'Aknes', 'Radit'],
      teamRoles: {
        'Said Rahman': '👑 Lead PIC / Koordinator Utama',
        'Laeliya Hasanah': '👑 Lead PIC / Koordinator Utama',
        'Sulis': '📸 Content Creator / WCC (Reels & Story)',
        'Aknes': '👰 Pendamping Pengantin Wanita (Bride Asst)',
        'Radit': '🖼️ Photobooth & Souvenir Officer'
      },
      notesLog: [],
      actualStart: '',
      actualEnd: ''
    },
    {
      id: 1792491100499,
      client: 'Amalia & Andra',
      name: 'Akad + Resepsi',
      date: '2026-10-20',
      start: '07:00',
      end: '17:00',
      services: ['Wedding Organizer'],
      service: 'Wedding Organizer',
      pics: [],
      pic: '',
      phone: '085786265338',
      location: 'Majenang',
      status: 'PLANNING',
      notes: '',
      targetDurationSeconds: 36000,
      targetDurationMinutes: 600,
      team: [],
      teamRoles: {},
      notesLog: [],
      actualStart: '',
      actualEnd: ''
    }
  ],
  clients: [
    { name: 'Yunita & Dafi', phone: '+62 851-6151-1869' },
    { name: 'Amalia & Andra', phone: '085786265338' }
  ],
  team: [
    { id: 1792069328230, name: 'Said Rahman', role: 'WO Team', phone: '+62 851-6151-1869' },
    { id: 1792069351499, name: 'Laeliya Hasanah', role: 'WO Team', phone: '081227502548' },
    { id: 1792069399904, name: 'Sulis', role: 'Content Creator', phone: '+62 857-2849-9745' },
    { id: 1792069431141, name: 'Aknes', role: 'Bride Assistant', phone: '+62 857-2849-9745' },
    { id: 1792069466552, name: 'Radit', role: 'Photobooth Team', phone: '‪+62 896‑2040‑5807‬' }
  ],
  tasks: [],
  activity: [
    {
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      text: 'Database tersinkronisasi dengan Google Sheets.'
    }
  ]
};

module.exports = {
  loadEnv,
  signToken,
  verifyToken,
  parseCookies,
  getSessionUser,
  sendJson,
  readBody,
  defaultInitialState
};
