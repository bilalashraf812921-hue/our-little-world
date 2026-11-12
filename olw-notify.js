/* ===== Our Little World - naya message aane par app ke andar alert =====
   Jab aap app kisi bhi page par use kar rahe hon (Home, Story, Gallery, Letters) aur doosre ka chat message aaye,
   to upar ek chhota card aata hai (naam + message), halki vibration/awaaz, aur Home ke Chat button par lal nishaan.
   Card par tap karne se Chat khul jata hai. Chat page par ye alert nahi aata (wahan aap message dekh hi rahe hote hain).
   Ye sirf tab chalta hai jab app khula ho. App band ho to koi notification nahi aati.
   Page ko db dene ka tareeqa:  OLW_NOTIFY.attach(db, spaceId, myRole)  (Home/Story mein olw-sync.js se khud ho jata hai). */
(function () {
  'use strict';
  if (window.OLW_NOTIFY) return;
  var LS = window.localStorage, SEEN = 'olw_chat_seen_t', UNREAD = 'olw_chat_unread', RUNG = 'olw_chat_rung', PREF = 'olw_notif_pref';
  var st = { unsub: null, key: '', me: '', db: null, space: '', pending: [], el: null, hideT: 0, count: 0, prof: {}, ctx: null };
  var jget = function (k, d) { try { var v = JSON.parse(LS.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  var jset = function (k, v) { try { LS.setItem(k, JSON.stringify(v)); } catch (e) { } };
  var locked = function () { try { return !!LS.getItem('olw_lock_v1') && !sessionStorage.getItem('olw_ok'); } catch (e) { return false; } };
  var isChat = /messages\.html$/i.test(location.pathname);

  /* ---------- unread list (page badalne par bhi yaad rehta hai) ---------- */
  function unreadList() { var seen = +LS.getItem(SEEN) || 0; var l = jget(UNREAD, []).filter(function (x) { return x && x.t > seen; }); return l; }
  function paintDots() {
    var n = unreadList().length;
    document.querySelectorAll('[data-go="chat"], a[href="messages.html"]').forEach(function (el) {
      el.classList.add('olw-has'); var d = el.querySelector(':scope > .olw-dot');
      if (!n) { if (d) d.remove(); return; }
      if (!d) { d = document.createElement('i'); d.className = 'olw-dot'; el.append(d); } d.textContent = n > 9 ? '9+' : String(n);
    });
  }
  function css() {
    if (document.getElementById('olwNotifyCss')) return; var s = document.createElement('style'); s.id = 'olwNotifyCss';
    s.textContent = '.olw-has{position:relative}.olw-dot{position:absolute;top:4px;right:4px;min-width:18px;height:18px;padding:0 5px;box-sizing:border-box;border-radius:9px;background:#c0476f;color:#fff;font:700 11px/18px system-ui,sans-serif;font-style:normal;text-align:center;pointer-events:none;box-shadow:0 1px 4px rgba(0,0,0,.3)}'
      + '#olwMsg{position:fixed;z-index:100000;top:calc(10px + env(safe-area-inset-top));left:50%;transform:translate(-50%,-140%);width:min(92vw,420px);display:flex;align-items:center;gap:4px;padding:6px;border-radius:20px;background:#fffaf4;color:#3b2a4d;box-shadow:0 10px 34px rgba(40,25,50,.4);border:1px solid rgba(120,90,140,.25);transition:transform .35s cubic-bezier(.2,.9,.3,1.1);font-family:system-ui,sans-serif}'
      + '#olwMsg.on{transform:translate(-50%,0)}#olwMsg[hidden]{display:none}'
      + '#olwMsg .m-b{flex:1;min-width:0;display:flex;align-items:center;gap:10px;padding:6px 8px;border:0;background:none;color:inherit;text-align:left;font:inherit;cursor:pointer}'
      + '#olwMsg .m-av{flex:none;width:40px;height:40px;border-radius:50%;background:#8a64a3 center/cover;color:#fff;display:grid;place-items:center;font-weight:700}'
      + '#olwMsg .m-t{min-width:0;display:grid;gap:1px}#olwMsg .m-t b{font-size:.86rem}#olwMsg .m-t span{font-size:.9rem;opacity:.85;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
      + '#olwMsg .m-x{flex:none;width:34px;height:34px;border:0;border-radius:50%;background:rgba(138,100,163,.14);color:#664580;font-size:15px;cursor:pointer}';
    document.head.append(s);
  }

  /* ---------- naam / tasveer (chat profile se) ---------- */
  function profile(role) {
    if (st.prof[role]) return st.prof[role]; var p = st.prof[role] = { name: role === 'owner' ? 'Him' : 'Her', avatar: '' };
    try { st.db.collection('spaces').doc(st.space).collection('meta').doc('chatprofile-' + role).get().then(function (d) { if (d.exists) { var x = d.data() || {}; if (x.name) p.name = String(x.name).slice(0, 30); if (typeof x.avatar === 'string' && /^data:image\/(jpeg|png|webp);/.test(x.avatar)) p.avatar = x.avatar; if (st.el && !st.el.hidden) fill(); } }).catch(function () { }); } catch (e) { }
    return p;
  }
  function preview(m) {
    var t = String(m.text || '').trim();
    if (/tiktok\.com\//i.test(t)) return '🎵 TikTok video';
    if (/(youtu\.be\/|youtube\.com\/)/i.test(t)) return '▶ YouTube video';
    if (!t && m.img) return '📷 Photo';
    return t.replace(/\s+/g, ' ').slice(0, 120) || 'New message';
  }

  /* ---------- card ---------- */
  var last = null;
  function ensure() {
    if (st.el) return st.el; css(); var el = st.el = document.createElement('div'); el.id = 'olwMsg'; el.hidden = true; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
    el.innerHTML = '<button type="button" class="m-b" aria-label="Open chat"><span class="m-av"></span><span class="m-t"><b></b><span></span></span></button><button type="button" class="m-x" aria-label="Dismiss">✕</button>';
    el.querySelector('.m-b').addEventListener('click', function () { location.href = 'messages.html'; });
    el.querySelector('.m-x').addEventListener('click', function () { hide(); });
    document.body.append(el); return el;
  }
  function fill() {
    var el = ensure(); if (!last) return; var p = profile(last.by), av = el.querySelector('.m-av');
    el.querySelector('.m-t b').textContent = p.name + (st.count > 1 ? ' · ' + st.count + ' new messages' : ' · New message');
    el.querySelector('.m-t span').textContent = preview(last);
    if (p.avatar) { av.style.backgroundImage = 'url(' + JSON.stringify(p.avatar) + ')'; av.textContent = ''; } else { av.style.backgroundImage = ''; av.textContent = (p.name || '♡').charAt(0).toUpperCase(); }
  }
  function hide() { clearTimeout(st.hideT); if (!st.el) return; st.el.classList.remove('on'); setTimeout(function () { if (st.el && !st.el.classList.contains('on')) st.el.hidden = true; }, 380); st.count = 0; }
  function chime() {
    if (jget(PREF, {}).sound === false) return;
    try { var C = window.AudioContext || window.webkitAudioContext; if (!C) return; var c = st.ctx = st.ctx || new C(); if (c.state === 'suspended') c.resume().catch(function () { });
      [[880, 0], [1175, .13]].forEach(function (n) { var o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = n[0]; g.gain.setValueAtTime(.0001, c.currentTime + n[1]); g.gain.exponentialRampToValueAtTime(.12, c.currentTime + n[1] + .02); g.gain.exponentialRampToValueAtTime(.0001, c.currentTime + n[1] + .3); o.connect(g); g.connect(c.destination); o.start(c.currentTime + n[1]); o.stop(c.currentTime + n[1] + .32); });
    } catch (e) { }
  }
  function ring(ms) {
    if (!ms.length) return; var m = ms[ms.length - 1]; last = m; st.count = st.el && !st.el.hidden && st.el.classList.contains('on') ? st.count + ms.length : ms.length;
    var el = ensure(); fill(); el.hidden = false; void el.offsetWidth; el.classList.add('on'); chime(); try { if (navigator.vibrate) navigator.vibrate([60, 40, 60]); } catch (e) { }
    clearTimeout(st.hideT); st.hideT = setTimeout(hide, 7000);
  }
  function flush() {
    if (!st.pending.length || document.hidden || locked() || isChat) return;
    var rung = jget(RUNG, []), fresh = st.pending.filter(function (m) { return rung.indexOf(m.id) < 0 && Date.now() - m.t < 10 * 60 * 1000; }); st.pending = [];
    if (!fresh.length) return; fresh.forEach(function (m) { rung.push(m.id); }); jset(RUNG, rung.slice(-80)); ring(fresh);
  }

  /* ---------- firestore: sirf naye messages ---------- */
  function onSnap(snap) {
    var list = unreadList(), have = {}, add = []; list.forEach(function (x) { have[x.id] = 1; });
    snap.docChanges().forEach(function (c) {
      if (c.type === 'removed') { list = list.filter(function (x) { return x.id !== c.doc.id; }); return; }
      var d = c.doc.data() || {}; if (c.doc.metadata.hasPendingWrites) return;
      if (d.by === st.me || d.by !== (st.me === 'owner' ? 'partner' : 'owner')) return;
      if (d.del) { list = list.filter(function (x) { return x.id !== c.doc.id; }); return; }
      if (!have[c.doc.id]) { have[c.doc.id] = 1; list.push({ id: c.doc.id, t: +d.t || Date.now() }); }
      add.push({ id: c.doc.id, by: d.by, t: +d.t || Date.now(), text: String(d.text || ''), img: d.img ? 1 : 0 });
    });
    jset(UNREAD, list.slice(-60)); paintDots();
    if (add.length) { add.sort(function (a, b) { return a.t - b.t; }); st.pending = st.pending.concat(add); flush(); }
  }
  function attach(db, space, role) {
    if (isChat || !db || !space) return; var key = space + '|' + role; if (st.unsub && st.key === key) return; detach();
    st.db = db; st.space = space; st.me = role === 'partner' ? 'partner' : 'owner'; st.key = key;
    var since = Math.max(+LS.getItem(SEEN) || 0, Date.now() - 24 * 3600 * 1000);
    try { st.unsub = db.collection('spaces').doc(space).collection('chat').where('t', '>', since).onSnapshot(onSnap, function () { }); } catch (e) { }
    paintDots();
  }
  function detach() { if (st.unsub) { try { st.unsub(); } catch (e) { } } st.unsub = null; st.key = ''; st.pending = []; }

  window.OLW_NOTIFY = { attach: attach, detach: detach, state: st, paint: paintDots };
  setInterval(flush, 2500); document.addEventListener('visibilitychange', function () { if (!document.hidden) { flush(); paintDots(); } });
  window.addEventListener('storage', function (e) { if (e.key === SEEN || e.key === UNREAD) paintDots(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', paintDots); else paintDots();
  if (window.OLW) OLW.onAuth(function (u) { if (u && OLW.db) attach(OLW.db, OLW.cfg.space, OLW.role); else detach(); });
})();
