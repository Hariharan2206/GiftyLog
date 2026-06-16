/* ═══════════════════════════════════════════════════════════════
   GiftyLog — shared.js
   ═══════════════════════════════════════════════════════════════ */

/* ── Helpers ── */
const uuid    = () => crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
const nowISO  = () => new Date().toISOString();
const esc     = s  => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const GIFT_EMOJI = { Cash:'💵', Kind:'🎀', Gold:'🥇', Silver:'🥈', Electronics:'📱', Other:'🎁' };

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

/* ═══════════════════════════════════════════════════════════════
   CRYPTO — AES-GCM 256 via Web Crypto API
   ═══════════════════════════════════════════════════════════════ */
let _key = null;

async function initCrypto() {
  let saltB64 = localStorage.getItem('gl_salt');
  if (!saltB64) {
    const s = crypto.getRandomValues(new Uint8Array(16));
    saltB64 = btoa(String.fromCharCode(...s));
    localStorage.setItem('gl_salt', saltB64);
  }
  const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
  const km = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode('giftylog-aes-2024'), 'PBKDF2', false, ['deriveKey']
  );
  _key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    km,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function _encrypt(plain) {
  const iv  = crypto.getRandomValues(new Uint8Array(12));
  const enc = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, _key, new TextEncoder().encode(plain));
  return btoa(JSON.stringify({
    iv: btoa(String.fromCharCode(...iv)),
    d:  btoa(String.fromCharCode(...new Uint8Array(enc)))
  }));
}

async function _decrypt(cipher) {
  try {
    const { iv, d } = JSON.parse(atob(cipher));
    const dec = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: Uint8Array.from(atob(iv), c => c.charCodeAt(0)) },
      _key,
      Uint8Array.from(atob(d), c => c.charCodeAt(0))
    );
    return new TextDecoder().decode(dec);
  } catch { return null; }
}

async function lsSet(key, value) {
  localStorage.setItem(key, await _encrypt(JSON.stringify(value)));
}

async function lsGet(key) {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  const dec = await _decrypt(raw);
  if (dec) { try { return JSON.parse(dec); } catch { return null; } }
  try { return JSON.parse(raw); } catch { return null; }  // migration: plain JSON fallback
}

/* ═══════════════════════════════════════════════════════════════
   STATE
   ═══════════════════════════════════════════════════════════════ */
const state = {
  events:      [],
  gifts:       [],
  webAppUrl:   '',
  lockEnabled: false,
};

async function loadCachedState() {
  const cache = await lsGet('gl_cache');
  if (cache) {
    state.events = cache.events || [];
    state.gifts  = cache.gifts  || [];
  }
  state.webAppUrl   = localStorage.getItem('giftylog_url') || 'PASTE_YOUR_SCRIPT_URL_HERE';
  state.lockEnabled = localStorage.getItem('giftylog_lock') === '1';
}

async function saveCache() {
  await lsSet('gl_cache', { events: state.events, gifts: state.gifts });
}

/* ═══════════════════════════════════════════════════════════════
   API
   ═══════════════════════════════════════════════════════════════ */
async function apiCall(payload) {
  const url = state.webAppUrl;
  if (!url || url === 'PASTE_YOUR_SCRIPT_URL_HERE') throw new Error('No backend URL. Go to Settings ⚙️');
  setSyncing(true);
  try {
    const res  = await fetch(url, { method: 'POST', body: JSON.stringify(payload) });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json;
  } finally {
    setSyncing(false);
  }
}

async function loadAll() {
  try {
    const data   = await apiCall({ action: 'getAll' });
    state.events = data.events || [];
    state.gifts  = data.gifts  || [];
    await saveCache();
    showToast('Synced ✓', 'success');
    return true;
  } catch (err) {
    showToast(err.message, 'error');
    return false;
  }
}

async function saveEvent(evt) {
  await apiCall({ action: 'saveEvent', event: evt });
  const idx = state.events.findIndex(e => e.id === evt.id);
  if (idx >= 0) state.events[idx] = evt; else state.events.push(evt);
  await saveCache();
}

async function deleteEvent(id) {
  await apiCall({ action: 'deleteEvent', id });
  state.events = state.events.filter(e => e.id !== id);
  state.gifts  = state.gifts.filter(g => g.eventId !== id);
  await saveCache();
}

async function saveGift(gift) {
  await apiCall({ action: 'saveGift', gift });
  const idx = state.gifts.findIndex(g => g.id === gift.id);
  if (idx >= 0) state.gifts[idx] = gift; else state.gifts.push(gift);
  await saveCache();
}

async function deleteGift(id) {
  await apiCall({ action: 'deleteGift', id });
  state.gifts = state.gifts.filter(g => g.id !== id);
  await saveCache();
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
function renderSidebar(active) {
  const mount = document.getElementById('sidebar-mount');
  if (!mount) return;
  const links = [
    { id: 'overview', href: 'index.html',        icon: '📊', label: 'Overview' },
    { id: 'events',   href: 'events.html',        icon: '🎉', label: 'Events'   },
    { id: 'gifts',    href: 'gifts.html',         icon: '🎁', label: 'Gifts'    },
  ];
  mount.innerHTML = `
    <nav id="sidebar">
      <div class="sidebar-brand">GiftyLog 🎁</div>
      <div class="sidebar-nav">
        ${links.map(l => `
          <a href="${l.href}" class="nav-item${active === l.id ? ' active' : ''}">
            <span class="nav-icon">${l.icon}</span>${l.label}
          </a>`).join('')}
      </div>
      <div class="sidebar-bottom">
        <a href="settings.html" class="nav-item${active === 'settings' ? ' active' : ''}" style="width:100%">
          <span class="nav-icon">⚙️</span>Settings
        </a>
      </div>
    </nav>`;
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
            <button class="modal-close" onclick="closeModal('gl-confirm')">✕</button>
          </div>
          <div class="modal-body">
            <p id="gl-confirm-msg" style="color:var(--text-muted);font-size:.9rem;line-height:1.6"></p>
            <div class="modal-footer">
              <button class="btn btn-ghost" onclick="closeModal('gl-confirm')">Cancel</button>
              <button class="btn btn-rose" id="gl-confirm-btn">Delete</button>
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
   PIN OVERLAY
   ═══════════════════════════════════════════════════════════════ */
let _pinEntry = '';

function showPinOverlay() {
  _pinEntry = '';
  let el = document.getElementById('gl-pin');
  if (!el) {
    document.body.insertAdjacentHTML('beforeend', `
      <div id="gl-pin">
        <div class="pin-brand">GiftyLog 🎁</div>
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
          <button class="key-btn" data-k="back">⌫</button>
        </div>
        <div class="pin-error" id="gl-pin-error"></div>
      </div>`);
    document.querySelectorAll('.key-btn[data-k]').forEach(b => b.addEventListener('click', () => _handleKey(b.dataset.k)));
  }
  document.getElementById('gl-pin').classList.remove('hidden');
  _updateDots();
}

function _updateDots() {
  for (let i = 0; i < 4; i++) document.getElementById(`pd${i}`)?.classList.toggle('filled', i < _pinEntry.length);
}

function _handleKey(k) {
  if (k === 'back') _pinEntry = _pinEntry.slice(0, -1);
  else if (_pinEntry.length < 4) _pinEntry += k;
  _updateDots();
  if (_pinEntry.length === 4) {
    if (_pinEntry === localStorage.getItem('giftylog_pin')) {
      document.getElementById('gl-pin').classList.add('hidden');
    } else {
      document.getElementById('gl-pin-error').textContent = 'Incorrect PIN. Try again.';
      setTimeout(() => { _pinEntry = ''; _updateDots(); document.getElementById('gl-pin-error').textContent = ''; }, 800);
    }
  }
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && state.lockEnabled && localStorage.getItem('giftylog_pin')) showPinOverlay();
});

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
   INIT — call on every page
   ═══════════════════════════════════════════════════════════════ */
async function initApp(activePage) {
  document.body.insertAdjacentHTML('beforeend', `
    <div id="gl-toast" class="gl-toast"></div>
    <div id="gl-sync"  class="gl-sync"><span class="spinner"></span> Syncing…</div>`);
  await initCrypto();
  await loadCachedState();
  renderSidebar(activePage);
  if (state.lockEnabled && localStorage.getItem('giftylog_pin')) showPinOverlay();
}
