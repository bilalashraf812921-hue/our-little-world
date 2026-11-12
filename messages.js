/* ===== Our Little World - Chat (WhatsApp style) =====
   Messages, photos (from the Gallery or the phone), my profile, a background I can change, and my own on-screen keyboard.
   Google sync: olw-sync.js + olw-config.js (same sign-in as the other pages). */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const isHex = x => typeof x === 'string' && /^#[0-9a-f]{6}$/i.test(x);
  const pick = (v, list, d) => (list.includes(v) ? v : d);
  { const _rc = Element.prototype.replaceChildren; Element.prototype.replaceChildren = function (...k) { return _rc.apply(this, k.flat().filter(x => x != null && x !== false)); }; }
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const k in attrs || {}) { const v = attrs[k]; if (v == null || v === false) continue; if (k === 'class') el.className = v; else if (k === 'text') el.textContent = v; else if (k.startsWith('on')) el.addEventListener(k.slice(2), v); else if (k === 'style') el.style.cssText = v; else el.setAttribute(k, v === true ? '' : v); }
    kids.flat().forEach(c => { if (c == null || c === false) return; el.append(c.nodeType ? c : document.createTextNode(c)); });
    return el;
  }
  const ICONS = {
    home: '<path d="m3 11 9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>', book: '<path d="M12 6c-2-2-5-2-8-1v13c3-1 6-1 8 1 2-2 5-2 8-1V5c-3-1-6-1-8 1z"/><path d="M12 6v13"/>', mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 7 9-7"/>', chatb: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 10h8M8 13h5"/>',
    back: '<path d="m15 6-6 6 6 6"/>', dots: '<circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/>', search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    brush: '<path d="M18 3a3 3 0 0 0-4 0L8 9l5 5 5-6a3 3 0 0 0 0-5z"/><path d="M8 9c-3 1-4 3-4 5 0 2 1.5 4 4 4 3 0 5-2 5-4"/>', smile: '<circle cx="12" cy="12" r="9"/><path d="M8 14a4.5 4.5 0 0 0 8 0M9 9.5h.01M15 9.5h.01"/>',
    clip: '<path d="m20 11-8.5 8.5a5 5 0 0 1-7-7L13 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L14 7"/>', send: '<path d="M4 12 20 4l-4 16-4-6.5z"/><path d="m12 13.5 8-9.5"/>', kb: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>', close: '<path d="M6 6l12 12M18 6 6 18"/>', down: '<path d="m6 9 6 6 6-6"/>', reply: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 6 6v3"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>', trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', check: '<path d="m5 12 5 5L20 7"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    back2: '<path d="M3 12h18M10 5l-7 7 7 7"/>', del: '<path d="M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z"/><path d="m13 9 4 6M17 9l-4 6"/>', shift: '<path d="M12 4 4 13h5v7h6v-7h5z"/>', globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>', cloud: '<path d="M7 18a4.5 4.5 0 0 1-.5-9A6 6 0 0 1 18 9.5 4 4 0 0 1 17.5 18z"/>',
    heart: '<path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z"/>', pen: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/>', plus: '<path d="M12 5v14M5 12h14"/>', tick: '<path d="m2 12 4 4 7-8"/>', tick2: '<path d="m2 12 4 4 7-8M10 15l1 1 8-9"/>', clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l2 2"/>'
  };
  const svgI = n => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;
  const ico = n => { const s = h('span', { class: 'ic' }); s.innerHTML = svgI(n); return s; };
  const icons = (root = document) => $$('[data-i]', root).forEach(el => { if (!el.firstChild) el.innerHTML = svgI(el.dataset.i); });

  /* ---------- toast / dialogs ---------- */
  let toastT;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 3000); }
  function openDlg(d) { if (!d.open) { if (d.showModal) d.showModal(); else d.setAttribute('open', ''); } }
  function closeDlg(d) { if (d.open) { if (d.close) d.close(); else d.removeAttribute('open'); } }
  function ask(title, text, yes = 'Yes') {
    return new Promise(res => { const d = $('#dlgAsk'); $('#askT').textContent = title; $('#askP').textContent = text || ''; $('#askYes').textContent = yes; const done = v => { closeDlg(d); res(v); }; $('#askYes').onclick = () => done(true); $('#askNo').onclick = () => done(false); d.oncancel = () => res(false); openDlg(d); });
  }

  /* ---------- storage ---------- */
  const DB = {
    db: null, mem: {},
    async open() { try { this.db = await new Promise((res, rej) => { const r = indexedDB.open('olw_chat_v1', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); setTimeout(() => rej(new Error('timeout')), 3000); }); } catch (e) { this.db = null; } },
    get(k) { if (!this.db) return Promise.resolve(this.mem[k]); return new Promise(res => { try { const q = this.db.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result); q.onerror = () => res(undefined); } catch (e) { res(undefined); } }); },
    set(k, v) { if (!this.db) { this.mem[k] = v; return Promise.resolve(false); } return new Promise(res => { try { const t = this.db.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = () => res(true); t.onerror = () => res(false); t.onabort = () => res(false); } catch (e) { res(false); } }); }
  };

  /* ---------- look: full designs in one click ---------- */
  const DOODLES = { hearts: 'Hearts', flowers: 'Flowers', stars: 'Stars', dots: 'Dots', sprigs: 'Lavender', waves: 'Waves', none: 'Plain' };
  const FONTS = [['Inter', 'Clean'], ['Caveat', 'Handwritten'], ['Kalam', 'Kalam'], ['Dancing Script', 'Dancing'], ['Cormorant Garamond', 'Classic']];
  const HIDE = [['avatar', 'Profile photos'], ['status', 'Online / last seen'], ['dates', 'Day labels (Today, Yesterday)'], ['time', 'Time under messages'], ['ticks', 'Sent / seen ticks'], ['tails', 'Bubble tails'], ['emoji', 'Emoji button'], ['attach', 'Photo button'], ['kbtoggle', 'Keyboard switch button'], ['search', 'Search button'], ['react', 'Reactions'], ['names', 'Sender name above messages'], ['stamp', 'Date next to the time'], ['asks', '"Ask something" card'], ['deco', 'Page decoration (flowers, banner)']];
  /* tick / status display styles */
  const TICK_STYLES = [
    { k: 'tick', n: 'Tick System', ex: '✓ / ✓✓ / ✓✓(blue)', desc: 'Classic double tick like WhatsApp' },
    { k: 'text', n: 'Text System', ex: 'Sent / Delivered / Seen', desc: 'Written status below message' },
    { k: 'min',  n: 'Minimal',    ex: '· ·· ··(coloured)', desc: 'Subtle dots, no extra text' },
    { k: 'el',   n: 'Elegant',    ex: '✓ with colour pulse', desc: 'Animated colour change on seen' },
    { k: 'ts',   n: 'Time + Status', ex: '8:42 PM ✓✓',    desc: 'Time with compact status badge' }
  ];
  const P = (n, dark, bg, me, meT, them, themT, head, headT, comp, acc, kb) => ({ n, dark, bg, me, meT, them, themT, head, headT, comp, acc, kb });
  const PRESETS = {
    love:     Object.assign(P('Romantic Pink', 0, { type: 'gradient', c1: '#fbe9f1', c2: '#efe3f7', angle: 150, doodle: 'hearts', ink: '#b58ad0' }, '#e4d2f4', '#4a1d70', '#fde8ef', '#4a1d70', '#fdf1f5', '#4a1259', '#fbeaf2', '#7b3fa6', { bg: '#f3e6f2', key: '#ffffff', keyT: '#4a1d70', acc: '#7b3fa6', shape: 'round' }), { font: 'Cormorant Garamond', size: 18, radius: 20 }),
    burgundy: Object.assign(P('Luxury Burgundy', 0, { type: 'gradient', c1: '#f5ede8', c2: '#ece0d8', angle: 140, doodle: 'hearts', ink: '#8b2252' }, '#7b1a3a', '#f5e8d4', '#f9f0e6', '#3a1a1a', '#8b2252', '#f5e8d4', '#faf4ee', '#8b2252', { bg: '#f0e0d4', key: '#f9f0e6', keyT: '#3a1a1a', acc: '#8b2252', shape: 'square' }), { font: 'Cormorant Garamond', size: 17, radius: 8 }),
    white:    Object.assign(P('Minimal White', 0, { type: 'color', c1: '#f7f7f9', c2: '#efefef', angle: 180, doodle: 'dots', ink: '#cccccc' }, '#e8e8ea', '#1a1a2e', '#ffffff', '#1a1a2e', '#f0f0f2', '#1a1a2e', '#f8f8fa', '#5566aa', { bg: '#e8e8ea', key: '#ffffff', keyT: '#1a1a2e', acc: '#5566aa', shape: 'square' }), { font: 'Inter', size: 15, radius: 12 }),
    lavender: Object.assign(P('Lavender Dream', 0, { type: 'doodle', doodle: 'sprigs', c1: '#efe6f6', c2: '#f7ecef', ink: '#8a64a3' }, '#8a64a3', '#ffffff', '#ffffff', '#4c3b58', '#7a5a95', '#ffffff', '#f6eef6', '#8a64a3', { bg: '#efe4f4', key: '#ffffff', keyT: '#4c3b58', acc: '#8a64a3', shape: 'round' }), { font: 'Inter', size: 16, radius: 20 }),
    midnight: P('Midnight Romance', 1, { type: 'doodle', doodle: 'stars', c1: '#17142b', c2: '#241d44', ink: '#b9a5f5' }, '#6d54c9', '#ffffff', '#2a2547', '#ece8fb', '#1d1936', '#ffffff', '#1d1936', '#8a72e8', { bg: '#1a1630', key: '#322c58', keyT: '#ece8fb', acc: '#8a72e8', shape: 'round' }),
    diary:    Object.assign(P('Diary Style', 0, { type: 'gradient', c1: '#fdf6e3', c2: '#f5edd0', angle: 160, doodle: 'hearts', ink: '#c9a96e' }, '#e8d5a3', '#3d2b1f', '#fff8f0', '#3d2b1f', '#c9a96e', '#3d2b1f', '#fdf8f0', '#8b6914', { bg: '#f0e8d4', key: '#fff8f0', keyT: '#3d2b1f', acc: '#8b6914', shape: 'round' }), { font: 'Caveat', size: 18, radius: 6 }),
    glass:    Object.assign(P('Glass Effect', 0, { type: 'gradient', c1: '#c9d6df', c2: '#e2eafc', angle: 135, doodle: 'none', ink: '#8899bb' }, 'rgba(255,255,255,0.55)', '#1a2a4a', 'rgba(255,255,255,0.80)', '#1a2a4a', 'rgba(100,120,180,0.70)', '#ffffff', 'rgba(240,244,255,0.70)', '#5577cc', { bg: '#d6e0f0', key: 'rgba(255,255,255,0.7)', keyT: '#1a2a4a', acc: '#5577cc', shape: 'round' }), { font: 'Inter', size: 15, radius: 20 }),
    pastel:   Object.assign(P('Cute Pastel', 0, { type: 'gradient', c1: '#ffdde1', c2: '#c5e8ff', angle: 150, doodle: 'flowers', ink: '#ffaabb' }, '#ffc4cf', '#5a2d4a', '#d4f1ff', '#1a3a5a', '#ff9bb0', '#ffffff', '#fff0f5', '#ff7a9a', { bg: '#ffe4ec', key: '#fff0f5', keyT: '#5a2d4a', acc: '#ff7a9a', shape: 'pill' }), { font: 'Kalam', size: 16, radius: 22 }),
    classic:  P('Classic Messenger', 0, { type: 'doodle', doodle: 'dots', c1: '#efe7dc', c2: '#e8dfd1', ink: '#6b8f71' }, '#d9fdd3', '#1f2c34', '#ffffff', '#1f2c34', '#008069', '#ffffff', '#f0f2f5', '#00a884', { bg: '#d3d6db', key: '#ffffff', keyT: '#1f2c34', acc: '#00a884', shape: 'square' }),
    noir:     P('Black and Gold', 1, { type: 'doodle', doodle: 'dots', c1: '#15131a', c2: '#1d1a24', ink: '#d4a84a' }, '#c9a24a', '#1a1710', '#2a2630', '#f1e8d2', '#0f0d13', '#e8c777', '#0f0d13', '#c9a24a', { bg: '#14121a', key: '#2a2630', keyT: '#f1e8d2', acc: '#c9a24a', shape: 'square' })
  };
  const KB_SHAPES = { round: 'Rounded', square: 'Square', pill: 'Pill' };
  function lookFrom(key) {
    const p = PRESETS[key] || PRESETS.love;
    return { preset: key, bg: Object.assign({ type: 'doodle', doodle: 'hearts', c1: '#efe6f6', c2: '#f7ecef', ink: '#8a64a3', angle: 160, blur: 0, dim: 0, img: '' }, p.bg),
      me: p.me, meT: p.meT, them: p.them, themT: p.themT, head: p.head, headT: p.headT, comp: p.comp, acc: p.acc, dark: !!p.dark, radius: p.radius || 16, font: p.font || 'Inter', size: p.size || 16, hide: [], tickStyle: 'tick',
      kb: { on: true, bg: p.kb.bg, key: p.kb.key, keyT: p.kb.keyT, acc: p.kb.acc, shape: p.kb.shape, h: 'normal', font: 'Inter', numrow: true, vibrate: true, sound: false, layout: 'abc' }, updated: 0 };
  }
  function normLook(x) {
    const d = lookFrom(x && PRESETS[x.preset] ? x.preset : 'love'); x = x && typeof x === 'object' ? x : {}; const b = x.bg || {}, k = x.kb || {};
    const col = (v, def) => (isHex(v) ? v : def);
    const img = typeof b.img === 'string' && /^data:image\/(jpeg|png|webp);/.test(b.img) && b.img.length < 900000 ? b.img : '';
    return { preset: d.preset, dark: x.dark != null ? !!x.dark : d.dark,
      bg: { type: pick(b.type, ['doodle', 'color', 'gradient', 'photo'], d.bg.type), doodle: pick(b.doodle, Object.keys(DOODLES), d.bg.doodle), c1: col(b.c1, d.bg.c1), c2: col(b.c2, d.bg.c2), ink: col(b.ink, d.bg.ink), angle: clamp(Math.round(+b.angle || 160), 0, 360), blur: clamp(Math.round(+b.blur || 0), 0, 24), dim: clamp(Math.round(+b.dim || 0), 0, 70), img },
      me: col(x.me, d.me), meT: col(x.meT, d.meT), them: col(x.them, d.them), themT: col(x.themT, d.themT), head: col(x.head, d.head), headT: col(x.headT, d.headT), comp: col(x.comp, d.comp), acc: col(x.acc, d.acc),
      radius: clamp(Math.round(x.radius != null ? +x.radius : d.radius), 2, 26), font: FONTS.some(f => f[0] === x.font) ? x.font : d.font, size: clamp(Math.round(+x.size || d.size), 13, 22), hide: (Array.isArray(x.hide) ? x.hide : []).filter(k2 => HIDE.some(a => a[0] === k2)),
      tickStyle: TICK_STYLES.some(t => t.k === x.tickStyle) ? x.tickStyle : 'tick',
      kb: { on: k.on !== false, bg: col(k.bg, d.kb.bg), key: col(k.key, d.kb.key), keyT: col(k.keyT, d.kb.keyT), acc: col(k.acc, d.kb.acc), shape: pick(k.shape, Object.keys(KB_SHAPES), d.kb.shape), h: pick(k.h, ['compact', 'normal', 'tall'], 'normal'), font: FONTS.some(f => f[0] === k.font) ? k.font : 'Inter', numrow: k.numrow !== false, vibrate: k.vibrate !== false, sound: !!k.sound, layout: pick(k.layout, ['abc', 'urdu'], 'abc') },
      updated: +x.updated || 0 };
  }
  const IMG_OK = (v, n) => typeof v === 'string' && /^data:image\/(jpeg|png|webp);/.test(v) && v.length < n;
  const normProfile = x => { x = x || {}; const hx = v => (isHex(v) ? v : ''); return { name: String(x.name || '').slice(0, 30), about: String(x.about || '').slice(0, 80), avatar: IMG_OK(x.avatar, 150000) ? x.avatar : '', cover: IMG_OK(x.cover, 330000) ? x.cover : '', mood: String(x.mood || '').slice(0, 4), status: String(x.status || '').slice(0, 40), birthday: /^\d{4}-\d{2}-\d{2}$/.test(x.birthday || '') ? x.birthday : '', city: String(x.city || '').slice(0, 30), quote: String(x.quote || '').slice(0, 120), ring: hx(x.ring), ncol: hx(x.ncol), shape: ['circle', 'rounded', 'heart', 'square'].includes(x.shape) ? x.shape : 'circle', mail: String(x.mail || '').slice(0, 80), updated: +x.updated || 0 }; };
  function normMsg(m) {
    m = m || {}; const r = m.reply && typeof m.reply === 'object' ? { id: String(m.reply.id || ''), by: m.reply.by === 'partner' ? 'partner' : 'owner', text: String(m.reply.text || '').slice(0, 120), img: !!m.reply.img } : null;
    const rc = m.react && typeof m.react === 'object' ? m.react : {};
    const gone = !!m.del;   // "delete for everyone": sirf nishaan reh jata hai, text/photo/reply/reaction saaf
    return { id: /^[\w-]{3,40}$/.test(m.id || '') ? m.id : uid(), by: m.by === 'partner' ? 'partner' : 'owner', t: +m.t || Date.now(), text: gone ? '' : String(m.text || '').slice(0, 4000), img: !gone && typeof m.img === 'string' && /^data:image\/(jpeg|png|webp);/.test(m.img) && m.img.length < 960000 ? m.img : '',
      reply: !gone && r && r.id ? r : null, react: gone ? { owner: '', partner: '' } : { owner: String(rc.owner || '').slice(0, 4), partner: String(rc.partner || '').slice(0, 4) }, seen: +m.seen || 0, u: +m.u || +m.t || Date.now(), ...(gone ? { del: true } : {}) };
  }

  /* ---------- state ---------- */
  const S = { me: 'owner', msgs: [], look: lookFrom('love'), prof: { owner: normProfile(), partner: normProfile() }, pres: { owner: 0, partner: 0 }, synced: false, q: '', reply: null, kbOpen: false, sys: false, starred: new Set(), pinned: [], hid: new Set(), sharedBg: null };
  const other = () => (S.me === 'owner' ? 'partner' : 'owner');
  const nameOf = r => S.prof[r].name || (r === S.me ? 'Me' : 'My Love');
  const byId = id => S.msgs.find(m => m.id === id);
  const vis = () => S.msgs.filter(m => !S.hid.has(m.id));      // 'delete for me' wale messages sirf is phone se chhup jate hain
  const saveHid = () => { try { localStorage.setItem('olw_hidden_msgs', JSON.stringify([...S.hid])); } catch (e) { } };
  const saveMsgs = () => DB.set('msgs', S.msgs);
  const saveLook = () => DB.set('look', S.look);
  const saveProf = () => DB.set('prof', S.prof);
  /* shared background (dono phones par ek jaisa) */
  let sbgUpd = 0, sbgT = 0;
  const normSbg = x => (x && IMG_OK(x.img, 900000) ? { type: 'photo', img: x.img, blur: clamp(Math.round(+x.blur || 0), 0, 24), dim: clamp(Math.round(+x.dim || 0), 0, 70) } : null);
  const saveSbg = () => DB.set('sbg', { bg: S.sharedBg, updated: sbgUpd });
  const fmtTime = t => new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Karachi' });
  const dayKey = t => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date(t));
  function dayLabel(t) { const k = dayKey(t), now = Date.now(); if (k === dayKey(now)) return 'Today'; if (k === dayKey(now - 864e5)) return 'Yesterday'; return new Date(t).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Karachi' }); }
  const hides = k => S.look.hide.includes(k);


  /* ---------- avatars and background ---------- */
  function avatarEl(role, cls = '') {
    const p = S.prof[role], a = h('span', { class: 'av ' + cls }); a.dataset.r = role; a.dataset.sh = p.shape || 'circle'; if (p.ring) a.style.setProperty('--ring', p.ring);
    if (p.avatar) a.append(h('img', { src: p.avatar, alt: '' })); else a.append(h('b', { text: (nameOf(role)[0] || '♡').toUpperCase() }));
    return a;
  }
  const enc = s => 'url("data:image/svg+xml,' + encodeURIComponent(s) + '")';
  function doodleTile(kind, ink) {
    const f = `fill="${ink}"`, s = `stroke="${ink}" fill="none" stroke-width="1.6" stroke-linecap="round"`;
    const shapes = {
      hearts: `<path ${f} d="M20 30s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 28 19c0 6-8 11-8 11z"/><path ${f} transform="translate(60 56) scale(.7)" d="M20 30s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 28 19c0 6-8 11-8 11z"/><circle cx="76" cy="18" r="2" ${f}/><circle cx="14" cy="76" r="2" ${f}/>`,
      flowers: `<g ${f}><circle cx="24" cy="24" r="4"/><circle cx="24" cy="15" r="4.5"/><circle cx="32" cy="20" r="4.5"/><circle cx="32" cy="29" r="4.5"/><circle cx="24" cy="33" r="4.5"/><circle cx="16" cy="29" r="4.5"/><circle cx="16" cy="20" r="4.5"/></g><circle cx="24" cy="24" r="3" fill="#fff" opacity=".7"/><g ${f} transform="translate(56 54) scale(.7)"><circle cx="24" cy="15" r="4.5"/><circle cx="32" cy="20" r="4.5"/><circle cx="32" cy="29" r="4.5"/><circle cx="24" cy="33" r="4.5"/><circle cx="16" cy="29" r="4.5"/><circle cx="16" cy="20" r="4.5"/></g>`,
      stars: `<path ${f} d="M24 10l3 8h8l-6.500 5 2.500 8-7-5-7 5 2.500-8L13 18h8z"/><circle cx="70" cy="22" r="1.800" ${f}/><circle cx="62" cy="64" r="2.200" ${f}/><path ${f} transform="translate(52 50) scale(.5)" d="M24 10l3 8h8l-6.500 5 2.500 8-7-5-7 5 2.500-8L13 18h8z"/><circle cx="14" cy="70" r="1.500" ${f}/>`,
      dots: `<circle cx="18" cy="18" r="3" ${f}/><circle cx="58" cy="38" r="2.200" ${f}/><circle cx="30" cy="62" r="2.600" ${f}/><circle cx="72" cy="72" r="3" ${f}/>`,
      sprigs: `<path ${s} d="M24 70C24 50 28 34 26 16"/><g ${f}><ellipse cx="19" cy="26" rx="5" ry="2.400" transform="rotate(-35 19 26)"/><ellipse cx="31" cy="30" rx="5" ry="2.400" transform="rotate(35 31 30)"/><ellipse cx="20" cy="38" rx="5" ry="2.400" transform="rotate(-35 20 38)"/><ellipse cx="32" cy="43" rx="5" ry="2.400" transform="rotate(35 32 43)"/><ellipse cx="21" cy="51" rx="5" ry="2.400" transform="rotate(-35 21 51)"/></g><circle cx="68" cy="30" r="2" ${f}/><circle cx="62" cy="70" r="2.400" ${f}/>`,
      waves: `<path ${s} d="M6 22q9-8 18 0t18 0t18 0M26 54q9-8 18 0t18 0t18 0"/><circle cx="14" cy="70" r="2" ${f}/>`,
      none: ''
    };
    return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">${shapes[kind] || ''}</svg>`;
  }
  function applyLook() {
    const L = S.look, a = $('#app'), st = document.documentElement.style;
    /* use shared background if set, else personal look bg */
    const b = (S.sharedBg && S.sharedBg.img) ? S.sharedBg : L.bg;
    const v = { '--me': L.me, '--meT': L.meT, '--them': L.them, '--themT': L.themT, '--head': L.head, '--headT': L.headT, '--comp': L.comp, '--acc': L.acc, '--rad': L.radius + 'px', '--fs': L.size + 'px', '--mf': `"${L.font}", "Inter", system-ui, sans-serif`, '--kbBg': L.kb.bg, '--kbKey': L.kb.key, '--kbT': L.kb.keyT, '--kbAcc': L.kb.acc, '--kbF': `"${L.kb.font}", "Inter", sans-serif` };
    Object.entries(v).forEach(([k, x]) => st.setProperty(k, x));
    a.dataset.dark = L.dark ? '1' : ''; a.dataset.shape = L.kb.shape; a.dataset.kh = L.kb.h; a.dataset.hide = L.hide.join(' ');
    a.dataset.tick = L.tickStyle || 'tick';
    /* background */
    const bg = $('#bg'); bg.replaceChildren();
    const base = h('i', { class: 'bgb' });
    if (b.type === 'color') base.style.background = b.c1;
    else if (b.type === 'gradient' || b.type === 'doodle') base.style.background = `linear-gradient(${b.angle}deg,${b.c1},${b.c2})`;
    else if (b.type === 'photo' && b.img) { base.style.background = `#222 url(${JSON.stringify(b.img)}) center/cover`; if (b.blur) base.style.filter = `blur(${b.blur}px)`; base.style.transform = b.blur ? 'scale(1.08)' : ''; }
    else base.style.background = b.c1;
    bg.append(base);
    if (b.type === 'doodle' && b.doodle !== 'none') bg.append(h('i', { class: 'bgd', style: `background-image:${enc(doodleTile(b.doodle, b.ink))};opacity:${L.dark ? .1 : .16}` }));
    if (b.dim) bg.append(h('i', { class: 'bgdim', style: `background:rgba(0,0,0,${b.dim / 100})` }));
    /* update live preview in customize dialog */
    updateLookPreview();
    const meta = $('meta[name=theme-color]'); if (meta) meta.content = L.head;
    renderHead(); if (typeof renderKb === 'function') renderKb();
    $('#inp').setAttribute('inputmode', L.kb.on && !S.sys ? 'none' : 'text');
  }
  function updateLookPreview() {
    const pv = $('#lkpvBg'); if (!pv) return;
    const L = S.look, b = (S.sharedBg && S.sharedBg.img) ? S.sharedBg : L.bg;
    let bgStr = '';
    if (b.type === 'photo' && b.img) bgStr = `#222 url(${JSON.stringify(b.img)}) center/cover`;
    else if (b.type === 'color') bgStr = b.c1;
    else bgStr = `linear-gradient(${b.angle || 160}deg,${b.c1},${b.c2})`;
    pv.style.background = bgStr;
    pv.style.setProperty('--lkpv-bg', bgStr);
    /* bubble colours in preview */
    $$('.lkpv-me-bub', pv).forEach(el => { el.style.background = L.me; el.style.color = L.meT; el.style.borderRadius = L.radius + 'px'; });
    $$('.lkpv-them-bub', pv).forEach(el => { el.style.background = L.them; el.style.color = L.themT; el.style.borderRadius = L.radius + 'px'; });
    $$('.me-av', pv).forEach(el => el.style.background = L.me);
    $$('.them-av', pv).forEach(el => el.style.background = L.them);
    const tick = $('#lkpvBg .lkpv-tick'); if (tick) tick.style.color = L.acc;
  }

  /* ---------- top bar ---------- */
  function statusText() {
    if (hides('status') || !S.synced) return S.synced ? '' : 'Not synced yet';
    const t = S.pres[other()]; if (!t) return ''; if (Date.now() - t < 100000) return 'online';
    const k = dayKey(t), td = dayKey(Date.now()); return 'last seen ' + (k === td ? 'today' : k === dayKey(Date.now() - 864e5) ? 'yesterday' : new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })) + ' at ' + fmtTime(t);
  }
  function renderHead() {
    const o = other(), box = $('#peerBtn'); const st = statusText();
    box.replaceChildren(hides('avatar') ? null : avatarEl(o, 'hd'), h('span', { class: 'pn' }, h('b', { text: nameOf(o) }), st ? h('small', { text: st }) : null));
    $('#btnSearch').hidden = hides('search'); renderSide();
  }

  /* ---------- messages ---------- */
  const pend = new Set();
  function tickEl(m) {
    if (hides('ticks') || m.by !== S.me) return null;
    const seen = m.seen > 0, pending = pend.has(m.id), ok = S.synced && !pending;
    const ts = S.look.tickStyle || 'tick';
    const s = h('span', { class: 'tk' + (seen ? ' seen' : '') + (pending ? ' pend' : '') });
    if (ts === 'text') {
      const label = !S.synced ? '' : pending ? 'Sent' : seen ? 'Seen' : 'Delivered';
      s.dataset.st = label; s.innerHTML = svgI(pending ? 'clock' : seen ? 'tick2' : 'tick');
    } else if (ts === 'min') {
      s.innerHTML = seen ? '·· ' : ok ? '·· ' : '·'; if (seen) s.classList.add('seen');
    } else {
      /* tick, el, ts — all use svg ticks */
      s.innerHTML = svgI(!S.synced ? 'tick' : pending ? 'clock' : 'tick2');
    }
    return s;
  }
  function esc(t, q) { if (!q) return document.createTextNode(t); const f = document.createDocumentFragment(), l = t.toLowerCase(), qq = q.toLowerCase(); let i = 0, j; while ((j = l.indexOf(qq, i)) >= 0) { f.append(t.slice(i, j), h('mark', { text: t.slice(j, j + q.length) })); i = j + q.length; } f.append(t.slice(i)); return f; }
  const dateTxt = t => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Karachi' });
  function bubble(m, head) {
    const mine = m.by === S.me, row = h('div', { class: 'row ' + (mine ? 'me' : 'them') + (head ? ' hd' : ''), 'data-id': m.id });
    const b = h('div', { class: 'bub' + (S.starred.has(m.id) ? ' starred' : '') });
    if (m.reply) { const qm = byId(m.reply.id), qgone = (qm && qm.del) || S.hid.has(m.reply.id); b.append(h('button', { type: 'button', class: 'rq', onclick: e => { e.stopPropagation(); if (!qgone) jumpTo(m.reply.id); } }, h('b', { text: m.reply.by === S.me ? 'You' : nameOf(m.reply.by) }), h('span', { text: qgone ? 'This message was deleted' : m.reply.img && !m.reply.text ? 'Photo' : m.reply.text }))); }
    if (m.img) b.append(h('img', { class: 'mimg', src: m.img, alt: 'Photo', loading: 'lazy', onclick: e => { e.stopPropagation(); openLightbox(m.img); } }));
    if (m.del) b.append(h('span', { class: 'tx del', text: '🚫 This message was deleted' }));
    if (m.text) b.append(h('span', { class: 'tx' }, esc(m.text, S.q)));
    { const tt = m.text ? ttParse(m.text) : null; if (tt) b.append(ttCard(tt)); }
    b.append(h('span', { class: 'mt' }, hides('time') ? null : h('time', { text: (hides('stamp') ? '' : dateTxt(m.t) + ' • ') + fmtTime(m.t) }), tickEl(m)));
    const rc = hides('react') ? [] : ['owner', 'partner'].map(r => m.react[r]).filter(Boolean); if (rc.length) b.append(h('span', { class: 'rc', text: [...new Set(rc)].join('') }));
    const av = hides('avatar') ? null : head ? avatarEl(m.by, 'mini') : h('span', { class: 'av mini sp' });
    const nm = head && !hides('names') ? h('span', { class: 'sn' }, h('b', { text: nameOf(m.by), style: S.prof[m.by].ncol ? 'color:' + S.prof[m.by].ncol : '' }), h('i', { text: m.by === S.me ? ' (you)' : '' }), isOn(m.by) ? h('em', { class: 'onl', text: 'online' }) : null) : null;
    row.append(av, h('div', { class: 'col' }, nm, b)); bindPress(row, m.id); return row;
  }
  let shown = 200;
  function renderMsgs(keep) {
    const box = $('#msgs'), near = box.scrollHeight - box.scrollTop - box.clientHeight < 120, prev = box.scrollHeight - box.scrollTop;
    let list = vis().sort((a, b) => a.t - b.t); const q = S.q.trim(); if (q) list = list.filter(m => (m.text || '').toLowerCase().includes(q.toLowerCase()));
    const total = list.length; if (total > shown) list = list.slice(total - shown);
    const nodes = []; if (total > shown) nodes.push(h('button', { type: 'button', class: 'more', onclick: () => { shown += 200; renderMsgs(true); } }, 'Show earlier messages'));
    let last = '', lastBy = ''; list.forEach(m => { const k = dayKey(m.t); const nd = k !== last; if (nd && !hides('dates')) nodes.push(h('div', { class: 'day' }, h('span', { text: dayLabel(m.t) }))); last = k; nodes.push(bubble(m, nd || m.by !== lastBy)); lastBy = m.by; });
    if (!list.length) nodes.push(h('div', { class: 'empty' }, h('span', { class: 'big' }, '♡'), h('p', { text: q ? 'No messages found.' : 'Say hello to your person ♡' }), h('small', { text: 'Only the two of you can read this chat.' })));
    box.replaceChildren(...nodes);
    if (keep) box.scrollTop = box.scrollHeight - prev; else if (near || renderMsgs.first) { box.scrollTop = box.scrollHeight; renderMsgs.first = false; }
    $('#toBottom').hidden = true; markSeen(); renderSide();
  }
  function jumpTo(id) { const el = $(`.row[data-id="${CSS.escape(id)}"]`); if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1400); } else toast('That message is further up. Tap "Show earlier messages".'); }
  /* Chat khula hai aur nazar ke saamne: baaki pages ka lal nishaan / alert hat jata hai */
  function noteSeen() { if (document.hidden || !S.msgs.length) return; try { localStorage.setItem('olw_chat_seen_t', String(S.msgs.reduce((a, m) => Math.max(a, m.t || 0), 0))); } catch (e) { /* ignore */ } }
  function markSeen() {
    noteSeen();
    if (!S.synced || document.hidden) return; const me = S.me, now = Date.now(), todo = S.msgs.filter(m => m.by !== me && !m.seen);
    todo.forEach(m => { m.seen = now; m.u = now; cloudSeen(m.id, now); }); if (todo.length) saveMsgs();
  }

  /* ---------- sending ---------- */
  async function send() {
    const inp = $('#inp'), text = inp.value.trim(), img = S.attach || ''; if (!text && !img) return;
    const m = normMsg({ id: uid(), by: S.me, t: Date.now(), text, img, reply: S.reply ? { id: S.reply.id, by: S.reply.by, text: S.reply.text, img: !!S.reply.img } : null });
    S.msgs.push(m); pend.add(m.id); inp.value = ''; S.reply = null; S.attach = ''; autosize(); drawBar(); renderMsgs(); renderMsgs.first = false; $('#msgs').scrollTop = $('#msgs').scrollHeight; await saveMsgs(); cloudPut(m);
  }
  function drawBar() {
    const bar = $('#replyBar'), r = S.reply, at = S.attach; bar.hidden = !r && !at;
    bar.replaceChildren(at ? h('img', { class: 'ap', src: at, alt: '' }) : null, r ? h('div', { class: 'rp' }, h('b', { text: r.by === S.me ? 'You' : nameOf(r.by) }), h('span', { text: r.img && !r.text ? 'Photo' : r.text })) : h('div', { class: 'rp' }, h('b', { text: 'Photo ready' }), h('span', { text: 'Add a caption if you like, then send' })), h('button', { type: 'button', class: 'ib sm', 'aria-label': 'Cancel', onclick: () => { S.reply = null; S.attach = ''; drawBar(); } }, ico('close')));
    const has = $('#inp').value.trim() || at; $('#btnSend').classList.toggle('send', !!has); $('#btnSend').replaceChildren(ico(has ? 'send' : 'image')); $('#btnSend').setAttribute('aria-label', has ? 'Send' : 'Add a photo');
  }
  function autosize() { const i = $('#inp'); i.style.height = 'auto'; i.style.height = Math.min(120, i.scrollHeight) + 'px'; }

  /* ---------- press / context menu on a message ---------- */
  function bindPress(row, id) {
    let t = 0, sx = 0, sy = 0; const start = e => { sx = e.clientX; sy = e.clientY; clearTimeout(t); t = setTimeout(() => openSheet(id, row), 480); };
    row.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' && e.button !== 0) return; start(e); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => row.addEventListener(ev, () => clearTimeout(t)));
    row.addEventListener('pointermove', e => { if (Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > 10) clearTimeout(t); });
    row.addEventListener('contextmenu', e => { e.preventDefault(); clearTimeout(t); openSheet(id, row); });
    row.addEventListener('dblclick', () => { if (!hides('react')) setReact(id, '❤️'); });
  }
  function openSheet(id, row) {
    const m = byId(id); if (!m) return; const sh = $('#sheet'); if (navigator.vibrate) try { navigator.vibrate(12); } catch (e) { }
    const emo = hides('react') ? null : h('div', { class: 'em' }, ...['❤️', '😂', '😮', '😢', '👍', '🙏'].map(e => h('button', { type: 'button', text: e, onclick: () => { setReact(id, e); closeSheet(); } })));
    const act = (ic, label, fn, cls) => h('button', { type: 'button', class: cls || '', onclick: () => { closeSheet(); fn(); } }, ico(ic), label);
    const isStarred = S.starred.has(id), isPinned = S.pinned.includes(id);
    if (m.del) { sh.replaceChildren(act('trash', 'Delete for me', () => delForMe(id), 'danger')); $('#sheetWrap').hidden = false; return; }
    sh.replaceChildren(emo,
      act('reply', 'Reply', () => { S.reply = { id: m.id, by: m.by, text: m.text.slice(0, 120), img: !!m.img }; drawBar(); $('#inp').focus(); }),
      act('heart', isStarred ? 'Unstar' : 'Star Message', () => toggleStar(id)),
      act('plus', isPinned ? 'Unpin' : 'Pin Message', () => togglePin(id)),
      m.text ? act('copy', 'Copy', () => { try { navigator.clipboard.writeText(m.text); toast('Copied'); } catch (e) { toast('Could not copy'); } }) : null,
      act('trash', 'Delete for me', () => delForMe(id), 'danger'),
      m.by === S.me ? act('trash', 'Delete for everyone', () => delForAll(id), 'danger') : null);
    $('#sheetWrap').hidden = false;
  }
  function closeSheet() { $('#sheetWrap').hidden = true; $('#sheet').classList.remove('qs'); }
  async function setReact(id, e) { const m = byId(id); if (!m) return; const cur = m.react[S.me]; m.react[S.me] = cur === e ? '' : e; m.u = Date.now(); await saveMsgs(); renderMsgs(); cloudReact(m); }
  /* Delete for me: sirf mere phone se chhup jata hai (doosre ko koi farq nahi). Apne aur doosre, dono ke messages par. */
  async function delForMe(id) {
    if (!(await ask('Delete for me?', 'It will disappear only from this phone. ' + (byId(id) && byId(id).by === S.me ? 'The other person can still see it.' : 'It stays in ' + nameOf(other()) + '\'s chat.'), 'Delete for me'))) return;
    S.hid.add(id); saveHid(); S.starred.delete(id); const pi = S.pinned.indexOf(id); if (pi >= 0) S.pinned.splice(pi, 1);
    try { localStorage.setItem('olw_starred', JSON.stringify([...S.starred])); localStorage.setItem('olw_pinned', JSON.stringify(S.pinned)); } catch (e) { }
    renderMsgs(true); updateCounts(); toast('Deleted for you');
  }
  /* Delete for everyone: sirf apna message. Dono phones par "This message was deleted" reh jata hai. */
  async function delForAll(id) {
    const m = byId(id); if (!m || m.by !== S.me || m.del) return;
    if (!(await ask('Delete for everyone?', 'This message will be deleted for both of you. This cannot be undone.', 'Delete for everyone'))) return;
    m.del = true; m.text = ''; m.img = ''; m.reply = null; m.react = { owner: '', partner: '' }; m.u = Date.now();
    S.starred.delete(id); const pi = S.pinned.indexOf(id); if (pi >= 0) S.pinned.splice(pi, 1);
    try { localStorage.setItem('olw_starred', JSON.stringify([...S.starred])); localStorage.setItem('olw_pinned', JSON.stringify(S.pinned)); } catch (e) { }
    await saveMsgs(); renderMsgs(true); updateCounts(); cloudPut(m); toast('Deleted for everyone');
  }
  function toggleStar(id) { if (S.starred.has(id)) S.starred.delete(id); else S.starred.add(id); try { localStorage.setItem('olw_starred', JSON.stringify([...S.starred])); } catch(e){} renderMsgs(true); updateCounts(); toast(S.starred.has(id) ? '★ Starred' : 'Unstarred'); }
  function togglePin(id) { const i = S.pinned.indexOf(id); if (i >= 0) S.pinned.splice(i, 1); else { S.pinned.unshift(id); if (S.pinned.length > 5) S.pinned.pop(); } try { localStorage.setItem('olw_pinned', JSON.stringify(S.pinned)); } catch(e){} renderMsgs(true); updateCounts(); toast(S.pinned.includes(id) ? '📌 Pinned' : 'Unpinned'); }
  function updateCounts() { const sc = $('#starCnt'), pc = $('#pinCnt'); if (sc) sc.textContent = S.starred.size; if (pc) pc.textContent = S.pinned.length; }
  function showStarred() { const list = vis().filter(m => !m.del && S.starred.has(m.id)); const sh = $('#sheet'); sh.replaceChildren(h('p', { class: 'sh-t', text: '★ Starred Messages' }), ...list.map(m => h('button', { type: 'button', class: 'q', text: (m.text || 'Photo') + ' — ' + fmtTime(m.t), onclick: () => { closeSheet(); jumpTo(m.id); } }))); if (!list.length) sh.append(h('p', { class: 'hint', text: 'No starred messages yet. Long-press a message to star it.' })); sh.classList.add('qs'); $('#sheetWrap').hidden = false; }
  function showPinned() { const list = vis().filter(m => !m.del && S.pinned.includes(m.id)); const sh = $('#sheet'); sh.replaceChildren(h('p', { class: 'sh-t', text: '📌 Pinned Messages' }), ...list.map(m => h('button', { type: 'button', class: 'q', text: (m.text || 'Photo') + ' — ' + fmtTime(m.t), onclick: () => { closeSheet(); jumpTo(m.id); } }))); if (!list.length) sh.append(h('p', { class: 'hint', text: 'No pinned messages yet. Long-press a message to pin it.' })); sh.classList.add('qs'); $('#sheetWrap').hidden = false; }
  function showRemoved() { toast('Removed messages feature coming soon.'); }

  /* ---------- TikTok links: card + player inside the chat, and "Share to Our Little World" ---------- */
  const TT_RE = /https?:\/\/(?:[a-z0-9-]+\.)?tiktok\.com\/[^\s<>"']+/i;
  function ttParse(text) {
    const m = String(text || '').match(TT_RE); if (!m) return null;
    const url = m[0].replace(/[.,!?)\]]+$/, '');
    const id = (url.match(/\/(?:video|photo)\/(\d{8,25})/) || url.match(/[?&]item_id=(\d{8,25})/) || [])[1] || '';
    return { url, id, user: (url.match(/tiktok\.com\/(@[\w.]+)/) || [])[1] || '' };
  }
  const ttCache = new Map();
  function ttOembed(url) {
    if (!ttCache.has(url)) ttCache.set(url, fetch('https://www.tiktok.com/oembed?url=' + encodeURIComponent(url)).then(r => (r.ok ? r.json() : null)).catch(() => null));
    return ttCache.get(url);
  }
  function ttCard(info) {
    const th = h('span', { class: 'tt-th' }, h('span', { class: 'tt-pl', text: '▶' })), t1 = h('b', { class: 'tt-t', text: 'TikTok video' }), t2 = h('small', { class: 'tt-s', text: info.user || 'Tap to watch here ♡' });
    const card = h('button', { type: 'button', class: 'tt', 'aria-label': 'Play TikTok video', onclick: e => { e.stopPropagation(); openTikTok(info); } }, th, h('span', { class: 'tt-m' }, t1, t2));
    ttOembed(info.url).then(o => {
      if (!o) return; if (o.title) t1.textContent = String(o.title).slice(0, 90); if (o.author_name) t2.textContent = '@' + String(o.author_name).replace(/^@/, '').slice(0, 40);
      if (typeof o.thumbnail_url === 'string' && /^https:\/\//.test(o.thumbnail_url)) th.style.backgroundImage = `url(${JSON.stringify(o.thumbnail_url)})`;
    });
    return card;
  }
  function closeTikTok() { const w = $('#ttPlayer'); if (w) { w.hidden = true; w.replaceChildren(); } }
  async function openTikTok(info) {
    let w = $('#ttPlayer');
    if (!w) { w = h('div', { id: 'ttPlayer', hidden: true }); document.body.append(w); w.addEventListener('click', e => { if (e.target === w) closeTikTok(); }); }
    const openLink = h('a', { class: 'tt-open', href: info.url, target: '_blank', rel: 'noopener noreferrer', text: 'Open in TikTok' });
    const box = h('div', { class: 'tt-box' }, h('button', { type: 'button', class: 'ib tt-x', 'aria-label': 'Close', onclick: closeTikTok }, ico('close')));
    const body = h('div', { class: 'tt-body' }, h('p', { class: 'tt-note', text: 'Loading video...' }));
    box.append(body, openLink); w.replaceChildren(box); w.hidden = false;
    let id = info.id;
    if (!id) { const o = await ttOembed(info.url); const mm = o && String(o.html || '').match(/data-video-id="(\d{8,25})"/); id = mm ? mm[1] : (o && /^\d{8,25}$/.test(String(o.embed_product_id || '')) ? String(o.embed_product_id) : ''); }
    if (w.hidden) return;
    if (!id) { body.replaceChildren(h('p', { class: 'tt-note', text: 'This video cannot play inside the chat. Please open it in TikTok.' })); return; }
    body.replaceChildren(h('iframe', { class: 'tt-frame', src: 'https://www.tiktok.com/embed/v2/' + id, allow: 'autoplay; fullscreen; encrypted-media; picture-in-picture', allowfullscreen: '', referrerpolicy: 'strict-origin-when-cross-origin', title: 'TikTok video' }));
  }
  /* Android "Share" menu -> this chat: the link arrives in the URL (?text=...&url=...) or is saved by the page guard while the app is locked */
  function takeShared() {
    let p = null;
    try { const q = new URLSearchParams(location.search); if (q.has('url') || q.has('text') || q.has('title')) { p = { title: q.get('title') || '', text: q.get('text') || '', url: q.get('url') || '' }; history.replaceState(null, '', location.pathname); } } catch (e) { /* ignore */ }
    if (!p) { try { const raw = localStorage.getItem('olw_share_pending'); if (raw) { localStorage.removeItem('olw_share_pending'); const o = JSON.parse(raw); if (o && Date.now() - (+o.t || 0) < 30 * 60 * 1000) p = o; } } catch (e) { /* ignore */ } }
    if (!p) return;
    const parts = []; [p.text, p.title, p.url].forEach(x => { x = String(x || '').trim(); if (x && !parts.some(y => y.includes(x))) parts.push(x); });
    if (!parts.length) return;
    const inp = $('#inp'); inp.value = parts.join('\n').slice(0, 1500); autosize(); drawBar();
    toast('Shared link is ready. Press send ♡');
  }

  /* ---------- big photo ---------- */
  function openLightbox(src) { const l = $('#lightbox'); l.replaceChildren(h('img', { src, alt: 'Photo' })); l.hidden = false; }


  /* ---------- my own keyboard ---------- */
  const EMO = {
    '😀': '😀😃😄😁😆😅😂🤣😊😇🙂😉😌😍🥰😘😗😙😚😋😛😜🤪😝🤗🤭🤔😐😏😒🙄😬😴😪🥱😷🥺😢😭😤😡🤯😱😳🥵🥶',
    '❤️': '❤️🧡💛💚💙💜🖤🤍🤎💔❣️💕💞💓💗💖💘💝💟💋💌🌹🥀🌷🌸💐🌺🌻🌼✨💫⭐🌟🔥💯🎀',
    '👍': '👍👎👌🤌🤏✌️🤞🤟🤘🤙👈👉👆👇☝️👋🤚✋🖖👏🙌🤲🤝🙏💪🫶🫂👀👅👄🧠',
    '🐶': '🐶🐱🐭🐹🐰🦊🐻🐼🐨🐯🦁🐮🐷🐸🐵🐔🐧🐦🦆🦉🦋🐝🐞🐢🐬🐳🐙🦄🐾🌿🍀🌴🌵',
    '🍕': '🍎🍊🍋🍌🍉🍇🍓🍒🍑🍍🥭🍕🍔🍟🌭🍿🍩🍪🎂🍰🧁🍫🍬🍭☕🍵🥤🍷🍦🍫',
    '✈️': '✈️🚗🚕🚌🏍️🚲⛵🏝️🏔️🌅🌄🌈☀️🌙⭐🌧️⛄🌊🏠🎡🌍🗺️🏖️🌃',
    '🎁': '🎁🎈🎉🎊🎵🎶📷📸🎬📱💻⌚💡🔑🔒📖✏️💍👑🕯️🧸🪞🎧🎤🖼️📝',
    '✅': '✅❌⭕❗❓💯🔔♾️💥💤💢💦💨🎯➕➖✔️➡️⬅️⬆️⬇️🔁🆗🔜'
  };
  const LAYERS = {
    abc: [['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'], ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'], ['z', 'x', 'c', 'v', 'b', 'n', 'm']],
    num: [['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'], ['-', '/', ':', ';', '(', ')', '₨', '&', '@', '"'], ['.', ',', '?', '!', "'", '♡', '~']],
    urdu: [['ق', 'و', 'ع', 'ر', 'ت', 'ے', 'ء', 'ی', 'ہ', 'پ'], ['ا', 'س', 'د', 'ف', 'گ', 'ح', 'ج', 'ک', 'ل'], ['ز', 'ش', 'چ', 'ط', 'ب', 'ن', 'م', '،']],
    urdu2: [['ً', 'ٌ', 'ٍ', 'َ', 'ُ', 'ِ', 'ّ', 'ْ', 'ٰ', '؟'], ['آ', 'ص', 'ڈ', 'غ', 'ھ', 'خ', 'ض', 'ذ', '۔'], ['ژ', 'ٹ', 'ث', 'ظ', 'ں', 'ۓ', 'ڑ', '!']]
  };
  let audioCtx = null;
  function clickSound() { try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.type = 'sine'; o.frequency.value = 520; g.gain.value = .05; o.connect(g); g.connect(audioCtx.destination); o.start(); g.gain.exponentialRampToValueAtTime(.0001, audioCtx.currentTime + .05); o.stop(audioCtx.currentTime + .06); } catch (e) { } }
  function insertAt(inp, str) { const s = inp.selectionStart == null ? inp.value.length : inp.selectionStart, e = inp.selectionEnd == null ? s : inp.selectionEnd; inp.value = inp.value.slice(0, s) + str + inp.value.slice(e); const p = s + str.length; try { inp.setSelectionRange(p, p); } catch (er) { } inp.dispatchEvent(new Event('input', { bubbles: true })); }
  function backspace(inp) {
    const s = inp.selectionStart == null ? inp.value.length : inp.selectionStart, e = inp.selectionEnd == null ? s : inp.selectionEnd; let a = s;
    if (s === e) { if (!s) return; const last = Array.from(inp.value.slice(0, s)).pop(); a = s - last.length; }
    inp.value = inp.value.slice(0, a) + inp.value.slice(e); try { inp.setSelectionRange(a, a); } catch (er) { } inp.dispatchEvent(new Event('input', { bubbles: true }));
  }
  /* build a keyboard into `box`. getInp() gives the text box it types into; opts.kb is the keyboard design (so a preview can use unsaved colours). */
  function buildKb(box, getInp, opts = {}) {
    const st = { layer: opts.emoji ? 'emoji' : (S.look.kb.layout === 'urdu' ? 'urdu' : 'abc'), shift: false, caps: false, cat: Object.keys(EMO)[0], rep: null, rep2: null };
    const K = () => (opts.kb ? opts.kb() : S.look.kb);
    function key(label, o = {}) {
      const b = h('button', { type: 'button', class: 'k' + (o.cls ? ' ' + o.cls : ''), 'aria-label': o.aria || label, tabindex: '-1' }); if (o.icon) b.append(ico(o.icon)); else b.textContent = label; if (o.w) b.style.flex = o.w;
      const fire = () => { const k = K(); if (k.vibrate && navigator.vibrate) try { navigator.vibrate(7); } catch (e) { } if (k.sound) clickSound(); o.fn(); };
      b.addEventListener('pointerdown', e => { e.preventDefault(); fire(); if (o.hold) { clearTimeout(st.rep); clearInterval(st.rep2); st.rep = setTimeout(() => { st.rep2 = setInterval(o.fn, 55); }, 380); } });
      const stop = () => { clearTimeout(st.rep); clearInterval(st.rep2); }; ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, stop));
      b.addEventListener('click', e => { if (e.detail === 0) o.fn(); }); return b;
    }
    const typeCh = ch => { const inp = getInp(); inp.focus({ preventScroll: true }); insertAt(inp, ch); if (st.shift && !st.caps) { st.shift = false; draw(); } autoCap(); };
    function autoCap() { if (st.layer !== 'abc' || st.caps) return; const inp = getInp(), before = inp.value.slice(0, inp.selectionStart == null ? inp.value.length : inp.selectionStart); const want = /(^|[.!?]\s+|\n)$/.test(before); if (want !== st.shift) { st.shift = want; draw(); } }
    const setLayer = l => { st.layer = l; draw(); };
    function draw() {
      const k = K(); box.dataset.layer = st.layer; const rows = [];
      if (st.layer === 'emoji') {
        const recent = (() => { try { return JSON.parse(localStorage.getItem('olw_chat_recent') || '[]'); } catch (e) { return []; } })();
        const tabs = h('div', { class: 'kb-tabs' }, h('button', { type: 'button', class: 'k fn', tabindex: '-1', 'aria-label': 'Back to letters', onpointerdown: e => { e.preventDefault(); setLayer(k.layout === 'urdu' ? 'urdu' : 'abc'); } }, 'ABC'), ...(recent.length ? [['🕘', 'Recent']] : []).concat(Object.keys(EMO).map(c => [c, c])).map(([c]) => h('button', { type: 'button', class: 'k tab' + (st.cat === c ? ' on' : ''), tabindex: '-1', text: c, onpointerdown: e => { e.preventDefault(); st.cat = c; draw(); } })), key('', { icon: 'del', cls: 'fn', fn: () => backspace(getInp()), hold: 1, aria: 'Delete' }));
        const list = st.cat === '🕘' ? recent : Array.from(EMO[st.cat] || '').filter((c, i, a) => c.trim());
        const items = st.cat === '🕘' ? recent : splitEmoji(EMO[st.cat] || '');
        const grid = h('div', { class: 'kb-emo' }, ...items.map(e => h('button', { type: 'button', class: 'e', tabindex: '-1', text: e, onpointerdown: ev => { ev.preventDefault(); const inp = getInp(); inp.focus({ preventScroll: true }); insertAt(inp, e); try { const r = [e, ...recent.filter(x => x !== e)].slice(0, 24); localStorage.setItem('olw_chat_recent', JSON.stringify(r)); } catch (er) { } if (K().vibrate && navigator.vibrate) try { navigator.vibrate(6); } catch (er) { } } })));
        box.replaceChildren(tabs, grid, h('div', { class: 'kb-r' }, key('', { icon: 'globe', cls: 'fn', fn: () => { setLayer('abc'); }, aria: 'Letters' }), key('space', { cls: 'sp', w: '5', fn: () => typeCh(' ') }), key('', { icon: 'back2', cls: 'fn acc', fn: () => typeCh('\n'), aria: 'New line' })));
        return;
      }
      const L = st.layer; const urdu = L === 'urdu' || L === 'urdu2'; const base = LAYERS[L] || LAYERS.abc, up = st.shift || st.caps;
      const letters = r => r.map(c => key(L === 'abc' && up ? c.toUpperCase() : c, { fn: () => typeCh(L === 'abc' && up ? c.toUpperCase() : c) }));
      if (k.numrow && L !== 'num') rows.push(h('div', { class: 'kb-r num' }, ...LAYERS.num[0].map(c => key(c, { fn: () => typeCh(c) }))));
      rows.push(h('div', { class: 'kb-r' }, ...letters(base[0]))); rows.push(h('div', { class: 'kb-r pad' }, ...letters(base[1])));
      const r3 = [];
      if (L === 'abc') r3.push(key('', { icon: 'shift', cls: 'fn' + (st.caps ? ' caps' : st.shift ? ' on' : ''), w: '1.5', aria: 'Shift', fn: () => { if (st.shift && !st.caps) { st.caps = true; } else if (st.caps) { st.caps = false; st.shift = false; } else st.shift = true; draw(); } }));
      else if (urdu) r3.push(key(L === 'urdu' ? 'ٰ◌' : 'ا', { cls: 'fn', w: '1.5', aria: 'More Urdu keys', fn: () => setLayer(L === 'urdu' ? 'urdu2' : 'urdu') }));
      else r3.push(key('', { cls: 'fn', w: '1.5', fn: () => { } }));
      r3.push(...letters(base[2])); r3.push(key('', { icon: 'del', cls: 'fn', w: '1.5', aria: 'Delete', fn: () => { backspace(getInp()); autoCap(); }, hold: 1 })); rows.push(h('div', { class: 'kb-r' }, ...r3));
      rows.push(h('div', { class: 'kb-r bot' }, key(L === 'num' ? 'ABC' : '123', { cls: 'fn', w: '1.4', fn: () => setLayer(L === 'num' ? (k.layout === 'urdu' ? 'urdu' : 'abc') : 'num') }),
        key('', { icon: 'smile', cls: 'fn', w: '1.2', aria: 'Emoji', fn: () => setLayer('emoji') }), key('', { icon: 'globe', cls: 'fn', w: '1.2', aria: 'Switch language', fn: () => { const to = urdu ? 'abc' : 'urdu'; if (!opts.kb) { S.look.kb.layout = to; saveLookSoft(); } setLayer(to); } }),
        key(urdu ? 'فاصلہ' : 'space', { cls: 'sp', w: '4', fn: () => typeCh(' ') }), key(urdu ? '۔' : '.', { cls: 'fn', w: '1', fn: () => typeCh(urdu ? '۔' : '.') }), key('', { icon: 'back2', cls: 'fn acc', w: '1.4', aria: 'New line', fn: () => typeCh('\n') })));
      box.replaceChildren(...rows);
    }
    draw(); setTimeout(autoCap, 0); return { draw, setLayer, st };
  }
  function splitEmoji(s) { try { return [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(s)].map(x => x.segment).filter(x => x.trim()); } catch (e) { return Array.from(s).filter(x => x.trim() && x !== '️' && x !== '‍'); } }
  let kbCtl = null;
  function renderKb() { const box = $('#kb'); if (!box) return; box.hidden = !S.kbOpen; box.dataset.on = S.look.kb.on ? '1' : ''; if (!S.kbOpen) { document.body.classList.remove('kbopen'); return; } document.body.classList.add('kbopen'); kbCtl = buildKb(box, () => $('#inp'), { emoji: S.kbEmoji }); }
  function setKb(open, emoji) { S.kbOpen = open; S.kbEmoji = !!emoji; renderKb(); if (open) setTimeout(() => { const m = $('#msgs'); m.scrollTop = m.scrollHeight; }, 60); }
  let lookT; function saveLookSoft() { S.look.updated = Date.now(); saveLook(); clearTimeout(lookT); lookT = setTimeout(() => cloudPutLook(), 700); }


  /* ---------- photos: from the phone or from the Gallery ---------- */
  const loadImg = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  async function fileImg(file) { const url = URL.createObjectURL(file); try { return await loadImg(url); } finally { setTimeout(() => URL.revokeObjectURL(url), 4000); } }
  function toURL(img, maxPx, q, maxBytes, square) {
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height; let s = Math.min(1, maxPx / (square ? Math.min(iw, ih) : Math.max(iw, ih))), url = '';
    for (let t = 0; t < 8; t++) {
      const c = document.createElement('canvas'), x = c.getContext('2d'); let sx = 0, sy = 0, sw = iw, sh = ih;
      if (square) { const m = Math.min(iw, ih); sx = (iw - m) / 2; sy = (ih - m) / 2; sw = sh = m; c.width = c.height = Math.max(1, Math.round(m * s)); } else { c.width = Math.max(1, Math.round(iw * s)); c.height = Math.max(1, Math.round(ih * s)); }
      x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height); url = c.toDataURL('image/jpeg', q); if (url.length * .75 <= maxBytes) return url; q -= .1; if (q < .45) { q = .65; s *= .8; }
    }
    return url;
  }
  /* a photo that is already small enough is kept exactly as it is */
  async function fitSrc(src, o) { if (!o.square && /^data:image\/(jpeg|png|webp);/.test(src) && src.length * .75 <= o.bytes) return src; const img = await loadImg(src); return toURL(img, o.px, .9, o.bytes, o.square); }
  function idbGet(name, key) { return new Promise(res => { try { const r = indexedDB.open(name); r.onsuccess = () => { const db = r.result; if (!db.objectStoreNames.contains('kv')) { db.close(); return res(undefined); } const q = db.transaction('kv').objectStore('kv').get(key); q.onsuccess = () => { res(q.result); db.close(); }; q.onerror = () => { res(undefined); db.close(); }; }; r.onerror = () => res(undefined); } catch (e) { res(undefined); } }); }
  async function galleryList() {
    const out = [], loc = (await idbGet('olw_gallery_v1', 'photos')) || [];
    loc.forEach(p => { if (p && p.type !== 'video' && p.thumb) out.push({ id: p.id, thumb: p.thumb, name: p.name || '', date: p.date || '' }); });
    if (window.OLW && OLW.signedIn) { try { const snap = await OLW.space().collection('gallery').get(); snap.forEach(d => { const p = d.data(); if (!out.some(x => x.id === d.id) && p.type !== 'video' && p.thumb) out.push({ id: d.id, thumb: p.thumb, name: p.name || '', date: p.date || '' }); }); } catch (e) { } }
    return out.sort((a, b) => (b.date < a.date ? -1 : b.date > a.date ? 1 : 0));
  }
  async function gallerySrc(it) {
    const s = await idbGet('olw_gallery_v1', 's:' + it.id); if (s) return s;
    if (window.OLW && OLW.signedIn) { try { const d = await OLW.space().collection('gsrc').doc(it.id).get(); if (d.exists && d.data().src) return d.data().src; } catch (e) { } }
    return it.thumb;
  }
  /* opens the picker; resolves with a data URL (already fitted) or '' */
  function pickPhoto(opts) {
    return new Promise(async res => {
      const d = $('#dlgPick'), grid = $('#pickGrid'); let done = false; const fin = v => { if (done) return; done = true; closeDlg(d); res(v); };
      $('#pickTitle').textContent = opts.title || 'Choose a photo'; grid.replaceChildren(h('p', { class: 'hint', text: 'Loading your Gallery...' })); d.oncancel = () => fin(''); $('#pickClose').onclick = () => fin('');
      const f = $('#filePick'); $('#pickUp').onclick = () => f.click();
      f.onchange = async () => { const file = f.files[0]; f.value = ''; if (!file) return; try { const img = await fileImg(file); fin(await fitSrc(img.src, opts)); } catch (e) { toast('Could not use that photo.'); } };
      openDlg(d); const list = await galleryList();
      grid.replaceChildren(...list.map(it => h('button', { type: 'button', class: 'pk', 'aria-label': it.name || 'Photo', onclick: async () => { toast('One moment...'); try { fin(await fitSrc(await gallerySrc(it), opts)); } catch (e) { toast('Could not use that photo.'); } } }, h('img', { src: it.thumb, alt: '' }))));
      if (!list.length) grid.replaceChildren(h('p', { class: 'hint', text: 'Your Gallery has no photos on this phone yet. Open the Gallery once (signed in), or upload from your phone with the button above.' }));
    });
  }

  /* ---------- top menu ---------- */
  function toggleMenu(force) { const m = $('#menu'), open = force != null ? force : m.hidden; m.hidden = !open; $('#btnMenu').setAttribute('aria-expanded', open ? 'true' : 'false'); }

  /* ---------- profile ---------- */
  const MOODS = ['😊', '🥰', '😍', '😴', '😎', '🤗', '😢', '🥳', '🔥', '💭', '🌸', '☕'];
  const daysToBday = b => { if (!b) return null; const [y, m, d] = b.split('-').map(Number), now = new Date(), t = new Date(now.getFullYear(), now.getMonth(), now.getDate()); let n = new Date(now.getFullYear(), m - 1, d); if (n < t) n = new Date(now.getFullYear() + 1, m - 1, d); return Math.round((n - t) / 864e5); };
  function profCard(role, d, live) {
    const wrap = h('div', { class: 'pcard' }), cov = h('div', { class: 'pcov' }); if (d.cover) cov.style.backgroundImage = `url(${JSON.stringify(d.cover)})`;
    const av = h('span', { class: 'av big' }, d.avatar ? h('img', { src: d.avatar, alt: '' }) : h('b', { text: ((d.name || nameOf(role))[0] || '♡').toUpperCase() })); av.dataset.sh = d.shape || 'circle'; if (d.ring) av.style.setProperty('--ring', d.ring);
    const st = live ? '' : statusText(), bd = daysToBday(d.birthday), rows = [];
    if (d.birthday) rows.push(['🎂', 'Birthday', new Date(d.birthday + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) + (bd === 0 ? ' - today! 🎉' : bd != null ? ' (in ' + bd + ' day' + (bd === 1 ? '' : 's') + ')' : '')]);
    if (d.city) rows.push(['📍', 'Lives in', d.city]); if (d.mail) rows.push(['✉️', 'ID', d.mail]);
    wrap.append(cov, h('div', { class: 'pmid' }, av, h('h3', { text: d.name || nameOf(role), style: d.ncol ? 'color:' + d.ncol : '' }), (d.mood || d.status) ? h('p', { class: 'pmood', text: (d.mood ? d.mood + ' ' : '') + d.status }) : null, st ? h('p', { class: 'hint', text: st }) : null, h('p', { class: 'ab', text: d.about || 'Hey there! I am using Our Little World ♡' }),
      d.quote ? h('blockquote', { class: 'pq', text: '“' + d.quote + '”' }) : null, rows.length ? h('div', { class: 'pinfo' }, ...rows.map(r => h('div', {}, h('span', { text: r[0] }), h('small', { text: r[1] }), h('b', { text: r[2] })))) : null));
    return wrap;
  }
  function openProfile(role) {
    const mine = role === S.me, p = S.prof[role], box = $('#profBody'); const draft = Object.assign({}, p); if (mine && !draft.mail && window.OLW && OLW.user) draft.mail = OLW.user.email || '';
    const draw = () => {
      if (!mine) { box.replaceChildren(profCard(role, p, false), h('div', { class: 'btnrow' }, h('button', { type: 'button', class: 'btn', onclick: () => closeDlg($('#dlgProf')) }, 'Close'))); return; }
      const keep = $('#dlgProf').scrollTop, T = (label, key, ph, max, type) => h('label', { class: 'fl' }, label, h('input', { type: type || 'text', maxlength: String(max || 60), value: draft[key] || '', placeholder: ph || '', oninput: e => { draft[key] = e.target.value; prev(); } }));
      const pv = h('div', { id: 'pprev' }); const prev = () => pv.replaceChildren(profCard(role, draft, true));
      const photo = (title, key, opts) => h('div', { class: 'row2' }, h('button', { type: 'button', class: 'btn soft', onclick: async () => { const v = await pickPhoto(Object.assign({ title }, opts)); if (v) { draft[key] = v; draw(); } } }, ico('image'), (key === 'cover' ? 'Cover photo' : 'Profile photo') + ': Gallery or phone'), draft[key] ? h('button', { type: 'button', class: 'btn ghost', onclick: () => { draft[key] = ''; draw(); } }, 'Remove') : null);
      prev();
      box.replaceChildren(pv, h('h4', { class: 'psec', text: 'Photos' }), photo('Choose your profile photo', 'avatar', { px: 320, bytes: 90000, square: true }), photo('Choose a cover photo', 'cover', { px: 1000, bytes: 230000 }),
        h('h4', { class: 'psec', text: 'About you' }), T('Name', 'name', 'Your name', 30), T('About', 'about', 'A few words about you', 80), T('Favourite quote', 'quote', 'A line you love', 120), T('City', 'city', 'Where you live', 30), T('Birthday', 'birthday', '', 10, 'date'),
        h('h4', { class: 'psec', text: 'Mood' }), h('div', { class: 'chips' }, ...MOODS.map(m => h('button', { type: 'button', class: 'chip' + (draft.mood === m ? ' on' : ''), text: m, onclick: () => { draft.mood = draft.mood === m ? '' : m; draw(); } }))), T('Status', 'status', 'What are you up to?', 40),
        h('h4', { class: 'psec', text: 'Style' }), h('div', { class: 'chips' }, ...[['circle', 'Circle'], ['rounded', 'Rounded'], ['heart', 'Heart ♡'], ['square', 'Square']].map(([k, n]) => h('button', { type: 'button', class: 'chip' + (draft.shape === k ? ' on' : ''), text: n, onclick: () => { draft.shape = k; draw(); } }))),
        h('label', { class: 'cr' }, h('span', { text: 'Photo ring colour' }), h('input', { type: 'color', value: draft.ring || '#8a64a3', 'aria-label': 'Ring colour', oninput: e => { draft.ring = e.target.value; prev(); } }), draft.ring ? h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { draft.ring = ''; draw(); } }, 'None') : null),
        h('label', { class: 'cr' }, h('span', { text: 'Name colour' }), h('input', { type: 'color', value: draft.ncol || '#4a1d70', 'aria-label': 'Name colour', oninput: e => { draft.ncol = e.target.value; prev(); } }), draft.ncol ? h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { draft.ncol = ''; draw(); } }, 'Reset') : null),
        h('div', { class: 'btnrow sticky' }, h('button', { type: 'button', class: 'btn ghost', onclick: () => closeDlg($('#dlgProf')) }, 'Cancel'), h('button', { type: 'button', class: 'btn', onclick: async () => { S.prof[role] = normProfile(Object.assign({}, draft, { updated: Date.now() })); await saveProf(); renderHead(); renderMsgs(true); cloudPutProf(); closeDlg($('#dlgProf')); toast('Saved ♡'); } }, 'Save')));
      $('#dlgProf').scrollTop = keep;
    };
    draw(); openDlg($('#dlgProf'));
  }

  /* ---------- customize: designs, bubbles, background, keyboard, show / hide ---------- */
  const LK = { tab: 'themes' };
  function chg(patch, soft) { const L = S.look; Object.keys(patch).forEach(k => { if (k === 'bg' || k === 'kb') L[k] = Object.assign({}, L[k], patch[k]); else L[k] = patch[k]; }); applyLook(); saveLookSoft(); if (!soft) drawLook(); }
  const cl = {
    color: (label, get, set) => h('label', { class: 'cr' }, h('span', { text: label }), h('input', { type: 'color', value: get(), 'aria-label': label, oninput: e => set(e.target.value) })),
    slider: (label, min, max, get, set, fmt) => { const out = h('output', { text: fmt ? fmt(get()) : get() }); return h('label', { class: 'sl' }, h('span', { text: label }), h('input', { type: 'range', min, max, value: get(), 'aria-label': label, oninput: e => { out.textContent = fmt ? fmt(+e.target.value) : e.target.value; set(+e.target.value); } }), out); },
    chips: (items, get, set) => h('div', { class: 'chips' }, ...items.map(([k, n]) => h('button', { type: 'button', class: 'chip' + (get() === k ? ' on' : ''), text: n, onclick: () => set(k) }))),
    tg: (label, get, set) => h('label', { class: 'tg' }, h('input', { type: 'checkbox', checked: get(), onchange: e => set(e.target.checked) }), h('span', { text: label })),
    sec: (t, ...k) => h('section', { class: 'lk-sec' }, h('h4', { text: t }), ...k)
  };
  function drawLook() {
    const L = S.look, B = L.bg, K = L.kb, box = $('#lookBody'), top = box.scrollTop;
    $$('#lookTabs [data-t]').forEach(b => b.classList.toggle('on', b.dataset.t === LK.tab));
    updateLookPreview();
    const kids = [];

    if (LK.tab === 'themes') {
      kids.push(
        h('p', { class: 'hint', text: 'One tap changes everything — bubbles, background, header and keyboard.' }),
        h('div', { class: 'pgrid' }, ...Object.entries(PRESETS).map(([k, p]) => {
          const bgStr = p.bg.type === 'gradient' ? `linear-gradient(${p.bg.angle||160}deg,${p.bg.c1},${p.bg.c2})` : `linear-gradient(160deg,${p.bg.c1},${p.bg.c2})`;
          const card = h('button', { type: 'button', class: 'pc' + (L.preset === k ? ' on' : ''), onclick: () => {
            const keep = { hide: L.hide.slice(), tickStyle: L.tickStyle, kb: { layout: L.kb.layout } };
            S.look = Object.assign(lookFrom(k), { hide: keep.hide, tickStyle: keep.tickStyle, updated: Date.now() });
            S.look.kb.layout = keep.kb.layout; applyLook(); saveLookSoft(); drawLook();
          }});
          const thumb = h('div', { class: 'pc-thumb', style: `background:${bgStr}` });
          thumb.append(
            h('div', { class: 'pc-them', style: `background:${p.them};color:${p.themT};border-radius:10px 10px 10px 2px` }, 'Hello! ♡'),
            h('div', { class: 'pc-me', style: `background:${p.me};color:${p.meT};border-radius:10px 10px 2px 10px` }, 'I miss you')
          );
          const foot = h('div', { class: 'pc-foot' }, h('b', { text: p.n }), h('div', { class: 'pc-check' }, L.preset === k ? '✓' : ''));
          card.append(thumb, foot); return card;
        }))
      );

    } else if (LK.tab === 'bg') {
      /* shared background note */
      kids.push(h('div', { class: 'lk-sec', style: 'border:2px solid #e4b8f0' },
        h('h4', { text: '🌟 Shared Background' }),
        h('p', { class: 'hint', text: 'This background shows on BOTH phones — yours and your partner\'s. Set it once, both see it.' }),
        h('div', { class: 'bg-upload-row' },
          h('button', { type: 'button', class: 'btn soft', onclick: async () => {
            const v = await pickPhoto({ title: 'Shared chat background', px: 1280, bytes: 560000 });
            if (v) { S.sharedBg = { type: 'photo', img: v, blur: S.sharedBg ? (S.sharedBg.blur||0) : 0, dim: S.sharedBg ? (S.sharedBg.dim||0) : 0 }; applyLook(); cloudPutSharedBg(); drawLook(); }
          }}, ico('image'), 'Upload Shared Photo'),
          S.sharedBg && S.sharedBg.img ? h('button', { type: 'button', class: 'btn ghost', onclick: () => { S.sharedBg = null; applyLook(); cloudPutSharedBg(); drawLook(); } }, 'Remove') : null
        ),
        S.sharedBg && S.sharedBg.img ? [
          cl.slider('Blur', 0, 24, () => S.sharedBg.blur||0, v => { S.sharedBg.blur = v; applyLook(); cloudPutSharedBg(); }, v => v + ' px'),
          cl.slider('Darken', 0, 70, () => S.sharedBg.dim||0, v => { S.sharedBg.dim = v; applyLook(); cloudPutSharedBg(); }, v => v + '%')
        ] : h('p', { class: 'hint', text: 'No shared background set. Using your personal theme background.' })
      ));
      /* personal bg */
      kids.push(cl.sec('My Personal Background (only I see this)',
        cl.chips([['doodle','Pattern'],['color','Solid colour'],['gradient','Gradient'],['photo','My Photo']], () => B.type, k => chg({ bg: { type: k } }))
      ));
      if (B.type === 'doodle') kids.push(cl.sec('Pattern', cl.chips(Object.entries(DOODLES), () => B.doodle, k => chg({ bg: { doodle: k } })), cl.color('Pattern colour', () => B.ink, v => chg({ bg: { ink: v } }, 1))));
      if (B.type !== 'photo') kids.push(cl.sec('Colours', cl.color(B.type === 'color' ? 'Colour' : 'Top colour', () => B.c1, v => chg({ bg: { c1: v } }, 1)), B.type === 'color' ? null : cl.color('Bottom colour', () => B.c2, v => chg({ bg: { c2: v } }, 1)), B.type === 'color' ? null : cl.slider('Angle', 0, 360, () => B.angle, v => chg({ bg: { angle: v } }, 1), v => v + '°')));
      else kids.push(cl.sec('My Photo',
        h('div', { class: 'bg-upload-row' }, h('button', { type: 'button', class: 'btn soft', onclick: async () => { const v = await pickPhoto({ title: 'My chat background', px: 1280, bytes: 560000 }); if (v) chg({ bg: { type: 'photo', img: v } }); } }, ico('image'), 'From Gallery or phone'), B.img ? h('button', { type: 'button', class: 'btn ghost', onclick: () => chg({ bg: { img: '' } }) }, 'Remove') : null),
        cl.slider('Blur', 0, 24, () => B.blur, v => chg({ bg: { blur: v } }, 1), v => v + ' px'),
        cl.slider('Darken', 0, 70, () => B.dim, v => chg({ bg: { dim: v } }, 1), v => v + '%')
      ));

    } else if (LK.tab === 'msgs') {
      kids.push(
        cl.sec('Bubbles',
          cl.color('My bubble colour', () => L.me, v => chg({ me: v }, 1)),
          cl.color('My text colour', () => L.meT, v => chg({ meT: v }, 1)),
          cl.color('Their bubble colour', () => L.them, v => chg({ them: v }, 1)),
          cl.color('Their text colour', () => L.themT, v => chg({ themT: v }, 1)),
          cl.slider('Bubble roundness', 2, 26, () => L.radius, v => chg({ radius: v }, 1), v => v + 'px')
        ),
        cl.sec('Header & Input bar',
          cl.color('Top bar colour', () => L.head, v => chg({ head: v }, 1)),
          cl.color('Top bar text', () => L.headT, v => chg({ headT: v }, 1)),
          cl.color('Input bar colour', () => L.comp, v => chg({ comp: v }, 1)),
          cl.color('Accent colour (buttons)', () => L.acc, v => chg({ acc: v }, 1)),
          cl.tg('Dark mode (light text on dark)', () => L.dark, v => chg({ dark: v }))
        ),
        cl.sec('Keyboard',
          cl.tg('Use custom keyboard', () => K.on, v => { chg({ kb: { on: v } }); if (!v) setKb(false); }),
          cl.tg('Number row on top', () => K.numrow, v => chg({ kb: { numrow: v } })),
          cl.chips([['abc','English'],['urdu','Urdu']], () => K.layout, k => chg({ kb: { layout: k } })),
          cl.chips(Object.entries(KB_SHAPES), () => K.shape, k => chg({ kb: { shape: k } })),
          cl.chips([['compact','Small'],['normal','Normal'],['tall','Large']], () => K.h, k => chg({ kb: { h: k } })),
          cl.color('Keyboard background', () => K.bg, v => chg({ kb: { bg: v } }, 1)),
          cl.color('Key colour', () => K.key, v => chg({ kb: { key: v } }, 1)),
          cl.tg('Vibration on key press', () => K.vibrate, v => chg({ kb: { vibrate: v } }, 1))
        )
      );

    } else if (LK.tab === 'status') {
      kids.push(
        h('p', { class: 'hint', text: 'Choose how "sent", "delivered" and "seen" appear under your messages.' }),
        h('div', { class: 'sstyle-grid' }, ...TICK_STYLES.map(ts => {
          const card = h('button', { type: 'button', class: 'sstyle-card' + (L.tickStyle === ts.k ? ' on' : ''), onclick: () => { chg({ tickStyle: ts.k }); } });
          card.append(h('b', { text: ts.n }), h('div', { class: 'sstyle-ex' }, ts.ex), h('small', { class: 'hint', style: 'margin:0', text: ts.desc }));
          return card;
        }))
      );

    } else if (LK.tab === 'fonts') {
      kids.push(
        cl.sec('Message font',
          h('div', { class: 'chips' }, ...FONTS.map(([k, n]) => h('button', { type: 'button', class: 'chip' + (L.font === k ? ' on' : ''), style: `font-family:"${k}",serif`, text: n + ' — Aa', onclick: () => chg({ font: k }) }))),
          cl.slider('Text size', 13, 22, () => L.size, v => chg({ size: v }, 1), v => v + 'px')
        ),
        cl.sec('Keyboard font',
          h('div', { class: 'chips' }, ...FONTS.map(([k, n]) => h('button', { type: 'button', class: 'chip' + (K.font === k ? ' on' : ''), style: `font-family:"${k}",serif`, text: n, onclick: () => chg({ kb: { font: k } }) })))
        )
      );

    } else { /* adv */
      kids.push(
        h('p', { class: 'hint', text: 'Show or hide individual elements of the chat.' }),
        cl.sec('Show / Hide', ...HIDE.map(([k, n]) => cl.tg(n, () => !L.hide.includes(k), on => { const s = new Set(S.look.hide); on ? s.delete(k) : s.add(k); chg({ hide: [...s] }, 1); renderMsgs(true); })))
      );
    }

    box.replaceChildren(...kids.filter(Boolean).flat(2)); box.scrollTop = top;
  }
  function openLook(tab) { LK.tab = tab || LK.tab; drawLook(); openDlg($('#dlgLook')); }


  /* ---------- Google sync (uses olw-sync.js for sign-in) ---------- */
  const CL = { unsub: [], first: false };
  const ok = () => !!(window.OLW && OLW.signedIn && OLW.db);
  const col = n => OLW.space().collection(n);
  const mdoc = n => OLW.space().collection('meta').doc(n);
  function cErr(e) { if (window.OLW) OLW.err(e); }
  function cloudPut(m) { if (!ok()) return; col('chat').doc(m.id).set(JSON.parse(JSON.stringify(m))).then(() => { pend.delete(m.id); renderMsgs(true); }).catch(cErr); }
  function cloudSeen(id, ts) { if (!ok()) return; col('chat').doc(id).update({ seen: ts, u: ts }).catch(() => { }); }
  function cloudReact(m) { if (!ok()) return; col('chat').doc(m.id).update({ ['react.' + S.me]: m.react[S.me], u: m.u }).catch(cErr); }
  function cloudDel(id) { if (!ok()) return; col('chat').doc(id).delete().catch(cErr); }
  function cloudPutProf() { if (!ok()) return; mdoc('chatprofile-' + S.me).set(JSON.parse(JSON.stringify(S.prof[S.me]))).catch(cErr); }
  function pushSbg() { if (!ok()) return; mdoc('chatsharedbg').set(JSON.parse(JSON.stringify({ bg: S.sharedBg || null, updated: sbgUpd }))).catch(cErr); }
  function cloudPutSharedBg() { sbgUpd = Date.now(); saveSbg(); clearTimeout(sbgT); sbgT = setTimeout(pushSbg, 700); }
  function cloudPutLook() { if (!ok()) return; mdoc('chatlook-' + S.me).set(JSON.parse(JSON.stringify(S.look))).catch(cErr); }
  function ping() { if (!ok() || document.hidden) return; mdoc('presence-' + S.me).set({ t: Date.now() }).catch(() => { }); }
  function stopListen() { CL.unsub.forEach(f => { try { f(); } catch (e) { } }); CL.unsub = []; CL.first = false; }
  function listen() {
    stopListen();
    CL.unsub.push(col('chat').onSnapshot(snap => {
      const first = !CL.first; let ch = false, incoming = false;
      snap.docChanges().forEach(c => {
        const d = c.doc, i = S.msgs.findIndex(m => m.id === d.id);
        if (c.type === 'removed') { if (i >= 0) { S.msgs.splice(i, 1); ch = true; } return; }
        if (d.metadata.hasPendingWrites) return; const r = normMsg(Object.assign({}, d.data(), { id: d.id }));
        if (i < 0) { S.msgs.push(r); ch = true; if (r.by !== S.me && !first) incoming = true; pend.delete(r.id); } else if ((r.u || 0) >= (S.msgs[i].u || 0)) { S.msgs[i] = r; ch = true; pend.delete(r.id); }
      });
      if (first) { CL.first = true; const ids = new Set(snap.docs.map(d => d.id)), live = new Set(snap.docs.filter(d => !(d.data() || {}).del).map(d => d.id)); S.msgs.filter(m => !ids.has(m.id) || (m.del && live.has(m.id))).forEach(m => cloudPut(m)); }
      if (ch) { saveMsgs(); renderMsgs(); noteSeen(); if (incoming && document.hidden) document.title = '(1) Chat'; }
    }, cErr));
    ['owner', 'partner'].forEach(r => CL.unsub.push(mdoc('chatprofile-' + r).onSnapshot(doc => {
      if (doc.metadata.hasPendingWrites) return; if (doc.exists) { const p = normProfile(doc.data()); if (p.updated > (S.prof[r].updated || 0)) { S.prof[r] = p; saveProf(); renderHead(); renderMsgs(true); } else if (r === S.me && S.prof[r].updated > p.updated) cloudPutProf(); } else if (r === S.me && S.prof[r].updated) cloudPutProf();
    }, cErr)));
    CL.unsub.push(mdoc('chatlook-' + S.me).onSnapshot(doc => {
      if (doc.metadata.hasPendingWrites) return; if (doc.exists) { const l = normLook(doc.data()); if (l.updated > (S.look.updated || 0)) { S.look = l; saveLook(); applyLook(); renderMsgs(true); } else if (S.look.updated > l.updated) cloudPutLook(); } else if (S.look.updated) cloudPutLook();
    }, cErr));
    CL.unsub.push(mdoc('chatsharedbg').onSnapshot(doc => {
      if (doc.metadata.hasPendingWrites) return;
      if (doc.exists) { const d = doc.data(), u = +d.updated || 0; if (u > sbgUpd) { S.sharedBg = normSbg(d.bg); sbgUpd = u; saveSbg(); applyLook(); if ($('#dlgLook').open) drawLook(); } else if (sbgUpd > u) pushSbg(); }
      else if (sbgUpd) pushSbg();
    }, cErr));
    CL.unsub.push(mdoc('presence-' + other()).onSnapshot(doc => { S.pres[other()] = doc.exists ? +doc.data().t || 0 : 0; renderHead(); }, () => { }));
    ping();
  }
  setInterval(() => { ping(); if (S.synced) renderHead(); }, 60000);


  /* ---------- page shell: banner, conversations list, ask card, decoration ---------- */
  const isOn = r => r !== S.me && S.synced && !hides('status') && S.pres[r] && Date.now() - S.pres[r] < 100000;
  const ASKS = ['Aaj tumhara din kaisa guzra?', 'What made you smile today?', 'Tumhe sab se zyada kya pasand hai mere mein?', 'What is one thing you want us to do together this month?', 'Aaj tumne kya khaya?', 'What is your favourite memory of us?', 'Kya tum kisi baat se pareshan ho?', 'If we could go anywhere tomorrow, where would you pick?', 'Tumhari koi chhoti si khwahish jo main poori kar sakon?', 'What song reminds you of me?', 'Mujhe apne bare mein kuch naya batao.', 'What is one thing I do that makes you feel loved?', 'Kal ke liye tumhara kya plan hai?', 'Describe our perfect lazy day.', 'Aaj raat kya dekhein ge?', 'What are you grateful for today?'];
  const SPRIG = (a, b) => { let s = '<svg viewBox="0 0 40 130" aria-hidden="true"><path d="M20 128C20 90 22 50 20 8" stroke="#7d9a6e" stroke-width="2" fill="none"/>'; for (let i = 0; i < 9; i++) { const y = 12 + i * 11, w = 7 - i * .3; s += `<ellipse cx="${14 - w * .3}" cy="${y}" rx="${w}" ry="3.2" transform="rotate(-35 14 ${y})" fill="${a}"/><ellipse cx="${26 + w * .3}" cy="${y + 4}" rx="${w}" ry="3.2" transform="rotate(35 26 ${y + 4})" fill="${b}"/>`; } return s + '</svg>'; };
  function buildDeco() {
    const d = $('#deco'); if (!d || d.firstChild) return;
    [['l0', '#9a72bf', '#b995d6'], ['l1', '#b995d6', '#c9aee2'], ['r0', '#9a72bf', '#b995d6'], ['r1', '#c9aee2', '#9a72bf'], ['bl', '#b995d6', '#9a72bf'], ['br', '#9a72bf', '#c9aee2']].forEach(([c, a, b]) => { const s = h('i', { class: 'sp ' + c }); s.innerHTML = SPRIG(a, b); d.append(s); });
  }
  function renderSide() {
    const c = $('#convBtn'); if (!c) return; const o = other(), last = vis().sort((a, b) => b.t - a.t)[0];
    const prev = last ? (last.by === S.me ? 'You: ' : '') + (last.del ? 'This message was deleted' : (last.text || 'Photo')) : 'Our conversations together...';
    c.replaceChildren(avatarEl(o, 'cvav'), h('span', { class: 'cv' }, h('b', { text: nameOf(o) + ' ♡' }), h('small', { text: prev }), isOn(o) ? h('em', { class: 'onl', text: 'online' }) : null), h('span', { class: 'chev' }, ico('back')));
    const me = $('#gProf'); if (me) me.replaceChildren(avatarEl(S.me, 'gpav'));
    renderRPanel(); updateCounts();
  }
  function renderRPanel() {
    const av = $('#rpAvatar'); if (!av) return; const o = other();
    av.replaceChildren(avatarEl(o, 'rpav'));
    $('#rpName').textContent = nameOf(o) + ' ♡'; $('#rpStatus').textContent = statusText() || S.prof[o].status || '';
    const cp = $('#couplePhoto'); if (cp) { const img = (S.sharedBg && S.sharedBg.img) || S.prof[o].cover || S.prof[o].avatar || S.prof[S.me].cover || S.prof[S.me].avatar || ''; cp.style.backgroundImage = img ? `url(${JSON.stringify(img)})` : ''; cp.classList.toggle('has', !!img); }
  }
  function askNow() {
    const sh = $('#sheet'); sh.replaceChildren(h('p', { class: 'sh-t', text: 'Ask something ♡' }), ...ASKS.map(q => h('button', { type: 'button', class: 'q', text: q, onclick: () => { closeSheet(); const i = $('#inp'); i.value = q; autosize(); drawBar(); i.focus(); } }))); sh.classList.add('qs'); $('#sheetWrap').hidden = false;
  }


  /* ---------- wiring ---------- */
  async function pickMsgPhoto() { const v = await pickPhoto({ title: 'Send a photo', px: 2000, bytes: 700000 }); if (v) { S.attach = v; drawBar(); $('#inp').focus(); } }
  function bind() {
    const inp = $('#inp');
    $('#back').onclick = () => { location.href = 'index.html'; };
    $('#convBtn').onclick = () => openProfile(other()); $('#gProf').onclick = () => openProfile(S.me); $('#gGear').onclick = () => openLook(); $('#askNow').onclick = askNow;
    $('#gSearch').addEventListener('keydown', e => { if (e.key === 'Enter') { const b = $('#searchBar'); b.hidden = false; $('#qIn').value = S.q = e.target.value; renderMsgs(); $('#qIn').focus(); } });
    $('#peerBtn').onclick = () => openProfile(other());
    $('#btnSearch').onclick = () => { const b = $('#searchBar'); b.hidden = !b.hidden; if (!b.hidden) $('#qIn').focus(); else { S.q = ''; $('#qIn').value = ''; renderMsgs(true); } };
    $('#qIn').oninput = e => { S.q = e.target.value; renderMsgs(); }; $('#qClose').onclick = () => { $('#searchBar').hidden = true; S.q = ''; $('#qIn').value = ''; renderMsgs(true); };
    $('#btnBrush').onclick = () => openLook(); $('#lookClose').onclick = () => closeDlg($('#dlgLook'));
    $$('#lookTabs [data-t]').forEach(b => (b.onclick = () => { LK.tab = b.dataset.t; drawLook(); }));
    $('#lookReset').onclick = async () => { if (await ask('Reset the chat look?', 'Colours, background and keyboard go back to Love letter.', 'Reset')) { S.look = Object.assign(lookFrom('love'), { updated: Date.now() }); applyLook(); saveLookSoft(); drawLook(); } };
    $('#btnMenu').onclick = e => { e.stopPropagation(); toggleMenu(); };
    const menuAct = act => {
      if (act === 'me') openProfile(S.me); else if (act === 'look') openLook(); else if (act === 'wallpaper') openLook('bg'); else if (act === 'search') $('#btnSearch').click();
      else if (act === 'pin') showPinned(); else if (act === 'starred') showStarred(); else if (act === 'ask') askNow(); else if (act === 'home') location.href = 'index.html';
      else if (act === 'sync') { const c = document.getElementById('olwCloud'); if (c) c.click(); else toast('Sync is not set up yet. Fill olw-config.js first.'); }
    };
    $$('#menu [data-act]').forEach(b => (b.onclick = () => { toggleMenu(false); menuAct(b.dataset.act); }));
    $$('.rp-opt[data-act]').forEach(b => (b.onclick = () => menuAct(b.dataset.act)));
    const on = (sel, fn) => { const e = $(sel); if (e) e.onclick = fn; };
    on('#qaStarred', showStarred); on('#qaPinned', showPinned); on('#qaRemoved', showRemoved); on('#rpRemovedBtn', showRemoved);
    on('#newMsgBtn', () => $('#inp').focus()); on('#coupleFrame', () => openLook('bg'));
    document.addEventListener('click', e => { if (!e.target.closest('#menu,#btnMenu')) toggleMenu(false); });
    $('#profClose').onclick = () => closeDlg($('#dlgProf'));
    inp.addEventListener('input', () => { autosize(); drawBar(); });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !('ontouchstart' in window) && !S.kbOpen) { e.preventDefault(); send(); } });
    inp.addEventListener('focus', () => { if (S.look.kb.on && !S.sys) setKb(true, false); else if (S.kbOpen) setKb(false); });
    inp.addEventListener('click', () => { if (S.look.kb.on && !S.sys && !S.kbOpen) setKb(true, false); });
    $('#btnSend').onclick = () => { if ($('#inp').value.trim() || S.attach) send(); else pickMsgPhoto(); };
    $('#btnAttach').onclick = pickMsgPhoto;
    $('#btnEmoji').onclick = () => { if (S.kbOpen && S.kbEmoji) setKb(false); else setKb(true, true); };
    $('#btnKb').onclick = () => { S.sys = !S.sys; inp.setAttribute('inputmode', S.look.kb.on && !S.sys ? 'none' : 'text'); if (S.sys) { setKb(false); inp.focus(); } else { setKb(true, false); inp.focus({ preventScroll: true }); } toast(S.sys ? 'Phone keyboard' : 'My keyboard'); };
    $('#sheetWrap').onclick = e => { if (e.target === $('#sheetWrap')) closeSheet(); }; $('#lightbox').onclick = () => ($('#lightbox').hidden = true);
    const box = $('#msgs'); box.addEventListener('scroll', () => { $('#toBottom').hidden = box.scrollHeight - box.scrollTop - box.clientHeight < 240; }); $('#toBottom').onclick = () => box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { document.title = 'Chat - Our Little World'; markSeen(); ping(); } });
    window.addEventListener('focus', markSeen);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeSheet(); $('#lightbox').hidden = true; closeTikTok(); } });
    $$('dialog').forEach(d => d.addEventListener('click', e => { if (e.target === d) closeDlg(d); }));
    ['#lookBody'].forEach(s => $(s).addEventListener('scroll', () => { }));
  }
  async function init() {
    await DB.open();
    const [ms, lk, pf, sb] = await Promise.all([DB.get('msgs'), DB.get('look'), DB.get('prof'), DB.get('sbg')]);
    if (sb) { S.sharedBg = normSbg(sb.bg); sbgUpd = +sb.updated || 0; }
    try { S.hid = new Set((JSON.parse(localStorage.getItem('olw_hidden_msgs') || '[]') || []).filter(x => typeof x === 'string')); } catch (e) { }
    try { S.starred = new Set((JSON.parse(localStorage.getItem('olw_starred') || '[]') || []).filter(x => typeof x === 'string')); S.pinned = (JSON.parse(localStorage.getItem('olw_pinned') || '[]') || []).filter(x => typeof x === 'string').slice(0, 5); } catch (e) { /* ignore */ }
    S.msgs = (Array.isArray(ms) ? ms : []).map(normMsg); S.look = normLook(lk || undefined); if (pf) S.prof = { owner: normProfile(pf.owner), partner: normProfile(pf.partner) };
    S.sys = !('ontouchstart' in window);
    icons(); buildDeco(); bind(); applyLook(); renderMsgs.first = true; renderMsgs(); drawBar(); takeShared();
    window.__chat = { S, send, setKb, openLook, openProfile, applyLook, normMsg, renderMsgs, drawLook, LK, pickPhoto, saveMsgs };
    if (window.OLW) OLW.onAuth(u => { S.synced = !!u; if (u) { S.me = OLW.role; listen(); } else stopListen(); renderHead(); renderMsgs(true); });
  }
  init();
})();

