/* ===== Our Little World - shared Google sync (Firebase) =====
   Used by Home, Story and Chat. (Letters and Gallery have their own copy of the same idea; all use the same olw-config.js.)
   What this file does:
   - signs in with Google (only the two emails in olw-config.js are allowed)
   - stores big things safely in small pieces ("blobs", about 700 KB each) because Firestore documents are limited to 1 MB
   - mirrors Home's settings, theme, design and the password lock (localStorage keys) between your devices
   Load it with:  <script src="olw-config.js"></script><script src="olw-sync.js"></script>
   Add data-reload="1" to the script tag on Home so Home refreshes itself when the other device changes something. */
(function () {
  'use strict';
  if (window.OLW) return;
  var CFG = Object.assign({ firebase: { apiKey: '', authDomain: '', projectId: '', appId: '' }, space: 'our-little-world', owner: '', partner: '' }, window.OLW_SYNC || {});
  var tag = document.currentScript, RELOAD = !!(tag && tag.dataset.reload);
  var OLW = window.OLW = { cfg: CFG, configured: !!(CFG.firebase && CFG.firebase.apiKey && CFG.firebase.projectId), user: null, role: 'owner', signedIn: false, db: null, auth: null, authKnown: false, listeners: [], watchers: [] };
  var KEYS = ['olw_home_v1', 'olw_design_v1', 'olw_theme_v1', 'olw_lock_v1'];
  var LS = window.localStorage, si = Storage.prototype.setItem, ri = Storage.prototype.removeItem;
  var jget = function (k) { try { return JSON.parse(LS.getItem(k) || '{}') || {}; } catch (e) { return {}; } };
  var jset = function (k, v) { try { si.call(LS, k, JSON.stringify(v)); } catch (e) { } };

  /* ---------- who am I ---------- */
  function roleOf(mail) { mail = (mail || '').toLowerCase(); var o = (CFG.owner || '').toLowerCase(), p = (CFG.partner || '').toLowerCase(); if (!o || mail === o) return 'owner'; if (mail === p) return 'partner'; return 'owner'; }
  OLW.otherRole = function () { return OLW.role === 'owner' ? 'partner' : 'owner'; };
  OLW.onAuth = function (cb) { OLW.listeners.push(cb); if (OLW.authKnown) cb(OLW.user); };
  OLW.whenAuth = function (ms) { return new Promise(function (res) { if (!OLW.configured || OLW.authKnown) return res(OLW.user); var t = setTimeout(function () { res(OLW.user); }, ms || 3000); OLW.onAuth(function (u) { clearTimeout(t); res(u); }); }); };
  OLW.space = function () { return OLW.db.collection('spaces').doc(CFG.space); };
  function toastMsg(m) { var t = document.getElementById('olwToast'); if (!t) { t = document.createElement('div'); t.id = 'olwToast'; t.style.cssText = 'position:fixed;left:50%;bottom:104px;transform:translateX(-50%);z-index:99999;background:#664580;color:#fff;padding:10px 20px;border-radius:999px;font:500 14px system-ui,sans-serif;max-width:90vw;text-align:center'; document.body.append(t); } t.textContent = m; t.hidden = false; clearTimeout(t._t); t._t = setTimeout(function () { t.hidden = true; }, 3200); }
  OLW.toast = toastMsg;
  function cloudErr(e) { console.warn('sync', e); if (e && e.code === 'permission-denied') toastMsg('Sync is blocked. Check the Firestore rules and the two allowed emails.'); }
  OLW.err = cloudErr;

  /* ---------- big values stored in pieces ---------- */
  OLW.putBlob = async function (id, str, extra) {
    var ascii = !/[^\x00-\x7f]/.test(str), CH = ascii ? 700000 : 220000, n = Math.max(1, Math.ceil(str.length / CH)), B = OLW.space().collection('blobs'), M = OLW.space().collection('bmeta');
    var old = await M.doc(id).get(); var oldN = old.exists ? (old.data().n || 0) : 0, upd = Date.now();
    for (var i = 0; i < n; i++) await B.doc(id + '~' + i).set({ d: str.slice(i * CH, (i + 1) * CH) });
    await M.doc(id).set(Object.assign({ n: n, len: str.length, updated: upd, by: OLW.user ? OLW.user.email : '' }, extra || {}));
    for (var j = n; j < oldN; j++) B.doc(id + '~' + j).delete().catch(function () { });
    return upd;
  };
  OLW.getBlob = async function (id, meta) {
    var m = meta || (await OLW.space().collection('bmeta').doc(id).get()).data(); if (!m) return null; var B = OLW.space().collection('blobs'), parts = [];
    for (var i = 0; i < m.n; i++) parts.push(B.doc(id + '~' + i).get());
    var docs = await Promise.all(parts); return docs.map(function (d) { return d.exists ? d.data().d : ''; }).join('');
  };
  OLW.delBlob = async function (id) { var M = OLW.space().collection('bmeta'), m = await M.doc(id).get(); if (!m.exists) return; var n = m.data().n || 0; for (var i = 0; i < n; i++) OLW.space().collection('blobs').doc(id + '~' + i).delete().catch(function () { }); await M.doc(id).delete(); };
  /* watch(prefix, onChange(id, meta, type), onInitial(setOfIds)) : tells you about pieces whose id starts with prefix */
  OLW.watch = function (prefix, onChange, onInitial) { var w = { prefix: prefix, onChange: onChange, onInitial: onInitial, first: true }; OLW.watchers.push(w); if (OLW.signedIn && OLW._snap) feed(w, OLW._snap, true); return w; };
  function feed(w, snap, replay) {
    var ids = new Set(); snap.docs.forEach(function (d) { if (d.id.indexOf(w.prefix) === 0) ids.add(d.id); });
    if (w.first || replay) { w.first = false; snap.docs.forEach(function (d) { if (d.id.indexOf(w.prefix) === 0) w.onChange(d.id, d.data(), 'added'); }); if (w.onInitial) w.onInitial(ids); return; }
    snap.docChanges().forEach(function (c) { if (c.doc.id.indexOf(w.prefix) === 0 && !c.doc.metadata.hasPendingWrites) w.onChange(c.doc.id, c.doc.data(), c.type); });
  }
  var unsubMeta = null;
  function startWatch() {
    if (unsubMeta) unsubMeta(); OLW.watchers.forEach(function (w) { w.first = true; });
    unsubMeta = OLW.space().collection('bmeta').onSnapshot(function (snap) { OLW._snap = snap; OLW.watchers.forEach(function (w) { feed(w, snap, false); }); }, cloudErr);
  }

  /* ---------- Home settings / theme / design / lock mirrored between devices ---------- */
  var applying = false, timers = {};
  function mark(k) { var lt = jget('olw_sync_lt'); lt[k] = Date.now(); jset('olw_sync_lt', lt); clearTimeout(timers[k]); timers[k] = setTimeout(function () { push(k); }, 900); }
  Storage.prototype.setItem = function (k, v) { si.call(this, k, v); if (this === LS && KEYS.indexOf(k) >= 0 && !applying) mark(k); };
  Storage.prototype.removeItem = function (k) { ri.call(this, k); if (this === LS && KEYS.indexOf(k) >= 0 && !applying) mark(k); };
  async function push(k) {
    if (!OLW.signedIn) return; try {
      var v = LS.getItem(k), upd = await OLW.putBlob('ls-' + k, JSON.stringify({ v: v })); var seen = jget('olw_sync_seen'); seen['ls-' + k] = upd; jset('olw_sync_seen', seen);
    } catch (e) { cloudErr(e); }
  }
  var applied = false;
  async function mirrorChange(id, meta) {
    var k = id.slice(3); if (KEYS.indexOf(k) < 0) return; var seen = jget('olw_sync_seen'), lt = jget('olw_sync_lt');
    if ((meta.updated || 0) <= (seen[id] || 0)) return;
    if ((meta.updated || 0) > (lt[k] || 0)) {
      try {
        var s = await OLW.getBlob(id, meta); if (s == null) return; var v = JSON.parse(s).v; applying = true;
        if (v == null) ri.call(LS, k); else si.call(LS, k, v); applying = false;
        seen[id] = meta.updated; jset('olw_sync_seen', seen); lt[k] = meta.updated; jset('olw_sync_lt', lt);
        if (RELOAD && !applied) { applied = true; toastMsg('Updated from the other device ♡'); setTimeout(function () { location.reload(); }, 900); }
      } catch (e) { applying = false; cloudErr(e); }
    } else push(k);
  }
  function mirrorInitial(ids) { KEYS.forEach(function (k) { if (!ids.has('ls-' + k) && LS.getItem(k) != null) push(k); }); }

  /* ---------- Firebase start ---------- */
  function loadScript(src) { return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.append(s); }); }
  OLW.init = async function () {
    if (!OLW.configured) { OLW.authKnown = true; return false; }
    try {
      var base = 'https://www.gstatic.com/firebasejs/10.12.2/';
      if (!window.firebase) { await loadScript(base + 'firebase-app-compat.js'); await loadScript(base + 'firebase-auth-compat.js'); await loadScript(base + 'firebase-firestore-compat.js'); }
      if (!firebase.apps.length) firebase.initializeApp(CFG.firebase); OLW.auth = firebase.auth(); OLW.db = firebase.firestore();
      OLW.auth.getRedirectResult().catch(function () { });
      OLW.auth.onAuthStateChanged(function (u) {
        if (u) {
          var mail = (u.email || '').toLowerCase(), allowed = [CFG.owner, CFG.partner].filter(Boolean).map(function (x) { return x.toLowerCase(); });
          if (allowed.length && allowed.indexOf(mail) < 0) { toastMsg('This Google account is not allowed here.'); OLW.auth.signOut(); return; }
          OLW.user = u; OLW.role = roleOf(mail); OLW.signedIn = true; startWatch();
        } else { OLW.user = null; OLW.signedIn = false; if (unsubMeta) { unsubMeta(); unsubMeta = null; } }
        OLW.authKnown = true; OLW.listeners.forEach(function (cb) { try { cb(OLW.user); } catch (e) { console.error(e); } }); paintCloud();
      });
      return true;
    } catch (e) { OLW.authKnown = true; toastMsg('Sync could not start. Please check your internet.'); return false; }
  };
  OLW.signIn = async function () {
    if (!OLW.auth) await OLW.init(); if (!OLW.auth) return; var p = new firebase.auth.GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' });
    try { await OLW.auth.signInWithPopup(p); } catch (e) { if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment')) { try { await OLW.auth.signInWithRedirect(p); } catch (e2) { toastMsg('Sign-in failed. Please try again.'); } } else if (e && e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') toastMsg('Sign-in failed' + (e && e.code ? ' (' + e.code + ')' : '') + '.'); }
  };
  OLW.signOut = function () { if (OLW.auth) OLW.auth.signOut(); };
  OLW.watch('ls-', mirrorChange, mirrorInitial);

  /* ---------- small cloud button (only when sync is set up) ----------
     Drag it anywhere (position is remembered). Tap it for sign in / sign out and "Hide this button".
     When hidden you stay signed in. Bring it back from Chat menu > Sync, or by signing out. */
  var POSK = 'olw_cloud_pos', HIDK = 'olw_cloud_hide', SZ = 38, dragged = false;
  var lsr = function (k) { try { return JSON.parse(LS.getItem(k)); } catch (e) { return null; } };
  var lsw = function (k, v) { try { si.call(LS, k, JSON.stringify(v)); } catch (e) { } };
  var isHidden = function () { return lsr(HIDK) === true && OLW.signedIn; };
  var clampN = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  function setXY(x, y) {
    var b = document.getElementById('olwCloud'); if (!b) return;
    var vw = window.innerWidth, vh = window.innerHeight;
    b.style.left = clampN(x, 4, Math.max(4, vw - SZ - 4)) + 'px'; b.style.top = clampN(y, 4, Math.max(4, vh - SZ - 4)) + 'px'; b.style.bottom = 'auto'; b.style.right = 'auto';
  }
  function placeBtn() {
    var b = document.getElementById('olwCloud'); if (!b) return; var pos = lsr(POSK), vw = window.innerWidth, vh = window.innerHeight;
    if (pos && typeof pos.fx === 'number') setXY(pos.fx * (vw - SZ), pos.fy * (vh - SZ));
    else setXY(12, vh - SZ - (document.body.classList.contains('chat') ? 150 : 96));
  }
  function savePos() { var b = document.getElementById('olwCloud'); if (!b) return; var r = b.getBoundingClientRect(), vw = window.innerWidth, vh = window.innerHeight; lsw(POSK, { fx: r.left / Math.max(1, vw - SZ), fy: r.top / Math.max(1, vh - SZ) }); }
  function placePop() {
    var b = document.getElementById('olwCloud'), p = document.getElementById('olwPop'); if (!b || !p) return;
    var vw = window.innerWidth, vh = window.innerHeight, r = b.hidden ? { left: 12, top: vh - 150, bottom: vh - 112 } : b.getBoundingClientRect(), pw = p.offsetWidth || 260;
    p.style.left = clampN(r.left, 8, Math.max(8, vw - pw - 8)) + 'px'; p.style.right = 'auto';
    if (r.top > vh / 2) { p.style.bottom = (vh - r.top + 8) + 'px'; p.style.top = 'auto'; } else { p.style.top = (r.bottom + 8) + 'px'; p.style.bottom = 'auto'; }
  }
  function paintCloud() {
    var b = document.getElementById('olwCloud'); if (!b) return; b.className = OLW.signedIn ? 'on' : ''; b.title = OLW.signedIn ? 'Synced as ' + OLW.user.email : 'Sign in to sync'; b.hidden = isHidden();
    var p = document.getElementById('olwPop'); if (p) fillPop(p);
  }
  OLW.showCloud = function () { lsw(HIDK, false); paintCloud(); placeBtn(); };
  OLW.hideCloud = function () { lsw(HIDK, true); paintCloud(); };
  function fillPop(p) {
    p.replaceChildren(); var t = document.createElement('p'); t.style.cssText = 'margin:0 0 10px;font-size:.9rem';
    if (OLW.signedIn) { t.innerHTML = 'Synced as <b></b>'; t.querySelector('b').textContent = OLW.user.email; } else t.textContent = 'Sign in with Google to see the same app on both phones.';
    var btn = document.createElement('button'); btn.type = 'button'; btn.textContent = OLW.signedIn ? 'Sign out' : 'Sign in with Google'; btn.onclick = function () { p.hidden = true; OLW.signedIn ? OLW.signOut() : OLW.signIn(); };
    btn.style.cssText = 'padding:9px 16px;border-radius:999px;border:0;background:var(--plum,#8a64a3);color:#fff;font:500 14px system-ui,sans-serif;cursor:pointer'; p.append(t, btn);
    if (OLW.signedIn) {
      var row = document.createElement('div'); row.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-top:10px';
      var mk = function (label, fn) { var x = document.createElement('button'); x.type = 'button'; x.textContent = label; x.onclick = fn; x.style.cssText = 'padding:7px 12px;border-radius:999px;border:1px solid #d9c3e6;background:#fff;color:#5b3f8a;font:500 12.5px system-ui,sans-serif;cursor:pointer'; return x; };
      if (isHidden()) row.append(mk('Show the button', function () { p.hidden = true; OLW.showCloud(); }));
      else row.append(mk('Hide this button', function () { p.hidden = true; OLW.hideCloud(); toastMsg('Button hidden. You stay signed in. Chat menu > Sync brings it back.'); }));
      row.append(mk('Reset position', function () { try { ri.call(LS, POSK); } catch (e) { } placeBtn(); placePop(); }));
      var hint = document.createElement('p'); hint.textContent = 'Tip: drag the cloud button to move it anywhere.'; hint.style.cssText = 'margin:8px 0 0;font-size:.76rem;opacity:.7';
      p.append(row, hint);
    }
  }
  function mountCloud() {
    if (!OLW.configured || document.getElementById('olwCloud') || document.documentElement.dataset.locked) return;
    var st = document.createElement('style'); st.textContent = '#olwCloud{position:fixed;left:12px;bottom:96px;z-index:70;width:38px;height:38px;border-radius:50%;border:1px solid rgba(120,90,140,.35);background:rgba(255,255,255,.88);color:#8a64a3;display:grid;place-items:center;box-shadow:0 4px 12px rgba(60,30,80,.2);cursor:grab;padding:0;touch-action:none;user-select:none;-webkit-user-select:none}#olwCloud:active{cursor:grabbing}#olwCloud svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;pointer-events:none}#olwCloud.on{background:#8a64a3;color:#fff}#olwPop{position:fixed;left:12px;bottom:142px;z-index:71;background:#fffaf8;color:#4c3b58;border:1px solid #eadcec;border-radius:16px;padding:14px;box-shadow:0 14px 30px rgba(60,30,80,.28);max-width:min(280px,86vw)}[hidden]{display:none!important}';
    document.head.append(st); var b = document.createElement('button'); b.id = 'olwCloud'; b.type = 'button'; b.setAttribute('aria-label', 'Sync with Google');
    b.innerHTML = '<svg viewBox="0 0 24 24"><path d="M7 18a4.5 4.5 0 0 1-.5-9A6 6 0 0 1 18 9.5 4 4 0 0 1 17.5 18z"/></svg>'; var p = document.createElement('div'); p.id = 'olwPop'; p.hidden = true;
    b.onclick = function () { if (dragged) { dragged = false; return; } p.hidden = !p.hidden; if (!p.hidden) { fillPop(p); placePop(); } };
    var drag = null;
    b.addEventListener('pointerdown', function (e) { if (e.button > 0) return; var r = b.getBoundingClientRect(); drag = { sx: e.clientX, sy: e.clientY, ox: r.left, oy: r.top, moved: false }; try { b.setPointerCapture(e.pointerId); } catch (_) { } });
    b.addEventListener('pointermove', function (e) { if (!drag) return; var dx = e.clientX - drag.sx, dy = e.clientY - drag.sy; if (!drag.moved && Math.hypot(dx, dy) < 6) return; drag.moved = true; p.hidden = true; setXY(drag.ox + dx, drag.oy + dy); });
    var end = function () { if (!drag) return; if (drag.moved) { dragged = true; savePos(); setTimeout(function () { dragged = false; }, 80); } drag = null; };
    b.addEventListener('pointerup', end); b.addEventListener('pointercancel', end);
    document.body.append(b, p); placeBtn(); paintCloud();
    window.addEventListener('resize', function () { placeBtn(); if (!p.hidden) placePop(); });
    document.addEventListener('pointerdown', function (e) { if (!p.hidden && !e.target.closest('#olwPop,#olwCloud')) p.hidden = true; });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountCloud); else mountCloud();
  OLW.init();
})();
