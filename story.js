/* Our Little World - Story page logic.
   Abhi backend/login nahi: diary browser ke IndexedDB mein save hoti hai. Backend ke baad sirf "STORAGE" section aur ROLE badalna hai. */

/* =====================================================================
   OUR LITTLE WORLD - STORY (diary) page
   Files: story.html + story.css + story.js (Home ki home.css bhi link hoti hai: theme + buttons + dialogs)
   NOTE: Abhi backend/login connect nahi hai. Diary isi browser ki IndexedDB mein save hoti hai
   (draft / published / pichla published alag alag). Backend aane par sirf neeche "STORAGE" wala hissa badalna hai.
   ===================================================================== */
(() => {
  'use strict';

  /* ---------------------------------------------------------------
     0. CONFIG  (dusre pages se connect karne ke liye yahi do jagah badlein)
     --------------------------------------------------------------- */
  /* ME = main kaun hoon ('owner' | 'partner'; sync login se aata hai, login na ho to 'owner').
     VIEW = abhi kis ki diary khuli hai (Mine ya Her). Likh sirf apni diary sakte hain: canEdit() = VIEW === ME. */
  let ME = 'owner', VIEW = 'owner';
  const otherOf = r => (r === 'owner' ? 'partner' : 'owner');
  const canEdit = () => VIEW === ME;
  const kk = (name, who) => ((who || VIEW) === 'owner' ? name : name + ':partner');   // owner ke purane keys wahi rehte hain (data safe)
  const TZ = 'Asia/Karachi';
  const BUILT_PAGES = { home: true, story: true, gallery: true, letters: true, chat: true };   // jaise pages ban jayen: gallery:true, letters:true, questions:true
  const PAGE_URL = { home: 'index.html', story: 'story.html', gallery: 'gallery.html', letters: 'letters.html', chat: 'messages.html' };
  const PAGE_NAMES = { gallery: 'Gallery', letters: 'Letters', chat: 'Chat' };
  const LIM = { pages: 400, photos: 6, decos: 30, zones: 8, paras: 60, paraLen: 4000, title: 90, imgBytes: 8 * 1024 * 1024, imgPx: 1400, importBytes: 80 * 1024 * 1024 };
  const ASPECT = 0.714;                       // page width / height

  /* ---------------------------------------------------------------
     1. HELPERS
     --------------------------------------------------------------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const pad2 = n => String(n).padStart(2, '0');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = (p = 'x') => p + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
  const clone = o => JSON.parse(JSON.stringify(o));
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  function rng(seed) {                         // mulberry32 (seeded random => har page ka look hamesha ek jaisa)
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function h(tag, props, ...kids) {            // tiny DOM builder
    const e = document.createElement(tag);
    if (props) for (const k in props) {
      const v = props[k]; if (v == null || v === false) continue;
      if (k === 'class') e.className = v; else if (k === 'style') e.style.cssText = v;
      else if (k === 'html') e.innerHTML = v; else if (k === 'text') e.textContent = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat()) { if (c == null || c === false) continue; e.append(c.nodeType ? c : document.createTextNode(c)); }
    return e;
  }
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function parseISO(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); if (!m) return null;
    const y = +m[1], mo = +m[2], d = +m[3], dt = new Date(Date.UTC(y, mo - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d ? { y, mo, d } : null;
  }
  const fmtDate = iso => { const p = parseISO(iso); return p ? `${p.d} ${MONTHS[p.mo - 1]} ${p.y}` : ''; };
  const todayISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
  const timeNow = () => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(new Date());
  const stripHtml = s => { const d = document.createElement('div'); d.innerHTML = cleanHtml(s); return d.textContent || ''; };
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'off';

  let toastTimer;
  function toast(msg, ms = 3000) {
    const el = $('#toast'); el.textContent = msg; el.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => (el.hidden = true), ms);
  }

  /* ---------------------------------------------------------------
     2. OPTIONS (cover colours, paper, fonts ...)
     --------------------------------------------------------------- */
  const COVERS = { lavender: '#8f7db8', pink: '#e58fb1', blush: '#f3bccd', rose: '#c4617f', red: '#b3283f', burgundy: '#7b2d48', coral: '#e8806c', navy: '#2f3d6b', teal: '#2f7f86', sage: '#8aa384', forest: '#3f5c48', brown: '#6d4a2e', black: '#2c2a33', cream: '#e6dac1' };
  const COVER_NAMES = { lavender: 'Lavender', pink: 'Pink', blush: 'Blush', rose: 'Rose', red: 'Red', burgundy: 'Burgundy', coral: 'Coral', navy: 'Navy', teal: 'Teal', sage: 'Sage', forest: 'Forest', brown: 'Brown', black: 'Black', cream: 'Cream' };
  const FOILS = { gold: ['#fff0b8', '#e0b85a', '#a97c22'], silver: ['#ffffff', '#d4d8e0', '#8c93a3'], rose: ['#ffe9e4', '#e6a99b', '#b36e63'], white: ['#ffffff', '#f6f2ee', '#cfc7be'], none: null };
  const FINISHES = { leather: 'Leather', linen: 'Linen cloth', velvet: 'Velvet' };
  const RIBBONS = { purple: '#7a5bb0', pink: '#e05a8c', rose: '#c0607f', gold: '#c9a24a', teal: '#3d8a8c', red: '#a3263a', white: '#f4efe8' };
  const PAPERS = { cream: ['#f8f0de', '#ecdcbc'], white: ['#fcf9f3', '#efe9dd'], pink: ['#fcebf0', '#f0cdd9'], blush: ['#f9ebe6', '#eed5cc'], lavender: ['#f3eef6', '#e2d8ea'], sage: ['#eef2e6', '#d6e0c6'], kraft: ['#e8d4b0', '#d3b98a'], night: ['#4a4560', '#383450'] };
  const PAPER_NAMES = { cream: 'Cream', white: 'White', pink: 'Pink', blush: 'Blush', lavender: 'Lavender', sage: 'Sage', kraft: 'Kraft', night: 'Night' };
  const INKS = ['#5b3f93', '#a23a62', '#2d3b5a', '#5a3b24', '#7a2142', '#2f5a3d', '#3a3a44', '#f1e8d8'];
  const HEAD_FONTS = ['Kaushan Script', 'Sacramento', 'Dancing Script', 'Great Vibes', 'Mrs Saint Delafield', 'La Belle Aurore', 'Allura', 'Caveat', 'Pacifico', 'Parisienne', 'Satisfy', 'Yellowtail', 'Cookie', 'Courgette', 'Lobster', 'Marck Script', 'Playball', 'Rouge Script', 'Alex Brush', 'Tangerine', 'Pinyon Script', 'Italianno', 'Mr Dafoe', 'Norican', 'Kristi', 'Birthstone', 'Fleur De Leah', 'Over the Rainbow', 'Gloria Hallelujah', 'Reenie Beanie', 'Playfair Display', 'Cinzel', 'Abril Fatface'];
  const BODY_FONTS = ['Caveat', 'Kalam', 'Patrick Hand', 'Indie Flower', 'Handlee', 'Shadows Into Light', 'Cormorant Garamond', 'Zeyada', 'Gloria Hallelujah', 'Reenie Beanie', 'Nothing You Could Do', 'Covered By Your Grace', 'Over the Rainbow'];
  const BG_TYPES = { knit: 'Knit blanket', wood: 'Wooden desk', linen: 'Linen cloth', solid: 'Solid colour', gradient: 'Gradient', photo: 'My photo' };
  const isHex = v => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
  const mixHex = (a, b, t) => { const f = x => [1, 3, 5].map(i => parseInt(x.slice(i, i + 2), 16)), A = f(a), B = f(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  const paperPair = v => PAPERS[v] || (isHex(v) ? [mixHex(v, '#ffffff', .35), mixHex(v, '#000000', .06)] : PAPERS.cream);
  const coverHex = v => COVERS[v] || (isHex(v) ? v : COVERS.lavender);
  const ribbonHex = v => RIBBONS[v] || (isHex(v) ? v : RIBBONS.purple);
  const TAPES = ['lavender', 'pink', 'yellow', 'mint', 'none'];
  const SIDES = ['left', 'right', 'center'];
  /* Decor library: grouped, har ek ka naam aur default width */
  const DECO_GROUPS = [
    ['Flowers', { lavender: 'Lavender sprig', flowers: 'Bouquet', blossom: 'Blossom', rose: 'Rose', peony: 'Peony', daisy: 'Daisy', tulip: 'Tulip', cherry: 'Cherry blossom branch', wild: 'Wildflowers', sprig: 'Leaf sprig', wreath: 'Flower wreath' }],
    ['Hearts & love', { hearts: 'Heart outlines', heart: 'Glossy heart', balloons: 'Heart balloons', garland: 'Heart garland', envelope: 'Love letter', seal: 'Wax seal' }],
    ['Sky & sparkle', { sparkle: 'Sparkles', stars: 'Stars', moon: 'Moon & stars', cloud: 'Cloud', rainbow: 'Rainbow' }],
    ['Cute things', { butterfly: 'Butterfly', bow: 'Ribbon bow', coffee: 'Coffee cup', strawberry: 'Strawberry', cupcake: 'Cupcake', feather: 'Feather', pearls: 'Pearl strand' }],
    ['Paper & words', { note: 'Torn note', sticky: 'Sticky note', ticket: 'Ticket', tag: 'Hanging tag', banner: 'Ribbon banner', bubble: 'Speech bubble', text: 'Handwritten text', stamp: 'Postage stamp', postmark: 'Postmark' }],
    ['Tape & craft', { tape: 'Washi tape', washi: 'Patterned washi', lace: 'Lace ribbon', doily: 'Lace doily', clip: 'Paper clip', pin: 'Push pin' }]
  ];
  const DECO_TYPES = Object.assign({}, ...DECO_GROUPS.map(g => g[1]));
  const TEXT_DECOS = { note: 1, sticky: 1, ticket: 1, tag: 1, banner: 1, bubble: 1, text: 1, postmark: 1 };
  const DECO_DEFAULT_W = { lavender: 17, flowers: 30, blossom: 11, hearts: 14, note: 30, tape: 22, sparkle: 12, rose: 20, peony: 22, daisy: 16, tulip: 14, cherry: 34, wild: 26, sprig: 15, wreath: 36, heart: 14, balloons: 20, garland: 40, envelope: 26, seal: 14, stars: 18, moon: 20, cloud: 26, rainbow: 36, butterfly: 20, bow: 22, coffee: 22, strawberry: 14, cupcake: 18, feather: 12, pearls: 30, sticky: 26, ticket: 38, tag: 22, banner: 40, bubble: 32, text: 40, stamp: 18, postmark: 22, washi: 26, lace: 44, doily: 30, clip: 7, pin: 8 };
  const DECO_TEXT = { note: 'Write a note here...', sticky: 'Remember this...', ticket: 'ADMIT ONE ♡', tag: 'For you', banner: 'Our story', bubble: 'I love you', text: 'Written with love', postmark: 'WITH LOVE' };
  /* Decor colour sets (har sticker 8 colours mein badal sakta hai) */
  const PALS = [
    { n: 'Rose pink', a: '#e8799f', l: '#fbd0de', d: '#b8416c', e: '#ffd9a0' },
    { n: 'Lavender', a: '#a98bd8', l: '#e3d6f6', d: '#6f50a8', e: '#ffe29a' },
    { n: 'Peach', a: '#f29a82', l: '#ffd9cb', d: '#c4604a', e: '#fff0b3' },
    { n: 'Baby blue', a: '#7fb2e5', l: '#d6e8fa', d: '#4a7fb8', e: '#ffe9a8' },
    { n: 'Red', a: '#d9344f', l: '#f7b3be', d: '#98162f', e: '#ffd36b' },
    { n: 'Sage', a: '#8fbf9f', l: '#d4ebdb', d: '#4f8a67', e: '#ffe0a3' },
    { n: 'Gold', a: '#d9ad4c', l: '#f6e3ae', d: '#9a721c', e: '#fff6d0' },
    { n: 'Cream', a: '#f1e8dc', l: '#ffffff', d: '#b8a68e', e: '#e8c9d3' }
  ];
  const LINE_STYLES = { none: 'No lines', ruled: 'Ruled', double: 'Double line', dashed: 'Dashed', dotted: 'Dotted', dots: 'Dot grid', grid: 'Grid', graph: 'Graph paper' };
  const FRAMES = { polaroid: 'Polaroid', round: 'Round', heart: 'Heart', arch: 'Arch window', film: 'Film strip', plain: 'Simple border' };
  const HD_STYLES = { none: 'Plain', underline: 'Wavy underline', swash: 'Flourish', hearts: 'Hearts', stars: 'Sparkles', highlight: 'Marker highlight', box: 'Dashed box', ribbon: 'Ribbon' };
  const DESIGNS = { none: 'Plain paper', rosecorner: 'Rose corners', vine: 'Botanical vine', watercolor: 'Watercolour wash', frame: 'Elegant frame', lace: 'Lace edge', hearts: 'Heart border', gingham: 'Gingham bands', airmail: 'Airmail border', stars: 'Starry night', polka: 'Polka dots', cherry: 'Cherry blossom', torn: 'Torn paper header', bow: 'Cute bow', pressed: 'Pressed flowers', butterflies: 'Butterflies' };

  /* ---------------------------------------------------------------
     3. TEXT SAFETY  (sirf b / i / u / mark / br allowed)
     --------------------------------------------------------------- */
  function cleanHtml(html, max = LIM.paraLen) {
    const doc = new DOMParser().parseFromString('<body>' + String(html || '') + '</body>', 'text/html');
    let out = '';
    (function walk(node) {
      node.childNodes.forEach(n => {
        if (n.nodeType === 3) { out += esc(n.nodeValue.replace(/ /g, ' ')); return; }
        if (n.nodeType !== 1) return;
        const t = n.tagName.toLowerCase();
        const bg = (n.getAttribute('style') || '').toLowerCase();
        const tag = (t === 'b' || t === 'strong') ? 'b' : (t === 'i' || t === 'em') ? 'i' : t === 'u' ? 'u'
          : (t === 'mark' || (t === 'span' && /background/.test(bg))) ? 'mark' : t === 'br' ? 'br' : '';
        if (t === 'script' || t === 'style') return;
        if (tag === 'br') { out += '<br>'; return; }
        if (tag) { out += `<${tag}>`; walk(n); out += `</${tag}>`; }
        else { walk(n); if (/^(div|p|li)$/.test(t)) out += '<br>'; }
      });
    })(doc.body);
    out = out.replace(/(<br>)+$/g, '').replace(/<(b|i|u|mark)><\/\1>/g, '');
    const plainLen = stripTags(out).length;
    if (plainLen > max) out = esc(stripTags(out).slice(0, max));
    return out;
  }
  const stripTags = s => String(s).replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  const cleanText = (s, max) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
  const okDataUrl = s => typeof s === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s);
  const okId = s => typeof s === 'string' && /^[A-Za-z0-9:_-]{1,40}$/.test(s);
  const num = (v, a, b, d) => { v = +v; return Number.isFinite(v) ? clamp(v, a, b) : d; };
  const pick = (v, list, d) => (list.includes(v) ? v : d);

  /* ---------------------------------------------------------------
     4. DATA MODEL
     --------------------------------------------------------------- */
  const blankBg = () => ({ type: 'knit', color: '#f1e6d2', color2: '#cdb6d6', blur: 0, dim: 0, flowers: true, glow: true, img: '' });
  const blankLines = () => ({ style: 'none', gap: 100, w: 22, color: '', op: 34, off: 0, margin: false, mcolor: '#e57a9a', fill: 'page' });
  const blankLook = () => ({ paper: 'cream', ink: INKS[0], headFont: 'Kaushan Script', bodyFont: 'Caveat', size: 100, leading: 100, lines: blankLines(), aged: 45, bg: blankBg() });
  const blankCover = () => ({ title: 'Our Story ♡', subtitle: 'Hamari kahani, hamare lafzon mein', color: '#8f7db8', foil: 'gold', ribbon: '#7a5bb0', band: true, img: '', finish: 'leather' });
  const blankPage = chId => ({ id: uid('p'), ch: chId, title: '', date: '', body: [''], sign: '', scale: 100, photos: [], deco: [], lines: null, clear: [], hf: '', bf: '', hs: 100, ha: 'left', hc: '', hd: 'none', design: 'none', dc: '#e58fb1', dop: 100 });
  function blankStory() {
    const c = { id: uid('c'), title: 'The Beginning' };
    return { v: 1, rev: 0, demo: false, cover: blankCover(), look: blankLook(), chapters: [c], pages: [] };
  }
  const mkPhoto = (img, o = {}) => ({ id: uid('f'), img, cap: '', side: 'right', at: 0, size: 36, rot: 3, tape: 'lavender', dx: 0, dy: 0, frame: 'polaroid', ...o });
  const mkDeco = (type, o = {}) => ({ id: uid('d'), type, x: 60, y: 70, w: DECO_DEFAULT_W[type] || 16, rot: 0, text: '', flip: false, c: 0, st: false, bk: false, font: '', ...o });

  function demoStory() {
    const c1 = { id: 'c-demo1', title: 'The Beginning' }, c2 = { id: 'c-demo2', title: 'The Next Chapter' };
    const p1 = {
      id: 'p-demo1', ch: c1.id, title: 'Pehli Mulakat', date: '2024-03-12', scale: 100,
      body: ['Woh din abhi bhi yaad hai jab pehli dafa tum se baat hui thi. Sach kahun to mujhe khud bhi nahi pata tha ke ek simple si baat meri zindagi ka itna khas hissa ban jaayegi.',
        'Pehle to sirf baat hui, phir dheere dheere har din ka intezar hone laga. Tumhari hansi aur tumhari wo pyari si ada... sab kuch itna khas tha.'],
      sign: 'Shayad wahi se hamari kahani shuru hui... ♡',
      photos: [mkPhoto('demo:sunset', { id: 'f-demo1', cap: 'That first day... ♡', side: 'right', at: 0, size: 38, rot: 3, tape: 'lavender' })],
      deco: [mkDeco('flowers', { id: 'd-demo1', x: 66, y: 64, w: 27, rot: 0 }), mkDeco('note', { id: 'd-demo2', x: 9, y: 66, w: 31, rot: -6, text: 'Some people just feel like home... ♡' }),
        mkDeco('hearts', { id: 'd-demo3', x: 44, y: 70, w: 9, rot: 6 })]
    };
    const p2 = {
      id: 'p-demo2', ch: c1.id, title: 'Pehli Baat, Pehla Ehsaas', date: '2024-03-18', scale: 100,
      body: ['Jab tumne pehli dafa “hi” kaha tha, to pata nahi kyun, dil ko sukoon sa mil gaya. Tumhari baaton mein ek alag hi mithaas thi. Jaise koi apna ho... jo pehle se hi zindagi ka hissa ho.',
        'Us din ke baad se har baat mein tumhari yaad aane lagi. Choti choti cheezain bhi ab khaas lagne lagi thi. Aur mujhe samajh aa gaya ke yeh sirf dosti nahi, kuch aur hai...'],
      sign: 'Aur phir... har din tum aur main thoda aur kareeb...',
      photos: [mkPhoto('demo:together', { id: 'f-demo2', cap: 'You & Me ♡', side: 'right', at: 2, size: 38, rot: 2, tape: 'lavender' })],
      deco: [mkDeco('lavender', { id: 'd-demo4', x: 80, y: 55, w: 16, rot: 4 }), mkDeco('blossom', { id: 'd-demo5', x: 88, y: 24, w: 7, rot: 10 }),
        mkDeco('hearts', { id: 'd-demo6', x: 10, y: 66, w: 9, rot: 0 })]
    };
    const p3 = {
      id: 'p-demo3', ch: c2.id, title: 'Your story starts here', date: '', scale: 100,
      body: ['This is only a sample diary. Tap “Edit” at the bottom and write your own story in Roman Urdu or any language you like.',
        'Add new pages, stick your photos, decorate with flowers and notes. When you are happy, press Publish.'],
      sign: 'Write your own pages... ♡', photos: [], deco: [mkDeco('sparkle', { id: 'd-demo7', x: 76, y: 70, w: 14 })]
    };
    const p4 = { id: 'p-demo4', ch: c2.id, title: 'Next page', date: '', scale: 100, body: ['Your next page will be here...'], sign: '', photos: [], deco: [] };
    return {
      v: 1, rev: 0, demo: true,
      cover: { title: 'Our Story ♡', subtitle: 'Hamari kahani, hamare lafzon mein', color: '#8f7db8', foil: 'gold', ribbon: '#7a5bb0', band: true, img: '', finish: 'leather' },
      look: blankLook(), chapters: [c1, c2], pages: [p1, p2, p3, p4]
    };
  }

  /* Kisi bhi source (storage / import) se aaya hua story safe aur sahi shakal mein badal do */
  function normBg(b) {
    b = b || {}; const d = blankBg();
    return { type: pick(b.type, Object.keys(BG_TYPES), d.type), color: isHex(b.color) ? b.color : d.color, color2: isHex(b.color2) ? b.color2 : d.color2, blur: num(b.blur, 0, 24, 0), dim: num(b.dim, 0, 60, 0),
      flowers: b.flowers !== false, glow: b.glow !== false, img: (typeof b.img === 'string' && okId(b.img)) ? b.img : '' };
  }
  function normLines(l) {
    l = l && typeof l === 'object' ? l : {}; const d = blankLines();
    return { style: pick(l.style, Object.keys(LINE_STYLES), d.style), gap: num(l.gap, 70, 170, d.gap), w: num(l.w, 6, 90, d.w), color: isHex(l.color) ? l.color : '', op: num(l.op, 5, 95, d.op), off: num(l.off, -50, 50, 0),
      margin: !!l.margin, mcolor: isHex(l.mcolor) ? l.mcolor : d.mcolor, fill: pick(l.fill, ['page', 'text'], 'page') };
  }
  function normalizeStory(raw) {
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.pages) || !Array.isArray(raw.chapters)) throw new Error('This backup is not in the right format.');
    if (raw.pages.length > LIM.pages) throw new Error(`A diary cannot have more than ${LIM.pages} pages.`);
    const seen = new Set(), fresh = p => { let id = okId(p) ? p : uid('i'); while (seen.has(id)) id = uid('i'); seen.add(id); return id; };
    const chapters = raw.chapters.slice(0, 60).map(c => ({ id: fresh(c && c.id), title: cleanText(c && c.title, 60) || 'Chapter' }));
    if (!chapters.length) chapters.push({ id: fresh('c-1'), title: 'The Beginning' });
    const cIds = new Set(chapters.map(c => c.id));
    const L = raw.look || {}, C = raw.cover || {};
    const look = {
      paper: (PAPERS[L.paper] || isHex(L.paper)) ? L.paper : 'cream', ink: isHex(L.ink) ? L.ink : INKS[0], bg: normBg(L.bg),
      headFont: pick(L.headFont, HEAD_FONTS, 'Kaushan Script'), bodyFont: pick(L.bodyFont, BODY_FONTS, 'Caveat'),
      size: num(L.size, 80, 125, 100), leading: num(L.leading, 85, 125, 100), aged: num(L.aged, 0, 100, 45),
      lines: normLines(L.lines || (L.rules && L.rules !== 'none' ? { style: ({ lines: 'ruled', dots: 'dots', grid: 'grid' })[L.rules] || 'ruled' } : null))
    };
    const cover = {
      title: cleanText(C.title, 50) || 'Our Story ♡', subtitle: cleanText(C.subtitle, 90), color: isHex(C.color) ? C.color : (COVERS[C.color] || '#8f7db8'), finish: pick(C.finish, Object.keys(FINISHES), 'leather'),
      foil: pick(C.foil, Object.keys(FOILS), 'gold'), ribbon: isHex(C.ribbon) ? C.ribbon : (RIBBONS[C.ribbon] || '#7a5bb0'), band: C.band !== false,
      img: (typeof C.img === 'string' && (okId(C.img))) ? C.img : ''
    };
    const pages = raw.pages.map(p => {
      p = p || {};
      const body = (Array.isArray(p.body) ? p.body : ['']).slice(0, LIM.paras).map(x => cleanHtml(x));
      if (!body.length) body.push('');
      return {
        id: fresh(p.id), ch: cIds.has(p.ch) ? p.ch : chapters[0].id, title: cleanText(p.title, LIM.title), date: parseISO(p.date) ? p.date : '',
        body, sign: cleanText(p.sign, 160), scale: num(p.scale, 70, 130, 100),
        lines: p.lines ? normLines(p.lines) : null,
        clear: (Array.isArray(p.clear) ? p.clear : []).slice(0, LIM.zones).filter(z => z && typeof z === 'object').map(z => ({ id: fresh(z.id), x: num(z.x, -20, 100, 10), y: num(z.y, -20, 100, 10), w: num(z.w, 3, 100, 30), h: num(z.h, 2, 100, 14) })),
        hf: pick(p.hf, HEAD_FONTS, ''), bf: pick(p.bf, BODY_FONTS, ''), hs: num(p.hs, 60, 160, 100), ha: pick(p.ha, ['left', 'center', 'right'], 'left'), hc: isHex(p.hc) ? p.hc : '',
        hd: pick(p.hd, Object.keys(HD_STYLES), 'none'), design: pick(p.design, Object.keys(DESIGNS), 'none'), dc: isHex(p.dc) ? p.dc : '#e58fb1', dop: num(p.dop, 20, 100, 100),
        photos: (Array.isArray(p.photos) ? p.photos : []).slice(0, LIM.photos).filter(f => f && okId(f.img)).map(f => ({
          id: fresh(f.id), img: f.img, cap: cleanText(f.cap, 80), side: pick(f.side, SIDES, 'right'), at: Math.round(num(f.at, 0, body.length, 0)),
          size: num(f.size, 20, 56, 36), rot: num(f.rot, -12, 12, 0), tape: pick(f.tape, TAPES, 'lavender'), dx: num(f.dx, -30, 30, 0), dy: num(f.dy, -30, 30, 0), frame: pick(f.frame, Object.keys(FRAMES), 'polaroid')
        })),
        deco: (Array.isArray(p.deco) ? p.deco : []).slice(0, LIM.decos).filter(d => d && DECO_TYPES[d.type]).map(d => ({
          id: fresh(d.id), type: d.type, x: num(d.x, -10, 100, 50), y: num(d.y, -10, 100, 50), w: num(d.w, 5, 80, 16), rot: num(d.rot, -60, 60, 0),
          text: cleanText(d.text, 90), flip: !!d.flip, c: Math.round(num(d.c, 0, PALS.length - 1, 0)), st: !!d.st, bk: !!d.bk, font: pick(d.font, HEAD_FONTS, '')
        }))
      };
    });
    return { v: 1, rev: Math.max(0, Math.round(+raw.rev || 0)), demo: !!raw.demo, cover, look, chapters, pages };
  }
  const imageIds = st => {
    const s = new Set(); if (!st) return s;
    if (st.cover && st.cover.img) s.add(st.cover.img);
    if (st.look && st.look.bg && st.look.bg.img) s.add(st.look.bg.img);
    st.pages.forEach(p => p.photos.forEach(f => s.add(f.img)));
    return s;
  };

  /* ---------------------------------------------------------------
     5. STORAGE  (IndexedDB; agar browser na de to sirf memory, aur saaf bata diya jata hai)
     Backend connect karte waqt: kvGet/kvSet/kvPublish/imgPut/imgGet ko server calls se badal dein.
     --------------------------------------------------------------- */
  const DB_NAME = 'olw_story_v1';
  let dbPromise = null, persistent = true;
  const memKV = new Map(), memImg = new Map(), IMG = new Map();     // IMG = in-memory cache of dataURLs
  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(res => {
      try {
        const rq = indexedDB.open(DB_NAME, 1);
        rq.onupgradeneeded = () => { const db = rq.result; db.createObjectStore('kv'); db.createObjectStore('img'); };
        rq.onsuccess = () => res(rq.result);
        rq.onerror = rq.onblocked = () => { persistent = false; res(null); };
      } catch { persistent = false; res(null); }
    });
    return dbPromise;
  }
  const req2p = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  async function kvGet(k) { const db = await openDB(); return db ? (await req2p(db.transaction('kv').objectStore('kv').get(k))) ?? null : (memKV.get(k) ?? null); }
  async function kvSet(k, v) {
    const db = await openDB(); if (!db) { memKV.set(k, clone(v)); return; }
    await new Promise((res, rej) => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = res; tx.onerror = tx.onabort = () => rej(tx.error); });
  }
  async function kvDel(k) {
    const db = await openDB(); if (!db) { memKV.delete(k); return; }
    await new Promise((res, rej) => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').delete(k); tx.oncomplete = res; tx.onerror = tx.onabort = () => rej(tx.error); });
  }
  /* Publish: published + prev + draft-delete EK hi transaction mein. Fail ho to purana published bilkul safe rehta hai. */
  async function kvPublish(pub, prev) {
    const db = await openDB();
    const kP = kk('published'), kV = kk('prev'), kD = kk('draft');
    if (!db) { memKV.set(kP, clone(pub)); if (prev) memKV.set(kV, clone(prev)); memKV.delete(kD); return; }
    await new Promise((res, rej) => {
      const tx = db.transaction('kv', 'readwrite'), st = tx.objectStore('kv');
      st.put(pub, kP); if (prev) st.put(prev, kV); st.delete(kD);
      tx.oncomplete = res; tx.onerror = tx.onabort = () => rej(tx.error || new Error('Publish was stopped'));
    });
  }
  async function imgPut(id, data) {
    const db = await openDB();
    if (!db) memImg.set(id, data);
    else await new Promise((res, rej) => { const tx = db.transaction('img', 'readwrite'); tx.objectStore('img').put(data, id); tx.oncomplete = res; tx.onerror = tx.onabort = () => rej(tx.error); });
    IMG.set(id, data);
  }
  async function imgGet(id) {
    if (IMG.has(id)) return IMG.get(id);
    const db = await openDB(); const v = db ? await req2p(db.transaction('img').objectStore('img').get(id)) : memImg.get(id);
    if (okDataUrl(v)) { IMG.set(id, v); return v; } return null;
  }
  async function imgKeys() { const db = await openDB(); return db ? await req2p(db.transaction('img').objectStore('img').getAllKeys()) : [...memImg.keys()]; }
  async function imgDel(id) {
    const db = await openDB(); IMG.delete(id); memImg.delete(id); if (!db) return;
    await new Promise((res, rej) => { const tx = db.transaction('img', 'readwrite'); tx.objectStore('img').delete(id); tx.oncomplete = res; tx.onerror = tx.onabort = () => rej(tx.error); });
  }
  async function loadImages(st) { await Promise.all([...imageIds(st)].filter(id => !id.startsWith('demo:')).map(id => imgGet(id).catch(() => null))); }
  async function gcImages() {                  // jo photos kisi version mein use nahi hotin unhein hata do
    try {
      const keep = new Set([...imageIds(S.pub), ...imageIds(E.draft)]);
      for (const w of ['owner', 'partner']) for (const n of ['published', 'draft', 'prev']) { const v = await kvGet(kk(n, w)); if (v) imageIds(v).forEach(i => keep.add(i)); }
      for (const k of await imgKeys()) if (!keep.has(k)) await imgDel(k);
    } catch { /* gc fail hona koi masla nahi */ }
  }

  /* ---------------------------------------------------------------
     6. APP STATE
     --------------------------------------------------------------- */
  const S = {
    pub: null,              // published story (sab ko dikhta hai)
    story: null,            // jo abhi screen par hai (published, ya preview/edit mein draft)
    mode: 'read',           // 'read' | 'preview' | 'edit'
    open: false,            // book khuli hai ya cover band
    pos: 0,                 // current left page (vp index)
    two: true,              // 2-page spread ya 1-page
    vp: [],                 // virtual pages (pages + end + blank)
    busy: false, hl: '', focus: false,
    geo: { pw: 0, ph: 0, cw: 0, bw: 0, bh: 0 }
  };
  const E = { draft: null, dirty: false, saveT: null, hist: [], hi: -1, selPhoto: null, selDeco: null, focusPid: null, tab: 'page', saving: false, saveErr: false, baseRev: 0 };
  const htmlEl = document.documentElement;


  /* ---------------------------------------------------------------
     7. ICONS
     --------------------------------------------------------------- */
  const ICONS = {
    back: '<path d="M19 12H5M11 6l-6 6 6 6"/>', arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', arrowL: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    heart: '<path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z"/>',
    dots: '<circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/>',
    list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    book: '<path d="M2 4h7a3 3 0 0 1 3 3v14a2 2 0 0 0-2-2H2z"/><path d="M22 4h-7a3 3 0 0 0-3 3v14a2 2 0 0 1 2-2h8z"/>',
    expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    print: '<path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>', upload: '<path d="M12 21V9M7 14l5-5 5 5M4 3h16"/>',
    pen: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>', redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>',
    eraser: '<path d="m7 21-4-4 12-12 6 6-9 9zM9 21h11M8 12l6 6"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    check: '<path d="m4 12 5 5L20 6"/>', plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
    home: '<path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-5.4A8 8 0 1 1 21 12z"/>',
    chev: '<path d="m6 9 6 6 6-6"/>', calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    up: '<path d="M12 19V5M6 11l6-6 6 6"/>', down: '<path d="M12 5v14M6 13l6 6 6-6"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
    type: '<path d="M4 7V5h16v2M12 5v14M9 19h6"/>',
    page: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
    brush: '<path d="M12 3a9 9 0 1 0 0 18c1.2 0 2-.8 2-1.8 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8z"/><path d="M7.5 11h.01M10 7h.01M15 7h.01"/>',
    smile: '<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2.5 4 2.5S16 14 16 14M9 9.5h.01M15 9.5h.01"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/><path d="m3 17.5 9 5 9-5"/>',
    wall: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m3 16 5-5 4 4 3-3 6 6"/><circle cx="16.5" cy="9" r="1.2"/>',
    kbd: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
    kbdown: '<rect x="2" y="3" width="20" height="11" rx="2"/><path d="M6 7h.01M10 7h.01M14 7h.01M18 7h.01M7 11h10M9 18l3 3 3-3"/>',
    sliders: '<path d="M4 6h9M19 6h1M4 12h3M13 12h7M4 18h11M19 18h1"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
    del: '<path d="M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z"/><path d="m12 9 6 6M18 9l-6 6"/>',
    shift: '<path d="M12 4 4 13h5v7h6v-7h5z"/>',
    enter: '<path d="M20 5v7a3 3 0 0 1-3 3H5M9 11l-4 4 4 4"/>',
    smaller: '<path d="M3 18 8 6l5 12M5 14h6M16 12h5"/>', bigger: '<path d="M3 18 8 6l5 12M5 14h6M18 9v6M15 12h6"/>'
  };
  const svgIcon = n => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;
  function paintIcons(root = document) {
    $$('[data-icon]', root).forEach(el => { if (!el.firstChild) el.innerHTML = svgIcon(el.dataset.icon); });
  }

  /* ---------------------------------------------------------------
     8. TEXTURES  (SVG filters -> CSS variables; koi image file nahi chahiye)
     --------------------------------------------------------------- */
  const svgURL = s => `url("data:image/svg+xml,${encodeURIComponent(s.replace(/\s+/g, ' ').trim())}")`;
  function makeTextures() {
    const paper = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320">
      <filter id="a" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="3" seed="4" stitchTiles="stitch"/>
        <feColorMatrix values="0 0 0 0 .40  0 0 0 0 .28  0 0 0 0 .14  1 0 0 0 -.46"/></filter>
      <filter id="b" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".014 .55" numOctaves="3" seed="9" stitchTiles="stitch"/>
        <feColorMatrix values="0 0 0 0 .46  0 0 0 0 .34  0 0 0 0 .18  1.3 0 0 0 -.66"/></filter>
      <filter id="c" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".5 .012" numOctaves="2" seed="21" stitchTiles="stitch"/>
        <feColorMatrix values="0 0 0 0 .5  0 0 0 0 .38  0 0 0 0 .2  1.2 0 0 0 -.64"/></filter>
      <rect width="320" height="320" filter="url(#a)"/><rect width="320" height="320" filter="url(#b)" opacity=".7"/><rect width="320" height="320" filter="url(#c)" opacity=".55"/></svg>`;
    const leather = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">
      <filter id="l" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".16" numOctaves="4" seed="7" stitchTiles="stitch" result="n"/>
        <feDiffuseLighting in="n" lighting-color="#fff" surfaceScale="1.1" diffuseConstant="1.05"><feDistantLight azimuth="235" elevation="50"/></feDiffuseLighting></filter>
      <rect width="256" height="256" filter="url(#l)"/></svg>`;
    const knit = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="24" viewBox="0 0 20 24">
      <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffdf8"/><stop offset=".6" stop-color="#f1e9da"/><stop offset="1" stop-color="#d9cdb8"/></linearGradient></defs>
      <rect width="20" height="24" fill="#cfc3ad"/>
      <ellipse cx="6.2" cy="12" rx="3.6" ry="12.6" transform="rotate(-19 6.2 12)" fill="url(#g)" stroke="#cdbfa6" stroke-width=".5"/>
      <ellipse cx="14" cy="12" rx="3.6" ry="12.6" transform="rotate(19 14 12)" fill="url(#g)" stroke="#cdbfa6" stroke-width=".5"/></svg>`;
    const folds = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="640">
      <filter id="f" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".0045 .0075" numOctaves="3" seed="12" result="n"/>
        <feDiffuseLighting in="n" lighting-color="#fff" surfaceScale="14" diffuseConstant="1.05"><feDistantLight azimuth="300" elevation="42"/></feDiffuseLighting></filter>
      <rect width="900" height="640" filter="url(#f)"/></svg>`;
    const grain = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180"><filter id="g" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="5" stitchTiles="stitch"/>
      <feColorMatrix values="0 0 0 0 .2  0 0 0 0 .15  0 0 0 0 .1  1.4 0 0 0 -.62"/></filter><rect width="180" height="180" filter="url(#g)"/></svg>`;
    const wood = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600">
      <filter id="w" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".004 .11" numOctaves="5" seed="3" result="n"/>
        <feColorMatrix in="n" type="luminanceToAlpha" result="a"/>
        <feComponentTransfer in="a"><feFuncR type="table" tableValues=".78 .62 .5 .68 .42"/><feFuncG type="table" tableValues=".58 .44 .33 .5 .27"/><feFuncB type="table" tableValues=".38 .27 .2 .32 .15"/><feFuncA type="table" tableValues="1 1"/></feComponentTransfer></filter>
      <rect width="900" height="600" filter="url(#w)"/>
      <g stroke="#2a170a" stroke-opacity=".38" stroke-width="2"><path d="M0 150H900M0 300H900M0 450H900"/></g><g stroke="#fff" stroke-opacity=".1" stroke-width="1"><path d="M0 152H900M0 302H900M0 452H900"/></g></svg>`;
    const linen = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240">
      <filter id="x" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".95 .03" numOctaves="2" seed="2" result="a"/><feTurbulence type="fractalNoise" baseFrequency=".03 .95" numOctaves="2" seed="8" result="b"/>
        <feBlend in="a" in2="b" mode="multiply"/><feColorMatrix values="0 0 0 0 .78  0 0 0 0 .72  0 0 0 0 .62  0 0 0 -1.7 1.35"/></filter><rect width="240" height="240" fill="#efe6d6"/><rect width="240" height="240" filter="url(#x)"/></svg>`;
    const r = htmlEl.style;
    r.setProperty('--tx-wood', svgURL(wood)); r.setProperty('--tx-linen', svgURL(linen));
    r.setProperty('--tx-paper', svgURL(paper)); r.setProperty('--tx-leather', svgURL(leather));
    r.setProperty('--tx-knit', svgURL(knit)); r.setProperty('--tx-folds', svgURL(folds)); r.setProperty('--tx-grain', svgURL(grain));
  }

  /* ---------------------------------------------------------------
     9. PROCEDURAL ART  (lavender, phool, dil, sitare ... sab SVG)
     --------------------------------------------------------------- */
  function bez(p0, p1, p2, p3, t) {
    const u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
  }
  const f1 = n => Math.round(n * 10) / 10;
  function lavenderSVG(seed, o = {}) {
    const r = rng(seed), pal = o.pal || ['#7c5cc0', '#8d6ad0', '#6a49ac', '#a07fe0', '#9577d4'];
    const P = [[44, 296], [38, 230], [50, 140], [43, 34]];
    let s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 92 300" overflow="visible" aria-hidden="true">';
    // leaves
    s += '<path d="M44 297C30 268 20 236 12 196C28 226 40 258 46 297Z" fill="#8a9c6a"/><path d="M44 297C58 270 70 244 78 208C62 234 50 262 43 297Z" fill="#7c8f5e"/>';
    s += '<path d="M44 297C38 280 30 262 22 242C36 258 44 276 46 297Z" fill="#9aaa78" opacity=".8"/>';
    s += `<path d="M${P[0]} C${P[1]} ${P[2]} ${P[3]}" fill="none" stroke="#76865a" stroke-width="2.3" stroke-linecap="round"/>`;
    const N = 25;
    for (let i = 0; i < N; i++) {
      const t = .27 + (i / N) * .72, [x, y] = bez(...P, t), sz = lerp(8.6, 3.6, (t - .27) / .72);
      for (const side of [-1, 1]) {
        const ang = side * (28 + r() * 22), col = pal[(r() * pal.length) | 0], dx = side * (1.6 + r() * 1.5), dy = (r() - .5) * 2.4;
        const fl = `M0 0C${-sz * .72} ${-sz * .42} ${-sz * .62} ${-sz * 1.65} 0 ${-sz * 2}C${sz * .62} ${-sz * 1.65} ${sz * .72} ${-sz * .42} 0 0Z`;
        s += `<g transform="translate(${f1(x + dx)} ${f1(y + dy)}) rotate(${f1(ang)})"><path d="${fl}" fill="${col}" opacity=".94"/>
          <path d="M0 -1C${-sz * .3} ${-sz * .5} ${-sz * .24} ${-sz * 1.2} 0 ${-sz * 1.6}" fill="none" stroke="#d9c6f5" stroke-width=".7" opacity=".55"/></g>`;
      }
    }
    for (let i = 0; i < 4; i++) { const [x, y] = bez(...P, .985 + i * .004); s += `<ellipse cx="${f1(x + (r() - .5) * 3)}" cy="${f1(y - i * 3.5)}" rx="2.2" ry="3.4" fill="${pal[(r() * pal.length) | 0]}"/>`; }
    return s + '</svg>';
  }
  function asterHead(r, cx, cy, sc, rot, pal) {
    let s = `<g transform="translate(${cx} ${cy}) rotate(${rot}) scale(${sc})">`;
    const petal = 'M0 0C-3.4 -7 -3.8 -19 0 -28C3.8 -19 3.4 -7 0 0Z';
    for (let i = 0; i < 26; i++) s += `<path d="${petal}" transform="rotate(${f1(i * 13.85 + r() * 4)}) scale(${f1(.92 + r() * .16)})" fill="${pal[(r() * 2) | 0]}" stroke="#7b55b8" stroke-width=".25" stroke-opacity=".5"/>`;
    for (let i = 0; i < 18; i++) s += `<path d="${petal}" transform="rotate(${f1(i * 20 + 6 + r() * 5)}) scale(${f1(.62 + r() * .1)})" fill="${pal[2]}" opacity=".95"/>`;
    s += '<circle r="6.4" fill="#d6a63a"/><circle r="6.4" fill="url(#cg)"/>';
    for (let i = 0; i < 14; i++) { const a = r() * 6.283, d = r() * 4.6; s += `<circle cx="${f1(Math.cos(a) * d)}" cy="${f1(Math.sin(a) * d)}" r=".8" fill="#a8741a" opacity=".8"/>`; }
    return s + '</g>';
  }
  function flowersSVG(seed) {
    const r = rng(seed), pal = ['#bd9bec', '#a47fdc', '#d6bff5'];
    let s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 170 214" overflow="visible" aria-hidden="true"><defs><radialGradient id="cg"><stop offset="0" stop-color="#fff3b0" stop-opacity=".7"/><stop offset="1" stop-color="#8a5a10" stop-opacity=".35"/></radialGradient></defs>';
    s += '<path d="M66 212C64 170 60 130 62 74" stroke="#6f8a54" stroke-width="2.4" fill="none" stroke-linecap="round"/>';
    s += '<path d="M72 212C84 170 100 130 112 92" stroke="#6f8a54" stroke-width="2.2" fill="none" stroke-linecap="round"/>';
    s += '<path d="M68 212C56 186 42 160 34 124" stroke="#7b9660" stroke-width="1.8" fill="none" stroke-linecap="round"/>';
    s += '<path d="M65 176C48 172 34 160 28 142C46 144 60 156 65 176Z" fill="#82996a"/><path d="M68 150C84 150 98 140 106 124C90 124 74 134 68 150Z" fill="#6f8a54"/>';
    s += '<path d="M64 196C84 192 100 180 110 162C92 164 72 176 64 196Z" fill="#8aa36e"/>';
    s += '<path d="M60 128c-12-2-22-9-26-19 11 1 21 7 26 19z" fill="#7b9660"/>';
    s += asterHead(r, 62, 54, 1.0, 8, pal) + asterHead(r, 112, 82, .7, -14, pal) + asterHead(r, 32, 106, .5, 20, pal);
    for (let i = 0; i < 9; i++) { const x = 20 + r() * 130, y = 8 + r() * 60; s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(1.4 + r() * 1.6)}" fill="#efe8fb" opacity=".85"/>`; }
    return s + '</svg>';
  }
  function blossomSVG(seed) {
    const r = rng(seed);
    let s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" overflow="visible" aria-hidden="true"><defs><radialGradient id="bg2" cx=".5" cy=".5" r=".6"><stop offset="0" stop-color="#e7d9fa"/><stop offset="1" stop-color="#b799e6"/></radialGradient></defs>';
    for (let i = 0; i < 5; i++) s += `<path d="M32 32C22 26 22 6 32 3C42 6 42 26 32 32Z" transform="rotate(${i * 72 + r() * 6} 32 32)" fill="url(#bg2)" stroke="#9a78d4" stroke-width=".6" stroke-opacity=".6"/>`;
    s += '<circle cx="32" cy="32" r="4.2" fill="#e8c24c"/>';
    for (let i = 0; i < 7; i++) { const a = i * .9; s += `<circle cx="${f1(32 + Math.cos(a) * 3)}" cy="${f1(32 + Math.sin(a) * 3)}" r=".7" fill="#a67a1a"/>`; }
    return s + '</svg>';
  }
  const HEART = (cx, cy, k, rot) => `<path transform="translate(${cx} ${cy}) rotate(${rot}) scale(${k})" d="M2 21C-2 12 -22 6 -20 -9C-19 -20 -5 -22 0 -11C6 -22 20 -19 20 -8C21 5 6 14 -2 24" />`;
  function heartsSVG(seed) {
    const r = rng(seed);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 90" overflow="visible" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      ${HEART(34, 40, .95, f1(-6 + r() * 6))}${HEART(72, 22, .5, f1(8 + r() * 6))}${HEART(76, 62, .38, f1(-10 + r() * 6))}</svg>`;
  }
  function sparkleSVG() {
    const st = (x, y, s) => `<path d="M${x} ${y - s}C${x + 1} ${y - 1} ${x + 1} ${y - 1} ${x + s} ${y}C${x + 1} ${y + 1} ${x + 1} ${y + 1} ${x} ${y + s}C${x - 1} ${y + 1} ${x - 1} ${y + 1} ${x - s} ${y}C${x - 1} ${y - 1} ${x - 1} ${y - 1} ${x} ${y - s}Z"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" overflow="visible" fill="currentColor" aria-hidden="true">${st(26, 30, 22)}${st(58, 16, 9)}${st(60, 56, 13)}${st(12, 66, 7)}</svg>`;
  }
  function flourishSVG() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">
      <path d="M6 12H78C88 12 92 4 100 4C104 4 106 8 104 10C102 12 98 10 99 8"/><path d="M214 12H142C132 12 128 20 120 20C116 20 114 16 116 14C118 12 122 14 121 16"/>
      <path d="M110 6C106 3 102 6 106 9L110 13L114 9C118 6 114 3 110 6Z" fill="currentColor" stroke="none"/></svg>`;
  }
  const ART = {
    lavender: seed => lavenderSVG(seed), flowers: seed => flowersSVG(seed), blossom: seed => blossomSVG(seed),
    hearts: seed => heartsSVG(seed), sparkle: () => sparkleSVG()
  };
  const tornClip = seed => {                    // phate hue kaghaz ka kinara
    const r = rng(seed), pts = [], n = 16;
    for (let i = 0; i <= n; i++) pts.push(`${f1(i / n * 100)}% ${f1(r() * 4.5)}%`);
    for (let i = 1; i <= 6; i++) pts.push(`${f1(100 - r() * 4)}% ${f1(i / 6 * 100)}%`);
    for (let i = n; i >= 0; i--) pts.push(`${f1(i / n * 100)}% ${f1(100 - r() * 5)}%`);
    for (let i = 5; i >= 1; i--) pts.push(`${f1(r() * 4)}% ${f1(i / 6 * 100)}%`);
    return `polygon(${pts.join(',')})`;
  };
  function roughClip(side, seed, J = .5) {      // page ke bahar wale kinare thode na-hamwar, gutter wala seedha
    const r = rng(seed), n = 30, m = 40, pts = [];
    const straight = { top: false, bottom: false, left: side === 'right' || side === 'single', right: side === 'left' };
    const j = f => (f ? 0 : r() * J);
    for (let i = 0; i <= n; i++) pts.push(`${f1(i / n * 100)}% ${f1(j(straight.top))}%`);
    for (let i = 1; i <= m; i++) pts.push(`${f1(100 - j(straight.right))}% ${f1(i / m * 100)}%`);
    for (let i = n; i >= 0; i--) pts.push(`${f1(i / n * 100)}% ${f1(100 - j(straight.bottom))}%`);
    for (let i = m - 1; i >= 1; i--) pts.push(`${f1(j(straight.left))}% ${f1(i / m * 100)}%`);
    return `polygon(${pts.join(',')})`;
  }

  /* demo photos (asli photo nahi, sirf banaye hue sample drawings) */
  const demoCache = {};
  function demoImage(name) {
    if (demoCache[name]) return demoCache[name];
    const c = document.createElement('canvas'); c.width = c.height = 640; const g = c.getContext('2d'), W = 640;
    const grad = (x0, y0, x1, y1, stops) => { const gr = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, col]) => gr.addColorStop(o, col)); return gr; };
    const blob = (x, y, rx, ry, col) => { g.save(); g.translate(x, y); g.scale(1, ry / rx); const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rx, 0, 7); g.fill(); g.restore(); };
    const person = (x, base, hgt, w, fill, hair, hood) => {
      g.fillStyle = fill; const hr = w * .36;
      g.beginPath(); g.moveTo(x - w * .62, base); g.bezierCurveTo(x - w * .66, base - hgt * .52, x - w * .5, base - hgt * .72, x - w * .2, base - hgt * .78);
      g.lineTo(x + w * .2, base - hgt * .78); g.bezierCurveTo(x + w * .5, base - hgt * .72, x + w * .66, base - hgt * .52, x + w * .62, base); g.closePath(); g.fill();
      g.beginPath(); g.arc(x, base - hgt * .9, hr, 0, 7); g.fill();
      if (hood) { g.beginPath(); g.arc(x, base - hgt * .82, hr * 1.12, Math.PI * 1.05, Math.PI * 1.95); g.fill(); }
      if (hair) { g.fillStyle = hair; g.beginPath(); g.moveTo(x - hr * 1.05, base - hgt * .93); g.bezierCurveTo(x - hr * 1.6, base - hgt * .5, x - hr * 1.2, base - hgt * .3, x - hr * .6, base - hgt * .28);
        g.lineTo(x + hr * 1.2, base - hgt * .3); g.bezierCurveTo(x + hr * 1.6, base - hgt * .55, x + hr * 1.3, base - hgt * .82, x + hr * 1.0, base - hgt * .96); g.bezierCurveTo(x, base - hgt * 1.1, x - hr, base - hgt * 1.0, x - hr * 1.05, base - hgt * .93); g.fill(); }
    };
    if (name === 'sunset') {
      g.fillStyle = grad(0, 0, 0, 430, [[0, '#4b4686'], [.32, '#8a67a8'], [.58, '#d98cac'], [.8, '#f6b28d'], [1, '#fcdca8']]); g.fillRect(0, 0, W, W);
      blob(340, 380, 330, 300, 'rgba(255,226,170,.95)'); blob(150, 150, 190, 60, 'rgba(255,170,190,.35)'); blob(520, 210, 200, 50, 'rgba(255,200,170,.3)');
      g.fillStyle = '#fff3cf'; g.beginPath(); g.arc(340, 372, 30, 0, 7); g.fill();
      [['rgba(110,82,150,.55)', 392, 26], ['rgba(88,64,126,.75)', 424, 34]].forEach(([col, y, a]) => { g.fillStyle = col; g.beginPath(); g.moveTo(0, W); g.lineTo(0, y); for (let x = 0; x <= W; x += 20) g.lineTo(x, y + Math.sin(x * .013 + y) * a * .5 + Math.sin(x * .04) * 6); g.lineTo(W, W); g.fill(); });
      g.fillStyle = grad(0, 440, 0, W, [[0, '#3a2c55'], [1, '#1e1731']]); g.beginPath(); g.moveTo(0, W); g.lineTo(0, 470); g.bezierCurveTo(150, 430, 400, 480, W, 450); g.lineTo(W, W); g.fill();
      person(268, 660, 330, 150, '#271d3f', '#1b1430', true); person(372, 660, 300, 130, '#2e2248', '#1b1430', false);
      g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(255,170,130,.28)'; g.lineWidth = 3; g.beginPath(); g.moveTo(300, 360); g.bezierCurveTo(312, 330, 326, 340, 340, 352); g.stroke(); g.restore();
    } else {
      g.fillStyle = grad(0, 0, W, W, [[0, '#2b2152'], [.5, '#7a4f90'], [1, '#e1a5a0']]); g.fillRect(0, 0, W, W);
      const r = rng(77); for (let i = 0; i < 46; i++) { const x = r() * W, y = r() * W * .85, rr = 12 + r() * 62; blob(x, y, rr, rr, ['rgba(255,226,236,.30)', 'rgba(255,238,190,.28)', 'rgba(226,208,255,.28)'][(r() * 3) | 0]); }
      blob(320, 330, 280, 260, 'rgba(255,214,170,.5)');
      g.fillStyle = grad(0, 470, 0, W, [[0, 'rgba(36,26,58,.0)'], [.3, '#2a2044'], [1, '#150f26']]); g.fillRect(0, 440, W, 200);
      person(268, 640, 360, 92, '#1b1330', null, false); person(372, 640, 320, 84, '#1b1330', '#140d24', false);
      g.strokeStyle = '#1b1330'; g.lineWidth = 12; g.lineCap = 'round'; g.beginPath(); g.moveTo(312, 450); g.lineTo(330, 462); g.stroke();
    }
    const id = g.getImageData(0, 0, W, W), d = id.data, rr = rng(5);       // halka grain + vignette
    for (let i = 0; i < d.length; i += 4) { const n = (rr() - .5) * 16, px = (i / 4) % W, py = ((i / 4) / W) | 0, v = 1 - Math.hypot(px - W / 2, py - W / 2) / W * .5; d[i] = clamp(d[i] * v + n, 0, 255); d[i + 1] = clamp(d[i + 1] * v + n, 0, 255); d[i + 2] = clamp(d[i + 2] * v + n, 0, 255); }
    g.putImageData(id, 0, 0);
    return (demoCache[name] = c.toDataURL('image/jpeg', .86));
  }
  const DEMO_ALIAS = { 'demo:sunset': 'sunset', 'demo:together': 'together' };
  function imgSrc(id) {
    if (!id) return '';
    if (DEMO_ALIAS[id]) return demoImage(DEMO_ALIAS[id]);
    return IMG.get(id) || '';
  }


  /* ---------------------------------------------------------------
     9b. EXTRA ART (flowers, hearts, cute stickers, paper craft ...)  -  sab SVG, 8 colour sets mein
     --------------------------------------------------------------- */
  const SV = (vb, inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" overflow="visible" aria-hidden="true">${inner}</svg>`;
  const LGr = (id, stops, x1 = 0, y1 = 0, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops.map(([o, c, op]) => `<stop offset="${o}" stop-color="${c}"${op != null ? ` stop-opacity="${op}"` : ''}/>`).join('')}</linearGradient>`;
  const RGr = (id, stops, cx = .5, cy = .5, r = .5, abs) => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}"${abs ? ' gradientUnits="userSpaceOnUse"' : ''}>${stops.map(([o, c, op]) => `<stop offset="${o}" stop-color="${c}"${op != null ? ` stop-opacity="${op}"` : ''}/>`).join('')}</radialGradient>`;
  const LEAFG = (id, P) => LGr(id, [[0, '#a9c98f'], [1, '#5f8a52']], 0, 0, 1, 1);
  const rot = (a, cx, cy) => `rotate(${f1(a)} ${cx} ${cy})`;
  const HPATH = 'M50 85C20 62 4 44 4 26C4 12 15 4 28 4C38 4 46 10 50 18C54 10 62 4 72 4C85 4 96 12 96 26C96 44 80 62 50 85Z';
  const star5 = (cx, cy, R, a = 0, k = .48) => { let d = ''; for (let i = 0; i < 10; i++) { const rr = i % 2 ? R * k : R, t = rad(a - 90 + i * 36); d += (i ? 'L' : 'M') + f1(cx + Math.cos(t) * rr) + ' ' + f1(cy + Math.sin(t) * rr); } return d + 'Z'; };
  const heartAt = (x, y, k, a, fill, extra = '') => `<path d="${HPATH}" transform="translate(${x} ${y}) rotate(${a}) scale(${k}) translate(-50 -45)" fill="${fill}" ${extra}/>`;

  /* generic rosette flower: layers of petals around (50,50) */
  function rosette(id, P, o) {
    const r = rng(o.seed || 1); let s = `<defs>${RGr(id + 'g', o.grad(P), 50, 50, 50, true)}</defs>`;
    o.layers.forEach((L, li) => {
      for (let i = 0; i < L.n; i++) {
        const a = L.rot + i * (360 / L.n) + (r() - .5) * (L.jit || 8);
        s += `<g transform="translate(50 50) rotate(${f1(a)}) scale(${L.sc * (.96 + r() * .08)}) translate(-50 -50)"><path d="${L.d}" fill="url(#${id}g)" stroke="${P.d}" stroke-width="${L.sw || .7}" stroke-opacity=".42" stroke-linejoin="round"/>${L.hi === false ? '' : `<path d="${L.hi}" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.6" stroke-linecap="round"/>`}</g>`;
      }
    });
    return s;
  }
  const PET_ROSE = 'M50 53C27 53 12 35 22 18C32 4 68 4 78 18C88 35 73 53 50 53Z', HI_ROSE = 'M28 19C38 9 62 9 72 19';
  const PET_PEONY = 'M50 52C30 54 14 40 18 24C21 12 34 8 42 14C46 8 54 8 58 14C66 8 79 12 82 24C86 40 70 54 50 52Z', HI_PEONY = 'M26 20C32 14 40 14 44 18';
  function roseSVG(s, P, id) {
    let o = `<defs>${LEAFG(id + 'l', P)}</defs>` + `<path d="M50 70C24 74 6 62 4 44C28 44 44 54 50 70Z" fill="url(#${id}l)" transform="translate(0 20)"/><path d="M50 70C76 74 94 62 96 44C72 44 56 54 50 70Z" fill="url(#${id}l)" transform="translate(0 20)"/>`;
    o += rosette(id, P, { seed: s, grad: P => [[0, P.d], [.32, P.a], [.7, P.a], [1, P.l]], layers: [{ n: 5, sc: 1, rot: 0, d: PET_ROSE, hi: HI_ROSE }, { n: 5, sc: .72, rot: 36, d: PET_ROSE, hi: HI_ROSE }, { n: 4, sc: .46, rot: 14, d: PET_ROSE, hi: HI_ROSE }] });
    o += `<path d="M50 50c-7 0-10-6-6-10c4-5 13-3 14 4c1 6-5 10-11 8" fill="none" stroke="${P.d}" stroke-width="1.3" stroke-linecap="round" opacity=".75"/>`;
    return SV('0 -6 100 120', o);
  }
  function peonySVG(s, P, id) {
    const o = rosette(id, P, { seed: s, grad: P => [[0, P.a], [.3, P.l], [.8, '#ffffff'], [1, P.l]], layers: [{ n: 8, sc: 1, rot: 0, d: PET_PEONY, hi: HI_PEONY, jit: 14 }, { n: 7, sc: .8, rot: 20, d: PET_PEONY, hi: HI_PEONY, jit: 14 }, { n: 6, sc: .6, rot: 8, d: PET_PEONY, hi: HI_PEONY }, { n: 5, sc: .4, rot: 30, d: PET_PEONY, hi: HI_PEONY }] });
    const r = rng(s + 5); let c = `<circle cx="50" cy="50" r="6" fill="${P.e}"/>`; for (let i = 0; i < 12; i++) { const a = r() * 6.28, d = r() * 5; c += `<circle cx="${f1(50 + Math.cos(a) * d)}" cy="${f1(50 + Math.sin(a) * d)}" r=".9" fill="${P.d}" opacity=".6"/>`; }
    return SV('0 0 100 100', o + c);
  }
  function daisySVG(s, P, id) {
    const r = rng(s); let o = `<defs>${RGr(id + 'c', [[0, '#fff3b0'], [.7, P.e], [1, '#d9a53a']], .4, .4, .7)}</defs>`;
    for (let i = 0; i < 16; i++) o += `<path d="M50 50C43 40 43 14 50 3C57 14 57 40 50 50Z" transform="rotate(${f1(i * 22.5 + r() * 5)} 50 50) scale(.98)" fill="#fffefb" stroke="${P.d}" stroke-width=".5" stroke-opacity=".35"/><path d="M50 46C48 34 48 16 50 8" transform="rotate(${f1(i * 22.5)} 50 50)" stroke="${P.l}" stroke-width="1.4" fill="none" stroke-linecap="round" opacity=".8"/>`;
    o += `<circle cx="50" cy="50" r="10" fill="url(#${id}c)"/>`;
    for (let i = 0; i < 16; i++) { const a = r() * 6.28, d = r() * 8; o += `<circle cx="${f1(50 + Math.cos(a) * d)}" cy="${f1(50 + Math.sin(a) * d)}" r=".9" fill="#b8801f" opacity=".6"/>`; }
    return SV('0 0 100 100', o);
  }
  function tulipSVG(s, P, id) {
    let o = `<defs>${LGr(id + 'a', [[0, P.l], [.5, P.a], [1, P.d]], 0, 0, 0, 1)}${LGr(id + 'b', [[0, P.a], [1, P.d]], 0, 0, 1, 1)}${LEAFG(id + 'l', P)}</defs>`;
    o += `<path d="M30 110C30 90 29 76 30 62" stroke="#6f9660" stroke-width="3.4" fill="none" stroke-linecap="round"/>`;
    o += `<path d="M29 112C8 100 4 78 10 62C22 76 30 92 29 112Z" fill="url(#${id}l)"/><path d="M31 112C52 102 58 82 52 66C40 78 31 94 31 112Z" fill="url(#${id}l)" opacity=".92"/>`;
    o += `<path d="M30 66C14 62 12 32 30 8C48 32 46 62 30 66Z" fill="url(#${id}b)"/><path d="M30 68C10 68 4 42 10 22C22 32 32 46 30 68Z" fill="url(#${id}a)" stroke="${P.d}" stroke-width=".6" stroke-opacity=".4"/><path d="M30 68C50 68 56 42 50 22C38 32 28 46 30 68Z" fill="url(#${id}a)" stroke="${P.d}" stroke-width=".6" stroke-opacity=".4"/>`;
    o += `<path d="M14 26C16 40 22 52 28 58" stroke="#fff" stroke-opacity=".5" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
    return SV('0 0 60 114', o);
  }
  function cherryBlossom(cx, cy, sc, a, P, id) {
    let s = `<g transform="translate(${f1(cx)} ${f1(cy)}) rotate(${f1(a)}) scale(${sc})">`;
    for (let i = 0; i < 5; i++) s += `<path d="M0 0C-10 -6 -11 -21 -4 -26L0 -21L4 -26C11 -21 10 -6 0 0Z" transform="rotate(${i * 72})" fill="url(#${id}p)" stroke="${P.d}" stroke-width=".5" stroke-opacity=".4"/>`;
    s += `<circle r="2.4" fill="${P.d}" opacity=".55"/>`; for (let i = 0; i < 6; i++) { const t = rad(i * 60 + 10); s += `<path d="M0 0L${f1(Math.cos(t) * 8)} ${f1(Math.sin(t) * 8)}" stroke="${P.d}" stroke-width=".5"/><circle cx="${f1(Math.cos(t) * 8)}" cy="${f1(Math.sin(t) * 8)}" r="1" fill="${P.e}"/>`; }
    return s + '</g>';
  }
  function cherrySVG(s, P, id) {
    const r = rng(s);
    let o = `<defs>${RGr(id + 'p', [[0, P.a], [.55, P.l], [1, '#fff']], .5, .5, .55)}</defs>`;
    o += `<path d="M4 112C40 102 72 82 110 66C140 54 170 38 198 8" stroke="#6b4a3a" stroke-width="4.2" fill="none" stroke-linecap="round"/><path d="M60 92C70 78 74 64 72 46" stroke="#6b4a3a" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M118 62C124 44 136 36 150 34" stroke="#6b4a3a" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M150 44C160 50 170 48 178 40" stroke="#6b4a3a" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
    [[30, 106, .8], [60, 94, 1], [72, 46, .85], [100, 70, 1.05], [124, 56, .8], [150, 34, 1], [168, 40, .75], [190, 14, .8], [134, 66, .55], [46, 96, .55]].forEach(([x, y, k]) => (o += cherryBlossom(x + (r() - .5) * 4, y + (r() - .5) * 4, k * .78, r() * 70, P, id)));
    for (let i = 0; i < 3; i++) o += `<ellipse cx="${f1(84 + i * 34)}" cy="${f1(76 - i * 18)}" rx="3" ry="4.6" fill="${P.a}" transform="rotate(${f1(-30 + r() * 20)} ${84 + i * 34} ${76 - i * 18})"/>`;
    return SV('0 0 200 120', o);
  }
  function miniFlower(cx, cy, k, P, kind, r, id) {
    if (kind === 0) { let s = `<g transform="translate(${f1(cx)} ${f1(cy)}) scale(${k})">`; for (let i = 0; i < 8; i++) s += `<ellipse cx="0" cy="-8" rx="3.4" ry="8" transform="rotate(${i * 45})" fill="#fff" stroke="${P.d}" stroke-opacity=".3" stroke-width=".4"/>`; return s + `<circle r="4.4" fill="${P.e}"/></g>`; }
    if (kind === 1) { let s = `<g transform="translate(${f1(cx)} ${f1(cy)}) scale(${k}) rotate(${f1(r() * 70)})">`; for (let i = 0; i < 5; i++) s += `<ellipse cx="0" cy="-7" rx="5.4" ry="7.4" transform="rotate(${i * 72})" fill="${i % 2 ? P.a : P.l}" stroke="${P.d}" stroke-opacity=".35" stroke-width=".5"/>`; return s + `<circle r="3" fill="${P.e}"/></g>`; }
    return `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(2.4 * k)}" fill="#fff" stroke="${P.l}" stroke-width=".6"/>`;
  }
  function wildSVG(s, P, id) {
    const r = rng(s); let o = `<defs>${LEAFG(id + 'l', P)}</defs>`, h2 = '';
    [[22, 28, 0], [48, 12, 1], [82, 22, 0], [104, 46, 1], [62, 42, 2], [34, 56, 1], [90, 70, 2], [14, 74, 2]].forEach(([x, y, kind], i) => {
      const bx = 60 + (x - 60) * .12; o += `<path d="M60 158C${bx} 120 ${x + (60 - x) * .3} ${y + 60} ${x} ${y + 6}" stroke="#6f9660" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
      if (i < 5) o += `<path d="M${f1(60 + (x - 60) * .4)} ${f1(y + 76)}c-12-4-18-12-18-22c10 2 17 10 18 22z" fill="url(#${id}l)" opacity=".92"/>`;
      h2 += miniFlower(x, y, .86 + r() * .3, P, kind, r, id);
    });
    for (let i = 0; i < 14; i++) h2 += `<circle cx="${f1(10 + r() * 100)}" cy="${f1(4 + r() * 70)}" r="${f1(1.2 + r() * 1.2)}" fill="#fff" opacity=".9"/>`;
    return SV('0 0 120 160', o + h2);
  }
  function sprigSVG(s, P, id) {
    const r = rng(s), c1 = mixHex(P.l, '#a9c79a', .55), c2 = mixHex(P.a, '#5f8650', .62);
    let o = `<defs>${LGr(id + 'g', [[0, c1], [1, c2]], 0, 0, 1, 1)}</defs><path d="M30 158C28 110 34 60 28 8" stroke="${c2}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
    for (let i = 0; i < 9; i++) {
      const y = 140 - i * 14.4, x = 30 + Math.sin(i * .5) * 1.2, k = 1 - i * .06;
      for (const sd of [-1, 1]) o += `<ellipse cx="${f1(x + sd * 11 * k)}" cy="${f1(y - 4)}" rx="${f1(10 * k)}" ry="${f1(6.4 * k)}" transform="rotate(${f1(sd * (-24 - r() * 8))} ${f1(x + sd * 11 * k)} ${f1(y - 4)})" fill="url(#${id}g)" stroke="${c2}" stroke-width=".5" stroke-opacity=".5"/>`;
    }
    o += `<ellipse cx="28" cy="7" rx="5" ry="7" fill="url(#${id}g)"/>`;
    return SV('0 0 60 160', o);
  }
  function wreathSVG(s, P, id) {
    const r = rng(s); let o = `<defs>${LEAFG(id + 'l', P)}${RGr(id + 'p', [[0, P.a], [.6, P.l], [1, '#fff']], .5, .5, .55)}</defs>`;
    for (let i = 0; i < 30; i++) {
      const a = i / 30 * 6.283, x = 70 + Math.cos(a) * 52, y = 70 + Math.sin(a) * 52;
      o += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(11 + r() * 3)}" ry="5" transform="rotate(${f1(a * 57.3 + 90 + (i % 2 ? 28 : -28))} ${f1(x)} ${f1(y)})" fill="url(#${id}l)" opacity="${f1(.82 + r() * .18)}"/>`;
    }
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * 6.283 + .3, x = 70 + Math.cos(a) * 52, y = 70 + Math.sin(a) * 52, kind = i % 3;
      o += kind === 2 ? cherryBlossom(x, y, .95, r() * 70, P, id) : miniFlower(x, y, 1.2, P, kind, r, id);
    }
    for (let i = 0; i < 10; i++) { const a = r() * 6.283; o += `<circle cx="${f1(70 + Math.cos(a) * (50 + r() * 6))}" cy="${f1(70 + Math.sin(a) * (50 + r() * 6))}" r="${f1(1.6 + r())}" fill="${P.d}" opacity=".8"/>`; }
    return SV('0 0 140 140', o);
  }
  function heartSVG(s, P, id) {
    return SV('0 0 100 90', `<defs>${RGr(id + 'h', [[0, P.l], [.5, P.a], [1, P.d]], .35, .3, .85)}</defs><path d="${HPATH}" fill="url(#${id}h)" stroke="${P.d}" stroke-width="1" stroke-opacity=".5"/><ellipse cx="27" cy="22" rx="12" ry="6.4" transform="rotate(-32 27 22)" fill="#fff" opacity=".55"/><circle cx="40" cy="12" r="2.4" fill="#fff" opacity=".7"/>`);
  }
  function balloonsSVG(s, P, id) {
    const r = rng(s); let o = `<defs>${RGr(id + 'a', [[0, P.l], [.55, P.a], [1, P.d]], .35, .3, .85)}${RGr(id + 'b', [[0, '#fff'], [.5, P.l], [1, P.a]], .35, .3, .85)}${RGr(id + 'c', [[0, P.a], [1, P.d]], .35, .3, .85)}</defs>`;
    [[26, 34, .5, -14, 'a'], [74, 30, .56, 12, 'b'], [50, 14, .62, 0, 'c']].forEach(([x, y, k, a, g]) => { o += `<path d="M${x} ${y + 40 * k}C${x + (52 - x) * .2} ${y + 90} ${48 + (x - 50) * .1} ${126} 52 ${148}" stroke="#a49496" stroke-width="1" fill="none"/>`; });
    [[26, 34, .5, -14, 'a'], [74, 30, .56, 12, 'b'], [50, 14, .62, 0, 'c']].forEach(([x, y, k, a, g]) => { o += heartAt(x, y + 30 * k, k, a, `url(#${id}${g})`, `stroke="${P.d}" stroke-opacity=".4" stroke-width="1.2"`) + `<ellipse cx="${f1(x - 14 * k)}" cy="${f1(y + 30 * k - 17 * k)}" rx="${f1(7 * k)}" ry="${f1(3.6 * k)}" transform="rotate(-30 ${f1(x - 14 * k)} ${f1(y + 30 * k - 17 * k)})" fill="#fff" opacity=".5"/>`; });
    o += `<circle cx="52" cy="148" r="2" fill="${P.d}"/>`;
    return SV('0 -10 100 170', o);
  }
  function garlandSVG(s, P, id) {
    const r = rng(s), cols = [P.a, P.l, P.d, P.e, P.a, P.l, P.d]; let o = `<defs>${RGr(id + 'h', [[0, '#fff'], [.4, P.l], [1, P.a]], .35, .3, .9)}</defs><path d="M2 6Q100 58 198 6" stroke="${P.d}" stroke-width="1.2" fill="none" opacity=".7"/>`;
    const q = (t, a, b, c) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c;
    for (let i = 0; i < 9; i++) {
      const t = .06 + i * .11, x = q(t, 2, 100, 198), y = q(t, 6, 58, 6), tx = 2 * (1 - t) * (100 - 2) + 2 * t * (198 - 100), ty = 2 * (1 - t) * (58 - 6) + 2 * t * (6 - 58), a = Math.atan2(ty, tx) * 57.3;
      o += `<path d="M${f1(x)} ${f1(y)}v3" stroke="${P.d}" stroke-width=".8"/>` + heartAt(f1(x), f1(y + 11 + (i % 2) * 2), .22 + (i % 3) * .03, f1(a * .5 + (r() - .5) * 14), i % 3 === 1 ? `url(#${id}h)` : cols[i % cols.length], `stroke="${P.d}" stroke-opacity=".35" stroke-width="1.6"`);
    }
    return SV('0 0 200 70', o);
  }
  function envelopeSVG(s, P, id) {
    return SV('0 0 120 90', `<defs>${LGr(id + 'b', [[0, '#fff'], [1, P.l]], 0, 0, 1, 1)}${LGr(id + 'f', [[0, P.l], [1, P.a]], 0, 0, 0, 1)}${RGr(id + 's', [[0, P.a], [1, P.d]], .35, .3, .8)}</defs><rect x="4" y="8" width="112" height="76" rx="5" fill="url(#${id}b)" stroke="${P.d}" stroke-opacity=".45" stroke-width="1"/><path d="M4 82L48 44M116 82L72 44" stroke="${P.d}" stroke-opacity=".35" stroke-width="1" fill="none"/><path d="M4 12L60 56L116 12" fill="url(#${id}f)" stroke="${P.d}" stroke-opacity=".5" stroke-width="1" stroke-linejoin="round"/>${heartAt(60, 55, .26, 0, `url(#${id}s)`, `stroke="${P.d}" stroke-width="1.6" stroke-opacity=".5"`)}<ellipse cx="55" cy="49" rx="3.4" ry="1.8" fill="#fff" opacity=".5" transform="rotate(-30 55 49)"/>`);
  }
  function sealSVG(s, P, id) {
    const r = rng(s), n = 14; let pts = []; for (let i = 0; i < n; i++) { const a = i / n * 6.283, rr = 40 + r() * 7; pts.push([50 + Math.cos(a) * rr, 50 + Math.sin(a) * rr]); }
    let d = `M${f1((pts[0][0] + pts[n - 1][0]) / 2)} ${f1((pts[0][1] + pts[n - 1][1]) / 2)}`; for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; d += `Q${f1(p[0])} ${f1(p[1])} ${f1((p[0] + q[0]) / 2)} ${f1((p[1] + q[1]) / 2)}`; }
    return SV('0 0 100 100', `<defs>${RGr(id + 'w', [[0, P.a], [.7, P.a], [1, P.d]], .38, .32, .8)}</defs><path d="${d}Z" fill="url(#${id}w)"/><circle cx="50" cy="50" r="29" fill="none" stroke="${P.d}" stroke-opacity=".5" stroke-width="2"/><circle cx="50" cy="50" r="29" fill="none" stroke="${P.l}" stroke-opacity=".35" stroke-width="1" transform="translate(-1 -1)"/>${heartAt(51, 52, .3, 0, P.d, 'opacity=".55"')}${heartAt(49.6, 50.6, .3, 0, P.a, `stroke="${P.l}" stroke-opacity=".5" stroke-width="1.4"`)}<ellipse cx="34" cy="26" rx="13" ry="5" transform="rotate(-38 34 26)" fill="#fff" opacity=".3"/>`);
  }
  function starsSVG(s, P, id) {
    const r = rng(s); let o = `<defs>${LGr(id + 'g', [[0, P.l], [.5, P.a], [1, P.d]], 0, 0, 1, 1)}</defs>`;
    [[34, 56, 26, -8], [76, 28, 15, 12], [74, 78, 18, 8], [14, 16, 9, 0], [50, 12, 7, 0]].forEach(([x, y, R, a]) => (o += `<path d="${star5(x, y, R, a + (r() - .5) * 6)}" fill="url(#${id}g)" stroke="${P.a}" stroke-width="${f1(R * .12)}" stroke-linejoin="round"/><path d="${star5(x - R * .12, y - R * .12, R * .45, a, .5)}" fill="#fff" opacity=".35"/>`));
    return SV('0 0 100 100', o);
  }
  function moonSVG(s, P, id) {
    return SV('0 0 100 100', `<defs>${LGr(id + 'g', [[0, P.l], [.55, P.a], [1, P.d]], 0, 0, 1, 1)}</defs><path d="M66 6C38 8 16 30 16 56C16 82 38 98 64 94C44 86 34 70 34 52C34 34 46 16 66 6Z" fill="url(#${id}g)" stroke="${P.d}" stroke-opacity=".45" stroke-width="1"/><path d="M60 14C42 22 30 36 28 52" stroke="#fff" stroke-opacity=".5" stroke-width="2" fill="none" stroke-linecap="round"/><path d="${star5(78, 26, 9, 10)}" fill="${P.a}" stroke="${P.a}" stroke-width="1.2" stroke-linejoin="round"/><path d="${star5(84, 64, 6, 0)}" fill="${P.l}" stroke="${P.l}" stroke-width="1" stroke-linejoin="round"/><circle cx="60" cy="86" r="2" fill="${P.a}"/><circle cx="90" cy="46" r="1.6" fill="${P.l}"/>`);
  }
  function cloudSVG(s, P, id) {
    return SV('0 0 120 74', `<defs>${LGr(id + 'g', [[0, '#ffffff'], [.7, '#fff'], [1, P.l]], 0, 0, 0, 1)}</defs><path d="M26 66C8 66 2 46 18 40C16 22 38 14 48 28C54 12 82 10 88 30C106 26 118 44 104 58C100 66 92 66 86 66Z" fill="url(#${id}g)" stroke="${P.d}" stroke-opacity=".28" stroke-width="1.4" stroke-linejoin="round"/><path d="M30 56C40 60 60 60 74 56" stroke="${P.a}" stroke-opacity=".25" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="46" cy="44" r="2" fill="${P.d}" opacity=".6"/><circle cx="66" cy="44" r="2" fill="${P.d}" opacity=".6"/><ellipse cx="40" cy="50" rx="4" ry="2.4" fill="${P.a}" opacity=".4"/><ellipse cx="72" cy="50" rx="4" ry="2.4" fill="${P.a}" opacity=".4"/><path d="M52 50Q56 54 60 50" stroke="${P.d}" stroke-width="1.4" fill="none" stroke-linecap="round" opacity=".7"/>`);
  }
  function rainbowSVG() {
    const cols = ['#f4a2b6', '#f9c29a', '#fae59a', '#b5e0b0', '#a9d2f0', '#c8b5ec']; let o = '';
    cols.forEach((c, i) => (o += `<path d="M${10 + i * 7} 66A${50 - i * 7} ${50 - i * 7} 0 0 1 ${110 - i * 7} 66" stroke="${c}" stroke-width="7.2" fill="none"/>`));
    const cl = (x, y) => `<path d="M${x - 14} ${y}C${x - 24} ${y} ${x - 24} ${y - 14} ${x - 12} ${y - 14}C${x - 10} ${y - 24} ${x + 8} ${y - 24} ${x + 10} ${y - 14}C${x + 24} ${y - 14} ${x + 24} ${y} ${x + 12} ${y}Z" fill="#fff" stroke="#d9d2e6" stroke-width="1"/>`;
    return SV('0 0 120 76', o + cl(14, 72) + cl(106, 72));
  }
  function butterflySVG(s, P, id) {
    const r = rng(s); let o = `<defs>${LGr(id + 'u', [[0, P.a], [1, P.l]], 0, 0, 1, 1)}${LGr(id + 'd', [[0, P.l], [1, P.a]], 1, 0, 0, 1)}</defs><g id="${id}w"><path d="M58 46C50 14 22 0 8 12C-2 22 6 44 24 52C38 58 52 56 58 46Z" fill="url(#${id}u)" stroke="${P.d}" stroke-width="1.4" stroke-linejoin="round"/><path d="M58 52C44 54 24 60 22 78C21 90 40 94 50 80C56 72 58 60 58 52Z" fill="url(#${id}d)" stroke="${P.d}" stroke-width="1.4" stroke-linejoin="round"/><path d="M56 46C44 36 28 26 16 20M56 50C40 46 24 46 14 42M56 56C44 62 34 72 30 84" stroke="${P.d}" stroke-width=".7" fill="none" opacity=".45"/><circle cx="24" cy="28" r="5.4" fill="#fff" opacity=".75"/><circle cx="18" cy="42" r="3" fill="#fff" opacity=".7"/><circle cx="36" cy="72" r="4" fill="#fff" opacity=".75"/><circle cx="24" cy="28" r="2.4" fill="${P.d}" opacity=".55"/></g><use href="#${id}w" transform="translate(120 0) scale(-1 1)"/><ellipse cx="60" cy="54" rx="3.2" ry="24" fill="#4a3a44"/><path d="M59 32C54 18 46 12 40 8M61 32C66 18 74 12 80 8" stroke="#4a3a44" stroke-width="1.4" fill="none" stroke-linecap="round"/><circle cx="40" cy="8" r="2" fill="#4a3a44"/><circle cx="80" cy="8" r="2" fill="#4a3a44"/>`;
    return SV('0 0 120 98', o);
  }
  function bowSVG(s, P, id) {
    return SV('0 0 120 90', `<defs>${LGr(id + 'a', [[0, P.l], [.5, P.a], [1, P.d]], 0, 0, 1, 1)}${LGr(id + 'b', [[0, P.l], [.5, P.a], [1, P.d]], 1, 0, 0, 1)}${RGr(id + 'k', [[0, P.l], [1, P.a]], .4, .3, .8)}</defs><path d="M56 48L34 86L48 80L54 88L64 52Z" fill="${P.a}" stroke="${P.d}" stroke-width="1" stroke-linejoin="round"/><path d="M64 48L86 86L72 80L66 88L56 52Z" fill="${P.d}" stroke="${P.d}" stroke-width="1" stroke-linejoin="round" opacity=".92"/><path d="M60 44C42 6 4 2 4 34C4 62 42 66 60 44Z" fill="url(#${id}a)" stroke="${P.d}" stroke-width="1.2" stroke-linejoin="round"/><path d="M60 44C78 6 116 2 116 34C116 62 78 66 60 44Z" fill="url(#${id}b)" stroke="${P.d}" stroke-width="1.2" stroke-linejoin="round"/><path d="M52 40C40 20 22 14 14 24M68 40C80 20 98 14 106 24" stroke="#fff" stroke-opacity=".5" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M52 46C38 44 24 44 12 40M68 46C82 44 96 44 108 40" stroke="${P.d}" stroke-opacity=".35" stroke-width=".9" fill="none"/><rect x="50" y="32" width="20" height="26" rx="9" fill="url(#${id}k)" stroke="${P.d}" stroke-width="1.2"/><path d="M54 38C56 36 62 36 64 38" stroke="#fff" stroke-opacity=".6" stroke-width="1.6" fill="none" stroke-linecap="round"/>`);
  }
  function coffeeSVG(s, P, id) {
    return SV('0 0 120 110', `<defs>${LGr(id + 'c', [[0, '#fff'], [1, P.l]], 0, 0, 1, 0)}${RGr(id + 'k', [[0, '#a8734c'], [1, '#6b4128']], .5, .5, .6)}</defs><path d="M44 18C36 8 52 6 44 -4M60 22C52 10 70 8 60 -6M76 18C68 8 84 6 76 -4" stroke="#b9aeb3" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".7"/><ellipse cx="58" cy="94" rx="52" ry="12" fill="#fff" stroke="${P.d}" stroke-opacity=".3" stroke-width="1.2"/><ellipse cx="58" cy="92" rx="38" ry="8" fill="${P.l}" opacity=".7"/><path d="M96 44C118 40 118 70 94 70" stroke="url(#${id}c)" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M96 44C118 40 118 70 94 70" stroke="${P.d}" stroke-opacity=".3" stroke-width="1" fill="none"/><path d="M18 34H98C98 70 88 92 58 92C28 92 18 70 18 34Z" fill="url(#${id}c)" stroke="${P.d}" stroke-opacity=".4" stroke-width="1.2"/><path d="M20 52H96" stroke="${P.a}" stroke-width="5" opacity=".8"/>${heartAt(58, 64, .2, 0, P.a, 'opacity=".9"')}<ellipse cx="58" cy="34" rx="40" ry="9" fill="url(#${id}k)" stroke="${P.d}" stroke-opacity=".4" stroke-width="1.2"/>${heartAt(58, 34, .13, 0, '#f6e6d4')}`);
  }
  function strawberrySVG(s, P, id) {
    const r = rng(s); let o = `<defs>${RGr(id + 'b', [[0, P.l], [.4, P.a], [1, P.d]], .38, .32, .85)}</defs><path d="M45 94C20 84 6 60 8 40C10 24 26 18 45 24C64 18 80 24 82 40C84 60 70 84 45 94Z" fill="url(#${id}b)" stroke="${P.d}" stroke-opacity=".5" stroke-width="1.2"/>`;
    for (let y = 0; y < 5; y++) for (let x = 0; x < 4; x++) { const px = 22 + x * 15 + (y % 2) * 7, py = 38 + y * 10; if (Math.abs(px - 45) + (py - 38) * .45 < 40) o += `<path d="M${px} ${py}c-2 2-2 5 0 7c2-2 2-5 0-7z" fill="${P.e}" opacity=".9"/>`; }
    o += `<path d="M45 26C34 18 22 24 18 18C28 24 38 20 45 20C52 20 62 24 72 18C68 24 56 18 45 26Z" fill="#6f9660"/><path d="M45 26C40 14 34 12 30 6C38 10 44 10 45 20C48 8 56 8 60 4C56 12 48 14 45 26Z" fill="#7fa36c"/><path d="M45 22C45 12 44 8 48 2" stroke="#5c8250" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="28" cy="40" rx="8" ry="4.6" transform="rotate(-40 28 40)" fill="#fff" opacity=".4"/>`;
    return SV('0 0 90 100', o);
  }
  function cupcakeSVG(s, P, id) {
    let o = `<defs>${LGr(id + 'f', [[0, '#fff'], [1, P.l]], 0, 0, 0, 1)}${LGr(id + 'w', [[0, P.l], [1, P.a]], 0, 0, 1, 0)}</defs>`;
    o += `<path d="M18 54H82L74 104H26Z" fill="url(#${id}w)" stroke="${P.d}" stroke-opacity=".4" stroke-width="1.2" stroke-linejoin="round"/>`; for (let i = 0; i < 6; i++) o += `<path d="M${28 + i * 9} 56L${31 + i * 7.6} 102" stroke="${P.d}" stroke-opacity=".28" stroke-width="2"/>`;
    o += `<path d="M14 56C6 40 22 36 20 28C20 14 80 14 80 28C78 36 94 40 86 56C70 62 30 62 14 56Z" fill="url(#${id}f)" stroke="${P.d}" stroke-opacity=".4" stroke-width="1.2" stroke-linejoin="round"/><path d="M26 44C40 50 60 50 74 44M30 32C42 38 58 38 70 32" stroke="${P.a}" stroke-opacity=".4" stroke-width="2.4" fill="none" stroke-linecap="round"/><circle cx="50" cy="12" r="7.4" fill="#d4264a"/><circle cx="47.6" cy="9.6" r="2.2" fill="#fff" opacity=".6"/><path d="M50 6C50 0 56 -4 60 -4" stroke="#6f9660" stroke-width="2" fill="none" stroke-linecap="round"/>`;
    [[30, 38, '#f6c453'], [70, 40, '#6fb7e0'], [46, 26, P.a], [58, 46, '#9ad4a4'], [36, 50, P.d]].forEach(([x, y, c], i) => (o += `<rect x="${x}" y="${y}" width="6" height="2.2" rx="1.1" fill="${c}" transform="rotate(${i * 38} ${x} ${y})"/>`));
    return SV('0 -8 100 120', o);
  }
  function featherSVG(s, P, id) {
    let o = `<defs>${LGr(id + 'v', [[0, P.l], [1, P.a]], 0, 0, 1, 0)}${LGr(id + 'w', [[0, P.a], [1, P.l]], 0, 0, 1, 0)}</defs><path d="M24 134C26 98 34 56 26 6C46 24 54 64 40 100C34 116 28 126 24 134Z" fill="url(#${id}v)" stroke="${P.d}" stroke-opacity=".4" stroke-width=".9" stroke-linejoin="round"/><path d="M24 134C22 98 16 62 26 6C8 26 -2 70 12 104C18 118 22 126 24 134Z" fill="url(#${id}w)" stroke="${P.d}" stroke-opacity=".4" stroke-width=".9" stroke-linejoin="round"/>`;
    for (let i = 0; i < 12; i++) { const y = 20 + i * 8.6, k = Math.sin(i / 13 * 3.1 + .3); o += `<path d="M25 ${f1(y + 8)}L${f1(25 + 18 * k)} ${f1(y - 3)}M25 ${f1(y + 8)}L${f1(25 - 18 * k)} ${f1(y - 2)}" stroke="${P.d}" stroke-opacity=".28" stroke-width=".7"/>`; }
    return SV('0 0 50 150', o + `<path d="M25 140C25 100 28 50 26 6" stroke="${P.d}" stroke-opacity=".7" stroke-width="1.6" fill="none" stroke-linecap="round"/>`);
  }
  function pearlsSVG(s, P, id) {
    let o = `<defs>${RGr(id + 'p', [[0, '#fff'], [.6, '#f4eee8'], [1, '#c9bdb6']], .35, .3, .75)}${RGr(id + 'h', [[0, P.l], [.5, P.a], [1, P.d]], .35, .3, .85)}</defs>`;
    const q = (t, a, b, c) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c;
    for (let i = 0; i <= 18; i++) { const t = i / 18; o += `<circle cx="${f1(q(t, 6, 80, 154))}" cy="${f1(q(t, 8, 100, 8))}" r="5.2" fill="url(#${id}p)" stroke="#bdb0a8" stroke-width=".5"/>`; }
    return SV('0 0 160 90', o + `<path d="M80 58v4" stroke="#bdb0a8"/>` + heartAt(80, 72, .3, 0, `url(#${id}h)`, `stroke="${P.d}" stroke-opacity=".45" stroke-width="1.6"`));
  }
  function stampSVG(s, P, id) {
    let holes = ''; for (let x = 8; x <= 74; x += 6.6) holes += `<circle cx="${x}" cy="2" r="2.5" fill="#000"/><circle cx="${x}" cy="94" r="2.5" fill="#000"/>`; for (let y = 8; y <= 88; y += 6.6) holes += `<circle cx="2" cy="${y}" r="2.5" fill="#000"/><circle cx="78" cy="${y}" r="2.5" fill="#000"/>`;
    return SV('0 0 80 96', `<defs><mask id="${id}m"><rect width="80" height="96" fill="#fff"/>${holes}</mask>${RGr(id + 'h', [[0, P.l], [.5, P.a], [1, P.d]], .35, .3, .85)}</defs><g mask="url(#${id}m)"><rect x="1" y="1" width="78" height="94" fill="#fffaf2" stroke="${P.d}" stroke-opacity=".25"/></g><rect x="8" y="8" width="64" height="80" fill="${P.l}" stroke="${P.d}" stroke-opacity=".5" stroke-width=".9"/><rect x="11" y="11" width="58" height="74" fill="none" stroke="${P.a}" stroke-width=".7" stroke-dasharray="2 1.6"/>${heartAt(40, 46, .42, 0, `url(#${id}h)`, `stroke="${P.d}" stroke-width="1.4" stroke-opacity=".5"`)}<text x="40" y="78" text-anchor="middle" font-size="9" fill="${P.d}" style="font-family:var(--hf),cursive">Love</text><text x="16" y="20" font-size="6.4" fill="${P.d}" style="font-family:var(--bf),cursive">1 ♡</text><path d="M52 8C58 14 66 14 72 8M52 14C58 20 66 20 72 14" stroke="${P.d}" stroke-opacity=".3" fill="none" stroke-width=".8" transform="translate(-4 -3)"/>`);
  }
  function postmarkSVG(s, P, id, txt) {
    const t = cleanText((txt || 'WITH LOVE'), 24).toUpperCase().replace(/[<>&]/g, '');
    let w = ''; for (let i = 0; i < 5; i++) w += `<path d="M96 ${34 + i * 8}q6 -5 12 0t12 0t12 0t12 0" fill="none"/>`;
    return SV('0 0 150 100', `<g stroke="${P.d}" fill="none" stroke-width="2" opacity=".78"><circle cx="50" cy="50" r="42"/><circle cx="50" cy="50" r="30" stroke-width="1.3"/><path id="${id}c" d="M50 50m-36 0a36 36 0 1 1 72 0a36 36 0 1 1 -72 0" stroke="none"/>${w}</g><text font-size="9.4" letter-spacing="1.6" fill="${P.d}" opacity=".85" style="font-family:var(--bf),cursive;font-weight:700"><textPath href="#${id}c" startOffset="2%">${esc(t)} ♡ ${esc(t)}</textPath></text>${heartAt(50, 50, .22, 0, P.d, 'opacity=".75"')}<text x="50" y="72" text-anchor="middle" font-size="7.4" fill="${P.d}" opacity=".8" style="font-family:var(--bf),cursive">· · ·</text>`);
  }
  function clipSVG() {
    return SV('0 0 30 84', `<defs>${LGr('clpg', [[0, '#e8ecf2'], [.5, '#9aa3b4'], [1, '#6c7588']], 0, 0, 1, 0)}</defs><path d="M21 20V62C21 74 7 74 7 62V16C7 4 23 4 23 16V56" fill="none" stroke="#5a6272" stroke-width="3.4" stroke-linecap="round" opacity=".5" transform="translate(.8 .8)"/><path d="M21 20V62C21 74 7 74 7 62V16C7 4 23 4 23 16V56" fill="none" stroke="url(#clpg)" stroke-width="2.6" stroke-linecap="round"/>`);
  }
  function pinSVG(s, P, id) {
    return SV('0 0 40 64', `<defs>${RGr(id + 'h', [[0, P.l], [.5, P.a], [1, P.d]], .35, .3, .85)}${LGr(id + 'n', [[0, '#eef0f4'], [1, '#8a92a3']], 0, 0, 1, 0)}</defs><path d="M20 30L22 62" stroke="url(#${id}n)" stroke-width="3" stroke-linecap="round"/><ellipse cx="20" cy="30" rx="12" ry="5" fill="${P.d}" opacity=".8"/><path d="M12 28C10 10 30 10 28 28Z" fill="url(#${id}h)"/><ellipse cx="20" cy="10" rx="13" ry="7" fill="url(#${id}h)" stroke="${P.d}" stroke-opacity=".5" stroke-width="1"/><ellipse cx="15" cy="8" rx="5" ry="2.4" fill="#fff" opacity=".6" transform="rotate(-24 15 8)"/>`);
  }
  function washiSVG(s, P, id) {
    const kind = s % 5; let pat = '';
    if (kind === 0) pat = `<pattern id="${id}p" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="${P.l}"/><circle cx="5" cy="5" r="2.2" fill="#fff" opacity=".85"/></pattern>`;
    else if (kind === 1) pat = `<pattern id="${id}p" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="12" height="12" fill="${P.l}"/><rect width="6" height="12" fill="${P.a}" opacity=".55"/></pattern>`;
    else if (kind === 2) pat = `<pattern id="${id}p" width="16" height="26" patternUnits="userSpaceOnUse"><rect width="16" height="26" fill="${P.l}"/>${heartAt(8, 13, .1, 0, P.a, 'opacity=".85"')}</pattern>`;
    else if (kind === 3) pat = `<pattern id="${id}p" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="#fff"/><rect width="7" height="7" fill="${P.l}"/><rect x="7" y="7" width="7" height="7" fill="${P.l}"/></pattern>`;
    else pat = `<pattern id="${id}p" width="20" height="26" patternUnits="userSpaceOnUse"><rect width="20" height="26" fill="${P.l}"/><path d="M0 13Q5 5 10 13T20 13" stroke="${P.a}" stroke-width="2" fill="none"/></pattern>`;
    const r = rng(s); let edgeL = 'M3 0', edgeR = '', y; for (let i = 1; i <= 6; i++) edgeL += `L${f1(r() * 3)} ${f1(i / 6 * 26)}`; for (let i = 6; i >= 0; i--) edgeR += `L${f1(117 - r() * 3)} ${f1(i / 6 * 26)}`;
    return SV('0 0 120 26', `<defs>${pat}</defs><path d="${edgeL}L3 26L117 26${edgeR}Z" fill="url(#${id}p)" opacity=".92"/><path d="M3 0H117V26H3Z" fill="#fff" opacity=".12"/>`);
  }
  function laceSVG(s, P, id) {
    let o = ''; const n = 20; for (let i = 0; i < n; i++) { const x = 6 + i * 12; o += `<path d="M${x - 6} 5A6 6 0 0 1 ${x + 6} 5Z" fill="#fff" stroke="${P.d}" stroke-opacity=".45" stroke-width=".7"/><path d="M${x - 6} 23A6 6 0 0 0 ${x + 6} 23Z" fill="#fff" stroke="${P.d}" stroke-opacity=".45" stroke-width=".7"/><circle cx="${x}" cy="14" r="2.6" fill="none" stroke="${P.d}" stroke-opacity=".5" stroke-width=".8"/><circle cx="${x + 6}" cy="14" r="1" fill="${P.a}" opacity=".7"/>`; }
    return SV('0 0 240 28', `<rect x="0" y="5" width="240" height="18" fill="#fff" stroke="${P.d}" stroke-opacity=".3" stroke-width=".7"/><rect x="0" y="9" width="240" height="1.2" fill="${P.a}" opacity=".35"/><rect x="0" y="18" width="240" height="1.2" fill="${P.a}" opacity=".35"/>${o}`);
  }
  function doilySVG(s, P, id) {
    const n = 28; let d = ''; for (let i = 0; i < n; i++) { const a0 = i / n * 6.283, a1 = (i + 1) / n * 6.283, R = 56; d += (i ? '' : `M${f1(60 + Math.cos(a0) * R)} ${f1(60 + Math.sin(a0) * R)}`) + `A${f1(R * Math.sin(3.1416 / n))} ${f1(R * Math.sin(3.1416 / n))} 0 0 1 ${f1(60 + Math.cos(a1) * R)} ${f1(60 + Math.sin(a1) * R)}`; }
    let o = `<path d="${d}Z" fill="#fffdfa" stroke="${P.d}" stroke-opacity=".4" stroke-width="1"/><circle cx="60" cy="60" r="48" fill="none" stroke="${P.d}" stroke-opacity=".3" stroke-width=".8" stroke-dasharray="2 2.4"/><circle cx="60" cy="60" r="38" fill="none" stroke="${P.a}" stroke-opacity=".35" stroke-width=".8"/>`;
    for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283; o += `<ellipse cx="${f1(60 + Math.cos(a) * 28)}" cy="${f1(60 + Math.sin(a) * 28)}" rx="7" ry="3" transform="rotate(${f1(a * 57.3)} ${f1(60 + Math.cos(a) * 28)} ${f1(60 + Math.sin(a) * 28)})" fill="none" stroke="${P.d}" stroke-opacity=".4" stroke-width=".8"/>`; if (i % 1 === 0) o += `<circle cx="${f1(60 + Math.cos(a + .22) * 44)}" cy="${f1(60 + Math.sin(a + .22) * 44)}" r="1.5" fill="none" stroke="${P.d}" stroke-opacity=".45" stroke-width=".7"/>`; }
    for (let i = 0; i < 8; i++) o += `<path d="M60 60L${f1(60 + Math.cos(i * .785) * 18)} ${f1(60 + Math.sin(i * .785) * 18)}" stroke="${P.d}" stroke-opacity=".3" stroke-width=".7"/>`;
    return SV('0 0 120 120', o + `<circle cx="60" cy="60" r="6" fill="${P.l}" stroke="${P.d}" stroke-opacity=".4" stroke-width=".8"/>`);
  }

  const ART2 = {
    rose: roseSVG, peony: peonySVG, daisy: daisySVG, tulip: tulipSVG, cherry: cherrySVG, wild: wildSVG, sprig: sprigSVG, wreath: wreathSVG,
    heart: heartSVG, balloons: balloonsSVG, garland: garlandSVG, envelope: envelopeSVG, seal: sealSVG, stars: starsSVG, moon: moonSVG, cloud: cloudSVG, rainbow: rainbowSVG,
    butterfly: butterflySVG, bow: bowSVG, coffee: coffeeSVG, strawberry: strawberrySVG, cupcake: cupcakeSVG, feather: featherSVG, pearls: pearlsSVG,
    stamp: stampSVG, postmark: postmarkSVG, clip: clipSVG, pin: pinSVG, washi: washiSVG, lace: laceSVG, doily: doilySVG
  };
  const palOf = c => PALS[Math.round(c) || 0] || PALS[0];
  const artFor = (type, seed, c, tag, txt) => ART2[type](seed, palOf(c), (tag || type) + (seed % 997), txt);
  const DECO_C0 = { seal: 4, strawberry: 4, stars: 6, moon: 6, cupcake: 0, coffee: 2, pearls: 7, lace: 7, doily: 7, clip: 7, tulip: 0, postmark: 1, stamp: 0 };


  /* ---------------------------------------------------------------
     9c. PAGE DESIGNS  (har page ka apna design: phool, frame, lace, gingham ...)
     --------------------------------------------------------------- */
  const palFromHex = hex => { hex = isHex(hex) ? hex : '#e58fb1'; return { a: hex, l: mixHex(hex, '#ffffff', .66), d: mixHex(hex, '#000000', .38), e: '#ffe0a3' }; };
  const dp = (svg, css, cls = '') => h('div', { class: 'ds-p ' + cls, style: css, html: svg });
  const pos = (x, y, w, r = 0, corner = 'tl') => {
    const m = { tl: `left:${x}cqw;top:${y}cqw`, tr: `right:${x}cqw;top:${y}cqw`, bl: `left:${x}cqw;bottom:${y}cqw`, br: `right:${x}cqw;bottom:${y}cqw` };
    return `${m[corner]};width:${w}cqw;transform:rotate(${r}deg)`;
  };
  const cornerOrn = P => SV('0 0 40 40', `<g fill="none" stroke="${P.d}" stroke-width="1.2" stroke-linecap="round" opacity=".85"><path d="M3 38V10Q3 3 10 3H38"/><path d="M8 38V16Q8 8 16 8H38" stroke-width=".7" opacity=".7"/><path d="M12 12Q20 12 20 20Q20 26 14 26"/></g><circle cx="12" cy="12" r="2.2" fill="${P.a}"/><path d="M22 6Q26 0 30 6Q26 10 22 6ZM6 22Q0 26 6 30Q10 26 6 22Z" fill="${P.a}" opacity=".8"/>`);
  const heartTile = P => svgURL(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 22"><path d="M12 20C4 14 1 10 1 6.4C1 3 3.6 1 6.4 1C8.8 1 11 2.6 12 5C13 2.6 15.2 1 17.6 1C20.4 1 23 3 23 6.4C23 10 20 14 12 20Z" fill="${P.a}" fill-opacity=".85" stroke="${P.d}" stroke-opacity=".5" stroke-width="1"/></svg>`);
  function designEl(p, side) {
    const key = p.design; if (!key || key === 'none' || !DESIGNS[key]) return null;
    const P = palFromHex(p.dc), seed = hashStr(p.id + key), r = rng(seed), t = key + (seed % 997);
    const A = (type, tag, c = 0) => artFor(type, seed + tag, c, t + tag);
    const PP = (type, tag) => artWith(type, seed + tag, P, t + tag);
    const el = h('div', { class: `st-design ds-${key}${side === 'left' ? ' mir' : ''}`, style: `--d-a:${P.a};--d-l:${P.l};--d-d:${P.d};opacity:${p.dop / 100}` });
    const add = (...c) => c.forEach(x => el.append(x));
    switch (key) {
      case 'rosecorner':
        add(dp(PP('rose', 1), pos(-7, -7, 27, 8)), dp(PP('rose', 2), pos(12, -5, 17, -10)), dp(PP('sprig', 3), pos(-2, 14, 11, 22)), dp(PP('rose', 4), pos(-4, 6, 15, 30)),
          dp(PP('rose', 5), pos(-7, -9, 29, -170, 'br')), dp(PP('rose', 6), pos(13, -7, 17, 14, 'br')), dp(PP('sprig', 7), pos(-1, 12, 11, -158, 'br')));
        break;
      case 'vine':
        add(dp(PP('sprig', 1), pos(-1, 8, 13, 6)), dp(PP('sprig', 2), pos(0, 44, 13, -4)), dp(PP('sprig', 3), pos(-2, 20, 11, 172, 'bl')), dp(PP('wild', 4), pos(-2, -2, 30, 4, 'bl')),
          dp(PP('sprig', 5), pos(-3, 6, 11, -8, 'tr')), dp(PP('daisy', 6), pos(10, 3, 8, 20, 'tl')), dp(PP('daisy', 7), pos(2, 36, 6, 0, 'tl')));
        break;
      case 'watercolor':
        add(h('i', { class: 'wc', style: `right:-14cqw;top:-12cqw;width:74cqw;height:56cqw;background:radial-gradient(60% 60% at 40% 45%,${P.l},transparent 72%),radial-gradient(40% 40% at 70% 60%,${P.a}66,transparent 70%)` }),
          h('i', { class: 'wc', style: `left:-18cqw;bottom:-14cqw;width:80cqw;height:60cqw;background:radial-gradient(60% 60% at 55% 50%,${mixHex(P.a, '#a98bd8', .4)}55,transparent 72%),radial-gradient(40% 40% at 30% 40%,${P.l},transparent 70%)` }),
          h('i', { class: 'wc', style: `left:30cqw;top:50cqw;width:34cqw;height:26cqw;background:radial-gradient(50% 50%,${P.l}aa,transparent 70%)` }));
        for (let i = 0; i < 9; i++) el.append(h('i', { class: 'wd', style: `left:${f1(r() * 96)}cqw;top:${f1(r() * 130)}cqw;width:${f1(.8 + r() * 1.8)}cqw;height:${f1(.8 + r() * 1.8)}cqw;background:${r() > .5 ? P.a : P.d};opacity:${f1(.2 + r() * .3)}` }));
        break;
      case 'frame':
        add(h('i', { class: 'fr1', style: `border-color:${P.d}` }), h('i', { class: 'fr2', style: `border-color:${P.a}` }),
          dp(cornerOrn(P), 'left:1.4cqw;top:1.4cqw;width:13cqw'), dp(cornerOrn(P), 'right:1.4cqw;top:1.4cqw;width:13cqw;transform:scaleX(-1)'),
          dp(cornerOrn(P), 'left:1.4cqw;bottom:1.4cqw;width:13cqw;transform:scaleY(-1)'), dp(cornerOrn(P), 'right:1.4cqw;bottom:1.4cqw;width:13cqw;transform:scale(-1)'));
        break;
      case 'lace':
        add(dp(PP('lace', 1), 'left:-4cqw;top:-1.2cqw;width:108cqw'), dp(PP('lace', 2), 'left:-4cqw;bottom:-1.2cqw;width:108cqw;transform:scaleY(-1)'),
          dp(PP('bow', 3), pos(3, 1, 13, -14, 'tl')));
        break;
      case 'hearts':
        add(h('i', { class: 'ht', style: `left:3cqw;right:3cqw;top:2.4cqw;height:3.6cqw;background:${heartTile(P)} repeat-x center/auto 100%` }), h('i', { class: 'ht', style: `left:3cqw;right:3cqw;bottom:2.4cqw;height:3.6cqw;background:${heartTile(P)} repeat-x center/auto 100%` }),
          h('i', { class: 'ht', style: `top:8cqw;bottom:8cqw;left:2.4cqw;width:3.6cqw;background:${heartTile(P)} repeat-y center/100% auto` }), h('i', { class: 'ht', style: `top:8cqw;bottom:8cqw;right:2.4cqw;width:3.6cqw;background:${heartTile(P)} repeat-y center/100% auto` }),
          dp(PP('heart', 1), pos(3, 9, 9, -14, 'tr')), dp(PP('heart', 2), pos(5, 14, 6, 10, 'bl')));
        break;
      case 'gingham':
        add(h('i', { class: 'gh', style: `top:0;left:0;right:0;height:9cqw;--ga:${P.a};--gl:${P.l}` }), h('i', { class: 'gh', style: `bottom:0;left:0;right:0;height:7cqw;--ga:${P.a};--gl:${P.l}` }),
          h('i', { class: 'ghl', style: `top:9cqw;left:0;right:0;border-color:${P.d}` }), h('i', { class: 'ghl', style: `bottom:7cqw;left:0;right:0;border-color:${P.d}` }), dp(PP('bow', 1), pos(2, 3, 12, 12, 'tr')));
        break;
      case 'airmail':
        add(h('i', { class: 'am', style: `--am1:${P.a};--am2:#7fb2e5` }), dp(artWith('stamp', seed + 1, P, t + 's'), pos(6, 7, 14, 5, 'tr')), dp(artWith('postmark', seed + 2, P, t + 'p', 'AIR MAIL'), pos(16, 9, 22, -8, 'tr')));
        break;
      case 'stars': {
        const G = PALS[6];
        add(dp(artWith('moon', seed + 1, G, t + 'm'), pos(7, 5, 15, 12, 'tr')), dp(artWith('stars', seed + 2, G, t + 's'), pos(4, 8, 15, -8, 'tl')), dp(artWith('stars', seed + 3, G, t + 'z'), pos(6, 6, 12, 20, 'br')));
        for (let i = 0; i < 18; i++) el.append(h('i', { class: 'tw', style: `left:${f1(r() * 98)}cqw;top:${f1(r() * 140)}cqw;width:${f1(.6 + r() * 1.2)}cqw;height:${f1(.6 + r() * 1.2)}cqw;opacity:${f1(.35 + r() * .5)}` }));
        break;
      }
      case 'polka':
        add(h('i', { class: 'pk', style: `left:0;top:0;width:70cqw;height:70cqw;--pa:${P.a};--pl:${P.l};--o:0 0` }), h('i', { class: 'pk', style: `right:0;bottom:0;width:70cqw;height:70cqw;--pa:${P.a};--pl:${P.l};--o:100% 100%` }),
          dp(PP('blossom_', 1), pos(4, 4, 8, 10, 'tr')));
        break;
      case 'cherry':
        add(dp(PP('cherry', 1), 'right:-8cqw;top:-3cqw;width:72cqw;transform:scaleX(-1) rotate(-6deg)'), dp(PP('cherry', 2), 'left:-12cqw;bottom:-6cqw;width:60cqw;transform:rotate(172deg)'));
        for (let i = 0; i < 9; i++) el.append(dp(petalSVG(P), `left:${f1(5 + r() * 85)}cqw;top:${f1(18 + r() * 110)}cqw;width:${f1(2.6 + r() * 2.4)}cqw;transform:rotate(${f1(r() * 360)}deg);opacity:${f1(.5 + r() * .5)}`));
        break;
      case 'torn':
        add(h('i', { class: 'tn', style: `background:linear-gradient(180deg,${P.l},${mixHex(P.l, P.a, .35)});clip-path:${tornBottom(seed)}` }),
          dp(artWith('washi', seed + 1, P, t + 'w'), pos(-5, -2, 28, -26, 'tl')), dp(artWith('washi', seed + 2, P, t + 'x'), pos(-5, -2, 28, 24, 'tr')));
        break;
      case 'bow':
        add(h('i', { class: 'sc', style: `--sc1:${P.l}` }), h('i', { class: 'sc b', style: `--sc1:${P.l}` }), h('i', { class: 'dsh', style: `border-color:${P.a}` }), dp(PP('bow', 1), 'left:50%;top:-2.5cqw;width:20cqw;margin-left:-10cqw'));
        break;
      case 'pressed':
        add(dp(PP('daisy', 1), pos(-2, 0, 15, 20)), dp(PP('blossom_', 2), pos(11, 8, 9, -10)), dp(PP('sprig', 3), pos(5, 2, 9, 150)), dp(PP('wild', 4), pos(-3, -3, 28, 8, 'br')), dp(PP('daisy', 5), pos(18, 2, 10, -20, 'br')), dp(PP('blossom_', 6), pos(2, 10, 8, 40, 'tr')),
          dp(PP('sprig', 7), pos(1, 30, 8, -20, 'tr')));
        break;
      case 'butterflies':
        add(dp(SV('0 0 200 120', `<path d="M10 110C50 100 60 40 100 56C140 72 150 20 196 8" stroke="${P.a}" stroke-width="1.4" fill="none" stroke-dasharray="1 5" stroke-linecap="round" opacity=".7"/>`), 'left:0;top:6cqw;width:100cqw'),
          dp(PP('butterfly', 1), pos(6, 6, 17, 18, 'tr')), dp(PP('butterfly', 2), pos(8, 12, 11, -24, 'bl')), dp(PP('butterfly', 3), pos(2, 40, 9, 30, 'tl')), dp(PP('butterfly', 4), pos(14, 4, 7, -10, 'br')));
        break;
    }
    return el;
  }
  const petalSVG = P => SV('0 0 20 20', `<path d="M10 1C16 4 18 12 10 19C2 12 4 4 10 1Z" fill="${P.l}" stroke="${P.a}" stroke-width="1"/>`);
  const tornBottom = seed => { const r = rng(seed), pts = ['0 0', '100% 0']; for (let i = 20; i >= 0; i--) pts.push(`${f1(i * 5)}% ${f1(88 + r() * 12)}%`); return `polygon(${pts.join(',')})`; };
  function artWith(type, seed, P, id, txt) {
    if (type === 'blossom_') return blossomSVG(seed);
    return ART2[type](seed, P, id, txt);
  }


  /* ---------------------------------------------------------------
     10. PAGE + COVER RENDERER  (reading, preview, edit aur print sab yahi use karte hain)
     --------------------------------------------------------------- */
  const chapterOf = (st, p) => st.chapters.find(c => c.id === p.ch) || st.chapters[0];
  function lookVars(st) {
    const L = st.look, pp = paperPair(L.paper);
    return `--ink:${L.ink};--hf:"${L.headFont}";--bf:"${L.bodyFont}";--sz:${L.size / 100};--ld:${L.leading / 100};--pa:${pp[0]};--pb:${pp[1]};--aged:${L.aged / 100};`;
  }
  function buildVP(st) {
    const vp = st.pages.map((p, i) => ({ kind: 'page', p, n: i + 1 }));
    vp.push({ kind: 'end' }); if (vp.length % 2) vp.push({ kind: 'blank' });
    return vp;
  }
  function polaroid(f, o) {
    const src = imgSrc(f.img);
    const fig = h('figure', { class: `st-pol ${f.side} fr-${f.frame || 'polaroid'}`, 'data-photo': f.id, style: `--w:${f.size}cqw;--r:${f.rot}deg;--dx:${f.dx}cqw;--dy:${f.dy}cqw` });
    if (f.tape !== 'none') fig.append(h('i', { class: `st-tape t-${f.tape}` }));
    fig.append(h('div', { class: 'st-ph' }, src ? h('img', { src, alt: f.cap || 'Photo', draggable: 'false' }) : h('span', { class: 'st-noimg', text: 'Photo' })));
    fig.append(h('figcaption', { 'data-k': 'cap', 'data-phid': f.id, 'data-ph': 'Caption', contenteditable: o.edit ? 'true' : null, spellcheck: 'false', text: f.cap }));
    return fig;
  }
  const dText = (d, o, cls) => h('span', { class: cls || 'st-nt', 'data-k': 'note', 'data-did': d.id, 'data-ph': 'Write here', contenteditable: o.edit ? 'true' : null, spellcheck: 'false', text: d.text });
  function decoEl(d, o) {
    const seed = hashStr(d.id), P = palOf(d.c), ty = d.type;
    const el = h('div', { class: `st-deco d-${ty}${d.st ? ' sticker' : ''}`, 'data-deco': d.id,
      style: `left:${d.x}%;top:${d.y}%;width:${d.w}cqw;--dw:${d.w}cqw;--r:${d.rot}deg;--fl:${d.flip ? -1 : 1};--pa:${P.a};--pl:${P.l};--pd:${P.d};--pe:${P.e};${d.font ? `--df:"${d.font}";` : ''}` });
    if (ty === 'note') {
      el.append(h('div', { class: 'st-np', style: `clip-path:${tornClip(seed)}` }), dText(d, o), h('i', { class: 'st-tape t-yellow st-ntape' }));
    } else if (ty === 'tape') el.append(h('i', { class: `st-tape st-wide t-${['lavender', 'pink', 'mint', 'yellow'][seed % 4]}` }));
    else if (ty === 'sticky') el.append(h('div', { class: 'st-sk' }, dText(d, o), h('i', { class: 'st-fold' })), h('i', { class: 'st-tape st-ntape', style: `--t1:${P.a};--t2:${P.l}` }));
    else if (ty === 'ticket') el.append(h('div', { class: 'st-tk' }, h('i', { class: 'st-tk-in' }), dText(d, o)));
    else if (ty === 'tag') el.append(h('div', { class: 'st-tg' }, dText(d, o)), h('span', { class: 'st-tg-s', html: SV('0 0 40 50', `<path d="M20 44C20 20 6 20 6 8C6 -2 20 -2 20 8S34 -2 34 8C34 20 20 20 20 44" fill="none" stroke="${P.d}" stroke-width="1.6" stroke-linecap="round"/>`) }));
    else if (ty === 'banner') el.append(h('div', { class: 'st-bn' }, dText(d, o)));
    else if (ty === 'bubble') el.append(h('div', { class: 'st-bb' }, dText(d, o)));
    else if (ty === 'text') el.append(dText(d, o, 'st-nt st-tx'));
    else if (ART[ty]) el.innerHTML = ART[ty](seed);
    else if (ART2[ty]) el.innerHTML = artFor(ty, seed, d.c, 'd', d.text);
    return el;
  }
  const zoneEl = z => h('div', { class: 'st-zone', 'data-zone': z.id, style: `left:${z.x}%;top:${z.y}%;width:${z.w}%;height:${z.h}%` }, h('span', { text: 'No lines here' }), h('i', { class: 'st-zh', 'data-zh': z.id }));
  const linesFor = (st, p) => p.lines || st.look.lines || blankLines();
  function renderPage(st, it, side, o = {}) {
    const seed = hashStr((it && it.p ? it.p.id : (it ? it.kind : 'blank')) + side);
    const r = rng(seed), rot = f1((r() - .5) * 2.2);
    const spots = [0, 1, 2].map(() => `radial-gradient(circle at ${f1(r() * 100)}% ${f1(r() * 100)}%,rgba(150,98,48,${f1(.05 + r() * .08)}) 0,transparent ${f1(5 + r() * 12)}%)`).join(',');
    const el = h('div', { class: `st-page ${side}${o.edit ? ' editing' : ''}`, 'data-side': side, style: `--rot:${rot}deg;--spots:${spots};` });
    el.append(h('div', { class: 'st-paper', style: `clip-path:${roughClip(side, seed)}` }), h('div', { class: 'st-shade' }));
    if (!it || it.kind === 'blank') return el;
    if (it.kind === 'end') {
      el.append(h('div', { class: 'st-content st-endwrap' }, h('div', { class: 'st-end' },
        h('span', { class: 'st-orn', html: flourishSVG() }), h('p', { class: 'st-end-t', text: 'The End ♡' }),
        h('p', { class: 'st-end-s', text: '...or maybe just the beginning.' }), h('span', { class: 'st-orn', html: flourishSVG() }))));
      return el;
    }
    const p = it.p, ln = linesFor(st, p), on = ln.style !== 'none', P = palFromHex(p.dc);
    el.dataset.pid = p.id; el._ln = { ln, clear: p.clear || [], side };
    const L = st.look;
    el.style.cssText += `--tf:${p.hf ? `"${p.hf}"` : 'var(--hf)'};--hs:${p.hs / 100};--tc:${p.hc || 'var(--ink)'};--dc:${P.a};--dcl:${P.l};--dcd:${P.d};` + (p.bf ? `--bf:"${p.bf}";` : '') + (on ? `--ld:${f1(L.leading / 100 * ln.gap / 100)};` : '');
    const ds = designEl(p, side); if (ds) el.append(ds);
    el.dataset.ds = (p.design && p.design !== 'none') ? p.design : '';
    el.append(h('div', { class: 'st-lines' }));
    const back = h('div', { class: 'st-decos back' }), front = h('div', { class: 'st-decos' });
    p.deco.forEach(d => (d.bk ? back : front).append(decoEl(d, o)));
    el.append(back);
    const c = h('div', { class: 'st-content', style: `--sc:${p.scale / 100}` });
    if (p.title || o.edit) c.append(h('div', { class: `st-head hd-${p.hd || 'none'} ha-${p.ha || 'left'}` }, h('span', { class: 'st-no', text: `${it.n}.` }),
      h('h2', { class: 'st-title', 'data-k': 'title', 'data-ph': 'Page title', contenteditable: o.edit ? 'true' : null, spellcheck: 'false', text: p.title })));
    const dt = fmtDate(p.date);
    if (dt) c.append(h('div', { class: `st-date ha-${p.ha || 'left'}` }, h('i', { class: 'st-cal' }), dt));
    const body = h('div', { class: 'st-body' }), byAt = {};
    p.photos.forEach(f => (byAt[Math.min(f.at, p.body.length)] ||= []).push(f));
    for (let i = 0; i <= p.body.length; i++) {
      (byAt[i] || []).forEach(f => body.append(polaroid(f, o)));
      if (i < p.body.length) {
        const html = cleanHtml(p.body[i]);
        if (html || o.edit) body.append(h('p', { class: 'st-p', 'data-k': 'p', 'data-i': i, 'data-ph': i === 0 ? 'Write here... (Roman Urdu is fine)' : '', contenteditable: o.edit ? 'true' : null, html }));
      }
    }
    c.append(body);
    if (p.sign || o.edit) c.append(h('p', { class: 'st-sign', 'data-k': 'sign', 'data-ph': 'A handwritten line at the bottom', contenteditable: o.edit ? 'true' : null, spellcheck: 'false', text: p.sign }));
    el.append(c);
    if (o.edit) (p.clear || []).forEach(z => front.append(zoneEl(z)));
    el.append(front);
    el.append(h('div', { class: 'st-pno', text: pad2(it.n) }));
    return el;
  }
  /* Lines: SVG mein banti hain (page ke naap par), zones ke andar kat jati hain */
  const cutRanges = (a, b, rs) => { let segs = [[a, b]]; rs.forEach(([s, e]) => { segs = segs.flatMap(([p, q]) => (e <= p || s >= q) ? [[p, q]] : [...(s > p ? [[p, s]] : []), ...(e < q ? [[e, q]] : [])]); }); return segs; };
  function placeLines(page) {
    const box = page.querySelector(':scope > .st-lines'), cfg = page._ln; if (!box) return;
    box.replaceChildren(); page.dataset.ln = '';
    if (!cfg || cfg.ln.style === 'none') return;
    const body = page.querySelector('.st-body'), W = page.clientWidth, H = page.clientHeight; if (!body || W < 20 || H < 20) return;
    const ln = cfg.ln, st = ln.style, lh = parseFloat(getComputedStyle(body).lineHeight) || 24, sw = Math.max(.35, ln.w / 100 * W / 100);
    const top = body.offsetTop, ps = $$('.st-p', body), last = ps[ps.length - 1];
    const yEnd = ln.fill === 'text' && last ? top + last.offsetTop + last.offsetHeight + lh * .15 : H - W * .085;
    const y1 = top + lh * (.9 + ln.off / 100), x0 = W * .05, x1 = W * .95;
    const Z = cfg.clear.map(z => ({ x0: z.x / 100 * W, x1: (z.x + z.w) / 100 * W, y0: z.y / 100 * H, y1: (z.y + z.h) / 100 * H }));
    const hseg = (y, pad) => cutRanges(x0, x1, Z.filter(z => y > z.y0 - pad && y < z.y1 + pad).map(z => [z.x0 - pad, z.x1 + pad])).filter(([a, b]) => b - a > sw * 3);
    const vseg = (x, a, b, pad) => cutRanges(a, b, Z.filter(z => x > z.x0 - pad && x < z.x1 + pad).map(z => [z.y0 - pad, z.y1 + pad])).filter(([p, q]) => q - p > sw * 3);
    const line = (x1_, y_, x2_, y2_, extra = '') => `<line x1="${f1(x1_)}" y1="${f1(y_)}" x2="${f1(x2_)}" y2="${f1(y2_)}"${extra}/>`;
    const ys = []; for (let y = y1; y < yEnd; y += lh) ys.push(y);
    let g = '';
    if (st === 'ruled' || st === 'double' || st === 'dashed' || st === 'dotted') {
      const dash = st === 'dashed' ? ` stroke-dasharray="${f1(sw * 9)} ${f1(sw * 5)}"` : st === 'dotted' ? ` stroke-dasharray="0.01 ${f1(sw * 3.4)}" stroke-linecap="round"` : '';
      const wdt = st === 'dotted' ? sw * 2 : st === 'double' ? sw * .8 : sw;
      g += `<g stroke="${ln.color || 'var(--ink)'}" stroke-width="${f1(wdt * 100) / 100}"${dash}>`;
      ys.forEach(y => hseg(y, sw * 2).forEach(([a, b]) => { g += line(a, y, b, y); if (st === 'double') g += line(a, y + sw * 2.6, b, y + sw * 2.6); }));
      g += '</g>';
    } else if (st === 'dots') {
      g += `<g fill="${ln.color || 'var(--ink)'}">`;
      ys.forEach(y => { for (let x = x0 + lh * .5; x < x1; x += lh) if (!Z.some(z => x > z.x0 - sw * 2 && x < z.x1 + sw * 2 && y > z.y0 - sw * 2 && y < z.y1 + sw * 2)) g += `<circle cx="${f1(x)}" cy="${f1(y - lh * .45)}" r="${f1(sw * 1.5)}"/>`; });
      g += '</g>';
    } else if (st === 'grid' || st === 'graph') {
      const step = st === 'graph' ? lh / 2 : lh, w = st === 'graph' ? sw * .7 : sw; g += `<g stroke="${ln.color || 'var(--ink)'}" stroke-width="${f1(w * 100) / 100}">`;
      let k = 0; for (let y = y1; y < yEnd; y += step, k++) hseg(y, w * 2).forEach(([a, b]) => { g += line(a, y, b, y, st === 'graph' && k % 2 ? ' stroke-opacity=".55"' : ''); });
      k = 0; for (let x = x0 + (st === 'graph' ? 0 : lh * .25); x < x1; x += step, k++) vseg(x, top + lh * .1, yEnd, w * 2).forEach(([a, b]) => { g += line(x, a, x, b, st === 'graph' && k % 2 ? ' stroke-opacity=".55"' : ''); });
      g += '</g>';
    }
    let m = '';
    if (ln.margin) {
      const xm = (cfg.side === 'left' ? 6 : 9) / 100 * W; m = `<g stroke="${ln.mcolor}" stroke-width="${f1(Math.max(.5, sw * .9) * 100) / 100}" opacity=".8">`;
      [xm, xm + Math.max(3, sw * 3.4)].forEach(x => vseg(x, 0, H, sw * 2).forEach(([a, b]) => { m += line(x, a, x, b); })); m += '</g>';
    }
    box.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><g opacity="${ln.op / 100}">${g}</g>${m}</svg>`;
    page.dataset.ln = st;
  }
  const overflowing = c => c.scrollHeight > c.clientHeight + 2;
  function fitPage(page) {                      // text zyada ho to chhota karke page mein fit karo (reading/print)
    const c = page.querySelector('.st-content'); if (!c || page.classList.contains('editing')) return;
    let f = 1, n = 0; page.style.setProperty('--fit', 1);
    while (overflowing(c) && f > .66 && n < 10) { f -= .04; page.style.setProperty('--fit', f.toFixed(2)); n++; }
    page.classList.toggle('st-scroll', overflowing(c));
    placeLines(page);
  }
  function highlightIn(el, q) {
    q = (q || '').trim(); if (q.length < 2) return;
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    $$('.st-title,.st-p,.st-sign,figcaption,.st-nt', el).forEach(root => {
      const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), nodes = []; while (w.nextNode()) nodes.push(w.currentNode);
      nodes.forEach(n => {
        if (!re.test(n.nodeValue)) return; re.lastIndex = 0;
        const frag = document.createDocumentFragment(); let last = 0, m;
        while ((m = re.exec(n.nodeValue))) { frag.append(n.nodeValue.slice(last, m.index), h('mark', { class: 'st-hit', text: m[0] })); last = m.index + m[0].length; if (m[0].length === 0) re.lastIndex++; }
        frag.append(n.nodeValue.slice(last)); n.replaceWith(frag);
      });
    });
  }

  function renderCover(st, o = {}) {
    const c = st.cover, foil = FOILS[c.foil], ed = o.edit ? 'true' : null;
    const el = h('div', { class: 'st-cv fin-' + (c.finish || 'leather') + (foil ? '' : ' blind') + (c.band ? ' has-band' : ''), style: `--cc:${coverHex(c.color)};` + (foil ? `--f1:${foil[0]};--f2:${foil[1]};--f3:${foil[2]};` : '') });
    el.append(h('div', { class: 'st-cv-skin' }), h('i', { class: 'st-cv-frame' }), h('i', { class: 'st-cv-frame2' }));
    el.append(h('span', { class: 'st-cv-lav', html: lavenderSVG(11, { pal: ['#fff', '#fff', '#fff'] }) + lavenderSVG(23, { pal: ['#fff', '#fff', '#fff'] }) }));
    if (c.img && imgSrc(c.img)) el.append(h('figure', { class: 'st-cv-photo' }, h('i', { class: 'st-tape t-lavender' }), h('div', { class: 'st-ph' }, h('img', { src: imgSrc(c.img), alt: '', draggable: 'false' }))));
    el.append(h('div', { class: 'st-cv-label' + (c.img ? ' has-photo' : '') },
      h('span', { class: 'st-orn', html: flourishSVG() }),
      h('h2', { class: 'st-cv-title', 'data-k': 'ctitle', 'data-ph': 'Diary title', contenteditable: ed, spellcheck: 'false', text: c.title }),
      h('p', { class: 'st-cv-sub', 'data-k': 'csub', 'data-ph': 'A short line', contenteditable: ed, spellcheck: 'false', text: c.subtitle }),
      h('span', { class: 'st-orn', html: flourishSVG() })));
    if (c.band) el.append(h('i', { class: 'st-cv-band' }));
    if (st.demo) el.append(h('span', { class: 'st-cv-demo', text: 'Sample diary' }));
    if (!o.print) el.append(h('span', { class: 'st-cv-open', text: 'Tap to open ♡' }));
    return el;
  }


  /* ---------------------------------------------------------------
     11. BOOK ENGINE  (layout, cover opening, bending page turns, finger-follow swipe)
     --------------------------------------------------------------- */
  const stage = $('#stStage'), book = $('#stBook');
  const B = {};
  const setVars = (el, str) => str.split(';').forEach(p => { const i = p.indexOf(':'); if (i > 0) el.style.setProperty(p.slice(0, i).trim(), p.slice(i + 1).trim()); });
  const POS_KEY = 'olw_story_pos';
  const posKey = () => (VIEW === ME ? POS_KEY : POS_KEY + '_her');
  const lsGet = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };
  const rad = d => d * Math.PI / 180;
  const ease = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  function buildBook() {
    book.replaceChildren();
    B.ground = h('div', { class: 'st-ground' });
    B.leatherL = h('div', { class: 'st-leather l' }, h('i', { class: 'st-stitch' }), h('i', { class: 'st-lip' }));
    B.leatherR = h('div', { class: 'st-leather r' }, h('i', { class: 'st-stitch' }), h('i', { class: 'st-lip' }));
    B.blockL = h('div', { class: 'st-block l' }); B.blockR = h('div', { class: 'st-block r' });
    B.slotL = h('div', { class: 'st-slot l' }); B.slotR = h('div', { class: 'st-slot r' });
    B.gutter = h('div', { class: 'st-gutter' });
    B.ribbon = h('div', { class: 'st-ribbon' }, h('i'));
    B.leaf = h('div', { class: 'st-leaf', hidden: true });
    B.castR = h('div', { class: 'st-cast r', hidden: true }); B.castL = h('div', { class: 'st-cast l', hidden: true });
    B.cleafF = h('div', { class: 'st-face f' }); B.cleafB = h('div', { class: 'st-face b' });
    B.cleaf = h('div', { class: 'st-cleaf' }, B.cleafF, B.cleafB);
    B.measure = h('div', { class: 'st-measure', 'aria-hidden': 'true' });
    B.peekL = h('div', { class: 'st-peek l', hidden: true, title: 'Previous page' }); B.peekR = h('div', { class: 'st-peek r', hidden: true, title: 'Next page' });
    B.peekL.addEventListener('click', () => go_(-1)); B.peekR.addEventListener('click', () => go_(1));
    book.append(B.ground, B.leatherL, B.leatherR, B.blockL, B.blockR, B.slotL, B.slotR, B.gutter, B.ribbon, B.castL, B.castR, B.peekL, B.peekR, B.leaf, B.cleaf, B.measure);
  }

  function layout() {
    const W = stage.clientWidth, H = stage.clientHeight; if (W < 80 || H < 80) return;
    const padX = clamp(W * .025, 6, 40), padY = clamp(H * .03, 6, 30), c = .035;
    const land = window.innerWidth > window.innerHeight;       // phone landscape = PC jaisa 2-page spread
    const two = W / H > 1.05 && (W >= 820 || (land && W >= 500));
    let ar = ASPECT;
    const peekOn = !two && W < 760 && S.mode !== 'edit', pk = peekOn ? clamp(Math.round(W * .05), 12, 24) : 0;   // phone: agle/pichle page ki jhalak
    if (!two) {                                    // phone: page screen ki height ke hisaab se lamba
      const pwW = (W - 2 * padX - 2 * pk) / (1 + 2 * c);
      ar = clamp(pwW / (H - 2 * padY - 2 * pwW * c), .56, .8);
    }
    const pw = Math.max(110, Math.floor(Math.min((W - 2 * padX - 2 * pk) / ((two ? 2 : 1) + 2 * c), (H - 2 * padY) / (1 / ar + 2 * c))));
    const ph = Math.round(pw / ar), cw = Math.max(5, Math.round(pw * c)), bw = (two ? 2 : 1) * pw + 2 * cw, bh = ph + 2 * cw;
    const v = (k, x) => book.style.setProperty(k, x + 'px');
    v('--pw', pw); v('--ph', ph); v('--pk', pk); book.classList.toggle('peeks', peekOn); v('--cw', cw); v('--bw', bw); v('--bh', bh);
    v('--xl', cw); v('--xr', two ? cw + pw : cw); v('--xc', two ? pw + cw : 0); v('--wc', two ? pw + cw : bw);
    v('--shift', two ? -(pw + cw) / 2 : 0);
    const modeChanged = S.two !== two; S.two = two;
    S.geo = { pw, ph, cw, bw, bh }; if (S.story) { updateStacks(); if (!modeChanged) updatePeeks(); }
    applyZoom();
    book.classList.toggle('two', two); book.classList.toggle('one', !two);
    if (modeChanged) { if (two) S.pos &= ~1; if (S.open) showSpread(); }
  }

  function applyLook() {
    const st = S.story; if (!st) return;
    setVars(book, lookVars(st)); setVars($('#stPrint'), lookVars(st));
    const cc = coverHex(st.cover.color), pp = paperPair(st.look.paper);
    book.style.setProperty('--rb', ribbonHex(st.cover.ribbon)); book.style.setProperty('--cc', cc);
    book.style.setProperty('--cc-d', mixHex(cc, '#000000', .38)); book.style.setProperty('--cc-l', mixHex(cc, '#ffffff', .38));
    book.style.setProperty('--edge', pp[1]); book.style.setProperty('--edge-l', pp[0]);
    book.dataset.fin = st.cover.finish || 'leather';
    applyBg(st.look.bg);
  }
  function renderCoverFace() { B.cleafF.replaceChildren(renderCover(S.story, { edit: S.mode === 'edit' })); }

  const vpLen = () => S.vp.length - (S.vp.length && S.vp[S.vp.length - 1].kind === 'blank' ? 1 : 0);
  const lastPos = () => (S.two ? Math.max(0, S.vp.length - 2) : Math.max(0, vpLen() - 1));
  function mkPage(i, side, opt = {}) {
    const it = (i >= 0 && i < S.vp.length) ? S.vp[i] : null;
    return renderPage(S.story, (!S.two && it && it.kind === 'blank') ? null : it, side, { edit: S.mode === 'edit' && !opt.noEdit });
  }
  function fill(slot, i, side) {
    const el = mkPage(i, side); slot.replaceChildren(el);
    fitPage(el); if (S.hl) highlightIn(el, S.hl); markOverflow(el);
    return el;
  }
  function fitted(i, side) {                      // page ko chhupe box mein naap kar fit karo, taake flip mein bhi sahi dikhe
    const el = mkPage(i, side, { noEdit: true }); B.measure.replaceChildren(el); fitPage(el); return el;
  }
  function showSpread() {
    if (!S.story) return;
    if (S.two) { fill(B.slotL, S.pos, 'left'); fill(B.slotR, S.pos + 1, 'right'); }
    else { B.slotL.replaceChildren(); fill(B.slotR, S.pos, 'single'); }
    updateStacks(); updatePeeks(); updateChrome(); afterSpread();
  }
  function updatePeeks() {
    if (!B.peekR) return;
    const on = !S.two && S.open && S.mode !== 'edit' && book.classList.contains('peeks');
    const mk = (i, side, slot) => {
      const it = on ? S.vp[i] : null;
      if (!it || it.kind === 'blank' || i < 0) { slot.hidden = true; slot.replaceChildren(); return; }
      const inn = h('div', { class: 'st-peek-in' }, renderPage(S.story, it, side, {})); slot.replaceChildren(inn); slot.hidden = false; fitPage(inn.firstChild);
    };
    mk(S.pos + 1, 'right', B.peekR); mk(S.pos - 1, 'left', B.peekL);
  }
  function updateStacks() {
    const { cw } = S.geo, t = cw * 1.05, total = Math.max(1, S.vp.length);
    const lf = S.open ? clamp(S.pos / total, 0, 1) : 0, rf = S.open ? clamp(1 - (S.pos + (S.two ? 2 : 1)) / total, 0, 1) : 1;
    book.style.setProperty('--tl', f1(lerp(1.5, t, lf)) + 'px'); book.style.setProperty('--tr', f1(lerp(1.5, t, rf)) + 'px');
  }
  const firstReal = pos => { for (let i = pos; i < Math.min(S.vp.length, pos + (S.two ? 2 : 1)); i++) if (S.vp[i].kind === 'page') return S.vp[i]; return null; };
  function updateChrome() {
    const st = S.story, total = st.pages.length, sub = $('#stSub');
    $('#stHead').textContent = stripTags(st.cover.title) || 'Our Story';
    let now = 0; const fp = S.open ? firstReal(S.pos) : null;
    if (!S.open) sub.textContent = total ? 'Cover' : 'Cover • no pages yet';
    else if (fp) { const c = chapterOf(st, fp.p), ci = st.chapters.indexOf(c); sub.textContent = `Chapter ${ci + 1} • ${c.title}`; now = fp.n; }
    else { sub.textContent = 'The End'; now = total; }
    $('#stNow').textContent = S.open ? pad2(now) : '--'; $('#stTot').textContent = pad2(total);
    $('#stBar').style.width = (S.open && total ? clamp(now / total, 0, 1) * 100 : 0) + '%';
    const atEnd = S.open && S.pos >= lastPos();
    $('#stPrev').disabled = !S.open; $('#stNext').disabled = atEnd;
    $('#stNext').querySelector('span:not(.ico)').textContent = S.open ? 'Next' : 'Open';
    $('#edPrev').disabled = !S.open; $('#edNext').disabled = atEnd;
    const fav = $('#stFav'), isFav = !!(fp && lsGet('olw_story_fav', []).includes(fp.p.id));
    fav.setAttribute('aria-pressed', String(isFav)); fav.disabled = !fp;
    const fl = fav.querySelector('.st-fl'); if (fl) fl.textContent = isFav ? 'Remove bookmark' : 'Bookmark this page';
    if (fp && S.mode !== 'edit') lsSet(posKey(), fp.p.id);
    book.classList.toggle('closed', !S.open);
  }
  const it_ = pos => firstReal(pos);
  function afterSpread() { if (hooks.afterSpread) hooks.afterSpread(); }
  const hooks = {};

  /* --- page turn: page kai patti (strips) mein banta hai taake asli kaghaz ki tarah mude --- */
  const DUR = ms => (reduced() ? 0 : ms);
  function buildLeaf(side, frontEl, backEl) {
    const { pw, ph } = S.geo, N = pw < 280 ? 12 : 16, sw = pw / N, strips = []; let parent = B.leaf;
    B.leaf.replaceChildren(); B.leaf.style.left = side === 'r' ? 'var(--xr)' : 'var(--xl)';
    const place = (c, left) => { Object.assign(c.style, { position: 'absolute', left: left + 'px', top: '0px', right: 'auto', bottom: 'auto', width: pw + 'px', height: ph + 'px' }); return c; };
    for (let i = 0; i < N; i++) {
      const x0 = side === 'r' ? i * sw : pw - (i + 1) * sw, u0 = pw - (x0 + sw);
      const el = h('div', { class: 'st-strip' }), ff = h('div', { class: 'st-sf' }), fb = h('div', { class: 'st-sb' });
      el.style.cssText = `width:${sw}px;height:${ph}px;left:${i === 0 ? (side === 'r' ? 0 : pw - sw) : (side === 'r' ? sw : -sw)}px;transform-origin:${side === 'r' ? 'left' : 'right'} center;`;
      const fw = sw + 1.2, fl = side === 'r' ? 0 : -1.2; ff.style.cssText = fb.style.cssText = `width:${fw}px;left:${fl}px;`;
      const sdF = h('i', { class: 'st-sd' }), sdB = h('i', { class: 'st-sd' });
      ff.append(place(frontEl.cloneNode(true), -x0), sdF); fb.append(place(backEl.cloneNode(true), -u0), sdB);
      el.append(ff, fb); parent.append(el); parent = el; strips.push({ el, sdF, sdB });
    }
    return strips;
  }
  async function beginTurn(dir) {
    if (S.busy || !S.open) return null;
    if (dir > 0 && S.pos >= lastPos()) return null; if (dir < 0 && S.pos <= 0) return null;
    S.busy = true; S.hl = '';
    const a = document.activeElement; if (a && a.blur && a.closest && a.closest('.st-book')) a.blur();
    const two = S.two, st = { dir, two, p: 0 }; let strips, side, reverse = false, under;
    const A = two ? 180 : 112;
    if (two && dir > 0) {
      side = 'r'; strips = buildLeaf(side, B.slotR.firstChild, fitted(S.pos + 2, 'left')); under = () => fill(B.slotR, S.pos + 3, 'right'); st.cast = B.castR;
    } else if (two) {
      side = 'l'; strips = buildLeaf(side, B.slotL.firstChild, fitted(S.pos - 1, 'right')); under = () => fill(B.slotL, S.pos - 2, 'left'); st.cast = B.castL;
    } else if (dir > 0) {
      side = 'r'; strips = buildLeaf(side, B.slotR.firstChild, fitted(-1, 'left')); under = () => fill(B.slotR, S.pos + 1, 'single'); st.cast = B.castR;
    } else {
      side = 'r'; reverse = true; strips = buildLeaf(side, fitted(S.pos - 1, 'single'), fitted(-1, 'left')); under = () => { }; st.cast = B.castR; st.p = 1;
    }
    Object.assign(st, { strips, side, reverse, A, under });
    under(); B.leaf.hidden = false; if (st.cast) st.cast.hidden = false; book.classList.add('turning');
    setTurn(st, st.p); return st;
  }
  function setTurn(st, p) {
    st.p = p = clamp(p, 0, 1); const N = st.strips.length, phi = p * st.A, bell = Math.sin(Math.PI * p), sign = st.side === 'r' ? -1 : 1;
    const curl = st.two ? .62 : .5; let acc = 0;
    for (let i = 0; i < N; i++) {
      const rel = (phi / N) * (1 + curl * bell * (((i + .5) / N) * 2 - 1)); acc += rel;
      const s = st.strips[i], Ab = Math.min(180, Math.max(0, acc));
      s.el.style.transform = `rotateY(${f1(sign * rel)}deg)`;
      const lit = Math.pow(Math.sin(rad(Math.min(Ab, 90))), 1.25), dk = Math.pow(Math.sin(rad(Math.max(0, 180 - Ab))), 1.25);
      s.sdF.style.opacity = f1(.26 * lit); s.sdB.style.opacity = f1(Ab > 90 ? .26 * dk : 0);
    }
    if (st.cast) st.cast.style.opacity = f1(.62 * Math.sin(Math.PI * Math.min(1, p * 1.05)));
    B.leaf.style.opacity = !st.two && p > .86 ? f1((1 - p) / .14) : 1;
  }
  async function endTurn(st, commit, ms = 920) {
    const target = commit ? (st.reverse ? 0 : 1) : (st.reverse ? 1 : 0), from = st.p, dist = Math.abs(target - from), dur = DUR(Math.max(160, ms * Math.max(.25, dist)));
    if (dur && dist > .001) {
      await new Promise(res => {
        const t0 = performance.now();
        const tick = now => { const t = clamp((now - t0) / dur, 0, 1); setTurn(st, lerp(from, target, ease(t))); t < 1 ? requestAnimationFrame(tick) : res(); };
        requestAnimationFrame(tick);
      });
    }
    setTurn(st, target);
    if (commit) {
      if (st.two) { S.pos += st.dir > 0 ? 2 : -2; if (st.dir > 0) fill(B.slotL, S.pos, 'left'); else fill(B.slotR, S.pos + 1, 'right'); }
      else { S.pos += st.dir; fill(B.slotR, S.pos, 'single'); }
    } else if (!st.two && st.dir > 0) fill(B.slotR, S.pos, 'single');
    else if (st.two && st.dir > 0) fill(B.slotR, S.pos + 1, 'right'); else if (st.two) fill(B.slotL, S.pos, 'left');
    B.leaf.hidden = true; B.leaf.replaceChildren(); B.leaf.style.opacity = 1; B.castL.hidden = true; B.castR.hidden = true; book.classList.remove('turning');
    B.measure.replaceChildren(); S.busy = false; updateStacks(); updateChrome(); afterSpread();
  }
  async function flip(dir) { const st = await beginTurn(dir); if (st) await endTurn(st, true); }
  function go_(dir) {
    if (S.busy) return;
    if (!S.open) return dir > 0 ? openBook() : undefined;
    if (dir > 0 && S.pos < lastPos()) flip(1);
    else if (dir < 0) { if (S.pos <= 0) closeBook(); else flip(-1); }
  }
  function gotoPos(pos, animate = true) {
    pos = clamp(S.two ? pos & ~1 : pos, 0, lastPos());
    if (!S.open) { S.pos = pos; return openBook(true); }
    if (pos === S.pos) { showSpread(); return; }
    S.pos = pos; showSpread();
    if (animate && !reduced()) { book.classList.add('pulse'); setTimeout(() => book.classList.remove('pulse'), 500); }
  }
  const posOfPage = pid => { const i = S.vp.findIndex(x => x.kind === 'page' && x.p.id === pid); return i < 0 ? -1 : i; };

  /* --- cover opening / closing --- */
  const COVER_OPEN2 = [{ offset: 0, transform: 'rotateY(0deg) translateZ(0px)' }, { offset: .3, transform: 'rotateY(-42deg) translateZ(26px)' }, { offset: .62, transform: 'rotateY(-120deg) translateZ(30px)' }, { offset: 1, transform: 'rotateY(-180deg) translateZ(0px)' }];
  const COVER_OPEN1 = [{ offset: 0, transform: 'rotateY(0deg)', opacity: 1 }, { offset: .5, transform: 'rotateY(-64deg)', opacity: 1 }, { offset: 1, transform: 'rotateY(-104deg)', opacity: 0 }];
  const reverseFrames = fr => fr.slice().reverse().map(f => ({ ...f, offset: 1 - f.offset }));
  function runAnim(el, frames, dur, update) {
    if (!dur) return Promise.resolve();
    const a = el.animate(frames, { duration: dur, easing: 'cubic-bezier(.45,.05,.2,1)', fill: 'forwards' });
    const t0 = performance.now(), loop = () => { const t = clamp((performance.now() - t0) / dur, 0, 1); if (update) update(t); if (t < 1) requestAnimationFrame(loop); }; loop();
    return a.finished.catch(() => { });
  }
  const coverShade = (el, t) => { el.style.opacity = f1(Math.sin(clamp(t, 0, 1) * Math.PI) * .55 + (t > .5 ? .3 * (t - .5) * 2 : 0)); };
  async function openBook(instant = false) {
    if (S.open || S.busy) return; S.busy = true; S.open = true; S.hl = S.hl || '';
    if (!S.story.pages.length && S.mode !== 'edit') S.pos = 0;
    S.pos = clamp(S.two ? S.pos & ~1 : S.pos, 0, lastPos());
    const dur = instant || reduced() ? 0 : 1250;
    showSpread(); book.classList.add('opening'); book.classList.remove('closed');
    if (dur) {
      B.cleaf.hidden = false;
      B.cleafB.replaceChildren(h('div', { class: 'st-inside' }, mkPage(S.pos, S.two ? 'left' : 'single', { noEdit: true })));
      const sh = h('i', { class: 'st-sh f' }); B.cleafF.append(sh);
      await runAnim(B.cleaf, S.two ? COVER_OPEN2 : COVER_OPEN1, dur, t => coverShade(sh, t));
      sh.remove();
    }
    B.cleaf.hidden = true; B.cleaf.getAnimations().forEach(a => a.cancel()); B.cleafB.replaceChildren();
    book.classList.remove('opening'); S.busy = false; updateStacks(); updateChrome(); afterSpread();
  }
  async function closeBook() {
    if (!S.open || S.busy) return; S.busy = true;
    if (S.pos !== 0) { S.pos = 0; showSpread(); }
    S.hl = ''; const dur = reduced() ? 0 : 1100;
    renderCoverFace(); B.cleaf.hidden = false;
    B.cleafB.replaceChildren(h('div', { class: 'st-inside' }, mkPage(0, S.two ? 'left' : 'single', { noEdit: true })));
    book.classList.add('opening'); S.open = false; book.classList.add('closed'); updateStacks();
    const sh = h('i', { class: 'st-sh f' }); B.cleafF.append(sh);
    await runAnim(B.cleaf, reverseFrames(S.two ? COVER_OPEN2 : COVER_OPEN1), dur, t => coverShade(sh, 1 - t));
    sh.remove(); B.cleaf.getAnimations().forEach(a => a.cancel()); B.cleafB.replaceChildren();
    book.classList.remove('opening'); S.busy = false; updateChrome(); afterSpread();
  }

  /* --- keyboard + finger-follow swipe --- */
  const typing = () => { const a = document.activeElement; return a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable); };
  const dialogOpen = () => !!document.querySelector('dialog[open]');
  document.addEventListener('keydown', e => {
    if (typing() || dialogOpen() || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); go_(1); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go_(-1); }
    else if (e.key === 'Home' && S.open) { e.preventDefault(); gotoPos(0); }
    else if (e.key === 'End' && S.open) { e.preventDefault(); gotoPos(lastPos()); }
  });
  const swipeArea = $('.st-main');
  let sw = null;
  const calcP = (st, mv, dist) => { const d = clamp((st.dir > 0 ? -mv : mv) / dist, -.15, 1); return st.reverse ? clamp(1 - d, 0, 1) : clamp(d, 0, 1); };

  /* --- zoom (pinch, double-tap, +/- buttons) --- */
  const Z = { z: 1, x: 0, y: 0 }, ZMIN = .55, ZMAX = 3.5;
  function applyZoom() {
    const W = stage.clientWidth, H = stage.clientHeight, g = S.geo;
    if (Z.z <= 1.02 && Z.z >= .98) { Z.z = 1; Z.x = Z.y = 0; }
    const mx = Math.max(0, (g.bw * Z.z - W) / 2 + 28), my = Math.max(0, (g.bh * Z.z - H) / 2 + 28);
    Z.x = clamp(Z.x, -mx, mx); Z.y = clamp(Z.y, -my, my); if (Z.z < 1) { Z.x = Z.y = 0; }
    book.style.setProperty('--z', Z.z.toFixed(3)); book.style.setProperty('--px', Math.round(Z.x) + 'px'); book.style.setProperty('--py', Math.round(Z.y) + 'px');
    stage.classList.toggle('zoomed', Z.z !== 1);
    const zl = $('#zFit'); if (zl) zl.textContent = Math.round(Z.z * 100) + '%';
  }
  function setZoom(z, cx, cy, smooth = true) {
    z = clamp(z, ZMIN, ZMAX); const r = stage.getBoundingClientRect(), ox = r.left + r.width / 2, oy = r.top + r.height / 2;
    if (cx == null) { cx = ox; cy = oy; }
    const k = z / Z.z; Z.x = (cx - ox) - (cx - ox - Z.x) * k; Z.y = (cy - oy) - (cy - oy - Z.y) * k; Z.z = z;
    stage.classList.toggle('smooth', smooth && !reduced()); applyZoom(); if (smooth) setTimeout(() => stage.classList.remove('smooth'), 320);
  }
  $('#zIn').addEventListener('click', () => setZoom(Z.z * 1.25)); $('#zOut').addEventListener('click', () => setZoom(Z.z / 1.25));
  $('#zFit').addEventListener('click', () => { Z.x = Z.y = 0; setZoom(1); });
  stage.addEventListener('wheel', e => { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); setZoom(Z.z * Math.exp(-e.deltaY * .01), e.clientX, e.clientY, false); }, { passive: false });
  document.addEventListener('keydown', e => {
    if (typing() || dialogOpen() || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === '+' || e.key === '=') setZoom(Z.z * 1.25); else if (e.key === '-' || e.key === '_') setZoom(Z.z / 1.25); else if (e.key === '0') { Z.x = Z.y = 0; setZoom(1); }
  });

  const ptrs = new Map(); let pinch = null, pan = null, tap = { t: 0, x: 0, y: 0 };
  const ptrList = () => [...ptrs.values()];
  function startPinch() {
    if (sw && sw.st) endTurn(sw.st, false); sw = null; pan = null;
    const [a, b] = ptrList(); pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, z0: Z.z, c0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, t0: { x: Z.x, y: Z.y } };
  }
  function doPinch() {
    const [a, b] = ptrList(); if (!b) return;
    const d = Math.hypot(a.x - b.x, a.y - b.y), z = clamp(pinch.z0 * d / pinch.d0, ZMIN, ZMAX), c = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const r = stage.getBoundingClientRect(), ox = r.left + r.width / 2, oy = r.top + r.height / 2, k = z / pinch.z0;
    Z.x = (c.x - ox) - (pinch.c0.x - ox - pinch.t0.x) * k; Z.y = (c.y - oy) - (pinch.c0.y - oy - pinch.t0.y) * k; Z.z = z; applyZoom();
  }
  swipeArea.addEventListener('pointerdown', e => {
    if (e.button || !stage.contains(e.target) || e.target.closest('button,a,input,select,textarea,.st-zoom')) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now(), sx: e.clientX, sy: e.clientY });
    if (ptrs.size === 2) { startPinch(); return; }
    if (ptrs.size > 2) return;
    const editing = S.mode === 'edit', onPage = !!e.target.closest('.st-page'), onEdit = !!e.target.closest('[contenteditable="true"],.st-pol,.st-deco,.st-zone');
    if (Z.z !== 1 && !(editing && onEdit)) { pan = { id: e.pointerId, x: e.clientX, y: e.clientY, ox: Z.x, oy: Z.y }; return; }
    if (editing || !S.open || S.busy || onEdit) return;
    sw = { id: e.pointerId, x: e.clientX, y: e.clientY, st: null, pending: false, vx: 0, lx: e.clientX, lt: performance.now(), sc: e.target.closest('.st-scroll .st-content'), ly: e.clientY };
  });
  swipeArea.addEventListener('pointermove', async e => {
    if (ptrs.has(e.pointerId)) { const q = ptrs.get(e.pointerId); q.x = e.clientX; q.y = e.clientY; }
    if (pinch) { doPinch(); e.preventDefault(); return; }
    if (pan && e.pointerId === pan.id) { Z.x = pan.ox + e.clientX - pan.x; Z.y = pan.oy + e.clientY - pan.y; applyZoom(); e.preventDefault(); return; }
    if (!sw || e.pointerId !== sw.id) return;
    const dx = e.clientX - sw.x, dy = e.clientY - sw.y, now = performance.now();
    if (!sw.st) {
      if (sw.pending) return;
      if (Math.abs(dx) > 9 && Math.abs(dx) > Math.abs(dy) * 1.15) {
        const cur = sw; sw.pending = true; const st = await beginTurn(dx < 0 ? 1 : -1);
        if (sw !== cur) { if (st) endTurn(st, false); return; }
        if (!st) { sw = null; return; }
        sw.st = st; sw.pending = false; sw.x = e.clientX; sw.lx = e.clientX; sw.lt = now;
        try { swipeArea.setPointerCapture(sw.id); } catch { /* ignore */ }
      } else if (Math.abs(dy) > 9) { if (sw.sc) { sw.sc.scrollTop -= e.clientY - sw.ly; sw.ly = e.clientY; } else sw = null; }
      return;
    }
    const dist = S.two ? S.geo.pw * 1.05 : stage.clientWidth * .8;
    setTurn(sw.st, calcP(sw.st, e.clientX - sw.x, dist));
    const dt = now - sw.lt; if (dt > 12) { sw.vx = (e.clientX - sw.lx) / dt; sw.lx = e.clientX; sw.lt = now; }
    e.preventDefault();
  });
  const finishSwipe = () => {
    if (!sw) return; const s = sw; sw = null; if (!s.st) return;
    const st = s.st, fv = st.dir > 0 ? -s.vx : s.vx, progressed = st.reverse ? 1 - st.p : st.p;
    endTurn(st, progressed > .3 || fv > .45, 760);
  };
  const upPtr = e => {
    const q = ptrs.get(e.pointerId); ptrs.delete(e.pointerId);
    if (pinch && ptrs.size < 2) { pinch = null; const rest = ptrList()[0]; if (rest && Z.z !== 1) { const id = [...ptrs.keys()][0]; pan = { id, x: rest.x, y: rest.y, ox: Z.x, oy: Z.y }; } }
    if (pan && pan.id === e.pointerId) pan = null;
    if (sw && sw.id === e.pointerId) finishSwipe();
    // double tap: zoom in / out (sirf reading mein)
    if (q && e.type === 'pointerup' && S.mode !== 'edit' && !pinch && Math.hypot(e.clientX - q.sx, e.clientY - q.sy) < 10 && performance.now() - q.t < 300 && !e.target.closest('button,a,input,select,textarea,.st-zoom,.st-peek,.st-cleaf')) {
      const n = performance.now();
      if (n - tap.t < 340 && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < 34) { setZoom(Z.z > 1.05 ? 1 : 2.2, e.clientX, e.clientY); tap.t = 0; }
      else tap = { t: n, x: e.clientX, y: e.clientY };
    }
  };
  swipeArea.addEventListener('pointerup', upPtr); swipeArea.addEventListener('pointercancel', upPtr);
  new ResizeObserver(() => { layout(); }).observe(stage);


  function markOverflow(el) {
    if (el.classList.contains('editing')) placeLines(el);
    if (S.mode !== 'edit' || !el.classList.contains('editing')) return;
    const c = el.querySelector('.st-content'); el.classList.toggle('over', !!c && overflowing(c));
  }

  /* ---------------------------------------------------------------
     12. NAVIGATION, DIALOGS, MENU
     --------------------------------------------------------------- */
  function navTo(page) {
    if (page === 'story') { if (!S.open) openBook(); return; }
    if (BUILT_PAGES[page]) { if (E.dirty) flushSave(); location.href = PAGE_URL[page]; return; }
    toast(`${PAGE_NAMES[page] || page} page is coming soon ♡`);
  }
  document.addEventListener('click', e => { const t = e.target.closest('[data-go]'); if (t) { e.preventDefault(); navTo(t.dataset.go); } });

  $$('dialog').forEach(d => {
    d.addEventListener('click', e => { if (e.target === d && d.id !== 'dlgConfirm') d.close(); });
    $$('[data-close]', d).forEach(b => b.addEventListener('click', () => d.close()));
  });
  function ask(title, msg, yes = 'Yes', no = 'No') {
    return new Promise(res => {
      const d = $('#dlgConfirm'); let done = false;
      $('#cfTitle').textContent = title; $('#cfMsg').textContent = msg; $('#cfYes').textContent = yes; $('#cfNo').textContent = no;
      const fin = v => { if (done) return; done = true; d.onclose = null; if (d.open) d.close(); res(v); };
      $('#cfForm').onsubmit = e => { e.preventDefault(); fin(true); };
      $('#cfNo').onclick = () => fin(false); d.oncancel = e => { e.preventDefault(); fin(false); }; d.onclose = () => fin(false);
      d.showModal(); $('#cfNo').focus();
    });
  }

  const menu = $('#stMenu'), menuBtn = $('#stMenuBtn');
  const closeMenu = () => { menu.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); };
  menuBtn.addEventListener('click', e => { e.stopPropagation(); menu.hidden = !menu.hidden; menuBtn.setAttribute('aria-expanded', String(!menu.hidden)); if (!menu.hidden) { const f = $('button:not([hidden])', menu); f && f.focus(); } });
  document.addEventListener('click', e => { if (!e.target.closest('.st-menu-wrap')) closeMenu(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeMenu();
    if (!menu.hidden && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault(); const items = $$('button:not([hidden])', menu), i = items.indexOf(document.activeElement);
      items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus();
    }
  });
  menu.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return; closeMenu();
    const f = { contents: openContents, search: openSearch, cover: () => (S.open ? closeBook() : toast('You are already on the cover')), print: printStory, export: exportBackup, import: () => $('#fileJson').click() }[b.dataset.act];
    if (f) f();
  });
  function applyRole() { $$('.st-owner').forEach(el => (el.hidden = !canEdit())); }
  $('#stEdit').addEventListener('click', () => enterEdit());

  /* bookmarks (abhi is device mein; backend ke baad har user ke saath) */
  $('#stFav').addEventListener('click', () => {
    const it = S.open && firstReal(S.pos); if (!it) return;
    const f = lsGet('olw_story_fav', []), i = f.indexOf(it.p.id);
    i >= 0 ? f.splice(i, 1) : f.push(it.p.id); lsSet('olw_story_fav', f.slice(-200));
    updateChrome(); toast(i >= 0 ? 'Bookmark removed' : 'Page bookmarked ♡', 1600);
  });

  /* contents / timeline / bookmarks */
  function pageBtn(it, extra) {
    const p = it.p;
    return h('button', { type: 'button', class: 'st-ci', onclick: () => { $('#dlgContents').close(); $('#dlgSearch').close(); gotoPos(posOfPage(p.id)); } },
      h('b', { text: pad2(it.n) }), h('span', {}, h('i', { text: p.title || 'Untitled page' }), h('small', { text: [fmtDate(p.date), extra].filter(Boolean).join(' • ') })));
  }
  function renderContents(tab) {
    const st = S.story, body = $('#ctBody'); body.replaceChildren();
    $$('[data-ct]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.ct === tab)));
    const items = buildVP(st).filter(x => x.kind === 'page');
    if (!items.length) { body.append(h('p', { class: 'hint', text: 'There are no pages yet.' })); return; }
    if (tab === 'chapters') {
      st.chapters.forEach((c, ci) => {
        const mine = items.filter(x => x.p.ch === c.id); if (!mine.length) return;
        body.append(h('h3', { text: `Chapter ${ci + 1} • ${c.title}` }), ...mine.map(x => pageBtn(x)));
      });
    } else if (tab === 'timeline') {
      const dated = items.filter(x => parseISO(x.p.date)).sort((a, b) => a.p.date.localeCompare(b.p.date)), none = items.filter(x => !parseISO(x.p.date));
      let last = '';
      dated.forEach(x => { const pd = parseISO(x.p.date), key = `${MONTHS[pd.mo - 1]} ${pd.y}`; if (key !== last) { body.append(h('h3', { text: key })); last = key; } body.append(pageBtn(x, chapterOf(st, x.p).title)); });
      if (none.length) body.append(h('h3', { text: 'No date' }), ...none.map(x => pageBtn(x)));
      if (!dated.length) body.prepend(h('p', { class: 'hint', text: 'No page has a date yet. In Edit mode you can add a date to each page.' }));
    } else {
      const fav = lsGet('olw_story_fav', []), mine = items.filter(x => fav.includes(x.p.id));
      if (!mine.length) body.append(h('p', { class: 'hint', text: 'No bookmarks yet. Use the menu (top right) to bookmark the page you are reading.' }));
      mine.forEach(x => body.append(pageBtn(x)));
    }
  }
  function openContents() { renderContents('chapters'); $('#dlgContents').showModal(); }
  $$('[data-ct]').forEach(b => b.addEventListener('click', () => renderContents(b.dataset.ct)));

  /* search */
  function snippet(full, idx, len) {
    const a = Math.max(0, idx - 28), b = Math.min(full.length, idx + len + 40);
    return (a > 0 ? '…' : '') + full.slice(a, b) + (b < full.length ? '…' : '');
  }
  function runSearch(q) {
    const body = $('#seBody'); body.replaceChildren(); q = q.trim();
    if (q.length < 2) { body.append(h('p', { class: 'hint', text: 'Type at least 2 letters.' })); return; }
    const items = buildVP(S.story).filter(x => x.kind === 'page'), low = q.toLowerCase(); let n = 0;
    items.forEach(it => {
      const p = it.p, full = [p.title, fmtDate(p.date), ...p.body.map(stripHtml), p.sign, ...p.photos.map(f => f.cap), ...p.deco.filter(d => d.type === 'note').map(d => d.text)].filter(Boolean).join('  •  ');
      const i = full.toLowerCase().indexOf(low); if (i < 0) return; n++;
      const sn = snippet(full, i, q.length), j = sn.toLowerCase().indexOf(low);
      const btn = pageBtn(it); const small = btn.querySelector('small'); small.replaceChildren(sn.slice(0, j), h('mark', { class: 'st-hit', text: sn.slice(j, j + q.length) }), sn.slice(j + q.length));
      btn.addEventListener('click', () => { S.hl = q; setTimeout(() => { if (S.hl === q) { S.hl = ''; } }, 15000); }, true);
      body.append(btn);
    });
    if (!n) body.append(h('p', { class: 'hint', text: `“${q}” was not found on any page.` }));
    else body.prepend(h('p', { class: 'hint', text: `Found on ${n} page${n > 1 ? 's' : ''}` }));
  }
  function openSearch() { $('#seInput').value = ''; runSearch(''); $('#dlgSearch').showModal(); setTimeout(() => $('#seInput').focus(), 30); }
  $('#seInput').addEventListener('input', e => runSearch(e.target.value));

  /* print / PDF */
  async function printStory() {
    const st = S.story, box = $('#stPrint'); box.replaceChildren();
    if (!st.pages.length) { toast('Write at least one page before printing'); return; }
    box.append(h('section', { class: 'st-sheet' }, renderCover(st, { print: true })));
    buildVP(st).filter(x => x.kind !== 'blank').forEach(it => box.append(h('section', { class: 'st-sheet' }, renderPage(st, it, 'single', {}))));
    document.body.classList.add('st-printing');
    try { await document.fonts.ready; } catch { /* ignore */ }
    await new Promise(r => setTimeout(r, 250));
    $$('.st-page', box).forEach(fitPage);
    toast('Choose “Save as PDF” in the print window to make a PDF', 4200);
    window.print();
  }
  window.addEventListener('afterprint', () => { document.body.classList.remove('st-printing'); $('#stPrint').replaceChildren(); });

  /* backup export / import */
  async function exportBackup() {
    const st = S.story, images = {};
    for (const id of imageIds(st)) { if (id.startsWith('demo:')) continue; const d = await imgGet(id); if (d) images[id] = d; }
    const data = { app: 'our-little-world-story', format: 1, exportedAt: new Date().toISOString(), note: S.mode === 'read' ? 'published' : 'draft', story: st, images };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
    const a = h('a', { href: url, download: `our-story-backup-${todayISO()}.json` }); document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast(`Backup downloaded: ${st.pages.length} pages, ${Object.keys(images).length} photos (text and photos included)`, 4200);
  }
  let pendingImport = null;
  $('#fileJson').addEventListener('change', async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f || !canEdit()) return;
    const body = $('#imBody'), err = $('#imError'), go = $('#imGo'); body.replaceChildren(); err.hidden = true; go.hidden = true; pendingImport = null;
    $('#dlgImport').showModal();
    try {
      if (f.size > LIM.importBytes) throw new Error('This backup file is too big (over 80 MB).');
      let data; try { data = JSON.parse(await f.text()); } catch { throw new Error('This file is not valid JSON.'); }
      if (!data || data.app !== 'our-little-world-story' || !data.story) throw new Error('This does not look like an Our Little World story backup.');
      const st = normalizeStory(data.story), raw = data.images && typeof data.images === 'object' ? data.images : {}, images = {}; let missing = 0, count = 0;
      for (const id of imageIds(st)) { if (id.startsWith('demo:')) continue; count++; if (okDataUrl(raw[id])) images[id] = raw[id]; else missing++; }
      pendingImport = { st, images };
      body.append(h('p', { text: `This backup has ${st.pages.length} pages, ${st.chapters.length} chapters and ${count - missing} photos.` }),
        missing ? h('p', { class: 'error', text: `${missing} photos are missing from the backup file and will show empty.` }) : null,
        h('p', { class: 'hint', text: 'It goes into the DRAFT only. Your published diary is not touched; you preview and publish it yourself.' + (E.draft ? ' The current draft will be replaced.' : '') }));
      go.hidden = false;
    } catch (ex) { err.textContent = ex.message || 'Could not read the backup.'; err.hidden = false; }
  });
  $('#imGo').addEventListener('click', async () => {
    if (!pendingImport) return; const btn = $('#imGo'); btn.disabled = true;
    try {
      for (const [id, d] of Object.entries(pendingImport.images)) await imgPut(id, d);
      const d = pendingImport.st; d.rev = S.pub.rev; d.demo = false;
      await kvSet(kk('draft'), d); E.draft = d; E.baseRev = S.pub.rev; pendingImport = null; E.hasDraft = true;
      $('#dlgImport').close(); if (S.mode === 'edit') { E.hist = []; E.hi = -1; pushHist(); refresh(); } else await enterEdit(true);
      toast('Backup is now in your draft. Preview it, then publish.', 4200);
    } catch { $('#imError').textContent = 'Could not restore. Your old draft and published diary are safe.'; $('#imError').hidden = false; }
    finally { btn.disabled = false; }
  });

  /* ---------------------------------------------------------------
     13. BACKDROP  (blanket / wood / linen / colour / gradient / photo + blur, dim, flowers)
     --------------------------------------------------------------- */
  function buildBackdrop() {
    const bg = $('#stBg');
    bg.replaceChildren(h('div', { class: 'bg-layers' },
      h('div', { class: 'bg-base' }), h('div', { class: 'bg-folds' }), h('div', { class: 'bg-photo' }), h('div', { class: 'bg-tint' }), h('div', { class: 'bg-glow' }),
      h('div', { class: 'bg-fl tr', html: lavenderSVG(41) + flowersSVG(5) }), h('div', { class: 'bg-fl bl', html: lavenderSVG(52) + blossomSVG(8) + flowersSVG(9) }),
      h('div', { class: 'bg-fl tl', html: blossomSVG(3) + lavenderSVG(61) })),
      h('div', { class: 'bg-dim' }), h('div', { class: 'bg-vig' }));
  }
  function applyBg(b) {
    const el = $('#stBg'); if (!el || !b) return;
    const src = b.type === 'photo' && b.img ? imgSrc(b.img) : '';
    el.dataset.bg = b.type === 'photo' && !src ? 'solid' : b.type;
    el.classList.toggle('no-fl', !b.flowers); el.classList.toggle('no-glow', !b.glow);
    el.style.setProperty('--bgc', b.color); el.style.setProperty('--bgc2', b.color2);
    el.style.setProperty('--bgblur', b.blur + 'px'); el.style.setProperty('--bgdim', String(b.dim / 100));
    const ph = $('.bg-photo', el); if (ph) ph.style.backgroundImage = src ? `url("${src}")` : 'none';
    const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.content = b.color;
  }


  /* ---------------------------------------------------------------
     14. EDITOR  (owner only)  Draft -> Preview -> Publish
     --------------------------------------------------------------- */
  let histT = null, imgCb = null;
  const curPage = () => {
    const st = S.story; if (!st) return null;
    let p = E.focusPid && st.pages.find(x => x.id === E.focusPid);
    if (!p) { const it = firstReal(S.pos); p = it && it.p; }
    return p || null;
  };
  const selPhotoObj = () => { const p = curPage(); return p && p.photos.find(f => f.id === E.selPhoto) || null; };
  const selDecoObj = () => { const p = curPage(); return p && p.deco.find(d => d.id === E.selDeco) || null; };
  const selZoneObj = () => { const p = curPage(); return p && (p.clear || []).find(z => z.id === E.selZone) || null; };
  const styleOf = p => ({ lines: p.lines ? clone(p.lines) : null, hf: p.hf, bf: p.bf, hs: p.hs, ha: p.ha, hc: p.hc, hd: p.hd, design: p.design, dc: p.dc, dop: p.dop });
  const pageEl = pid => book.querySelector(`.st-page[data-pid="${pid}"]`);
  const setStatus = t => { $('#edStatus').textContent = t; };

  function refresh() {
    S.story = S.mode === 'read' ? S.pub : E.draft;
    S.vp = buildVP(S.story); S.pos = clamp(S.two ? S.pos & ~1 : S.pos, 0, lastPos());
    applyLook(); renderCoverFace();
    if (S.open) showSpread(); else { updateChrome(); syncPanel(); }
  }
  function regroup(st) {
    const ord = new Map(st.chapters.map((c, i) => [c.id, i]));
    st.pages = st.pages.map((p, i) => [p, i]).sort((a, b) => ord.get(a[0].ch) - ord.get(b[0].ch) || a[1] - b[1]).map(x => x[0]);
  }

  /* --- draft save + history --- */
  function pushHist() {
    clearTimeout(histT); if (!E.draft) return;
    const s = JSON.stringify(E.draft); if (E.hist[E.hi] === s) { syncUndo(); return; }
    E.hist = E.hist.slice(0, E.hi + 1); E.hist.push(s); if (E.hist.length > 60) E.hist.shift(); E.hi = E.hist.length - 1; syncUndo();
  }
  const syncUndo = () => { $('#edUndo').disabled = E.hi <= 0; $('#edRedo').disabled = E.hi >= E.hist.length - 1; };
  function touch(hist = 'soon') {
    E.dirty = true; setStatus('Saving draft...');
    clearTimeout(E.saveT); E.saveT = setTimeout(flushSave, 700);
    if (hist === 'now') pushHist(); else { clearTimeout(histT); histT = setTimeout(pushHist, 900); }
  }
  async function flushSave() {
    clearTimeout(E.saveT); if (!E.dirty || !E.draft || E.saving) return;
    E.saving = true;
    try { await kvSet(kk('draft'), E.draft); E.dirty = false; E.saveErr = false; setStatus(`Draft saved • ${timeNow()}`); }
    catch { E.saveErr = true; setStatus('Draft NOT saved!'); toast('Could not save the draft (storage may be full). Please download a backup.', 4500); }
    finally { E.saving = false; if (E.dirty && !E.saveErr) E.saveT = setTimeout(flushSave, 400); }
  }
  addEventListener('pagehide', () => { if (S.mode !== 'read') flushSave(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && S.mode !== 'read') flushSave(); });
  addEventListener('beforeunload', e => { if (E.dirty && E.saveErr) { e.preventDefault(); e.returnValue = ''; } });

  function loadHist(i) {
    clearTimeout(histT); E.hi = i; E.draft = JSON.parse(E.hist[i]); S.story = E.draft;
    if (!selPhotoObj()) E.selPhoto = null; if (!selDecoObj()) E.selDeco = null; if (!selZoneObj()) E.selZone = null;
    E.dirty = true; clearTimeout(E.saveT); E.saveT = setTimeout(flushSave, 500); refresh(); syncUndo();
  }
  function undo() { pushHist(); if (E.hi > 0) loadHist(E.hi - 1); }
  function redo() { if (E.hi < E.hist.length - 1) loadHist(E.hi + 1); }
  $('#edUndo').addEventListener('click', undo); $('#edRedo').addEventListener('click', redo);
  $('#edPrev').addEventListener('click', () => go_(-1)); $('#edNext').addEventListener('click', () => go_(1));
  document.addEventListener('keydown', e => {
    if (S.mode !== 'edit' || !(e.ctrlKey || e.metaKey)) return;
    const k = e.key.toLowerCase(), a = document.activeElement;
    if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.type !== 'range' && a.type !== 'checkbox') return;
    if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); } else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
    else if (k === 's') { e.preventDefault(); pushHist(); flushSave(); }
  });

  /* --- mode switching --- */
  function setBanner() {
    const b = $('#stBanner'); b.replaceChildren();
    if (S.mode === 'edit') b.append('Editing a draft. Readers see the old diary until you Publish.');
    else if (S.mode === 'preview') b.append('Preview: the reader will see the diary exactly like this. It is not published yet.');
    else if (!canEdit()) { /* doosre ki diary: sirf padhna; Mine/His-Her pill aur toast kafi hain */ }
    else if (E.hasDraft) b.append('You have an unpublished draft. ', h('button', { type: 'button', class: 'link', onclick: () => enterEdit() }, 'Continue editing'));
    b.hidden = !b.childNodes.length;
  }
  function setMode(m) {
    S.mode = m; document.body.classList.toggle('st-edit', m === 'edit'); document.body.classList.toggle('st-preview', m === 'preview');
    $('#stEditbar').hidden = m === 'read'; $('#stStudio').hidden = m !== 'edit'; book.classList.toggle('zone-edit', m === 'edit' && E.tab === 'design');
    const pb = $('#edPreview'); pb.replaceChildren(h('span', { class: 'ico', 'data-icon': m === 'preview' ? 'pen' : 'eye' }), m === 'preview' ? 'Back to editing' : 'Preview'); paintIcons(pb);
    setBanner(); refresh(); requestAnimationFrame(layout); setTimeout(layout, 120);
  }
  const starterStory = () => { const s = blankStory(); s.pages.push(blankPage(s.chapters[0].id)); return s; };
  async function enterEdit(fromImport = false) {
    if (!canEdit()) return;
    if (S.mode === 'preview') { setMode('edit'); return; }
    if (S.mode === 'edit') return;
    let d = E.draft, raw = null;
    if (!d) { try { raw = await kvGet(kk('draft')); if (raw) d = normalizeStory(raw); } catch { d = null; } }
    if (!d) { d = S.pub.demo ? starterStory() : clone(S.pub); d.rev = S.pub.rev; E.dirty = true; }
    if (!d.pages.length) d.pages.push(blankPage(d.chapters[0].id));
    await loadImages(d);
    E.draft = d; E.baseRev = d.rev; E.hasDraft = true; E.hist = []; E.hi = -1; E.selPhoto = E.selDeco = null; E.focusPid = null; pushHist();
    setStatus(E.dirty ? 'Draft' : 'Draft saved');
    S.hl = ''; if (S.busy) await new Promise(r => setTimeout(r, 1300));
    setMode('edit'); if (!S.open) await openBook(true);
    if (E.dirty) E.saveT = setTimeout(flushSave, 400);
  }
  async function exitEdit() {
    clearTimeout(E.saveT); await flushSave();
    if (E.dirty && E.saveErr && !(await ask('Draft not saved', 'The draft could not be saved. Closing now may lose your changes. Close anyway?', 'Close anyway', 'Go back'))) return;
    setMode('read');
  }
  $('#edExit').addEventListener('click', exitEdit);
  $('#edPreview').addEventListener('click', async () => { await flushSave(); setMode(S.mode === 'preview' ? 'edit' : 'preview'); });

  /* --- inline text editing --- */
  const LIMS = { title: LIM.title, sign: 160, cap: 80, note: 90, ctitle: 50, csub: 90 };
  const ctxPage = t => { const el = t.closest('.st-page'); const p = el && S.story.pages.find(x => x.id === el.dataset.pid); return { el, p }; };
  const fixEmpty = t => { if (!t.textContent && t.innerHTML) t.innerHTML = ''; };
  book.addEventListener('input', e => {
    if (S.mode !== 'edit') return;
    const t = e.target.closest('[data-k]'); if (!t) return; fixEmpty(t);
    const k = t.dataset.k, d = E.draft, { el, p } = ctxPage(t);
    if (LIMS[k] && t.textContent.length > LIMS[k]) { t.textContent = t.textContent.slice(0, LIMS[k]); const r = document.createRange(); r.selectNodeContents(t); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
    const val = t.textContent.replace(/[\u0000-\u001f]/g, ' ');
    if (k === 'ctitle') { d.cover.title = val; updateChrome(); }
    else if (k === 'csub') d.cover.subtitle = val;
    else if (!p) return;
    else if (k === 'title') p.title = val; else if (k === 'sign') p.sign = val;
    else if (k === 'p') {
      const i = +t.dataset.i, html = cleanHtml(t.innerHTML);
      if (stripTags(t.innerHTML).length > LIM.paraLen) { t.innerHTML = p.body[i]; toast(`One paragraph can have at most ${LIM.paraLen} characters`); return; }
      p.body[i] = html;
    } else if (k === 'cap') { const f = p.photos.find(x => x.id === t.dataset.phid); if (f) f.cap = val; }
    else if (k === 'note') { const o = p.deco.find(x => x.id === t.dataset.did); if (o) o.text = val; }
    if (el) { markOverflow(el); syncOverflow(); }
    touch();
  });
  book.addEventListener('keydown', e => {
    if (S.mode !== 'edit') return; const t = e.target.closest && e.target.closest('[data-k]'); if (!t) return;
    const k = t.dataset.k;
    if (e.key === 'Enter' && k !== 'p') { e.preventDefault(); t.blur(); return; }
    if (k !== 'p') return;
    const { p } = ctxPage(t); if (!p) return; const i = +t.dataset.i;
    const sel = getSelection(); if (!sel.rangeCount) return; const r = sel.getRangeAt(0);
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      if (p.body.length >= LIM.paras) { toast('Too many paragraphs on this page'); return; }
      if (!r.collapsed) r.deleteContents();
      const tail = document.createRange(); tail.selectNodeContents(t); tail.setStart(r.endContainer, r.endOffset);
      const dv = document.createElement('div'); dv.append(tail.extractContents());
      p.body[i] = cleanHtml(t.innerHTML); p.body.splice(i + 1, 0, cleanHtml(dv.innerHTML));
      p.photos.forEach(f => { if (f.at >= i + 1) f.at++; });
      touch('now'); refresh(); focusPara(p.id, i + 1, true);
    } else if (e.key === 'Backspace' && i > 0 && r.collapsed) {
      const pre = document.createRange(); pre.selectNodeContents(t); pre.setEnd(r.startContainer, r.startOffset);
      if (pre.toString() === '' && !pre.cloneContents().querySelector('img')) {
        e.preventDefault(); const prevLen = stripTags(p.body[i - 1]).length;
        p.body[i - 1] = cleanHtml(p.body[i - 1] + cleanHtml(t.innerHTML)); p.body.splice(i, 1);
        p.photos.forEach(f => { if (f.at > i) f.at--; });
        touch('now'); refresh(); focusPara(p.id, i - 1, false, prevLen);
      }
    }
  });
  function focusPara(pid, i, atStart, off) {
    const t = pageEl(pid) && pageEl(pid).querySelector(`.st-p[data-i="${i}"]`); if (!t) return;
    t.focus(); const r = document.createRange(), s = getSelection();
    if (atStart) { r.selectNodeContents(t); r.collapse(true); }
    else {
      const w = document.createTreeWalker(t, NodeFilter.SHOW_TEXT); let n, left = off || 0, done = false;
      while ((n = w.nextNode())) { if (left <= n.nodeValue.length) { r.setStart(n, left); done = true; break; } left -= n.nodeValue.length; }
      if (!done) { r.selectNodeContents(t); r.collapse(false); } else r.collapse(true);
    }
    s.removeAllRanges(); s.addRange(r);
  }
  book.addEventListener('paste', e => {
    if (S.mode !== 'edit' || !e.target.closest('[contenteditable="true"]')) return;
    e.preventDefault(); const txt = (e.clipboardData || window.clipboardData).getData('text/plain').replace(/\r/g, '');
    document.execCommand('insertText', false, e.target.closest('[data-k="p"]') ? txt : txt.replace(/\n+/g, ' '));
  });
  book.addEventListener('drop', e => { if (S.mode === 'edit') e.preventDefault(); });
  book.addEventListener('focusin', e => {
    const pg = e.target.closest && e.target.closest('.st-page[data-pid]');
    if (S.mode === 'edit' && pg && E.focusPid !== pg.dataset.pid) { E.focusPid = pg.dataset.pid; syncPanel(); }
  });

  /* --- formatting toolbar --- */
  $$('[data-cmd]').forEach(b => {
    b.addEventListener('mousedown', e => e.preventDefault());
    b.addEventListener('click', () => {
      const a = document.activeElement;
      if (!a || !a.closest || !a.closest('[data-k="p"]')) { toast('First select some text inside a paragraph on the page'); return; }
      const c = b.dataset.cmd;
      if (c === 'mark') { document.execCommand('styleWithCSS', false, true); document.execCommand('hiliteColor', false, '#ffe58a'); }
      else if (c === 'clear') document.execCommand('removeFormat'); else document.execCommand(c);
    });
  });

  /* --- selection + dragging of photos / decor --- */
  function applySel() {
    $$('.st-pol.sel,.st-deco.sel,.st-zone.sel', book).forEach(el => el.classList.remove('sel'));
    if (S.mode !== 'edit') return;
    if (E.selPhoto) $$(`.st-pol[data-photo="${E.selPhoto}"]`, book).forEach(el => el.classList.add('sel'));
    if (E.selDeco) $$(`.st-deco[data-deco="${E.selDeco}"]`, book).forEach(el => el.classList.add('sel'));
    if (E.selZone) $$(`.st-zone[data-zone="${E.selZone}"]`, book).forEach(el => el.classList.add('sel'));
  }
  function setTab(t) {
    E.tab = t; $$('.st-tabs [data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === t)));
    $$('.st-panel').forEach(p => (p.hidden = p.dataset.panel !== t)); book.classList.toggle('zone-edit', S.mode === 'edit' && t === 'design'); syncPanel();
  }
  let drag = null;
  book.addEventListener('pointerdown', e => {
    if (S.mode !== 'edit' || e.button) return;
    const pg = e.target.closest('.st-page[data-pid]'); if (pg) E.focusPid = pg.dataset.pid;
    const zn = e.target.closest('.st-zone');
    if (zn && pg) {
      E.selZone = zn.dataset.zone; E.selPhoto = E.selDeco = null; applySel(); const zo = selZoneObj(); if (!zo) return;
      const r = pg.getBoundingClientRect();
      drag = { el: zn, o: zo, zone: true, rs: !!e.target.closest('.st-zh'), x: e.clientX, y: e.clientY, a: zo.x, b: zo.y, aw: zo.w, ah: zo.h, w: r.width, hh: r.height, moved: false };
      zn.setPointerCapture(e.pointerId); e.preventDefault(); syncPanel(); return;
    }
    const pol = e.target.closest('.st-pol'), dc = e.target.closest('.st-deco');
    if (!pol && !dc) { if (E.selPhoto || E.selDeco || E.selZone) { E.selPhoto = E.selDeco = E.selZone = null; applySel(); } syncPanel(); return; }
    E.selZone = null;
    if (pol) { E.selPhoto = pol.dataset.photo; E.selDeco = null; setTab('photos'); } else { E.selDeco = dc.dataset.deco; E.selPhoto = null; setTab('decor'); }
    applySel();
    if (e.target.closest('[contenteditable="true"]') || !pg) return;
    const o = pol ? selPhotoObj() : selDecoObj(); if (!o) return;
    const r = pg.getBoundingClientRect(), el = pol || dc;
    drag = { el, o, pol: !!pol, x: e.clientX, y: e.clientY, a: pol ? o.dx : o.x, b: pol ? o.dy : o.y, w: r.width, hh: r.height, moved: false };
    el.setPointerCapture(e.pointerId); e.preventDefault();
  });
  book.addEventListener('pointermove', e => {
    if (!drag) return; const mx = e.clientX - drag.x, my = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(mx, my) < 3) return; drag.moved = true;
    if (drag.zone) {
      const o = drag.o, el = drag.el;
      if (drag.rs) { o.w = f1(clamp(drag.aw + mx / drag.w * 100, 3, 100)); o.h = f1(clamp(drag.ah + my / drag.hh * 100, 2, 100)); el.style.width = o.w + '%'; el.style.height = o.h + '%'; }
      else { o.x = f1(clamp(drag.a + mx / drag.w * 100, -20, 100)); o.y = f1(clamp(drag.b + my / drag.hh * 100, -20, 100)); el.style.left = o.x + '%'; el.style.top = o.y + '%'; }
      placeLines(el.closest('.st-page')); return;
    }
    if (drag.pol) { drag.o.dx = f1(clamp(drag.a + mx / drag.w * 100, -30, 30)); drag.o.dy = f1(clamp(drag.b + my / drag.w * 100, -30, 30)); drag.el.style.setProperty('--dx', drag.o.dx + 'cqw'); drag.el.style.setProperty('--dy', drag.o.dy + 'cqw'); }
    else { drag.o.x = f1(clamp(drag.a + mx / drag.w * 100, -10, 100)); drag.o.y = f1(clamp(drag.b + my / drag.hh * 100, -10, 100)); drag.el.style.left = drag.o.x + '%'; drag.el.style.top = drag.o.y + '%'; }
  });
  const endDrag = () => { if (drag && drag.moved) { touch('now'); syncPanel(); } drag = null; };
  book.addEventListener('pointerup', endDrag); book.addEventListener('pointercancel', endDrag);

  /* --- Studio: tabs, bindings --- */
  $$('.st-tabs [data-tab]').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
  $('#stCollapse').addEventListener('click', () => {
    const c = $('#stStudio').classList.toggle('collapsed'); $('#stCollapse').setAttribute('aria-expanded', String(!c)); requestAnimationFrame(layout); setTimeout(layout, 260);
  });
  const ctxObj = c => ({ page: curPage, photo: selPhotoObj, deco: selDecoObj, zone: selZoneObj, lines: () => { const p = curPage(); return p ? (p.lines || (E.draft && E.draft.look.lines)) : null; }, cover: () => E.draft && E.draft.cover, look: () => E.draft && E.draft.look, bg: () => E.draft && E.draft.look.bg }[c] || (() => null))();
  const ownLines = () => { const p = curPage(); if (p && !p.lines) p.lines = clone(E.draft.look.lines); return p && p.lines; };
  let rrT = 0;
  const rerenderSoon = () => { cancelAnimationFrame(rrT); rrT = requestAnimationFrame(() => { applyLook(); renderCoverFace(); if (S.open) showSpread(); else { updateChrome(); syncPanel(); } }); };
  $('#stStudio').addEventListener('input', e => {
    const el = e.target.closest('[data-f]'); if (!el || S.mode !== 'edit') return;
    const [ctx, key] = el.dataset.f.split('.'); if (ctx === 'lines') ownLines(); const o = ctxObj(ctx); if (!o) return;
    let v = el.type === 'checkbox' ? el.checked : (el.type === 'range' || el.type === 'number') ? +el.value : String(el.value).replace(/[\u0000-\u001f]/g, ' ');
    if (typeof v === 'string' && el.maxLength > 0) v = v.slice(0, el.maxLength);
    if (el.type === 'number') { const p = curPage(); v = Math.round(clamp(Number.isFinite(v) ? v : 0, 0, p ? p.body.length : 0)); }
    if (key === 'date' && v && !parseISO(v)) v = '';
    o[key] = v;
    if (ctx === 'page' && key === 'ch') { regroup(E.draft); S.vp = buildVP(E.draft); const i = posOfPage(o.id); if (i >= 0) S.pos = S.two ? i & ~1 : i; }
    touch(el.type === 'range' || el.type === 'text' || el.type === 'color' ? 'soon' : 'now'); outputs(); rerenderSoon(); syncSwatches();
  });
  function outputs() {
    const p = curPage(), f = selPhotoObj(), d = selDecoObj(), L = E.draft && E.draft.look;
    if (p) $('#pgScaleOut').textContent = p.scale + '%'; if (f) { $('#phSizeOut').textContent = f.size; $('#phRotOut').textContent = f.rot + '°'; }
    if (d) { $('#dcWOut').textContent = d.w; $('#dcRotOut').textContent = d.rot + '°'; }
    if (p) { $('#pgHsOut').textContent = p.hs + '%'; $('#pgDopOut').textContent = p.dop + '%'; }
    const ln = p && (p.lines || (L && L.lines)); if (ln) { $('#lnGapOut').textContent = ln.gap + '%'; $('#lnWOut').textContent = (ln.w / 100).toFixed(2); $('#lnOpOut').textContent = ln.op + '%'; $('#lnOffOut').textContent = ln.off; }
    const z = selZoneObj(); if (z) { $('#znWOut').textContent = Math.round(z.w) + '%'; $('#znHOut').textContent = Math.round(z.h) + '%'; }
    if (L) { $('#lkSizeOut').textContent = L.size + '%'; $('#lkLeadOut').textContent = L.leading + '%'; $('#lkAgedOut').textContent = L.aged + '%'; $('#bgBlurOut').textContent = L.bg.blur + 'px'; $('#bgDimOut').textContent = L.bg.dim + '%'; }
  }
  function syncOverflow() { const p = curPage(), el = p && pageEl(p.id); $('#stOverflow').hidden = !(el && el.classList.contains('over')); }

  /* quick styles */
  const PRESETS = [
    { n: 'Lavender', cover: '#8f7db8', foil: 'gold', ribbon: '#7a5bb0', paper: 'cream', ink: '#5b3f93', bg: { type: 'knit', color: '#f1e6d2', flowers: true } },
    { n: 'Pink', cover: '#e58fb1', foil: 'white', ribbon: '#e05a8c', paper: 'pink', ink: '#a23a62', bg: { type: 'knit', color: '#f6dfe6', flowers: true } },
    { n: 'Rose gold', cover: '#d9908c', foil: 'rose', ribbon: '#c9a24a', paper: 'blush', ink: '#7a2142', bg: { type: 'linen', color: '#f2e2dc', flowers: true } },
    { n: 'Midnight', cover: '#2f3d6b', foil: 'silver', ribbon: '#e05a8c', paper: 'night', ink: '#f1e8d8', bg: { type: 'gradient', color: '#2b2450', color2: '#0e0b1c', flowers: false } },
    { n: 'Garden', cover: '#8aa384', foil: 'gold', ribbon: '#f4efe8', paper: 'sage', ink: '#2f5a3d', bg: { type: 'wood', color: '#e6d2b2', flowers: true } },
    { n: 'Vintage', cover: '#6d4a2e', foil: 'gold', ribbon: '#a3263a', paper: 'kraft', ink: '#5a3b24', bg: { type: 'wood', color: '#d9b98c', flowers: false } }
  ];
  function applyPreset(pr) {
    const d = E.draft; Object.assign(d.cover, { color: pr.cover, foil: pr.foil, ribbon: pr.ribbon });
    d.look.paper = pr.paper; d.look.ink = pr.ink; Object.assign(d.look.bg, { color2: '#cdb6d6', blur: 0, dim: 0, glow: true }, pr.bg);
    touch('now'); rerenderSoon(); syncPanel(); toast(`${pr.n} style applied`, 1600);
  }
  const MINI = {
    sticky: '<svg viewBox="0 0 40 40"><path d="M4 4H36V28L28 36H4Z" fill="#fff0a8" stroke="#d9b94a"/><path d="M28 36V28H36Z" fill="#ecd470" stroke="#d9b94a"/><path d="M10 14H30M10 20H26" stroke="#c9a93a" stroke-linecap="round"/></svg>',
    ticket: '<svg viewBox="0 0 40 40"><path d="M3 10H37V17A3 3 0 0 0 37 23V30H3V23A3 3 0 0 0 3 17Z" fill="#fbd0de" stroke="#b8416c"/><path d="M13 10V30" stroke="#b8416c" stroke-dasharray="2 2"/></svg>',
    tag: '<svg viewBox="0 0 40 40"><path d="M6 12L14 4H34V36H6Z" fill="#e3d6f6" stroke="#6f50a8"/><circle cx="14" cy="12" r="2.4" fill="#fff" stroke="#6f50a8"/></svg>',
    banner: '<svg viewBox="0 0 40 40"><path d="M2 12H38L33 20L38 28H2L7 20Z" fill="#e8799f" stroke="#b8416c"/></svg>',
    bubble: '<svg viewBox="0 0 40 40"><path d="M6 6H34A4 4 0 0 1 38 10V22A4 4 0 0 1 34 26H20L12 34V26H6A4 4 0 0 1 2 22V10A4 4 0 0 1 6 6Z" fill="#fff" stroke="#b8416c"/><path d="M10 14H30M10 19H24" stroke="#e8799f" stroke-linecap="round"/></svg>',
    text: '<span style="font:400 26px/40px var(--hf),cursive;color:#b8416c">Aa</span>'
  };
  const iconFor = t => t === 'note' ? '<i class="st-miniNote"></i>' : t === 'tape' ? '<i class="st-tape st-wide t-lavender"></i>' : MINI[t] || (ART[t] ? ART[t](3) : (ART2[t] ? artFor(t, 3, DECO_C0[t] || 0, 'pk') : ''));
  let dsKey = '';
  function buildDesignGrid() {
    const p = curPage(), dc = p ? p.dc : '#e58fb1', key = dc + (p ? p.design : '');
    if (key === dsKey && $('#dsGrid').childNodes.length) return; dsKey = key;
    const fake = { id: 'tile', dc, dop: 100 };
    $('#dsGrid').replaceChildren(...Object.entries(DESIGNS).map(([k, n]) => {
      const tile = h('div', { class: 'st-dtile' }); const d = designEl(Object.assign({}, fake, { design: k }), 'right'); if (d) tile.append(d);
      return h('button', { type: 'button', class: 'st-dsb', 'aria-pressed': String(p && p.design === k), 'data-v': k, onclick: () => { const q = curPage(); if (!q) return; q.design = k; touch('now'); syncPanel(); rerenderSoon(); } }, tile, h('span', { text: n }));
    }));
  }
  function buildStudio() {
    const sw = (box, items, bind) => { box.dataset.bind = bind; box.replaceChildren(...items.map(([val, col, name]) => h('button', { type: 'button', class: 'st-sw', 'data-val': val, style: `--c:${col}`, title: name || val, 'aria-label': name || val || 'Default', onclick: () => { const [ctx, key] = bind.split('.'); if (ctx === 'lines') ownLines(); const o = ctxObj(ctx); if (!o) return; o[key] = val; touch('now'); syncPanel(); rerenderSoon(); } }))); };
    sw($('#swCover'), Object.entries(COVERS).map(([k, c]) => [c, c, COVER_NAMES[k]]), 'cover.color');
    sw($('#swRibbon'), Object.entries(RIBBONS).map(([k, c]) => [c, c, k]), 'cover.ribbon');
    sw($('#swPaper'), Object.entries(PAPERS).map(([k, c]) => [k, `linear-gradient(135deg,${c[0]},${c[1]})`, PAPER_NAMES[k]]), 'look.paper');
    sw($('#swInk'), INKS.map(c => [c, c]), 'look.ink');
    sw($('#swHc'), [['', 'conic-gradient(#5b3f93,#a23a62,#2d3b5a,#5b3f93)', 'Diary ink'], ...INKS.slice(0, 7).concat(['#d6457f', '#b8416c', '#7a5bb0', '#3a7a6a', '#c9953a', '#e58fb1']).map(c => [c, c])], 'page.hc');
    sw($('#swDc'), ['#e58fb1', '#f06292', '#d6457f', '#b79ae0', '#f2a38a', '#7fb2e5', '#8fbf9f', '#d9ad4c', '#d9344f', '#f4c6d4'].map(c => [c, c]), 'page.dc');
    sw($('#swLn'), [['', 'conic-gradient(#5b3f93,#a23a62,#2d3b5a,#5b3f93)', 'Same as ink'], ...['#c9a0b4', '#8aa0c8', '#c9b27a', '#9a8fb8', '#a8c4a8', '#e57a9a', '#5b3f93', '#3a3a44'].map(c => [c, c])], 'lines.color');
    sw($('#swDeco'), PALS.map((P, i) => [i, `linear-gradient(135deg,${P.l},${P.a})`, P.n]), 'deco.c');
    $('#fHead').replaceChildren(...HEAD_FONTS.map(f => h('option', { value: f, text: f, style: `font-family:"${f}"` })));
    $('#fBody').replaceChildren(...BODY_FONTS.map(f => h('option', { value: f, text: f, style: `font-family:"${f}"` })));
    $('#pgHf').replaceChildren(h('option', { value: '', text: 'Same as diary' }), ...HEAD_FONTS.map(f => h('option', { value: f, text: f, style: `font-family:"${f}"` })));
    $('#pgBf').replaceChildren(h('option', { value: '', text: 'Same as diary' }), ...BODY_FONTS.map(f => h('option', { value: f, text: f, style: `font-family:"${f}"` })));
    $('#dcFont').replaceChildren(h('option', { value: '', text: 'Diary handwriting' }), ...HEAD_FONTS.map(f => h('option', { value: f, text: f, style: `font-family:"${f}"` })));
    $('#pgHd').replaceChildren(...Object.entries(HD_STYLES).map(([k, n]) => h('option', { value: k, text: n })));
    $('#lnStyle').replaceChildren(...Object.entries(LINE_STYLES).map(([k, n]) => h('option', { value: k, text: n })));
    $('#phFrame').replaceChildren(...Object.entries(FRAMES).map(([k, n]) => h('option', { value: k, text: n })));
    $('#fFinish').replaceChildren(...Object.entries(FINISHES).map(([k, n]) => h('option', { value: k, text: n })));
    $('#fBgType').replaceChildren(...Object.entries(BG_TYPES).map(([k, n]) => h('option', { value: k, text: n })));
    $('#bgTypes').replaceChildren(...Object.entries(BG_TYPES).map(([k, n]) => h('button', { type: 'button', class: 'st-bgt', 'data-v': k, 'data-t': k, onclick: () => { const L = E.draft && E.draft.look; if (!L) return; if (k === 'photo' && !L.bg.img) { $('#bgPhoto').click(); return; } L.bg.type = k; touch('now'); syncPanel(); rerenderSoon(); } }, h('i'), h('span', { text: n }))));
    const BGC = ['#f1e6d2', '#f6dfe6', '#f2e2dc', '#e6defa', '#dbe9f6', '#dcefe3', '#fff4c9', '#cdbfa6', '#8f7db8', '#e58fb1', '#5b4a7a', '#2b2438'];
    sw($('#swBg'), BGC.map(c => [c, c]), 'bg.color');
    sw($('#swBg2'), BGC.map(c => [c, c]), 'bg.color2');
    $('#swBgPair').dataset.bind = 'bg.pair';
    $('#swBgPair').replaceChildren(...[['#f6dfe6', '#e6defa'], ['#fff4c9', '#f6dfe6'], ['#dbe9f6', '#e6defa'], ['#dcefe3', '#fff4c9'], ['#e58fb1', '#8f7db8'], ['#2b2438', '#5b4a7a']].map(([a, b]) => h('button', { type: 'button', class: 'st-sw', style: `--c:linear-gradient(135deg,${a},${b})`, 'aria-label': 'Gradient', onclick: () => { const L = E.draft && E.draft.look; if (!L) return; L.bg.type = 'gradient'; L.bg.color = a; L.bg.color2 = b; touch('now'); syncPanel(); rerenderSoon(); } })));
    $('#dcGrid').replaceChildren(...DECO_GROUPS.flatMap(([gname, items]) => [h('h4', { class: 'st-gh', text: gname }),
      h('div', { class: 'st-addgrid' }, ...Object.entries(items).map(([t, n]) => h('button', { type: 'button', class: 'st-add', onclick: () => addDeco(t) }, h('span', { class: 'st-add-ic', html: iconFor(t) }), n)))]));
    $('#stPresets').replaceChildren(...PRESETS.map(pr => h('button', { type: 'button', class: 'st-preset', onclick: () => applyPreset(pr) }, h('i', { style: `--a:${pr.cover};--b:${paperPair(pr.paper)[0]};--c:${pr.bg.color}` }), pr.n)));
  }
  const norm = v => String(v).toLowerCase();
  function syncSwatches() {
    const st = E.draft; if (!st) return;
    $$('.st-swatches[data-bind]').forEach(box => {
      const [ctx, key] = box.dataset.bind.split('.'), o = ctxObj(ctx); if (!o) return; const cur = o[key];
      $$('.st-sw', box).forEach(b => b.setAttribute('aria-pressed', String(norm(b.dataset.val) === norm(cur ?? ''))));
    });
  }
  function syncPanel() {
    if (S.mode !== 'edit' || !E.draft) return;
    const st = E.draft, p = curPage();
    if (p && E.focusPid !== p.id) E.focusPid = p.id;
    const f = selPhotoObj(), d = selDecoObj(), z = selZoneObj(); if (!f) E.selPhoto = null; if (!d) E.selDeco = null; if (!z) E.selZone = null;
    $('#pgCh').replaceChildren(...st.chapters.map((c, i) => h('option', { value: c.id, text: `${i + 1}. ${c.title}` })));
    $$('[data-f]', $('#stStudio')).forEach(el => {
      const [ctx, key] = el.dataset.f.split('.'), o = ctxObj(ctx); if (!o || el === document.activeElement) return;
      let v = o[key];
      if (el.type === 'color') v = ctx === 'look' && key === 'paper' ? paperPair(v)[0] : (isHex(v) ? v : (ctx === 'lines' ? st.look.ink : '#000000'));
      if (el.type === 'checkbox') el.checked = !!v; else el.value = v ?? '';
    });
    syncSwatches(); $('#bgC2Row').hidden = st.look.bg.type !== 'gradient'; $('#bgGradRow').hidden = st.look.bg.type !== 'gradient';
    $$('#bgTypes .st-bgt').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === st.look.bg.type)));
    $('#bgPhotoDel').disabled = !st.look.bg.img; $('#cvPhotoDel').disabled = !st.cover.img;
    const idx = p ? st.pages.indexOf(p) : -1;
    $('#pgInfo').textContent = p ? `Page ${idx + 1} of ${st.pages.length} • ${chapterOf(st, p).title}` : 'No pages yet. Press “New page”.';
    ['pgDup', 'pgUp', 'pgDown', 'pgDel', 'pgDateClear', 'phAdd', 'pgSpill'].forEach(id => ($('#' + id).disabled = !p));
    $('#pgAdd').disabled = st.pages.length >= LIM.pages;
    $('#phCtl').hidden = !f; $('#dcCtl').hidden = !d; $('#dcTextRow').hidden = !(d && TEXT_DECOS[d.type]); $('#dcFontRow').hidden = !(d && TEXT_DECOS[d.type] && d.type !== 'postmark');
    $('#swDeco').closest('.st-field').hidden = !(d && !NOCOLOR[d.type]);
    $('#znCtl').hidden = !z; $('#znDel').disabled = !z; ['lnAll'].forEach(id => ($('#' + id).disabled = !p)); $('#lnReset').disabled = !(p && p.lines); $('#znAdd').disabled = !p || (p.clear || []).length >= LIM.zones;
    $('#lnInfo').textContent = p ? (p.lines ? 'This page has its own line settings.' : 'This page uses the diary default lines. Changing a setting here only changes this page.') : '';
    $('#znList').replaceChildren(...(p ? (p.clear || []).map((x, i) => h('li', {}, h('button', { type: 'button', class: x.id === E.selZone ? 'on' : '', onclick: () => { E.selZone = x.id; E.selPhoto = E.selDeco = null; applySel(); syncPanel(); } }, `No-lines area ${i + 1}`))) : []));
    if (E.tab === 'design') buildDesignGrid();
    $$('#dsGrid .st-dsb').forEach(b => b.setAttribute('aria-pressed', String(p && p.design === b.dataset.v)));
    $('#phAdd').disabled = !p || p.photos.length >= LIM.photos;
    $('#phList').replaceChildren(...(p ? p.photos.map((x, i) => h('li', {}, h('button', { type: 'button', class: x.id === E.selPhoto ? 'on' : '', onclick: () => { E.selPhoto = x.id; E.selDeco = null; applySel(); syncPanel(); } }, h('img', { src: imgSrc(x.img), alt: '' }), h('span', { text: x.cap || `Photo ${i + 1}` })))) : []));
    $('#dcList').replaceChildren(...(p ? p.deco.map((x, i) => h('li', {}, h('button', { type: 'button', class: x.id === E.selDeco ? 'on' : '', onclick: () => { E.selDeco = x.id; E.selPhoto = null; applySel(); syncPanel(); } }, `${i + 1}. ${DECO_TYPES[x.type]}`))) : []));
    if (!$('#stOutline').contains(document.activeElement)) renderOutline();
    outputs(); syncOverflow(); syncUndo(); applySel();
  }
  hooks.afterSpread = () => { applySel(); if (S.mode === 'edit') syncPanel(); };

  /* --- page / chapter operations --- */
  const gotoPid = pid => { S.vp = buildVP(S.story); const i = posOfPage(pid); E.focusPid = pid; if (i >= 0) { S.pos = S.two ? i & ~1 : i; } showSpread(); };
  function addPage(afterIdx, chId, o = {}) {
    const st = E.draft; if (st.pages.length >= LIM.pages) { toast(`A diary cannot have more than ${LIM.pages} pages`); return null; }
    const np = Object.assign(blankPage(chId), o); st.pages.splice(afterIdx + 1, 0, np); touch('now'); return np;
  }
  $('#pgAdd').addEventListener('click', () => { const st = E.draft, p = curPage(), i = p ? st.pages.indexOf(p) : st.pages.length - 1, np = addPage(i, p ? p.ch : st.chapters[0].id, p ? styleOf(p) : {}); if (np) { gotoPid(np.id); syncPanel(); } });
  $('#pgDup').addEventListener('click', () => {
    const st = E.draft, p = curPage(); if (!p) return; const c = clone(p); c.id = uid('p'); c.photos.forEach(f => (f.id = uid('f'))); c.deco.forEach(d => (d.id = uid('d'))); (c.clear || []).forEach(z => (z.id = uid('z'))); c.title = c.title ? c.title + ' (copy)' : '';
    if (st.pages.length >= LIM.pages) return toast(`A diary cannot have more than ${LIM.pages} pages`);
    st.pages.splice(st.pages.indexOf(p) + 1, 0, c); touch('now'); gotoPid(c.id); syncPanel();
  });
  function movePage(dir) {
    const st = E.draft, p = curPage(); if (!p) return; const i = st.pages.indexOf(p), n = st.pages[i + dir];
    if (!n) return toast(dir < 0 ? 'This is the first page' : 'This is the last page');
    if (n.ch !== p.ch) p.ch = n.ch; else { st.pages[i] = n; st.pages[i + dir] = p; }
    touch('now'); gotoPid(p.id); syncPanel();
  }
  $('#pgUp').addEventListener('click', () => movePage(-1)); $('#pgDown').addEventListener('click', () => movePage(1));
  $('#pgDateClear').addEventListener('click', () => { const p = curPage(); if (p) { p.date = ''; touch('now'); syncPanel(); rerenderSoon(); } });
  $('#pgDel').addEventListener('click', async () => {
    const st = E.draft, p = curPage(); if (!p) return;
    if (!(await ask('Delete this page?', `“${p.title || 'Untitled page'}” will be removed from the draft. You can still Undo before publishing.`, 'Delete', 'No'))) return;
    const i = st.pages.indexOf(p); st.pages.splice(i, 1); E.focusPid = (st.pages[i] || st.pages[i - 1] || {}).id || null; E.selPhoto = E.selDeco = null;
    touch('now'); refresh(); toast('Page removed. Use Undo to bring it back.');
  });
  $('#pgShrink').addEventListener('click', () => {
    const p = curPage(); if (!p) return; p.scale = clamp((p.scale || 100) - 6, 70, 130); touch('now'); outputs(); syncPanel(); rerenderSoon();
    toast(`Text size on this page: ${p.scale}%`, 1400);
  });
  $('#pgSpill').addEventListener('click', () => {
    const st = E.draft, p = curPage(); if (!p) return; const moved = [];
    for (let n = 0; n < 60 && p.body.length > 1; n++) {
      const el = pageEl(p.id), c = el && el.querySelector('.st-content'); if (!c || !overflowing(c)) break;
      moved.unshift(p.body.pop()); p.photos.forEach(f => { f.at = Math.min(f.at, p.body.length); }); showSpread();
    }
    if (!moved.length) { const el = pageEl(p.id), c = el && el.querySelector('.st-content'); toast(c && overflowing(c) ? 'There is only one big paragraph. Press Enter to split it into smaller ones.' : 'The text already fits on the page'); return; }
    const np = addPage(st.pages.indexOf(p), p.ch, Object.assign(styleOf(p), { body: moved, title: '' })); if (!np) return;
    touch('now'); gotoPid(np.id); toast('The extra text moved to a new page'); syncPanel();
  });
  $('#chAdd').addEventListener('click', () => {
    const st = E.draft; if (st.chapters.length >= 60) return;
    const c = { id: uid('c'), title: 'New chapter' }; st.chapters.push(c); const np = addPage(st.pages.length - 1, c.id);
    if (np) { gotoPid(np.id); } syncPanel();
  });
  function moveChapter(ci, dir) {
    const st = E.draft, j = ci + dir; if (j < 0 || j >= st.chapters.length) return;
    [st.chapters[ci], st.chapters[j]] = [st.chapters[j], st.chapters[ci]]; regroup(st); touch('now'); refresh();
  }
  async function delChapter(ci) {
    const st = E.draft, c = st.chapters[ci]; if (st.chapters.length < 2) return toast('There must be at least one chapter');
    const to = st.chapters[ci ? ci - 1 : 1], mine = st.pages.filter(p => p.ch === c.id);
    if (!(await ask('Remove this chapter?', mine.length ? `Its ${mine.length} page(s) will move into “${to.title}”. No page is deleted.` : 'This chapter is empty.', 'Remove', 'No'))) return;
    mine.forEach(p => (p.ch = to.id)); st.chapters.splice(ci, 1); regroup(st); touch('now'); refresh();
  }
  function renderOutline() {
    const st = E.draft, box = $('#stOutline'); if (!st) return; box.replaceChildren();
    st.chapters.forEach((c, ci) => {
      const head = h('div', { class: 'st-ch' },
        h('input', { value: c.title, maxlength: 60, 'aria-label': 'Chapter name', oninput: e => { c.title = cleanText(e.target.value, 60) || 'Chapter'; touch('soon'); updateChrome(); } }),
        h('button', { type: 'button', class: 'btn ghost small', 'aria-label': 'Move chapter up', onclick: () => moveChapter(ci, -1) }, '↑'),
        h('button', { type: 'button', class: 'btn ghost small', 'aria-label': 'Move chapter down', onclick: () => moveChapter(ci, 1) }, '↓'),
        h('button', { type: 'button', class: 'btn ghost small st-danger', 'aria-label': 'Remove chapter', onclick: () => delChapter(ci) }, '✕'));
      const ul = h('ul', { class: 'st-list' });
      st.pages.forEach((p, i) => { if (p.ch !== c.id) return; ul.append(h('li', {}, h('button', { type: 'button', class: p.id === E.focusPid ? 'on' : '', onclick: () => { gotoPid(p.id); syncPanel(); } }, `${pad2(i + 1)}  ${p.title || 'Untitled'}`))); });
      if (!ul.childNodes.length) ul.append(h('li', { class: 'hint', text: 'No pages in this chapter.' }));
      box.append(h('div', { class: 'st-chbox' }, head, ul));
    });
  }

  /* --- photos --- */
  async function readImage(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Please choose a JPG, PNG or WebP photo.');
    if (file.size > LIM.imgBytes) throw new Error('The photo must be smaller than 8 MB.');
    const url = URL.createObjectURL(file), img = new Image();
    try {
      await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('This photo could not be opened.')); img.src = url; });
      const s = Math.min(1, LIM.imgPx / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.naturalWidth * s)); c.height = Math.max(1, Math.round(img.naturalHeight * s));
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
      const d = c.toDataURL('image/jpeg', .86); if (!okDataUrl(d)) throw new Error('The photo could not be processed.'); return d;
    } finally { URL.revokeObjectURL(url); }
  }
  const pickImage = cb => { imgCb = cb; $('#fileImg').click(); };
  $('#fileImg').addEventListener('change', async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f || !imgCb || S.mode !== 'edit') return; const cb = imgCb; imgCb = null;
    try { const d = await readImage(f), id = uid('im'); await imgPut(id, d); cb(id); } catch (ex) { toast(ex.message || 'Could not add the photo', 4000); }
  });
  $('#phAdd').addEventListener('click', () => pickImage(id => {
    const p = curPage(); if (!p) return; const f = mkPhoto(id, { side: p.photos.length % 2 ? 'left' : 'right', at: Math.min(1, p.body.length) });
    p.photos.push(f); E.selPhoto = f.id; E.selDeco = null; touch('now'); rerenderSoon(); setTimeout(syncPanel, 40);
  }));
  $('#phReplace').addEventListener('click', () => pickImage(id => { const f = selPhotoObj(); if (!f) return; f.img = id; touch('now'); rerenderSoon(); setTimeout(syncPanel, 40); }));
  $('#phRemove').addEventListener('click', () => { const p = curPage(), f = selPhotoObj(); if (!p || !f) return; p.photos.splice(p.photos.indexOf(f), 1); E.selPhoto = null; touch('now'); rerenderSoon(); setTimeout(syncPanel, 40); });
  $$('[data-nudge]').forEach(b => b.addEventListener('click', () => {
    const f = selPhotoObj(); if (!f) return;
    if (b.dataset.nudge === 'reset') { f.dx = 0; f.dy = 0; } else { const [x, y] = b.dataset.nudge.split(',').map(Number); f.dx = clamp(f.dx + x, -30, 30); f.dy = clamp(f.dy + y, -30, 30); }
    touch('now'); rerenderSoon();
  }));
  $('#cvPhoto').addEventListener('click', () => pickImage(id => { E.draft.cover.img = id; touch('now'); rerenderSoon(); setTimeout(syncPanel, 40); }));
  $('#cvPhotoDel').addEventListener('click', () => { E.draft.cover.img = ''; touch('now'); rerenderSoon(); setTimeout(syncPanel, 40); });
  $('#bgPhoto').addEventListener('click', () => pickImage(id => { const b = E.draft.look.bg; b.img = id; b.type = 'photo'; touch('now'); rerenderSoon(); setTimeout(syncPanel, 40); }));
  $('#bgPhotoDel').addEventListener('click', () => { const b = E.draft.look.bg; b.img = ''; if (b.type === 'photo') b.type = 'knit'; touch('now'); rerenderSoon(); setTimeout(syncPanel, 40); });
  const NOCOLOR = { lavender: 1, flowers: 1, blossom: 1, hearts: 1, note: 1, tape: 1, sparkle: 1, rainbow: 1, clip: 1 };
  function addDeco(type) {
    const p = curPage(); if (!p) return; if (p.deco.length >= LIM.decos) return toast(`At most ${LIM.decos} decorations per page`);
    const k = p.deco.length, d = mkDeco(type, { x: clamp(48 + (k % 4) * 7, 0, 76), y: clamp(46 + (k % 5) * 7, 0, 84), text: DECO_TEXT[type] || '', c: DECO_C0[type] || 0 });
    p.deco.push(d); E.selDeco = d.id; E.selPhoto = null; E.selZone = null; touch('now'); rerenderSoon(); setTab('decor'); setTimeout(syncPanel, 40);
  }
  $$('[data-dnudge]').forEach(b => b.addEventListener('click', () => { const d = selDecoObj(); if (!d) return; const [x, y] = b.dataset.dnudge.split(',').map(Number); d.x = f1(clamp(d.x + x, -10, 100)); d.y = f1(clamp(d.y + y, -10, 100)); touch('now'); rerenderSoon(); }));
  /* lines + no-lines areas */
  $('#lnAll').addEventListener('click', () => { const p = curPage(); if (!p) return; const l = clone(p.lines || E.draft.look.lines); E.draft.look.lines = l; E.draft.pages.forEach(q => (q.lines = null)); touch('now'); syncPanel(); rerenderSoon(); toast('Lines applied to all pages', 1800); });
  $('#lnReset').addEventListener('click', () => { const p = curPage(); if (!p) return; p.lines = null; touch('now'); syncPanel(); rerenderSoon(); });
  $('#znAdd').addEventListener('click', () => { const p = curPage(); if (!p) return; (p.clear ||= []); const z = { id: uid('z'), x: 12 + p.clear.length * 4, y: 34 + p.clear.length * 6, w: 46, h: 16 }; p.clear.push(z); E.selZone = z.id; E.selPhoto = E.selDeco = null; touch('now'); rerenderSoon(); setTimeout(syncPanel, 40); });
  $('#znDel').addEventListener('click', () => { const p = curPage(), z = selZoneObj(); if (!p || !z) return; p.clear.splice(p.clear.indexOf(z), 1); E.selZone = null; touch('now'); rerenderSoon(); setTimeout(syncPanel, 40); });
  $('#dcRemove').addEventListener('click', () => { const p = curPage(), d = selDecoObj(); if (!p || !d) return; p.deco.splice(p.deco.indexOf(d), 1); E.selDeco = null; touch('now'); rerenderSoon(); setTimeout(syncPanel, 40); });

  /* --- draft actions --- */
  $('#dfSave').addEventListener('click', async () => { pushHist(); E.dirty = true; await flushSave(); if (!E.saveErr) toast('Draft saved'); });
  $('#dfDiscard').addEventListener('click', async () => {
    if (!(await ask('Discard the draft?', 'All unpublished changes will be removed. The published diary stays as it is.', 'Discard', 'No'))) return;
    clearTimeout(E.saveT); await kvDel(kk('draft')); E.draft = null; E.dirty = false; E.hasDraft = false; E.hist = []; E.hi = -1; setMode('read'); gcImages(); toast('Draft discarded');
  });
  $('#dfRestore').addEventListener('click', async () => {
    const prev = await kvGet(kk('prev')); if (!prev) return toast('There is no previous published version yet');
    if (!(await ask('Restore the previous published version?', 'The previous published version will come into the draft and replace the current draft (you can Undo). You publish it yourself.', 'Restore', 'No'))) return;
    try { const d = normalizeStory(prev); await loadImages(d); d.rev = S.pub.rev; E.draft = d; E.baseRev = d.rev; touch('now'); refresh(); toast('The previous version is now in your draft'); } catch { toast('Could not open the previous version'); }
  });
  $('#dfBlank').addEventListener('click', async () => {
    if (!(await ask('Clear the whole diary?', 'All pages in the draft will be removed (you can Undo). The published diary is untouched until you publish.', 'Clear', 'No'))) return;
    const s = starterStory(); s.rev = E.draft.rev; s.cover = E.draft.cover; s.look = E.draft.look; E.draft = s; E.focusPid = null; E.selPhoto = E.selDeco = null; S.pos = 0; touch('now'); refresh();
  });

  /* --- publish --- */
  function validate(st) {
    const errs = [], warns = [];
    if (!st.pages.length) errs.push('There must be at least one page.');
    const miss = id => id && !id.startsWith('demo:') && !IMG.has(id);
    st.pages.forEach((p, i) => {
      if (!p.title.trim() && p.body.every(b => !stripHtml(b).trim()) && !p.photos.length) warns.push(`Page ${i + 1} is completely empty.`);
      if (p.photos.some(f => miss(f.img))) errs.push(`A photo on page ${i + 1} is missing. Add it again or remove it.`);
    });
    if (miss(st.cover.img)) errs.push('The cover photo is missing.');
    if (miss(st.look.bg.img)) errs.push('The background photo is missing.');
    return { errs, warns };
  }
  $('#edPublish').addEventListener('click', async () => {
    await flushSave(); const st = E.draft, v = validate(st), pub = S.pub, body = $('#puBody');
    const old = new Map(pub.pages.map(p => [p.id, JSON.stringify(p)])); let add = 0, chg = 0;
    st.pages.forEach(p => { if (!old.has(p.id)) add++; else if (old.get(p.id) !== JSON.stringify(p)) chg++; });
    const rem = pub.pages.filter(p => !st.pages.some(x => x.id === p.id)).length, photos = st.pages.reduce((n, p) => n + p.photos.length, 0);
    body.replaceChildren(
      h('p', { text: pub.demo ? 'This is your first real publish. Your own diary will replace the sample diary.' : 'After publishing, the reader sees this new diary. The old version is kept once so you can restore it.' }),
      h('ul', { class: 'st-sum' }, h('li', { text: `${st.pages.length} pages, ${st.chapters.length} chapters, ${photos} photos` }),
        pub.demo ? null : h('li', { text: `${add} new, ${chg} changed, ${rem} removed pages` })),
      ...v.warns.map(w => h('p', { class: 'hint', text: '⚠ ' + w })), ...v.errs.map(w => h('p', { class: 'error', text: w })));
    $('#puError').hidden = true; $('#puGo').disabled = v.errs.length > 0; $('#dlgPublish').showModal();
  });
  $('#puGo').addEventListener('click', async () => {
    const btn = $('#puGo'), err = $('#puError'); btn.disabled = true; err.hidden = true;
    try {
      const cur = await kvGet(kk('published')); if ((cur ? cur.rev : 0) !== E.baseRev) throw new Error('Another tab already published the diary. Download a backup and start again.');
      const nw = normalizeStory(clone(E.draft)); nw.rev = (cur ? cur.rev : 0) + 1; nw.demo = false;
      await kvPublish(nw, S.pub.demo ? null : clone(S.pub));
      S.pub = nw; E.draft = null; E.dirty = false; E.hasDraft = false; E.hist = []; E.hi = -1; E.selPhoto = E.selDeco = null; clearTimeout(E.saveT);
      $('#dlgPublish').close(); setMode('read'); toast('Published ♡ The reader now sees the new diary.', 4000); gcImages(); cloudPush(VIEW, nw);
    } catch (ex) { err.textContent = (ex && ex.message) || 'Could not publish. Your old published diary is safe.'; err.hidden = false; }
    finally { btn.disabled = false; }
  });


  /* ---------------------------------------------------------------
     14b. APNA KEYBOARD (mobile / touch) + zaroori editing tools
     Diary likhte waqt phone ka keyboard nahi, yeh apna keyboard aata hai (abc / 123 / Urdu / emoji)
     aur uske upar tools: Undo, Redo, B I U H, text size, font. Strip mein ⌨ dabane se phone ka keyboard bhi use kar sakte hain.
     --------------------------------------------------------------- */
  const KB = { on: false, mode: lsGet('olw_story_kb', 'own') === 'system' ? 'system' : 'own', layer: 'abc', shift: true, caps: false, cat: 0, last: null, range: null, hold: false, pos: null, hideT: 0, holdT: 0, rep: 0, rep2: 0 };
  const EDITABLE = '[contenteditable="true"]';
  const kbDock = $('#stKbDock'), kbKeys = $('#stKb'), kbTools = $('#stKbTools');
  const kbEnabled = () => canEdit() && matchMedia('(pointer:coarse)').matches;
  const isEd = el => !!(el && el.closest && el.closest(EDITABLE) && book.contains(el));
  const kbIco = n => h('span', { class: 'ico', html: svgIcon(n) });
  const KB_LAYERS = {
    abc: [['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'], ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'], ['z', 'x', 'c', 'v', 'b', 'n', 'm']],
    num: [['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'], ['-', '/', ':', ';', '(', ')', '₨', '&', '@', '"'], ['.', ',', '?', '!', "'", '♡', '~']],
    urdu: [['ق', 'و', 'ع', 'ر', 'ت', 'ے', 'ء', 'ی', 'ہ', 'پ'], ['ا', 'س', 'د', 'ف', 'گ', 'ح', 'ج', 'ک', 'ل'], ['ز', 'ش', 'چ', 'ط', 'ب', 'ن', 'م', '،']],
    urdu2: [['ً', 'ٌ', 'ٍ', 'َ', 'ُ', 'ِ', 'ّ', 'ْ', 'ٰ', '؟'], ['آ', 'ص', 'ڈ', 'غ', 'ھ', 'خ', 'ض', 'ذ', '۔'], ['ژ', 'ٹ', 'ث', 'ظ', 'ں', 'ۓ', 'ڑ', '!']]
  };
  const KB_EMO = [
    '😀😃😄😁😆😅😂🤣😊😇🙂😉😌😍🥰😘😗😙😚😋😛😜🤪😝🤗🤭🤔😐😏😒🙄😬😴😪🥱😷🥺😢😭😤😡🤯😱😳🥵🥶',
    '❤️🧡💛💚💙💜🖤🤍🤎💔❣️💕💞💓💗💖💘💝💟💋💌🌹🥀🌷🌸💐🌺🌻🌼✨💫⭐🌟🔥💯🎀',
    '👍👎👌🤌✌️🤞🤟🤘🤙👈👉👆👇☝️👋🤚✋👏🙌🤲🤝🙏💪🫶🫂👀',
    '🐶🐱🐭🐹🐰🦊🐻🐼🐨🐯🦁🐮🐷🐸🐵🐔🐧🐦🦉🦋🐝🐞🐢🐬🐳🐙🦄🐾🌿🍀🌴🌵',
    '🍎🍊🍋🍌🍉🍇🍓🍒🍑🍍🍕🍔🍟🍿🍩🍪🎂🍰🧁🍫🍬🍭☕🍵🥤🍷🍦',
    '✈️🚗🚲⛵🏝️🏔️🌅🌄🌈☀️🌙🌧️⛄🌊🏠🎡🌍🏖️🌃🎁🎈🎉🎊🎵🎶📷📸📱💍👑🕯️🧸'
  ];
  const KB_CAT = ['😀', '❤️', '👍', '🐶', '🍕', '✈️'];
  const splitEmoji = s => (typeof Intl !== 'undefined' && Intl.Segmenter) ? [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(s)].map(x => x.segment) : Array.from(s);
  const kbVibe = () => { try { navigator.vibrate && navigator.vibrate(6); } catch (e) { /* ignore */ } };

  /* --- kahan likhna hai: abhi focus wali jagah (ya aakhri jagah jahan cursor tha) --- */
  document.addEventListener('selectionchange', () => {
    const s = getSelection(); if (!s || !s.rangeCount) return;
    const n = s.anchorNode, el = n && (n.nodeType === 1 ? n : n.parentElement), ed = el && el.closest && el.closest(EDITABLE);
    if (ed && book.contains(ed)) { KB.last = ed; KB.range = s.getRangeAt(0).cloneRange(); }
    syncTools();
  });
  function kbTarget() {
    const a = document.activeElement;
    if (isEd(a)) return a.closest(EDITABLE);
    if (KB.last && KB.last.isConnected && book.contains(KB.last)) {
      KB.last.focus({ preventScroll: true });
      if (KB.range) { try { const s = getSelection(); s.removeAllRanges(); s.addRange(KB.range); } catch (e) { /* ignore */ } }
      return KB.last;
    }
    return null;
  }
  const textBefore = t => { try { const s = getSelection(); const r = document.createRange(); r.selectNodeContents(t); if (s.rangeCount && t.contains(s.anchorNode)) r.setEnd(s.anchorNode, s.anchorOffset); return r.toString(); } catch (e) { return ''; } };
  function autoCap() {
    if (KB.layer !== 'abc' || KB.caps) return; const t = kbTarget(); if (!t) return;
    const b = textBefore(t), want = b.trim() === '' || /[.!?۔]\s+$/.test(b);
    if (want !== KB.shift) { KB.shift = want; drawKb(); }
  }
  function typeCh(ch) {
    const t = kbTarget(); if (!t) return; document.execCommand('insertText', false, ch);
    if (KB.shift && !KB.caps && KB.layer === 'abc') { KB.shift = false; drawKb(); }
    autoCap();
  }
  function keyEvt(t, key) { return t.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })); }
  function kbBackspace() { const t = kbTarget(); if (!t) return; if (keyEvt(t, 'Backspace')) document.execCommand('delete'); autoCap(); }
  function kbEnter() { const t = kbTarget(); if (!t) return; keyEvt(t, 'Enter'); setTimeout(autoCap, 30); }

  /* --- keyboard banana --- */
  function kbKey(label, o = {}) {
    const b = h('button', { type: 'button', class: 'k' + (o.cls ? ' ' + o.cls : ''), 'aria-label': o.aria || label, tabindex: '-1' });
    if (o.icon) b.append(kbIco(o.icon)); else b.textContent = label;
    if (o.w) b.style.flex = o.w + ' 1 0';
    const fire = () => { kbVibe(); o.fn(); };
    const stop = () => { clearTimeout(KB.rep); clearInterval(KB.rep2); };
    b.addEventListener('pointerdown', e => { e.preventDefault(); fire(); if (o.hold) { stop(); KB.rep = setTimeout(() => { KB.rep2 = setInterval(o.fn, 55); }, 380); } });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, stop));
    b.addEventListener('click', e => { if (e.detail === 0) o.fn(); });     // physical keyboard / accessibility
    return b;
  }
  function setLayer(l) { KB.layer = l; drawKb(); }
  function drawKb() {
    if (KB.mode === 'system') { kbKeys.hidden = true; return; } kbKeys.hidden = false;
    const L = KB.layer, urdu = L === 'urdu' || L === 'urdu2', up = KB.shift || KB.caps, rows = [];
    kbKeys.dataset.layer = L;
    const space = () => kbKey('space', { cls: 'sp', w: '4', fn: () => typeCh(' ') });
    const enter = () => kbKey('', { icon: 'enter', cls: 'acc', w: '1.5', aria: 'New paragraph', fn: kbEnter });
    const del = () => kbKey('', { icon: 'del', cls: 'fn', w: '1.5', aria: 'Delete', fn: kbBackspace, hold: 1 });
    if (L === 'emoji') {
      const recent = lsGet('olw_story_recent', []);
      const tabs = h('div', { class: 'kb-tabs' }, kbKey('ABC', { cls: 'fn', fn: () => setLayer('abc') }), kbKey('🕘', { cls: 'tab' + (KB.cat === -1 ? ' on' : ''), fn: () => { KB.cat = -1; drawKb(); } }),
        ...KB_CAT.map((c, i) => kbKey(c, { cls: 'tab' + (KB.cat === i ? ' on' : ''), fn: () => { KB.cat = i; drawKb(); } })));
      const items = KB.cat === -1 ? recent : splitEmoji(KB_EMO[KB.cat] || KB_EMO[0]);
      const grid = h('div', { class: 'kb-emo' }, ...items.map(em => h('button', { type: 'button', class: 'e', tabindex: '-1', text: em, 'aria-label': em, onpointerdown: ev => {
        ev.preventDefault(); kbVibe(); typeCh(em); const r = lsGet('olw_story_recent', []).filter(x => x !== em); r.unshift(em); lsSet('olw_story_recent', r.slice(0, 24));
      } })));
      kbKeys.replaceChildren(tabs, grid, h('div', { class: 'kb-r' }, kbKey('ABC', { cls: 'fn', w: '1.5', fn: () => setLayer('abc') }), space(), del(), enter()));
      return;
    }
    const base = KB_LAYERS[L] || KB_LAYERS.abc;
    const letters = r => r.map(c => { const ch = (L === 'abc' && up) ? c.toUpperCase() : c; return kbKey(ch, { fn: () => typeCh(ch) }); });
    rows.push(h('div', { class: 'kb-r' }, ...letters(base[0])), h('div', { class: 'kb-r pad' }, ...letters(base[1])));
    const r3 = [];
    if (L === 'abc') r3.push(kbKey('', { icon: 'shift', cls: 'fn' + (KB.caps ? ' caps' : KB.shift ? ' on' : ''), w: '1.5', aria: 'Shift', fn: () => { if (KB.caps) { KB.caps = false; KB.shift = false; } else if (KB.shift) { KB.caps = true; } else KB.shift = true; drawKb(); } }));
    else if (urdu) r3.push(kbKey(L === 'urdu' ? 'ٰ◌' : 'ا', { cls: 'fn', w: '1.5', aria: 'More Urdu keys', fn: () => setLayer(L === 'urdu' ? 'urdu2' : 'urdu') }));
    else r3.push(kbKey('', { cls: 'fn', w: '1.5', fn: () => { } }));
    r3.push(...letters(base[2]), del()); rows.push(h('div', { class: 'kb-r' }, ...r3));
    const r4 = [];
    if (L === 'num') r4.push(kbKey('ABC', { cls: 'fn', w: '1.5', fn: () => setLayer('abc') }));
    else r4.push(kbKey('?123', { cls: 'fn', w: '1.5', fn: () => setLayer('num') }));
    r4.push(kbKey('😊', { cls: 'fn', aria: 'Emoji', fn: () => { KB.cat = KB.cat === -1 && !lsGet('olw_story_recent', []).length ? 0 : KB.cat; setLayer('emoji'); } }));
    r4.push(urdu ? kbKey('ABC', { cls: 'fn', fn: () => setLayer('abc') }) : kbKey('اردو', { cls: 'fn', aria: 'Urdu keyboard', fn: () => setLayer('urdu') }));
    r4.push(space(), kbKey(urdu ? '،' : '.', { fn: () => typeCh(urdu ? '،' : '.') }), enter());
    rows.push(h('div', { class: 'kb-r' }, ...r4));
    kbKeys.replaceChildren(...rows);
  }

  /* --- tools strip (keyboard ke upar) --- */
  const kbWithPos = fn => {                          // tool dabane par page dobara ban sakta hai: cursor wapas wahi rakho
    KB.pos = kbCapture(); KB.hold = true; fn();
    clearTimeout(KB.holdT); KB.holdT = setTimeout(() => { kbRestore(KB.pos); KB.hold = false; KB.pos = null; }, 450);
  };
  function kbCapture() {
    const a = document.activeElement, t = isEd(a) ? a.closest(EDITABLE) : (KB.last && KB.last.isConnected ? KB.last : null); if (!t) return null;
    const pg = t.closest('.st-page[data-pid]'); const off = textBefore(t).length;
    return { pid: pg && pg.dataset.pid, k: t.dataset.k, i: t.dataset.i, phid: t.dataset.phid, did: t.dataset.did, off };
  }
  function kbRestore(c) {
    if (!c) return; let sel = `[data-k="${c.k}"]`; if (c.i != null) sel += `[data-i="${c.i}"]`; if (c.phid) sel += `[data-phid="${c.phid}"]`; if (c.did) sel += `[data-did="${c.did}"]`;
    const root = c.pid ? book.querySelector(`.st-page[data-pid="${c.pid}"]`) : book, t = root && root.querySelector(sel + EDITABLE); if (!t) return;
    t.focus({ preventScroll: true });
    const r = document.createRange(), s = getSelection(), w = document.createTreeWalker(t, NodeFilter.SHOW_TEXT); let n, left = c.off, done = false;
    while ((n = w.nextNode())) { if (left <= n.nodeValue.length) { r.setStart(n, left); done = true; break; } left -= n.nodeValue.length; }
    if (!done) { r.selectNodeContents(t); r.collapse(false); } else r.collapse(true);
    s.removeAllRanges(); s.addRange(r);
  }
  function kbFmt(cmd) { const b = $(`[data-cmd="${cmd}"]`); if (b) b.click(); setTimeout(syncTools, 30); }
  function kbSize(d) { const p = curPage(); if (!p) return; kbWithPos(() => { p.scale = clamp((p.scale || 100) + d, 70, 130); touch('now'); outputs(); rerenderSoon(); toast(`Text size: ${p.scale}%`, 900); }); }
  function kbHide() { const a = document.activeElement; if (a && a.blur) a.blur(); getSelection().removeAllRanges(); showKb(false); }
  function kbOpenTools(tab) { kbHide(); setTab(tab); const st = $('#stStudio'); if (st.classList.contains('collapsed')) $('#stCollapse').click(); }
  function buildTools() {
    const t = (name, o) => { const b = h('button', { type: 'button', class: 'kt' + (o.cls ? ' ' + o.cls : ''), 'aria-label': o.aria, title: o.aria }); if (o.icon) b.append(kbIco(o.icon)); else if (o.html) b.innerHTML = o.html; else b.textContent = o.text; if (o.c) b.dataset.c = o.c; b.addEventListener('click', o.fn); return b; };
    const sep = () => h('i', { class: 'kt-sep' });
    const font = h('select', { class: 'kt-font', 'aria-label': 'Writing font on this page' }, h('option', { value: '', text: 'Diary font' }), ...BODY_FONTS.map(f => h('option', { value: f, text: f, style: `font-family:"${f}"` })));
    font.addEventListener('change', () => { const p = curPage(); if (!p) return; kbWithPos(() => { p.bf = font.value; touch('now'); rerenderSoon(); syncPanel(); }); });
    kbTools.replaceChildren(
      t('hide', { icon: 'kbdown', aria: 'Close keyboard', fn: kbHide }), t('tools', { icon: 'sliders', aria: 'More tools: fonts, colours, design', fn: () => kbOpenTools('text') }), sep(),
      t('undo', { icon: 'undo', aria: 'Undo', fn: () => kbWithPos(undo) }), t('redo', { icon: 'redo', aria: 'Redo', fn: () => kbWithPos(redo) }), sep(),
      t('b', { html: '<b>B</b>', aria: 'Bold', c: 'bold', fn: () => kbFmt('bold') }), t('i', { html: '<i>I</i>', aria: 'Italic', c: 'italic', fn: () => kbFmt('italic') }),
      t('u', { html: '<u>U</u>', aria: 'Underline', c: 'underline', fn: () => kbFmt('underline') }), t('h', { html: '<span class="st-hl">H</span>', aria: 'Highlight', fn: () => kbFmt('mark') }),
      t('x', { icon: 'eraser', aria: 'Clear formatting', fn: () => kbFmt('clear') }), sep(),
      t('s-', { icon: 'smaller', aria: 'Smaller text on this page', fn: () => kbSize(-4) }), t('s+', { icon: 'bigger', aria: 'Bigger text on this page', fn: () => kbSize(4) }), font, sep(),
      t('kbd', { icon: 'kbd', aria: 'Switch between our keyboard and the phone keyboard', cls: 'kbswitch', fn: kbSwitch })
    );
  }
  function syncTools() {
    if (!KB.on) return;
    ['bold', 'italic', 'underline'].forEach(c => { const b = kbTools.querySelector(`[data-c="${c}"]`); if (b) { let on = false; try { on = document.queryCommandState(c); } catch (e) { /* ignore */ } b.classList.toggle('on', on); } });
    const f = kbTools.querySelector('.kt-font'), p = curPage(); if (f && p && document.activeElement !== f) f.value = p.bf || '';
    const sw = kbTools.querySelector('.kbswitch'); if (sw) { sw.classList.toggle('on', KB.mode === 'system'); sw.title = KB.mode === 'system' ? 'Use our keyboard' : 'Use the phone keyboard'; }
  }

  /* --- phone keyboard ya apna keyboard --- */
  function setInputMode() {
    const own = KB.mode === 'own' && kbEnabled();
    $$(EDITABLE, book).forEach(el => { if (own) { if (el.getAttribute('inputmode') !== 'none') el.setAttribute('inputmode', 'none'); } else if (el.hasAttribute('inputmode')) el.removeAttribute('inputmode'); });
  }
  new MutationObserver(setInputMode).observe(book, { childList: true, subtree: true });
  function kbSwitch() {
    const pos = kbCapture(); KB.mode = KB.mode === 'own' ? 'system' : 'own'; lsSet('olw_story_kb', KB.mode);
    const a = document.activeElement; if (a && a.blur) a.blur(); setInputMode(); drawKb(); syncTools();
    toast(KB.mode === 'own' ? 'Our keyboard is on' : 'Phone keyboard is on', 1200); KB.hold = true;
    setTimeout(() => { kbRestore(pos); KB.hold = false; }, 80);
  }

  /* --- dikhana / chhupana --- */
  function showKb(on) {
    on = !!on && kbEnabled() && S.mode === 'edit'; if (on === KB.on) { if (on) { drawKb(); syncTools(); } return; }
    KB.on = on; kbDock.hidden = !on; document.body.classList.toggle('st-kbon', on);
    if (on) { if (!kbTools.firstChild) buildTools(); drawKb(); syncTools(); }
    requestAnimationFrame(layout); setTimeout(layout, 160);
  }
  book.addEventListener('focusin', e => { if (S.mode === 'edit' && isEd(e.target) && kbEnabled()) { clearTimeout(KB.hideT); setInputMode(); showKb(true); } });
  book.addEventListener('focusout', () => {
    clearTimeout(KB.hideT);
    KB.hideT = setTimeout(() => { if (KB.hold) return; const a = document.activeElement; if (isEd(a) || kbDock.contains(a)) return; showKb(false); }, 180);
  });
  kbDock.addEventListener('pointerdown', e => { if (!e.target.closest('select')) e.preventDefault(); });
  kbDock.addEventListener('mousedown', e => { if (!e.target.closest('select')) e.preventDefault(); });
  new MutationObserver(() => { if (S.mode !== 'edit' && KB.on) showKb(false); }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  const _afterSpread = hooks.afterSpread;
  hooks.afterSpread = () => { if (_afterSpread) _afterSpread(); if (KB.hold && KB.pos) kbRestore(KB.pos); setInputMode(); syncTools(); };


  /* ---------------------------------------------------------------
     14c. MINE / HER  (do diaries) + Google sync
     - Har banda apni diary likhta hai (Mine). Doosre ki diary sirf padh sakta hai (Her / His).
     - Publish karte hi diary Firebase mein jati hai; doosre phone par apne aap aa jati hai.
     - Login / sync na ho to sab pehle jaisa chalta hai (sirf is phone mein).
     --------------------------------------------------------------- */
  const herHis = () => (otherOf(ME) === 'partner' ? 'her' : 'his');
  const sheHe = () => (otherOf(ME) === 'partner' ? 'she' : 'he');
  const cloudOn = () => !!(window.OLW && OLW.configured && OLW.signedIn && OLW.db);
  const CLOUD = { imgs: new Set() };
  const seenGet = () => lsGet('olw_story_seen', {});
  const seenSet = (who, t) => { const m = seenGet(); m[who] = t; lsSet('olw_story_seen', m); };

  /* jis ki diary abhi publish nahi hui, uske liye shant sa page */
  function waitingStory() {
    const s = blankStory(); s.demo = true; s.waiting = true;
    s.cover = Object.assign(blankCover(), { title: (herHis() === 'her' ? 'Her' : 'His') + ' Diary ♡', subtitle: 'Jald aa rahi hai...' });
    const p = blankPage(s.chapters[0].id); p.title = 'Abhi kuch nahi likha'; p.body = [herHis() === 'her' ? 'Jab woh apni diary publish karegi, yahan apne aap aa jayegi ♡' : 'Jab woh apni diary publish karega, yahan apne aap aa jayegi ♡']; s.pages.push(p);
    return s;
  }

  async function loadView() {
    let pub = null;
    try { const raw = await kvGet(kk('published')); if (raw) pub = normalizeStory(raw); } catch { pub = null; }
    if (!pub) pub = canEdit() ? demoStory() : waitingStory();
    S.pub = S.story = pub;
    try { E.hasDraft = canEdit() && !!(await kvGet(kk('draft'))); } catch { E.hasDraft = false; }
    await loadImages(pub);
    S.vp = buildVP(pub);
    const sp = lsGet(posKey(), ''), i = posOfPage(sp); S.pos = i > 0 ? (S.two ? i & ~1 : i) : 0;
  }

  /* --- Mine / Her switch --- */
  function paintWho() {
    const box = $('#stWho'); if (!box) return;
    $('#whoMine').setAttribute('aria-selected', String(VIEW === ME)); $('#whoHer').setAttribute('aria-selected', String(VIEW !== ME));
    $('#whoHer').textContent = herHis() === 'her' ? 'Her' : 'His';
    box.hidden = false;
  }
  async function switchView(to) {
    const who = to === 'her' ? otherOf(ME) : ME;
    if (who === VIEW || S.busy) return;
    if (S.mode !== 'read') return toast('Close the editor first', 2200);
    if (S.open) await closeBook();
    S.busy = true;
    try {
      VIEW = who; lsSet('olw_story_view', to);
      await loadView();
      applyRole(); applyLook(); renderCoverFace(); setBanner(); updateStacks(); updateChrome(); paintWho(); layout();
      toast(VIEW === ME ? 'My diary' : `${herHis() === 'her' ? 'Her' : 'His'} diary (read only)`, 1800);
    } catch (ex) { console.error(ex); toast('The diary could not open. Please try again.', 3500); }
    finally { S.busy = false; }
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('#stWho button'); if (b) switchView(b.dataset.who);
  });

  /* --- cloud: push (meri diary upar) --- */
  async function cloudPush(who, st) {
    if (!cloudOn() || who !== ME || !st || st.demo) return;
    try {
      for (const id of imageIds(st)) {
        if (id.startsWith('demo:') || CLOUD.imgs.has(id)) continue;
        const d = await imgGet(id); if (!d) continue;
        await OLW.putBlob('simg-' + id, d); CLOUD.imgs.add(id);
      }
      const upd = await OLW.putBlob('story-' + who, JSON.stringify(st));
      seenSet(who, upd);
    } catch (e) { OLW.err(e); toast('Saved on this phone, but it could not sync yet. Please check your internet.', 4500); }
  }

  /* --- cloud: pull (doosri taraf se aayi diary neeche) --- */
  let pullChain = Promise.resolve();
  const onStoryMeta = (id, meta) => (pullChain = pullChain.then(() => pullStory(id, meta)));
  async function pullStory(id, meta) {
    const who = id.slice(6); if (who !== 'owner' && who !== 'partner') return;
    if ((meta.updated || 0) <= (seenGet()[who] || 0)) return;
    try {
      const s = await OLW.getBlob(id, meta); if (!s) return;
      const st = normalizeStory(JSON.parse(s));
      for (const iid of imageIds(st)) {
        if (iid.startsWith('demo:') || await imgGet(iid)) continue;
        const d = await OLW.getBlob('simg-' + iid); if (d && okDataUrl(d)) await imgPut(iid, d);
      }
      const cur = await kvGet(kk('published', who));
      if (who === ME && cur && !cur.demo && (cur.rev || 0) > st.rev) { seenSet(who, meta.updated); cloudPush(ME, normalizeStory(cur)); return; }   // mera apna naya hai, cloud purana
      await kvSet(kk('published', who), st); seenSet(who, meta.updated);
      if (who === VIEW && S.mode === 'read' && !S.busy) {
        await loadView(); applyLook(); renderCoverFace(); setBanner(); updateStacks(); updateChrome(); layout();
        if (S.open) showSpread();
        toast(who === ME ? 'Diary updated from your other device ♡' : `${herHis() === 'her' ? 'Her' : 'His'} new diary is here ♡`, 3200);
      }
    } catch (e) { console.warn('story pull', e); }
  }
  async function onStoryInitial(ids) {
    if (ids.has('story-' + ME)) return;
    try { const cur = await kvGet(kk('published', ME)); if (cur && !cur.demo) await cloudPush(ME, normalizeStory(cur)); } catch { /* ignore */ }
  }
  function startCloud() {
    if (!window.OLW || !OLW.configured) return;
    OLW.watch('simg-', id => CLOUD.imgs.add(id.slice(5)), () => { /* ids already added */ });
    OLW.watch('story-', onStoryMeta, onStoryInitial);
  }

  /* --- kaun hoon main: login se (na ho to owner) --- */
  function initWho() {
    ME = lsGet('olw_story_me', 'owner') === 'partner' ? 'partner' : 'owner';          // pichla jaana hua role (turant); login se confirm hota hai
    VIEW = lsGet('olw_story_view', 'mine') === 'her' ? otherOf(ME) : ME;
    if (window.OLW && OLW.configured) OLW.onAuth(u => {
      if (!u) return; const r = OLW.role === 'partner' ? 'partner' : 'owner'; lsSet('olw_story_me', r);
      if (r !== ME) location.reload();
    });
  }


  /* ---------------------------------------------------------------
     15. START
     --------------------------------------------------------------- */
  async function init() {
    initWho(); applyRole(); paintIcons(); makeTextures(); buildBackdrop(); buildBook(); buildStudio(); layout();
    await loadView(); paintWho();
    applyLook(); renderCoverFace(); updateChrome(); setBanner(); layout(); updateStacks(); updateChrome();
    book.classList.add('ready'); startCloud();
    if (!persistent) toast('Saving is blocked in this browser. Changes last only for this session. Please download a backup.', 6000);
    document.fonts && document.fonts.ready.then(() => { if (S.open && S.mode === 'read') showSpread(); });
    window.__story = { imgPut, imgGet, S, E, beginTurn, setTurn, endTurn, switchView, get VIEW() { return VIEW; }, get ME() { return ME; } };
  }
  $('#stPrev').addEventListener('click', () => go_(-1)); $('#stNext').addEventListener('click', () => go_(1));
  book.addEventListener('click', e => { if (!S.open && !S.busy && !e.target.closest('[contenteditable="true"]')) openBook(); });
  init().catch(err => { console.error(err); toast('The story could not load. Please reload the page.', 6000); });

})();
