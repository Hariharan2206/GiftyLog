/* ═══════════════════════════════════════════════════════════════
   GiftyLog — shared.js
   ═══════════════════════════════════════════════════════════════ */

/* ── Helpers ── */
const uuid    = () => crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
const nowISO  = () => new Date().toISOString();
const esc     = s  => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
/* ── Gift type emoji — keyword matched, fallback by hash ── */
const _EMOJI_KEYWORDS = [
  { keys:['cash','money','rupee','inr','dollar','currency'],       emoji:'💵' },
  { keys:['gold'],                                                  emoji:'🥇' },
  { keys:['silver'],                                               emoji:'🥈' },
  { keys:['electronic','phone','mobile','laptop','computer','gadget','device'], emoji:'📱' },
  { keys:['toy','toys','doll','lego','game','play'],               emoji:'🧸' },
  { keys:['dress','cloth','clothes','clothing','wear','saree','shirt','suit','fabric','textile'], emoji:'👗' },
  { keys:['jewel','jewelry','jewellery','ring','necklace','bangle','chain','bracelet'], emoji:'💍' },
  { keys:['sweet','sweets','food','cake','chocolate','snack'],     emoji:'🍬' },
  { keys:['book','books'],                                         emoji:'📚' },
  { keys:['watch','clock'],                                        emoji:'⌚' },
  { keys:['bag','purse','handbag'],                                emoji:'👜' },
  { keys:['shoe','shoes','footwear','sandal','chappal'],           emoji:'👟' },
  { keys:['cosmetic','makeup','perfume','beauty'],                 emoji:'💄' },
  { keys:['utensil','vessel','cookware','kitchen','steel'],        emoji:'🍳' },
  { keys:['furniture','sofa','bed','chair','table'],               emoji:'🪑' },
  { keys:['kind','gift','present','item'],                         emoji:'🎀' },
];
const _EMOJI_FALLBACK = ['🎁','🎊','🎉','🛍️','✨','🌟','💝','🎈'];

function giftTypeEmoji(type) {
  if (!type) return '🎁';
  const lower = type.toLowerCase();
  for (const { keys, emoji } of _EMOJI_KEYWORDS)
    if (keys.some(k => lower.includes(k))) return emoji;
  let h = 0;
  for (let i = 0; i < type.length; i++) h = (h * 2654435761 + type.charCodeAt(i)) >>> 0;
  return _EMOJI_FALLBACK[h % _EMOJI_FALLBACK.length];
}

/* ── Deterministic badge colors — one unique color per type ── */
const _TYPE_PALETTE = [
  { bg:'#D1FAE5', text:'#065F46', border:'#10B981' },
  { bg:'#EDE9FE', text:'#4C1D95', border:'#8B5CF6' },
  { bg:'#FEF3C7', text:'#92400E', border:'#F59E0B' },
  { bg:'#DBEAFE', text:'#1E40AF', border:'#3B82F6' },
  { bg:'#FCE7F3', text:'#9D174D', border:'#EC4899' },
  { bg:'#FEE2E2', text:'#991B1B', border:'#EF4444' },
  { bg:'#FFF7ED', text:'#9A3412', border:'#F97316' },
  { bg:'#ECFDF5', text:'#065F46', border:'#34D399' },
  { bg:'#F0F9FF', text:'#0C4A6E', border:'#38BDF8' },
  { bg:'#FDF4FF', text:'#6B21A8', border:'#C084FC' },
  { bg:'#FFF1F2', text:'#881337', border:'#FB7185' },
  { bg:'#F0FDF4', text:'#14532D', border:'#4ADE80' },
  { bg:'#FFFBEB', text:'#78350F', border:'#FCD34D' },
  { bg:'#EFF6FF', text:'#1E3A8A', border:'#60A5FA' },
  { bg:'#FDF2F8', text:'#831843', border:'#F472B6' },
  { bg:'#F5F3FF', text:'#3B0764', border:'#A78BFA' },
  { bg:'#ECFEFF', text:'#164E63', border:'#22D3EE' },
  { bg:'#F7FEE7', text:'#365314', border:'#A3E635' },
  { bg:'#FEF9C3', text:'#713F12', border:'#FACC15' },
  { bg:'#F8FAFC', text:'#0F172A', border:'#64748B' },
];

/* assign stable index per unique type seen this session */
const _typeColorMap = {};
let   _typeColorNext = 0;
function giftTypeColor(type) {
  if (!type) type = 'Other';
  if (_typeColorMap[type] === undefined)
    _typeColorMap[type] = _typeColorNext++ % _TYPE_PALETTE.length;
  return _TYPE_PALETTE[_typeColorMap[type]];
}

function giftTypeBadgeStyle(type) {
  const c = giftTypeColor(type);
  return `background:${c.bg};color:${c.text};border:1px solid ${c.border}`;
}
function giftTypeCardStyle(type) {
  const c = giftTypeColor(type);
  return `border-left:4px solid ${c.border}`;
}
function giftTypeThumbStyle(type) {
  const c = giftTypeColor(type);
  return `background:${c.bg}`;
}

const GIFT_EMOJI = new Proxy({}, { get: (_, t) => giftTypeEmoji(t) });

function fmtDate(val) {
  if (!val) return '—';
  if (typeof val === 'number') {
    const d = new Date((val - 25569) * 86400 * 1000);
    return isNaN(d) ? '—' : d.toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' });
  }
  const s = String(val).trim();
  if (!s) return '—';
  const d = new Date(s.includes('T') ? s : s + 'T00:00:00');
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' });
}

function fmt(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

function toInputDate(val) {
  if (!val) return '';
  if (typeof val === 'number') {
    const d = new Date((val - 25569) * 86400 * 1000);
    return isNaN(d) ? '' : d.toISOString().slice(0, 10);
  }
  const s = String(val).trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

async function hashPin(pin) {
  if (!window.isSecureContext || !crypto.subtle) return pin;
  const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('giftylog:' + pin));
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}


/* ═══════════════════════════════════════════════════════════════
   STATE
   ═══════════════════════════════════════════════════════════════ */
const state = {
  events:      [],
  gifts:       [],
  settings:    {},
  webAppUrl:   '',
  lockEnabled: false,
};


function loadCachedState() {
  state.webAppUrl   = typeof GIFTYLOG_WEB_APP_URL !== 'undefined' ? GIFTYLOG_WEB_APP_URL : '';
  state.secret      = typeof GIFTYLOG_SECRET      !== 'undefined' ? GIFTYLOG_SECRET      : '';
  state.lockEnabled = localStorage.getItem('giftylog_lock') === '1';
  /* seed PIN from config.js only if none stored yet */
  if (typeof GIFTYLOG_APP_PIN !== 'undefined' && GIFTYLOG_APP_PIN && !localStorage.getItem('giftylog_pin')) {
    hashPin(String(GIFTYLOG_APP_PIN)).then(h => {
      localStorage.setItem('giftylog_pin', h);
      localStorage.setItem('giftylog_lock', '1');
      state.lockEnabled = true;
    });
  }
}

/* ═══════════════════════════════════════════════════════════════
   GIFTER INSIGHT POPUP
   ═══════════════════════════════════════════════════════════════ */
function setupGifterSearch({ inputId, getGifts }) {
  const input = document.getElementById(inputId);
  if (!input) return;

  /* inject floating panel once into body */
  let popup = document.getElementById('gifter-insight');
  if (!popup) {
    popup = document.createElement('div');
    popup.id = 'gifter-insight';
    popup.className = 'gifter-insight hidden';
    document.body.appendChild(popup);
  }

  function hide() { popup.classList.add('hidden'); }

  function show(q) {
    if (!q || q.length < 2) { hide(); return; }
    const parts    = q.split(',').map(p => p.trim()).filter(Boolean);
    const namePart = parts[0] || '';
    const addrPart = parts[1] || '';
    const pool     = getGifts();
    let matched    = namePart ? pool.filter(g => (g.gifterName || '').toLowerCase().includes(namePart)) : [...pool];
    if (addrPart)  matched = matched.filter(g => (g.address || '').toLowerCase().includes(addrPart));
    if (!matched.length) { hide(); return; }

    /* distinct persons by name+address */
    const persons = [...new Map(matched.map(g =>
      [`${(g.gifterName||'').toLowerCase()}|${(g.address||'').toLowerCase()}`, g]
    )).values()];
    if (persons.length !== 1) { hide(); return; }

    const person = persons[0];
    const byType = {};
    for (const g of matched) {
      const t = g.giftType || 'Other';
      if (!byType[t]) byType[t] = { count: 0, qty: 0 };
      byType[t].count++;
      byType[t].qty += parseFloat(g.quantity) || 0;
    }
    const types     = Object.entries(byType).sort((a, b) => b[1].qty - a[1].qty);
    const maxQty    = Math.max(...types.map(([,v]) => v.qty), 1);
    const cashTotal = byType['Cash']?.qty || 0;

    popup.innerHTML = `
      <div class="gi-header">
        <div>
          <div class="gi-name">${esc(person.gifterName)}</div>
          ${person.address ? `<div class="gi-address">📍 ${esc(person.address)}</div>` : ''}
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="gi-count">${matched.length} gift${matched.length !== 1 ? 's' : ''}</span>
          <button class="gi-close" onclick="document.getElementById('gifter-insight').classList.add('hidden')">
            <i class="ti ti-x"></i>
          </button>
        </div>
      </div>
      ${cashTotal ? `<div class="gi-cash">💰 Total Cash: <b>₹${cashTotal.toLocaleString('en-IN')}</b></div>` : ''}
      <div class="gi-rows">
        ${types.map(([type, { count, qty }]) => {
          const pct = Math.round((qty / maxQty) * 100) || 8;
          const em  = giftTypeEmoji(type);
          const c   = giftTypeColor(type);
          return `
            <div class="gi-row">
              <span class="gi-type-label">
                <span class="gi-emoji">${em}</span>
                <span class="gi-type-name">${esc(type)}</span>
                <span class="gi-type-count">${count}</span>
              </span>
              <div class="gi-bar-wrap">
                <div class="gi-bar" style="width:${pct}%;background:${c.border}"></div>
              </div>
              <span class="gi-qty" style="color:${c.border}">${qty > 0 ? qty.toLocaleString('en-IN') : '—'}</span>
            </div>`;
        }).join('')}
      </div>`;
    popup.classList.remove('hidden');
  }

  input.addEventListener('input',  () => show(input.value.trim().toLowerCase()));
  input.addEventListener('focus',  () => show(input.value.trim().toLowerCase()));
  input.addEventListener('keydown', e => { if (e.key === 'Escape') hide(); });
}

/* ═══════════════════════════════════════════════════════════════
   API
   ═══════════════════════════════════════════════════════════════ */
async function apiCall(payload) {
  const url = state.webAppUrl;
  if (!url || url === 'PASTE_YOUR_SCRIPT_URL_HERE') throw new Error('No backend URL. Go to Settings ⚙️');
  setSyncing(true);
  try {
    const res  = await fetch(url, { method: 'POST', body: JSON.stringify({ ...payload, secret: state.secret }) });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json;
  } finally {
    setSyncing(false);
  }
}

function _showLoading() { document.getElementById('gl-loading')?.classList.add('show'); }
function _hideLoading() { document.getElementById('gl-loading')?.classList.remove('show'); }

async function loadAll() {
  _showLoading();
  try {
    const data     = await apiCall({ action: 'getAll' });
    state.events   = data.events   || [];
    state.gifts    = data.gifts    || [];
    state.settings = data.settings || {};
    /* apply server PIN and lock state to localStorage */
    if ('pin_hash' in state.settings) {
      if (state.settings.pin_hash) localStorage.setItem('giftylog_pin', state.settings.pin_hash);
      else localStorage.removeItem('giftylog_pin');
    }
    if ('lock_enabled' in state.settings) {
      const on = state.settings.lock_enabled === '1';
      state.lockEnabled = on;
      localStorage.setItem('giftylog_lock', on ? '1' : '0');
    }
    /* pre-seed type colors alphabetically so they're stable across reloads */
    [...new Set(state.gifts.map(g => g.giftType).filter(Boolean))].sort()
      .forEach(t => giftTypeColor(t));
    _hideLoading();
    /* show PIN overlay AFTER data is loaded so pages render correctly behind it */
    if (state.lockEnabled && localStorage.getItem('giftylog_pin') && !sessionStorage.getItem('gl_unlocked')) {
      showPinOverlay();
    }
    return true;
  } catch (err) {
    _hideLoading();
    showToast(err.message, 'error');
    return false;
  }
}

async function saveSetting(key, value) {
  await apiCall({ action: 'saveSetting', key, value });
  state.settings[key] = value;
}

async function saveEvent(evt) {
  await apiCall({ action: 'saveEvent', event: evt });
  const idx = state.events.findIndex(e => e.id === evt.id);
  if (idx >= 0) state.events[idx] = evt; else state.events.push(evt);
}

async function deleteEvent(id) {
  await apiCall({ action: 'deleteEvent', id });
  state.events = state.events.filter(e => e.id !== id);
  state.gifts  = state.gifts.filter(g => g.eventId !== id);
}

async function saveGift(gift) {
  await apiCall({ action: 'saveGift', gift });
  const idx = state.gifts.findIndex(g => g.id === gift.id);
  if (idx >= 0) state.gifts[idx] = gift; else state.gifts.push(gift);
}

async function deleteGift(id) {
  await apiCall({ action: 'deleteGift', id });
  state.gifts = state.gifts.filter(g => g.id !== id);
}

/* ═══════════════════════════════════════════════════════════════
   TOAST & SYNC BADGE
   ═══════════════════════════════════════════════════════════════ */
let _toastTimer;
function showToast(msg, type = '') {
  const t = document.getElementById('gl-toast');
  if (!t) return;
  t.textContent = msg;
  t.className = `gl-toast show ${type}`;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { t.className = 'gl-toast'; }, 2600);
}

function setSyncing(on) {
  document.getElementById('gl-sync')?.classList.toggle('show', on);
}

/* ═══════════════════════════════════════════════════════════════
   SIDEBAR
   ═══════════════════════════════════════════════════════════════ */
let _deferredInstall = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  _deferredInstall = e;
  document.getElementById('btn-install-pwa')?.classList.remove('hidden');
  document.getElementById('btn-install-sheet')?.classList.remove('hidden');
});
window.addEventListener('appinstalled', () => {
  _deferredInstall = null;
  document.getElementById('btn-install-pwa')?.classList.add('hidden');
  document.getElementById('btn-install-sheet')?.classList.add('hidden');
});

function renderSidebar(active) {
  const mount = document.getElementById('sidebar-mount');
  if (!mount) return;
  const links = [
    { id: 'overview', href: 'index.html',  icon: 'ti-layout-dashboard', label: 'Overview' },
    { id: 'events',   href: 'events.html', icon: 'ti-calendar-event',   label: 'Events'   },
    { id: 'gifts',    href: 'gifts.html',  icon: 'ti-gift',             label: 'Gifts'    },
  ];
  mount.innerHTML = `
    <nav id="sidebar">
      <a href="index.html" class="sidebar-brand" style="text-decoration:none;display:flex;align-items:center;gap:6px"><i class="ti ti-gift" style="font-size:1.2rem"></i>GiftyLog</a>
      <div class="sidebar-nav">
        ${links.map(l => `
          <a href="${l.href}" class="nav-item${active === l.id ? ' active' : ''}">
            <span class="nav-icon"><i class="ti ${l.icon}"></i></span>${l.label}
          </a>`).join('')}
      </div>
      <div class="sidebar-bottom">
        <!-- Desktop: install + settings stacked -->
        <button id="btn-install-pwa" class="nav-item sidebar-desktop-only hidden" style="width:100%;background:none;text-align:left">
          <span class="nav-icon"><i class="ti ti-download"></i></span>Install App
        </button>
        <a href="settings.html" class="nav-item sidebar-desktop-only${active === 'settings' ? ' active' : ''}" style="width:100%">
          <span class="nav-icon"><i class="ti ti-settings"></i></span>Settings
        </a>
        <!-- Mobile: single More button -->
        <button id="btn-more" class="nav-item sidebar-mobile-only">
          <span class="nav-icon"><i class="ti ti-dots"></i></span>More
        </button>
      </div>
    </nav>`;

  document.getElementById('btn-install-pwa')?.addEventListener('click', _triggerInstall);
  if (_deferredInstall) document.getElementById('btn-install-pwa')?.classList.remove('hidden');
  document.getElementById('btn-more')?.addEventListener('click', openMoreSheet);
}

async function _triggerInstall() {
  if (!_deferredInstall) return;
  _deferredInstall.prompt();
  const { outcome } = await _deferredInstall.userChoice;
  if (outcome === 'accepted') {
    _deferredInstall = null;
    document.getElementById('btn-install-pwa')?.classList.add('hidden');
    document.getElementById('btn-install-sheet')?.classList.add('hidden');
  }
}

function openMoreSheet() {
  document.getElementById('gl-more-backdrop')?.classList.add('open');
  document.getElementById('gl-more-sheet')?.classList.add('open');
}

function closeMoreSheet() {
  document.getElementById('gl-more-backdrop')?.classList.remove('open');
  document.getElementById('gl-more-sheet')?.classList.remove('open');
}

function injectMoreSheet(active) {
  if (document.getElementById('gl-more-sheet')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <div id="gl-more-backdrop"></div>
    <div id="gl-more-sheet">
      <div class="more-sheet-handle"></div>
      <div class="more-sheet-title">More options</div>
      <a href="settings.html" class="more-sheet-item${active === 'settings' ? ' active' : ''}">
        <i class="ti ti-settings"></i>Settings
      </a>
      <button id="btn-install-sheet" class="more-sheet-item hidden">
        <i class="ti ti-download"></i>Install App
      </button>
    </div>`);

  document.getElementById('gl-more-backdrop').addEventListener('click', closeMoreSheet);
  document.getElementById('btn-install-sheet').addEventListener('click', () => { closeMoreSheet(); _triggerInstall(); });
  if (_deferredInstall) document.getElementById('btn-install-sheet')?.classList.remove('hidden');
}

/* ═══════════════════════════════════════════════════════════════
   MODALS
   ═══════════════════════════════════════════════════════════════ */
function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.open').forEach(m => closeModal(m.id));
});

/* ── Confirm delete modal (injected once per page) ── */
let _confirmCb = null;

function confirmDelete(msg, cb) {
  let overlay = document.getElementById('gl-confirm');
  if (!overlay) {
    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal-overlay" id="gl-confirm">
        <div class="modal" style="max-width:380px">
          <div class="modal-header">
            <div class="modal-title">Confirm Delete</div>
            <button class="modal-close" onclick="closeModal('gl-confirm')"><i class="ti ti-x"></i></button>
          </div>
          <div class="modal-body">
            <p id="gl-confirm-msg" style="color:var(--text-muted);font-size:.9rem;line-height:1.6"></p>
            <div class="modal-footer">
              <button class="btn btn-ghost" onclick="closeModal('gl-confirm')">Cancel</button>
              <button class="btn btn-rose" id="gl-confirm-btn"><i class="ti ti-trash"></i> Delete</button>
            </div>
          </div>
        </div>
      </div>`);
    overlay = document.getElementById('gl-confirm');
    document.getElementById('gl-confirm-btn').addEventListener('click', async () => {
      if (!_confirmCb) return;
      const btn = document.getElementById('gl-confirm-btn');
      btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';
      try {
        await _confirmCb();
        closeModal('gl-confirm');
      } catch (err) { showToast(err.message, 'error'); }
      finally { btn.disabled = false; btn.textContent = 'Delete'; _confirmCb = null; }
    });
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal('gl-confirm'); });
  }
  document.getElementById('gl-confirm-msg').textContent = msg;
  _confirmCb = cb;
  openModal('gl-confirm');
}

/* ═══════════════════════════════════════════════════════════════
   INACTIVITY AUTO-LOCK
   ═══════════════════════════════════════════════════════════════ */
let _inactivityTimer = null;
const INACTIVITY_MS  = 1 * 60 * 1000;

function _resetInactivityTimer() {
  if (!state.lockEnabled || !localStorage.getItem('giftylog_pin')) return;
  if (!sessionStorage.getItem('gl_unlocked')) return;
  clearTimeout(_inactivityTimer);
  _inactivityTimer = setTimeout(async () => {
    sessionStorage.removeItem('gl_unlocked');
    /* fetch latest PIN from Sheet before locking so password changes propagate */
    try {
      const data = await apiCall({ action: 'getAll' });
      state.settings = data.settings || state.settings;
      if (state.settings.pin_hash) {
        localStorage.setItem('giftylog_pin', state.settings.pin_hash);
      }
      if (state.settings.lock_enabled === '0') {
        /* owner disabled lock remotely — don't lock */
        _startInactivityTimer();
        return;
      }
    } catch (_) { /* network failed — use cached PIN */ }
    showPinOverlay();
  }, INACTIVITY_MS);
}

function _startInactivityTimer() {
  if (!state.lockEnabled || !localStorage.getItem('giftylog_pin')) return;
  ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'].forEach(ev => {
    document.addEventListener(ev, _resetInactivityTimer, { passive: true });
  });
  _resetInactivityTimer();
}

/* ═══════════════════════════════════════════════════════════════
   PIN OVERLAY
   ═══════════════════════════════════════════════════════════════ */
let _pinEntry = '';

function _pinKeyHandler(e) {
  if (document.getElementById('gl-pin')?.classList.contains('hidden')) return;
  if (e.key >= '0' && e.key <= '9') _handleKey(e.key);
  else if (e.key === 'Backspace') _handleKey('back');
}

function showPinOverlay() {
  _pinEntry = '';
  clearTimeout(_inactivityTimer);
  let el = document.getElementById('gl-pin');
  if (!el) {
    document.body.insertAdjacentHTML('beforeend', `
      <div id="gl-pin">
        <div class="pin-brand">GiftyLog</div>
        <div class="pin-prompt">Enter your 4-digit PIN</div>
        <div class="pin-dots">
          <div class="pin-dot" id="pd0"></div>
          <div class="pin-dot" id="pd1"></div>
          <div class="pin-dot" id="pd2"></div>
          <div class="pin-dot" id="pd3"></div>
        </div>
        <div class="pin-keypad">
          <button class="key-btn" data-k="1">1</button>
          <button class="key-btn" data-k="2">2</button>
          <button class="key-btn" data-k="3">3</button>
          <button class="key-btn" data-k="4">4</button>
          <button class="key-btn" data-k="5">5</button>
          <button class="key-btn" data-k="6">6</button>
          <button class="key-btn" data-k="7">7</button>
          <button class="key-btn" data-k="8">8</button>
          <button class="key-btn" data-k="9">9</button>
          <button class="key-btn empty" aria-hidden="true"></button>
          <button class="key-btn" data-k="0">0</button>
          <button class="key-btn" data-k="back"><i class="ti ti-backspace"></i></button>
        </div>
        <div class="pin-error" id="gl-pin-error"></div>
      </div>`);
    document.querySelectorAll('.key-btn[data-k]').forEach(b => b.addEventListener('click', () => _handleKey(b.dataset.k)));
    document.addEventListener('keydown', _pinKeyHandler);
  }
  document.getElementById('gl-pin').classList.remove('hidden');
  _updateDots();
}

function _updateDots() {
  for (let i = 0; i < 4; i++) document.getElementById(`pd${i}`)?.classList.toggle('filled', i < _pinEntry.length);
}

async function _handleKey(k) {
  if (k === 'back') _pinEntry = _pinEntry.slice(0, -1);
  else if (_pinEntry.length < 4) _pinEntry += k;
  _updateDots();
  if (_pinEntry.length === 4) {
    const stored = localStorage.getItem('giftylog_pin');
    const hashed = await hashPin(_pinEntry);
    if (hashed === stored) {
      sessionStorage.setItem('gl_unlocked', '1');
      document.getElementById('gl-pin').classList.add('hidden');
      _startInactivityTimer();
    } else {
      document.getElementById('gl-pin-error').textContent = 'Incorrect PIN. Try again.';
      setTimeout(() => { _pinEntry = ''; _updateDots(); document.getElementById('gl-pin-error').textContent = ''; }, 800);
    }
  }
}


/* ═══════════════════════════════════════════════════════════════
   PHOTO COMPRESSION
   ═══════════════════════════════════════════════════════════════ */
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const MAX = 400;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
          else       { w = Math.round(w * MAX / h); h = MAX; }
        }
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ── Photo input wiring (call after modal HTML is in DOM) ── */
function setupPhotoInput({ inputId, previewId, b64Id, clearBtnId }) {
  const input   = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  const b64     = document.getElementById(b64Id);
  const clearBtn = document.getElementById(clearBtnId);

  function setPreview(src) {
    preview.innerHTML = src ? `<img src="${src}" alt="preview" />` : `<div class="photo-placeholder"><span>📷</span>Tap to upload / capture</div>`;
    if (clearBtn) clearBtn.style.display = src ? 'inline-flex' : 'none';
  }

  preview.addEventListener('click', () => { input.removeAttribute('capture'); input.click(); });
  document.getElementById('btn-photo-upload')?.addEventListener('click', () => { input.removeAttribute('capture'); input.click(); });
  document.getElementById('btn-photo-camera')?.addEventListener('click', () => { input.setAttribute('capture', 'environment'); input.click(); });
  if (clearBtn) clearBtn.addEventListener('click', () => { b64.value = ''; input.value = ''; setPreview(''); });

  input.addEventListener('change', async () => {
    if (!input.files[0]) return;
    try { const s = await compressImage(input.files[0]); b64.value = s; setPreview(s); }
    catch { showToast('Could not process image', 'error'); }
  });

  return { setPreview };
}

/* ═══════════════════════════════════════════════════════════════
   DARK MODE TOGGLE
   ═══════════════════════════════════════════════════════════════ */
function injectDarkToggle() {
  const saved = localStorage.getItem('gl_theme');
  if (saved === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  document.body.insertAdjacentHTML('beforeend', `
    <button id="gl-dark-toggle" title="Toggle dark mode" aria-label="Toggle dark mode">
      <i class="ti ${saved === 'dark' ? 'ti-sun' : 'ti-moon'}" id="gl-dark-icon"></i>
    </button>`);
  document.getElementById('gl-dark-toggle').addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('gl_theme', 'light');
      document.getElementById('gl-dark-icon').className = 'ti ti-moon';
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('gl_theme', 'dark');
      document.getElementById('gl-dark-icon').className = 'ti ti-sun';
    }
  });
}

/* ═══════════════════════════════════════════════════════════════
   INIT — call on every page
   ═══════════════════════════════════════════════════════════════ */
async function initApp(activePage) {
  /* apply saved theme before anything renders to avoid flash */
  if (localStorage.getItem('gl_theme') === 'dark') document.documentElement.setAttribute('data-theme', 'dark');

  document.body.insertAdjacentHTML('beforeend', `
    <div id="gl-toast"    class="gl-toast"></div>
    <div id="gl-sync"     class="gl-sync"><span class="spinner"></span> Syncing…</div>
    <div id="gl-loading"  class="gl-loading">
      <div class="gl-loading-box">
        <div class="gl-loading-spinner"></div>
        <div class="gl-loading-text">Loading…</div>
      </div>
    </div>`);
  loadCachedState();
  renderSidebar(activePage);
  injectMoreSheet(activePage);
  injectDarkToggle();
  if (state.lockEnabled && localStorage.getItem('giftylog_pin') && !sessionStorage.getItem('gl_unlocked')) {
    showPinOverlay();
  } else {
    _startInactivityTimer();
  }
}
