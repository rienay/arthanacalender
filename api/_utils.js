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
      id: 1,
      client: 'Andi & Sinta',
      name: 'Akad',
      date: new Date().toISOString().slice(0, 10),
      start: '08:00',
      end: '09:30',
      service: 'Wedding Organizer',
      pic: 'Said',
      phone: '081227502548',
      location: 'Venue Andi & Sinta',
      status: 'RUNNING',
      actualStart: new Date(Date.now() - 25 * 60000).toISOString(),
      actualEnd: '',
      notes: 'Koordinasi keluarga dan vendor.',
      team: ['Said'],
      notesLog: [
        { time: '08:15', text: 'Bride sudah tiba' },
        { time: '08:30', text: 'MUA selesai' },
        { time: '08:45', text: 'Tim WO standby' }
      ]
    },
    {
      id: 2,
      client: 'Rina & Dimas',
      name: 'Bride Assistant',
      date: new Date().toISOString().slice(0, 10),
      start: '10:00',
      end: '13:00',
      service: 'Bride Assistant',
      pic: 'Ida',
      phone: '085813471247',
      location: 'Hotel Cilacap',
      status: 'READY',
      actualStart: '',
      actualEnd: '',
      notes: '',
      team: ['Ida'],
      notesLog: []
    },
    {
      id: 3,
      client: 'Client B',
      name: 'Meeting Client',
      date: new Date().toISOString().slice(0, 10),
      start: '13:00',
      end: '14:00',
      service: 'Wedding Organizer',
      pic: 'Said',
      phone: '',
      location: 'Office',
      status: 'PLANNING',
      actualStart: '',
      actualEnd: '',
      notes: 'Bahas rundown.',
      team: ['Said'],
      notesLog: []
    },
    {
      id: 4,
      client: 'Rina & Dimas',
      name: 'Content Wedding',
      date: new Date().toISOString().slice(0, 10),
      start: '15:00',
      end: '18:00',
      service: 'Wedding Content Creator',
      pic: 'Sulis',
      phone: '',
      location: 'Venue',
      status: 'READY',
      actualStart: '',
      actualEnd: '',
      notes: 'Shot list wajib.',
      team: ['Sulis'],
      notesLog: []
    },
    {
      id: 5,
      client: 'Andi & Sinta',
      name: 'Reception',
      date: new Date().toISOString().slice(0, 10),
      start: '19:00',
      end: '22:00',
      service: 'Photobooth Event',
      pic: 'Tri',
      phone: '',
      location: 'Ballroom',
      status: 'READY',
      actualStart: '',
      actualEnd: '',
      notes: 'Backdrop 3x4.',
      team: ['Tri'],
      notesLog: []
    },
    {
      id: 6,
      client: 'Budi & Nia',
      name: 'Undangan Digital',
      date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      start: '11:00',
      end: '12:00',
      service: 'Undangan Digital',
      pic: 'Rosy',
      phone: '',
      location: 'Online',
      status: 'PLANNING',
      actualStart: '',
      actualEnd: '',
      notes: 'Revisi desain.',
      team: ['Rosy'],
      notesLog: []
    }
  ],
  team: [
    { id: 1, name: 'Said', role: 'WO Team', phone: '081227502548' },
    { id: 2, name: 'Ida', role: 'Bride Assistant', phone: '085813471247' },
    { id: 3, name: 'Sulis', role: 'Content Creator', phone: '' },
    { id: 4, name: 'Tri', role: 'Photobooth Team', phone: '' },
    { id: 5, name: 'Rosy', role: 'Content Creator', phone: '' }
  ],
  clients: [
    { name: 'Andi & Sinta', phone: '081227502548' },
    { name: 'Rina & Dimas', phone: '085813471247' },
    { name: 'Client B', phone: '' },
    { name: 'Budi & Nia', phone: '' }
  ],
  tasks: [
    { id: 1, text: 'Konfirmasi vendor & venue', done: true, eventId: 1 },
    { id: 2, text: 'Cek rundown acara', done: false, eventId: 1 },
    { id: 3, text: 'Siapkan emergency kit', done: false, eventId: 1 },
    { id: 4, text: 'Upload shot list WCC', done: true, eventId: 4 },
    { id: 5, text: 'Cek perlengkapan photobooth', done: false, eventId: 5 }
  ],
  activity: [
    {
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      text: 'Dashboard siap digunakan.'
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
