/**
 * ==============================================================================
 * ARTHANA WEDDING & EVENTS - PRODUCTION OPERATIONAL WORKFLOW CONTROLLER
 * Enhanced with Real-time Team Allocation, PIC Assignment & Event Automation
 * ==============================================================================
 */

const KEY = 'wedding_event_calendar_v1';
const today = new Date();
const iso = d => d.toISOString().slice(0, 10);

let state = {
  events: [],
  team: [],
  clients: [],
  tasks: [],
  activity: []
};

let calDate = new Date(today.getFullYear(), today.getMonth(), 1);
let timerHandle = null;
let isGoogleSheetsConnected = false;
let isSaving = false;

// Preset Templates for Wedding Organizer Tasks
const TASK_TEMPLATES = {
  akad: [
    'Briefing vendor sound & dekorasi akad',
    'Cek kesiapan meja akad, kursi, & mic penghulu',
    'Standby pengantin pria, saksi & wali nikah',
    'Cek kelengkapan mahar & cincin kawin',
    'Koordinasi MUA & busana pengantin wanita'
  ],
  resepsi: [
    'Briefing MC, wedding band & lighting venue',
    'Cek persiapan catering, buffet & VIP service',
    'Standby prosesi kirab pengantin & orang tua',
    'Koordinasi spot foto panggung pelaminan & VIP',
    'Penataan souvenir & buku tamu meja depan'
  ],
  wcc: [
    'Shooting detail flatlay cincin & undangan',
    'Shooting makeup artist & first look pengantin',
    'Shooting prosesi sakral & haru akad nikah',
    'Editing reels teaser same-day wedding clip'
  ],
  photobooth: [
    'Setup lighting, kamera & backdrop photobooth',
    'Cek stok kertas print & printer standby',
    'Test shoot tamu pertama & operator standby'
  ]
};

// Quick Note Chips for Fast Field Logging
const QUICK_NOTES = [
  'Pengantin & MUA sudah standby',
  'Briefing vendor & keluarga selesai',
  'Prosesi akad nikah dimulai',
  'Akad nikah SAH 💍',
  'Sesi foto keluarga & VIP berjalan',
  'Catering refill standby lancar',
  'Acara closing & rekap tim WO'
];

// Specific Field Operational Roles for Wedding Organizer Crews
const FIELD_ROLES = [
  '👑 Lead PIC / Koordinator Utama',
  '👰 Pendamping Pengantin Wanita (Bride Asst)',
  '🤵 Pendamping Pria & Keluarga (Groom Asst)',
  '📜 Meja Akad, KUA & Penghulu Officer',
  '🍽️ Catering, Prasmanan & VIP Officer',
  '📸 Content Creator / WCC (Reels & Story)',
  '🖼️ Photobooth & Souvenir Officer',
  '🔊 Sound, Stage, MC & Lighting Runner',
  '🛡️ Tim Runner & Logistik'
];

// Available Wedding Organizer Services
const ALL_SERVICES = [
  'Wedding Organizer',
  'Bride Assistant',
  'Wedding Content Creator',
  'Undangan Pernikahan',
  'Undangan Digital',
  'Photobooth Event'
];

const DEMO_INITIAL_STATE = {
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
    { name: 'Client B', phone: '' }
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
      text: 'Contoh data demo dimuat.'
    }
  ]
};

let selectedServices = ['Wedding Organizer'];
let selectedPics = [];
let currentQuickTeamEventId = null;

// ------------------------------------------------------------------------------
// THEME SWITCHER (DEVICE PREFERENCE & PERSISTENCE)
// ------------------------------------------------------------------------------

function initTheme() {
  const saved = localStorage.getItem('arthana_theme');
  let theme = saved;
  if (!theme) {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    theme = prefersDark ? 'dark' : 'light';
  }
  applyTheme(theme);
}

function applyTheme(theme) {
  const activeTheme = (theme === 'dark') ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', activeTheme);
  localStorage.setItem('arthana_theme', activeTheme);

  // Topbar Button Icon & Tooltip
  const icon = document.getElementById('themeIcon');
  const topBtn = document.getElementById('themeToggleBtn');
  if (icon) {
    icon.textContent = activeTheme === 'dark' ? '☀️' : '🌙';
  }
  if (topBtn) {
    topBtn.setAttribute('title', activeTheme === 'dark' ? 'Beralih ke Mode Terang (☀️)' : 'Beralih ke Mode Gelap (🌙)');
  }

  // Sidebar Segmented Pill Switcher
  const pillLight = document.getElementById('themePillLight');
  const pillDark = document.getElementById('themePillDark');
  if (pillLight) pillLight.classList.toggle('active', activeTheme === 'light');
  if (pillDark) pillDark.classList.toggle('active', activeTheme === 'dark');

  // Settings Page Option Cards
  const settLight = document.getElementById('settThemeLight');
  const settDark = document.getElementById('settThemeDark');
  if (settLight) settLight.classList.toggle('active', activeTheme === 'light');
  if (settDark) settDark.classList.toggle('active', activeTheme === 'dark');

  // Backward compatibility with legacy sideThemeBtn if present
  const sideIcon = document.getElementById('sideThemeIcon');
  const sideText = document.getElementById('sideThemeText');
  if (sideIcon) sideIcon.textContent = activeTheme === 'dark' ? '☀️' : '🌙';
  if (sideText) sideText.textContent = activeTheme === 'dark' ? 'Mode Terang' : 'Mode Gelap';
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
}

function setTheme(theme) {
  applyTheme(theme);
}

// ------------------------------------------------------------------------------
// API & AUTHENTICATION
// ------------------------------------------------------------------------------

async function checkAuthAndLoadData() {
  try {
    const res = await fetch('/api/auth/verify', { method: 'GET' });
    if (res.ok) {
      const data = await res.json();
      if (data.authenticated) {
        document.body.classList.remove('locked');
        document.getElementById('loginOverlay').style.display = 'none';
        isGoogleSheetsConnected = data.googleSheetsConfigured;
        updateSheetsBadge();
        await loadData();
        return;
      }
    }
  } catch (e) {
    console.warn('Auth check error, offline or server starting:', e);
  }

  // Not authenticated
  document.body.classList.add('locked');
  document.getElementById('loginOverlay').style.display = 'flex';
}

async function handleLogin(e) {
  e.preventDefault();
  const usernameInput = document.getElementById('loginUsername');
  const passwordInput = document.getElementById('loginPassword');
  const errorEl = document.getElementById('loginError');
  const submitBtn = document.getElementById('loginBtn');

  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!username || !password) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Memverifikasi...';
  errorEl.style.display = 'none';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (res.ok && data.success) {
      document.body.classList.remove('locked');
      document.getElementById('loginOverlay').style.display = 'none';
      showToast('✓ Login berhasil. Selamat datang di ARTHANA!');
      await loadData();
    } else {
      errorEl.textContent = data.error || 'Username atau password salah';
      errorEl.style.display = 'block';
      passwordInput.value = '';
    }
  } catch (err) {
    errorEl.textContent = 'Gagal menghubungi server. Periksa koneksi Anda.';
    errorEl.style.display = 'block';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Masuk ke Dashboard';
  }
}

async function logoutArthana() {
  if (!confirm('Apakah Anda yakin ingin logout dari dashboard?')) return;
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch (e) {}
  document.body.classList.add('locked');
  location.reload();
}

function toggleLoginPassword() {
  const p = document.getElementById('loginPassword');
  if (p) p.type = p.type === 'password' ? 'text' : 'password';
}

// ------------------------------------------------------------------------------
// DATA LOADING & PERSISTENCE
// ------------------------------------------------------------------------------

async function loadData() {
  try {
    const res = await fetch('/api/data', { method: 'GET' });
    if (res.ok) {
      const result = await res.json();
      if (result && result.state) {
        state = result.state;
        isGoogleSheetsConnected = result.googleSheetsConnected;
        updateSheetsBadge();
        localStorage.setItem(KEY, JSON.stringify(state));
        renderAll();
        return;
      }
    }
  } catch (e) {
    console.warn('Gagal memuat data dari API, mencoba fallback lokal:', e);
  }

  // Fallback to local storage if API is temporarily unavailable
  const cached = localStorage.getItem(KEY);
  if (cached) {
    try {
      state = JSON.parse(cached);
    } catch (e) {}
  }
  renderAll();
}

async function save() {
  localStorage.setItem(KEY, JSON.stringify(state));

  const badge = document.getElementById('sheetsBadge');
  if (badge) {
    badge.innerHTML = `<span class="dot yellow"></span><span>Menyimpan...</span>`;
  }

  isSaving = true;
  try {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state })
    });

    if (res.ok) {
      const data = await res.json();
      isGoogleSheetsConnected = data.googleSheetsConnected;
    }
  } catch (e) {
    console.warn('Gagal sync ke server:', e);
  } finally {
    isSaving = false;
    updateSheetsBadge();
  }
}

function updateSheetsBadge() {
  const badge = document.getElementById('sheetsBadge');
  if (!badge) return;

  if (isGoogleSheetsConnected) {
    badge.className = 'sheets-badge connected';
    badge.innerHTML = `<span class="dot green"></span><span>Google Sheets Terhubung</span>`;
    badge.title = 'Data tersinkronisasi 2 arah otomatis dengan Google Sheets.';
  } else {
    badge.className = 'sheets-badge disconnected';
    badge.innerHTML = `<span class="dot yellow"></span><span>Mode Lokal (Klik untuk Setup Sheets)</span>`;
    badge.title = 'Klik untuk melihat petunjuk cara menghubungkan Google Sheets.';
  }
}

function explainGoogleSheets() {
  if (isGoogleSheetsConnected) {
    showToast('✓ Google Sheets aktif & tersinkronisasi otomatis');
  } else {
    alert(
      "CARA MENGHUBUNGKAN GOOGLE SHEETS:\n\n" +
      "1. Buka file 'google-apps-script.js' di proyek ini.\n" +
      "2. Buat Google Sheet baru, buka Extensions > Apps Script.\n" +
      "3. Paste kode tersebut dan Deploy as Web App (Access: Anyone).\n" +
      "4. Masukkan URL Web App ke file .env.local atau Vercel Environment Variables:\n" +
      "   GOOGLE_SHEETS_SCRIPT_URL=https://script.google.com/macros/s/.../exec\n\n" +
      "Petunjuk lengkap tersedia di file PANDUAN_VERCEL_GOOGLE_SHEETS.md"
    );
  }
}

// ------------------------------------------------------------------------------
// UI HELPERS & LIVE CLOCK
// ------------------------------------------------------------------------------

function fmtDate(s) {
  if (!s) return '-';
  try {
    return new Date(s + 'T00:00:00').toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch (e) {
    return s;
  }
}

function cleanWaNumber(phone) {
  if (!phone) return '';
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('0')) clean = '62' + clean.slice(1);
  return clean;
}

function statusBadge(s) {
  let c = s === 'RUNNING' ? 'running' : s === 'READY' ? 'ready' : s === 'SELESAI' ? 'completed' : 'planning';
  let dotClass = c === 'running' ? 'green' : c === 'ready' ? 'yellow' : c === 'completed' ? 'blue' : '';
  return `<span class="badge ${c}"><span class="dot ${dotClass}"></span>${s}</span>`;
}

function showToast(t) {
  const x = document.getElementById('toast');
  if (!x) return;
  x.textContent = t;
  x.style.display = 'block';
  clearTimeout(x._timer);
  x._timer = setTimeout(() => {
    x.style.display = 'none';
  }, 2600);
}

function addActivity(text) {
  state.activity = state.activity || [];
  state.activity.unshift({
    time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    text
  });
  state.activity = state.activity.slice(0, 30);
  save();
}

function goPage(p) {
  document.querySelectorAll('.page').forEach(x => x.classList.remove('active'));
  const target = document.getElementById(p);
  if (target) target.classList.add('active');

  document.querySelectorAll('.nav a').forEach(a => {
    a.classList.toggle('active', a.dataset.page === p);
  });

  document.querySelectorAll('.bottom-nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === p);
  });

  const titles = {
    dashboard: 'Dashboard',
    calendar: 'Event Calendar',
    events: 'Event Management',
    clients: 'Data Pengantin / Clients',
    team: 'Team Management',
    tasks: 'Tasks & Checklist',
    notes: 'Live Notes & Activity',
    report: 'Report & Analytics',
    settings: 'Pengaturan & Database'
  };
  document.getElementById('pageTitle').textContent = titles[p] || (p.charAt(0).toUpperCase() + p.slice(1));

  document.querySelector('.sidebar')?.classList.remove('mobile-open');
  document.getElementById('sidebarBackdrop')?.classList.remove('active');

  renderAll();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleMobileSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  const isOpen = sidebar?.classList.toggle('mobile-open');
  if (backdrop) {
    backdrop.classList.toggle('active', !!isOpen);
  }
}

function updateLiveClock() {
  const el = document.getElementById('liveClock');
  if (!el) return;
  const now = new Date();
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  el.innerHTML = `<span>🕒</span> <span>${timeStr} WIB</span>`;
}

// ------------------------------------------------------------------------------
// SMART FORM DROPDOWNS: CLIENT DATALIST, PIC SELECT & TEAM ASSIGNMENT
// ------------------------------------------------------------------------------

function populateClientDatalist() {
  const dl = document.getElementById('clientDataList');
  if (!dl) return;
  dl.innerHTML = (state.clients || []).map(c => `<option value="${c.name}"></option>`).join('');
}

function handleClientInput(val) {
  const clientObj = (state.clients || []).find(c => c.name.toLowerCase() === val.trim().toLowerCase());
  const phoneInput = document.getElementById('fPhone');
  if (clientObj && clientObj.phone && phoneInput && !phoneInput.value) {
    phoneInput.value = clientObj.phone;
  }
}

function renderServiceMultiSelect(initialServices = null) {
  const container = document.getElementById('serviceMultiSelect');
  if (!container) return;

  if (Array.isArray(initialServices) && initialServices.length) {
    selectedServices = [...initialServices];
  } else if (!selectedServices.length) {
    selectedServices = ['Wedding Organizer'];
  }

  container.innerHTML = ALL_SERVICES.map(srv => {
    const isAct = selectedServices.includes(srv);
    return `
      <div class="service-chip ${isAct ? 'active' : ''}" onclick="toggleServiceSelection('${srv.replace(/'/g, "\\'")}')">
        <span>${isAct ? '✓' : '＋'}</span>
        <span>${srv}</span>
      </div>
    `;
  }).join('');

  const hidden = document.getElementById('fService');
  if (hidden) hidden.value = selectedServices.join(' + ');
}

function toggleServiceSelection(serviceName) {
  if (selectedServices.includes(serviceName)) {
    if (selectedServices.length > 1) {
      selectedServices = selectedServices.filter(s => s !== serviceName);
    } else {
      showToast('Minimal pilih 1 layanan acara');
      return;
    }
  } else {
    selectedServices.push(serviceName);
  }
  renderServiceMultiSelect();
}

function renderPicMultiSelect(initialPics = null) {
  const container = document.getElementById('picMultiSelect');
  if (!container) return;

  if (Array.isArray(initialPics)) {
    selectedPics = [...initialPics];
  }

  container.innerHTML = (state.team || []).map(m => {
    const isAct = selectedPics.includes(m.name);
    return `
      <div class="pic-chip ${isAct ? 'active' : ''}" onclick="togglePicSelection('${m.name.replace(/'/g, "\\'")}')">
        <div class="avatar-mini">${m.name.slice(0, 2).toUpperCase()}</div>
        <span>${m.name}</span>
        <span>${isAct ? '👑' : ''}</span>
      </div>
    `;
  }).join('') || '<div style="font-size:12px;color:var(--text-muted);padding:4px">Belum ada anggota tim terdaftar. Tambahkan di menu Team.</div>';

  const hidden = document.getElementById('fPic');
  if (hidden) hidden.value = selectedPics.join(', ');
}

function togglePicSelection(name) {
  if (selectedPics.includes(name)) {
    selectedPics = selectedPics.filter(n => n !== name);
  } else {
    selectedPics.push(name);
    // Auto check this person in team assign grid and set as Lead PIC
    const item = document.querySelector(`.team-assign-item[data-member="${name}"]`);
    if (item) {
      const cb = item.querySelector('input[type="checkbox"]');
      if (cb) {
        cb.checked = true;
        item.classList.add('selected');
      }
      const roleSel = item.querySelector('.team-role-select');
      if (roleSel) {
        roleSel.value = '👑 Lead PIC / Koordinator Utama';
      }
    }
  }
  renderPicMultiSelect();
  renderTeamAssignCheckboxes();
}

function calculateEventDuration() {
  const startVal = document.getElementById('fStart')?.value;
  const endVal = document.getElementById('fEnd')?.value;
  const wrap = document.getElementById('durationCalcWrap');
  const txt = document.getElementById('calculatedDurationText');

  if (!startVal || !endVal) {
    if (wrap) wrap.style.display = 'none';
    return 0;
  }

  const [h1, m1] = startVal.split(':').map(Number);
  const [h2, m2] = endVal.split(':').map(Number);
  let diffMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (diffMinutes <= 0) diffMinutes += 24 * 60; // overnight handling

  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;

  if (wrap) wrap.style.display = 'block';
  if (txt) txt.textContent = `${hours} Jam ${mins > 0 ? mins + ' Menit' : ''} (${diffMinutes} Menit)`;

  return diffMinutes * 60; // seconds
}

function renderTeamAssignCheckboxes(preSelectedTeam = null, preSelectedRoles = {}) {
  const container = document.getElementById('teamAssignGrid');
  if (!container) return;

  const dateVal = document.getElementById('fDate')?.value || iso(today);
  const currentEventId = +document.getElementById('eventId')?.value || null;
  const currentPic = document.getElementById('fPic')?.value || '';

  // If preSelectedTeam not provided, preserve currently checked ones & roles
  let selectedNames = preSelectedTeam;
  let roles = Object.assign({}, preSelectedRoles);
  if (!selectedNames) {
    selectedNames = [];
    container.querySelectorAll('.team-assign-item').forEach(el => {
      const cb = el.querySelector('input[type="checkbox"]');
      if (cb && cb.checked) {
        selectedNames.push(cb.value);
        const roleSel = el.querySelector('.team-role-select');
        if (roleSel) roles[cb.value] = roleSel.value;
      }
    });
  }

  let hasConflictAny = false;

  container.innerHTML = (state.team || []).map(m => {
    // Check if this member is assigned to any other event on this date
    const otherEvents = (state.events || []).filter(e => e.id !== currentEventId && e.date === dateVal && (e.team || []).includes(m.name));
    const isConflict = otherEvents.length > 0;
    if (isConflict) hasConflictAny = true;

    const isChecked = selectedNames.includes(m.name) || m.name === currentPic;
    
    // Default role determination
    let currentRole = roles[m.name];
    if (!currentRole) {
      if (m.name === currentPic) {
        currentRole = '👑 Lead PIC / Koordinator Utama';
      } else if (m.role === 'Bride Assistant') {
        currentRole = '👰 Pendamping Pengantin Wanita (Bride Asst)';
      } else if (m.role === 'Content Creator') {
        currentRole = '📸 Content Creator / WCC (Reels & Story)';
      } else if (m.role === 'Photobooth Team') {
        currentRole = '🖼️ Photobooth & Souvenir Officer';
      } else {
        currentRole = '🛡️ Tim Runner & Logistik';
      }
    }

    return `
      <div class="team-assign-item ${isChecked ? 'selected' : ''}" data-member="${m.name}">
        <div class="team-assign-header" onclick="toggleMemberSelection('${m.name}')">
          <input type="checkbox" name="teamMember" value="${m.name}" ${isChecked ? 'checked' : ''} onclick="event.stopPropagation()" onchange="handleCheckboxToggle(this)">
          <div class="team-assign-avatar">${m.name.slice(0, 2).toUpperCase()}</div>
          <div class="team-assign-info">
            <div class="team-assign-name">${m.name}</div>
            <div class="team-assign-role">${m.role}</div>
            ${isConflict ? `<div class="team-conflict-pill" title="Bertugas di event: ${otherEvents.map(x=>x.name).join(', ')}">⚠️ Ada event lain (${otherEvents.length})</div>` : ''}
          </div>
        </div>

        <div class="team-role-select-wrap">
          <label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:3px">PERAN SPESIFIK DI EVENT INI:</label>
          <select class="team-role-select" name="teamRole_${m.name}">
            ${FIELD_ROLES.map(r => `<option value="${r}" ${r === currentRole ? 'selected' : ''}>${r}</option>`).join('')}
          </select>
        </div>
      </div>
    `;
  }).join('') || '<div style="color:var(--text-muted);font-size:12px;padding:8px">Belum ada anggota tim terdaftar. Tambahkan di menu Team.</div>';

  const conflictNotice = document.getElementById('teamConflictNotice');
  if (conflictNotice) {
    conflictNotice.style.display = hasConflictAny ? 'inline-block' : 'none';
  }
}

function toggleMemberSelection(name) {
  const item = document.querySelector(`.team-assign-item[data-member="${name}"]`);
  if (!item) return;
  const cb = item.querySelector('input[type="checkbox"]');
  if (cb) {
    cb.checked = !cb.checked;
    item.classList.toggle('selected', cb.checked);
  }
}

function handleCheckboxToggle(cb) {
  const item = cb.closest('.team-assign-item');
  if (item) {
    item.classList.toggle('selected', cb.checked);
  }
}

// ------------------------------------------------------------------------------
// RENDERERS (EXACT MENU & FLOW)
// ------------------------------------------------------------------------------

function renderDashboard() {
  const d = iso(today);
  const ev = (state.events || []).filter(e => e.date === d);
  const run = ev.filter(e => e.status === 'RUNNING').length;
  const ready = ev.filter(e => e.status === 'READY').length;
  const done = ev.filter(e => e.status === 'SELESAI').length;

  document.getElementById('todayLabel').textContent = today.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  document.getElementById('statTotal').textContent = ev.length;
  document.getElementById('statRunning').textContent = run;
  document.getElementById('statReady').textContent = ready;
  document.getElementById('statDone').textContent = done;
  document.getElementById('statTasks').textContent = (state.tasks || []).filter(t => !t.done).length;

  const todayEl = document.getElementById('todayEvents');
  todayEl.innerHTML = ev.length
    ? ev.sort((a, b) => a.start.localeCompare(b.start)).map(e => eventRow(e, true)).join('')
    : '<div style="padding:32px;text-align:center;color:var(--text-muted);font-size:13px">Tidak ada jadwal event untuk hari ini. Silakan buat event baru atau cek kalender.</div>';

  let total = (state.tasks || []).length;
  let completed = (state.tasks || []).filter(t => t.done).length;
  let pct = total ? Math.round(completed / total * 100) : 0;
  document.getElementById('progressBar').style.width = pct + '%';
  document.getElementById('progressText').textContent = pct + '%';
}

function eventRow(e, compact = false) {
  let waNumber = cleanWaNumber(e.phone);
  let waBadge = waNumber
    ? `<a href="https://wa.me/${waNumber}" target="_blank" onclick="event.stopPropagation()" class="btn-whatsapp" title="Chat WhatsApp Pengantin">💬 WA</a>`
    : '';

  let teamCount = (e.team || []).length;
  let teamBadge = teamCount
    ? `<span style="font-size:11px;font-weight:700;color:var(--text-muted);background:var(--bg-subtle);padding:2px 7px;border-radius:var(--radius-sm);border:1px solid var(--border-light)">👥 ${teamCount} Tim</span>`
    : '';

  return `
    <div class="event-row" onclick="openDetail(${e.id})">
      <div class="event-time">${e.start}</div>
      <div>
        <div class="event-title">${e.name} — ${e.client}</div>
        <div class="event-meta">
          <span>📍 ${e.location || '-'}</span>
          <span>· PIC: <b>${e.pic || '-'}</b></span>
          ${teamBadge}
          ${waBadge}
        </div>
      </div>
      <div class="service">${(e.service || '').replace('Wedding ', '')}</div>
      <div class="hide-md">${statusBadge(e.status)}</div>
      <div>
        <button class="btn small secondary" onclick="event.stopPropagation();openDetail(${e.id})">Detail</button>
      </div>
    </div>
  `;
}

function renderEvents() {
  const q = (document.getElementById('eventSearch')?.value || '').toLowerCase();
  const fStatus = document.getElementById('statusFilter')?.value || 'all';
  const fTeam = document.getElementById('teamFilter')?.value || 'all';
  const fService = document.getElementById('serviceFilter')?.value || 'all';

  // Populate teamFilter dropdown options if needed
  populateTeamFilterDropdown();

  let arr = (state.events || []).filter(e => {
    const matchStatus = fStatus === 'all' || e.status === fStatus;
    const matchTeam = fTeam === 'all' || e.pic === fTeam || (e.team || []).includes(fTeam);
    const matchService = fService === 'all' || e.service === fService;
    const searchTarget = `${e.client} ${e.name} ${e.service} ${e.pic} ${e.location} ${(e.team || []).join(' ')}`.toLowerCase();
    const matchQuery = searchTarget.includes(q);
    return matchStatus && matchTeam && matchService && matchQuery;
  });

  arr.sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));

  document.getElementById('allEvents').innerHTML = arr.length
    ? arr.map(e => eventRow(e)).join('')
    : '<div style="padding:32px;text-align:center;color:var(--text-muted);font-size:13px">Event tidak ditemukan dengan kata kunci atau filter ini.</div>';
}

function populateTeamFilterDropdown() {
  const sel = document.getElementById('teamFilter');
  if (!sel) return;
  const currentVal = sel.value;
  let html = '<option value="all">Semua Tim / PIC</option>';
  (state.team || []).forEach(m => {
    html += `<option value="${m.name}" ${m.name === currentVal ? 'selected' : ''}>${m.name} (${m.role})</option>`;
  });
  sel.innerHTML = html;
}

function renderCalendar() {
  const body = document.getElementById('calendarBody');
  const view = document.getElementById('calView').value;
  if (view === 'Bulanan') {
    renderMonth(body);
  } else {
    renderListCalendar(body, view);
  }
}

function setCalendarView(viewName) {
  const sel = document.getElementById('calView');
  if (sel) sel.value = viewName;
  document.querySelectorAll('.segmented-control button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });
  renderCalendar();
}

function renderMonth(body) {
  const y = calDate.getFullYear();
  const m = calDate.getMonth();
  const first = new Date(y, m, 1);
  const days = new Date(y, m + 1, 0).getDate();
  const prev = new Date(y, m, 0).getDate();
  const start = first.getDay();

  document.getElementById('monthTitle').textContent = calDate.toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric'
  });

  let h = '<div class="cal-grid">' + ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(x => `<div class="weekday">${x}</div>`).join('');

  for (let i = 0; i < 42; i++) {
    let n = i - start + 1;
    let date;
    if (n < 1) date = new Date(y, m - 1, prev + n);
    else if (n > days) date = new Date(y, m + 1, n - days);
    else date = new Date(y, m, n);

    let ds = iso(date);
    let ev = (state.events || []).filter(e => e.date === ds).sort((a, b) => a.start.localeCompare(b.start));
    let cls = (ds === iso(today)) ? 'today ' : '';
    if (date.getMonth() !== m) cls += 'muted-day';

    h += `
      <div class="day ${cls}" onclick="quickDate('${ds}')" title="Klik untuk tambah event pada ${ds}">
        <div class="daynum">${date.getDate()}</div>
        ${ev.map(e => `
          <div class="cal-event ${e.status === 'RUNNING' ? 'greenline' : e.status === 'READY' ? 'yellowline' : 'blueline'}" onclick="event.stopPropagation();openDetail(${e.id})">
            <b>${e.start}</b> ${e.client} · ${e.name}
          </div>
        `).join('')}
      </div>
    `;
  }
  body.innerHTML = h + '</div>';
}

function renderListCalendar(body, view) {
  const base = new Date(calDate);
  const start = view === 'Harian' ? base : new Date(base.getTime() - base.getDay() * 86400000);
  const count = view === 'Harian' ? 1 : 7;

  document.getElementById('monthTitle').textContent =
    start.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) +
    (count > 1 ? ' — ' + new Date(start.getTime() + (count - 1) * 86400000).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '');

  let h = '<div class="pad"><div class="event-list">';
  for (let i = 0; i < count; i++) {
    let d = new Date(start.getTime() + i * 86400000);
    let ds = iso(d);
    let ev = (state.events || []).filter(e => e.date === ds).sort((a, b) => a.start.localeCompare(b.start));
    h += `
      <div>
        <h4 style="margin:14px 0 8px;font-size:14px;color:var(--text-secondary);display:flex;align-items:center;gap:8px">
          <span>📅 ${d.toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long' })}</span>
          ${ev.length ? `<span class="badge planning">${ev.length} Event</span>` : ''}
        </h4>
        ${ev.map(e => eventRow(e)).join('') || '<div style="color:var(--text-muted);font-size:12.5px;padding:8px 0">Tidak ada event pada tanggal ini.</div>'}
      </div>
    `;
  }
  body.innerHTML = h + '</div></div>';
}

function changeMonth(n) {
  calDate = new Date(calDate.getFullYear(), calDate.getMonth() + n, 1);
  renderCalendar();
}

function calendarToday() {
  calDate = new Date(today.getFullYear(), today.getMonth(), 1);
  renderCalendar();
}

function quickDate(ds) {
  document.getElementById('fDate').value = ds;
  openEventModal();
}

// ------------------------------------------------------------------------------
// EVENT MODAL & CRUD (ENHANCED PIC & TEAM ASSIGNMENT)
// ------------------------------------------------------------------------------

function openEventModal(id = null, defaultClient = '', defaultPhone = '') {
  document.getElementById('eventModal').classList.add('open');
  document.getElementById('eventForm').reset();
  document.getElementById('eventId').value = id || '';
  document.getElementById('fDate').value = iso(today);
  document.getElementById('eventModalTitle').textContent = id ? 'Edit Event' : 'Buat Event Baru';

  // Populate dynamic dropdowns
  populateClientDatalist();

  let selectedTeam = [];
  let selectedRoles = {};
  let currentPics = [];
  let currentServices = ['Wedding Organizer'];

  if (id) {
    let e = (state.events || []).find(x => x.id === id);
    if (!e) return;
    [
      ['fClient', 'client'],
      ['fName', 'name'],
      ['fDate', 'date'],
      ['fStart', 'start'],
      ['fEnd', 'end'],
      ['fPhone', 'phone'],
      ['fLocation', 'location'],
      ['fStatus', 'status'],
      ['fNotes', 'notes']
    ].forEach(([a, b]) => {
      const el = document.getElementById(a);
      if (el) el.value = e[b] || '';
    });

    currentPics = e.pics || (e.pic ? e.pic.split(', ').map(s=>s.trim()).filter(Boolean) : []);
    currentServices = e.services || (e.service ? e.service.split(' + ').map(s=>s.trim()).filter(Boolean) : ['Wedding Organizer']);
    selectedTeam = e.team || [];
    selectedRoles = e.teamRoles || {};
  } else if (defaultClient) {
    document.getElementById('fClient').value = defaultClient;
    document.getElementById('fPhone').value = defaultPhone || '';
  }

  renderServiceMultiSelect(currentServices);
  renderPicMultiSelect(currentPics);
  calculateEventDuration();
  renderTeamAssignCheckboxes(selectedTeam, selectedRoles);
}

function handleEventSubmit(e) {
  e.preventDefault();
  let id = +document.getElementById('eventId').value;

  // Calculate duration
  const targetSecs = calculateEventDuration() || 0;

  // Selected Services
  const finalServices = selectedServices.length ? [...selectedServices] : ['Wedding Organizer'];
  const serviceStr = finalServices.join(' + ');

  // Selected PICs
  const finalPics = [...selectedPics];
  const picStr = finalPics.join(', ');

  // Get all checked team members and their specific roles
  let selectedTeam = [];
  let teamRoles = {};

  document.querySelectorAll('#teamAssignGrid .team-assign-item').forEach(item => {
    const cb = item.querySelector('input[type="checkbox"]');
    if (cb && cb.checked) {
      const name = cb.value;
      selectedTeam.push(name);
      const roleSel = item.querySelector('.team-role-select');
      teamRoles[name] = roleSel ? roleSel.value : 'Kru Lapangan';
    }
  });

  // Auto-include all selected PICs into team if not already checked
  finalPics.forEach(p => {
    if (!selectedTeam.includes(p)) {
      selectedTeam.push(p);
      teamRoles[p] = '👑 Lead PIC / Koordinator Utama';
    }
  });

  let obj = {
    id: id || Date.now(),
    client: document.getElementById('fClient').value.trim(),
    name: document.getElementById('fName').value.trim(),
    date: document.getElementById('fDate').value,
    start: document.getElementById('fStart').value,
    end: document.getElementById('fEnd').value,
    services: finalServices,
    service: serviceStr,
    pics: finalPics,
    pic: picStr,
    phone: document.getElementById('fPhone').value.trim(),
    location: document.getElementById('fLocation').value.trim(),
    status: document.getElementById('fStatus').value,
    notes: document.getElementById('fNotes').value.trim(),
    targetDurationSeconds: targetSecs,
    targetDurationMinutes: Math.round(targetSecs / 60),
    team: selectedTeam,
    teamRoles: teamRoles,
    notesLog: id ? ((state.events || []).find(x => x.id === id)?.notesLog || []) : [],
    actualStart: id ? ((state.events || []).find(x => x.id === id)?.actualStart || '') : '',
    actualEnd: id ? ((state.events || []).find(x => x.id === id)?.actualEnd || '') : ''
  };

  if (id) {
    state.events = (state.events || []).map(x => x.id === id ? obj : x);
  } else {
    state.events.push(obj);
  }

  // Auto add to clients if not exist
  state.clients = state.clients || [];
  if (!state.clients.find(c => c.name === obj.client)) {
    state.clients.push({ name: obj.client, phone: obj.phone });
  }

  addActivity(`${id ? 'Event diperbarui' : 'Event baru dibuat'}: ${obj.name} — ${obj.client} (PIC: ${obj.pic || 'Belum diatur'}, Layanan: ${serviceStr})`);
  save();
  closeModal('eventModal');
  renderAll();
  showToast(id ? '✓ Event berhasil diperbarui' : '✓ Event baru berhasil dibuat');
}

// ------------------------------------------------------------------------------
// EVENT DETAIL / CONTROL CENTER (MATURED FLOW)
// ------------------------------------------------------------------------------

function openDetail(id) {
  let e = (state.events || []).find(x => x.id === id);
  if (!e) return;
  document.getElementById('detailModal').classList.add('open');
  renderDetail(e);
}

function renderDetail(e) {
  let elapsed = e.actualStart ? Math.max(0, Math.floor((Date.now() - new Date(e.actualStart)) / 1000)) : 0;
  if (e.status === 'SELESAI' && e.actualStart && e.actualEnd) {
    elapsed = Math.floor((new Date(e.actualEnd) - new Date(e.actualStart)) / 1000);
  }

  // Calculate target duration from saved property or start/end times
  let targetSec = e.targetDurationSeconds;
  if (!targetSec && e.start && e.end) {
    const [h1, m1] = e.start.split(':').map(Number);
    const [h2, m2] = e.end.split(':').map(Number);
    let diffM = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (diffM <= 0) diffM += 24 * 60;
    targetSec = diffM * 60;
  }

  let remaining = targetSec ? targetSec - elapsed : 0;
  let pct = targetSec ? Math.min(100, Math.round((elapsed / targetSec) * 100)) : 0;
  let targetHours = targetSec ? (targetSec / 3600).toFixed(1).replace('.0', '') : null;

  let timerSubHtml = '';
  if (targetSec) {
    if (e.status === 'RUNNING') {
      if (remaining >= 0) {
        timerSubHtml = `⏳ Sisa Durasi: <b>${formatTimer(remaining)}</b> (Target: ${targetHours} Jam)`;
      } else {
        timerSubHtml = `<span style="color:var(--danger);font-weight:800">⚠️ Melewati Target (+${formatTimer(Math.abs(remaining))})</span>`;
      }
    } else if (e.status === 'SELESAI') {
      timerSubHtml = `✓ Target: ${targetHours} Jam · Realisasi: ${formatTimer(elapsed)}`;
    } else {
      timerSubHtml = `🎯 Target Durasi: <b>${targetHours} Jam</b> (${e.start} - ${e.end || '?'})`;
    }
  }

  let tasks = (state.tasks || []).filter(t => t.eventId === e.id);
  let doneTasks = tasks.filter(t => t.done).length;
  let waNumber = cleanWaNumber(e.phone);
  let waBtn = waNumber
    ? `<a href="https://wa.me/${waNumber}" target="_blank" class="btn-whatsapp">💬 Chat Pengantin</a>`
    : '';

  // PIC contact
  let picMember = (state.team || []).find(m => m.name === e.pic);
  let picWa = picMember && picMember.phone ? cleanWaNumber(picMember.phone) : '';
  let picWaBtn = picWa
    ? `<a href="https://wa.me/${picWa}" target="_blank" class="btn-whatsapp" title="Chat PIC ${e.pic}">💬 Hubungi PIC</a>`
    : '';

  // Assigned team pills with specific event roles & quick unassign
  let teamPills = (e.team || []).map(name => {
    let tm = (state.team || []).find(m => m.name === name);
    let tmWa = tm && tm.phone ? cleanWaNumber(tm.phone) : '';
    let roleInEvent = (e.teamRoles && e.teamRoles[name]) ? e.teamRoles[name] : (tm ? tm.role : 'Kru Lapangan');

    return `
      <div class="assigned-team-pill">
        <div class="avatar-tiny">${name.slice(0, 2).toUpperCase()}</div>
        <div class="pill-details">
          <div class="pill-name">${name} ${name === e.pic ? '👑' : ''}</div>
          <div class="pill-role">${roleInEvent}</div>
        </div>
        <div style="display:flex;align-items:center;gap:4px">
          ${tmWa ? `<a href="https://wa.me/${tmWa}?text=${encodeURIComponent('Halo Kak ' + name + ', terkait penugasan WO di event ' + e.name + ' (' + e.client + ') ...')}" target="_blank" class="btn-whatsapp" title="Chat WhatsApp ${name}">💬 WA</a>` : ''}
          <button type="button" class="btn-pill-remove" onclick="unassignTeamMember(${e.id}, '${name.replace(/'/g, "\\'")}')" title="Hapus kru dari acara ini">×</button>
        </div>
      </div>
    `;
  }).join('') || '<div style="color:var(--text-muted);font-size:12.5px;padding:8px">Belum ada tim ditugaskan. Klik tombol "＋ Tambah & Atur Tim Acara" di atas untuk menugaskan kru.</div>';

  // Lifecycle control buttons
  let controlBtnHtml = '';
  if (e.status === 'PLANNING') {
    controlBtnHtml = `
      <button class="btn warning" onclick="setEventStatus(${e.id}, 'READY')">
        <span>📢</span> <span>SET STANDBY / READY</span>
      </button>
    `;
  } else if (e.status === 'READY') {
    controlBtnHtml = `
      <div style="display:flex;flex-direction:column;gap:6px">
        <button class="btn success" onclick="startEvent(${e.id})">
          <span class="dot green" style="background:#fff"></span>
          <span>START RUNNING ACARA</span>
        </button>
        <button class="btn secondary small" onclick="setEventStatus(${e.id}, 'PLANNING')">
          Kembalikan ke Planning
        </button>
      </div>
    `;
  } else if (e.status === 'RUNNING') {
    controlBtnHtml = `
      <button class="btn danger" onclick="finishEvent(${e.id})">
        <span>🔴</span> <span>SELESAIKAN EVENT</span>
      </button>
    `;
  } else {
    controlBtnHtml = `<div class="badge completed" style="font-size:13px;padding:6px 14px">✓ Event Selesai</div>`;
  }

  // Post-Event Recap card if completed
  let recapHtml = '';
  if (e.status === 'SELESAI') {
    const startStr = e.actualStart ? new Date(e.actualStart).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';
    const endStr = e.actualEnd ? new Date(e.actualEnd).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';
    recapHtml = `
      <div class="post-event-recap">
        <h4><span>✓</span> <span>Acara Telah Selesai (Event Completed)</span></h4>
        <div class="post-event-grid">
          <div class="post-event-stat">
            <div class="label">Mulai Aktual</div>
            <div class="val">${startStr} WIB</div>
          </div>
          <div class="post-event-stat">
            <div class="label">Selesai Aktual</div>
            <div class="val">${endStr} WIB</div>
          </div>
          <div class="post-event-stat">
            <div class="label">Durasi Acara</div>
            <div class="val">${formatTimer(elapsed)}</div>
          </div>
          <div class="post-event-stat">
            <div class="label">Checklist</div>
            <div class="val">${doneTasks}/${tasks.length} Selesai</div>
          </div>
        </div>
        <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn small success" onclick="copyPostEventReport(${e.id})">📋 Salin Laporan Evaluasi</button>
          <button class="btn small secondary" onclick="reopenEvent(${e.id})">Buka Kembali Status Event</button>
        </div>
      </div>
    `;
  }

  document.getElementById('detailContent').innerHTML = `
    <!-- Hero Header -->
    <div class="detail-hero">
      <div>
        <div style="display:flex;align-items:center;gap:8px">
          ${statusBadge(e.status)}
          ${waBtn}
        </div>
        <h2 class="detail-title">${e.name} — ${e.client}</h2>
        <div class="detail-sub">📅 ${fmtDate(e.date)} · ⏰ ${e.start}–${e.end || '-'} · 📍 ${e.location || '-'}</div>
        <div class="detail-sub">
          <span>Layanan: <b>${e.service}</b> · PIC: <b>${e.pic || '-'}</b></span>
          ${picWaBtn}
        </div>
      </div>
      <div class="run-box">
        <div style="font-size:11px;font-weight:800;color:var(--text-muted);letter-spacing:1px">STOPWATCH / RUNNING TIMER</div>
        <div class="timer" id="detailTimer">${formatTimer(elapsed)}</div>
        ${targetSec ? `
          <div id="detailTimerSub" style="font-size:12px;font-weight:700;color:var(--text-secondary);margin-top:4px">${timerSubHtml}</div>
          <div class="timer-progress-wrap" style="height:6px;background:var(--border-light);border-radius:99px;overflow:hidden;margin-top:6px;width:100%">
            <div id="detailTimerBar" style="height:100%;width:${pct}%;background:${remaining < 0 ? 'var(--danger)' : 'var(--gold-primary)'};transition:width 0.3s"></div>
          </div>
        ` : ''}
        ${controlBtnHtml}
      </div>
    </div>

    <!-- 1-Click Operational Dispatch Bar -->
    <div class="dispatch-bar">
      <div style="font-size:12px;font-weight:800;color:var(--text-secondary);display:flex;align-items:center;gap:6px">
        <span>🚀</span> <span>AKSI CEPAT OPERASIONAL LAPANGAN</span>
      </div>
      <div class="dispatch-actions">
        <button class="btn-dispatch whatsapp-green" onclick="broadcastTeamBriefing(${e.id})" title="Kirim rundown dan pembagian tugas ke WhatsApp tim">
          <span>📱</span> <span>Kirim Briefing Tim (WA)</span>
        </button>
        <button class="btn-dispatch whatsapp-outline" onclick="chatClientIntro(${e.id})" title="Kirim salam dan info tim ke pengantin">
          <span>💍</span> <span>Chat Pengantin (WA)</span>
        </button>
        <button class="btn-dispatch copy-btn" onclick="copyEventSummary(${e.id})" title="Salin teks rundown & tim ke clipboard">
          <span>📋</span> <span>Salin Rundown & Tim</span>
        </button>
        <button class="btn-dispatch gcal-btn" onclick="openGoogleCalendarEvent(${e.id})" title="Buka dan pasang jadwal di Google Calendar HP">
          <span>📅</span> <span>Google Calendar</span>
        </button>
      </div>
    </div>

    ${recapHtml}

    <!-- Quick Operations Chips for Fast Real-time Field Management -->
    <div class="grid two section">
      <!-- Section 1: Checklist Tasks -->
      <div class="card pad">
        <div class="section-head">
          <div>
            <h3>Checklist Pekerjaan</h3>
            <div style="font-size:12px;color:var(--text-muted)">Kirim task baru langsung di kolom atas</div>
          </div>
          <span class="badge" style="background:var(--bg-subtle)">${doneTasks}/${tasks.length} Selesai</span>
        </div>

        <!-- Chat-style composer above checklist -->
        <form class="chat-composer" onsubmit="handleInlineAddTask(event, ${e.id})">
          <input type="text" id="inlineTaskInput_${e.id}" class="chat-composer-input" placeholder="Tulis task baru di sini... (Enter untuk kirim)" required autocomplete="off">
          <button type="submit" class="chat-composer-btn">
            <span>Kirim</span> <span>➤</span>
          </button>
        </form>

        <!-- Quick Template Buttons -->
        <div class="preset-chips" style="margin-top:10px" title="Tambah checklist otomatis sesuai template">
          <button class="preset-chip gold" onclick="applyTaskTemplate(${e.id}, 'akad')">+ Template Akad</button>
          <button class="preset-chip gold" onclick="applyTaskTemplate(${e.id}, 'resepsi')">+ Template Resepsi</button>
          <button class="preset-chip" onclick="applyTaskTemplate(${e.id}, 'wcc')">+ Template WCC</button>
          <button class="preset-chip" onclick="applyTaskTemplate(${e.id}, 'photobooth')">+ Template Booth</button>
        </div>

        <div style="margin-top:12px">
          ${tasks.map(t => `
            <div class="task ${t.done ? 'done' : ''}">
              <input type="checkbox" ${t.done ? 'checked' : ''} onchange="toggleTask(${t.id})">
              <span>${t.text}</span>
            </div>
          `).join('') || '<div style="color:var(--text-muted);font-size:12.5px;padding:8px 0">Belum ada checklist untuk event ini. Tulis di kolom atas atau pilih template.</div>'}
        </div>
      </div>

      <!-- Section 2: Live Notes Lapangan -->
      <div class="card pad">
        <div class="section-head">
          <div>
            <h3>Live Notes Lapangan</h3>
            <div style="font-size:12px;color:var(--text-muted)">Catatan real-time bertanda waktu otomatis</div>
          </div>
          <span class="badge" style="background:var(--bg-subtle)">${(e.notesLog || []).length} Catatan</span>
        </div>

        <!-- Chat-style composer above notes -->
        <form class="chat-composer" onsubmit="handleInlineAddNote(event, ${e.id})">
          <input type="text" id="inlineNoteInput_${e.id}" class="chat-composer-input" placeholder="Tulis catatan lapangan... (otomatis ada jam WIB)" required autocomplete="off">
          <button type="submit" class="chat-composer-btn">
            <span>Kirim</span> <span>➤</span>
          </button>
        </form>

        <!-- 1-Click Quick Field Chips -->
        <div class="preset-chips" style="margin-top:10px" title="Klik untuk log catatan instan dengan timestamp">
          ${QUICK_NOTES.map(text => `
            <button class="preset-chip" onclick="quickLogNote(${e.id}, '${text}')">
              <span>+</span> <span>${text}</span>
            </button>
          `).join('')}
        </div>

        <div class="notes" style="margin-top:12px">
          ${(e.notesLog || []).slice().reverse().map(n => `
            <div class="note">
              <div class="note-time">⏰ ${n.time}</div>
              <div class="note-text">${n.text}</div>
            </div>
          `).join('') || '<div style="color:var(--text-muted);font-size:12.5px;padding:8px 0">Belum ada catatan lapangan. Ketik di kolom atas atau klik chip cepat.</div>'}
        </div>
      </div>
    </div>

    <!-- Section 3: Pembagian Tim Bertugas & Struktur Lapangan -->
    <div class="card pad section">
      <div class="section-head" style="flex-wrap:wrap;gap:10px">
        <div>
          <h3>Pembagian Tim Bertugas & Struktur Lapangan</h3>
          <div style="font-size:12px;color:var(--text-muted)">Kelola & tambah kru penugasan di acara ini tanpa harus edit event.</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn small primary" onclick="openQuickTeamModal(${e.id})">
            <span>👥</span> <span>＋ Tambah & Atur Tim Acara</span>
          </button>
          <button class="btn small secondary" onclick="closeModal('detailModal');openEventModal(${e.id})">Edit Event</button>
          <button class="btn small delete" onclick="deleteEvent(${e.id})">Hapus</button>
        </div>
      </div>
      
      <div class="assigned-team-pills">
        ${teamPills}
      </div>

      <div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border-light)">
        <b style="font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.8px">Catatan Acara / Rundown:</b>
        <p style="font-size:13px;color:var(--text-secondary);margin-top:4px">${e.notes || 'Tidak ada catatan umum.'}</p>
      </div>
    </div>
  `;

  clearInterval(timerHandle);
  if (e.status === 'RUNNING') {
    timerHandle = setInterval(() => {
      const t = document.getElementById('detailTimer');
      const sub = document.getElementById('detailTimerSub');
      const bar = document.getElementById('detailTimerBar');
      if (t) {
        let sec = Math.floor((Date.now() - new Date(e.actualStart)) / 1000);
        t.textContent = formatTimer(sec);
        if (targetSec) {
          let rem = targetSec - sec;
          let p = Math.min(100, Math.round((sec / targetSec) * 100));
          if (bar) {
            bar.style.width = p + '%';
            bar.style.background = rem < 0 ? 'var(--danger)' : 'var(--gold-primary)';
          }
          if (sub) {
            if (rem >= 0) {
              sub.innerHTML = `⏳ Sisa Durasi: <b>${formatTimer(rem)}</b> (Target: ${targetHours} Jam)`;
            } else {
              sub.innerHTML = `<span style="color:var(--danger);font-weight:800">⚠️ Melewati Target (+${formatTimer(Math.abs(rem))})</span>`;
            }
          }
        }
      }
    }, 1000);
  }
}

// Quick apply checklist templates to event
function applyTaskTemplate(eventId, templateKey) {
  const tpl = TASK_TEMPLATES[templateKey];
  if (!tpl) return;
  state.tasks = state.tasks || [];

  let count = 0;
  tpl.forEach(text => {
    // avoid duplicates in same event
    if (!state.tasks.some(t => t.eventId === eventId && t.text.toLowerCase() === text.toLowerCase())) {
      state.tasks.push({
        id: Date.now() + Math.floor(Math.random() * 1000),
        text,
        done: false,
        eventId
      });
      count++;
    }
  });

  save();
  renderAll();
  const e = (state.events || []).find(x => x.id === eventId);
  if (e) renderDetail(e);
  showToast(`✓ ${count} task template berhasil ditambahkan!`);
}

// 1-Click quick log note
function quickLogNote(eventId, text) {
  const ev = (state.events || []).find(x => x.id === eventId);
  if (!ev) return;
  ev.notesLog = ev.notesLog || [];
  const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  ev.notesLog.push({ time: timeStr, text });

  addActivity(`Live Note (${ev.name}): ${text}`);
  save();
  renderAll();
  renderDetail(ev);
  showToast(`✓ Catatan tercatat: "${text}"`);
}

// Inline Chat-style Task Composer
function handleInlineAddTask(event, eventId) {
  event.preventDefault();
  const input = document.getElementById(`inlineTaskInput_${eventId}`);
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  state.tasks = state.tasks || [];
  state.tasks.push({
    id: Date.now() + Math.floor(Math.random() * 1000),
    text,
    done: false,
    eventId
  });

  const ev = (state.events || []).find(x => x.id === eventId);
  addActivity(`Task baru (${ev ? ev.name : 'Event'}): ${text}`);
  input.value = '';

  save();
  renderAll();
  if (ev) renderDetail(ev);
  showToast('✓ Task checklist baru ditambahkan!');
}

// Inline Chat-style Note Composer with timestamp
function handleInlineAddNote(event, eventId) {
  event.preventDefault();
  const input = document.getElementById(`inlineNoteInput_${eventId}`);
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  const ev = (state.events || []).find(x => x.id === eventId);
  if (!ev) return;

  ev.notesLog = ev.notesLog || [];
  const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
  ev.notesLog.push({ time: timeStr, text });

  addActivity(`Live Note (${ev.name}): ${text}`);
  input.value = '';

  save();
  renderAll();
  renderDetail(ev);
  showToast('✓ Catatan lapangan berhasil dikirim!');
}

// Quick Add / Manage Team in Event (Tanpa Edit Event Penuh)
function openQuickTeamModal(eventId) {
  const ev = (state.events || []).find(x => x.id === eventId);
  if (!ev) return;
  currentQuickTeamEventId = eventId;

  const titleEl = document.getElementById('quickTeamModalTitle');
  const subEl = document.getElementById('quickTeamModalSub');
  if (titleEl) titleEl.textContent = `Atur & Tambah Tim: ${ev.name}`;
  if (subEl) subEl.textContent = `Client: ${ev.client} (${fmtDate(ev.date)}) — Pilih kru dan atur tugas lapangan.`;

  const container = document.getElementById('quickTeamGrid');
  if (!container) return;

  const currentTeam = ev.team || [];
  const currentRoles = ev.teamRoles || {};

  container.innerHTML = (state.team || []).map(m => {
    const isChecked = currentTeam.includes(m.name);
    let currentRole = currentRoles[m.name];
    if (!currentRole) {
      if (m.name === ev.pic) {
        currentRole = '👑 Lead PIC / Koordinator Utama';
      } else if (m.role === 'Bride Assistant') {
        currentRole = '👰 Pendamping Pengantin Wanita (Bride Asst)';
      } else if (m.role === 'Content Creator') {
        currentRole = '📸 Content Creator / WCC (Reels & Story)';
      } else if (m.role === 'Photobooth Team') {
        currentRole = '🖼️ Photobooth & Souvenir Officer';
      } else {
        currentRole = '🛡️ Tim Runner & Logistik';
      }
    }

    return `
      <div class="team-assign-item ${isChecked ? 'selected' : ''}" data-member="${m.name}">
        <div class="team-assign-header" onclick="toggleQuickMemberSelection('${m.name}')">
          <input type="checkbox" name="quickTeamMember" value="${m.name}" ${isChecked ? 'checked' : ''} onclick="event.stopPropagation()" onchange="handleCheckboxToggle(this)">
          <div class="team-assign-avatar">${m.name.slice(0, 2).toUpperCase()}</div>
          <div class="team-assign-info">
            <div class="team-assign-name">${m.name} ${m.name === ev.pic ? '👑 (PIC)' : ''}</div>
            <div class="team-assign-role">${m.role}</div>
          </div>
        </div>

        <div class="team-role-select-wrap">
          <label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:3px">PERAN SPESIFIK DI EVENT INI:</label>
          <select class="team-role-select" name="quickRole_${m.name}">
            ${FIELD_ROLES.map(r => `<option value="${r}" ${r === currentRole ? 'selected' : ''}>${r}</option>`).join('')}
          </select>
        </div>
      </div>
    `;
  }).join('') || '<div style="color:var(--text-muted);font-size:12.5px;padding:12px">Belum ada data anggota tim terdaftar di menu Team.</div>';

  document.getElementById('quickTeamModal')?.classList.add('open');
}

function toggleQuickMemberSelection(name) {
  const item = document.querySelector(`#quickTeamGrid .team-assign-item[data-member="${name}"]`);
  if (!item) return;
  const cb = item.querySelector('input[type="checkbox"]');
  if (cb) {
    cb.checked = !cb.checked;
    item.classList.toggle('selected', cb.checked);
  }
}

function saveQuickTeamAssignment() {
  if (!currentQuickTeamEventId) return;
  const ev = (state.events || []).find(x => x.id === currentQuickTeamEventId);
  if (!ev) return;

  const selectedTeam = [];
  const selectedRoles = {};

  document.querySelectorAll('#quickTeamGrid .team-assign-item').forEach(el => {
    const cb = el.querySelector('input[type="checkbox"]');
    if (cb && cb.checked) {
      const name = cb.value;
      selectedTeam.push(name);
      const roleSel = el.querySelector('.team-role-select');
      if (roleSel) selectedRoles[name] = roleSel.value;
    }
  });

  ev.team = selectedTeam;
  ev.teamRoles = selectedRoles;

  addActivity(`Penugasan tim diperbarui untuk ${ev.name} (${ev.client}): ${selectedTeam.length} kru ditugaskan`);
  save();
  renderAll();
  renderDetail(ev);
  closeModal('quickTeamModal');
  showToast(`✓ Berhasil menugaskan ${selectedTeam.length} anggota tim di acara ini!`);
}

function unassignTeamMember(eventId, memberName) {
  const ev = (state.events || []).find(x => x.id === eventId);
  if (!ev) return;

  if (!confirm(`Hapus ${memberName} dari penugasan event ${ev.name}?`)) return;

  ev.team = (ev.team || []).filter(n => n !== memberName);
  if (ev.teamRoles) {
    delete ev.teamRoles[memberName];
  }

  addActivity(`Kru ${memberName} dikeluarkan dari event ${ev.name} (${ev.client})`);
  save();
  renderAll();
  renderDetail(ev);
  showToast(`✓ ${memberName} dikeluarkan dari acara`);
}

function formatTimer(s) {
  let h = Math.floor(s / 3600);
  let m = Math.floor((s % 3600) / 60);
  let x = s % 60;
  return [h, m, x].map(v => String(v).padStart(2, '0')).join(':');
}

function startEvent(id) {
  let e = (state.events || []).find(x => x.id === id);
  if (!e) return;
  e.status = 'RUNNING';
  e.actualStart = new Date().toISOString();
  e.actualEnd = '';
  addActivity(`START RUNNING: ${e.name} — ${e.client} oleh ${e.pic || 'PIC'}`);
  save();
  renderAll();
  renderDetail(e);
  showToast('✓ Event masuk status RUNNING');
}

function finishEvent(id) {
  let e = (state.events || []).find(x => x.id === id);
  if (!e) return;
  e.status = 'SELESAI';
  e.actualEnd = new Date().toISOString();
  addActivity(`EVENT SELESAI: ${e.name} — ${e.client}`);
  save();
  renderAll();
  renderDetail(e);
  showToast('✓ Event selesai dan waktu tersimpan');
}

function setEventStatus(id, newStatus) {
  let e = (state.events || []).find(x => x.id === id);
  if (!e) return;
  e.status = newStatus;
  addActivity(`Status event ${e.name} (${e.client}) diubah: ${newStatus}`);
  save();
  renderAll();
  renderDetail(e);
  showToast(`✓ Status diubah menjadi ${newStatus}`);
}

function reopenEvent(id) {
  let e = (state.events || []).find(x => x.id === id);
  if (!e) return;
  e.status = 'READY';
  e.actualEnd = '';
  addActivity(`Event dibuka kembali: ${e.name} — ${e.client}`);
  save();
  renderAll();
  renderDetail(e);
  showToast('✓ Status event dibuka kembali (READY)');
}

function broadcastTeamBriefing(id) {
  let e = (state.events || []).find(x => x.id === id);
  if (!e) return;

  const teamList = (e.team || []).map((name, idx) => {
    const role = (e.teamRoles && e.teamRoles[name]) ? e.teamRoles[name] : 'Kru Lapangan';
    const tm = (state.team || []).find(m => m.name === name);
    const phone = tm && tm.phone ? `(${tm.phone})` : '';
    return `${idx + 1}. *${name}* — ${role} ${phone}`;
  }).join('\n') || '- Belum ada tim ditugaskan -';

  const text = 
`📋 *BRIEFING OPERASIONAL WO — ARTHANA WEDDING*
━━━━━━━━━━━━━━━━━━━━━━
💍 *Client / Pengantin:* ${e.client}
🎉 *Event:* ${e.name}
🏷️ *Layanan:* ${e.service}
📅 *Tanggal:* ${fmtDate(e.date)}
⏰ *Waktu:* ${e.start} - ${e.end || 'Selesai'} WIB
📍 *Lokasi:* ${e.location || 'Venue'}
📞 *Kontak Client:* ${e.phone || '-'}
👑 *PIC Penanggung Jawab:* ${e.pic || 'Koordinator ARTHANA'}

👥 *PEMBAGIAN TUGAS TIM (ON DUTY):*
${teamList}

📝 *CATATAN / RUNDOWN:*
${e.notes || 'Sesuai rundown briefing di grup.'}
━━━━━━━━━━━━━━━━━━━━━━
_Mohon hadir standby 60 menit sebelum acara. Semangat bertugas & jaga kekompakan tim!_ ✨`;

  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => {});
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  showToast('✓ Format briefing tim disalin & WhatsApp dibuka!');
}

function chatClientIntro(id) {
  let e = (state.events || []).find(x => x.id === id);
  if (!e) return;
  let waNumber = cleanWaNumber(e.phone);
  if (!waNumber) {
    alert('Nomor WhatsApp pengantin belum diisi di event ini.');
    return;
  }

  const teamCount = (e.team || []).length;
  const text =
`Halo Kak *${e.client}*, salam hangat dari *ARTHANA Wedding & Events*! 🙏💍

Mengingatkan untuk jadwal agenda *${e.name}* pada:
📅 Tanggal: ${fmtDate(e.date)}
⏰ Jam: ${e.start} WIB
📍 Lokasi: ${e.location || 'Venue'}

Tim WO kami yang akan bertugas mendampingi Kakak:
• PIC Penanggung Jawab: *${e.pic || 'Tim ARTHANA'}*
• Total Tim Pendamping: *${teamCount} Anggota Tim*

Jika ada penyesuaian rundown atau hal yang ingin dikoordinasikan, jangan ragu untuk menghubungi kami ya Kak. Semoga lancar dan berkah acaranya! ✨`;

  window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`, '_blank');
  showToast('✓ WhatsApp pengantin dibuka!');
}

function copyEventSummary(id) {
  let e = (state.events || []).find(x => x.id === id);
  if (!e) return;

  const teamList = (e.team || []).map(name => {
    const role = (e.teamRoles && e.teamRoles[name]) ? e.teamRoles[name] : 'Kru';
    return `• ${name} (${role})`;
  }).join('\n');

  const text = 
`RUNDOWN & TIM WO ARTHANA:
Event: ${e.name} — ${e.client}
Tanggal: ${fmtDate(e.date)} (${e.start} - ${e.end || 'Selesai'})
Lokasi: ${e.location || '-'}
PIC: ${e.pic || '-'}
Tim Lapangan:
${teamList}
Catatan: ${e.notes || '-'}`;

  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('✓ Rundown & daftar tim berhasil disalin!');
    }).catch(() => {
      showToast('Rundown disiapkan');
    });
  } else {
    showToast('✓ Rundown tim siap');
  }
}

function openGoogleCalendarEvent(id) {
  let e = (state.events || []).find(x => x.id === id);
  if (!e) return;

  const title = encodeURIComponent(`${e.name || 'Acara'} — ${e.client || 'Pengantin'}`);
  const location = encodeURIComponent(e.location || '');

  // Format tanggal & waktu ke format ISO untuk Google Calendar: YYYYMMDDTHHmmss
  const dateFormatted = (e.date || '').replace(/-/g, '');
  const startTime = (e.start || '08:00').replace(':', '') + '00';
  const endTime = (e.end || '12:00').replace(':', '') + '00';
  const dates = `${dateFormatted}T${startTime}/${dateFormatted}T${endTime}`;

  const teamList = (e.team || []).map(name => {
    const role = (e.teamRoles && e.teamRoles[name]) ? e.teamRoles[name] : 'Kru';
    return `• ${name} (${role})`;
  }).join('\n');

  const details = encodeURIComponent(
    `💍 ARTHANA WEDDING & EVENTS\n` +
    `Acara: ${e.name} — ${e.client}\n` +
    `Layanan: ${e.service || '-'}\n` +
    `Lead PIC: ${e.pic || '-'}\n` +
    `WhatsApp Pengantin: ${e.phone || '-'}\n` +
    `Status: ${e.status || 'PLANNING'}\n` +
    `Catatan: ${e.notes || '-'}\n\n` +
    `👥 Tim Bertugas:\n${teamList || '-'}\n\n` +
    `⏰ Pengingat & Alarm aktif otomatis di Google Calendar.`
  );

  const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
  window.open(gcalUrl, '_blank');
  showToast('✓ Membuka Google Calendar...');
}

function copyPostEventReport(id) {
  let e = (state.events || []).find(x => x.id === id);
  if (!e) return;

  let elapsed = 0;
  if (e.actualStart && e.actualEnd) {
    elapsed = Math.floor((new Date(e.actualEnd) - new Date(e.actualStart)) / 1000);
  }

  const tasks = (state.tasks || []).filter(t => t.eventId === e.id);
  const doneTasks = tasks.filter(t => t.done).length;
  const notes = (e.notesLog || []).map(n => `[${n.time}] ${n.text}`).join('\n') || '-';

  const text =
`📊 *LAPORAN EVALUASI PASCA ACARA — ARTHANA WO*
━━━━━━━━━━━━━━━━━━━━━━
💍 *Client:* ${e.client}
🎉 *Event:* ${e.name} (${e.service})
📅 *Tanggal:* ${fmtDate(e.date)}
👑 *PIC:* ${e.pic || '-'}
👥 *Tim Bertugas:* ${(e.team || []).join(', ')}

⏱️ *WAKTU REALISASI:*
• Mulai Aktual: ${e.actualStart ? new Date(e.actualStart).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'} WIB
• Selesai Aktual: ${e.actualEnd ? new Date(e.actualEnd).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'} WIB
• Total Durasi: ${formatTimer(elapsed)}

✅ *CHECKLIST SELESAI:* ${doneTasks}/${tasks.length} task

📝 *LOG CATATAN LAPANGAN:*
${notes}
━━━━━━━━━━━━━━━━━━━━━━
_Laporan tersimpan otomatis di database ARTHANA._`;

  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('✓ Laporan pasca acara disalin ke clipboard!');
    }).catch(() => {
      showToast('Laporan disiapkan');
    });
  } else {
    showToast('✓ Laporan evaluasi siap');
  }
}

function sendTeamScheduleWhatsApp(teamId) {
  const member = (state.team || []).find(t => t.id === teamId);
  if (!member) return;
  const wa = cleanWaNumber(member.phone);
  if (!wa) {
    alert(`Nomor WhatsApp untuk ${member.name} belum diisi.`);
    return;
  }

  const myEvents = (state.events || []).filter(e => (e.team || []).includes(member.name));
  const eventList = myEvents.map((e, i) => {
    const myRole = (e.teamRoles && e.teamRoles[member.name]) ? e.teamRoles[member.name] : member.role;
    return `${i + 1}. *${fmtDate(e.date)}* (${e.start} WIB)\n   Acara: ${e.name} — ${e.client}\n   Peran: ${myRole}\n   Lokasi: ${e.location || 'Venue'}\n   Status: ${e.status}`;
  }).join('\n\n') || 'Belum ada jadwal penugasan aktif.';

  const text =
`Halo Kak *${member.name}*! 👋
Berikut rekap jadwal penugasan Wedding Organizer Anda di *ARTHANA*:

${eventList}

Mohon hadir tepat waktu dan standby sesuai rundown. Terima kasih atas dedikasinya! Semangat! ✨`;

  window.open(`https://wa.me/${wa}?text=${encodeURIComponent(text)}`, '_blank');
  showToast(`✓ Jadwal dikirim ke WhatsApp ${member.name}!`);
}

function filterEventsByTeam(teamName) {
  goPage('events');
  const sel = document.getElementById('teamFilter');
  if (sel) {
    sel.value = teamName;
  }
  renderEvents();
  showToast(`Menampilkan event untuk ${teamName}`);
}

function deleteEvent(id) {
  if (!confirm('Apakah Anda yakin ingin menghapus event ini?')) return;
  state.events = (state.events || []).filter(e => e.id !== id);
  addActivity('Event dihapus');
  save();
  closeModal('detailModal');
  renderAll();
  showToast('Event berhasil dihapus');
}

function toggleTask(id) {
  let t = (state.tasks || []).find(x => x.id === id);
  if (t) t.done = !t.done;
  save();
  renderAll();
  let e = (state.events || []).find(x => x.id === t?.eventId);
  if (e && document.getElementById('detailModal').classList.contains('open')) {
    renderDetail(e);
  }
}

function addTaskFor(eventId) {
  let text = prompt('Nama checklist task:');
  if (!text || !text.trim()) return;
  state.tasks = state.tasks || [];
  state.tasks.push({ id: Date.now(), text: text.trim(), done: false, eventId });
  save();
  renderAll();
  let e = (state.events || []).find(x => x.id === eventId);
  if (e) renderDetail(e);
}

function addQuickTask() {
  let text = prompt('Nama task checklist operasional baru:');
  if (!text || !text.trim()) return;
  state.tasks = state.tasks || [];
  state.tasks.push({ id: Date.now(), text: text.trim(), done: false, eventId: null });
  save();
  renderAll();
  showToast('✓ Task berhasil ditambahkan');
}

// ------------------------------------------------------------------------------
// CLIENTS (WITH QUICK SCHEDULE EVENT BUTTON)
// ------------------------------------------------------------------------------

function renderClients() {
  document.getElementById('clientTable').innerHTML = (state.clients || []).map(c => {
    let ev = (state.events || []).filter(e => e.client === c.name);
    let st = ev.length
      ? (ev.some(e => e.status === 'RUNNING') ? 'RUNNING' : ev.every(e => e.status === 'SELESAI') ? 'SELESAI' : 'READY')
      : '-';

    let waNumber = cleanWaNumber(c.phone);
    let waLink = waNumber
      ? `<a href="https://wa.me/${waNumber}" target="_blank" class="btn-whatsapp" title="Chat WhatsApp"><span>${c.phone}</span> ↗</a>`
      : (c.phone || '-');

    return `
      <tr>
        <td><b>${c.name}</b></td>
        <td>${waLink}</td>
        <td><span class="badge planning">${ev.length} Event</span></td>
        <td>${[...new Set(ev.map(e => e.service))].join(', ') || '-'}</td>
        <td>${st !== '-' ? statusBadge(st) : '-'}</td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="btn small primary" onclick="openEventModal(null, '${c.name.replace(/'/g, "\\'")}', '${c.phone || ''}')" title="Buat jadwal event baru untuk pengantin ini">＋ Event</button>
            ${ev[0] ? `<button class="btn small secondary" onclick="openDetail(${ev[0].id})">Lihat</button>` : ''}
            <button class="btn small delete" onclick="deleteBrideData('${encodeURIComponent(c.name)}')">Hapus</button>
          </div>
        </td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px">Belum ada data client / pengantin.</td></tr>';
}

function openClientModal() {
  document.getElementById('clientForm').reset();
  document.getElementById('clientModal').classList.add('open');
}

function handleClientSubmit(e) {
  e.preventDefault();
  state.clients = state.clients || [];
  state.clients.push({
    name: document.getElementById('cName').value.trim(),
    phone: document.getElementById('cPhone').value.trim()
  });
  save();
  closeModal('clientModal');
  renderClients();
  populateClientDatalist();
  showToast('✓ Client baru berhasil ditambahkan');
}

let pendingDeleteBride = null;

function deleteBrideData(encodedName) {
  const name = decodeURIComponent(encodedName);
  pendingDeleteBride = name;
  const el = document.getElementById('deleteBrideName');
  if (el) el.textContent = name;
  const modal = document.getElementById('deleteBrideModal');
  if (modal) modal.style.display = 'flex';
}

function closeDeleteBrideModal() {
  pendingDeleteBride = null;
  const modal = document.getElementById('deleteBrideModal');
  if (modal) modal.style.display = 'none';
}

function confirmDeleteBride() {
  if (!pendingDeleteBride) return;
  const name = pendingDeleteBride;
  state.clients = (state.clients || []).filter(c => c.name !== name);
  state.events = (state.events || []).filter(e => e.client !== name);

  if (Array.isArray(state.tasks)) {
    state.tasks = state.tasks.filter(t => {
      if (!t.eventId) return true;
      return (state.events || []).some(e => e.id === t.eventId);
    });
  }

  addActivity(`Data pengantin dihapus: ${name}`);
  save();
  closeDeleteBrideModal();
  renderAll();
  showToast('✓ Data pengantin & event terkait berhasil dihapus');
}

// ------------------------------------------------------------------------------
// TEAM (WITH REAL-TIME DUTY STATUS & CONFLICT DETECTION)
// ------------------------------------------------------------------------------

function renderTeam() {
  document.getElementById('teamCards').innerHTML = (state.team || []).map(t => {
    let ev = (state.events || []).filter(e => (e.team || []).includes(t.name));
    
    // Check for potential schedule conflict (same date with multiple events)
    let dates = ev.map(e => e.date);
    let hasConflict = dates.some((d, idx) => dates.indexOf(d) !== idx);

    // Check duty status today
    let todayEvents = ev.filter(e => e.date === iso(today));
    let isRunningNow = todayEvents.some(e => e.status === 'RUNNING');
    let hasEventToday = todayEvents.length > 0;
    let completedCount = ev.filter(e => e.status === 'SELESAI').length;

    let dutyBadgeHtml = '';
    if (isRunningNow) {
      dutyBadgeHtml = `<span class="duty-badge active"><span class="dot green"></span>On Duty (Running)</span>`;
    } else if (hasEventToday) {
      dutyBadgeHtml = `<span class="duty-badge active"><span class="dot yellow"></span>Bertugas Hari Ini</span>`;
    } else {
      dutyBadgeHtml = `<span class="duty-badge standby">Standby</span>`;
    }

    let waNumber = cleanWaNumber(t.phone);
    let waLink = waNumber
      ? `<a href="https://wa.me/${waNumber}" target="_blank" class="btn-whatsapp" style="margin-top:4px">💬 ${t.phone}</a>`
      : (t.phone || '-');

    return `
      <div class="card pad">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
          <div>
            <div style="display:flex;align-items:center;gap:8px">
              <b style="font-family:var(--font-display);font-size:18px;color:var(--text-main)">${t.name}</b>
              ${dutyBadgeHtml}
            </div>
            <div style="font-size:12px;color:var(--text-muted);font-weight:600;margin-top:2px">${t.role}</div>
            <div style="margin-top:4px">${waLink}</div>
          </div>
          <div class="avatar">${t.name.slice(0, 2).toUpperCase()}</div>
        </div>

        <!-- Workload Bar -->
        <div class="team-workload-bar">
          <span>Total Event: <b>${ev.length}</b></span>
          <span>Hari Ini: <b>${todayEvents.length}</b></span>
          <span>Selesai: <b>${completedCount}</b></span>
        </div>

        ${hasConflict ? `
          <div style="margin-top:10px;padding:6px 10px;background:var(--warning-light);border:1px solid var(--warning-border);border-radius:var(--radius-sm);color:var(--warning-text);font-size:11px;font-weight:700">
            ⚠️ Perhatian: Ada potensi bentrok jadwal di tanggal yang sama!
          </div>
        ` : ''}

        <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border-light)">
          <div style="font-size:11px;font-weight:800;color:var(--text-muted);letter-spacing:0.8px;text-transform:uppercase;margin-bottom:8px">
            Jadwal Penugasan (${ev.length})
          </div>
          ${ev.map(e => {
            const roleInEvent = (e.teamRoles && e.teamRoles[t.name]) ? e.teamRoles[t.name] : t.role;
            return `
              <div style="padding:8px 0;border-bottom:1px dashed var(--border-light);font-size:12px;cursor:pointer" onclick="openDetail(${e.id})" title="Buka Detail Event">
                <div style="display:flex;justify-content:space-between;align-items:center">
                  <b>${fmtDate(e.date)}</b> · ${e.start}
                  ${statusBadge(e.status)}
                </div>
                <div style="color:var(--primary);font-weight:700;margin-top:2px">${e.name} — ${e.client}</div>
                <div style="font-size:11px;color:var(--gold);font-weight:600;margin-top:1px">${roleInEvent}</div>
              </div>
            `;
          }).join('') || '<div style="font-size:12px;color:var(--text-muted);padding:8px 0">Belum ada penugasan event.</div>'}
        </div>

        <!-- Team Member Fast Actions -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:14px">
          <button class="btn small secondary" onclick="filterEventsByTeam('${t.name.replace(/'/g, "\\'")}')" title="Filter semua event kru ini di menu Events">🔍 Filter Event</button>
          <button class="btn small" style="background:#25d366;color:#ffffff;border:1px solid #20ba5a" onclick="sendTeamScheduleWhatsApp(${t.id})" title="Kirim rekap jadwal tugas ke WhatsApp kru">💬 WA Jadwal</button>
        </div>
        <div style="margin-top:6px">
          <button class="btn small delete" style="width:100%" onclick="deleteTeam(${t.id})">Hapus Anggota</button>
        </div>
      </div>
    `;
  }).join('') || '<div style="color:var(--text-muted);padding:24px">Belum ada anggota tim.</div>';
}

function openTeamModal() {
  document.getElementById('teamForm').reset();
  document.getElementById('teamModal').classList.add('open');
}

function handleTeamSubmit(e) {
  e.preventDefault();
  state.team = state.team || [];
  state.team.push({
    id: Date.now(),
    name: document.getElementById('tName').value.trim(),
    role: document.getElementById('tRole').value,
    phone: document.getElementById('tPhone').value.trim()
  });
  save();
  closeModal('teamModal');
  renderTeam();
  populatePicSelect();
  renderTeamAssignCheckboxes();
  showToast('✓ Anggota tim baru berhasil ditambahkan');
}

function deleteTeam(id) {
  const member = (state.team || []).find(t => t.id === id);
  if (!member) return;

  const assigned = (state.events || []).filter(e => (e.team || []).includes(member.name));
  if (assigned.length && !confirm(`"${member.name}" masih terdaftar di ${assigned.length} event. Hapus anggota dari Team dan penugasannya?`)) {
    return;
  }

  state.team = state.team.filter(t => t.id !== id);
  (state.events || []).forEach(e => {
    e.team = (e.team || []).filter(n => n !== member.name);
    if (e.pic === member.name) e.pic = '';
  });

  addActivity(`Anggota team dihapus: ${member.name}`);
  save();
  renderAll();
  populatePicSelect();
  renderTeamAssignCheckboxes();
  showToast('Anggota team berhasil dihapus');
}

// ------------------------------------------------------------------------------
// TASKS
// ------------------------------------------------------------------------------

function renderTasks() {
  let total = (state.tasks || []).length;
  let done = (state.tasks || []).filter(t => t.done).length;
  let p = total ? Math.round(done / total * 100) : 0;

  document.getElementById('taskList').innerHTML = (state.tasks || []).map(t => `
    <div class="task ${t.done ? 'done' : ''}">
      <input type="checkbox" ${t.done ? 'checked' : ''} onchange="toggleTask(${t.id})">
      <span>${t.text}</span>
      <small style="margin-left:auto;color:var(--text-muted);font-size:11px">
        ${t.eventId ? ((state.events || []).find(e => e.id === t.eventId)?.client || 'Event') : 'Umum'}
      </small>
    </div>
  `).join('') || '<div style="color:var(--text-muted);padding:14px 0">Belum ada task checklist.</div>';

  document.getElementById('taskCount').textContent = `${done}/${total} selesai`;
  document.getElementById('taskPercent').textContent = p + '%';
  document.getElementById('taskBar').style.width = p + '%';
}

// ------------------------------------------------------------------------------
// NOTES & ACTIVITY LOG
// ------------------------------------------------------------------------------

function openNoteModal(eventId) {
  let s = document.getElementById('nEvent');
  s.innerHTML = (state.events || []).map(e => `
    <option value="${e.id}" ${eventId == e.id ? 'selected' : ''}>
      ${e.date} ${e.start} — ${e.name} — ${e.client}
    </option>
  `).join('');
  document.getElementById('nText').value = '';
  document.getElementById('noteModal').classList.add('open');
}

function handleNoteSubmit(e) {
  e.preventDefault();
  let evId = +document.getElementById('nEvent').value;
  let text = document.getElementById('nText').value.trim();
  let ev = (state.events || []).find(x => x.id === evId);
  if (!ev) return;

  ev.notesLog = ev.notesLog || [];
  ev.notesLog.push({
    time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    text
  });

  addActivity(`Live Note (${ev.name}): ${text}`);
  save();
  closeModal('noteModal');
  renderAll();
  if (document.getElementById('detailModal').classList.contains('open')) {
    renderDetail(ev);
  }
  showToast('✓ Live note berhasil disimpan');
}

function renderNotes() {
  let e = (state.events || []).find(x => x.status === 'RUNNING') || (state.events || [])[0];
  document.getElementById('notesEventTitle').textContent = e ? `${e.name} — ${e.client}` : 'Pilih Event';

  document.getElementById('notesList').innerHTML = e
    ? (e.notesLog || []).slice().reverse().map(n => `
        <div class="note">
          <div class="note-time">${n.time}</div>
          <div class="note-text">${n.text}</div>
        </div>
      `).join('') || '<div style="color:var(--text-muted);font-size:12.5px;padding:12px 0">Belum ada catatan lapangan untuk event ini.</div>'
    : '<div style="color:var(--text-muted);padding:12px 0">Tidak ada event aktif.</div>';

  document.getElementById('activityLog').innerHTML = (state.activity || []).map(a => `
    <div class="note">
      <div class="note-time">${a.time}</div>
      <div class="note-text">${a.text}</div>
    </div>
  `).join('') || '<div style="color:var(--text-muted);font-size:12.5px;padding:12px 0">Belum ada riwayat aktivitas.</div>';
}

function restartActivityLog() {
  if (!confirm('Restart Activity Log? Semua riwayat aktivitas akan dikosongkan.')) return;
  state.activity = [];
  save();
  renderNotes();
  showToast('Activity Log berhasil di-restart');
}

// ------------------------------------------------------------------------------
// REPORT & ANALYTICS
// ------------------------------------------------------------------------------

function renderReport() {
  const ev = state.events || [];
  document.getElementById('rTotal').textContent = ev.length;
  document.getElementById('rDone').textContent = ev.filter(e => e.status === 'SELESAI').length;
  document.getElementById('rClients').textContent = (state.clients || []).length;
  document.getElementById('rTeam').textContent = (state.team || []).length;
  document.getElementById('rNotes').textContent = ev.reduce((n, e) => n + (e.notesLog || []).length, 0);

  document.getElementById('reportTable').innerHTML = ev.slice()
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
    .map(e => `
      <tr>
        <td><b>${fmtDate(e.date)}</b></td>
        <td>${e.client}</td>
        <td>${e.name}</td>
        <td>${e.service}</td>
        <td>${statusBadge(e.status)}</td>
        <td>${e.actualStart ? new Date(e.actualStart).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
        <td>${e.actualEnd ? new Date(e.actualEnd).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
      </tr>
    `).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px">Belum ada data untuk laporan.</td></tr>';
}

function showRunning() {
  goPage('events');
  document.getElementById('statusFilter').value = 'RUNNING';
  renderEvents();
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
  clearInterval(timerHandle);
}

function renderAll() {
  renderDashboard();
  renderEvents();
  renderCalendar();
  renderClients();
  renderTeam();
  renderTasks();
  renderNotes();
  renderReport();
  renderSettings();
}

// ------------------------------------------------------------------------------
// SETTINGS & DATABASE RESET MANAGEMENT
// ------------------------------------------------------------------------------

let activeResetAction = null;

function renderSettings() {
  const evEl = document.getElementById('settEventCount');
  const clEl = document.getElementById('settClientCount');
  const tkEl = document.getElementById('settTaskCount');
  const tmEl = document.getElementById('settTeamCount');
  const scEl = document.getElementById('settSyncStatus');

  if (evEl) evEl.textContent = (state.events || []).length;
  if (clEl) clEl.textContent = (state.clients || []).length;
  if (tkEl) tkEl.textContent = (state.tasks || []).length;
  if (tmEl) tmEl.textContent = (state.team || []).length;
  if (scEl) {
    if (isGoogleSheetsConnected) {
      scEl.textContent = 'Terhubung';
      scEl.style.color = 'var(--success)';
    } else {
      scEl.textContent = 'Mode Lokal';
      scEl.style.color = 'var(--warning)';
    }
  }
}

function openResetModal(type) {
  activeResetAction = type;
  const modal = document.getElementById('resetConfirmModal');
  const title = document.getElementById('resetModalTitle');
  const desc = document.getElementById('resetModalDesc');
  const input = document.getElementById('resetKeywordInput');
  const btn = document.getElementById('btnConfirmReset');

  if (input) input.value = '';
  if (btn) btn.disabled = true;

  if (type === 'clean_events') {
    if (title) title.textContent = 'Kosongkan Data Acara & Pengantin';
    if (desc) desc.textContent = 'Semua Event, data Pengantin, Task checklist, dan Live Notes akan dihapus permanen. Daftar anggota kru tim ARTHANA tetap dipertahankan.';
    if (btn) btn.textContent = 'Kosongkan Acara Sekarang';
  } else if (type === 'factory_reset') {
    if (title) title.textContent = 'Reset Total Sistem (Factory Reset)';
    if (desc) desc.textContent = 'PERINGATAN KERAS: Seluruh data tanpa terkecuali (Acara, Pengantin, Tim, Task, Catatan) akan DIHAPUS BERSIH menjadi database kosong baru.';
    if (btn) btn.textContent = 'Reset Total Sistem';
  } else if (type === 'demo_data') {
    if (title) title.textContent = 'Kembalikan ke Contoh Data Demo';
    if (desc) desc.textContent = 'Database saat ini akan digantikan dengan data contoh demo Wedding Organizer ARTHANA untuk keperluan simulasi.';
    if (btn) btn.textContent = 'Muat Data Demo';
  }

  if (modal) modal.style.display = 'flex';
  setTimeout(() => input && input.focus(), 100);
}

function closeResetModal() {
  activeResetAction = null;
  const modal = document.getElementById('resetConfirmModal');
  if (modal) modal.style.display = 'none';
}

function validateResetKeyword() {
  const input = document.getElementById('resetKeywordInput');
  const btn = document.getElementById('btnConfirmReset');
  if (!input || !btn) return;
  const val = input.value.trim().toUpperCase();
  btn.disabled = (val !== 'RESET');
}

async function executeResetData() {
  if (!activeResetAction) return;

  const type = activeResetAction;
  closeResetModal();

  if (type === 'clean_events') {
    state.events = [];
    state.clients = [];
    state.tasks = [];
    state.notes = [];
    state.activity = [
      {
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        text: 'Database acara & pengantin telah dibersihkan oleh Administrator.'
      }
    ];
    showToast('✓ Semua data acara & pengantin berhasil dikosongkan!');
  } else if (type === 'factory_reset') {
    state = {
      events: [],
      clients: [],
      team: [],
      tasks: [],
      activity: [
        {
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          text: 'Reset total pabrik berhasil. Database bersih siap digunakan.'
        }
      ]
    };
    showToast('✓ Sistem berhasil di-reset total ke kondisi awal!');
  } else if (type === 'demo_data') {
    state = JSON.parse(JSON.stringify(DEMO_INITIAL_STATE));
    const nowIso = new Date().toISOString().slice(0, 10);
    state.events.forEach((ev, idx) => {
      ev.date = nowIso;
      if (idx === 0) {
        ev.actualStart = new Date(Date.now() - 25 * 60000).toISOString();
      }
    });
    showToast('✓ Contoh data demo berhasil dimuat kembali!');
  }

  await save();
  renderAll();
}

function exportDataBackup() {
  try {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchor = document.createElement('a');
    const todayStr = new Date().toISOString().slice(0, 10);
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `arthana-backup-${todayStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('✓ File cadangan data (JSON) berhasil diunduh!');
  } catch (e) {
    alert('Gagal mengunduh backup: ' + e.message);
  }
}

function importDataBackup(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const parsed = JSON.parse(event.target.result);
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Format file cadangan tidak valid.');
      }
      if (!Array.isArray(parsed.events) && !Array.isArray(parsed.clients)) {
        throw new Error('Struktur file JSON tidak sesuai dengan format ARTHANA.');
      }

      state = {
        events: Array.isArray(parsed.events) ? parsed.events : [],
        clients: Array.isArray(parsed.clients) ? parsed.clients : [],
        team: Array.isArray(parsed.team) ? parsed.team : [],
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
        activity: Array.isArray(parsed.activity) ? parsed.activity : [
          { time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }), text: 'Data dipulihkan dari file cadangan.' }
        ]
      };

      await save();
      renderAll();
      showToast('✓ Database berhasil dipulihkan dari file backup!');
    } catch (err) {
      alert('Gagal memulihkan data: ' + err.message);
    } finally {
      e.target.value = '';
    }
  };
  reader.readAsText(file);
}

async function triggerSyncNow() {
  showToast('🔄 Menyinkronkan database dengan cloud...');
  await save();
  renderAll();
  showToast('✓ Sinkronisasi cloud berhasil!');
}

// ------------------------------------------------------------------------------
// INITIALIZATION & EVENT LISTENERS
// ------------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  // Theme initialization based on saved preference or device OS mode
  initTheme();
  document.getElementById('themeToggleBtn')?.addEventListener('click', toggleTheme);

  // Listen to OS theme changes if user has not set a manual override
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (!localStorage.getItem('arthana_theme')) {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    });
  }

  // Desktop sidebar navigation
  document.querySelectorAll('.nav a').forEach(a => {
    a.onclick = e => {
      e.preventDefault();
      goPage(a.dataset.page);
    };
  });

  // Mobile bottom bar navigation
  document.querySelectorAll('.bottom-nav-item').forEach(btn => {
    btn.onclick = e => {
      e.preventDefault();
      goPage(btn.dataset.page);
    };
  });

  // Forms
  document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
  document.getElementById('eventForm')?.addEventListener('submit', handleEventSubmit);
  document.getElementById('clientForm')?.addEventListener('submit', handleClientSubmit);
  document.getElementById('teamForm')?.addEventListener('submit', handleTeamSubmit);
  document.getElementById('noteForm')?.addEventListener('submit', handleNoteSubmit);

  // Live Clock
  setInterval(updateLiveClock, 1000);
  updateLiveClock();

  // Escape key to close modals
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      ['eventModal', 'detailModal', 'clientModal', 'teamModal', 'noteModal', 'quickTeamModal'].forEach(closeModal);
      closeDeleteBrideModal();
      closeResetModal();
    }
  });

  // Click outside backdrop to close
  document.querySelectorAll('.modal').forEach(m => {
    m.addEventListener('click', (e) => {
      if (e.target === m) closeModal(m.id);
    });
  });

  const delOverlay = document.getElementById('deleteBrideModal');
  if (delOverlay) {
    delOverlay.addEventListener('click', (e) => {
      if (e.target === delOverlay) closeDeleteBrideModal();
    });
  }

  const resetOverlay = document.getElementById('resetConfirmModal');
  if (resetOverlay) {
    resetOverlay.addEventListener('click', (e) => {
      if (e.target === resetOverlay) closeResetModal();
    });
  }

  // Check auth and load data
  checkAuthAndLoadData();
});
