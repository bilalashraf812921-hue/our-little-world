/* ===== Our Little World - Gallery =====
   Photos/videos, albums, a small note on top, a viewer, and the "Place in app" frame studio.
   Sync (Google) shares the same olw-config.js as Letters. */
(() => {
  'use strict';
  const SYNC = Object.assign({ firebase: { apiKey: '', authDomain: '', projectId: '', appId: '' }, space: 'our-little-world', owner: '', partner: '' }, window.OLW_SYNC || {});
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const isHex = x => typeof x === 'string' && /^#[0-9a-f]{6}$/i.test(x);
  const pick = (v, list, d) => (list.includes(v) ? v : d);
  { const _rc = Element.prototype.replaceChildren; Element.prototype.replaceChildren = function (...k) { return _rc.apply(this, k.flat().filter(x => x != null && x !== false)); }; }   // null/false children are skipped
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const k in attrs || {}) { const v = attrs[k]; if (v == null || v === false) continue; if (k === 'class') el.className = v; else if (k === 'text') el.textContent = v; else if (k.startsWith('on')) el.addEventListener(k.slice(2), v); else if (k === 'style') el.style.cssText = v; else el.setAttribute(k, v === true ? '' : v); }
    kids.flat().forEach(c => { if (c == null || c === false) return; el.append(c.nodeType ? c : document.createTextNode(c)); });
    return el;
  }

  /* ---------- icons ---------- */
  const ICONS = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    frame: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 12h18M12 3v18"/>',
    check: '<path d="m5 12 5 5L20 7"/>',
    album: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 3v18M12 8h4"/>',
    pen: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    home: '<path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    book: '<path d="M2 4h7a3 3 0 0 1 3 3v14a2 2 0 0 0-2-2H2z"/><path d="M22 4h-7a3 3 0 0 0-3 3v14a2 2 0 0 1 2-2h8z"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-5.4A8 8 0 1 1 21 12z"/>',
    sliders: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
    down: '<path d="m6 9 6 6 6-6"/>', right: '<path d="m9 6 6 6-6 6"/>', left: '<path d="m15 6-6 6 6 6"/>', close: '<path d="M6 6l12 12M18 6 6 18"/>',
    heart: '<path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z"/>',
    download: '<path d="M12 3v12m0 0-4-4m4 4 4-4M4 21h16"/>', trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    video: '<rect x="3" y="5" width="13" height="14" rx="2"/><path d="m16 10 5-3v10l-5-3"/>', play: '<path d="M8 5v14l11-7z"/>',
    cloud: '<path d="M7 18a4.5 4.5 0 0 1-.5-9A6 6 0 0 1 18 9.5 4 4 0 0 1 17.5 18z"/>', move: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/>', star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>', refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>'
  };
  const svgI = n => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;
  const icons = (root = document) => $$('[data-i]', root).forEach(el => { if (!el.firstChild) el.innerHTML = svgI(el.dataset.i); });
  const ico = n => { const s = h('span', { class: 'ic' }); s.innerHTML = svgI(n); return s; };

  /* ---------- toast / dialogs ---------- */
  let toastT;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 3200); }
  function openDlg(d) { if (!d.open) { if (d.showModal) d.showModal(); else d.setAttribute('open', ''); } }
  function closeDlg(d) { if (d.open) { if (d.close) d.close(); else d.removeAttribute('open'); } }
  function ask(title, text, yes = 'Yes') {
    return new Promise(res => {
      const d = $('#dlgAsk'); $('#askT').textContent = title; $('#askP').textContent = text || ''; $('#askYes').textContent = yes;
      const done = v => { closeDlg(d); res(v); }; $('#askYes').onclick = () => done(true); $('#askNo').onclick = () => done(false); d.oncancel = () => res(false); openDlg(d);
    });
  }

  /* ---------- storage (IndexedDB, memory fallback) ---------- */
  const DB = {
    db: null, mem: {},
    async open() { try { this.db = await new Promise((res, rej) => { const r = indexedDB.open('olw_gallery_v1', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); setTimeout(() => rej(new Error('timeout')), 3000); }); } catch (e) { this.db = null; } },
    get(k) { if (!this.db) return Promise.resolve(this.mem[k]); return new Promise(res => { try { const q = this.db.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result); q.onerror = () => res(undefined); } catch (e) { res(undefined); } }); },
    set(k, v) { if (!this.db) { this.mem[k] = v; return Promise.resolve(false); } return new Promise(res => { try { const t = this.db.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = () => res(true); t.onerror = () => res(false); t.onabort = () => res(false); } catch (e) { res(false); } }); },
    del(k) { if (!this.db) { delete this.mem[k]; return Promise.resolve(true); } return new Promise(res => { try { const t = this.db.transaction('kv', 'readwrite'); t.objectStore('kv').delete(k); t.oncomplete = () => res(true); t.onerror = () => res(false); } catch (e) { res(false); } }); }
  };

  /* ---------- model ---------- */
  const DEF_ALBUMS = [['a-journey', 'Our Journey'], ['a-nature', 'Nature'], ['a-special', 'Special Moments'], ['a-random', 'Random']];
  const NOTE_FONTS = [['Caveat', 'Caveat'], ['Kaushan Script', 'Kaushan'], ['Dancing Script', 'Dancing'], ['Great Vibes', 'Great Vibes'], ['Homemade Apple', 'Homemade'], ['Sacramento', 'Sacramento']];
  const NOTE_INKS = ['#8a64a3', '#c2456f', '#4c3b58', '#2f6f8f', '#4f7a4a', '#8a5a2b'];
  const NOTE_PAPERS = [['cream', '#fbf1e6'], ['blush', '#fbe4ec'], ['lav', '#ece3f5'], ['kraft', '#ead7b9'], ['white', '#ffffff']];
  const blankNote = () => ({ text: 'Every photo has a story ♡', font: 'Caveat', ink: '#8a64a3', paper: 'cream', showPhoto: true, img: '', updated: 0 });
  const normNote = n => { const d = blankNote(); n = n || {}; return { text: typeof n.text === 'string' ? n.text.slice(0, 140) : d.text, font: pick(n.font, NOTE_FONTS.map(f => f[0]), d.font), ink: isHex(n.ink) ? n.ink : d.ink, paper: pick(n.paper, NOTE_PAPERS.map(p => p[0]), d.paper), showPhoto: n.showPhoto !== false, img: typeof n.img === 'string' && /^data:image\/(jpeg|png|webp);/.test(n.img) && n.img.length < 300000 ? n.img : '', updated: +n.updated || 0 }; };
  const todayISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date());
  const isDate = x => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x);
  function normPhoto(p) {
    p = p || {};
    return { id: String(p.id || uid()), type: p.type === 'video' ? 'video' : 'photo', name: String(p.name || 'Untitled').slice(0, 60), date: isDate(p.date) ? p.date : todayISO(), album: typeof p.album === 'string' ? p.album : '', cap: String(p.cap || '').slice(0, 160), fav: !!p.fav, feat: !!p.feat, thumb: typeof p.thumb === 'string' ? p.thumb : '', w: +p.w || 0, h: +p.h || 0, by: String(p.by || ''), created: +p.created || Date.now(), updated: +p.updated || Date.now() };
  }
  const S = { photos: [], albums: DEF_ALBUMS.map(a => ({ id: a[0], name: a[1] })), note: blankNote(), slots: {}, metaUpdated: 0, tab: 'all', album: 'all', q: '', sort: 'new', size: 'm', view: 'scrap', sel: false, ids: new Set(), me: '' };
  const fmtDate = d => { try { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch (e) { return d; } };
  const albumName = id => { const a = S.albums.find(x => x.id === id); return a ? a.name : ''; };
  const byId = id => S.photos.find(p => p.id === id);
  const savePhotos = () => DB.set('photos', S.photos);
  const saveMeta = () => DB.set('meta', { albums: S.albums, note: S.note, metaUpdated: S.metaUpdated });
  const saveSlots = () => DB.set('slots', S.slots);
  const savePrefs = () => DB.set('prefs', { sort: S.sort, size: S.size, view: S.view });
  const touchMeta = () => { S.metaUpdated = Date.now(); S.note.updated = S.note.updated || S.metaUpdated; };

  /* ---------- images ---------- */
  const loadImg = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  async function fileImg(file) { const url = URL.createObjectURL(file); try { return await loadImg(url); } finally { setTimeout(() => URL.revokeObjectURL(url), 4000); } }
  function toURL(img, maxPx, q, maxBytes) {
    const iw = img.naturalWidth || img.videoWidth || img.width, ih = img.naturalHeight || img.videoHeight || img.height;
    let s = Math.min(1, maxPx / Math.max(iw, ih)), url = '';
    for (let t = 0; t < 8; t++) {
      const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(iw * s)); c.height = Math.max(1, Math.round(ih * s));
      const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
      url = c.toDataURL('image/jpeg', q); if (url.length * 0.75 <= maxBytes) return url; q -= 0.1; if (q < 0.45) { q = 0.62; s *= 0.8; }
    }
    return url;
  }
  const getSrc = async id => {
    let s = await DB.get('s:' + id); if (s) return s;
    if (typeof cloudSrc === 'function') { s = await cloudSrc(id); if (s) { await DB.set('s:' + id, s); return s; } }
    const p = byId(id); return p ? p.thumb : '';
  };
  async function videoPoster(blob) {
    const v = document.createElement('video'), url = URL.createObjectURL(blob);
    try {
      v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
      await new Promise(r => { v.onloadeddata = r; v.onerror = r; setTimeout(r, 4000); });
      try { v.currentTime = Math.min(1, (v.duration || 1) / 3); await new Promise(r => { v.onseeked = r; setTimeout(r, 1500); }); } catch (e) { }
      if (!v.videoWidth) throw 0; return { thumb: toURL(v, 360, 0.7, 60000), w: v.videoWidth, h: v.videoHeight };
    } catch (e) { const c = document.createElement('canvas'); c.width = 360; c.height = 270; const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 360, 270); g.addColorStop(0, '#b79ccb'); g.addColorStop(1, '#d98aa6'); x.fillStyle = g; x.fillRect(0, 0, 360, 270); return { thumb: c.toDataURL('image/jpeg', .7), w: 360, h: 270 }; }
    finally { URL.revokeObjectURL(url); }
  }
  const prettyName = f => { const n = f.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim(); if (!n || /^(img|dsc|pxl|image|photo|vid|mvi)\s*\d*/i.test(n) || /^\d+$/.test(n.replace(/\s/g, ''))) return 'New memory'; return n.charAt(0).toUpperCase() + n.slice(1, 60); };
  async function addFiles(files) {
    files = [...files].filter(f => /^(image|video)\//.test(f.type)); if (!files.length) return;
    let ok = 0, bad = 0, i = 0; const added = [];
    for (const f of files) {
      i++; toast(`Adding ${i} of ${files.length}...`);
      try {
        const id = uid(), date = f.lastModified ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date(f.lastModified)) : todayISO();
        const base = { id, name: prettyName(f.name), date, album: /^a-|^c-/.test(S.album) ? S.album : '', by: S.me, created: Date.now() + i, updated: Date.now() + i };
        if (f.type.startsWith('video/')) {
          if (f.size > 90 * 1024 * 1024) { bad++; continue; }
          const pst = await videoPoster(f); await DB.set('v:' + id, f); S.photos.push(normPhoto(Object.assign(base, { type: 'video', thumb: pst.thumb, w: pst.w, h: pst.h })));
        } else {
          const img = await fileImg(f), src = toURL(img, 1280, 0.82, 380000), thumb = toURL(img, 380, 0.72, 42000);
          await DB.set('s:' + id, src); S.photos.push(normPhoto(Object.assign(base, { type: 'photo', thumb, w: img.naturalWidth, h: img.naturalHeight })));
        }
        ok++; added.push(S.photos[S.photos.length - 1]);
      } catch (e) { bad++; }
    }
    await savePhotos(); renderAll(); added.forEach(p => cloudPutPhoto(p, true));
    toast(ok ? `${ok} added${bad ? `, ${bad} could not be added` : ''} ♡` : 'Could not add these files.');
  }

  /* ---------- list / grid ---------- */
  function visible() {
    let a = S.photos.slice(); const q = S.q.trim().toLowerCase();
    if (S.tab === 'photo') a = a.filter(p => p.type === 'photo'); else if (S.tab === 'video') a = a.filter(p => p.type === 'video'); else if (S.tab === 'fav') a = a.filter(p => p.fav);
    if (S.album !== 'all') a = a.filter(p => (S.album === 'none' ? !p.album || !albumName(p.album) : p.album === S.album));
    if (q) a = a.filter(p => (p.name + ' ' + p.cap + ' ' + albumName(p.album)).toLowerCase().includes(q));
    const cmp = { new: (x, y) => (y.date < x.date ? -1 : y.date > x.date ? 1 : y.created - x.created), old: (x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : x.created - y.created), name: (x, y) => x.name.localeCompare(y.name) }[S.sort];
    return a.sort(cmp);
  }
  function card(p, list) {
    const ph = h('button', { class: 'g-ph', type: 'button', 'aria-label': `Open ${p.name}`, onclick: () => (S.sel ? toggleSel(p.id) : openViewer(p.id, list)) },
      h('img', { src: p.thumb, alt: p.name, loading: 'lazy', decoding: 'async' }), p.type === 'video' ? h('span', { class: 'g-play' }, ico('play')) : null, h('span', { class: 'g-tick' }, ico('check')));
    const fv = h('button', { class: 'g-fv' + (p.fav ? ' on' : ''), type: 'button', 'aria-label': p.fav ? 'Remove from favourites' : 'Add to favourites', 'aria-pressed': p.fav ? 'true' : 'false', onclick: e => { e.stopPropagation(); toggleFav(p.id); } }, ico('heart'));
    return h('article', { class: 'g-card' + (S.ids.has(p.id) ? ' sel' : ''), 'data-id': p.id },
      h('div', { class: 'g-phw' }, ph, fv),
      h('div', { class: 'g-cap' }, h('div', { class: 'g-cap-t' }, h('b', { text: p.name }), h('small', { text: fmtDate(p.date) })), h('span', { class: 'g-type' }, ico(p.type === 'video' ? 'video' : 'image'))));
  }
  function renderGrid() {
    const g = $('#grid'), list = visible(), e = $('#empty'); const simple = S.view === 'simple', nodes = []; let last = '';
    list.forEach(p => { if (simple && S.sort !== 'name' && p.date !== last) { last = p.date; nodes.push(h('h3', { class: 'g-day', text: fmtDate(p.date) })); } nodes.push(card(p, list)); });
    g.replaceChildren(...nodes);
    g.dataset.size = S.size; g.classList.toggle('selmode', S.sel); e.hidden = !!list.length; g.hidden = !list.length;
    if (!list.length) {
      e.replaceChildren(S.photos.length
        ? h('p', { class: 'e-t', text: 'Nothing here yet' })
        : h('p', { class: 'e-t', text: 'Your gallery is waiting for its first memory' }),
      h('p', { class: 'e-s', text: S.photos.length ? 'Try another tab, album or search.' : 'Add a photo and it will show here, and on the other account too.' }),
      S.photos.length ? null : h('button', { class: 'g-btn', type: 'button', onclick: () => $('#fileUp').click() }, ico('plus'), 'Upload Media'));
    }
    $('#selCount').textContent = `${S.ids.size} selected`; $('#selBar').hidden = !S.sel;
    ['#selFrame', '#selMove', '#selDel'].forEach(s => { $(s).disabled = !S.ids.size; });
  }
  function renderTabs() { $$('#tabs [data-tab]').forEach(b => { const on = b.dataset.tab === S.tab; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); }); }
  function albumOptions(sel, withAll = true, selected) {
    sel.replaceChildren(...[withAll ? h('option', { value: 'all', text: 'All Albums' }) : null, ...S.albums.map(a => h('option', { value: a.id, text: a.name })), withAll ? h('option', { value: 'none', text: 'No album' }) : h('option', { value: '', text: 'No album' })].filter(Boolean));
    if (selected != null) sel.value = selected;
  }
  function renderAlbums() {
    albumOptions($('#albSel'), true, S.album);
    const L = $('#albList');
    L.replaceChildren(...S.albums.map(a => {
      const ps = S.photos.filter(p => p.album === a.id).sort((x, y) => (y.date < x.date ? -1 : 1)), cov = ps[0];
      return h('button', { class: 'g-albrow' + (S.album === a.id ? ' on' : ''), type: 'button', onclick: () => { S.album = a.id; S.tab = 'all'; renderAll(); $('#grid').scrollIntoView({ behavior: 'smooth', block: 'start' }); } },
        h('span', { class: 'g-albcov' }, cov ? h('img', { src: cov.thumb, alt: '' }) : ico('image')),
        h('span', { class: 'g-albt' }, h('b', { text: a.name }), h('small', { text: `${ps.length} item${ps.length === 1 ? '' : 's'}` })), ico('right'));
    }));
    if (!S.albums.length) L.replaceChildren(h('p', { class: 'g-hint', text: 'No albums yet. Use the menu to add one.' }));
    const last = S.photos.slice().sort((a, b) => b.created - a.created)[0], c = $('#collect');
    c.replaceChildren(h('div', { class: 'cl-pol' }, h('i', { class: 'cl-tape' }), h('div', { class: 'cl-ph' }, last ? h('img', { src: last.thumb, alt: '' }) : null), h('span', { class: 'cl-sig', text: 'Together' })), h('p', { class: 'cl-t' }, 'Collect', h('br'), 'beautiful', h('br'), 'moments ', h('span', { text: '♡' })));
  }
  function renderFeat() {
    const f = $('#feat'), p = S.photos.find(x => x.feat) || S.photos.filter(x => x.fav).sort((a, b) => b.updated - a.updated)[0];
    if (!p) { f.hidden = true; return; } f.hidden = false;
    f.replaceChildren(h('div', { class: 'ft-pol' }, h('i', { class: 'cl-tape' }), h('img', { src: p.thumb, alt: '' })), h('div', { class: 'ft-t' }, h('b', {}, ico('star'), 'Featured Memory'), h('span', { text: p.cap || 'A moment we’ll always cherish ♡' })), h('button', { class: 'g-btn sm soft', type: 'button', onclick: () => openViewer(p.id, [p]) }, 'View'));
  }
  function renderNote() {
    const n = S.note, el = $('#note'), paper = (NOTE_PAPERS.find(p => p[0] === n.paper) || NOTE_PAPERS[0])[1];
    el.style.setProperty('--np', paper); el.style.setProperty('--ni', n.ink); el.style.setProperty('--nf', `"${n.font}", "Caveat", cursive`);
    el.replaceChildren(h('i', { class: 'nt-tape' }), n.showPhoto && n.img ? h('span', { class: 'nt-pol' }, h('img', { src: n.img, alt: '' })) : null, h('span', { class: 'nt-txt' }, n.text.trim() ? n.text : 'Tap to write a little note ♡'));
    el.setAttribute('aria-label', 'Edit the note at the top');
  }
  function renderAll() { document.body.classList.toggle('simple', S.view === 'simple'); renderTabs(); renderGrid(); renderAlbums(); renderFeat(); renderNote(); const q = S.q; if ($('#qTop').value !== q) $('#qTop').value = q; if ($('#qBar').value !== q) $('#qBar').value = q; }

  /* ---------- photo actions ---------- */
  function touchPhoto(p) { p.updated = Date.now(); }
  async function toggleFav(id) { const p = byId(id); if (!p) return; p.fav = !p.fav; touchPhoto(p); await savePhotos(); renderAll(); cloudPutPhoto(p); if (V.open) drawViewer(); }
  function toggleSel(id) { S.ids.has(id) ? S.ids.delete(id) : S.ids.add(id); renderGrid(); }
  function setSel(on) { S.sel = on; if (!on) S.ids.clear(); renderGrid(); }
  async function deletePhotos(ids) {
    const n = ids.length; if (!(await ask(n > 1 ? `Delete ${n} items?` : 'Delete this item?', 'It will also disappear from the other account. This cannot be undone.', 'Delete'))) return false;
    for (const id of ids) { const i = S.photos.findIndex(p => p.id === id); if (i >= 0) S.photos.splice(i, 1); await DB.del('s:' + id); await DB.del('v:' + id); cloudDelPhoto(id); }
    S.ids.clear(); await savePhotos(); renderAll(); toast(n > 1 ? 'Deleted' : 'Deleted'); return true;
  }
  async function downloadPhoto(p) {
    let href, rev = false;
    if (p.type === 'video') { const b = await DB.get('v:' + p.id); if (!b) return toast('This video is not on this device.'); href = URL.createObjectURL(b); rev = true; }
    else href = await getSrc(p.id);
    const a = h('a', { href, download: (p.name || 'photo').replace(/[^\w-]+/g, '_') + (p.type === 'video' ? '.mp4' : '.jpg') }); document.body.append(a); a.click(); a.remove(); if (rev) setTimeout(() => URL.revokeObjectURL(href), 4000);
  }

  /* ---------- viewer ---------- */
  const V = { open: false, list: [], idx: 0, vurl: '' };
  async function openViewer(id, list) { V.list = list && list.length ? list : visible(); V.idx = Math.max(0, V.list.findIndex(p => p.id === id)); V.open = true; $('#view').hidden = false; document.body.classList.add('noscroll'); drawViewer(); $('#vClose').focus(); }
  function closeViewer() { V.open = false; $('#view').hidden = true; document.body.classList.remove('noscroll'); if (V.vurl) { URL.revokeObjectURL(V.vurl); V.vurl = ''; } $('#vStage').replaceChildren(); }
  async function drawViewer() {
    const p = V.list[V.idx]; if (!p) return closeViewer(); const st = $('#vStage'), token = (V.token = (V.token || 0) + 1);
    $('#vCnt').textContent = `${V.idx + 1} / ${V.list.length}`; $('#vPrev').hidden = $('#vNext').hidden = V.list.length < 2;
    $('#vFav').classList.toggle('on', p.fav); $('#vFav').setAttribute('aria-pressed', p.fav ? 'true' : 'false');
    const al = albumName(p.album); $('#vInfo').replaceChildren(h('b', { text: p.name }), h('span', { text: [fmtDate(p.date), al].filter(Boolean).join(' · ') }), p.cap ? h('em', { text: p.cap }) : null);
    if (V.vurl) { URL.revokeObjectURL(V.vurl); V.vurl = ''; }
    if (p.type === 'video') {
      const b = await DB.get('v:' + p.id); if (token !== V.token) return;
      if (b) { V.vurl = URL.createObjectURL(b); st.replaceChildren(h('video', { src: V.vurl, controls: true, playsinline: true, poster: p.thumb })); } else st.replaceChildren(h('img', { src: p.thumb, alt: p.name }), h('p', { class: 'gv-note', text: 'This video is saved on the device that added it.' }));
      return;
    }
    st.replaceChildren(h('img', { src: p.thumb, alt: p.name, class: 'lo' }));
    const src = await getSrc(p.id); if (token !== V.token) return; st.replaceChildren(h('img', { src, alt: p.name }));
  }
  function stepViewer(d) { if (V.list.length < 2) return; V.idx = (V.idx + d + V.list.length) % V.list.length; drawViewer(); }
  function bindViewer() {
    $('#vClose').onclick = closeViewer; $('#vPrev').onclick = () => stepViewer(-1); $('#vNext').onclick = () => stepViewer(1);
    $('#vFav').onclick = () => { const p = V.list[V.idx]; if (p) toggleFav(p.id); };
    $('#vDl').onclick = () => { const p = V.list[V.idx]; if (p) downloadPhoto(p); };
    $('#vUse').onclick = () => { const p = V.list[V.idx]; if (p && p.type === 'photo') { closeViewer(); askUse([p.id]); } else toast('Only photos can be placed in the app.'); };
    $('#vDel').onclick = async () => { const p = V.list[V.idx]; if (p && (await deletePhotos([p.id]))) { V.list.splice(V.idx, 1); if (!V.list.length) closeViewer(); else { V.idx = Math.min(V.idx, V.list.length - 1); drawViewer(); } } };
    $('#vInfo').onclick = () => { const p = V.list[V.idx]; if (p) openInfo(p); };
    document.addEventListener('keydown', e => { if (!V.open || $('#fs') && !$('#fs').hidden) return; if (e.key === 'Escape') closeViewer(); else if (e.key === 'ArrowLeft') stepViewer(-1); else if (e.key === 'ArrowRight') stepViewer(1); });
    let sx = 0, sy = 0, on = false; const st = $('#vStage');
    st.addEventListener('pointerdown', e => { if (e.target.tagName === 'VIDEO') return; on = true; sx = e.clientX; sy = e.clientY; });
    st.addEventListener('pointerup', e => { if (!on) return; on = false; const dx = e.clientX - sx, dy = e.clientY - sy; if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4) stepViewer(dx < 0 ? 1 : -1); });
    st.addEventListener('pointercancel', () => (on = false));
  }

  /* ---------- dialogs: info, albums, move, note, sort ---------- */
  let infoId = '';
  function openInfo(p) {
    infoId = p.id; $('#iName').value = p.name; $('#iDate').value = p.date; albumOptions($('#iAlb'), false, p.album); $('#iCap').value = p.cap; $('#iFeat').checked = p.feat; openDlg($('#dlgInfo'));
  }
  async function saveInfo() {
    const p = byId(infoId); if (!p) return; p.name = $('#iName').value.trim().slice(0, 60) || 'Untitled'; if (isDate($('#iDate').value)) p.date = $('#iDate').value; p.album = $('#iAlb').value; p.cap = $('#iCap').value.trim().slice(0, 160);
    const feat = $('#iFeat').checked; if (feat) S.photos.forEach(x => { if (x.feat && x !== p) { x.feat = false; touchPhoto(x); cloudPutPhoto(x); } }); p.feat = feat; touchPhoto(p);
    await savePhotos(); renderAll(); cloudPutPhoto(p); if (V.open) drawViewer(); closeDlg($('#dlgInfo'));
  }
  function renderAlbMan() {
    const m = $('#albMan');
    m.replaceChildren(...S.albums.map(a => h('div', { class: 'am-row' },
      h('input', { type: 'text', value: a.name, maxlength: '30', 'aria-label': 'Album name', onchange: async e => { const v = e.target.value.trim().slice(0, 30); if (v) { a.name = v; touchMeta(); await saveMeta(); renderAll(); cloudPutMeta(); } else e.target.value = a.name; } }),
      h('button', { type: 'button', class: 'g-ib sm', 'aria-label': `Delete album ${a.name}`, onclick: async () => { if (!(await ask('Delete this album?', 'The photos stay in your gallery, they just leave the album.', 'Delete album'))) return; S.albums = S.albums.filter(x => x.id !== a.id); S.photos.forEach(p => { if (p.album === a.id) { p.album = ''; touchPhoto(p); cloudPutPhoto(p); } }); if (S.album === a.id) S.album = 'all'; touchMeta(); await Promise.all([saveMeta(), savePhotos()]); renderAll(); renderAlbMan(); cloudPutMeta(); } }, ico('trash')))));
    if (!S.albums.length) m.replaceChildren(h('p', { class: 'g-hint', text: 'No albums yet.' }));
  }
  async function addAlbum() {
    const i = $('#albNew'), v = i.value.trim().slice(0, 30); if (!v) return i.focus(); if (S.albums.length >= 30) return toast('That is plenty of albums ♡');
    S.albums.push({ id: 'c-' + uid(), name: v }); i.value = ''; touchMeta(); await saveMeta(); renderAll(); renderAlbMan(); cloudPutMeta();
  }
  function openMove() {
    const L = $('#moveList'); const mv = async id => { S.photos.forEach(p => { if (S.ids.has(p.id)) { p.album = id; touchPhoto(p); cloudPutPhoto(p); } }); await savePhotos(); closeDlg($('#dlgMove')); setSel(false); renderAll(); toast('Moved ♡'); };
    L.replaceChildren(...S.albums.map(a => h('button', { type: 'button', class: 'mv', onclick: () => mv(a.id) }, a.name)), h('button', { type: 'button', class: 'mv', onclick: () => mv('') }, 'No album')); openDlg($('#dlgMove'));
  }
  function openNote() {
    const n = S.note; $('#nTxt').value = n.text; $('#nPhoto').checked = n.showPhoto; const w = { font: n.font, ink: n.ink, paper: n.paper };
    const chips = (id, items, key, mk) => { const box = $(id); box.replaceChildren(...items.map(it => { const b = mk(it); b.type = 'button'; b.classList.toggle('on', w[key] === it[0] || w[key] === it); b.onclick = () => { w[key] = Array.isArray(it) ? it[0] : it; $$('button', box).forEach(x => x.classList.remove('on')); b.classList.add('on'); }; return b; })); };
    chips('#nFont', NOTE_FONTS, 'font', it => h('button', { class: 'chip', style: `font-family:"${it[0]}",cursive;font-size:1.05rem`, text: it[1] }));
    chips('#nInk', NOTE_INKS, 'ink', it => h('button', { class: 'dot', style: `background:${it}`, 'aria-label': 'Ink ' + it }));
    chips('#nPaper', NOTE_PAPERS, 'paper', it => h('button', { class: 'dot', style: `background:${it[1]}`, 'aria-label': 'Paper ' + it[0] }));
    $('#noteForm').onsubmit = async e => { e.preventDefault(); S.note = Object.assign({}, S.note, { text: $('#nTxt').value.slice(0, 140), font: w.font, ink: w.ink, paper: w.paper, showPhoto: $('#nPhoto').checked, updated: Date.now() }); touchMeta(); await saveMeta(); renderNote(); cloudPutMeta(); closeDlg($('#dlgNote')); };
    $('#nPhotoBtn').onclick = () => { closeDlg($('#dlgNote')); openStudio('gallery-note'); };
    openDlg($('#dlgNote')); setTimeout(() => $('#nTxt').focus(), 60);
  }
  function openSortMenu() {
    const m = $('#sortMenu'), mk = (label, key, val, cur) => h('button', { type: 'button', role: 'menuitemradio', 'aria-checked': cur ? 'true' : 'false', class: cur ? 'on' : '', onclick: () => { S[key] = val; savePrefs(); renderAll(); m.hidden = true; } }, ico('check'), label);
    m.replaceChildren(h('p', { class: 'mh', text: 'Look' }), mk('Scrapbook (pretty)', 'view', 'scrap', S.view === 'scrap'), mk('Simple (like a phone gallery)', 'view', 'simple', S.view === 'simple'), h('p', { class: 'mh', text: 'Sort by' }), mk('Newest first', 'sort', 'new', S.sort === 'new'), mk('Oldest first', 'sort', 'old', S.sort === 'old'), mk('Name A to Z', 'sort', 'name', S.sort === 'name'), h('p', { class: 'mh', text: 'Photo size' }), mk('Small', 'size', 's', S.size === 's'), mk('Medium', 'size', 'm', S.size === 'm'), mk('Large', 'size', 'l', S.size === 'l'));
    m.hidden = !m.hidden; $('#btnSort').setAttribute('aria-expanded', m.hidden ? 'false' : 'true');
  }
  function toggleMenu(force) { const m = $('#menu'), open = force != null ? force : m.hidden; m.hidden = !open; $('#btnGear').setAttribute('aria-expanded', open ? 'true' : 'false'); }
  function askUse(ids) {
    ids = ids.filter(id => { const p = byId(id); return p && p.type === 'photo'; }); if (!ids.length) return toast('Choose a photo first (videos cannot be placed).');
    const L = $('#useList'), items = [['home-hero', 'Home: first photo', 'The big picture at the top of Home'], ['home-memory', 'Home: second photo', 'The small framed photo lower on Home'], ['letters-bg', 'Letters background', 'Behind the envelope and letters'], ['gallery-note', 'Note photo', 'Tiny photo on the note in the Gallery']];
    L.replaceChildren(...items.map(it => h('button', { type: 'button', class: 'slot', onclick: () => { closeDlg($('#dlgUse')); openStudio(it[0], ids); } }, h('b', { text: it[1] }), h('small', { text: it[2] }))), h('button', { type: 'button', class: 'slot', onclick: () => { closeDlg($('#dlgUse')); openStudio(null, ids); } }, h('b', { text: 'More: frames, collage, download' }), h('small', { text: 'Choose how many photos fit and adjust them' })));
    openDlg($('#dlgUse'));
  }
  function go(page) {
    if (page === 'gallery') return window.scrollTo({ top: 0, behavior: 'smooth' });
    const map = { home: 'index.html', story: 'story.html', letters: 'letters.html', chat: 'messages.html' };
    if (map[page]) { location.href = map[page]; return; }
    toast('Questions page is still being made. Coming soon ♡');
  }

  /* ---------- decoration ---------- */
  const sprig = () => { let s = '<svg viewBox="0 0 40 130" aria-hidden="true"><path d="M20 128C20 90 22 50 20 8" style="stroke:var(--sprig-stem)" stroke-width="2" fill="none"/>'; for (let i = 0; i < 9; i++) { const y = 12 + i * 11, w = 7 - i * 0.3; s += `<ellipse cx="${14 - w * .3}" cy="${y}" rx="${w}" ry="3.2" transform="rotate(-35 14 ${y})" style="fill:var(--sprig-a)"/><ellipse cx="${26 + w * .3}" cy="${y + 4}" rx="${w}" ry="3.2" transform="rotate(35 26 ${y + 4})" style="fill:var(--sprig-b)"/>`; } return s + '</svg>'; };
  const bowSVG = '<svg viewBox="0 0 80 70" aria-hidden="true"><path d="M40 34C26 14 6 12 6 28s20 14 34 6zM40 34c14-20 34-22 34-6S54 42 40 34z" style="fill:var(--sprig-a);opacity:.85"/><path d="M40 34c-8 12-16 28-22 34M40 34c8 12 16 28 22 34" style="stroke:var(--sprig-b);fill:none" stroke-width="5" stroke-linecap="round"/><circle cx="40" cy="34" r="6" style="fill:var(--sprig-b)"/></svg>';
  const bigHeart = '<svg viewBox="0 0 48 44" aria-hidden="true"><path d="M24 41S4 28 4 14a10 10 0 0 1 20-3 10 10 0 0 1 20 3c0 14-20 27-20 27z" style="fill:var(--plum-l);opacity:.9"/></svg>';
  function decorate() {
    const d = $('#deco'); const pos = [['l0', 6, 18, -14], ['l1', 4, 62, 8], ['r0', 94, 8, 12], ['r1', 95, 56, -8], ['r2', 92, 84, 14]];
    d.replaceChildren(...pos.map(([c, x, y, r]) => { const s = h('i', { class: 'sp ' + c, style: `left:${x}%;top:${y}%;--r:${r}deg` }); s.innerHTML = sprig(); return s; }));
    $('#bowL').innerHTML = bowSVG; $('#hrtR').innerHTML = bigHeart;
    const lg = $('#logoHeart'); lg.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z"/></svg>';
  }
  function placeholderThumbs() { }


  /* ---------- PLACE IN APP: frame studio ---------- */
  const SLOTS = [
    { id: 'home-hero', name: 'Home: first photo (top)', sub: 'The big picture at the top of Home', ar: 16 / 9, out: 1600 },
    { id: 'home-memory', name: 'Home: second photo', sub: 'The small framed photo lower on Home', ar: 3 / 4, out: 1200 },
    { id: 'letters-bg', name: 'Letters: background', sub: 'Behind the envelope and the letters', ar: 3 / 4, out: 1400 },
    { id: 'gallery-note', name: 'Gallery: note photo', sub: 'A tiny photo on the note above', ar: 1, out: 560, max: 110000 },
    { id: 'custom', name: 'Download only', sub: 'Save it and use it anywhere you like', ar: 4 / 5, out: 1600, free: true }
  ];
  const RATIOS = [['1:1', 1], ['4:5', 4 / 5], ['3:4', 3 / 4], ['16:9', 16 / 9], ['9:16', 9 / 16]];
  const COUNTS = [1, 2, 3, 4, 5, 6, 9];
  const g = (c, r) => { const a = []; for (let y = 0; y < r; y++) for (let x = 0; x < c; x++) a.push([x / c, y / r, 1 / c, 1 / r]); return a; };
  const LAY = {
    1: [['Full', [[0, 0, 1, 1]]]],
    2: [['Side by side', g(2, 1)], ['Stacked', g(1, 2)], ['Big and small', [[0, 0, .62, 1], [.62, 0, .38, 1]]], ['Top big', [[0, 0, 1, .62], [0, .62, 1, .38]]]],
    3: [['Three columns', g(3, 1)], ['Three rows', g(1, 3)], ['Big left', [[0, 0, .6, 1], [.6, 0, .4, .5], [.6, .5, .4, .5]]], ['Big top', [[0, 0, 1, .6], [0, .6, .5, .4], [.5, .6, .5, .4]]]],
    4: [['2 by 2', g(2, 2)], ['Four columns', g(4, 1)], ['Big and 3', [[0, 0, 1, .64], [0, .64, 1 / 3, .36], [1 / 3, .64, 1 / 3, .36], [2 / 3, .64, 1 / 3, .36]]], ['Big left and 3', [[0, 0, .62, 1], [.62, 0, .38, 1 / 3], [.62, 1 / 3, .38, 1 / 3], [.62, 2 / 3, .38, 1 / 3]]]],
    5: [['2 and 3', [[0, 0, .5, .5], [.5, 0, .5, .5], [0, .5, 1 / 3, .5], [1 / 3, .5, 1 / 3, .5], [2 / 3, .5, 1 / 3, .5]]], ['Big and 4', [[0, 0, .5, 1], [.5, 0, .25, .5], [.75, 0, .25, .5], [.5, .5, .25, .5], [.75, .5, .25, .5]]], ['3 and 2', [[0, 0, 1 / 3, .5], [1 / 3, 0, 1 / 3, .5], [2 / 3, 0, 1 / 3, .5], [0, .5, .5, .5], [.5, .5, .5, .5]]]],
    6: [['3 by 2', g(3, 2)], ['2 by 3', g(2, 3)], ['Big and 5', [[0, 0, 2 / 3, 2 / 3], [2 / 3, 0, 1 / 3, 1 / 3], [2 / 3, 1 / 3, 1 / 3, 1 / 3], [0, 2 / 3, 1 / 3, 1 / 3], [1 / 3, 2 / 3, 1 / 3, 1 / 3], [2 / 3, 2 / 3, 1 / 3, 1 / 3]]]],
    9: [['3 by 3', g(3, 3)]]
  };
  const FRAMES = [['none', 'No frame'], ['white', 'White border'], ['polaroid', 'Polaroid'], ['shadow', 'Soft shadow'], ['tape', 'Tape']];
  const BGS = ['#fbf1e6', '#fbe4ec', '#ece3f5', '#ffffff', '#8a64a3', '#2b2230'];
  const BORDS = ['#ffffff', '#fbf1e6', '#8a64a3', '#2b2230'];
  const slotDef = id => SLOTS.find(s => s.id === id) || SLOTS[0];
  const countFor = n => COUNTS.find(c => c >= n) || 9;
  const FS = { open: false, slot: 'home-hero', cfg: null, sel: 0, imgs: {}, geo: [], W: 0, H: 0, drag: null, ptrs: new Map(), pinch: null };
  const rectsOf = cfg => { const L = LAY[cfg.n] || LAY[1]; return (L[cfg.lay] || L[0])[1]; };
  const arOf = cfg => (slotDef(cfg.slot).free ? cfg.ar || 4 / 5 : slotDef(cfg.slot).ar);
  function newCfg(slot, pids) { const n = countFor(Math.max(1, pids.length)), multi = n > 1; return { slot, n, lay: 0, cells: Array.from({ length: n }, (_, i) => ({ pid: pids[i] || '', z: 1, ox: 0, oy: 0 })), gap: multi ? 8 : 0, pad: multi ? 6 : 0, rad: multi ? 6 : 0, frame: 'none', bg: '#fbf1e6', bord: '#ffffff', tilt: false, ar: 4 / 5 }; }
  function autoFill(cfg) {
    const used = new Set(cfg.cells.map(c => c.pid).filter(Boolean)), pool = (S.ids.size ? S.photos.filter(p => S.ids.has(p.id)) : visible()).concat(S.photos).filter(p => p.type === 'photo' && !used.has(p.id));
    cfg.cells.forEach(c => { if (!c.pid) { const p = pool.find(x => !used.has(x.id)); if (p) { c.pid = p.id; used.add(p.id); } } });
  }
  async function loadCellImgs() {
    for (const c of FS.cfg.cells) if (c.pid && !FS.imgs[c.pid]) { try { const src = await getSrc(c.pid); FS.imgs[c.pid] = await loadImg(src); } catch (e) { c.pid = ''; } }
  }
  function rr(ctx, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function drawFrame(ctx, W, H, cfg, imgs, preview) {
    const u = Math.min(W, H) / 100, pad = cfg.pad * u * .5, gap = cfg.n > 1 ? cfg.gap * u * .5 : 0, rad = cfg.rad * u * .35, geo = [];
    ctx.save(); ctx.fillStyle = cfg.bg; ctx.fillRect(0, 0, W, H);
    const aw = W - 2 * pad, ah = H - 2 * pad;
    rectsOf(cfg).forEach((r, i) => {
      const x = pad + r[0] * aw + gap / 2, y = pad + r[1] * ah + gap / 2, w = r[2] * aw - gap, hh = r[3] * ah - gap; if (w < 2 || hh < 2) { geo[i] = { x, y, w, h: hh, iw: 0, ih: 0, dw: 0, dh: 0 }; return; }
      const c = cfg.cells[i] || {}, im = imgs[c.pid], fr = cfg.frame; let ix = x, iy = y, iw = w, ih = hh, ir = rad;
      const b = Math.min(w, hh) * (fr === 'polaroid' ? .05 : .035);
      if (fr === 'polaroid') { ix = x + b; iy = y + b; iw = w - 2 * b; ih = hh - b - b * 3.4; ir = Math.min(rad, 4 * u * .3); } else if (fr === 'white') { ix = x + b; iy = y + b; iw = w - 2 * b; ih = hh - 2 * b; ir = Math.max(0, rad - b * .5); }
      const s = im ? Math.max(iw / im.width, ih / im.height) * (c.z || 1) : 1, dw = im ? im.width * s : iw, dh = im ? im.height * s : ih;
      geo[i] = { x, y, w, h: hh, ix, iy, iw, ih, dw, dh };
      ctx.save();
      if (cfg.tilt && cfg.n > 1 || cfg.tilt && fr !== 'none') { const a = (((i * 53) % 7) - 3) * 0.011 + (i % 2 ? .008 : -.008), cx = x + w / 2, cy = y + hh / 2; ctx.translate(cx, cy); ctx.rotate(a); ctx.scale(.95, .95); ctx.translate(-cx, -cy); }
      if (fr === 'white' || fr === 'polaroid') { ctx.save(); ctx.shadowColor = 'rgba(50,25,60,.3)'; ctx.shadowBlur = u * 1.8; ctx.shadowOffsetY = u * .6; ctx.fillStyle = cfg.bord; rr(ctx, x, y, w, hh, rad); ctx.fill(); ctx.restore(); }
      else if (fr === 'shadow') { ctx.save(); ctx.shadowColor = 'rgba(50,25,60,.34)'; ctx.shadowBlur = u * 2.4; ctx.shadowOffsetY = u * .8; ctx.fillStyle = '#fff'; rr(ctx, ix, iy, iw, ih, ir); ctx.fill(); ctx.restore(); }
      ctx.save(); rr(ctx, ix, iy, iw, ih, ir); ctx.clip();
      if (im) { const dx = ix + (iw - dw) / 2 + (c.ox || 0) * (dw - iw) / 2, dy = iy + (ih - dh) / 2 + (c.oy || 0) * (dh - ih) / 2; ctx.drawImage(im, dx, dy, dw, dh); }
      else { ctx.fillStyle = 'rgba(138,100,163,.16)'; ctx.fillRect(ix, iy, iw, ih); if (preview) { ctx.strokeStyle = 'rgba(138,100,163,.8)'; ctx.lineWidth = Math.max(2, u * .3); ctx.beginPath(); const m = Math.min(iw, ih) * .12, cx = ix + iw / 2, cy = iy + ih / 2; ctx.moveTo(cx - m, cy); ctx.lineTo(cx + m, cy); ctx.moveTo(cx, cy - m); ctx.lineTo(cx, cy + m); ctx.stroke(); } }
      ctx.restore();
      if (fr === 'tape') { const tw = Math.min(w, hh) * .34, th = tw * .3; ctx.save(); ctx.translate(x + w / 2, y + 1); ctx.rotate(-.05); ctx.fillStyle = 'rgba(183,156,203,.72)'; ctx.fillRect(-tw / 2, -th / 2, tw, th); ctx.restore(); }
      if (preview && i === FS.sel) { ctx.strokeStyle = '#d9658f'; ctx.lineWidth = Math.max(2, u * .4); ctx.setLineDash([u * 1.4, u * 1]); rr(ctx, x, y, w, hh, rad); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = '#d9658f'; const rb = u * 2.6; ctx.beginPath(); ctx.arc(x + rb * 1.1, y + rb * 1.1, rb, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = `600 ${rb * 1.3}px Inter,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(i + 1), x + rb * 1.1, y + rb * 1.1 + 1); }
      ctx.restore();
    });
    ctx.restore(); return geo;
  }
  function fsSize() {
    const wrap = $('#fsWrap'), cv = $('#fsCanvas'), ar = arOf(FS.cfg), dpr = Math.min(2, window.devicePixelRatio || 1);
    const mw = Math.max(80, wrap.clientWidth - 24), mh = Math.max(80, wrap.clientHeight - 24); let w = Math.min(mw, mh * ar), hh = w / ar;
    cv.style.width = w + 'px'; cv.style.height = hh + 'px'; cv.width = Math.round(w * dpr); cv.height = Math.round(hh * dpr); FS.W = cv.width; FS.H = cv.height; fsDraw();
  }
  function fsDraw() { if (!FS.open || !FS.cfg) return; const cv = $('#fsCanvas'), ctx = cv.getContext('2d'); FS.geo = drawFrame(ctx, FS.W, FS.H, FS.cfg, FS.imgs, true); }
  function thumbSVG(rects, ar, on) {
    const W = 56, H = Math.round(56 / Math.min(1.6, Math.max(.7, ar))); let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">`;
    rects.forEach(r => { s += `<rect x="${(r[0] * W + 1).toFixed(1)}" y="${(r[1] * H + 1).toFixed(1)}" width="${(r[2] * W - 2).toFixed(1)}" height="${(r[3] * H - 2).toFixed(1)}" rx="2" fill="currentColor" opacity=".55"/>`; }); return s + '</svg>';
  }
  function section(title, ...kids) { return h('section', { class: 'fs-sec' }, h('h3', { text: title }), ...kids); }
  function slider(label, key, min, max, fmt) {
    const out = h('output', { text: fmt ? fmt(FS.cfg[key]) : FS.cfg[key] }), inp = h('input', { type: 'range', min, max, step: '1', value: FS.cfg[key], 'aria-label': label, oninput: e => { FS.cfg[key] = +e.target.value; out.textContent = fmt ? fmt(+e.target.value) : e.target.value; fsDraw(); } });
    return h('label', { class: 'sl' }, h('span', { text: label }), inp, out);
  }
  function dots(list, key) { return h('div', { class: 'dots' }, ...list.map(c => h('button', { type: 'button', class: 'dot' + (FS.cfg[key].toLowerCase() === c ? ' on' : ''), style: `background:${c}`, 'aria-label': c, onclick: () => { FS.cfg[key] = c; fsDraw(); buildCtl(); } })), h('input', { type: 'color', value: FS.cfg[key], 'aria-label': 'Custom colour', oninput: e => { FS.cfg[key] = e.target.value; fsDraw(); } })); }
  function buildCtl() {
    const c = $('#fsCtl'), cfg = FS.cfg, top = c.scrollTop, cell = cfg.cells[FS.sel] || {}, p = cell.pid ? byId(cell.pid) : null, ar = arOf(cfg);
    const kids = [];
    kids.push(section('1. Where should it go?', h('div', { class: 'sl-list' }, ...SLOTS.map(s => h('button', { type: 'button', class: 'slot' + (s.id === FS.slot ? ' on' : ''), onclick: () => switchSlot(s.id) }, h('b', { text: s.name }), h('small', { text: s.sub }), S.slots[s.id] && !S.slots[s.id].removed ? h('i', { class: 'in', text: 'placed' }) : null)))));
    if (slotDef(FS.slot).free) kids.push(h('div', { class: 'chips' }, ...RATIOS.map(r => h('button', { type: 'button', class: 'chip' + (Math.abs(cfg.ar - r[1]) < .01 ? ' on' : ''), text: r[0], onclick: () => { cfg.ar = r[1]; fsSize(); buildCtl(); } }))));
    kids.push(section('2. How many photos fit in the frame?', h('div', { class: 'chips big' }, ...COUNTS.map(n => h('button', { type: 'button', class: 'chip' + (cfg.n === n ? ' on' : ''), text: String(n), 'aria-label': `${n} photo${n > 1 ? 's' : ''}`, onclick: () => setCount(n) }))),
      (LAY[cfg.n] || []).length > 1 ? h('div', { class: 'lays' }, ...LAY[cfg.n].map((l, i) => { const b = h('button', { type: 'button', class: 'lay' + (cfg.lay === i ? ' on' : ''), title: l[0], 'aria-label': l[0], onclick: () => { cfg.lay = i; fsDraw(); buildCtl(); } }); b.innerHTML = thumbSVG(l[1], ar); return b; })) : null));
    kids.push(section(`3. Adjust photo ${FS.sel + 1}`, h('div', { class: 'selph' }, h('span', { class: 'sph' }, p ? h('img', { src: p.thumb, alt: '' }) : ico('image')), h('div', { class: 'sph-t' }, h('b', { text: p ? p.name : 'Empty box' }), h('small', { text: p ? 'Drag the photo in the preview to move it' : 'Tap the box or the button' })), h('button', { type: 'button', class: 'g-btn sm soft', onclick: () => openPick(FS.sel) }, p ? 'Change' : 'Choose')),
      p ? h('label', { class: 'sl' }, h('span', { text: 'Zoom' }), h('input', { type: 'range', min: '100', max: '400', value: Math.round((cell.z || 1) * 100), 'aria-label': 'Zoom', oninput: e => { cell.z = +e.target.value / 100; clampCell(FS.sel); fsDraw(); } }), h('output', { text: Math.round((cell.z || 1) * 100) + '%' })) : null,
      p ? h('div', { class: 'row' }, h('button', { type: 'button', class: 'g-btn sm ghost', onclick: () => { cell.z = 1; cell.ox = 0; cell.oy = 0; fsDraw(); buildCtl(); } }, 'Reset position'), cfg.n > 1 ? h('button', { type: 'button', class: 'g-btn sm ghost', onclick: () => { cell.pid = ''; fsDraw(); buildCtl(); } }, 'Empty this box') : null) : null));
    kids.push(section('4. Frame and style', h('div', { class: 'chips' }, ...FRAMES.map(f => h('button', { type: 'button', class: 'chip' + (cfg.frame === f[0] ? ' on' : ''), text: f[1], onclick: () => { cfg.frame = f[0]; fsDraw(); buildCtl(); } }))),
      cfg.n > 1 ? slider('Space between', 'gap', 0, 30) : null, slider('Edge margin', 'pad', 0, 30), slider('Rounded corners', 'rad', 0, 40),
      cfg.n > 1 || cfg.frame !== 'none' ? h('label', { class: 'tg' }, h('input', { type: 'checkbox', checked: cfg.tilt, onchange: e => { cfg.tilt = e.target.checked; fsDraw(); } }), h('span', { text: 'Slight tilt, like pasted photos' })) : null,
      h('div', { class: 'dl-row' }, h('span', { text: 'Background' }), dots(BGS, 'bg')), cfg.frame === 'white' || cfg.frame === 'polaroid' ? h('div', { class: 'dl-row' }, h('span', { text: 'Border' }), dots(BORDS, 'bord')) : null));
    c.replaceChildren(...kids.filter(Boolean)); c.scrollTop = top;
    $('#fsRemove').hidden = !(S.slots[FS.slot] && !S.slots[FS.slot].removed) || slotDef(FS.slot).free; $('#fsPlace').lastChild.textContent = slotDef(FS.slot).free ? 'Save picture' : 'Place in app'; $('#fsDl').hidden = slotDef(FS.slot).free;
  }
  function clampCell(i) { const c = FS.cfg.cells[i], gm = FS.geo[i]; if (!c) return; c.ox = clamp(c.ox || 0, -1, 1); c.oy = clamp(c.oy || 0, -1, 1); if (gm && gm.dw <= gm.iw + .5) c.ox = 0; if (gm && gm.dh <= gm.ih + .5) c.oy = 0; }
  async function switchSlot(id) {
    FS.slot = id; const saved = S.slots[id] && !S.slots[id].removed ? S.slots[id].cfg : null;
    if (saved) { FS.cfg = JSON.parse(JSON.stringify(saved)); FS.cfg.slot = id; FS.cfg.cells.forEach(c => { if (c.pid && !byId(c.pid)) c.pid = ''; }); } else { FS.cfg.slot = id; }
    FS.sel = 0; await loadCellImgs(); fsSize(); buildCtl();
  }
  async function setCount(n) {
    const cfg = FS.cfg; cfg.n = n; cfg.lay = 0; while (cfg.cells.length < n) cfg.cells.push({ pid: '', z: 1, ox: 0, oy: 0 }); cfg.cells.length = n;
    if (n > 1 && cfg.gap === 0) cfg.gap = 8; if (n > 1 && cfg.pad === 0) cfg.pad = 6; if (n === 1) cfg.gap = 0;
    autoFill(cfg); FS.sel = Math.min(FS.sel, n - 1); await loadCellImgs(); fsDraw(); buildCtl();
  }
  async function openStudio(slot, pids) {
    if (!S.photos.some(p => p.type === 'photo')) return toast('Add a photo to the gallery first ♡');
    pids = (pids || (S.sel && S.ids.size ? [...S.ids] : [])).filter(id => { const p = byId(id); return p && p.type === 'photo'; }).slice(0, 9);
    FS.slot = slot || FS.slot || 'home-hero'; const saved = !pids.length && S.slots[FS.slot] && !S.slots[FS.slot].removed ? S.slots[FS.slot].cfg : null;
    FS.cfg = saved ? JSON.parse(JSON.stringify(saved)) : newCfg(FS.slot, pids); FS.cfg.slot = FS.slot; FS.cfg.cells.forEach(c => { if (c.pid && !byId(c.pid)) c.pid = ''; });
    if (!pids.length && !saved) { FS.cfg.cells[0].pid = ''; } autoFill(FS.cfg); FS.sel = 0; FS.imgs = FS.imgs || {};
    FS.open = true; $('#fs').hidden = false; document.body.classList.add('noscroll'); await loadCellImgs(); buildCtl(); requestAnimationFrame(() => { fsSize(); buildCtl(); }); $('#fsClose').focus();
  }
  function closeStudio() { FS.open = false; $('#fs').hidden = true; if (!V.open) document.body.classList.remove('noscroll'); setSel(false); }
  /* picking a photo for a box */
  let pickIdx = 0;
  function openPick(i) {
    pickIdx = i; albumOptions($('#pkAlb'), true, 'all'); drawPick(); $('#pick').hidden = false; $('#pkDone').focus();
  }
  function drawPick() {
    const alb = $('#pkAlb').value || 'all', used = new Set(FS.cfg.cells.map(c => c.pid)); let a = visibleAll().filter(p => p.type === 'photo'); if (alb !== 'all') a = a.filter(p => (alb === 'none' ? !p.album : p.album === alb));
    $('#pkGrid').replaceChildren(...a.map(p => h('button', { type: 'button', class: 'pk' + (FS.cfg.cells[pickIdx].pid === p.id ? ' on' : '') + (used.has(p.id) ? ' used' : ''), 'aria-label': p.name, onclick: async () => { const c = FS.cfg.cells[pickIdx]; c.pid = p.id; c.z = 1; c.ox = 0; c.oy = 0; $('#pick').hidden = true; await loadCellImgs(); fsDraw(); buildCtl(); } }, h('img', { src: p.thumb, alt: '' }), used.has(p.id) ? h('i', { text: 'in frame' }) : null)));
    if (!a.length) $('#pkGrid').replaceChildren(h('p', { class: 'g-hint', text: 'No photos here.' }));
  }
  const visibleAll = () => S.photos.slice().sort((x, y) => (y.date < x.date ? -1 : y.date > x.date ? 1 : y.created - x.created));
  /* preview interactions */
  function hitCell(px, py) {
    const k = FS.W / $('#fsCanvas').getBoundingClientRect().width, x = px * k, y = py * k; for (let i = FS.geo.length - 1; i >= 0; i--) { const gm = FS.geo[i]; if (gm && x >= gm.x && x <= gm.x + gm.w && y >= gm.y && y <= gm.y + gm.h) return i; } return -1;
  }
  function bindStudio() {
    const cv = $('#fsCanvas');
    const pos = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    cv.addEventListener('pointerdown', e => {
      cv.setPointerCapture(e.pointerId); FS.ptrs.set(e.pointerId, [e.clientX, e.clientY]);
      if (FS.ptrs.size === 2) { const [a, b] = [...FS.ptrs.values()]; FS.pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: (FS.cfg.cells[FS.sel] || {}).z || 1 }; FS.drag = null; return; }
      const [x, y] = pos(e), i = hitCell(x, y); if (i < 0) return; const was = FS.sel; FS.sel = i; FS.drag = { i, x: e.clientX, y: e.clientY, moved: false, was }; fsDraw(); if (was !== i) buildCtl();
    });
    cv.addEventListener('pointermove', e => {
      if (!FS.ptrs.has(e.pointerId)) return; FS.ptrs.set(e.pointerId, [e.clientX, e.clientY]);
      if (FS.ptrs.size === 2 && FS.pinch) { const [a, b] = [...FS.ptrs.values()], c = FS.cfg.cells[FS.sel]; if (c && c.pid) { c.z = clamp(FS.pinch.z * Math.hypot(a[0] - b[0], a[1] - b[1]) / FS.pinch.d, 1, 4); clampCell(FS.sel); fsDraw(); } return; }
      const d = FS.drag; if (!d) return; const c = FS.cfg.cells[d.i], gm = FS.geo[d.i]; if (!c || !c.pid || !gm) return;
      const k = FS.W / cv.getBoundingClientRect().width, dx = (e.clientX - d.x) * k, dy = (e.clientY - d.y) * k; if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
      const ox = (gm.dw - gm.iw) / 2, oy = (gm.dh - gm.ih) / 2; if (ox > .5) c.ox = clamp((c.ox || 0) + dx / ox, -1, 1); if (oy > .5) c.oy = clamp((c.oy || 0) + dy / oy, -1, 1); d.x = e.clientX; d.y = e.clientY; fsDraw();
    });
    const up = e => { FS.ptrs.delete(e.pointerId); if (FS.ptrs.size < 2) FS.pinch = null; const d = FS.drag; if (d && !d.moved && e.type === 'pointerup' && !(FS.cfg.cells[d.i] || {}).pid) openPick(d.i); if (!FS.ptrs.size) { FS.drag = null; if (d && d.moved) buildCtl(); } };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', e => { const c = FS.cfg.cells[FS.sel]; if (!c || !c.pid) return; e.preventDefault(); c.z = clamp((c.z || 1) * (e.deltaY < 0 ? 1.08 : 1 / 1.08), 1, 4); clampCell(FS.sel); fsDraw(); }, { passive: false });
    cv.addEventListener('dblclick', e => { const c = FS.cfg.cells[FS.sel]; if (c && c.pid) { c.z = c.z > 1.05 ? 1 : 2; c.ox = c.oy = 0; clampCell(FS.sel); fsDraw(); buildCtl(); } });
    cv.addEventListener('keydown', e => { const c = FS.cfg.cells[FS.sel]; if (!c) return; const st = .08; if (e.key === 'ArrowLeft') c.ox -= st; else if (e.key === 'ArrowRight') c.ox += st; else if (e.key === 'ArrowUp') c.oy -= st; else if (e.key === 'ArrowDown') c.oy += st; else if (e.key === '+') c.z = Math.min(4, (c.z || 1) + .1); else if (e.key === '-') c.z = Math.max(1, (c.z || 1) - .1); else return; e.preventDefault(); clampCell(FS.sel); fsDraw(); });
    $('#fsClose').onclick = closeStudio; $('#pkDone').onclick = () => ($('#pick').hidden = true); $('#pkAlb').onchange = drawPick;
    $('#fsPlace').onclick = placeInApp; $('#fsDl').onclick = () => finalURL().then(u => u && saveURL(u)); $('#fsRemove').onclick = removeFromApp;
    window.addEventListener('resize', () => { if (FS.open) fsSize(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && FS.open) { if (!$('#pick').hidden) $('#pick').hidden = true; else closeStudio(); } });
  }
  async function finalURL() {
    const cfg = FS.cfg; if (cfg.cells.some(c => !c.pid)) { toast('Choose a photo for every box first, or pick fewer photos.'); return ''; }
    await loadCellImgs(); const slot = slotDef(FS.slot), ar = arOf(cfg), out = slot.out; let W, H; if (ar >= 1) { W = out; H = Math.round(out / ar); } else { H = out; W = Math.round(out * ar); }
    let scale = 1, url = '';
    for (let t = 0; t < 5; t++) {
      const cv = document.createElement('canvas'); cv.width = Math.round(W * scale); cv.height = Math.round(H * scale); drawFrame(cv.getContext('2d'), cv.width, cv.height, cfg, FS.imgs, false);
      const max = slot.free ? 4e6 : slot.max || 640000; let q = .88; for (; q >= .5; q -= .08) { url = cv.toDataURL('image/jpeg', q); if (url.length * .75 <= max) return url; } scale *= .8;
    }
    return url;
  }
  function saveURL(url) { const a = h('a', { href: url, download: 'our-little-world-frame.jpg' }); document.body.append(a); a.click(); a.remove(); }
  async function placeInApp() {
    const url = await finalURL(); if (!url) return; const id = FS.slot, slot = slotDef(id);
    if (slot.free) { saveURL(url); toast('Saved ♡'); return; }
    const ok = await applyDest(id, url); if (!ok) return toast('Could not place it. Try fewer photos or a smaller frame.');
    S.slots[id] = { cfg: JSON.parse(JSON.stringify(FS.cfg)), updated: Date.now() }; await DB.set('slotimg:' + id, url); await saveSlots(); cloudPutSlot(id, url);
    toast(({ 'home-hero': 'Placed on Home ♡ Open Home to see it', 'home-memory': 'Placed on Home ♡ Open Home to see it', 'letters-bg': 'Letters background changed ♡', 'gallery-note': 'Added to your note ♡' })[id] || 'Placed ♡');
    closeStudio();
  }
  async function removeFromApp() {
    const id = FS.slot; if (!(await ask('Remove it from the app?', 'The original photos stay in your gallery. The place goes back to how it was.', 'Remove'))) return;
    await resetDest(id); S.slots[id] = { removed: true, updated: Date.now() }; await DB.del('slotimg:' + id); await saveSlots(); cloudPutSlot(id, ''); toast('Removed ♡'); buildCtl();
  }
  /* writing the picture to its place in the app */
  function idbOpen(name) { return new Promise((res, rej) => { const r = indexedDB.open(name, 1); r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('kv')) r.result.createObjectStore('kv'); }; r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
  async function applyDest(id, url) {
    try {
      if (id === 'home-hero' || id === 'home-memory') { const k = 'olw_home_v1', o = JSON.parse(localStorage.getItem(k) || '{}'); o[id === 'home-hero' ? 'heroImg' : 'memoryImg'] = url || ''; localStorage.setItem(k, JSON.stringify(o)); return true; }
      if (id === 'letters-bg') {
        const db = await idbOpen('olw_letters_v1'); const look = await new Promise(res => { const q = db.transaction('kv').objectStore('kv').get('look'); q.onsuccess = () => res(q.result); q.onerror = () => res(undefined); });
        const L = look && look.bg ? look : { bg: { type: 'scene', scene: 'wine', c1: '#3a0b18', c2: '#8a2a4a', angle: 160, blur: 0, dim: 0, img: '' }, hide: [], updated: 0 };
        if (url) { L.bg.type = 'photo'; L.bg.img = url; } else { L.bg.img = ''; if (L.bg.type === 'photo') L.bg.type = 'scene'; } L.updated = Date.now();
        await new Promise((res, rej) => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put(L, 'look'); t.oncomplete = res; t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); }); db.close(); return true;
      }
      if (id === 'gallery-note') { S.note.img = url || ''; if (url) S.note.showPhoto = true; S.note.updated = Date.now(); touchMeta(); await saveMeta(); renderNote(); cloudPutMeta(); return true; }
      return true;
    } catch (e) { return false; }
  }
  const resetDest = id => applyDest(id, '');


  /* ---------- GOOGLE SYNC (Firebase Auth + Firestore, same olw-config.js as Letters) ---------- */
  const CLOUD = { user: null, auth: null, db: null, unsub: [], first: { g: false, m: false, s: false }, loading: null };
  const cfgOK = () => !!(SYNC.firebase && SYNC.firebase.apiKey && SYNC.firebase.projectId);
  const spaceRef = () => CLOUD.db.collection('spaces').doc(SYNC.space);
  const loadScript = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.append(s); });
  const clean = o => JSON.parse(JSON.stringify(o));
  function cloudErr(e) { console.warn('sync', e); if (e && e.code === 'permission-denied') toast('Sync is blocked. Check the Firestore rules and the two allowed emails.'); else if (e && e.code === 'unavailable') return; else toast('Sync problem. Your changes are still saved on this device.'); }
  async function cloudInit() {
    if (!cfgOK()) return false; if (CLOUD.auth) return true; if (CLOUD.loading) return CLOUD.loading;
    CLOUD.loading = (async () => {
      try {
        const base = 'https://www.gstatic.com/firebasejs/10.12.2/';
        await loadScript(base + 'firebase-app-compat.js'); await loadScript(base + 'firebase-auth-compat.js'); await loadScript(base + 'firebase-firestore-compat.js');
        if (!firebase.apps.length) firebase.initializeApp(SYNC.firebase); CLOUD.auth = firebase.auth(); CLOUD.db = firebase.firestore();
        CLOUD.auth.getRedirectResult().catch(e => { if (e && e.code && e.code !== 'auth/no-auth-event') toast('Sign-in failed. Please try again.'); });
        CLOUD.auth.onAuthStateChanged(onUser); return true;
      } catch (e) { CLOUD.loading = null; toast('Sync could not start. Please check your internet.'); return false; }
    })();
    return CLOUD.loading;
  }
  function stopListen() { CLOUD.unsub.forEach(f => { try { f(); } catch (e) { } }); CLOUD.unsub = []; CLOUD.first = { g: false, m: false, s: false }; }
  async function onUser(u) {
    stopListen();
    if (!u) { CLOUD.user = null; S.me = ''; renderSync(); return; }
    const mail = (u.email || '').toLowerCase(), allowed = [SYNC.owner, SYNC.partner].filter(Boolean).map(x => x.toLowerCase());
    if (allowed.length && !allowed.includes(mail)) { toast('This Google account is not allowed here.'); CLOUD.auth.signOut(); return; }
    CLOUD.user = u; S.me = mail; listen(); renderSync(); $('#btnMe').classList.add('on'); toast('Synced as ' + u.email);
  }
  function listen() {
    CLOUD.unsub.push(spaceRef().collection('gallery').onSnapshot(snap => {
      const first = !CLOUD.first.g; let ch = false;
      snap.docChanges().forEach(c => {
        const d = c.doc, i = S.photos.findIndex(p => p.id === d.id);
        if (c.type === 'removed') { if (i >= 0) { S.photos.splice(i, 1); DB.del('s:' + d.id); ch = true; } return; }
        if (d.metadata.hasPendingWrites) return;
        const r = normPhoto(Object.assign({}, d.data(), { id: d.id }));
        if (i < 0) { S.photos.push(r); ch = true; } else if (r.updated > S.photos[i].updated) { S.photos[i] = r; ch = true; }
      });
      if (first) { CLOUD.first.g = true; const ids = new Set(snap.docs.map(d => d.id)); S.photos.filter(p => p.type === 'photo' && !ids.has(p.id)).forEach(p => cloudPutPhoto(p, true)); }
      if (ch) { savePhotos(); renderAll(); if (V.open) drawViewer(); }
    }, cloudErr));
    CLOUD.unsub.push(spaceRef().collection('meta').doc('gallery').onSnapshot(doc => {
      const first = !CLOUD.first.m; CLOUD.first.m = true;
      if (doc.exists) {
        if (doc.metadata.hasPendingWrites) return; const r = doc.data() || {}, ru = +r.metaUpdated || 0;
        if (ru > S.metaUpdated) { if (Array.isArray(r.albums)) S.albums = r.albums.filter(a => a && a.id && a.name).map(a => ({ id: String(a.id), name: String(a.name).slice(0, 30) })); S.note = normNote(r.note); S.metaUpdated = ru; saveMeta(); renderAll(); }
        else if (first && S.metaUpdated > ru) cloudPutMeta();
      } else if (first && S.metaUpdated) cloudPutMeta();
    }, cloudErr));
    CLOUD.unsub.push(spaceRef().collection('slots').onSnapshot(snap => {
      const first = !CLOUD.first.s; CLOUD.first.s = true;
      snap.docChanges().forEach(async c => {
        if (c.type === 'removed' || c.doc.metadata.hasPendingWrites) return; const id = c.doc.id, r = c.doc.data() || {}, loc = S.slots[id];
        if ((+r.updated || 0) <= (loc ? loc.updated : 0)) return;
        if (r.removed || !r.img) { S.slots[id] = { removed: true, updated: +r.updated }; await DB.del('slotimg:' + id); await resetDest(id); }
        else { S.slots[id] = { cfg: r.cfg, updated: +r.updated }; await DB.set('slotimg:' + id, r.img); await applyDest(id, r.img); }
        saveSlots(); if (FS.open) buildCtl();
      });
      if (first) Object.keys(S.slots).forEach(async id => { if (!snap.docs.some(d => d.id === id)) { const img = await DB.get('slotimg:' + id); if (S.slots[id].removed) cloudPutSlot(id, ''); else if (img) cloudPutSlot(id, img); } });
    }, cloudErr));
  }
  function cloudPutPhoto(p, withSrc) {
    if (!CLOUD.user || !CLOUD.db || !p || p.type !== 'photo') return;
    try {
      spaceRef().collection('gallery').doc(p.id).set(clean(p)).catch(cloudErr);
      if (withSrc) DB.get('s:' + p.id).then(src => { if (src && src.length < 960000) spaceRef().collection('gsrc').doc(p.id).set({ src }).catch(cloudErr); });
    } catch (e) { cloudErr(e); }
  }
  async function cloudSrc(id) { if (!CLOUD.user || !CLOUD.db) return ''; try { const d = await spaceRef().collection('gsrc').doc(id).get(); return d.exists ? (d.data().src || '') : ''; } catch (e) { return ''; } }
  function cloudDelPhoto(id) { if (!CLOUD.user || !CLOUD.db) return; try { spaceRef().collection('gallery').doc(id).delete().catch(cloudErr); spaceRef().collection('gsrc').doc(id).delete().catch(cloudErr); } catch (e) { cloudErr(e); } }
  function cloudPutMeta() { if (!CLOUD.user || !CLOUD.db) return; try { spaceRef().collection('meta').doc('gallery').set(clean({ albums: S.albums, note: S.note, metaUpdated: S.metaUpdated })).catch(cloudErr); } catch (e) { cloudErr(e); } }
  function cloudPutSlot(id, img) { if (!CLOUD.user || !CLOUD.db) return; try { const s = S.slots[id] || {}; spaceRef().collection('slots').doc(id).set(clean({ removed: !img, cfg: img ? s.cfg : null, img: img || '', updated: s.updated || Date.now() })).catch(cloudErr); } catch (e) { cloudErr(e); } }
  async function signIn() {
    if (!(await cloudInit())) return; const p = new firebase.auth.GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' });
    try { await CLOUD.auth.signInWithPopup(p); } catch (e) {
      if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment')) { try { await CLOUD.auth.signInWithRedirect(p); } catch (e2) { toast('Sign-in failed. Please try again.'); } }
      else if (e && e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') toast('Sign-in failed' + (e && e.code ? ' (' + e.code + ')' : '') + '.');
    }
  }
  function renderSync() {
    const b = $('#syncBody'); if (!b) return; b.replaceChildren();
    if (!cfgOK()) { b.append(h('p', { text: 'Sync is not set up yet, so your photos are saved only on this device.' }), h('p', { class: 'small', text: 'To show the gallery on both Google accounts, fill in olw-config.js (the steps are written at the top of that file). Letters uses the same file.' })); return; }
    if (CLOUD.user) b.append(h('p', {}, 'Signed in as ', h('b', { text: CLOUD.user.email })), h('p', { class: 'small', text: 'Photos, albums, the note and the places you set in the app now appear on both accounts. Videos stay on the device that added them.' }), h('div', { class: 'btnrow' }, h('button', { type: 'button', class: 'g-btn ghost', onclick: () => CLOUD.auth.signOut() }, 'Sign out')));
    else b.append(h('p', { text: 'Sign in with Google so the gallery shows on both accounts.' }), h('div', { class: 'btnrow' }, h('button', { type: 'button', class: 'g-btn', onclick: signIn }, 'Sign in with Google')));
  }
  function openSync() { renderSync(); openDlg($('#dlgSync')); }


  /* ---------- wiring ---------- */
  function bind() {
    document.addEventListener('click', e => {
      const t = e.target.closest('[data-go]'); if (t) { e.preventDefault(); go(t.dataset.go); }
      if (!e.target.closest('#menu,#btnGear')) toggleMenu(false); if (!e.target.closest('#sortMenu,#btnSort')) { $('#sortMenu').hidden = true; }
    });
    $$('#tabs [data-tab]').forEach(b => (b.onclick = () => { S.tab = b.dataset.tab; renderAll(); }));
    const setQ = v => { S.q = v; renderGrid(); renderTabs(); $('#qTop').value = v; $('#qBar').value = v; };
    $('#qTop').oninput = e => setQ(e.target.value); $('#qBar').oninput = e => setQ(e.target.value);
    $('#albSel').onchange = e => { S.album = e.target.value; renderAll(); }; $('#albAll').onclick = () => { S.album = 'all'; S.tab = 'all'; renderAll(); };
    $('#btnUp').onclick = () => $('#fileUp').click(); $('#fileUp').onchange = e => { addFiles(e.target.files); e.target.value = ''; };
    $('#btnGear').onclick = e => { e.stopPropagation(); toggleMenu(); }; $('#btnSort').onclick = e => { e.stopPropagation(); openSortMenu(); };
    $('#btnMe').onclick = openSync; $('#syncClose').onclick = () => closeDlg($('#dlgSync'));
    $$('#menu [data-act]').forEach(b => (b.onclick = () => {
      toggleMenu(false); const a = b.dataset.act;
      if (a === 'view') { S.view = S.view === 'simple' ? 'scrap' : 'simple'; savePrefs(); renderAll(); } else if (a === 'upload') $('#fileUp').click(); else if (a === 'frame') openStudio(null, null); else if (a === 'select') setSel(true); else if (a === 'albums') { renderAlbMan(); openDlg($('#dlgAlb')); } else if (a === 'note') openNote(); else if (a === 'sync') openSync();
    }));
    $('#note').onclick = openNote; $('#nCancel').onclick = () => closeDlg($('#dlgNote'));
    $('#selFrame').onclick = () => askUse([...S.ids]); $('#selMove').onclick = openMove; $('#selDone').onclick = () => setSel(false);
    $('#selDel').onclick = async () => { if (await deletePhotos([...S.ids])) setSel(false); };
    $('#iCancel').onclick = () => closeDlg($('#dlgInfo')); $('#infoForm').onsubmit = e => { e.preventDefault(); saveInfo(); };
    $('#albAdd').onclick = addAlbum; $('#albNew').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); addAlbum(); } }; $('#albClose').onclick = () => closeDlg($('#dlgAlb'));
    $('#useCancel').onclick = () => closeDlg($('#dlgUse')); $('#moveCancel').onclick = () => closeDlg($('#dlgMove'));
    ['dragenter', 'dragover'].forEach(ev => document.addEventListener(ev, e => { if (e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files')) e.preventDefault(); }));
    document.addEventListener('drop', e => { if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) { e.preventDefault(); addFiles(e.dataTransfer.files); } });
    let lp; $('#grid').addEventListener('pointerdown', e => { const c = e.target.closest('.g-card'); if (!c || S.sel) return; clearTimeout(lp); lp = setTimeout(() => { S.sel = true; S.ids.add(c.dataset.id); lpFired = true; renderGrid(); }, 600); });
    ['pointerup', 'pointerleave', 'pointercancel', 'pointermove'].forEach(ev => $('#grid').addEventListener(ev, () => clearTimeout(lp)));
    let lpFired = false; $('#grid').addEventListener('click', e => { if (lpFired) { e.stopPropagation(); e.preventDefault(); lpFired = false; } }, true);
    $$('dialog').forEach(d => d.addEventListener('click', e => { if (e.target === d) closeDlg(d); }));
  }
  async function init() {
    await DB.open();
    const [ph, meta, slots, prefs] = await Promise.all([DB.get('photos'), DB.get('meta'), DB.get('slots'), DB.get('prefs')]);
    S.photos = (Array.isArray(ph) ? ph : []).map(normPhoto);
    if (meta) { if (Array.isArray(meta.albums)) S.albums = meta.albums.filter(a => a && a.id && a.name); S.note = normNote(meta.note); S.metaUpdated = +meta.metaUpdated || 0; }
    S.slots = slots && typeof slots === 'object' ? slots : {};
    if (prefs) { S.sort = pick(prefs.sort, ['new', 'old', 'name'], 'new'); S.size = pick(prefs.size, ['s', 'm', 'l'], 'm'); S.view = pick(prefs.view, ['scrap', 'simple'], 'scrap'); }
    icons(); decorate(); bind(); bindViewer(); bindStudio(); renderAll(); renderSync();
    window.__gallery = { S, addFiles, openStudio, FS, applyDest, resetDest, drawFrame, openViewer, visible, cloudPutPhoto };
    if (cfgOK()) cloudInit();
  }
  init();
})();

