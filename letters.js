/* Our Little World - LETTERS page logic.
   Abhi backend/login nahi: letters browser ke IndexedDB mein save hote hain.
   Backend ke baad sirf "STORAGE" wala hissa aur ROLE badalna hai. */
(() => {
  'use strict';

  /* ---------- 0. CONFIG ---------- */
  let ROLE = 'owner';                           // Google sign-in ke baad email se tay hota hai ('owner' | 'partner'); sign-in ke baghair 'owner'.
  const ME = { email: '' };
  /* ---- GOOGLE SYNC (dono accounts par letters + design ek jaise dikhane ke liye) ----
     Setup (ek baar, ~5 min):
     1) console.firebase.google.com par project banayein > Build > Authentication > Google ko enable karein.
     2) Build > Firestore Database banayein, phir neeche wale Rules paste karein (apni 2 emails daal kar).
     3) Project settings > Your apps > Web app (</>) banayein aur uska config yahan 'firebase' mein paste karein.
     4) Authentication > Settings > Authorized domains mein apni website ka domain add karein.
     5) 'owner' aur 'partner' mein dono Google emails likhein.
     Firestore Rules:
       rules_version = '2';
       service cloud.firestore { match /databases/{db}/documents {
         match /spaces/{space}/{document=**} { allow read, write: if request.auth != null && request.auth.token.email in ['owner@gmail.com','partner@gmail.com']; } } }
     Jab tak config khali hai, sab kuch sirf isi browser mein save hota hai. */
  const SYNC = Object.assign({ firebase: { apiKey: '', authDomain: '', projectId: '', appId: '' }, space: 'our-little-world', owner: '', partner: '' }, window.OLW_SYNC || {});   // olw-config.js se aata hai
  const TZ = 'Asia/Karachi';
  const LIM = { letters: 300, paras: 80, paraLen: 5000, photoBytes: 3.5 * 1024 * 1024 };

  /* ---------- 1. HELPERS ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const f1 = n => Math.round(n * 10) / 10;
  const pad2 = n => String(n).padStart(2, '0');
  const uid = () => 'l' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  const clone = o => JSON.parse(JSON.stringify(o));
  const hashStr = s => { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; };
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function h(tag, props, ...kids) {
    const e = document.createElement(tag);
    if (props) for (const k in props) {
      const v = props[k]; if (v == null || v === false) continue;
      if (k === 'class') e.className = v; else if (k === 'style') e.style.cssText = v; else if (k === 'html') e.innerHTML = v; else if (k === 'text') e.textContent = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat()) { if (c == null || c === false) continue; e.append(c.nodeType ? c : document.createTextNode(c)); }
    return e;
  }
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const parseISO = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); if (!m) return null; const dt = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])); return dt.getUTCMonth() === +m[2] - 1 ? { y: +m[1], mo: +m[2], d: +m[3] } : null; };
  const fmtDate = iso => { const p = parseISO(iso); return p ? `${p.d} ${MONTHS[p.mo - 1]} ${p.y}` : ''; };
  const todayISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const txt = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').slice(0, n);
  const pick = (v, list, d) => (list.includes(v) ? v : d);
  const isHex = v => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
  const mixHex = (a, b, t) => { const p = x => [1, 3, 5].map(i => parseInt(x.slice(i, i + 2), 16)); const A = p(a), B = p(b); return '#' + A.map((v, i) => pad2(Math.round(v + (B[i] - v) * t).toString(16))).join(''); };
  const svgURL = s => `url("data:image/svg+xml,${encodeURIComponent(s)}")`;

  /* ---------- 2. OPTIONS ---------- */
  const FLORALS = { plum: 'Plum roses', lavender: 'Lavender', rose: 'Blush pink', sage: 'Greenery', none: 'None' };
  const PAPERS = { cream: ['#f7ecdc', '#ead9c0', 'Cream'], white: ['#fffaf2', '#f1e6d6', 'Ivory'], rose: ['#f9e4e3', '#edcacd', 'Rose'], lilac: ['#f2e8f5', '#ddcce7', 'Lilac'], aged: ['#efdcb8', '#dcc193', 'Old paper'] };
  const LDESIGNS = { florals: 'Classic florals', roses: 'Rose garden', gold: 'Golden frame', lace: 'Lace & bow', hearts: 'Heart border', watercolor: 'Watercolour', airmail: 'Airmail', stars: 'Starry night', vine: 'Garden vine', ribbon: 'Satin ribbon', notebook: 'Notebook', kraft: 'Kraft & stitches', cherry: 'Cherry blossom', navy: 'Navy & gold', chalk: 'Black board', sunset: 'Sunset sky', emerald: 'Emerald & gold', minimal: 'Clean lines', linen: 'Soft corners', pastel: 'Pastel dots', sprig: 'Green sprigs', modern: 'Modern bar', moon: 'Moonlight' };
  const DEF_INK = { navy: '#1d2a5b', emerald: '#14503a', chalk: '#f1e4c4', sunset: '#2d2a66', moon: '#eadfc2' };   // pen colour that suits these designs (applied when the design is chosen)
  const DEF_DCOL = { gold: '#c99a3a', lace: '#e8a0b8', hearts: '#e5809f', watercolor: '#e58fb1', airmail: '#d6455d', stars: '#d4a23c', vine: '#6f8a4d', ribbon: '#c2476f', notebook: '#c85a6a', kraft: '#b58a5a', cherry: '#f0a0b8', navy: '#1d2a5b', chalk: '#d4a84a', sunset: '#8a6bc0', emerald: '#14503a', minimal: '#b89a6a', linen: '#c9a27a', pastel: '#f0a6b8', sprig: '#5f8a5a', modern: '#b8456f', moon: '#d9b45a', roses: '#c0587f', florals: '#b8456f' };
  const ENVS = { cream: ['#f4e7d8', '#ecd9c6', '#ddc6b0', 'Cream'], blush: ['#f9e3e3', '#f0cfd2', '#e0b3b9', 'Blush'], lilac: ['#f1e8f6', '#e1d2ee', '#cbb6de', 'Lilac'], sage: ['#eaf0e0', '#d9e4cb', '#bccfa6', 'Sage'], kraft: ['#dcbf96', '#cfae80', '#b99060', 'Kraft'], wine: ['#8a2a45', '#701c35', '#4e1024', 'Wine'] };
  const LHIDE = [['photo', 'Photo'], ['from', '"From" line'], ['date', 'Date'], ['design', 'Page design / flowers'], ['underline', 'Underlines'], ['closing', 'Closing line'], ['note', 'Side note'], ['envflor', 'Flowers on envelope'], ['seal', 'Wax seal on envelope']];
  const GHIDE = [['gyp', "Baby's-breath flowers"], ['lantern', 'Lantern'], ['petals', 'Rose petals'], ['lights', 'Fairy lights'], ['laurel', 'Top corner ornaments'], ['divider', 'Divider lines'], ['tagline', 'Words under the envelope'], ['pillfl', 'Flowers beside the button'], ['cloth', 'Cream cloth'], ['under', 'Papers under the letter'], ['pen', 'Pen (letter screen)'], ['wseal', 'Wax seal (letter screen)']];
  const SCENES = {
    wine: { n: 'Wine', bg: '#3a0b18', v: ['#7d2238', '#52111f', '#2b0610'], hi: '#a63a52', cloth: ['#fbf2e8', '#f3e4d4', '#e6d2bf'] },
    midnight: { n: 'Midnight', bg: '#0c1630', v: ['#2a4a8a', '#16295a', '#080f26'], hi: '#4a72c4', cloth: ['#f3f3f8', '#e4e6f0', '#d0d4e4'] },
    emerald: { n: 'Emerald', bg: '#0b2a20', v: ['#1f7a5a', '#10503a', '#062418'], hi: '#2f9a74', cloth: ['#f7f4e8', '#ece7d2', '#dcd5ba'] },
    plum: { n: 'Plum', bg: '#2a1038', v: ['#7a3a98', '#4b1d63', '#220c30'], hi: '#a566c2', cloth: ['#f9eff9', '#eeddef', '#ddc5df'] },
    rosegold: { n: 'Rose gold', bg: '#4a1e26', v: ['#c47a7a', '#8f4a52', '#4a1e28'], hi: '#e0a0a0', cloth: ['#fff5ee', '#f8e4d7', '#ebd1c1'] },
    charcoal: { n: 'Charcoal', bg: '#16161a', v: ['#4a4a54', '#2c2c34', '#121216'], hi: '#6a6a78', cloth: ['#f7f5f1', '#e9e6e0', '#d7d3cb'] }
  };
  const FONT_SIMPLE = ['Inter', 'Poppins', 'Nunito', 'Lato', 'Open Sans', 'Quicksand', 'Montserrat', 'Merriweather', 'Lora', 'Playfair Display', 'Cormorant Garamond', 'EB Garamond', 'Libre Baskerville', 'Courier Prime', 'Special Elite'];
  const FONT_HAND = ['Covered By Your Grace', 'Caveat', 'Homemade Apple', 'Reenie Beanie', 'Nothing You Could Do', 'Zeyada', 'Kalam', 'La Belle Aurore', 'Dancing Script', 'Shadows Into Light', 'Indie Flower', 'Patrick Hand', 'Gaegu', 'Satisfy', 'Cookie', 'Handlee', 'Gloria Hallelujah'];
  const FONT_SCRIPT = ['Mrs Saint Delafield', 'Allura', 'Great Vibes', 'Parisienne', 'Sacramento', 'Kristi', 'Birthstone', 'Fleur De Leah', 'Pinyon Script', 'Alex Brush', 'Tangerine', 'Italianno', 'Rouge Script', 'Monsieur La Doulaise', 'Herr Von Muellerhoff'];
  const BODY_FONTS = [...FONT_SIMPLE, ...FONT_HAND, ...FONT_SCRIPT], HEAD_FONTS = BODY_FONTS;
  const INKS = ['#4a2342', '#2b2430', '#2a3a63', '#7a1f3d', '#2f5a45', '#5b3a29'];
  const SEALS = { gold: 'Gold', wine: 'Wine', rose: 'Rose' };

  const blank = () => ({
    id: uid(), design: 'florals', dcol: '', env: 'cream', hide: [], by: '', updated: 0, from: '', date: todayISO(), chapter: 'Chapter 1', tag: 'A letter from my heart...', btn: 'Special for You',
    greet: '', body: [''], closing: '', sign: '', note: '', photo: '', cap: 'You & Me', floral: 'plum', paper: 'cream', ink: INKS[0],
    bodyFont: 'Covered By Your Grace', headFont: 'Mrs Saint Delafield', size: 100, psize: 100, plen: 100, ptape: true, tbs: [], px: null, py: null, prot: null, pover: false, seal: 'gold', mono: '', fav: false, replyTo: '', created: Date.now(), demo: false
  });
  const normTb = t => { t = t && typeof t === 'object' ? t : {}; return { id: /^[\w-]{3,24}$/.test(t.id || '') ? t.id : uid(), t: txt(t.t, 600), x: clamp(+t.x || 10, 0, 96), y: clamp(+t.y || 10, 0, 500), w: clamp(+t.w || 50, 12, 100), fs: clamp(Math.round(+t.fs || 100), 40, 300), f: pick(t.f, BODY_FONTS, 'Covered By Your Grace') }; };
  function normLetter(x) {
    const d = blank(); x = x && typeof x === 'object' ? x : {};
    const photo = typeof x.photo === 'string' && /^data:image\/(jpeg|png|webp|svg\+xml)[;,]/.test(x.photo) && x.photo.length < LIM.photoBytes * 1.4 ? x.photo : '';
    const body = (Array.isArray(x.body) ? x.body : [String(x.body || '')]).slice(0, LIM.paras).map(p => txt(p, LIM.paraLen));
    return {
      id: /^[\w-]{3,40}$/.test(x.id || '') ? x.id : d.id, from: txt(x.from, 40), date: parseISO(x.date) ? x.date : d.date, chapter: txt(x.chapter, 30) || 'Chapter 1',
      tag: txt(x.tag, 70), btn: txt(x.btn, 30) || 'Special for You', greet: txt(x.greet, 80), body: body.length ? body : [''], closing: txt(x.closing, 60), sign: txt(x.sign, 40), note: txt(x.note, 120),
      photo, cap: txt(x.cap, 40), floral: pick(x.floral, Object.keys(FLORALS), 'plum'), paper: pick(x.paper, Object.keys(PAPERS), 'cream'), ink: isHex(x.ink) ? x.ink : d.ink,
      bodyFont: pick(x.bodyFont, BODY_FONTS, d.bodyFont), headFont: pick(x.headFont, HEAD_FONTS, d.headFont), size: clamp(Math.round(+x.size || 100), 60, 170), psize: clamp(Math.round(+x.psize || 100), 40, 180), plen: clamp(Math.round(+x.plen || 100), 40, 240), ptape: x.ptape !== false, tbs: (Array.isArray(x.tbs) ? x.tbs : []).slice(0, 12).map(normTb), px: x.px == null || !isFinite(+x.px) ? null : clamp(+x.px, -20, 110), py: x.py == null || !isFinite(+x.py) ? null : clamp(+x.py, -20, 400), prot: x.prot == null || !isFinite(+x.prot) ? null : clamp(+x.prot, -45, 45), pover: !!x.pover,
      design: pick(x.design, Object.keys(LDESIGNS), 'florals'), dcol: isHex(x.dcol) ? x.dcol : '', env: pick(x.env, Object.keys(ENVS), 'cream'), hide: (Array.isArray(x.hide) ? x.hide : []).filter(k => LHIDE.some(a => a[0] === k)), by: txt(x.by, 80), updated: +x.updated || 0,
      seal: pick(x.seal, Object.keys(SEALS), 'gold'), mono: txt(x.mono, 2), fav: !!x.fav, replyTo: txt(x.replyTo, 40), created: +x.created || d.created, demo: !!x.demo
    };
  }
  function demoPhoto() {
    return 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 220"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6c5a9c"/><stop offset=".45" stop-color="#d98aa0"/><stop offset=".72" stop-color="#f6b98a"/><stop offset="1" stop-color="#7d4a62"/></linearGradient><radialGradient id="g"><stop offset="0" stop-color="#fff3c9"/><stop offset=".3" stop-color="#ffd48a" stop-opacity=".8"/><stop offset="1" stop-color="#ffd48a" stop-opacity="0"/></radialGradient></defs><rect width="300" height="220" fill="url(#s)"/><circle cx="150" cy="128" r="70" fill="url(#g)"/><circle cx="150" cy="128" r="14" fill="#fff0c4"/><path d="M0 140C50 128 90 142 150 136S250 128 300 142V220H0Z" fill="#5a3350" opacity=".85"/><g fill="#1f1228"><path d="M96 220V176C96 160 104 154 114 154C124 154 130 160 130 176V220Z"/><circle cx="113" cy="142" r="12"/><path d="M162 220V172C162 156 170 150 181 150C192 150 199 156 199 172V220Z"/><circle cx="181" cy="137" r="12"/><path d="M168 140C166 120 190 118 194 140L196 176H166Z"/></g><g fill="#fff" opacity=".35"><circle cx="40" cy="40" r="2"/><circle cx="250" cy="30" r="1.6"/><circle cx="220" cy="70" r="1.3"/><circle cx="70" cy="80" r="1.4"/></g></svg>`);
  }
  const demoLetter = () => normLetter({
    id: 'demo-1', demo: true, from: 'Ahsan', date: '2024-03-12', chapter: 'Chapter 1', tag: 'A letter from my heart...', btn: 'Special for You',
    greet: 'Meri Pyari,', body: ['Pata nahi yeh khat tum tak kab pohanche ga, lekin jo baatein main dil mein rakhta hoon, woh aaj lafzon mein likh raha hoon.',
      'Tum meri zindagi ka woh hissa ho jo sirf khushi nahi, sukoon bhi deta hai. Tumhare bina har cheez adhoori si lagti hai.',
      'Shayad main hamesha perfect alfaaz na dhoond paoon, lekin itna zaroor keh sakta hoon ke tum mere liye bohot khaas ho. Tumhari muskurahat, tumhari baatein, tumhara har chhota sa andaaz mere liye bohot mayami rakhta hai.',
      'Main chahta hoon ke hum hamesha aise hi saath rahein... har khushi, har mushkil, har kahani mein. Tum meri sirf mohabbat nahi, meri sabse pyaari dost bhi ho.'],
    closing: 'Always yours,', sign: 'Ahsan', note: 'Thanks for being a part of my story... ♡', photo: demoPhoto(), cap: 'You & Me', floral: 'plum', mono: 'A'
  });

  /* ---------- 3. STORAGE (backend ke baad sirf yeh hissa badlega) ---------- */
  const DB = {
    db: null, mem: {},
    async open() { try { this.db = await new Promise((res, rej) => { const r = indexedDB.open('olw_letters_v1', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); setTimeout(() => rej(new Error('timeout')), 3000); }); } catch (e) { this.db = null; } },
    get(k) { if (!this.db) return Promise.resolve(this.mem[k]); return new Promise(res => { try { const q = this.db.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result); q.onerror = () => res(undefined); } catch (e) { res(undefined); } }); },
    set(k, v) { if (!this.db) { this.mem[k] = v; return Promise.resolve(false); } return new Promise(res => { try { const t = this.db.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = () => res(true); t.onerror = () => res(false); t.onabort = () => res(false); } catch (e) { res(false); } }); }
  };
  const blankLook = () => ({ bg: { type: 'scene', scene: 'wine', c1: '#3a0b18', c2: '#8a2a4a', angle: 160, blur: 0, dim: 0, img: '' }, hide: [], updated: 0 });
  function normLook(x) {
    const d = blankLook(), b = (x && x.bg) || {}; x = x || {};
    const img = typeof b.img === 'string' && /^data:image\/(jpeg|png|webp);/.test(b.img) && b.img.length < 1.2e6 ? b.img : '';
    return { bg: { type: pick(b.type, ['scene', 'solid', 'gradient', 'photo'], 'scene'), scene: pick(b.scene, Object.keys(SCENES), 'wine'), c1: isHex(b.c1) ? b.c1 : d.bg.c1, c2: isHex(b.c2) ? b.c2 : d.bg.c2, angle: clamp(Math.round(+b.angle || 160), 0, 360), blur: clamp(Math.round(+b.blur || 0), 0, 24), dim: clamp(Math.round(+b.dim || 0), 0, 70), img },
      hide: (Array.isArray(x.hide) ? x.hide : []).filter(k => GHIDE.some(a => a[0] === k)), updated: +x.updated || 0 };
  }
  const lum = hex => { const p = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255); return .2126 * p[0] + .7152 * p[1] + .0722 * p[2]; };
  const S = { letters: [], idx: 0, view: 'mail', busy: false, filterFav: false, prefs: { from: '' }, look: blankLook() };
  const ED = { open: false, L: null, isNew: false, base: null, dirty: false };
  const real = () => S.letters.filter(l => !l.demo);
  const cur = () => (ED.open ? ED.L : S.letters[S.idx]);
  const saveLook = () => DB.set('look', S.look);
  const persist = async () => { const ok = await DB.set('letters', S.letters.filter(l => !l.demo)); if (!ok && DB.db) toast('Could not save. Please try again.'); };


  /* ---------- 4. ART (sab kuch code se bana hua: SVG) ---------- */
  const PAL = {
    plum: { p1: '#a8426d', p2: '#5c1238', pt: '#dfa2bb', core: '#e8b04a', leaf: '#8c9b68', leaf2: '#56683f', bud: '#b99ad3', stem: '#6d6a45' },
    lavender: { p1: '#a98ad6', p2: '#5f3f93', pt: '#e0d2f3', core: '#f2c85b', leaf: '#93a874', leaf2: '#5b7447', bud: '#d7b8e8', stem: '#6d7a52' },
    rose: { p1: '#ee9db5', p2: '#c4577a', pt: '#fde3ea', core: '#f4c25a', leaf: '#9db27c', leaf2: '#657f4b', bud: '#f6c5d4', stem: '#74805a' },
    sage: { p1: '#9fb384', p2: '#566f45', pt: '#dfe8cf', core: '#d9c27a', leaf: '#9db27c', leaf2: '#56703f', bud: '#c8d4b0', stem: '#6d7a52' }
  };
  const SEAL_PAL = { gold: ['#fbe7a0', '#d4a23c', '#8b5e14', '#6b4309'], wine: ['#c45a74', '#8a2640', '#531020', '#3a0816'], rose: ['#f8bccb', '#d8809a', '#9b4862', '#74314a'] };
  const ICONS = {
    back: '<path d="M19 12H5M11 5l-7 7 7 7"/>', dots: '<circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/>',
    heart: '<path d="M12 20.5C5 15.5 3 12 3 8.8 3 6.2 5 4.3 7.4 4.3c1.9 0 3.7 1 4.6 2.8.9-1.8 2.7-2.8 4.6-2.8C19 4.3 21 6.2 21 8.8c0 3.2-2 6.700-9 11.700z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2.2"/><path d="M3.500 7l8.500 6.200L20.500 7"/>', cal: '<rect x="3.500" y="5" width="17" height="15.500" rx="2.500"/><path d="M3.500 10h17M8 3v4M16 3v4M8 14h2M12 14h2M16 14h.1M8 17.500h2M12 17.500h2"/>',
    reply: '<path d="M10 7L4 12l6 5"/><path d="M4 12h10a6 6 0 016 6v1"/>', print: '<path d="M7 9V3.500h10V9"/><rect x="3.500" y="9" width="17" height="8" rx="2"/><path d="M7 14h10v6.500H7z"/>',
    share: '<path d="M12 15V3.500M7.500 8L12 3.500 16.500 8"/><path d="M5 12v7.500h14V12"/>', plus: '<path d="M12 5v14M5 12h14"/>', edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.500 6.500l4 4"/>',
    list: '<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r=".8"/><circle cx="4" cy="12" r=".8"/><circle cx="4" cy="18" r=".8"/>', trash: '<path d="M4 7h16M9 7V4h6v3M6.500 7l1 13h9l1-13"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>', left: '<path d="M15 5l-7 7 7 7"/>', right: '<path d="M9 5l7 7-7 7"/>', arrow: '<path d="M4 12h15M13 6l6 6-6 6"/>', img: '<rect x="3.500" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.600"/><path d="M4 17l5-4.500 4 3.500 3-2.500 4 3.500"/>',
    down: '<path d="M6 9l6 6 6-6"/>', up: '<path d="M6 15l6-6 6 6"/>', search: '<circle cx="11" cy="11" r="6.500"/><path d="M16 16l4.500 4.500"/>', brush: '<path d="M12 3a9 9 0 100 18c1.500 0 2-1 1.500-2.200-.6-1.300.3-2.300 1.700-2.300H17a4 4 0 004-4c0-5-4-9.500-9-9.500z"/><circle cx="7.500" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7.500" r="1"/>'.replace('d="','d="'), cloud: '<path d="M7 18a4.500 4.500 0 01-.6-8.900A6 6 0 0118 10a4 4 0 01-.5 8z"/>', download: '<path d="M12 4v11M7.500 11L12 15.500 16.500 11M5 20h14"/>', upload: '<path d="M12 16V5M7.500 9L12 4.500 16.500 9M5 20h14"/>'
  };
  const ico = (k, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k]}</svg>`;
  const hydrate = (root = document) => $$('[data-ico]', root).forEach(e => { if (!e.firstChild) e.innerHTML = ico(e.dataset.ico); });

  /* gradients / symbols jo sab SVG mein kaam aate hain (ek baar) */
  function globalDefs() {
    let d = '';
    for (const [k, P] of Object.entries(PAL)) {
      d += `<linearGradient id="pg-${k}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${P.p2}"/><stop offset=".5" stop-color="${P.p1}"/><stop offset="1" stop-color="${P.pt}"/></linearGradient>
      <linearGradient id="lg-${k}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${P.leaf2}"/><stop offset="1" stop-color="${P.leaf}"/></linearGradient>`;
    }
    for (const [k, c] of Object.entries(SEAL_PAL)) d += `<radialGradient id="sg-${k}" cx=".36" cy=".3" r=".85"><stop offset="0" stop-color="${c[0]}"/><stop offset=".45" stop-color="${c[1]}"/><stop offset=".85" stop-color="${c[2]}"/><stop offset="1" stop-color="${c[3]}"/></radialGradient>
      <linearGradient id="sh-${k}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset=".55" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[2]}"/></linearGradient>`;
    d += `<symbol id="gy" viewBox="-6 -6 12 12" overflow="visible"><g fill="#fffaf0" stroke="#d9c8a8" stroke-width=".25"><ellipse cx="0" cy="-3.100" rx="1.700" ry="2.600"/><ellipse cx="0" cy="-3.100" rx="1.700" ry="2.600" transform="rotate(72)"/><ellipse cx="0" cy="-3.100" rx="1.700" ry="2.600" transform="rotate(144)"/><ellipse cx="0" cy="-3.100" rx="1.700" ry="2.600" transform="rotate(216)"/><ellipse cx="0" cy="-3.100" rx="1.700" ry="2.600" transform="rotate(288)"/></g><circle r="1.250" fill="#c79a3e"/><circle r=".5" fill="#7a5418"/></symbol>
      <linearGradient id="gold-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0b8"/><stop offset=".45" stop-color="#d9aa4a"/><stop offset="1" stop-color="#8a5b14"/></linearGradient>
      <linearGradient id="pen-g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#12060d"/><stop offset=".3" stop-color="#4a2038"/><stop offset=".55" stop-color="#2a1020"/><stop offset="1" stop-color="#0d0409"/></linearGradient>
      <radialGradient id="lan-g" cx=".5" cy=".55" r=".6"><stop offset="0" stop-color="#fff3c8"/><stop offset=".4" stop-color="#ffc766"/><stop offset="1" stop-color="#c96a1a"/></radialGradient>
      <linearGradient id="petal-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a02444"/><stop offset=".6" stop-color="#6a1128"/><stop offset="1" stop-color="#3f0716"/></linearGradient>
      <filter id="b2" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2"/></filter><filter id="b4" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter>
      <filter id="paperTex" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" seed="4" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 .45  0 0 0 0 .33  0 0 0 0 .22  0 0 0 .55 -.2"/></filter>`;
    return `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${d}</defs></svg>`;
  }
  const SVG = (vb, inner, cls = '', extra = '') => `<svg class="${cls}" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" ${extra}>${inner}</svg>`;

  /* phool: 5 patti, gradient, nasen, stamens */
  function flower(k, sz, rot, seed) {
    const P = PAL[k], R = rng(seed); let s = '';
    for (let i = 0; i < 5; i++) {
      const a = i * 72 + (R() - .5) * 16, L = sz * (.92 + R() * .22), w = .5 + R() * .08;
      s += `<g transform="rotate(${f1(a)})"><path d="M0 0C${f1(-L * w)} ${f1(-L * .14)} ${f1(-L * (w + .08))} ${f1(-L * .84)} ${f1(-L * .1)} ${f1(-L * .97)}Q0 ${f1(-L * 1.04)} ${f1(L * .1)} ${f1(-L * .97)}C${f1(L * (w + .08))} ${f1(-L * .84)} ${f1(L * w)} ${f1(-L * .14)} 0 0Z" fill="url(#pg-${k})" stroke="${P.p2}" stroke-opacity=".4" stroke-width=".5"/><path d="M0 ${f1(-L * .14)}Q${f1(-L * .06)} ${f1(-L * .5)} 0 ${f1(-L * .78)}" stroke="${P.p2}" stroke-opacity=".3" stroke-width=".55" fill="none"/><path d="M${f1(-L * .16)} ${f1(-L * .3)}Q${f1(-L * .22)} ${f1(-L * .55)} ${f1(-L * .12)} ${f1(-L * .75)}M${f1(L * .16)} ${f1(-L * .3)}Q${f1(L * .22)} ${f1(-L * .55)} ${f1(L * .12)} ${f1(-L * .75)}" stroke="${P.p2}" stroke-opacity=".16" stroke-width=".45" fill="none"/></g>`;
    }
    s += `<circle r="${f1(sz * .2)}" fill="${P.p2}" opacity=".55"/><circle r="${f1(sz * .13)}" fill="${P.core}"/>`;
    for (let i = 0; i < 9; i++) { const a = R() * 6.283, r = sz * (.16 + R() * .12); s += `<circle cx="${f1(Math.cos(a) * r)}" cy="${f1(Math.sin(a) * r)}" r="${f1(sz * .035 + .35)}" fill="${i % 3 ? '#f7e3a1' : '#8a5a1a'}"/>`; }
    return `<g transform="rotate(${rot})">${s}</g>`;
  }
  const leaf = (k, len) => `<path d="M0 0C${f1(len * .38)} ${f1(-len * .16)} ${f1(len * .62)} ${f1(-len * .1)} ${f1(len)} 0C${f1(len * .62)} ${f1(len * .12)} ${f1(len * .36)} ${f1(len * .16)} 0 0Z" fill="url(#lg-${k})" stroke="${PAL[k].leaf2}" stroke-opacity=".5" stroke-width=".4"/><path d="M${f1(len * .06)} 0Q${f1(len * .5)} ${f1(-len * .015)} ${f1(len * .92)} 0" stroke="#fff" stroke-opacity=".35" stroke-width=".4" fill="none"/>`;
  const cub = (p, t) => { const u = 1 - t; return [u * u * u * p[0] + 3 * u * u * t * p[2] + 3 * u * t * t * p[4] + t * t * t * p[6], u * u * u * p[1] + 3 * u * u * t * p[3] + 3 * u * t * t * p[5] + t * t * t * p[7]]; };
  const cubAng = (p, t) => { const a = cub(p, Math.max(0, t - .02)), b = cub(p, Math.min(1, t + .02)); return Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI; };

  /* kone ka phool-guccha (top-left kone se andar ki taraf) */
  function cornerFloral(k, seed, density = 1) {
    if (k === 'none') return '';
    const P = PAL[k], R = rng(seed), big = k !== 'sage';
    const stems = [[-10, 14, 50, 6, 100, 40, 205, 34], [14, -10, 6, 52, 40, 105, 32, 205], [-6, -6, 36, 28, 82, 66, 128, 128]];
    let wash = '', st = '', lv = '', fl = '', bd = '';
    wash += `<ellipse cx="60" cy="60" rx="70" ry="64" fill="${P.p1}" opacity=".09" filter="url(#b4)"/>`;
    stems.forEach((p, si) => {
      st += `<path d="M${p[0]} ${p[1]}C${p[2]} ${p[3]} ${p[4]} ${p[5]} ${p[6]} ${p[7]}" stroke="${P.stem}" stroke-width="1.15" fill="none" stroke-linecap="round"/>`;
      const ts = [.14, .26, .38, .5, .62, .74, .86];
      ts.forEach((t, i) => { if (R() < .1) return; const [x, y] = cub(p, t), a = cubAng(p, t), side = i % 2 ? 1 : -1, ang = a + side * (46 + R() * 22), len = (13 + R() * 9) * (si === 2 ? 1.1 : 1) * density;
        lv += `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(ang)})">${leaf(k, len)}</g>`;
        if (R() < .42) { const bx = Math.cos((ang + side * 20) * Math.PI / 180) * len * 1.05, by = Math.sin((ang + side * 20) * Math.PI / 180) * len * 1.05;
          bd += `<path d="M${f1(x)} ${f1(y)}Q${f1(x + bx * .5)} ${f1(y + by * .5 - 2)} ${f1(x + bx)} ${f1(y + by)}" stroke="${P.stem}" stroke-width=".6" fill="none"/><circle cx="${f1(x + bx)}" cy="${f1(y + by)}" r="${f1(1.6 + R() * 1.3)}" fill="${P.bud}" stroke="${P.p2}" stroke-opacity=".35" stroke-width=".3"/>`; } });
    });
    if (big) {
      const spots = [[2, .5, 25], [0, .66, 16], [1, .6, 20], [2, .82, 12.500], [1, .28, 11.500], [0, .3, 10]];
      spots.forEach(([si, t, sz], i) => { const [x, y] = cub(stems[si], t); fl += `<g transform="translate(${f1(x)} ${f1(y)})"><ellipse cx="1.500" cy="2.500" rx="${sz * .8}" ry="${sz * .5}" fill="#3a1020" opacity=".16" filter="url(#b2)"/>${flower(k, sz, R() * 360, seed + i * 7)}</g>`; });
    } else {
      [[0, .5], [1, .6], [2, .6], [2, .85]].forEach(([si, t]) => { const [x, y] = cub(stems[si], t), a = cubAng(stems[si], t); lv += `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(a - 30)})">${leaf(k, 22)}</g>`; });
    }
    for (let i = 0; i < 16; i++) { const si = i % 3, t = .12 + R() * .84, [x, y] = cub(stems[si], t); bd += `<circle cx="${f1(x + (R() - .5) * 18)}" cy="${f1(y + (R() - .5) * 18)}" r="${f1(1 + R() * 1.4)}" fill="${i % 2 ? P.bud : P.pt}" opacity=".9"/>`; }
    return SVG('0 0 210 210', wash + st + lv + bd + fl, 'flor');
  }

  /* gypsophila (baby's breath) guccha */
  function gypsy(seed, w = 300, hh = 300) {
    const R = rng(seed); let st = '', fl = '';
    (function br(x, y, ang, len, d) {
      if (d > 5 || len < 6) return;
      const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len, mx = (x + x2) / 2 + (R() - .5) * len * .25, my = (y + y2) / 2 + (R() - .5) * len * .25;
      st += `<path d="M${f1(x)} ${f1(y)}Q${f1(mx)} ${f1(my)} ${f1(x2)} ${f1(y2)}" stroke="#8b7a55" stroke-width="${f1(Math.max(.35, 1.5 - d * .28))}" fill="none" stroke-linecap="round" opacity=".85"/>`;
      if (d >= 3) { const s = 1.2 + R() * 1.1; fl += `<use href="#gy" x="${f1(x2 - 6 * s)}" y="${f1(y2 - 6 * s)}" width="${f1(12 * s)}" height="${f1(12 * s)}" transform="rotate(${f1(R() * 72)} ${f1(x2)} ${f1(y2)})"/>`; if (R() < .5) fl += `<use href="#gy" x="${f1(mx - 3.5)}" y="${f1(my - 3.5)}" width="7" height="7"/>`; }
      const n = d < 2 ? 3 : 2;
      for (let i = 0; i < n; i++) br(x2, y2, ang + (R() - .5) * 1.2 + (i - (n - 1) / 2) * .5, len * (.62 + R() * .16), d + 1);
    })(0, hh * .35, .1, w * .32, 0);
    (function br2(x, y, ang, len, d) { if (d > 4 || len < 6) return; const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len; st += `<path d="M${f1(x)} ${f1(y)}L${f1(x2)} ${f1(y2)}" stroke="#8b7a55" stroke-width="${f1(Math.max(.35, 1.3 - d * .28))}" opacity=".8"/>`; if (d >= 2) fl += `<use href="#gy" x="${f1(x2 - 6)}" y="${f1(y2 - 6)}" width="12" height="12"/>`; for (let i = 0; i < 2; i++) br2(x2, y2, ang + (i ? .55 : -.55) + (R() - .5) * .4, len * .68, d + 1); })(0, hh * .62, .55, w * .3, 0);
    return SVG(`0 0 ${w} ${hh}`, st + fl, 'gyp');
  }
  const petalSVG = (seed) => { const R = rng(seed), s = 24 + R() * 14; return SVG('0 0 40 36', `<g transform="rotate(${f1(R() * 360)} 20 18)"><path d="M3 18C3 6 18 2 30 8C38 12 38 26 26 31C14 36 3 30 3 18Z" fill="url(#petal-g)"/><path d="M6 18Q20 16 34 20" stroke="#fff" stroke-opacity=".16" fill="none" stroke-width=".8"/><path d="M8 11Q18 8 28 11" stroke="#ff9aa8" stroke-opacity=".28" fill="none" stroke-width="1.6" stroke-linecap="round"/></g>`, 'ptl', `style="width:${f1(s)}px"`); };

  /* wax seal */
  function sealSVG(kind, mono, seed) {
    const c = SEAL_PAL[kind] || SEAL_PAL.gold, R = rng(seed), n = 22, pts = [];
    for (let i = 0; i < n; i++) { const a = i / n * 6.2832, r = 44 + (R() - .5) * 4.5 + (i % 2 ? 1.5 : -1); pts.push([50 + Math.cos(a) * r, 50 + Math.sin(a) * r]); }
    let d = ''; pts.forEach((p, i) => { const q = pts[(i + 1) % n], m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; d += i ? `Q${f1(p[0])} ${f1(p[1])} ${f1(m[0])} ${f1(m[1])}` : `M${f1(m[0])} ${f1(m[1])}`; });
    const m0 = pts[0], mm = [(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2]; d += `Q${f1(m0[0])} ${f1(m0[1])} ${f1(mm[0])} ${f1(mm[1])}Z`;
    const heart = 'M50 71C32 58 27 49 27 41C27 34 32 30 38 30C43 30 47 33 50 38C53 33 57 30 62 30C68 30 73 34 73 41C73 49 68 58 50 71Z';
    return SVG('0 0 100 100', `<path d="${d}" transform="translate(1.500 3)" fill="#1a0408" opacity=".42" filter="url(#b2)"/><path d="${d}" fill="url(#sg-${kind})"/><path d="${d}" fill="none" stroke="${c[3]}" stroke-opacity=".45" stroke-width="1"/>
      <circle cx="50" cy="50" r="34" fill="none" stroke="${c[3]}" stroke-opacity=".55" stroke-width="1.6"/><circle cx="50" cy="50" r="34" fill="none" stroke="${c[0]}" stroke-opacity=".5" stroke-width=".8" transform="translate(.7 .7)"/>
      <path d="${heart}" fill="${c[3]}" opacity=".6" transform="translate(1.400 1.600)"/><path d="${heart}" fill="url(#sh-${kind})" stroke="${c[0]}" stroke-opacity=".7" stroke-width=".8"/><path d="M33 38C35 33 41 32 45 37" stroke="#fff" stroke-opacity=".6" stroke-width="1.600" fill="none" stroke-linecap="round"/>
      ${mono ? `<text x="50" y="56" text-anchor="middle" font-family="Allura,cursive" font-size="21" fill="${c[3]}" opacity=".85" transform="translate(.6 .7)">${mono.replace(/[<>&]/g, '')}</text><text x="50" y="56" text-anchor="middle" font-family="Allura,cursive" font-size="21" fill="${c[0]}" opacity=".9">${mono.replace(/[<>&]/g, '')}</text>` : ''}
      <ellipse cx="34" cy="26" rx="14" ry="6" fill="#fff" opacity=".28" transform="rotate(-28 34 26)" filter="url(#b2)"/>`, 'seal');
  }
  const lanternSVG = () => SVG('0 0 100 170', `<ellipse cx="50" cy="90" rx="46" ry="62" fill="#ffb84a" opacity=".38" filter="url(#b4)"/><circle cx="50" cy="8" r="6" fill="none" stroke="url(#gold-g)" stroke-width="2.600"/><path d="M50 14V22" stroke="url(#gold-g)" stroke-width="2.600"/>
    <path d="M16 46Q50 6 84 46Z" fill="url(#gold-g)"/><path d="M26 44Q50 18 74 44" stroke="#fff" stroke-opacity=".35" fill="none" stroke-width="1.200"/><rect x="18" y="46" width="64" height="94" rx="3" fill="url(#lan-g)"/>
    <g fill="#7a3d0a" opacity=".7">${Array.from({ length: 28 }, (_, i) => `<circle cx="${30 + (i % 4) * 13.5}" cy="${58 + Math.floor(i / 4) * 11.5}" r="2.100"/>`).join('')}</g>
    <g stroke="url(#gold-g)" stroke-width="3.400" fill="none"><path d="M18 46V140M82 46V140M50 46V140" stroke-width="2.400"/><path d="M16 46H84M16 140H84" stroke-width="4"/></g><path d="M12 140H88L82 156H18Z" fill="url(#gold-g)"/><path d="M20 148H80" stroke="#6b4309" stroke-opacity=".4"/>`, 'lantern');
  const penSVG = () => SVG('0 0 60 400', `<ellipse cx="34" cy="200" rx="22" ry="190" fill="#000" opacity=".28" filter="url(#b4)"/><path d="M18 20Q30 0 42 20V190H18Z" fill="url(#pen-g)"/><rect x="16" y="150" width="28" height="40" rx="2" fill="url(#gold-g)"/><rect x="16" y="150" width="28" height="4" fill="#fff" opacity=".4"/><rect x="18" y="120" width="24" height="4" fill="url(#gold-g)"/><rect x="18" y="190" width="24" height="250" fill="url(#pen-g)"/><path d="M24 24V180" stroke="#fff" stroke-opacity=".22" stroke-width="3" stroke-linecap="round"/><path d="M18 190H42L36 245L30 262L24 245Z" fill="url(#gold-g)"/><path d="M30 215V262" stroke="#5d3a08" stroke-width="1"/><circle cx="30" cy="212" r="2" fill="#5d3a08"/>`, 'pen');
  const laurel = (flip) => SVG('0 0 140 90', `<g transform="${flip ? 'translate(140 0) scale(-1 1)' : ''}"><path d="M8 80C30 78 70 60 126 12" stroke="#e8c4cc" stroke-width="1.300" fill="none" stroke-linecap="round"/>${[[22, 74, -35], [38, 68, -52], [54, 60, -40], [70, 50, -58], [88, 38, -44], [104, 26, -60], [34, 70, 40], [52, 62, 28], [72, 52, 42], [92, 40, 34]].map(([x, y, a]) => `<path transform="translate(${x} ${y}) rotate(${a})" d="M0 0C5 -3 10 -3 14 0C10 3 5 3 0 0Z" fill="#efd3da" opacity=".9"/>`).join('')}${[[46, 52], [78, 34], [112, 20], [18, 66]].map(([x, y], i) => `<g transform="translate(${x} ${y})"><circle r="3.200" fill="#f9e6ea"/><circle r="1.200" fill="#d9a04a"/></g>`).join('')}<path d="M118 20Q124 4 132 8" stroke="#e8c4cc" fill="none" stroke-width=".9"/><circle cx="133" cy="8" r="2.500" fill="#f9e6ea"/></g>`, 'laurel');
  const divider = (col = 'currentColor') => SVG('0 0 300 22', `<g stroke="${col}" stroke-width="1" fill="none" stroke-linecap="round"><path d="M8 11H128"/><path d="M172 11H292"/></g><g fill="${col}"><circle cx="8" cy="11" r="2.300"/><circle cx="292" cy="11" r="2.300"/><path d="M150 18C141 12 138 9 138 6.500C138 4 140 2.500 142.500 2.500C145 2.500 148 4 150 7C152 4 155 2.500 157.500 2.500C160 2.500 162 4 162 6.500C162 9 159 12 150 18Z"/></g>`, 'divi');
  const underline = (cls = '') => SVG('0 0 300 14', '<path d="M2 9C60 3 150 12 298 3C170 10 80 9 2 9Z" fill="currentColor" opacity=".85"/>', 'ul ' + cls, 'preserveAspectRatio="none"');
  const tinyHeart = '<svg class="th" viewBox="0 0 24 22" aria-hidden="true"><path d="M12 20C5 14.500 2 11 2 7.800 2 5 4 3 6.600 3c2.200 0 4.200 1.200 5.400 3.200C13.200 4.200 15.200 3 17.400 3 20 3 22 5 22 7.800c0 3.200-3 6.700-10 12.200z" fill="none" stroke="currentColor" stroke-width="1.700" stroke-linejoin="round"/></svg>';

  /* ---------- 5. ENVELOPE ---------- */
  function envelopeEl(L) {
    const seed = hashStr(L.id), P = PAL[L.floral === 'none' ? 'plum' : L.floral];
    const EN = ENVS[L.env] || ENVS.cream, dk = mixHex(EN[2], '#000000', .22);
    const el = h('div', { class: 'ev', 'data-hide': (L.hide || []).join(' ') });
    const paperGrad = `<linearGradient id="evg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${EN[0]}"/><stop offset=".55" stop-color="${EN[1]}"/><stop offset="1" stop-color="${EN[2]}"/></linearGradient>`;
    el.innerHTML = `<div class="ev-ground"></div><div class="ev-body">
      ${SVG('0 0 520 360', `<defs>${paperGrad}</defs><rect width="520" height="360" rx="7" fill="${mixHex(EN[2], '#8a5a5a', .3)}"/><rect x="0" y="0" width="520" height="360" rx="7" fill="${mixHex(EN[1], '#c0807a', .3)}" opacity=".7"/>`, 'ev-back')}
      <div class="ev-card"><i></i><i></i><i></i><i></i><b></b></div>
      ${SVG('0 0 520 360', `<defs>${paperGrad}<linearGradient id="evL" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#b79680" stop-opacity=".34"/><stop offset="1" stop-color="#b79680" stop-opacity="0"/></linearGradient><linearGradient id="evR" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#b79680" stop-opacity=".34"/><stop offset="1" stop-color="#b79680" stop-opacity="0"/></linearGradient><linearGradient id="evB" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#9a7c68" stop-opacity=".3"/><stop offset="1" stop-color="#9a7c68" stop-opacity="0"/></linearGradient></defs>
        <rect width="520" height="360" rx="7" fill="url(#evg)"/><rect width="520" height="360" rx="7" fill="#fff" opacity=".2" filter="url(#paperTex)"/>
        <path d="M0 0L262 196L0 360Z" fill="url(#evL)"/><path d="M520 0L258 196L520 360Z" fill="url(#evR)"/><path d="M0 360L260 190L520 360Z" fill="url(#evB)"/>
        <path d="M0 360L260 192L520 360" stroke="${dk}" stroke-width="1.600" fill="none"/><path d="M0 357L260 189L520 357" stroke="#fff" stroke-opacity=".7" stroke-width="1" fill="none"/>
        <path d="M0 2L262 196" stroke="${dk}" stroke-width="1" opacity=".55" fill="none"/><path d="M520 2L258 196" stroke="${dk}" stroke-width="1" opacity=".55" fill="none"/>
        <rect x=".5" y=".5" width="519" height="359" rx="6.500" fill="none" stroke="#fff" stroke-opacity=".5"/>`, 'ev-front')}
      <div class="ev-flor bl" style="color:${P.p2}">${cornerFloral(L.floral, seed + 3, 1)}</div>
      <div class="ev-flap"><div class="face f">${SVG('0 0 520 210', `<defs><linearGradient id="fg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mixHex(EN[0], '#ffffff', .35)}"/><stop offset=".7" stop-color="${EN[0]}"/><stop offset="1" stop-color="${EN[1]}"/></linearGradient></defs><path d="M0 0H520L270 196Q260 205 250 196Z" fill="#4a1a1a" opacity=".3" transform="translate(0 6)" filter="url(#b4)"/><path d="M0 0H520L270 196Q260 205 250 196Z" fill="url(#fg)"/><path d="M0 0H520L270 196Q260 205 250 196Z" fill="#fff" opacity=".22" filter="url(#paperTex)"/><path d="M6 3L256 196M514 3L264 196" stroke="#fff" stroke-opacity=".5" fill="none"/><path d="M0 0H520L270 196Q260 205 250 196Z" fill="none" stroke="${dk}" stroke-width="1.300"/>`, '')}<div class="ev-flor tr" style="color:${P.p2}">${cornerFloral(L.floral, seed + 11, .9)}</div></div>
        <div class="face b">${SVG('0 0 520 210', `<defs><pattern id="diam" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0H14" stroke="#c88b94" stroke-opacity=".35"/><path d="M0 0V14" stroke="#c88b94" stroke-opacity=".35"/></pattern></defs><path d="M0 0H520L270 196Q260 205 250 196Z" fill="#e8c3c4"/><path d="M0 0H520L270 196Q260 205 250 196Z" fill="url(#diam)"/><path d="M0 0H520L270 196Q260 205 250 196Z" fill="none" stroke="#b98086" stroke-width="1.200"/>`, '')}</div></div>
      <div class="ev-seal">${sealSVG(L.seal, (L.mono || (L.from || '').trim().charAt(0)).toUpperCase(), seed)}</div>
    </div>`;
    return el;
  }


  /* ---------- 5b. LETTER PAGE DESIGNS (har letter ka apna design) ---------- */
  const accent = L => { const a = isHex(L.dcol) ? L.dcol : (DEF_DCOL[L.design] || '#b8456f'); return { a, l: mixHex(a, '#ffffff', .66), d: mixHex(a, '#000000', .42), m: mixHex(a, '#ffffff', .32) }; };
  const dp = (inner, css, cls = '') => h('div', { class: 'dp ' + cls, style: css, html: inner });
  const bowSVG = A => SVG('0 0 80 62', `<path d="M38 33L22 59L34 52L40 61L44 36Z" fill="${A.d}"/><path d="M42 33L58 59L46 52L40 61L36 36Z" fill="${A.a}"/><path d="M40 31C28 8 5 6 3 24C1 42 26 46 40 31Z" fill="${A.a}"/><path d="M40 31C52 8 75 6 77 24C79 42 54 46 40 31Z" fill="${A.a}"/><path d="M40 31C30 16 14 14 11 24C9 34 28 38 40 31Z" fill="${A.m}" opacity=".7"/><path d="M40 31C50 16 66 14 69 24C71 34 52 38 40 31Z" fill="${A.m}" opacity=".7"/><path d="M12 22C20 16 30 20 36 28M68 22C60 16 50 20 44 28" stroke="#fff" stroke-opacity=".5" fill="none" stroke-width="1"/><ellipse cx="40" cy="32" rx="6.500" ry="6" fill="${A.d}"/><ellipse cx="38.500" cy="30" rx="2.500" ry="1.800" fill="#fff" opacity=".4"/>`, 'bow');
  const goldCorner = A => SVG('0 0 60 60', `<g fill="none" stroke="${A.a}" stroke-width="1.700" stroke-linecap="round"><path d="M4 58V20C4 11 11 4 20 4H58"/><path d="M10 58V26C10 17 17 10 26 10H58" stroke-width=".8"/><path d="M18 18C28 18 31 26 26 31C21 36 13 32 16 26"/></g><g fill="${A.a}"><path d="M30 4l3 3-3 3-3-3zM4 30l3 3-3 3-3-3z"/><circle cx="16" cy="16" r="2.200"/></g>`);
  const laceStrip = A => { let sc = ''; for (let i = 0; i < 20; i++) sc += `<path d="M${i * 20} 14a10 10 0 0 0 20 0Z" fill="#fffdf8" stroke="${A.m}" stroke-width="1"/><circle cx="${i * 20 + 10}" cy="9" r="2.300" fill="none" stroke="${A.m}" stroke-width=".9"/><path d="M${i * 20 + 5} 20q5 5 10 0" stroke="${A.m}" stroke-width=".7" fill="none"/>`; return SVG('0 0 400 36', `<rect width="400" height="14" fill="#fffdf8"/><path d="M0 4H400" stroke="${A.m}" stroke-width=".8" stroke-dasharray="3 3"/>${sc}`, 'lace'); };
  const heartTile = A => svgURL(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 22"><path d="M12 20C4 14 1 10 1 6.400C1 3 3.600 1 6.400 1C8.800 1 11 2.600 12 5C13 2.600 15.200 1 17.600 1C20.400 1 23 3 23 6.400C23 10 20 14 12 20Z" fill="${A.a}" fill-opacity=".85" stroke="${A.d}" stroke-opacity=".5"/><path d="M6 6Q8 4 10 6" stroke="#fff" stroke-opacity=".6" fill="none"/></svg>`);
  const stampSVG = A => { let pf = ''; for (let i = 0; i < 9; i++) pf += `<circle cx="${3 + i * 6.750}" cy="0" r="2.200" fill="#f7efe3"/><circle cx="${3 + i * 6.750}" cy="76" r="2.200" fill="#f7efe3"/>`; for (let i = 0; i < 11; i++) pf += `<circle cx="0" cy="${3 + i * 6.600}" r="2.200" fill="#f7efe3"/><circle cx="60" cy="${3 + i * 6.600}" r="2.200" fill="#f7efe3"/>`; return SVG('-2 -2 64 80', `<rect width="60" height="76" fill="#fffdf6" stroke="#d9c8b0" stroke-width=".6"/>${pf}<rect x="6" y="6" width="48" height="52" fill="${A.l}" stroke="${A.a}" stroke-width=".8"/><path d="M30 46C20 38 16 33 16 28.500C16 24 19.500 21 23.500 21C26.500 21 29 23 30 26C31 23 33.500 21 36.500 21C40.500 21 44 24 44 28.500C44 33 40 38 30 46Z" fill="${A.a}"/><text x="30" y="68" text-anchor="middle" font-family="Georgia,serif" font-size="7" fill="${A.d}" letter-spacing="1">LOVE</text>`, 'stamp'); };
  const postmark = A => SVG('0 0 130 60', `<g fill="none" stroke="${A.d}" stroke-width="1.100" opacity=".62"><circle cx="30" cy="30" r="24"/><circle cx="30" cy="30" r="19"/><path d="M62 18q8-6 16 0t16 0t16 0M62 30q8-6 16 0t16 0t16 0M62 42q8-6 16 0t16 0t16 0"/></g><text x="30" y="27" text-anchor="middle" font-family="Georgia,serif" font-size="7" fill="${A.d}" opacity=".7" letter-spacing="1">AIR MAIL</text><text x="30" y="38" text-anchor="middle" font-family="Georgia,serif" font-size="6" fill="${A.d}" opacity=".7">WITH LOVE</text>`, 'pm');
  const sparkle = (x, y, s, o = 1) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -10C1 -3 3 -1 10 0C3 1 1 3 0 10C-1 3 -3 1 -10 0C-3 -1 -1 -3 0 -10Z" fill="url(#gold-g)" opacity="${o}"/>`;
  const vineSeg = (fp, seed, flip) => { const R = rng(seed), P = PAL[fp]; let st = '', lv = '', fl = ''; const pts = []; for (let i = 0; i <= 10; i++) pts.push([30 + Math.sin(i * .9 + R()) * 9, i * 26]); st = `<path d="M${pts.map(p => p.map(f1).join(' ')).join('L')}" stroke="${P.stem}" stroke-width="1.200" fill="none" stroke-linejoin="round"/>`;
    pts.forEach((p, i) => { if (!i) return; const side = i % 2 ? 1 : -1; lv += `<g transform="translate(${f1(p[0])} ${f1(p[1])}) rotate(${side > 0 ? -25 : 205}) scale(${f1(.5 + R() * .35)})">${leaf(fp, 28)}</g>`; });
    [2, 5, 8].forEach((i, k) => { fl += `<g transform="translate(${f1(pts[i][0] + (k % 2 ? 9 : -9))} ${f1(pts[i][1] + 8)})">${flower(fp, 8 + R() * 3, R() * 360, seed + k)}</g>`; });
    return SVG('0 0 60 260', st + lv + fl, 'vseg' + (flip ? ' flip' : '')); };
  const swoosh = (A, k) => SVG('0 0 100 100', `<g transform="scale(${k})"><path d="M0 0H88C58 10 24 34 0 80Z" fill="${A.a}"/><path d="M0 0H88C58 10 24 34 0 80Z" fill="url(#gold-g)" opacity=".12"/><path d="M94 0C64 12 28 38 0 88" fill="none" stroke="url(#gold-g)" stroke-width="1.5" stroke-linecap="round"/><path d="M100 0C70 14 32 42 0 96" fill="none" stroke="url(#gold-g)" stroke-width=".6" stroke-linecap="round"/></g>`);
  const goldLines = (A, up) => SVG('0 0 100 100', `<g fill="none" stroke="url(#gold-g)" stroke-linecap="round"><path d="M100 4C78 10 56 26 34 56" stroke-width="1.6"/><path d="M100 14C82 20 64 34 46 58" stroke-width=".9"/><path d="M100 26C86 30 72 40 58 58" stroke-width=".5"/></g>`);
  function designEl(L) {
    const key = L.design; if (!key || key === 'florals' || !LDESIGNS[key]) return null;
    const A = accent(L), seed = hashStr(L.id + key), R = rng(seed), fp = L.floral === 'none' ? 'rose' : L.floral;
    const el = h('div', { class: 'ds ds-' + key, style: `--da:${A.a};--dl:${A.l};--dd:${A.d}` }); const add = (...c) => c.forEach(x => el.append(x));
    switch (key) {
      case 'minimal':
        add(h('i', { class: 'mn', style: `border-color:${A.a}` }), h('i', { class: 'mn m2', style: `border-color:${A.l}` }), dp(SVG('0 0 24 22', `<path d="M12 20C4 14 1 10 1 6.500A5 5 0 0 1 12 4.500A5 5 0 0 1 23 6.500C23 10 20 14 12 20Z" fill="${A.a}"/>`), 'left:50%;top:1.2cqw;width:5cqw;margin-left:-2.5cqw'));
        break;
      case 'linen': {
        const cr = `<path d="M2 26V8Q2 2 8 2H26" fill="none" stroke="${A.a}" stroke-width="1.200" stroke-linecap="round"/><path d="M7 26V12Q7 7 12 7H26" fill="none" stroke="${A.l}" stroke-width=".8" stroke-linecap="round"/><circle cx="2" cy="2" r="1.400" fill="${A.a}"/>`;
        add(dp(SVG('0 0 28 28', cr), 'left:3cqw;top:3cqw;width:15cqw'), dp(SVG('0 0 28 28', cr), 'right:3cqw;top:3cqw;width:15cqw;transform:scaleX(-1)'), dp(SVG('0 0 28 28', cr), 'left:3cqw;bottom:3cqw;width:15cqw;transform:scaleY(-1)'), dp(SVG('0 0 28 28', cr), 'right:3cqw;bottom:3cqw;width:15cqw;transform:scale(-1)'), h('i', { class: 'ln' }));
        break;
      }
      case 'pastel': {
        let dots = ''; for (let i = 0; i < 26; i++) dots += `<circle cx="${f1(R() * 100)}" cy="${f1(R() * 22)}" r="${f1(.5 + R() * 1.4)}" fill="${i % 2 ? A.a : '#fff'}" opacity="${f1(.35 + R() * .45)}"/>`;
        add(dp(SVG('0 0 100 24', `<path d="M0 0H100V12C80 20 62 8 44 14S12 20 0 12Z" fill="${A.l}"/><path d="M0 0H100V6C76 14 56 3 38 8S10 14 0 7Z" fill="${A.a}" opacity=".5"/>${dots}`), 'left:0;top:0;width:100cqw'), dp(SVG('0 0 100 24', `<path d="M0 24H100V12C80 4 62 16 44 10S12 4 0 12Z" fill="${A.l}"/><path d="M0 24H100V18C76 10 56 21 38 16S10 10 0 17Z" fill="${A.a}" opacity=".5"/>${dots}`), 'left:0;bottom:0;width:100cqw'));
        break;
      }
      case 'sprig': {
        const lf = (x, y, r, k) => `<path transform="translate(${x} ${y}) rotate(${r}) scale(${k})" d="M0 0C6 -7 16 -7 22 0C16 7 6 7 0 0Z" fill="${A.a}" opacity=".85"/>`;
        let g = `<path d="M4 4C20 20 34 38 46 62" stroke="${A.d}" stroke-width="1.100" fill="none" stroke-linecap="round"/>`;
        [[10, 10, 20], [18, 20, 70], [20, 18, -10], [28, 32, 78], [30, 30, 5], [38, 46, 84], [38, 44, 18]].forEach(([x, y, r], i) => { g += lf(x, y, r, .55 + (i % 3) * .12); });
        const S1 = SVG('0 0 60 70', g);
        add(dp(S1, 'left:2cqw;top:2cqw;width:24cqw'), dp(S1, 'right:2cqw;bottom:2cqw;width:24cqw;transform:rotate(180deg)'), dp(SVG('0 0 60 70', g + `<circle cx="46" cy="62" r="2" fill="${A.m}"/>`), 'right:2cqw;top:2cqw;width:15cqw;transform:scaleX(-1);opacity:.6'), dp(S1, 'left:2cqw;bottom:2cqw;width:15cqw;transform:scaleY(-1);opacity:.6'));
        break;
      }
      case 'modern':
        add(h('i', { class: 'mb', style: `background:${A.a}` }), h('i', { class: 'mb t', style: `background:${A.l}` }), h('i', { class: 'mb h', style: `background:${A.a}` }));
        break;
      case 'moon': {
        let s = ''; for (let i = 0; i < 14; i++) s += sparkle(f1(R() * 100), f1(R() * 128), f1(.18 + R() * .3), f1(.35 + R() * .5));
        add(dp(SVG('0 0 100 130', s, 'sky'), 'left:0;top:0;width:100cqw;height:130cqw'), dp(SVG('0 0 60 50', `<path d="M36 4a22 22 0 1 0 18 34A18 18 0 1 1 36 4Z" fill="${A.a}"/>`), 'right:8cqw;top:6cqw;width:13cqw;transform:rotate(8deg)'), h('i', { class: 'mo' }));
        break;
      }
      case 'roses':
        add(h('i', { class: 'wc', style: `right:-10cqw;bottom:-6cqw;width:70cqw;height:70cqw;background:radial-gradient(closest-side,${A.l}aa,transparent)` }),
          dp(cornerFloral(fp, seed + 1, 1.25), 'left:-2cqw;top:-2cqw;width:52cqw'), dp(cornerFloral(fp, seed + 2, 1.35), 'right:-2cqw;bottom:-2cqw;width:64cqw;transform:scale(-1)'), dp(cornerFloral(fp, seed + 3, 1), 'left:-2cqw;bottom:-2cqw;width:36cqw;transform:scaleY(-1)'), dp(cornerFloral(fp, seed + 4, .9), 'right:-2cqw;top:-2cqw;width:30cqw;transform:scaleX(-1)'));
        break;
      case 'gold':
        add(h('i', { class: 'gb1' }), h('i', { class: 'gb2' }), dp(goldCorner(A), 'left:2cqw;top:2cqw;width:14cqw'), dp(goldCorner(A), 'right:2cqw;top:2cqw;width:14cqw;transform:scaleX(-1)'), dp(goldCorner(A), 'left:2cqw;bottom:2cqw;width:14cqw;transform:scaleY(-1)'), dp(goldCorner(A), 'right:2cqw;bottom:2cqw;width:14cqw;transform:scale(-1)'));
        break;
      case 'lace':
        add(dp(laceStrip(A), 'left:-2cqw;top:0;width:104cqw', 'lc'), dp(laceStrip(A), 'left:-2cqw;bottom:0;width:104cqw;transform:scaleY(-1)', 'lc'), dp(bowSVG(A), 'left:5cqw;top:1.5cqw;width:15cqw;transform:rotate(-12deg)', 'bw'));
        break;
      case 'hearts':
        add(h('i', { class: 'ht', style: `left:4cqw;right:4cqw;top:3cqw;height:4cqw;background:${heartTile(A)} repeat-x center/auto 100%` }), h('i', { class: 'ht', style: `left:4cqw;right:4cqw;bottom:3cqw;height:4cqw;background:${heartTile(A)} repeat-x center/auto 100%` }),
          h('i', { class: 'ht', style: `top:9cqw;bottom:9cqw;left:3.2cqw;width:4cqw;background:${heartTile(A)} repeat-y center/100% auto` }), h('i', { class: 'ht', style: `top:9cqw;bottom:9cqw;right:3.2cqw;width:4cqw;background:${heartTile(A)} repeat-y center/100% auto` }));
        break;
      case 'watercolor':
        add(h('i', { class: 'wc', style: `right:-16cqw;top:-14cqw;width:80cqw;height:62cqw;background:radial-gradient(60% 60% at 40% 45%,${A.l},transparent 72%),radial-gradient(40% 40% at 70% 60%,${A.a}66,transparent 70%)` }),
          h('i', { class: 'wc', style: `left:-20cqw;bottom:-16cqw;width:88cqw;height:66cqw;background:radial-gradient(60% 60% at 55% 50%,${mixHex(A.a, '#a98bd8', .45)}55,transparent 72%),radial-gradient(40% 40% at 30% 40%,${A.l},transparent 70%)` }),
          h('i', { class: 'wc', style: `left:36cqw;top:56cqw;width:40cqw;height:30cqw;background:radial-gradient(50% 50%,${A.l}aa,transparent 70%)` }));
        for (let i = 0; i < 12; i++) add(h('i', { class: 'wd', style: `left:${f1(R() * 96)}cqw;top:${f1(R() * 128)}cqw;width:${f1(.8 + R() * 2)}cqw;height:${f1(.8 + R() * 2)}cqw;background:${R() > .5 ? A.a : A.d};opacity:${f1(.18 + R() * .3)}` }));
        break;
      case 'airmail': {
        const bar = `repeating-linear-gradient(135deg,${A.a} 0 2.4cqw,#fff 2.4cqw 4.8cqw,#5b8fd6 4.8cqw 7.2cqw,#fff 7.2cqw 9.6cqw)`;
        add(h('i', { class: 'am', style: `left:0;right:0;top:0;height:3.4cqw;background:${bar}` }), h('i', { class: 'am', style: `left:0;right:0;bottom:0;height:3.4cqw;background:${bar}` }), h('i', { class: 'am', style: `top:0;bottom:0;left:0;width:3.4cqw;background:${bar}` }), h('i', { class: 'am', style: `top:0;bottom:0;right:0;width:3.4cqw;background:${bar}` }),
          dp(stampSVG(A), 'right:7cqw;top:7cqw;width:13cqw;transform:rotate(4deg)', 'st'), dp(postmark(A), 'right:15cqw;top:10cqw;width:30cqw;transform:rotate(-8deg)'));
        break;
      }
      case 'navy':
        add(dp(swoosh(A, .62), 'left:0;top:0;width:46cqw'), dp(swoosh(A, 1), 'right:0;bottom:0;width:58cqw;transform:rotate(180deg)'));
        break;
      case 'emerald':
        add(dp(swoosh(A, .8), 'left:0;top:0;width:52cqw'), dp(swoosh(A, 1), 'right:0;bottom:0;width:62cqw;transform:rotate(180deg)'), dp(goldLines(A), 'left:0;bottom:2cqw;width:34cqw;transform:scaleX(-1)'));
        break;
      case 'chalk':
        add(h('i', { class: 'ck' }), dp(goldLines(A), 'right:0;top:0;width:36cqw'), dp(SVG('0 0 100 100', `<path d="M100 36C70 52 40 78 6 100H100Z" fill="rgba(0,0,0,.4)"/><path d="M100 50C74 64 44 84 14 100" fill="none" stroke="url(#gold-g)" stroke-width="1.3" stroke-linecap="round"/><path d="M100 62C80 74 56 90 34 100" fill="none" stroke="url(#gold-g)" stroke-width=".6" stroke-linecap="round"/>`), 'right:0;bottom:0;width:54cqw'));
        break;
      case 'sunset':
        add(h('i', { class: 'wc', style: 'right:-12cqw;top:2cqw;width:70cqw;height:42cqw;background:radial-gradient(55% 55% at 50% 50%,rgba(255,226,196,.85),transparent 72%)' }), h('i', { class: 'wc', style: 'left:-10cqw;top:34cqw;width:60cqw;height:26cqw;background:radial-gradient(50% 50% at 50% 50%,rgba(255,255,255,.55),transparent 72%)' }),
          dp(SVG('0 0 100 100', `<g fill="none" stroke="${A.d}" stroke-width=".7" opacity=".5" stroke-linecap="round"><path d="M2 20C10 10 24 4 40 4"/><path d="M0 30C8 20 20 12 34 10"/><path d="M4 8L16 4"/></g>`), 'left:0;top:0;width:44cqw'),
          dp(SVG('0 0 100 40', `<path d="M0 20C16 8 34 14 52 22S88 28 100 16V40H0Z" fill="${A.l}" opacity=".75"/><path d="M0 28C20 18 42 30 62 32S90 26 100 28V40H0Z" fill="${A.a}" opacity=".8"/><path d="M0 35C30 30 62 38 100 32V40H0Z" fill="${A.d}" opacity=".78"/>`), 'left:0;bottom:0;width:100cqw'));
        break;
      case 'stars': {
        let s = ''; for (let i = 0; i < 18; i++) { const edge = i % 3, x = edge === 0 ? R() * 8 : edge === 1 ? 92 + R() * 8 : R() * 100, y = edge === 2 ? R() * 9 : R() * 128; s += sparkle(f1(x), f1(y), f1(.25 + R() * .5), f1(.45 + R() * .5)); }
        add(dp(SVG('0 0 100 130', s, 'sky'), 'left:0;top:0;width:100cqw;height:130cqw'), dp(SVG('0 0 60 50', `<path d="M36 4a22 22 0 1 0 18 34A18 18 0 1 1 36 4Z" fill="url(#gold-g)"/>`), 'right:7cqw;top:5cqw;width:14cqw;transform:rotate(8deg)'), dp(SVG('0 0 40 40', sparkle(20, 20, 1.700), ''), 'left:6cqw;bottom:7cqw;width:11cqw'), h('i', { class: 'sb' }));
        break;
      }
      case 'vine':
        add(dp(vineSeg(fp, seed + 1, false), 'left:0;top:0;width:15cqw'), dp(vineSeg(fp, seed + 2, true), 'left:0;bottom:0;width:15cqw;transform:scaleY(-1)'), dp(cornerFloral(fp, seed + 5, .8), 'right:-2cqw;top:-2cqw;width:28cqw;transform:scaleX(-1)'));
        break;
      case 'ribbon':
        add(h('i', { class: 'rb', style: `top:5cqw;height:8cqw;background:linear-gradient(180deg,${A.m},${A.a} 38%,${A.d})` }), h('i', { class: 'rb thin', style: `bottom:6cqw;height:3.2cqw;background:linear-gradient(180deg,${A.m},${A.a} 50%,${A.d})` }),
          dp(bowSVG(A), 'left:50%;top:-1cqw;width:26cqw;margin-left:-13cqw', 'bw'));
        break;
      case 'notebook':
        add(h('i', { class: 'nbm', style: `background:${A.a}` }), h('i', { class: 'nbm b', style: `background:${A.a}` }), ...[18, 50, 82].map(p => h('i', { class: 'nbh', style: `top:${p}%` })));
        break;
      case 'kraft':
        add(h('i', { class: 'kst' }), dp(SVG('0 0 60 20', `<rect width="60" height="20" fill="#f1dcae" opacity=".9"/><path d="M0 0H60M0 20H60" stroke="#d4b97c" stroke-dasharray="2 2"/>`), 'left:-5cqw;top:3cqw;width:24cqw;transform:rotate(-34deg)', 'tp'), dp(SVG('0 0 60 20', `<rect width="60" height="20" fill="${A.l}" opacity=".9"/><path d="M0 0H60M0 20H60" stroke="${A.m}" stroke-dasharray="2 2"/>`), 'right:-5cqw;bottom:6cqw;width:24cqw;transform:rotate(-34deg)', 'tp'),
          dp(SVG('0 0 24 60', `<path d="M8 56V12C8 4 18 4 18 12V46C18 52 11 52 11 46V16" fill="none" stroke="#b8b8c4" stroke-width="2.200" stroke-linecap="round"/>`), 'right:9cqw;top:-3cqw;width:6cqw'));
        break;
      case 'cherry': {
        let br = '', bl = '', pt = '';
        br = `<path d="M204 6C176 22 150 30 124 46C100 60 76 62 50 84" stroke="#6e4a3c" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M170 20C160 40 150 46 138 66M124 46C122 62 110 76 94 84M92 60C84 52 70 52 60 54" stroke="#6e4a3c" stroke-width="1.600" fill="none" stroke-linecap="round"/>`;
        [[176, 22, 11], [150, 34, 12], [130, 48, 13], [108, 60, 11], [138, 68, 10], [92, 82, 10], [70, 60, 9], [60, 84, 11], [190, 12, 9]].forEach(([x, y, s], i) => { bl += `<g transform="translate(${x} ${y})">${flower('rose', s, R() * 360, seed + i)}</g>`; });
        for (let i = 0; i < 12; i++) pt += `<path transform="translate(${f1(R() * 200)} ${f1(40 + R() * 100)}) rotate(${f1(R() * 360)}) scale(${f1(.5 + R() * .5)})" d="M0 0C4 -3 9 -2 10 3C8 8 2 9 -1 6C-2 3 -1 1 0 0Z" fill="#f6b5c6" opacity="${f1(.5 + R() * .45)}"/>`;
        add(dp(SVG('0 0 210 150', br + bl + pt, 'chy'), 'right:-3cqw;top:-2cqw;width:74cqw'), dp(SVG('0 0 210 150', br + bl, 'chy'), 'left:-8cqw;bottom:-3cqw;width:50cqw;transform:rotate(180deg)'));
        break;
      }
    }
    return el;
  }


  /* ---------- 6. SCENE (burgundy velvet + cream cloth) ---------- */
  function smooth(pts) {                         // closed Catmull-Rom -> bezier
    const n = pts.length; let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      d += `C${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])} ${f1(p2[1])}`;
    }
    return d + 'Z';
  }
  let SCENE_SVG = '';
  function buildScene() {
    const B = S.look.bg, SC = SCENES[B.scene] || SCENES.wine, noCloth = S.look.hide.includes('cloth');
    const W = Math.max(320, innerWidth), H = Math.max(480, innerHeight), wide = W / H > 1.05, R = rng(77);
    const x0 = wide ? W * .08 : -W * .1, x1 = wide ? W * .92 : W * 1.1, top = H * (wide ? .1 : .2), bot = H * (wide ? .94 : .86);
    const cloth = smooth([[x0, top + H * .05], [W * .22, top - H * .015], [W * .5, top + H * .035], [W * .78, top - H * .03], [x1, top + H * .03], [x1 + W * .02, H * .5], [x1, bot - H * .05], [W * .72, bot + H * .02], [W * .42, bot - H * .025], [W * .16, bot + H * .03], [x0, bot - H * .02], [x0 - W * .02, H * .5]]);
    const fold = (a, b, c, dd, sw, col, op, blur) => `<path d="M${f1(a[0])} ${f1(a[1])}C${f1(b[0])} ${f1(b[1])} ${f1(c[0])} ${f1(c[1])} ${f1(dd[0])} ${f1(dd[1])}" stroke="${col}" stroke-width="${sw}" fill="none" stroke-linecap="round" opacity="${op}" filter="url(#sb${blur})"/>`;
    let velv = '';
    [[.0, .1, .3, .2], [.1, .0, .22, .5], [.55, .02, .8, .14], [.9, .0, 1, .3], [.0, .75, .1, .9], [.9, .7, 1, .95]].forEach(([ax, ay, bx, by], i) => {
      velv += fold([W * ax, H * ay], [W * (ax + .3), H * (ay + .06)], [W * (bx - .1), H * (by - .04)], [W * bx, H * by], 60 + i * 9, SC.hi, .32, 28);
      velv += fold([W * (ax + .03), H * (ay + .04)], [W * (ax + .22), H * (ay + .12)], [W * (bx - .05), H * (by + .02)], [W * (bx + .08), H * (by + .08)], 44, '#12030a', .5, 22);
    });
    let cf = '';   // cloth ki silwatein
    for (let i = 0; i < 9; i++) {
      const y = top + (bot - top) * (.1 + i * .1) + (R() - .5) * H * .05, xa = (R() * .4 - .1) * W, xb = (.6 + R() * .5) * W;
      cf += fold([xa, y], [xa + (xb - xa) * .3, y - H * .05 * (R() + .3)], [xa + (xb - xa) * .65, y + H * .06 * (R() + .2)], [xb, y + (R() - .5) * H * .05], 36 + R() * 40, i % 2 ? '#ffffff' : '#b99a82', i % 2 ? .55 : .22, 22);
    }
    const fall = `<path d="M${f1(-10)} ${f1(H * .88)}C${f1(W * .2)} ${f1(H * .8)} ${f1(W * .42)} ${f1(H * .97)} ${f1(W * .7)} ${f1(H * .92)}S${f1(W * .92)} ${f1(H * .99)} ${f1(W + 10)} ${f1(H * .96)}V${H + 10}H-10Z" fill="url(#velG)" filter="url(#fUp)"/>`;
    const side = wide ? '' : `<path d="M-10 ${f1(H * .7)}C${f1(W * .12)} ${f1(H * .74)} ${f1(W * .2)} ${f1(H * .86)} ${f1(W * .1)} ${H + 10}H-10Z" fill="url(#velG)" filter="url(#fUp)" opacity=".95"/>`;
    const clothG = `<g filter="url(#fDrop)"><path d="${cloth}" fill="url(#clG)"/></g>
      <g clip-path="url(#clipCloth)"><rect x="${f1(x0 - 40)}" y="${f1(top - 40)}" width="${f1(x1 - x0 + 80)}" height="${f1(bot - top + 80)}" fill="url(#clG)"/>${cf}
        <rect x="${f1(x0 - 40)}" y="${f1(top - 40)}" width="${f1(x1 - x0 + 80)}" height="${f1(bot - top + 80)}" filter="url(#fCloth)" opacity=".26" style="mix-blend-mode:multiply"/>
        <rect x="${f1(x0 - 40)}" y="${f1(top - 40)}" width="${f1(x1 - x0 + 80)}" height="${f1(bot - top + 80)}" filter="url(#fWeave)" opacity=".2" style="mix-blend-mode:multiply"/></g>`;
    const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs>
      <linearGradient id="velG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${SC.v[0]}"/><stop offset=".5" stop-color="${SC.v[1]}"/><stop offset="1" stop-color="${SC.v[2]}"/></linearGradient>
      <radialGradient id="vig" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#140208" stop-opacity=".5"/></radialGradient>
      <linearGradient id="clG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${SC.cloth[0]}"/><stop offset=".5" stop-color="${SC.cloth[1]}"/><stop offset="1" stop-color="${SC.cloth[2]}"/></linearGradient>
      <clipPath id="clipCloth"><path d="${cloth}"/></clipPath>
      <filter id="sb28" filterUnits="userSpaceOnUse" x="${-W}" y="${-H}" width="${W * 3}" height="${H * 3}"><feGaussianBlur stdDeviation="28"/></filter><filter id="sb22" filterUnits="userSpaceOnUse" x="${-W}" y="${-H}" width="${W * 3}" height="${H * 3}"><feGaussianBlur stdDeviation="22"/></filter>
      <filter id="fDrop" x="-10%" y="-10%" width="120%" height="125%"><feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#0e0106" flood-opacity=".75"/></filter>
      <filter id="fUp" x="-10%" y="-20%" width="120%" height="140%"><feDropShadow dx="0" dy="-8" stdDeviation="14" flood-color="#0c0105" flood-opacity=".7"/></filter>
      <filter id="fCloth" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".03 .036" numOctaves="4" seed="9" result="n"/><feDiffuseLighting in="n" surfaceScale="3.500" lighting-color="#fff" result="l"><feDistantLight azimuth="230" elevation="60"/></feDiffuseLighting></filter>
      <filter id="fWeave" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".42" numOctaves="2" seed="5" result="n"/><feDiffuseLighting in="n" surfaceScale="1.800" lighting-color="#fff" result="l"><feDistantLight azimuth="225" elevation="62"/></feDiffuseLighting></filter>
      <filter id="fVel" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".75 .55" numOctaves="2" seed="21" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 .1  0 0 0 0 0  0 0 0 0 .03  0 0 0 1.6 -.55"/></filter></defs>
      <rect width="${W}" height="${H}" fill="url(#velG)"/>${velv}<rect width="${W}" height="${H}" filter="url(#fVel)" opacity=".5"/>
      ${noCloth ? '' : clothG}
      ${fall}${side}<rect width="${W}" height="${H}" fill="url(#vig)"/></svg>`;
    SCENE_SVG = svg; paintBg(svg);
  }
  /* fx: phool, petals, roshni, lantern */
  function buildFx() {
    const fx = $('#fx');
    const gy = (cls, seed, w, hh) => h('div', { class: 'fx-gyp ' + cls, html: gypsy(seed, w, hh).replace('class="gyp"', 'class="gyp"') });
    const lights = Array.from({ length: 16 }, (_, i) => { const R = rng(900 + i), left = i < 8; return h('i', { class: 'fx-light', style: `left:${left ? f1(R() * 14 - 2) : f1(84 + R() * 16)}%;top:${f1(58 + R() * 40)}%;--s:${f1(8 + R() * 14)}px;--d:${f1(R() * 4)}s` }); });
    const pt = [[10, 30, 0], [9, 62, 1], [4, 80, 2], [78, 74, 3], [82, 24, 4], [95, 52, 5], [34, 90, 6], [58, 8, 7]].map(([x, y, i]) => h('div', { class: 'fx-petal', style: `left:${x}%;top:${y}%;--r:${i * 47}deg;--d:${i * .7}s`, html: petalSVG(40 + i * 5) }));
    fx.replaceChildren(gy('g1', 11, 320, 300), gy('g2', 23, 260, 260), gy('g3', 37, 260, 260), gy('g4', 53, 200, 200), h('div', { class: 'fx-lantern', html: lanternSVG() }), ...pt, ...lights,
      h('div', { class: 'fx-pen', html: penSVG() }), h('div', { class: 'fx-wseal', html: sealSVG('wine', '', 5) }));
  }

  function paintBg(svg) {
    const B = S.look.bg, host = $('#scene'), root = document.documentElement.style;
    const layer = h('div', { class: 'bgl' });
    if (B.type === 'solid') layer.style.background = B.c1;
    else if (B.type === 'gradient') layer.style.background = `linear-gradient(${B.angle}deg,${B.c1},${B.c2})`;
    else if (B.type === 'photo') { layer.style.background = B.c1; if (B.img) { layer.style.backgroundImage = `url("${B.img}")`; layer.style.backgroundSize = 'cover'; layer.style.backgroundPosition = 'center'; } }
    else layer.innerHTML = svg;
    if (B.blur) { layer.style.filter = `blur(${B.blur}px)`; layer.style.transform = 'scale(1.08)'; }
    const kids = [layer]; if (B.dim) kids.push(h('div', { class: 'bgdim', style: `background:rgba(8,0,4,${B.dim / 100})` }));
    if (B.type !== 'scene') kids.push(h('div', { class: 'bgvig' }));
    host.replaceChildren(...kids);
    const sc = B.type === 'scene' ? (SCENES[B.scene] || SCENES.wine).bg : B.c1; root.setProperty('--sc', sc);
    const lightBg = (B.type === 'solid' && lum(B.c1) > .6) || (B.type === 'gradient' && lum(B.c1) > .6 && lum(B.c2) > .6);
    document.body.dataset.cloth = (B.type === 'scene' && !S.look.hide.includes('cloth')) || lightBg ? '1' : '0';
    document.body.dataset.hide = S.look.hide.join(' ');
  }
  const applyLook = () => buildScene();


  /* ---------- 7. PAPER (khat ka kaghaz) ---------- */
  function deckle(seed) {
    const R = rng(seed), step = 1.15, p = [], j = () => (R() < .06 ? .9 : .5);
    for (let x = 0; x <= 100; x += step) p.push(`${f1(x)}% ${f1(R() * j())}%`);
    for (let y = 0; y <= 100; y += step * .8) p.push(`${f1(100 - R() * j() * .8)}% ${f1(y)}%`);
    for (let x = 100; x >= 0; x -= step) p.push(`${f1(x)}% ${f1(100 - R() * j())}%`);
    for (let y = 100; y >= 0; y -= step * .8) p.push(`${f1(R() * j() * .8)}% ${f1(y)}%`);
    return `polygon(${p.join(',')})`;
  }
  const fmtDay = iso => fmtDate(iso);
  const CE = (() => { try { const e = document.createElement('div'); e.contentEditable = 'plaintext-only'; return e.contentEditable === 'plaintext-only' ? 'plaintext-only' : 'true'; } catch (er) { return 'true'; } })();
  const NATIVE_KEY = 'olw_letter_native_kb';
  const nativeKb = () => { try { return localStorage.getItem(NATIVE_KEY) === '1'; } catch (er) { return false; } };
  const isPhone = () => window.matchMedia('(max-width:899px)').matches;
  const ownKb = () => isPhone() && !nativeKb();
  const ced = (tag, k, text, ph, extra) => h(tag, Object.assign({ class: 'ced', 'data-k': k, 'data-ph': ph || '', contenteditable: CE, inputmode: ownKb() ? 'none' : 'text', spellcheck: 'false', autocomplete: 'off', autocorrect: 'off', text: text || '' }, extra || {}));
  function tbEl(tb, edit) {
    const inner = edit ? ced('div', 'tb', tb.t, 'Type here...', { class: 'ced tbt', 'data-id': tb.id }) : h('div', { class: 'tbt', text: tb.t });
    return h('div', { class: 'p-tb', 'data-id': tb.id, style: `left:${f1(tb.x)}cqw;top:${f1(tb.y)}cqw;width:${f1(tb.w)}cqw;--tf:${tb.fs / 100};font-family:"${tb.f}",cursive` }, inner,
      edit ? [h('i', { class: 'tmv', title: 'Move' }), h('i', { class: 'trs', title: 'Resize' }), h('i', { class: 'tdl', title: 'Delete', text: '×' })] : null);
  }
  function renderPaper(L, o = {}) {
    const pp = PAPERS[L.paper] || PAPERS.cream, seed = hashStr(L.id), R = rng(seed + 5), empty = ED.open && o.live;
    const stains = Array.from({ length: 6 }, () => `radial-gradient(circle at ${f1(R() * 100)}% ${f1(R() * 100)}%,rgba(140,92,48,${f1(.04 + R() * .08)}) 0,transparent ${f1(6 + R() * 16)}%)`).join(',');
    const wrap = h('div', { class: 'pw' + (o.print ? ' print' : ''), style: `--ink:${L.ink};--bf:"${L.bodyFont}";--hf:"${L.headFont}";--fs:${L.size / 100};--ps:${(L.psize || 100) / 100};--pl:${(L.plen || 100) / 100};--pa:${pp[0]};--pb:${pp[1]}` });
    const paper = h('article', { class: 'paper', style: `clip-path:${deckle(seed)};background-image:${stains},linear-gradient(165deg,var(--pa),var(--pb))` });
    const fl = L.floral; wrap.dataset.hide = (L.hide || []).join(' '); { const AC = accent(L); wrap.style.setProperty('--dl', AC.m); wrap.style.setProperty('--da', AC.a); } wrap.dataset.ds = L.design === 'florals' ? '' : L.design;
    if (L.design === 'florals') { if (fl !== 'none') paper.append(h('div', { class: 'pc tl', html: cornerFloral(fl, seed + 1) }), h('div', { class: 'pc br', html: cornerFloral(fl, seed + 2) }), h('div', { class: 'pc bl', html: cornerFloral(fl, seed + 3, .8) })); }
    else { const dsEl = designEl(L); if (dsEl) paper.append(dsEl); }
    const from = h('div', { class: 'p-from' }, h('span', { class: 'ic-w', html: ico('mail') }), h('span', { class: 'p-fromtxt' }, 'From: ' + (L.from || (empty ? '...' : ''))), h('span', { class: 'p-hrt', html: tinyHeart }));
    const date = h('div', { class: 'p-date' }, h('span', { class: 'ic-w', html: ico('cal') }), h('span', { text: fmtDay(L.date) }));
    const body = h('div', { class: 'p-body' });
    if (L.photo) {
      const free = typeof L.px === 'number' && typeof L.py === 'number';
      const fig = h('figure', { class: 'p-photo' + (free ? ' free' : '') + (free && L.pover ? ' over' : ''), style: (free ? `left:${f1(L.px)}cqw;top:${f1(L.py)}cqw;` : '') + (typeof L.prot === 'number' ? `transform:rotate(${f1(L.prot)}deg);` : '') }, L.ptape === false ? null : h('i', { class: 'tape' }), h('img', { src: L.photo, alt: L.cap || 'Photo', draggable: 'false' }), L.cap ? h('figcaption', { text: L.cap }) : null, o.live ? h('i', { class: 'p-rs', title: 'Drag to resize' }) : null);
      if (free) paper.append(fig); else body.append(fig);
    }
    if (empty) body.append(h('h2', { class: 'p-greet' }, ced('b', 'greet', L.greet, 'Dear ...'), h('span', { html: underline() })));
    else if (L.greet) body.append(h('h2', { class: 'p-greet' }, L.greet, h('span', { html: underline() })));
    if (empty) { const arr = L.body.length ? L.body : ['']; arr.forEach((t, i) => body.append(ced('p', 'body', t, arr.length === 1 ? 'Write your letter here...' : '', { 'data-bi': i }))); }
    else L.body.forEach((t, i) => { if (t.trim()) body.append(h('p', { text: t, 'data-bi': i })); });
    const foot = h('div', { class: 'p-foot' });
    const left = h('div', { class: 'p-left' }, empty ? ced('p', 'closing', L.closing, 'Always yours,', { class: 'ced p-close' }) : L.closing ? h('p', { class: 'p-close', text: L.closing }) : null, (L.sign || empty) ? h('div', { class: 'p-sign' }, empty ? ced('b', 'sign', L.sign, 'Your name') : L.sign, h('span', { class: 'p-hrt', html: tinyHeart }), h('span', { html: underline() })) : null);
    foot.append(left, empty ? ced('p', 'note', L.note, 'Side note...', { class: 'ced p-note' }) : L.note ? h('p', { class: 'p-note', text: L.note }) : null);
    const box = h('div', { class: 'p-in' }, h('div', { class: 'p-top' }, from, date), body, foot);
    paper.append(box);
    (L.tbs || []).forEach(tb => paper.append(tbEl(tb, empty)));
    wrap.append(paper);
    return wrap;
  }

  /* ---------- 8. VIEWS ---------- */
  const MAIL = () => $('#mail'), READ = () => $('#read');
  function drawTop() {
    const L = cur(), n = S.letters.length;
    $('#hdSub').textContent = L ? `Letters • ${L.chapter || 'Chapter 1'}` : 'Letters';
    document.body.dataset.view = S.view;
    $('#hdFav').classList.toggle('on', !!(L && L.fav)); $('#bFav').classList.toggle('on', !!(L && L.fav));
    $('#bFav .lb').textContent = L && L.fav ? 'Favourited' : 'Favourite';
    $('#cnt').textContent = n ? `${S.idx + 1} / ${n}` : '';
  }
  function drawMail(dir = 0) {
    const L = S.letters[S.idx], m = MAIL(), n = S.letters.length;
    if (!L) { $('#evHost').replaceChildren(h('p', { class: 'empty', text: 'No letters yet.' })); return; }
    const ev = envelopeEl(L); ev.style.setProperty('--tilt', (-4 + (hashStr(L.id) % 5) - 2) + 'deg');
    if (dir) ev.classList.add(dir > 0 ? 'in-r' : 'in-l');
    const host = $('#evHost'); host.replaceChildren(h('div', { class: 'ev-stack' + (n > 1 ? ' multi' : ''), 'data-n': Math.min(n, 3) }, h('i', { class: 's2' }), h('i', { class: 's1' }), ev));
    $('#tagline').textContent = L.tag || '';
    $('#tagline').hidden = !L.tag;
    $('#goBtn .t').textContent = L.btn || 'Special for You';
    $('#navL').disabled = S.idx <= 0; $('#navR').disabled = S.idx >= n - 1; $('.arrows', m).hidden = n < 2;
    drawTop();
  }
  function drawRead(anim = false, keepScroll = false) {
    const L = cur(), r = READ(), sc = r.scrollTop; if (!L) return;
    const pw = renderPaper(L, { live: true }); if (anim) pw.classList.add('enter');
    const host = $('#paperHost'); host.replaceChildren(pw);
    host.dataset.seal = L.seal;
    $('#deskSeal').innerHTML = sealSVG(L.seal === 'gold' ? 'wine' : L.seal, '', 3);
    if (keepScroll) r.scrollTop = sc; else r.scrollTop = 0;
    drawTop();
  }
  function setView(v) {
    S.view = v; MAIL().hidden = v !== 'mail'; READ().hidden = v !== 'read'; $('#bar').hidden = v !== 'read';
    document.body.dataset.view = v;
  }
  async function openLetter() {
    if (S.busy || S.view !== 'mail' || !S.letters.length) return;
    S.busy = true; const m = MAIL(), ev = $('.ev', m);
    if (reduced() || !ev) { setView('read'); drawRead(true); S.busy = false; return; }
    ev.classList.add('crack'); await sleep(520);
    ev.classList.add('open'); await sleep(1000);
    ev.classList.add('out'); await sleep(820);
    m.classList.add('leaving'); setView('read'); drawRead(true); await sleep(900);
    m.classList.remove('leaving'); S.busy = false;
  }
  async function closeLetter() {
    if (S.view !== 'read' || S.busy) return;
    if (ED.open) { if (!(await leaveEditor())) return; }
    drawMail(); setView('mail'); drawTop();
  }
  async function step(d) {
    const n = S.idx + d; if (S.busy || n < 0 || n >= S.letters.length) return;
    S.idx = n; drawMail(d);
  }
  function goTo(i) { S.idx = clamp(i, 0, S.letters.length - 1); if (S.view === 'read') drawRead(true); else drawMail(); drawTop(); }

  /* ---------- 9. UI helpers ---------- */
  let toastT; function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => { t.classList.remove('on'); setTimeout(() => (t.hidden = true), 250); }, 2600); }
  const canEdit = L => !!L && (ROLE === 'owner' || !L.by || L.by === ME.email);
  const touch = L => { L.updated = Date.now(); return L; };
  let pushT; const pushSoon = L => { clearTimeout(pushT); pushT = setTimeout(async () => { if (!L.demo) { await persist(); cloudPutLetter(L); } }, 400); };
  const openDlg = d => { if (!d.open) d.showModal(); }, closeDlg = d => { if (d.open) d.close(); };
  function ask(title, msg, ok = 'OK', danger = false) {
    return new Promise(res => { const d = $('#dlgAsk'); $('#askT').textContent = title; $('#askM').textContent = msg; const b = $('#askOk'); b.textContent = ok; b.classList.toggle('danger', danger);
      const done = v => { d.removeEventListener('close', onc); b.onclick = null; $('#askNo').onclick = null; res(v); }; const onc = () => done(false);
      b.onclick = () => { d.removeEventListener('close', onc); closeDlg(d); done(true); }; $('#askNo').onclick = () => closeDlg(d); d.addEventListener('close', onc); openDlg(d); });
  }
  function download(name, data, type) { const a = h('a', { href: URL.createObjectURL(new Blob([data], { type })), download: name }); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800); }
  const letterText = L => [L.from && `From: ${L.from}`, fmtDate(L.date), '', L.greet, '', ...L.body.filter(x => x.trim()).flatMap(x => [x, '']), L.closing, L.sign, '', L.note].filter(x => x !== undefined && x !== false && x !== null).join('\n').replace(/\n{3,}/g, '\n\n').trim();

  /* ---------- 10. ACTIONS ---------- */
  async function toggleFav() { const L = ED.open ? ED.L : S.letters[S.idx]; if (!L) return; L.fav = !L.fav; if (!ED.open && !L.demo) { touch(L); await persist(); cloudPutLetter(L); } drawTop(); toast(L.fav ? 'Added to favourites ♡' : 'Removed from favourites'); }
  function printLetter() {
    const L = cur(); if (!L) return; const pa = $('#printArea'); pa.replaceChildren(renderPaper(L, { print: true }));
    const go = () => { window.print(); }; (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => setTimeout(go, 150));
  }
  async function shareLetter() { const L = cur(); const t = letterText(L); if (navigator.share) { try { await navigator.share({ title: 'A letter for you', text: t }); return; } catch (e) { if (e && e.name === 'AbortError') return; } } try { await navigator.clipboard.writeText(t); toast('Letter copied to clipboard'); } catch (e) { toast('Sharing is not available here'); } }
  function exportTxt() { const L = cur(); download(`letter-${L.date}.txt`, letterText(L), 'text/plain'); }
  function exportJson(all) { const items = all ? S.letters.filter(l => !l.demo) : [cur()]; if (!items.length) return toast('No letters to export yet'); download(all ? `our-letters-backup-${todayISO()}.json` : `letter-${cur().date}.json`, JSON.stringify({ app: 'olw-letters', v: 1, letters: items }, null, 1), 'application/json'); }
  async function importFile(file) {
    try { const j = JSON.parse(await file.text()); const arr = (Array.isArray(j) ? j : j.letters); if (!Array.isArray(arr)) throw 0; const have = new Set(S.letters.map(l => l.id)); let n = 0;
      arr.slice(0, LIM.letters).forEach(x => { const l = normLetter(x); l.demo = false; if (have.has(l.id)) l.id = uid(); S.letters.push(l); have.add(l.id); n++; });
      S.letters = S.letters.filter(l => !l.demo || !n); sortLetters(); await persist(); S.letters.forEach(l => { if (!l.demo && !l.updated) { touch(l); } cloudPutLetter(l); }); S.idx = S.letters.length - 1; drawMail(); drawTop(); toast(`${n} letter(s) imported`);
    } catch (e) { toast('That file is not a letters backup.'); }
  }
  const sortLetters = () => S.letters.sort((a, b) => (a.date === b.date ? a.created - b.created : a.date < b.date ? -1 : 1));
  async function deleteLetter() {
    const L = S.letters[S.idx]; if (!L) return; if (!(await ask('Delete this letter?', 'It will be removed from this diary for good. You can export a copy first.', 'Delete', true))) return;
    if (ED.open) { ED.open = false; document.body.classList.remove('lt-editing'); $('#editor').hidden = true; }
    cloudDelLetter(L.id); S.letters.splice(S.idx, 1); if (!S.letters.length) S.letters = [demoLetter()]; S.idx = clamp(S.idx, 0, S.letters.length - 1); await persist(); drawMail(); setView('mail'); drawTop(); toast('Letter deleted');
  }
  function listDialog() {
    const d = $('#dlgList'), q = ($('#liQ').value || '').toLowerCase().trim();
    const rows = S.letters.map((l, i) => ({ l, i })).filter(({ l }) => (!S.filterFav || l.fav) && (!q || (l.greet + ' ' + l.from + ' ' + l.body.join(' ') + ' ' + l.tag + ' ' + l.sign).toLowerCase().includes(q))).reverse();
    $('#liBody').replaceChildren(...(rows.length ? rows.map(({ l, i }) => h('button', { type: 'button', class: 'li-row' + (i === S.idx ? ' on' : ''), onclick: () => { closeDlg(d); if (ED.open) return toast('Finish editing first'); goTo(i); } },
      h('span', { class: 'li-env', html: SVG('0 0 40 28', `<rect x="1" y="1" width="38" height="26" rx="3" fill="#f1e1d2" stroke="#c9ad98"/><path d="M1 2L20 16L39 2" fill="none" stroke="#c9ad98"/><circle cx="20" cy="15" r="4.500" fill="${l.seal === 'wine' ? '#8a2640' : l.seal === 'rose' ? '#d8809a' : '#d4a23c'}"/>`) }),
      h('span', { class: 'li-t' }, h('b', { text: l.greet || l.tag || 'Untitled letter' }), h('small', { text: `${fmtDate(l.date)}${l.from ? ' • ' + l.from : ''}` })),
      l.fav ? h('span', { class: 'li-fav', html: ico('heart') }) : null)) : [h('p', { class: 'empty', text: S.filterFav ? 'No favourite letters yet.' : 'No letters found.' })]));
    $$('.li-chip').forEach(c => c.classList.toggle('on', (c.dataset.f === 'fav') === S.filterFav));
  }
  const fmtCount = () => { const r = real().length; return r ? `${r} letter${r > 1 ? 's' : ''}` : 'Sample letter'; };

  /* ---------- 11. EDITOR ---------- */
  const F = id => $('#' + id);
  function buildEditor() {
    $$('#editor [data-f]').forEach(inp => inp.addEventListener('input', () => { const k = inp.dataset.f; let v = inp.value; if (k === 'body') v = v.split(/\n+/); else if (k === 'size') v = +v; setField(k, v, true); }));
  }
  function setField(k, v, fromInput) {
    if (!ED.open) return; ED.L[k] = v; ED.dirty = true;
    if (!fromInput) syncEditor();
    clearTimeout(setField.t); setField.t = setTimeout(() => drawRead(false, true), fromInput ? 120 : 0); if (k === 'chapter' || k === 'from') drawTop();
  }
  function syncEditor() {
    const L = ED.L; if (!L) return;
    $$('#editor [data-f]').forEach(inp => { const k = inp.dataset.f, v = k === 'body' ? L.body.join('\n') : L[k]; if (document.activeElement !== inp && inp.value !== String(v)) inp.value = v; });
    F('phRm').hidden = !L.photo; F('phAdd').lastChild.textContent = L.photo ? ' Replace photo' : ' Add a photo';
    F('edTitle').textContent = ED.isNew ? (L.replyTo ? 'Write a reply' : 'Write a letter') : 'Edit letter'; F('edDel').hidden = ED.isNew;
  }
  function openEditor(L, isNew) {
    ED.open = true; ED.isNew = isNew; ED.L = clone(L); ED.base = clone(L); ED.dirty = isNew;
    document.body.classList.add('lt-editing'); F('editor').hidden = false; F('editor').scrollTop = 0; if (S.view !== 'read') setView('read');
    syncEditor(); drawRead(S.view === 'read' && !isNew ? false : true); F('editor').classList.add('sheet-open');
  }
  async function leaveEditor() {
    if (ED.dirty && !(await ask('Discard your changes?', 'This letter has changes that are not saved yet.', 'Discard', true))) return false;
    closeEditor(); return true;
  }
  function closeEditor() { hideKb(); ED.open = false; ED.L = null; document.body.classList.remove('lt-editing'); F('editor').hidden = true; if (S.view === 'read') drawRead(false, true); drawTop(); }
  async function saveEditor() {
    const L = normLetter(ED.L); if (!L.body.some(x => x.trim()) && !L.greet.trim()) return toast('Please write something first.');
    if (!L.from.trim()) { toast('Please add who the letter is from.'); F('fFrom').focus(); return; }
    L.demo = false; L.by = L.by || ME.email; touch(L); S.prefs.from = L.from; DB.set('prefs', S.prefs);
    if (JSON.stringify(L).length > 950000) return toast('This letter is too big to sync. Please use a smaller photo or shorter text.');
    if (ED.isNew) { S.letters = S.letters.filter(l => !l.demo); S.letters.push(L); } else { const i = S.letters.findIndex(l => l.id === ED.base.id); if (i >= 0) S.letters[i] = L; else S.letters.push(L); }
    sortLetters(); S.idx = S.letters.findIndex(l => l.id === L.id); ED.dirty = false; await persist(); cloudPutLetter(L); closeEditor(); drawTop(); toast(ED.isNew ? 'Letter saved ♡' : 'Changes saved ♡');
  }
  function newLetter(reply) {
    const L = blank(); L.from = S.prefs.from || ''; L.mono = '';
    const base = S.letters[S.idx]; if (base && !base.demo) { L.floral = base.floral; L.paper = base.paper; L.ink = base.ink; L.bodyFont = base.bodyFont; L.headFont = base.headFont; L.seal = base.seal; L.chapter = base.chapter; }
    if (reply && base) { L.replyTo = base.id; L.greet = base.from ? `Dear ${base.from},` : ''; L.closing = 'With love,'; L.tag = 'A reply from my heart...'; L.btn = 'A reply for You'; }
    else { L.closing = 'Always yours,'; }
    openEditor(L, true);
  }
  async function imageToDataURL(file, maxPx, q, maxBytes) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Please choose a JPG, PNG or WebP photo.');
    if (file.size > 14 * 1024 * 1024) throw new Error('That photo is too big (max 14 MB).');
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
      let px = maxPx, qq = q, out = '';
      for (let t = 0; t < 8; t++) {
        const k = Math.min(1, px / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(img.naturalWidth * k)); c.height = Math.max(1, Math.round(img.naturalHeight * k));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); out = c.toDataURL('image/jpeg', qq); if (out.length * .75 <= maxBytes) return out; qq = Math.max(.5, qq - .08); px = Math.round(px * .85);
      }
      return out;
    } catch (e) { throw new Error('Could not read that photo.'); } finally { URL.revokeObjectURL(url); }
  }
  async function readPhoto(file) { try { setField('photo', await imageToDataURL(file, 900, .82, 420 * 1024)); } catch (e) { toast(e.message); } }

  /* ---------- 12. MENU + EVENTS ---------- */
  function menuState() {
    const own = ROLE === 'owner', L = S.letters[S.idx], rd = S.view === 'read', demo = L && L.demo;
    $$('#menu [data-act]').forEach(b => { const a = b.dataset.act; b.hidden = (a === 'import' && !own) || (a === 'edit' && (!canEdit(L) || !rd)) || (a === 'del' && (!canEdit(L) || demo || !rd)) || (a === 'print' && !rd); });
    const sy = $('#menu [data-act=sync] span.lbl'); if (sy) sy.textContent = CLOUD.user ? 'Google sync: on' : 'Sync with Google';
  }
  function bind() {
    $('#back').addEventListener('click', async () => { if (S.view === 'read') return closeLetter(); if (ED.open) return; location.href = 'index.html'; });
    $('#goBtn').addEventListener('click', openLetter); $('#evHost').addEventListener('click', e => { if (e.target.closest('.ev')) openLetter(); });
    $('#navL').addEventListener('click', () => step(-1)); $('#navR').addEventListener('click', () => step(1));
    $('#hdFav').addEventListener('click', toggleFav); $('#bFav').addEventListener('click', toggleFav);
    $('#bReply').addEventListener('click', () => { if (ED.open) return toast('Finish editing first'); newLetter(true); }); $('#bPrint').addEventListener('click', printLetter); $('#bExport').addEventListener('click', () => openDlg($('#dlgExport')));
    $('#xShare').addEventListener('click', () => { closeDlg($('#dlgExport')); shareLetter(); }); $('#xTxt').addEventListener('click', () => { closeDlg($('#dlgExport')); exportTxt(); }); $('#xJson').addEventListener('click', () => { closeDlg($('#dlgExport')); exportJson(false); });
    const menu = $('#menu'), mb = $('#menuBtn'); const shut = () => { menu.hidden = true; mb.setAttribute('aria-expanded', 'false'); };
    mb.addEventListener('click', e => { e.stopPropagation(); menuState(); menu.hidden = !menu.hidden; mb.setAttribute('aria-expanded', String(!menu.hidden)); });
    document.addEventListener('click', e => { if (!menu.hidden && !e.target.closest('#menu')) shut(); });
    menu.addEventListener('click', async e => {
      const b = e.target.closest('[data-act]'); if (!b) return; shut(); const a = b.dataset.act;
      if (a === 'list') { listDialog(); openDlg($('#dlgList')); } else if (a === 'new') { if (ED.open && !(await leaveEditor())) return; newLetter(false); }
      else if (a === 'edit') { const L = S.letters[S.idx]; if (L && !ED.open) openEditor(L, false); } else if (a === 'del') deleteLetter(); else if (a === 'print') printLetter();
      else if (a === 'backup') exportJson(true); else if (a === 'import') $('#fileImp').click(); else if (a === 'brush') openStyler(); else if (a === 'sync') openSync();
    });
    $('#liQ').addEventListener('input', listDialog); $$('.li-chip').forEach(c => c.addEventListener('click', () => { S.filterFav = c.dataset.f === 'fav'; listDialog(); }));
    $$('dialog').forEach(d => { d.addEventListener('click', e => { if (e.target === d) closeDlg(d); }); $$('[data-close]', d).forEach(b => b.addEventListener('click', () => closeDlg(d))); });
    $('#fileImp').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f) importFile(f); });
    $('#fileImg').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f) readPhoto(f); });
    initPhotoDrag(); initPageEdit(); F('phAdd').addEventListener('click', () => $('#fileImg').click()); F('phRm').addEventListener('click', () => setField('photo', ''));
    F('edSave').addEventListener('click', saveEditor); F('edCancel').addEventListener('click', leaveEditor); F('edDel').addEventListener('click', deleteLetter);
    F('edFold').addEventListener('click', () => F('editor').classList.toggle('folded'));
    document.addEventListener('keydown', e => {
      if (e.target.closest('input,textarea,select')) { if (e.key === 'Escape' && ED.open) e.target.blur(); return; }
      if ($$('dialog[open]').length) return;
      if (S.view === 'mail') { if (e.key === 'ArrowLeft') step(-1); else if (e.key === 'ArrowRight') step(1); else if (e.key === 'Enter') openLetter(); }
      else if (e.key === 'Escape' && !ED.open) closeLetter();
    });
    // swipe: envelope badalna
    let sx = null, sy = 0; const st = $('#evHost');
    st.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; }); st.addEventListener('pointerup', e => { if (sx == null) return; const dx = e.clientX - sx, dy = e.clientY - sy; sx = null; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) step(dx < 0 ? 1 : -1); });
    st.addEventListener('pointercancel', () => (sx = null));
    window.addEventListener('beforeunload', e => { if (ED.open && ED.dirty) { e.preventDefault(); e.returnValue = ''; } });
    window.addEventListener('afterprint', () => $('#printArea').replaceChildren());
    let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(buildScene, 200); });
  }

  /* ---------- 13. INIT ---------- */
  function textures() {
    const r = document.documentElement.style;
    r.setProperty('--tx-fiber', svgURL(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320"><filter id="f" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".012 .6" numOctaves="3" seed="3" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .55  0 0 0 0 .4  0 0 0 0 .26  0 0 0 .5 -.16"/></filter><rect width="320" height="320" filter="url(#f)"/></svg>`));
    r.setProperty('--tx-bump', svgURL(`<svg xmlns="http://www.w3.org/2000/svg" width="360" height="360"><filter id="f" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="4" seed="8" stitchTiles="stitch" result="n"/><feDiffuseLighting in="n" surfaceScale="2.600" lighting-color="#fff"><feDistantLight azimuth="225" elevation="58"/></feDiffuseLighting></filter><rect width="360" height="360" filter="url(#f)"/></svg>`));
  }


  /* ---------- 14. GOOGLE SYNC (Firebase Auth + Firestore) ---------- */
  const CLOUD = { user: null, auth: null, db: null, unsub: [], first: { letters: false, look: false }, loading: null };
  const cfgOK = () => !!(SYNC.firebase && SYNC.firebase.apiKey && SYNC.firebase.projectId);
  const spaceRef = () => CLOUD.db.collection('spaces').doc(SYNC.space);
  const loadScript = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.append(s); });
  function cloudErr(e) { console.warn('sync', e); if (e && e.code === 'permission-denied') toast('Sync is blocked. Check the Firestore rules and the two allowed emails.'); else if (e && e.code === 'unavailable') return; else toast('Sync problem. Your changes are still saved on this device.'); }
  async function cloudInit() {
    if (!cfgOK()) return false; if (CLOUD.auth) return true; if (CLOUD.loading) return CLOUD.loading;
    CLOUD.loading = (async () => {
      try {
        const base = 'https://www.gstatic.com/firebasejs/10.12.2/';
        await loadScript(base + 'firebase-app-compat.js'); await loadScript(base + 'firebase-auth-compat.js'); await loadScript(base + 'firebase-firestore-compat.js');
        firebase.initializeApp(SYNC.firebase); CLOUD.auth = firebase.auth(); CLOUD.db = firebase.firestore();
        CLOUD.auth.getRedirectResult().catch(e => { if (e && e.code && e.code !== 'auth/no-auth-event') toast('Sign-in failed. Please try again.'); });
        CLOUD.auth.onAuthStateChanged(onUser); return true;
      } catch (e) { CLOUD.loading = null; toast('Sync could not start. Please check your internet.'); return false; }
    })();
    return CLOUD.loading;
  }
  function stopListen() { CLOUD.unsub.forEach(f => { try { f(); } catch (e) { } }); CLOUD.unsub = []; CLOUD.first = { letters: false, look: false }; }
  async function onUser(u) {
    stopListen();
    if (!u) { CLOUD.user = null; ME.email = ''; ROLE = 'owner'; window.OLW_NOTIFY && OLW_NOTIFY.detach(); renderSync(); return; }
    const mail = (u.email || '').toLowerCase(), allowed = [SYNC.owner, SYNC.partner].filter(Boolean).map(x => x.toLowerCase());
    if (allowed.length && !allowed.includes(mail)) { toast('This Google account is not allowed here.'); CLOUD.auth.signOut(); return; }
    CLOUD.user = u; ME.email = mail; ROLE = (!SYNC.owner || SYNC.owner.toLowerCase() === mail) ? 'owner' : 'partner';
    window.OLW_NOTIFY && OLW_NOTIFY.attach(CLOUD.db, SYNC.space, ROLE);
    listen(); renderSync(); toast('Synced as ' + u.email);
  }
  function refreshAfterSync(curId) {
    sortLetters(); const i = S.letters.findIndex(l => l.id === curId); S.idx = i >= 0 ? i : clamp(S.idx, 0, Math.max(0, S.letters.length - 1)); persist();
    if (ED.open) { drawTop(); return; } if (S.view === 'read') drawRead(false, true); else drawMail(); drawTop(); if (typeof syncStyler === 'function' && ST.open) syncStyler();
  }
  function listen() {
    const lc = spaceRef().collection('letters');
    CLOUD.unsub.push(lc.onSnapshot(snap => {
      const curId = (S.letters[S.idx] || {}).id, first = !CLOUD.first.letters; let ch = false;
      snap.docChanges().forEach(c => {
        const d = c.doc, i = S.letters.findIndex(l => l.id === d.id), editing = ED.open && ED.base && ED.base.id === d.id;
        if (c.type === 'removed') { if (i >= 0 && !editing) { S.letters.splice(i, 1); ch = true; } return; }
        if (d.metadata.hasPendingWrites) return;
        const r = normLetter(Object.assign({}, d.data(), { id: d.id }));
        if (i < 0) { S.letters = S.letters.filter(l => !l.demo); S.letters.push(r); ch = true; }
        else if ((r.updated || 0) > (S.letters[i].updated || 0) && !editing) { S.letters[i] = r; ch = true; }
      });
      if (first) { CLOUD.first.letters = true; const ids = new Set(snap.docs.map(d => d.id)); S.letters.filter(l => !l.demo && !ids.has(l.id)).forEach(cloudPutLetter); }
      if (!S.letters.length) S.letters = [demoLetter()];
      if (ch) refreshAfterSync(curId);
    }, cloudErr));
    CLOUD.unsub.push(spaceRef().collection('meta').doc('look').onSnapshot(doc => {
      const first = !CLOUD.first.look; CLOUD.first.look = true;
      if (doc.exists) { if (doc.metadata.hasPendingWrites) return; const r = normLook((doc.data() || {}).look); if ((r.updated || 0) > (S.look.updated || 0)) { S.look = r; saveLook(); buildScene(); if (typeof syncStyler === 'function' && ST.open) syncStyler(); } else if (first && (S.look.updated || 0) > (r.updated || 0)) cloudPutLook(); }
      else if (first && S.look.updated) cloudPutLook();
    }, cloudErr));
  }
  function cloudPutLetter(L) { if (!CLOUD.user || !L || L.demo || !CLOUD.db) return; try { spaceRef().collection('letters').doc(L.id).set(JSON.parse(JSON.stringify(L))).catch(cloudErr); } catch (e) { cloudErr(e); } }
  function cloudDelLetter(id) { if (!CLOUD.user || !CLOUD.db) return; try { spaceRef().collection('letters').doc(id).delete().catch(cloudErr); } catch (e) { cloudErr(e); } }
  function cloudPutLook() { if (!CLOUD.user || !CLOUD.db) return; try { spaceRef().collection('meta').doc('look').set({ look: JSON.parse(JSON.stringify(S.look)) }).catch(cloudErr); } catch (e) { cloudErr(e); } }
  async function signIn() {
    if (!(await cloudInit())) return; const p = new firebase.auth.GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' });
    try { await CLOUD.auth.signInWithPopup(p); } catch (e) {
      if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment')) { try { await CLOUD.auth.signInWithRedirect(p); } catch (e2) { toast('Sign-in failed. Please try again.'); } }
      else if (e && e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') toast('Sign-in failed' + (e && e.code ? ' (' + e.code + ')' : '') + '.');
    }
  }
  function renderSync() {
    const b = $('#syncBody'); if (!b) return; b.replaceChildren();
    if (!cfgOK()) { b.append(h('p', { text: 'Sync is not set up yet, so everything is saved only on this device.' }), h('p', { class: 'small', text: 'To show your letters, replies and design on both Google accounts, add your Firebase details at the top of letters.js. The steps are written there.' })); return; }
    if (CLOUD.user) b.append(h('p', {}, 'Signed in as ', h('b', { text: CLOUD.user.email })), h('p', { class: 'small', text: 'Your letters, replies and design changes now appear on both accounts.' }), h('div', { class: 'btnrow end' }, h('button', { type: 'button', class: 'btn ghost', onclick: () => CLOUD.auth.signOut() }, 'Sign out')));
    else b.append(h('p', { text: 'Sign in with Google so your letters, replies and design show on both accounts.' }), h('div', { class: 'btnrow end' }, h('button', { type: 'button', class: 'btn primary', onclick: signIn }, 'Sign in with Google')));
  }
  function openSync() { renderSync(); openDlg($('#dlgSync')); }


  /* ---------- 15. STYLER (background, show/hide, envelope, paper design) ---------- */
  const ST = { open: false, tab: 'bg', rows: [] };
  const DCOLS = ['', '#c99a3a', '#e5809f', '#b8456f', '#d6455d', '#7a5aa8', '#5b8fd6', '#4f8f8a'];
  let lookT;
  const lookChanged = () => { S.look.updated = Date.now(); clearTimeout(lookT); lookT = setTimeout(() => { saveLook(); cloudPutLook(); }, 350); };
  function setBg(patch) { Object.assign(S.look.bg, patch); lookChanged(); if ('scene' in patch) buildScene(); else paintBg(SCENE_SVG); syncStyler(); }
  function setGHide(k, show) { const set = new Set(S.look.hide); show ? set.delete(k) : set.add(k); S.look.hide = [...set]; lookChanged(); if (k === 'cloth') buildScene(); else document.body.dataset.hide = S.look.hide.join(' '); }
  const redrawCur = () => { if (S.view === 'read') drawRead(false, true); else drawMail(); drawTop(); };
  function setL(k, v, soft) {
    const L = cur(); if (!L) return;
    if (ED.open) { setField(k, v, soft); syncStyler(); return; }
    L[k] = v; touch(L); if (soft) { clearTimeout(setL.t); setL.t = setTimeout(redrawCur, 120); } else redrawCur(); pushSoon(L); syncStyler();
  }
  /* photo: drag anywhere / resize (works while the editor or the styler is open) */
  function initPhotoDrag() {
    const host = $('#paperHost'); let d = null;
    const fig = () => host.querySelector('.p-photo');
    host.addEventListener('pointerdown', e => {
      if (!(ED.open || ST.open)) return; const f0 = e.target.closest('.p-photo'); if (!f0 || !host.contains(f0)) return;
      const L = cur(); if (!L || !L.photo) return; const pw = f0.closest('.pw'), pe = pw.querySelector('.paper'); const u = pw.getBoundingClientRect().width / 100; if (!u) return;
      e.preventDefault();
      const free = typeof L.px === 'number' && typeof L.py === 'number', fr = f0.getBoundingClientRect(), pr = pe.getBoundingClientRect();
      if (!free) { L.px = clamp((fr.left - pr.left) / u, -20, 110); L.py = clamp((fr.top - pr.top) / u, -20, 400); drawRead(false, true); }
      const f = fig(); if (!f) return; const r = f.getBoundingClientRect();
      d = { rs: !!e.target.closest('.p-rs'), x0: e.clientX, y0: e.clientY, px: L.px, py: L.py, w0: r.width, ps: L.psize || 100, u, L }; f.classList.add('drag');
    });
    document.addEventListener('pointermove', e => {
      if (!d) return; const f = fig(); if (!f) return; const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
      if (d.rs) { const ps = clamp(Math.round(d.ps * (d.w0 + dx) / d.w0), 40, 180); d.L.psize = ps; f.closest('.pw').style.setProperty('--ps', ps / 100); }
      else { d.L.px = clamp(d.px + dx / d.u, -20, 110); d.L.py = clamp(d.py + dy / d.u, -20, 400); f.style.left = f1(d.L.px) + 'cqw'; f.style.top = f1(d.L.py) + 'cqw'; }
    });
    const end = () => { if (!d) return; const L = d.L; d = null; if (ED.open) ED.dirty = true; else { touch(L); pushSoon(L); } drawRead(false, true); syncStyler(); };
    document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
  }
  /* ---------- on-page typing, own keyboard, font bar, free text boxes ---------- */
  const KB = { el: null, act: null, shift: 'off', mode: 'abc', saved: null, tShift: 0, rep: null };
  const EMOJI = ['❤️', '💕', '💖', '💗', '💘', '💝', '😍', '🥰', '😘', '😊', '😉', '😌', '🥺', '😢', '😭', '😂', '🤗', '🙈', '😇', '🌹', '🌸', '🌷', '💐', '✨', '🌙', '⭐', '🔥', '🎁', '💍', '💋', '🫶', '🙏', '👫', '🏡', '☕', '🍫', '🎶', '📖', '✉️', '🕊️'];
  const FOR_LBL = { tb: 'Text box', greet: 'Greeting', body: 'Letter text', closing: 'Closing', sign: 'Signature', note: 'Side note' };
  const HEADK = ['greet', 'sign', 'note'];
  const kbHost = () => $('#paperHost');
  const curTb = id => (ED.L && ED.L.tbs || []).find(t => t.id === id);
  function caretInfo(el) {
    const s = window.getSelection(); if (!s || !s.rangeCount) return null; const r = s.getRangeAt(0); if (!el.contains(r.startContainer)) return null;
    const pre = r.cloneRange(); pre.selectNodeContents(el); pre.setEnd(r.startContainer, r.startOffset); return { off: pre.toString().length, collapsed: r.collapsed, before: pre.toString() };
  }
  function focusCed(sel, off) {
    const el = kbHost().querySelector(sel); if (!el) return; el.focus({ preventScroll: true });
    const r = document.createRange(), tn = el.firstChild, n = off === 'end' ? (tn ? tn.length : 0) : off;
    if (tn && tn.nodeType === 3) r.setStart(tn, Math.min(n, tn.length)); else r.setStart(el, 0); r.collapse(true);
    const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
  }
  const cedValue = el => { let v = (el.innerText || '').replace(/​/g, ''); if (el.dataset.k !== 'tb') v = v.replace(/\s*\n+\s*/g, ' '); return v.trim() ? v : ''; };
  function onCedInput(el) {
    if (!ED.open) return; const k = el.dataset.k, v = cedValue(el), L = ED.L;
    if (k === 'body') { const i = +el.dataset.bi; if (i >= 0 && i < L.body.length) L.body[i] = v.slice(0, LIM.paraLen); }
    else if (k === 'tb') { const tb = curTb(el.dataset.id); if (tb) tb.t = v.slice(0, 600); }
    else L[k] = v;
    ED.dirty = true; syncEditor(); keepVisible();
  }
  function redrawKeep(sel, off) { drawRead(false, true); if (sel) focusCed(sel, off); }
  function splitPara(el) {
    const L = ED.L, i = +el.dataset.bi, ci = caretInfo(el), v = cedValue(el); if (L.body.length >= LIM.paras) return;
    const off = ci ? ci.off : v.length; L.body.splice(i, 1, v.slice(0, off), v.slice(off)); ED.dirty = true; syncEditor(); redrawKeep(`.ced[data-k=body][data-bi="${i + 1}"]`, 0);
  }
  function mergePara(el) {
    const L = ED.L, i = +el.dataset.bi, prev = L.body[i - 1] || '', cur2 = cedValue(el); L.body.splice(i - 1, 2, prev + cur2); ED.dirty = true; syncEditor(); redrawKeep(`.ced[data-k=body][data-bi="${i - 1}"]`, prev.length);
  }
  function fontOfAct() { const a = KB.act, L = ED.L; if (!a || !L) return ''; if (a.k === 'tb') { const t = curTb(a.id); return t ? t.f : L.bodyFont; } return HEADK.includes(a.k) ? L.headFont : L.bodyFont; }
  function updateBar() {
    if (!KB.el) return; const a = KB.act, L = ED.L; if (!a || !L) return; let pct;
    if (a.k === 'tb') { const t = curTb(a.id); pct = t ? t.fs : 100; } else pct = L.size;
    KB.el.querySelector('.kb-for').textContent = (FOR_LBL[a.k] || 'Text') + ' · ' + pct + '%';
    const f = fontOfAct(); $$('.kb-fonts .f', KB.el).forEach(b => b.classList.toggle('on', b.dataset.f === f));
  }
  function applyFont(f) {
    const a = KB.act, L = ED.L; if (!a || !L || !BODY_FONTS.includes(f)) return; const pw = kbHost().querySelector('.pw');
    if (a.k === 'tb') { const t = curTb(a.id); if (!t) return; t.f = f; const b = kbHost().querySelector(`.p-tb[data-id="${a.id}"]`); if (b) b.style.fontFamily = `"${f}",cursive`; }
    else if (HEADK.includes(a.k)) { L.headFont = f; if (pw) pw.style.setProperty('--hf', `"${f}"`); }
    else { L.bodyFont = f; if (pw) pw.style.setProperty('--bf', `"${f}"`); }
    ED.dirty = true; updateBar(); syncStyler(); keepVisible();
  }
  function bump(d) {
    const a = KB.act, L = ED.L; if (!a || !L) return; const pw = kbHost().querySelector('.pw');
    if (a.k === 'tb') { const t = curTb(a.id); if (!t) return; t.fs = clamp(t.fs + d * 2, 40, 300); const b = kbHost().querySelector(`.p-tb[data-id="${a.id}"]`); if (b) b.style.setProperty('--tf', t.fs / 100); }
    else { L.size = clamp(L.size + d, 60, 170); if (pw) pw.style.setProperty('--fs', L.size / 100); }
    ED.dirty = true; updateBar(); syncStyler(); keepVisible();
  }
  function keepVisible() {
    const a = KB.act; if (!a || !a.el.isConnected || !KB.el || KB.el.hidden) return; const s = window.getSelection(); let r = null;
    if (s && s.rangeCount && a.el.contains(s.anchorNode)) { const rg = s.getRangeAt(0).cloneRange(); rg.collapse(false); const rs = rg.getClientRects(); if (rs.length) r = rs[rs.length - 1]; }
    r = r || a.el.getBoundingClientRect(); const vb = innerHeight - KB.el.offsetHeight - 24, rd = READ();
    if (r.bottom > vb) rd.scrollTop += r.bottom - vb; else if (r.top < 90) rd.scrollTop -= 90 - r.top;
  }
  function placeKb() {
    if (!KB.el) return; const vv = window.visualViewport; KB.el.style.bottom = vv ? Math.max(0, innerHeight - (vv.height + vv.offsetTop)) + 'px' : '0';
    document.documentElement.style.setProperty('--kbh', KB.el.offsetHeight + 'px');
  }
  function showKb() { buildKb(); KB.el.hidden = false; KB.el.dataset.keys = ownKb() ? '1' : '0'; document.body.classList.add('lt-kb'); placeKb(); }
  function hideKb() { KB.act = null; if (KB.el) KB.el.hidden = true; document.body.classList.remove('lt-kb'); $$('.p-tb.sel', kbHost()).forEach(t => t.classList.remove('sel')); }
  function selectTb(id) { $$('.p-tb', kbHost()).forEach(t => t.classList.toggle('sel', t.dataset.id === id)); }
  function setActive(el) {
    KB.act = { el, k: el.dataset.k, id: el.dataset.id }; showKb(); selectTb(el.dataset.k === 'tb' ? el.dataset.id : null); updateBar(); autoShift(); drawKeys(); placeKb(); setTimeout(keepVisible, 60);
  }
  function autoShift() { if (KB.shift === 'lock' || !KB.act) return; const ci = caretInfo(KB.act.el), pre = ci ? ci.before : (KB.act.el.innerText || ''); const want = !pre.trim() || /[.!?]\s+$/.test(pre) ? 'once' : 'off'; if (want !== KB.shift) { KB.shift = want; drawKeys(); } }
  function ensureFocus() {
    const a = KB.act; if (!a || !a.el.isConnected) return false;
    if (document.activeElement !== a.el) { a.el.focus({ preventScroll: true }); if (KB.saved) { const s = window.getSelection(); s.removeAllRanges(); s.addRange(KB.saved); } } return true;
  }
  function typeCh(ch) {
    if (!ensureFocus()) return; if (KB.shift === 'once') { KB.shift = 'off'; drawKeys(); }
    document.execCommand('insertText', false, KB.shift !== 'off' ? ch.toUpperCase() : ch); autoShift(); keepVisible();
  }
  function keyAct(a, v) {
    if (a === 'ch') typeCh(v); else if (a === 'space') typeCh(' ');
    else if (a === 'back') { if (!ensureFocus()) return; const el = KB.act.el, ci = caretInfo(el); if (el.dataset.k === 'body' && +el.dataset.bi > 0 && ci && ci.collapsed && ci.off === 0) { mergePara(el); return; } document.execCommand('delete'); autoShift(); keepVisible(); }
    else if (a === 'enter') { if (!ensureFocus()) return; const k = KB.act.k; if (k === 'body') splitPara(KB.act.el); else if (k === 'tb') document.execCommand('insertText', false, '\n'); else { document.activeElement.blur(); hideKb(); } autoShift(); keepVisible(); }
    else if (a === 'shift') { const t = Date.now(); if (t - KB.tShift < 350) KB.shift = 'lock'; else KB.shift = KB.shift === 'off' ? 'once' : 'off'; KB.tShift = t; drawKeys(); }
    else if (a === 'mode') { KB.mode = v; drawKeys(); placeKb(); setTimeout(keepVisible, 30); }
  }
  const KLAYOUT = {
    abc: [['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'], ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'], ['⇧', 'z', 'x', 'c', 'v', 'b', 'n', 'm', '⌫']],
    sym: [['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'], ['-', '/', ':', ';', '(', ')', '&', '@', '"'], ['♥', '.', ',', '?', '!', "'", '~', '%', '⌫']]
  };
  function drawKeys() {
    if (!KB.el) return; const box = KB.el.querySelector('.kb-keys'); box.replaceChildren();
    const key = (label, a, v, cls = '') => h('button', { type: 'button', class: 'kb-key ' + cls, 'data-a': a, 'data-v': v == null ? '' : v, text: label });
    if (KB.mode === 'emoji') {
      const g = h('div', { class: 'kb-emo' }, EMOJI.map(e => h('button', { type: 'button', class: 'ek', text: e, onclick: () => { ensureFocus() && document.execCommand('insertText', false, e); keepVisible(); } })));
      box.append(g, h('div', { class: 'kb-row' }, key('ABC', 'mode', 'abc', 'w'), key('123', 'mode', 'sym', 'w'), key('space', 'space', '', 'sp'), key('⌫', 'back', '', 'w'))); return;
    }
    KLAYOUT[KB.mode].forEach(row => box.append(h('div', { class: 'kb-row' }, row.map(c => {
      if (c === '⇧') return key('⇧', 'shift', '', 'w' + (KB.shift === 'off' ? '' : ' on') + (KB.shift === 'lock' ? ' lock' : ''));
      if (c === '⌫') return key('⌫', 'back', '', 'w');
      return key(KB.mode === 'abc' && KB.shift !== 'off' ? c.toUpperCase() : c, 'ch', c);
    }))));
    box.append(h('div', { class: 'kb-row' }, key(KB.mode === 'abc' ? '123' : 'ABC', 'mode', KB.mode === 'abc' ? 'sym' : 'abc', 'w'), key('😊', 'mode', 'emoji', 'w'), key(',', 'ch', ','), key('space', 'space', '', 'sp'), key('.', 'ch', '.'), key('↵', 'enter', '', 'w')));
  }
  function buildKb() {
    if (KB.el) return; const el = h('div', { id: 'olwKb', hidden: true, 'data-keys': '1' });
    const top = h('div', { class: 'kb-top' }, h('span', { class: 'kb-for' }),
      h('button', { type: 'button', class: 'kb-btn', title: 'Smaller text', text: 'A−', onclick: () => bump(-5) }), h('button', { type: 'button', class: 'kb-btn', title: 'Bigger text', text: 'A+', onclick: () => bump(5) }),
      h('button', { type: 'button', class: 'kb-btn', text: '+ Text', title: 'Add a text box', onclick: addTb }),
      h('button', { type: 'button', class: 'kb-btn kb-nat', title: 'Use the phone keyboard instead', text: '⌨', onclick: toggleNative }),
      h('button', { type: 'button', class: 'kb-btn pri', text: 'Done', onclick: () => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); hideKb(); } }));
    const fonts = h('div', { class: 'kb-fonts' }); [['Simple', FONT_SIMPLE], ['Handwriting', FONT_HAND], ['Script', FONT_SCRIPT]].forEach(([n, list]) => { fonts.append(h('span', { class: 'g', text: n })); list.forEach(f => fonts.append(h('button', { type: 'button', class: 'f', 'data-f': f, style: `font-family:"${f}",cursive`, text: f, onclick: () => applyFont(f) }))); });
    el.append(top, fonts, h('div', { class: 'kb-keys' }));
    el.addEventListener('mousedown', e => e.preventDefault());
    el.addEventListener('pointerdown', e => {
      const b = e.target.closest('.kb-key'); if (!b) return; e.preventDefault(); const a = b.dataset.a, v = b.dataset.v; keyAct(a, v);
      if (a === 'back') { clearTimeout(KB.rep); let n = 0; const go = () => { keyAct('back'); KB.rep = setTimeout(go, n++ > 6 ? 40 : 70); }; KB.rep = setTimeout(go, 380); }
    });
    const stop = () => clearTimeout(KB.rep); document.addEventListener('pointerup', stop); document.addEventListener('pointercancel', stop);
    document.body.append(el); KB.el = el;
    if (window.visualViewport) { window.visualViewport.addEventListener('resize', placeKb); window.visualViewport.addEventListener('scroll', placeKb); }
    window.addEventListener('resize', () => { if (KB.el && !KB.el.hidden) { KB.el.dataset.keys = ownKb() ? '1' : '0'; placeKb(); } });
  }
  function toggleNative() {
    try { localStorage.setItem(NATIVE_KEY, nativeKb() ? '0' : '1'); } catch (er) { }
    toast(nativeKb() ? 'Phone keyboard on' : 'Letter keyboard on'); const a = KB.act; if (!a) return;
    $$('.ced', kbHost()).forEach(c => (c.inputMode = ownKb() ? 'none' : 'text')); KB.el.dataset.keys = ownKb() ? '1' : '0'; a.el.blur(); setTimeout(() => { a.el.focus({ preventScroll: true }); placeKb(); }, 60);
  }
  function addTb() {
    if (!ED.open) return; const L = ED.L; L.tbs = L.tbs || []; if (L.tbs.length >= 12) return toast('You can add up to 12 text boxes.');
    const pw = kbHost().querySelector('.pw'), pe = kbHost().querySelector('.paper'); if (!pw || !pe) return;
    const u = pw.getBoundingClientRect().width / 100, pr = pe.getBoundingClientRect(), vy = isPhone() ? innerHeight * .3 : innerHeight * .4;
    const tb = normTb({ id: uid(), t: '', x: 16 + (L.tbs.length % 3) * 5, y: clamp((vy - pr.top) / u, 6, Math.max(6, pr.height / u - 26)), w: 56, fs: 110, f: L.bodyFont }); L.tbs.push(tb); ED.dirty = true; drawRead(false, true); focusCed(`.p-tb[data-id="${tb.id}"] .ced`, 0);
  }
  function initPageEdit() {
    const host = kbHost(); let td = null, lastTap = { t: 0, x: 0, y: 0 };
    host.addEventListener('focusin', e => { const el = e.target.closest && e.target.closest('.ced'); if (el && ED.open) setActive(el); });
    host.addEventListener('focusout', () => setTimeout(() => { if (!KB.act) return; const a = document.activeElement; if (a && a.closest && (a.closest('.ced') || a.closest('#olwKb'))) return; hideKb(); }, 220));
    host.addEventListener('input', e => { const el = e.target.closest && e.target.closest('.ced'); if (el) onCedInput(el); });
    host.addEventListener('beforeinput', e => {
      const el = e.target.closest && e.target.closest('.ced'); if (!el || !ED.open) return; const k = el.dataset.k, t = e.inputType;
      if (t === 'insertParagraph' || t === 'insertLineBreak') { if (k === 'tb') return; e.preventDefault(); if (k === 'body') splitPara(el); return; }
      if (t === 'deleteContentBackward' && k === 'body' && +el.dataset.bi > 0) { const ci = caretInfo(el); if (ci && ci.collapsed && ci.off === 0) { e.preventDefault(); mergePara(el); } }
    });
    host.addEventListener('paste', e => { const el = e.target.closest && e.target.closest('.ced'); if (!el) return; e.preventDefault(); let t = (e.clipboardData || window.clipboardData).getData('text/plain') || ''; if (el.dataset.k !== 'tb') t = t.replace(/\s*\n+\s*/g, ' '); document.execCommand('insertText', false, t); });
    document.addEventListener('selectionchange', () => { const a = KB.act; if (!a) return; const s = window.getSelection(); if (s && s.rangeCount && a.el.contains(s.anchorNode)) KB.saved = s.getRangeAt(0).cloneRange(); });
    /* text box handles */
    host.addEventListener('pointerdown', e => {
      const t = e.target.closest && e.target.closest('.tmv,.trs,.tdl'); if (!t || !ED.open) return; const box = t.closest('.p-tb'), tb = curTb(box.dataset.id); if (!tb) return; e.preventDefault(); selectTb(tb.id);
      if (t.classList.contains('tdl')) { ED.L.tbs = ED.L.tbs.filter(x => x !== tb); ED.dirty = true; hideKb(); drawRead(false, true); return; }
      td = { tb, box, u: box.closest('.pw').getBoundingClientRect().width / 100 || 3.5, mv: t.classList.contains('tmv'), x0: e.clientX, y0: e.clientY, x: tb.x, y: tb.y, w: tb.w };
    });
    document.addEventListener('pointermove', e => {
      if (!td) return; const dx = (e.clientX - td.x0) / td.u, dy = (e.clientY - td.y0) / td.u;
      if (td.mv) { td.tb.x = clamp(td.x + dx, 4, 96 - Math.min(td.tb.w, 90)); td.tb.y = clamp(td.y + dy, 4, 500); td.box.style.left = f1(td.tb.x) + 'cqw'; td.box.style.top = f1(td.tb.y) + 'cqw'; }
      else { td.tb.w = clamp(td.w + dx, 12, 96 - td.tb.x); td.box.style.width = f1(td.tb.w) + 'cqw'; }
    });
    const tdEnd = () => { if (!td) return; td = null; ED.dirty = true; };
    document.addEventListener('pointerup', tdEnd); document.addEventListener('pointercancel', tdEnd);
    /* double tap / double click a letter (when not editing) opens the editor right at that text */
    const openAt = e => {
      if (ED.open || ST.open || S.view !== 'read') return; const L = cur(); if (!L) return; const t = e.target; let sel = '.ced[data-k=body]';
      const tbx = t.closest('.p-tb'), pp = t.closest('.p-body p[data-bi]');
      if (tbx) sel = `.p-tb[data-id="${tbx.dataset.id}"] .ced`; else if (pp) sel = `.ced[data-k=body][data-bi="${pp.dataset.bi}"]`; else if (t.closest('.p-greet')) sel = '.ced[data-k=greet]'; else if (t.closest('.p-close')) sel = '.ced[data-k=closing]'; else if (t.closest('.p-sign')) sel = '.ced[data-k=sign]'; else if (t.closest('.p-note')) sel = '.ced[data-k=note]'; else if (!t.closest('.paper')) return;
      openEditor(L, false); setTimeout(() => focusCed(sel, 'end'), 120);
    };
    host.addEventListener('dblclick', openAt);
    host.addEventListener('pointerup', e => { if (e.pointerType !== 'touch') return; const n = Date.now(); if (n - lastTap.t < 360 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 30) { lastTap.t = 0; openAt(e); } else lastTap = { t: n, x: e.clientX, y: e.clientY }; });
    F('tbAdd').addEventListener('click', addTb);
  }
  const photoFree = L => typeof L.px === 'number' && typeof L.py === 'number';
  function setLHide(k, show) { const L = cur(); if (!L) return; const set = new Set(L.hide || []); show ? set.delete(k) : set.add(k); setL('hide', [...set]); }
  function toggleRow(label, get, set) { const inp = h('input', { type: 'checkbox' }); inp.addEventListener('change', () => set(inp.checked)); const r = h('label', { class: 'tg' }, inp, h('span', { text: label })); ST.rows.push(() => (inp.checked = !!get())); return r; }
  const chipRow = (id, items, fn, cls = 'chip') => F(id).replaceChildren(...items.map(([k, n, css]) => h('button', { type: 'button', class: cls, 'data-v': k, title: n, style: css || '', text: cls === 'chip' ? n : '', onclick: () => fn(k) })));
  function buildStyler() {
    chipRow('sBgType', [['scene', 'Velvet scene'], ['solid', 'Colour'], ['gradient', 'Gradient'], ['photo', 'Photo']], k => setBg({ type: k }));
    chipRow('sScene', Object.entries(SCENES).map(([k, s]) => [k, s.n, `--c:${s.v[0]};--c2:${s.v[2]}`]), k => setBg({ scene: k }), 'sw');
    F('sBgPhoto').addEventListener('click', () => $('#fileBg').click()); F('sBgPhotoRm').addEventListener('click', () => setBg({ img: '' }));
    $('#fileBg').addEventListener('change', async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; try { setBg({ img: await imageToDataURL(f, 1280, .74, 640 * 1024), type: 'photo' }); } catch (er) { toast(er.message); } });
    F('sC1').addEventListener('input', e => setBg({ c1: e.target.value })); F('sC2').addEventListener('input', e => setBg({ c2: e.target.value }));
    [['sAngle', 'angle'], ['sBlur', 'blur'], ['sDim', 'dim']].forEach(([id, k]) => F(id).addEventListener('input', e => setBg({ [k]: +e.target.value })));
    F('sBgReset').addEventListener('click', () => { S.look = Object.assign(blankLook(), { updated: Date.now() }); lookChanged(); buildScene(); syncStyler(); toast('Background reset'); });
    F('sShowG').replaceChildren(...GHIDE.map(([k, n]) => toggleRow(n, () => !S.look.hide.includes(k), on => setGHide(k, on))));
    F('sShowAll').addEventListener('click', () => { S.look.hide = []; lookChanged(); buildScene(); syncStyler(); });
    chipRow('sEnv', Object.entries(ENVS).map(([k, e]) => [k, e[3], `--c:${e[0]};--c2:${e[2]}`]), k => setL('env', k), 'sw');
    chipRow('sFloral', Object.entries(FLORALS), k => setL('floral', k)); chipRow('sSeal', Object.entries(SEALS), k => setL('seal', k));
    F('sMono').addEventListener('input', e => setL('mono', e.target.value.slice(0, 2), true));
    F('sShowE').replaceChildren(...LHIDE.filter(a => ['envflor', 'seal'].includes(a[0])).map(([k, n]) => toggleRow(n, () => !((cur() || {}).hide || []).includes(k), on => setLHide(k, on))));
    chipRow('sDesign', Object.entries(LDESIGNS), k => { setL('design', k); if (DEF_INK[k]) setL('ink', DEF_INK[k]); });
    chipRow('sDcol', DCOLS.map(c => [c, c || 'Auto', `--c:${c || '#fff'};--c2:${c || '#e8d4dc'}`]), k => setL('dcol', k), 'sw');
    F('sDcolC').addEventListener('input', e => setL('dcol', e.target.value, true));
    chipRow('sPaper', Object.entries(PAPERS).map(([k, p]) => [k, p[2], `--c:${p[0]};--c2:${p[1]}`]), k => setL('paper', k), 'sw');
    chipRow('sInk', INKS.map(c => [c, c, `--c:${c};--c2:${c}`]), k => setL('ink', k), 'sw'); F('sInkC').addEventListener('input', e => setL('ink', e.target.value, true));
    F('sBodyFont').replaceChildren(...BODY_FONTS.map(f => h('option', { value: f, text: f, style: `font-family:"${f}"` }))); F('sHeadFont').replaceChildren(...HEAD_FONTS.map(f => h('option', { value: f, text: f, style: `font-family:"${f}"` })));
    F('sBodyFont').addEventListener('change', e => setL('bodyFont', e.target.value)); F('sHeadFont').addEventListener('change', e => setL('headFont', e.target.value));
    F('sSize').addEventListener('input', e => setL('size', +e.target.value, true));
    F('sPr').addEventListener('input', e => setL('prot', +e.target.value, true)); F('sPrReset').addEventListener('click', () => setL('prot', null));
    F('sPover').addEventListener('change', e => { const L = cur(); if (!L) return; if (e.target.checked && !photoFree(L)) { setL('px', 52, true); setL('py', 14, true); } setL('pover', e.target.checked); });
    F('sPfree').addEventListener('click', () => { const L = cur(); if (!L) return; if (photoFree(L)) { setL('px', null, true); setL('py', null, true); setL('pover', false); } else { setL('px', 52, true); setL('py', 14, true); setL('pover', false); } });
    F('sPs').addEventListener('input', e => setL('psize', +e.target.value, true)); F('sPl').addEventListener('input', e => setL('plen', +e.target.value, true)); F('sTape').addEventListener('change', e => setL('ptape', e.target.checked));
    const pre = (id, key, items) => F(id).replaceChildren(...items.map(([n, v]) => h('button', { type: 'button', class: 'chip', 'data-v': v, text: n, onclick: () => setL(key, v) })));
    pre('sPsPre', 'psize', [['Tiny', 60], ['Small', 80], ['Medium', 100], ['Big', 135], ['Huge', 170]]);
    pre('sPlPre', 'plen', [['Fit text', 40], ['Square', 80], ['Normal', 100], ['Long', 150], ['Extra long', 210]]);
    F('sShowP').replaceChildren(...LHIDE.filter(a => !['envflor', 'seal'].includes(a[0])).map(([k, n]) => toggleRow(n, () => !((cur() || {}).hide || []).includes(k), on => setLHide(k, on))));
    F('sPrev').addEventListener('click', () => { if (S.view === 'mail') { setView('read'); drawRead(false); } });
    $$('#styler [data-t]').forEach(b => b.addEventListener('click', () => setTab(b.dataset.t)));
    F('stClose').addEventListener('click', closeStyler); F('stFold').addEventListener('click', () => F('styler').classList.toggle('folded'));
  }
  function setTab(t) { ST.tab = t; $$('#styler [data-t]').forEach(b => b.classList.toggle('on', b.dataset.t === t)); $$('#styler [data-p]').forEach(p => (p.hidden = p.dataset.p !== t)); F('styler').querySelector('.ed-scroll').scrollTop = 0; }
  function openStyler(tab) { ST.open = true; F('styler').hidden = false; F('styler').classList.remove('folded'); document.body.classList.add('lt-styling'); if (tab) setTab(tab); else setTab(ST.tab); syncStyler(); }
  function closeStyler() { ST.open = false; F('styler').hidden = true; document.body.classList.remove('lt-styling'); }
  function syncStyler() {
    if (!ST.open) return; const B = S.look.bg, L = cur();
    const on = (id, val) => $$('[data-v]', F(id)).forEach(b => b.classList.toggle('on', String(b.dataset.v).toLowerCase() === String(val).toLowerCase()));
    on('sBgType', B.type); on('sScene', B.scene);
    $$('#styler [data-for]').forEach(e => (e.hidden = !e.dataset.for.split(' ').includes(B.type)));
    F('sC1').value = B.c1; F('sC2').value = B.c2; F('sAngle').value = B.angle; F('sBlur').value = B.blur; F('sDim').value = B.dim; F('sBlurO').textContent = B.blur + ' px'; F('sDimO').textContent = B.dim + '%'; F('sBgPhotoRm').hidden = !B.img;
    ST.rows.forEach(f => f());
    F('sPrev').hidden = S.view !== 'mail';
    if (!L) return; F('sHint').textContent = 'Changing: ' + (L.greet || L.tag || 'this letter');
    on('sEnv', L.env); on('sFloral', L.floral); on('sSeal', L.seal); on('sDesign', L.design); on('sDcol', L.dcol || ''); on('sPaper', L.paper); on('sInk', L.ink); on('sPsPre', L.psize); on('sPlPre', L.plen);
    if (document.activeElement !== F('sMono')) F('sMono').value = L.mono; F('sDcolC').value = isHex(L.dcol) ? L.dcol : (DEF_DCOL[L.design] || '#b8456f'); F('sInkC').value = L.ink;
    F('sBodyFont').value = L.bodyFont; F('sHeadFont').value = L.headFont; F('sSize').value = L.size; F('sSizeO').textContent = L.size + '%'; F('sPs').value = L.psize; F('sPsO').textContent = L.psize + '%'; F('sPl').value = L.plen; F('sPlO').textContent = L.plen + '%'; F('sTape').checked = L.ptape !== false; F('sPr').value = typeof L.prot === 'number' ? L.prot : 2; F('sPrO').textContent = (typeof L.prot === 'number' ? Math.round(L.prot) : 'auto') + (typeof L.prot === 'number' ? '°' : ''); F('sPover').checked = !!L.pover && photoFree(L); F('sPfree').textContent = photoFree(L) ? 'Put photo back beside the text' : 'Free move photo (drag it on the page)';
    F('sSaveNote').textContent = CLOUD.user ? 'Saved and shown on both Google accounts.' : 'Saved on this device. Turn on Google sync (menu) to show it on both accounts.';
  }


  /* ---------- 16. INIT ---------- */
  async function init() {
    await DB.open();
    const arr = await DB.get('letters'); S.prefs = Object.assign({ from: '' }, await DB.get('prefs')); S.look = normLook(await DB.get('look'));
    S.letters = (Array.isArray(arr) ? arr : []).slice(0, LIM.letters).map(normLetter).filter(l => !l.demo);
    if (!S.letters.length) S.letters = [demoLetter()]; sortLetters(); S.idx = S.letters.length - 1;
    document.body.insertAdjacentHTML('afterbegin', globalDefs()); textures(); buildScene(); buildFx(); buildEditor(); buildStyler();
    $('#orL').innerHTML = laurel(false); $('#orR').innerHTML = laurel(true); $('#orDiv').innerHTML = divider(); $('#tagDiv').innerHTML = divider(); $('#goIco').innerHTML = ico('mail'); $('#goArr').innerHTML = ico('arrow');
    $('#flL').innerHTML = cornerFloral('plum', 91, .9); $('#flR').innerHTML = cornerFloral('plum', 92, .9); hydrate();
    bind(); setView('mail'); drawMail(); drawTop(); document.body.classList.add('ready');
    $('#brush').addEventListener('click', () => openStyler());
    window.__letters = { S, ED, ST, openLetter, newLetter, openEditor, setField, saveEditor, openStyler, setBg, setL, setLHide, setGHide, CLOUD, buildScene };
    if (cfgOK()) cloudInit();
  }
  init();
})();

