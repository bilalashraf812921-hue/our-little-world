/* ===== Our Little World - Home page logic =====
   NOTE: Abhi backend/login connect nahi hai. Settings isi browser ki localStorage mein save hoti hain.
   Jab Supabase (ya jo backend approve ho) connect hoga, sirf loadSettings/saveSettings aur ROLE badalna hoga. */
(() => {
  'use strict';

  const ROLE = 'owner';                 // TEMP: login ke baad server se aayega ('owner' | 'partner')
  const TZ = 'Asia/Karachi';
  const KEY = 'olw_home_v1';
  const BUILT_PAGES = { home: true, story: true, gallery: true, letters: true, chat: true };   // jaise jaise pages ban jayen: story:true, gallery:true ...
  const PAGE_NAMES = { story: 'Story', gallery: 'Gallery', letters: 'Letters', chat: 'Chat', memories: 'Special Moments' };

  const DEFAULTS = {
    welcome: 'Welcome Back, My Love',
    heading: 'Meri Zindagi, Tum Ho ♡',
    intro: 'Har din tumhare saath ek nayi kahani hai, aur main chahta hoon ke yeh kahani hamesha yun hi chalti rahe.',
    why: 'Kyunkay tum sirf meri mohabbat nahi, meri sab se khoobsurat kahani ho. Yeh website maine is liye banayi hai taake hum apni yaadon, khwabon aur har chhoti bari baat ko hamesha ke liye saath rakh saken.',
    signoff: 'Always you ♡',
    surprise: [
      'Ruko... bas ek minute.',
      'Yeh koi mehenga tohfa nahi hai. Bas kuch baatein hain, jo main aksar dil mein rakh leta hoon aur keh nahi pata.',
      'Mujhe woh din yaad hai jab maine pehli baar socha tha, "Yeh insaan meri zindagi ka sab se khoobsurat hissa ban jayega." Aur tum ban gayi.',
      'Jab tum hansti ho na, meri saari thakan utar jati hai.',
      'Aur jab tum udaas hoti ho, dil chahta hai tumhara har gham main apne naam likhwa lun.',
      'Main kabhi theek se keh nahi pata, lekin tumhare baghair yeh din, yeh raatein, yeh sab kuch adhoora lagta hai.',
      'Agar kabhi lage ke tum akeli ho, toh bas itna yaad rakhna: main yahin hoon. Hamesha.',
      'Yeh poori website, har photo, har khat, har lafz, sab sirf is liye hai ke tum jaan sako ke tum mere liye kya ho.',
      'Tum meri woh dua ho jo qabool ho gayi.',
      'I love you. Aaj bhi, kal bhi, aur jab tak saans hai. ♡'
    ].join('\n'),
    specialDate: '', specialLabel: '', memoryTitle: '', togetherSince: '',
    accent: '#8a64a3', accentOn: false,   // accentOn=false => theme ka apna rang
    motion: 'auto', heroImg: '', memoryImg: ''
  };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- Icons ---------- */
  const ICONS = {
    heart: '<path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    home: '<path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    book: '<path d="M2 4h7a3 3 0 0 1 3 3v14a2 2 0 0 0-2-2H2z"/><path d="M22 4h-7a3 3 0 0 0-3 3v14a2 2 0 0 1 2-2h8z"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-5.4A8 8 0 1 1 21 12z"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    gift: '<rect x="3" y="8" width="18" height="4"/><path d="M12 8v13M5 12v9h14v-9M7.5 8a2.5 2.5 0 1 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 1 1 0 5"/>'
  };
  $$('[data-icon]').forEach(el => {
    el.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[el.dataset.icon] || ''}</svg>`;
  });

  // lavender decoration
  const lavSVG = (() => {
    // colours come from the active theme (--sprig-a / --sprig-b / --sprig-stem)
    let s = '<svg viewBox="0 0 40 130" aria-hidden="true"><path d="M20 128C20 90 22 50 20 8" style="stroke:var(--sprig-stem)" stroke-width="2" fill="none"/>';
    for (let i = 0; i < 9; i++) {
      const y = 12 + i * 11, w = 7 - i * 0.3;
      s += `<ellipse cx="${14 - w * .3}" cy="${y}" rx="${w}" ry="3.2" transform="rotate(-35 ${14} ${y})" style="fill:var(--sprig-a)"/>`;
      s += `<ellipse cx="${26 + w * .3}" cy="${y + 4}" rx="${w}" ry="3.2" transform="rotate(35 ${26} ${y + 4})" style="fill:var(--sprig-b)"/>`;
    }
    return s + '</svg>';
  })();
  $$('.lav').forEach(el => (el.innerHTML = lavSVG));

  /* ---------- Settings storage ---------- */
  let saved = load();
  function load() {
    try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
    catch { return { ...DEFAULTS }; }
  }
  function persist(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); return true; }
    catch { return false; }
  }

  /* ---------- Dates (Asia/Karachi) ---------- */
  const todayPK = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
  const dayDiff = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5);
  const plural = n => `${n} day${n === 1 ? '' : 's'}`;

  /* ---------- Apply settings to the page ---------- */
  function apply(s) {
    $('#welcomeText').textContent = s.welcome;
    $('#heroTitle').textContent = s.heading;
    $('#introText').textContent = s.intro;
    $('#whyText').textContent = s.why;
    $('#signoff').textContent = s.signoff;
    document.documentElement.dataset.motion = s.motion === 'off' ? 'off' : 'auto';
    const root = document.documentElement.style;
    // custom accent sirf tab lagta hai jab owner ne khud rang chuna ho; warna theme ka rang
    s.accentOn ? root.setProperty('--accent', s.accent) : root.removeProperty('--accent');
    s.heroImg ? root.setProperty('--hero-url', `url("${s.heroImg}")`) : root.removeProperty('--hero-url');
    s.memoryImg ? root.setProperty('--memory-url', `url("${s.memoryImg}")`) : root.removeProperty('--memory-url');
    renderMoments(s);
    $('#profileName').textContent = ROLE === 'owner' ? 'Owner' : 'Partner';
    syncFx(tDraft || tSaved);           // animations off/on badalne par floating effects bhi update hon
  }

  // accent colour helpers (theme ka rang ya owner ka chuna hua rang)
  const themeAccent = () => {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    return /^#[0-9a-f]{6}$/i.test(v) ? v : DEFAULTS.accent;
  };
  const effAccent = s => (s.accentOn ? s.accent : themeAccent());

  function renderMoments(s) {
    const t = todayPK();
    // next special date
    let next;
    if (!s.specialDate) next = 'Settings mein date set karein';
    else {
      const d = dayDiff(t, s.specialDate);
      const when = d === 0 ? 'Today ♡' : d > 0 ? `In ${plural(d)}` : `Passed ${plural(-d)} ago`;
      next = s.specialLabel ? `${s.specialLabel} · ${when}` : when;
    }
    $('#nextDateText').textContent = next;
    $('#memoryText').textContent = s.memoryTitle || 'Settings mein memory ka title likhein';
    if (!s.togetherSince) $('#countdownText').textContent = 'Start date set karein';
    else {
      const d = dayDiff(s.togetherSince, t);
      $('#countdownText').textContent = d < 0 ? `Starts in ${plural(-d)}` : d === 0 ? 'Together from today ♡' : `Together for ${plural(d)}`;
    }
  }

  /* ---------- Navigation / toast ---------- */
  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg; el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.hidden = true), 2800);
  }
  function go(page) {
    if (page === 'home') return window.scrollTo({ top: 0, behavior: 'smooth' });
    if (BUILT_PAGES[page]) { location.href = page === 'chat' ? 'messages.html' : `${page}.html`; return; }
    toast(`${PAGE_NAMES[page] || page} page abhi ban raha hai. Coming soon ♡`);
  }
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-go]');
    if (t) { e.preventDefault(); go(t.dataset.go); }
  });
  $('#exploreBtn').addEventListener('click', () =>
    $('#featureCards').scrollIntoView({ behavior: 'smooth', block: 'center' }));
  // mobile pe cards hidden hain, wahan seedha "Why I Made This" tak scroll
  $('#exploreBtn').addEventListener('click', () => {
    if (getComputedStyle($('#featureCards')).display === 'none')
      $('#whySection').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  /* ---------- Search ---------- */
  const INDEX = [
    { label: 'Story - Our journey', go: 'story', k: 'story diary journey' },
    { label: 'Gallery - Photos & videos', go: 'gallery', k: 'gallery photos videos pictures' },
    { label: 'Letters - From my heart', go: 'letters', k: 'letters letter heart' },
    { label: 'Chat - Talk to each other', go: 'chat', k: 'chat messages talk questions' },
    { label: 'Why I Made This', el: '#whySection', k: 'why made this read' },
    { label: 'Our Special Moments', el: '#momentsSection', k: 'special moments date memory countdown' },
    { label: 'Surprise', el: '#surpriseSection', k: 'surprise gift' }
  ];
  const sIn = $('#searchInput'), sOut = $('#searchResults');
  let sSel = -1, sItems = [];
  function renderSearch() {
    const q = sIn.value.trim().toLowerCase();
    sItems = q ? INDEX.filter(i => (i.label + ' ' + i.k).toLowerCase().includes(q)) : [];
    sOut.innerHTML = ''; sSel = -1;
    if (q && !sItems.length) {
      const li = document.createElement('li'); li.textContent = 'Kuch nahi mila'; li.setAttribute('aria-disabled', 'true'); sOut.append(li);
    }
    sItems.forEach((it, i) => {
      const li = document.createElement('li'); li.role = 'option'; li.textContent = it.label;
      li.addEventListener('mousedown', ev => { ev.preventDefault(); pick(i); });
      sOut.append(li);
    });
    const open = !!q; sOut.hidden = !open; sIn.setAttribute('aria-expanded', open);
  }
  function pick(i) {
    const it = sItems[i]; if (!it) return;
    sIn.value = ''; renderSearch(); sIn.blur();
    it.go ? go(it.go) : $(it.el).scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  sIn.addEventListener('input', renderSearch);
  sIn.addEventListener('blur', () => setTimeout(() => { sOut.hidden = true; }, 120));
  sIn.addEventListener('keydown', e => {
    const lis = $$('li[role=option]', sOut);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); if (!lis.length) return;
      sSel = (sSel + (e.key === 'ArrowDown' ? 1 : -1) + lis.length) % lis.length;
      lis.forEach((l, i) => l.setAttribute('aria-selected', i === sSel));
    } else if (e.key === 'Enter') { e.preventDefault(); pick(sSel >= 0 ? sSel : 0); }
    else if (e.key === 'Escape') { sIn.value = ''; renderSearch(); }
  });

  /* ---------- Profile menu ---------- */
  const pBtn = $('#profileBtn'), pMenu = $('#profileMenu');
  const closeProfile = () => { pMenu.hidden = true; pBtn.setAttribute('aria-expanded', 'false'); };
  pBtn.addEventListener('click', e => {
    e.stopPropagation();
    pMenu.hidden = !pMenu.hidden; pBtn.setAttribute('aria-expanded', !pMenu.hidden);
  });
  document.addEventListener('click', e => { if (!e.target.closest('.profile-wrap')) closeProfile(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeProfile(); });
  $('#logoutBtn').addEventListener('click', () => { closeProfile(); toast('Logout login system connect hone ke baad kaam karega.'); });

  /* ---------- Dialog helpers ---------- */
  $$('dialog').forEach(d => {
    d.addEventListener('click', e => { if (e.target === d) d.close(); });          // backdrop click
    $$('[data-close]', d).forEach(b => b.addEventListener('click', () => d.close()));
  });

  /* Read more */
  $('#readMoreBtn').addEventListener('click', () => {
    $('#readFull').textContent = $('#whyText').textContent;
    $('#readSign').textContent = $('#signoff').textContent;
    $('#readDialog').showModal();
  });

  /* ---------- Surprise ---------- */
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'off';
  const OLD_SURPRISE = 'Tum meri zindagi ka sab se khoobsurat tohfa ho ♡';   // purani ek line wali default: ab nayi khat wali ban jati hai
  let surTimers = [];
  const surClear = () => { surTimers.forEach(clearTimeout); surTimers = []; };
  function burstHearts(n) {
    if (reduced()) return;
    const box = $('#hearts');
    for (let i = 0; i < n; i++) {
      const h = document.createElement('span');
      h.textContent = '♡';
      h.style.left = Math.random() * 100 + '%';
      h.style.fontSize = 16 + Math.random() * 26 + 'px';
      h.style.setProperty('--d', 3 + Math.random() * 2.5 + 's');
      h.style.setProperty('--x', (Math.random() * 80 - 40) + 'px');
      h.style.animationDelay = Math.random() * 1.2 + 's';
      box.append(h);
      setTimeout(() => h.remove(), 7000);
    }
  }
  function surpriseLines() {
    let raw = (saved.surprise || '').trim();
    const isDefault = !raw || raw === OLD_SURPRISE || raw === DEFAULTS.surprise;
    if (isDefault) raw = DEFAULTS.surprise;
    const L = raw.split(/\n+/).map(x => x.trim()).filter(Boolean);
    if (isDefault && saved.togetherSince) {
      const d = dayDiff(saved.togetherSince, todayPK());
      if (d > 0) L.splice(L.length - 2, 0, `Aur haan... hamein saath ${plural(d)} ho chuke hain. Har din pichle din se zyada khoobsurat.`);
    }
    return L;
  }
  $('#surpriseDialog').addEventListener('close', surClear);
  $('#surpriseBtn').addEventListener('click', () => {
    const d = $('#surpriseDialog'), box = $('#surpriseMsg'), sign = $('#surSign'), skip = $('#surSkip'), close = $('#surClose');
    const lines = surpriseLines();
    let i = 0;
    surClear(); box.replaceChildren(); sign.hidden = true; close.hidden = true; skip.hidden = false;
    const add = instant => {
      const p = document.createElement('p');
      p.className = 'sur-line' + (instant ? ' now' : '') + (i === lines.length - 1 ? ' sur-last' : '');
      p.textContent = lines[i++]; box.append(p); return p;
    };
    const finish = big => {
      surClear(); skip.hidden = true; close.hidden = false;
      sign.textContent = saved.signoff || ''; sign.hidden = !saved.signoff;
      burstHearts(big ? 34 : 14);
      close.scrollIntoView({ block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' });
    };
    const step = () => {
      if (i >= lines.length) return finish(true);
      const p = add(false);
      p.scrollIntoView({ block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' });
      surTimers.push(setTimeout(step, Math.min(3800, 1300 + p.textContent.length * 34)));
    };
    skip.onclick = () => { surClear(); while (i < lines.length) add(true); finish(false); };
    d.showModal();
    if (reduced()) { while (i < lines.length) add(true); finish(false); return; }
    burstHearts(8);
    surTimers.push(setTimeout(step, 700));
  });

  /* ---------- Settings (owner only, draft -> preview -> publish) ---------- */
  const dlg = $('#settingsDialog'), form = $('#settingsForm'), err = $('#settingsError');
  let draft = null;
  const showErr = m => { err.textContent = m; err.hidden = !m; };

  $('#settingsBtn').addEventListener('click', async () => {
    // password laga ho to settings kholne se pehle dobara poocho
    if (ROLE === 'owner' && hasLock() && !(await askPassword('Settings kholne ke liye password likhein'))) return;
    if (tOpen) closeThemePanel(true);   // theme panel khula ho to pehle uska preview band
    const isOwner = ROLE === 'owner';
    refreshPwUi(); pwErr('');
    [pw.cur, pw.n1, pw.n2].forEach(i => (i.value = ''));
    $('#roleNotice').hidden = isOwner;
    $('#settingsBody').hidden = !isOwner;
    $('#publishBtn').hidden = !isOwner; $('#resetBtn').hidden = !isOwner;
    draft = { ...saved }; showErr('');
    ['welcome', 'heading', 'intro', 'why', 'signoff', 'surprise', 'specialDate', 'specialLabel', 'memoryTitle', 'togetherSince', 'accent', 'motion']
      .forEach(n => (form.elements[n].value = draft[n]));
    form.elements.accent.value = effAccent(draft);
    form.elements.heroFile.value = ''; form.elements.memoryFile.value = '';
    dlg.showModal();
  });

  form.addEventListener('input', e => {
    if (e.target.type === 'file' || !e.target.name) return;
    draft[e.target.name] = e.target.value;
    if (e.target.name === 'accent') draft.accentOn = true;   // owner ne khud rang chuna
    apply(draft);                       // live preview (not saved yet)
  });
  $('#accentReset').addEventListener('click', () => {      // theme ka apna rang wapas
    if (!draft) return;
    draft.accentOn = false; draft.accent = DEFAULTS.accent; apply(draft);
    form.elements.accent.value = effAccent(draft);
  });

  // photo upload: validate + shrink so localStorage doesn't overflow
  function readImage(file, max = 1600) {
    return new Promise((res, rej) => {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return rej(new Error('Sirf JPG, PNG ya WebP photo allowed hai.'));
      if (file.size > 8 * 1024 * 1024) return rej(new Error('Photo 8 MB se chhoti honi chahiye.'));
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        const r = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Yeh photo khul nahi saki.')); };
      img.src = url;
    });
  }
  [['heroFile', 'heroImg'], ['memoryFile', 'memoryImg']].forEach(([inp, key]) =>
    form.elements[inp].addEventListener('change', async e => {
      const f = e.target.files[0]; if (!f) return;
      try { draft[key] = await readImage(f); showErr(''); apply(draft); }
      catch (ex) { showErr(ex.message); e.target.value = ''; }
    }));

  const closeSettings = () => { dlg.close(); apply(saved); draft = null; };   // discard preview
  $('#cancelBtn').addEventListener('click', closeSettings);
  dlg.addEventListener('cancel', e => { e.preventDefault(); closeSettings(); });

  $('#resetBtn').addEventListener('click', () => {
    if (!confirm('Home page ki sab settings default par wapas karni hain?')) return;
    draft = { ...DEFAULTS };
    ['welcome', 'heading', 'intro', 'why', 'signoff', 'surprise', 'specialDate', 'specialLabel', 'memoryTitle', 'togetherSince', 'accent', 'motion']
      .forEach(n => (form.elements[n].value = draft[n]));
    apply(draft);
    form.elements.accent.value = effAccent(draft);
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (ROLE !== 'owner') return;
    if (!draft.heading.trim()) return showErr('Main heading khali nahi ho sakti.');
    const btn = $('#publishBtn'); btn.disabled = true;
    if (!persist(draft)) {
      btn.disabled = false;
      return showErr('Save nahi ho saka (storage full ho sakti hai). Chhoti photo try karein. Purani settings safe hain.');
    }
    saved = { ...draft }; draft = null; btn.disabled = false;
    dlg.close(); apply(saved); toast('Published ✓ (is browser mein save hua)');
  });

  /* =====================================================================
     PASSWORD LOCK
     Yeh sirf is browser ka screen-lock hai (password PBKDF2 hash ke taur par save hota hai, plain nahi).
     Yeh encryption NAHI hai: tech-savvy banda DevTools se bypass kar sakta hai.
     Asli security backend login ke saath aayegi.
     ===================================================================== */
  const LOCK_KEY = 'olw_lock_v1', OK_KEY = 'olw_ok', FAIL_KEY = 'olw_fail';
  const getLock = () => { try { return JSON.parse(localStorage.getItem(LOCK_KEY)); } catch { return null; } };
  function hasLock() { return !!getLock(); }
  const toB64 = bytes => btoa(String.fromCharCode(...bytes));
  const fromB64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

  async function derive(pw, salt, iter) {
    if (!(window.crypto && crypto.subtle)) throw new Error('Is browser mein password feature available nahi. Chrome ya Edge mein kholein.');
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, key, 256);
    return toB64(new Uint8Array(bits));
  }
  async function createLock(pw) {
    const salt = crypto.getRandomValues(new Uint8Array(16)), iter = 150000;
    return { salt: toB64(salt), iter, hash: await derive(pw, salt, iter) };
  }
  /* Recovery code: password bhool jane par lock screen se reset (code sirf hash ban kar save hota hai) */
  const REC_ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', REC_FAIL = 'olw_fail_rec';
  const normRec = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  async function makeRecovery() {
    const r = crypto.getRandomValues(new Uint8Array(12));
    const raw = [...r].map(b => REC_ALPHA[b % REC_ALPHA.length]).join('');
    const code = raw.match(/.{4}/g).join('-');
    return { code, rec: await createLock(normRec(code)) };
  }
  function showRecovery(code) {
    $('#recCode').textContent = code; $('#recDialog').showModal();
  }
  $('#recCopy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('#recCode').textContent); toast('Code copy ho gaya ✓'); } catch { toast('Copy nahi hua. Code ko haath se likh lein.'); }
  });
  async function verifyPassword(pw) {
    const lock = getLock(); if (!lock) return { ok: true };
    let f = {}; try { f = JSON.parse(localStorage.getItem(FAIL_KEY) || '{}'); } catch { /* ignore */ }
    if (f.until && Date.now() < f.until)
      return { ok: false, msg: `Bohat ghalat koshishein. ${Math.ceil((f.until - Date.now()) / 1000)} second baad dobara try karein.` };
    let h;
    try { h = await derive(pw, fromB64(lock.salt), lock.iter); } catch (ex) { return { ok: false, msg: ex.message }; }
    if (h === lock.hash) { localStorage.removeItem(FAIL_KEY); return { ok: true }; }
    const n = (f.n || 0) + 1;
    try { localStorage.setItem(FAIL_KEY, JSON.stringify(n >= 5 ? { n: 0, until: Date.now() + 30000 } : { n })); } catch { /* ignore */ }
    return { ok: false, msg: n >= 5 ? '5 ghalat koshishein. 30 second ruk jayein.' : 'Password ghalat hai.' };
  }

  // lock screen
  function showLock() {
    document.documentElement.dataset.locked = '1';
    $('#lockInput').value = ''; $('#lockError').hidden = true;
    setTimeout(() => $('#lockInput').focus(), 50);
  }
  $('#lockForm').addEventListener('submit', async e => {
    e.preventDefault();
    const r = await verifyPassword($('#lockInput').value);
    if (r.ok) {
      try { sessionStorage.setItem(OK_KEY, '1'); } catch { /* ignore */ }
      delete document.documentElement.dataset.locked;
      $('#lockInput').value = ''; $('#lockError').hidden = true;
      if (localStorage.getItem('olw_share_pending')) { location.replace('messages.html'); return; }
    } else {
      $('#lockError').textContent = r.msg; $('#lockError').hidden = false; $('#lockInput').select();
    }
  });
  $('#lockShow').addEventListener('change', e => ($('#lockInput').type = e.target.checked ? 'text' : 'password'));
  $('#lockNowBtn').addEventListener('click', () => {
    closeProfile();
    if (!hasLock()) return toast('Pehle Settings mein password lagayein.');
    sessionStorage.removeItem(OK_KEY); showLock();
  });

  // password prompt dialog (settings kholne ke liye)
  function askPassword(title) {
    return new Promise(resolve => {
      const d = $('#askDialog'), f = $('#askForm'), inp = $('#askInput'), er = $('#askError');
      $('#askTitle').textContent = title; inp.value = ''; er.hidden = true;
      let done = false;
      const finish = v => { if (done) return; done = true; d.onclose = null; if (d.open) d.close(); resolve(v); };
      f.onsubmit = async ev => {
        ev.preventDefault();
        const r = await verifyPassword(inp.value);
        if (r.ok) finish(true); else { er.textContent = r.msg; er.hidden = false; inp.select(); }
      };
      $('#askCancel').onclick = () => finish(false);
      d.oncancel = ev => { ev.preventDefault(); finish(false); };
      d.onclose = () => finish(false);
      d.showModal(); inp.focus();
    });
  }

  // set / change / remove password (Settings > Password lock)
  const pw = { cur: $('#pwCur'), n1: $('#pwNew'), n2: $('#pwNew2'), err: $('#pwError') };
  const pwErr = m => { pw.err.textContent = m; pw.err.hidden = !m; };
  function refreshPwUi() {
    const has = hasLock();
    $('#pwStatus').textContent = has
      ? 'Password laga hua hai ✓ App kholne aur settings kholne par poocha jata hai.'
      : 'Abhi password nahi laga. App aur settings bina password ke khulti hain.';
    $('#pwCurRow').hidden = !has; $('#pwRemove').hidden = !has;
    $('#pwRecovery').hidden = !has; $('#pwRecovery').textContent = has && getLock().rec ? 'Naya recovery code banayein' : 'Recovery code banayein';
    $('#pwSave').textContent = has ? 'Password badlein' : 'Password lagayein';
  }
  $('#pwSave').addEventListener('click', async () => {
    pwErr('');
    if (hasLock()) { const r = await verifyPassword(pw.cur.value); if (!r.ok) return pwErr(r.msg); }
    if (pw.n1.value.length < 4) return pwErr('Naya password kam az kam 4 characters ka hona chahiye.');
    if (pw.n1.value !== pw.n2.value) return pwErr('Dono naye passwords ek jaise nahi hain.');
    let recCode = '';
    try { const lock = await createLock(pw.n1.value), mr = await makeRecovery(); lock.rec = mr.rec; recCode = mr.code; localStorage.setItem(LOCK_KEY, JSON.stringify(lock)); }
    catch (ex) { return pwErr(ex.message || 'Password save nahi ho saka.'); }
    try { sessionStorage.setItem(OK_KEY, '1'); } catch { /* ignore */ }
    [pw.cur, pw.n1, pw.n2].forEach(i => (i.value = ''));
    refreshPwUi(); toast('Password lag gaya ✓'); if (recCode) showRecovery(recCode);
  });
  $('#pwRecovery').addEventListener('click', async () => {
    pwErr('');
    const r = await verifyPassword(pw.cur.value); if (!r.ok) return pwErr(r.msg || 'Pehle maujooda password likhein.');
    try { const lock = getLock(), mr = await makeRecovery(); lock.rec = mr.rec; localStorage.setItem(LOCK_KEY, JSON.stringify(lock)); refreshPwUi(); showRecovery(mr.code); }
    catch (ex) { pwErr(ex.message || 'Code ban nahi saka.'); }
  });
  $('#lockForgot').addEventListener('click', () => {
    const lock = getLock(), box = $('#recBox');
    box.hidden = !box.hidden; if (box.hidden) return;
    const has = !!(lock && lock.rec);
    $('#recHint').textContent = has ? 'Password lagate waqt jo Recovery Code mila tha wo likhein.' : 'Is password ke saath Recovery Code nahi bana tha. Browser settings se is website ka data clear karna parega.';
    $('#recInput').hidden = !has; $('#recGo').hidden = !has; $('#recError').hidden = true;
    if (has) setTimeout(() => $('#recInput').focus(), 50);
  });
  async function tryRecovery() {
    const er = $('#recError'), lock = getLock(), say = m => { er.textContent = m; er.hidden = false; };
    if (!lock || !lock.rec) return say('Recovery code maujood nahi.');
    let f = {}; try { f = JSON.parse(localStorage.getItem(REC_FAIL) || '{}'); } catch { /* ignore */ }
    if (f.until && Date.now() < f.until) return say(`Bohat ghalat koshishein. ${Math.ceil((f.until - Date.now()) / 1000)} second baad try karein.`);
    let h; try { h = await derive(normRec($('#recInput').value), fromB64(lock.rec.salt), lock.rec.iter); } catch (ex) { return say(ex.message); }
    if (h !== lock.rec.hash) {
      const n = (f.n || 0) + 1;
      try { localStorage.setItem(REC_FAIL, JSON.stringify(n >= 5 ? { n: 0, until: Date.now() + 60000 } : { n })); } catch { /* ignore */ }
      return say(n >= 5 ? '5 ghalat koshishein. 1 minute ruk jayein.' : 'Recovery code ghalat hai.');
    }
    localStorage.removeItem(LOCK_KEY); localStorage.removeItem(FAIL_KEY); localStorage.removeItem(REC_FAIL);
    try { sessionStorage.setItem(OK_KEY, '1'); } catch { /* ignore */ }
    delete document.documentElement.dataset.locked;
    $('#recInput').value = ''; $('#recBox').hidden = true; er.hidden = true; refreshPwUi();
    toast('Password hata diya gaya. Settings mein naya password lagayein ♡', 6000);
    if (localStorage.getItem('olw_share_pending')) location.replace('messages.html');
  }
  $('#recGo').addEventListener('click', tryRecovery);
  $('#recInput').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); tryRecovery(); } });
  $('#pwRemove').addEventListener('click', async () => {
    pwErr('');
    const r = await verifyPassword(pw.cur.value); if (!r.ok) return pwErr(r.msg);
    if (!confirm('Password hata dein? Phir app bina password ke khulegi.')) return;
    localStorage.removeItem(LOCK_KEY); localStorage.removeItem(FAIL_KEY); sessionStorage.removeItem(OK_KEY);
    [pw.cur, pw.n1, pw.n2].forEach(i => (i.value = ''));
    refreshPwUi(); toast('Password hata diya gaya');
  });
  [pw.cur, pw.n1, pw.n2].forEach(i => i.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); $('#pwSave').click(); }
  }));

  /* =====================================================================
     DESIGN EDITOR  (owner only; Draft -> live preview -> Save)
     Har cheez ka design 'olw_design_v1' mein save hota hai.
     ===================================================================== */
  const DKEY = 'olw_design_v1';
  const FONTS = {
    'Cormorant Garamond': '"Cormorant Garamond",serif', 'Playfair Display': '"Playfair Display",serif', 'Lora': 'Lora,serif',
    'Inter': 'Inter,sans-serif', 'Poppins': 'Poppins,sans-serif', 'Dancing Script': '"Dancing Script",cursive',
    'Great Vibes': '"Great Vibes",cursive', 'Pacifico': 'Pacifico,cursive', 'Caveat': 'Caveat,cursive',
    'Georgia': 'Georgia,serif', 'Courier New': '"Courier New",monospace'
  };
  const BTN = ['shape', 'variant', 'colors', 'font', 'anim'];
  const CAPS = {
    text: ['colors', 'font', 'anim'], field: ['shape', 'colors', 'font'], button: BTN, card: BTN, navitem: BTN,
    frame: ['frame', 'colors', 'font', 'anim'], panel: ['frame', 'layout', 'colors', 'font'],
    photo: ['shape'], group: ['layout'], nav: ['navlayout', 'shape', 'colors', 'font']
  };
  const REG = [
    ['brand', '.brand', 'Logo & naam', 'text'],
    ['search', '.search', 'Search box', 'field'],
    ['heroPhoto', '.hero-photo', 'Hero photo (desktop)', 'photo'],
    ['heroPolaroid', '.hero-polaroid', 'Hero photo frame (mobile)', 'photo'],
    ['noteM', '.note-m', 'Sticker (mobile)', 'text'],
    ['noteD', '.note-d', 'Sticker (desktop)', 'text'],
    ['heroCard', '.hero-card', 'Welcome frame', 'frame'],
    ['welcome', '#welcomeText', 'Welcome handwriting', 'text'],
    ['heading', '#heroTitle', 'Main heading', 'text'],
    ['intro', '#introText', 'Intro text', 'text'],
    ['explore', '#exploreBtn', '"Explore Our World" button', 'button'],
    ['cards', '#featureCards', 'Feature cards (group)', 'group'],
    ['cStory', '.card[data-go="story"]', 'Story card', 'card'],
    ['cGallery', '.card[data-go="gallery"]', 'Gallery card', 'card'],
    ['cLetters', '.card[data-go="letters"]', 'Letters card', 'card'],
    ['cQuestions', '.card[data-go="chat"]', 'Chat card', 'card'],
    ['whyCard', '#whySection', '"Why I Made This" frame', 'frame'],
    ['whyPolaroid', '.why-polaroid', '"Why" photo frame', 'photo'],
    ['whyTitle', '#whyTitle', '"Why" heading', 'text'],
    ['whyText', '#whyText', '"Why" text', 'text'],
    ['signoff', '#signoff', 'Sign-off', 'text'],
    ['readMore', '#readMoreBtn', 'Read More button', 'button'],
    ['moments', '#momentsSection', 'Special Moments panel', 'panel'],
    ['mNext', '#momentsSection > button:nth-of-type(1)', 'Next Special Date', 'card'],
    ['mMemory', '#momentsSection > button:nth-of-type(2)', 'Featured Memory', 'card'],
    ['mCount', '#momentsSection > button:nth-of-type(3)', 'Countdown', 'card'],
    ['surprise', '#surpriseSection', 'Surprise bar', 'panel'],
    ['surpriseBtn', '#surpriseBtn', 'Open Surprise button', 'button'],
    ['nav', '.bottom', 'Bottom navigation', 'nav'],
    ['nHome', '.nav-item[data-go="home"]', 'Nav: Home', 'navitem'],
    ['nStory', '.nav-item[data-go="story"]', 'Nav: Story', 'navitem'],
    ['nGallery', '.nav-item[data-go="gallery"]', 'Nav: Gallery', 'navitem'],
    ['nLetters', '.nav-item[data-go="letters"]', 'Nav: Letters', 'navitem'],
    ['nQuestions', '.nav-item[data-go="chat"]', 'Nav: Chat', 'navitem']
  ];
  // NOTE: Settings (gear) aur profile button jaan-boojh kar editable nahi, taake owner settings se bahar na ho jaye.
  const ITEMS = REG.map(([id, sel, label, kind]) => ({ id, label, kind, el: document.querySelector(sel) })).filter(i => i.el);
  const byId = Object.fromEntries(ITEMS.map(i => [i.id, i]));
  ITEMS.forEach(i => (i.el.dataset.edit = i.id));

  const clone = o => JSON.parse(JSON.stringify(o));
  function loadDesign() { try { return JSON.parse(localStorage.getItem(DKEY)) || {}; } catch { return {}; } }
  let dSaved = loadDesign(), dDraft = null, designOn = false, sel = null;
  const htmlEl = document.documentElement;

  function setAttr(el, name, val) { val ? el.setAttribute(name, val) : el.removeAttribute(name); }
  function applyOne(it, s) {
    const el = it.el;
    el.classList.toggle('d-hidden', !!s.hidden);
    setAttr(el, 'data-shape', s.shape); setAttr(el, 'data-frame', s.frame); setAttr(el, 'data-variant', s.variant);
    setAttr(el, 'data-layout', s.layout); setAttr(el, 'data-anim', s.anim);
    setAttr(el, 'data-font', s.font ? '1' : ''); s.font ? el.style.setProperty('--ff', FONTS[s.font] || s.font) : el.style.removeProperty('--ff');
    setAttr(el, 'data-bgc', s.bg ? '1' : ''); s.bg ? el.style.setProperty('--bgc', s.bg) : el.style.removeProperty('--bgc');
    setAttr(el, 'data-color', s.color ? '1' : ''); s.color ? el.style.setProperty('--tc', s.color) : el.style.removeProperty('--tc');
    el.style.setProperty('translate', s.dx || s.dy ? `${s.dx || 0}px ${s.dy || 0}px` : '');
    el.style.setProperty('scale', s.size && s.size !== 100 ? String(s.size / 100) : '');
    if (it.id === 'nav') {
      const side = (s.layout === 'left' || s.layout === 'right') && !s.hidden ? s.layout : '';
      side ? (htmlEl.dataset.navside = side) : delete htmlEl.dataset.navside;
    }
  }
  function applyDesign(d) {
    ITEMS.forEach(it => applyOne(it, d[it.id] || {}));
    htmlEl.toggleAttribute('data-showall', !!d._showAll);
  }
  function cleanDesign(d) { Object.keys(d).forEach(k => { if (d[k] && typeof d[k] === 'object' && !Object.keys(d[k]).length) delete d[k]; }); }
  const dirty = () => { cleanDesign(dDraft); return JSON.stringify(dDraft) !== JSON.stringify(dSaved); };

  /* --- enter / exit --- */
  function enterDesign() {
    dDraft = clone(dSaved); designOn = true;
    htmlEl.dataset.design = '1'; $('#designPanel').hidden = false; $('#designPanel').classList.remove('min');
    $('#dpShowAll').checked = !!dDraft._showAll; $('#dpAll').checked = false;
    select(null); refreshRemoved();
  }
  function exitDesign() {
    designOn = false; delete htmlEl.dataset.design; $('#designPanel').hidden = true;
    select(null); applyDesign(dSaved); dDraft = null;
  }
  $('#openDesignBtn').addEventListener('click', () => {
    if (draft && JSON.stringify(draft) !== JSON.stringify(saved) &&
        !confirm('Content ki changes publish nahi hui hain. Unhein chhor kar Design Editor kholein?')) return;
    closeSettings(); enterDesign();
  });
  $('#dpSave').addEventListener('click', () => {
    cleanDesign(dDraft);
    try { localStorage.setItem(DKEY, JSON.stringify(dDraft)); }
    catch { return toast('Design save nahi ho saka (storage full). Purana design safe hai.'); }
    dSaved = clone(dDraft); exitDesign(); toast('Design save ho gaya ✓ (is browser mein)');
  });
  $('#dpDiscard').addEventListener('click', () => {
    if (dirty() && !confirm('Unsaved design changes chhor dein?')) return;
    exitDesign();
  });
  $('#dpMin').addEventListener('click', () => $('#designPanel').classList.toggle('min'));

  /* --- selection & panel --- */
  function select(it) {
    ITEMS.forEach(i => i.el.classList.remove('d-sel'));
    sel = it; if (it) it.el.classList.add('d-sel');
    syncPanel();
  }
  function fillFrame(kind) {
    const opts = [['', kind === 'frame' ? 'Default' : 'Default'], ...(kind === 'frame' ? [['torn', 'Torn paper']] : []),
      ['rounded', 'Rounded card'], ['square', 'Square'], ['dashed', 'Dashed border'], ['none', 'No frame (transparent)']];
    $('#dpFrame').innerHTML = opts.map(([v, t]) => `<option value="${v}">${t}</option>`).join('');
  }
  function syncPanel() {
    $('#dpHint').hidden = !!sel; $('#dpControls').hidden = !sel;
    if (!sel) return;
    const s = dDraft[sel.id] || {}, caps = CAPS[sel.kind] || [];
    $('#dpName').textContent = sel.label;
    $$('[data-cap]', $('#dpControls')).forEach(g => (g.hidden = !caps.includes(g.dataset.cap)));
    $('#dpAllRow').hidden = !['button', 'card', 'navitem'].includes(sel.kind);
    fillFrame(sel.kind);
    $('#dpShape').value = s.shape || ''; $('#dpFrame').value = s.frame || ''; $('#dpVariant').value = s.variant || '';
    $('#dpLayout').value = s.layout || ''; $('#dpNavLayout').value = s.layout || '';
    $('#dpFont').value = s.font || ''; $('#dpAnim').value = s.anim || '';
    $('#dpBg').value = s.bg || '#ffffff'; $('#dpColor').value = s.color || '#4c3b58';
    $('#dpSize').value = s.size || 100; $('#dpSizeOut').textContent = (s.size || 100) + '%';
    $('#dpParent').hidden = !sel.el.parentElement.closest('[data-edit]');
  }
  function targets() {
    if (!sel) return [];
    return $('#dpAll').checked && ['button', 'card', 'navitem'].includes(sel.kind) ? ITEMS.filter(i => i.kind === sel.kind) : [sel];
  }
  function setProp(prop, val) {
    targets().forEach(it => {
      const o = (dDraft[it.id] ||= {});
      (val === '' || val == null) ? delete o[prop] : (o[prop] = val);
      applyOne(it, o);
    });
    cleanDesign(dDraft);
  }
  [['dpShape', 'shape'], ['dpFrame', 'frame'], ['dpVariant', 'variant'], ['dpLayout', 'layout'],
   ['dpNavLayout', 'layout'], ['dpFont', 'font'], ['dpAnim', 'anim']]
    .forEach(([id, prop]) => $('#' + id).addEventListener('change', e => setProp(prop, e.target.value)));
  $('#dpBg').addEventListener('input', e => setProp('bg', e.target.value));
  $('#dpColor').addEventListener('input', e => setProp('color', e.target.value));
  $('#dpBgReset').addEventListener('click', () => { setProp('bg', ''); $('#dpBg').value = '#ffffff'; });
  $('#dpColorReset').addEventListener('click', () => { setProp('color', ''); $('#dpColor').value = '#4c3b58'; });
  $('#dpSize').addEventListener('input', e => {
    const v = +e.target.value; $('#dpSizeOut').textContent = v + '%'; setProp('size', v === 100 ? '' : v);
  });
  function nudge(dx, dy) {
    if (!sel) return;
    const o = (dDraft[sel.id] ||= {}); o.dx = (o.dx || 0) + dx; o.dy = (o.dy || 0) + dy;
    if (!o.dx) delete o.dx; if (!o.dy) delete o.dy;
    applyOne(sel, o); cleanDesign(dDraft);
  }
  $$('.dp-move [data-dx]').forEach(b => b.addEventListener('click', () => nudge(+b.dataset.dx, +b.dataset.dy)));
  $('#dpPosReset').addEventListener('click', () => {
    if (!sel) return; const o = (dDraft[sel.id] ||= {}); delete o.dx; delete o.dy; applyOne(sel, o); cleanDesign(dDraft);
  });
  $('#dpParent').addEventListener('click', () => {
    const p = sel && sel.el.parentElement.closest('[data-edit]'); if (p) select(byId[p.dataset.edit]);
  });
  $('#dpHide').addEventListener('click', () => {
    if (!sel) return;
    const o = (dDraft[sel.id] ||= {}); o.hidden = true; applyOne(sel, o);
    select(null); refreshRemoved();
  });
  $('#dpReset').addEventListener('click', () => {
    if (!sel) return; delete dDraft[sel.id]; applyOne(sel, {}); syncPanel(); refreshRemoved();
  });
  $('#dpResetAll').addEventListener('click', () => {
    if (!confirm('Poora design default par wapas karna hai? (Save dabane tak permanent nahi hoga)')) return;
    dDraft = {}; applyDesign(dDraft); $('#dpShowAll').checked = false; select(null); refreshRemoved();
  });
  $('#dpShowAll').addEventListener('change', e => {
    e.target.checked ? (dDraft._showAll = true) : delete dDraft._showAll; applyDesign(dDraft);
  });
  function refreshRemoved() {
    const gone = ITEMS.filter(i => dDraft && dDraft[i.id] && dDraft[i.id].hidden);
    $('#dpCount').textContent = gone.length;
    const ul = $('#dpRemovedList'); ul.innerHTML = '';
    gone.forEach(it => {
      const li = document.createElement('li'), name = document.createElement('span'), b = document.createElement('button');
      name.textContent = it.label; b.type = 'button'; b.className = 'btn ghost small'; b.textContent = 'Wapas layein';
      b.addEventListener('click', () => {
        delete dDraft[it.id].hidden; cleanDesign(dDraft); applyOne(it, dDraft[it.id] || {}); refreshRemoved();
      });
      li.append(name, b); ul.append(li);
    });
  }

  /* --- drag to move (design mode only) --- */
  let drag = null;
  document.addEventListener('click', e => {      // design mode mein koi button apna asli kaam na kare
    if (!designOn || e.target.closest('#designPanel')) return;
    e.preventDefault(); e.stopPropagation();
  }, true);
  document.addEventListener('pointerdown', e => {
    if (!designOn || e.target.closest('#designPanel')) return;
    const el = e.target.closest('[data-edit]');
    if (!el) { select(null); return; }
    e.preventDefault();
    const it = byId[el.dataset.edit]; select(it);
    const o = dDraft[it.id] || {};
    drag = { it, sx: e.clientX, sy: e.clientY, ox: o.dx || 0, oy: o.dy || 0, moved: false };
  }, true);
  window.addEventListener('pointermove', e => {
    if (!drag) return;
    const mx = e.clientX - drag.sx, my = e.clientY - drag.sy;
    if (!drag.moved && Math.hypot(mx, my) < 4) return;
    drag.moved = true;
    const o = (dDraft[drag.it.id] ||= {});
    o.dx = Math.round(drag.ox + mx); o.dy = Math.round(drag.oy + my);
    applyOne(drag.it, o);
  });
  const endDrag = () => {
    if (!drag) return;
    const o = dDraft[drag.it.id];
    if (o) { if (!o.dx) delete o.dx; if (!o.dy) delete o.dy; }
    cleanDesign(dDraft); drag = null;
  };
  window.addEventListener('pointerup', endDrag); window.addEventListener('pointercancel', endDrag);
  document.addEventListener('keydown', e => {
    if (!designOn) return;
    if (e.key === 'Escape') { select(null); return; }
    if (!sel || /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName)) return;
    const step = e.shiftKey ? 20 : 5, k = { ArrowUp: [0, -step], ArrowDown: [0, step], ArrowLeft: [-step, 0], ArrowRight: [step, 0] }[e.key];
    if (k) { e.preventDefault(); nudge(...k); }
  });

  /* =====================================================================
     THEMES & LAYOUTS  (ek click mein poora design)
     CSS mein har theme ek [data-theme="id"] block hai aur har layout html[data-view="id"].
     Naya theme: home.css mein koi block copy karein + yahan THEMES mein ek line jodein.
     Design Editor ke badlaav theme ke UPAR lagte rahte hain.
     ===================================================================== */
  const TKEY = 'olw_theme_v1';
  const THEMES = [
    { id: 'lavender', name: 'Lavender Dreams', icon: '💜', desc: 'Reference jaisa: lavender aur torn paper', fx: 'none' },
    { id: 'rose', name: 'Rose Garden', icon: '🌹', desc: 'Gulabi aur gulab, narm cards, girti pattiyan', fx: 'petal' },
    { id: 'midnight', name: 'Midnight Stars', icon: '🌙', desc: 'Gehri raat, sunehri rang, chamakte sitare', fx: 'star' },
    { id: 'sunset', name: 'Golden Sunset', icon: '🌅', desc: 'Garam narangi shaam, torn paper', fx: 'sparkle' },
    { id: 'ocean', name: 'Ocean Breeze', icon: '🌊', desc: 'Thandi hawa jaisa, upar uthte bubbles', fx: 'bubble' },
    { id: 'minimal', name: 'Minimal Cream', icon: '🤍', desc: 'Saaf aur seedha, kam decoration', fx: 'none' },
    { id: 'sakura', name: 'Sakura Spring', icon: '🌸', desc: 'Cherry blossom aur mint hara', fx: 'petal' },
    { id: 'vintage', name: 'Vintage Diary', icon: '📜', desc: 'Purani diary, sepia, haath ki likhai', fx: 'none' },
    { id: 'aurora', name: 'Glass Aurora', icon: '✨', desc: 'Shishay jaise cards, rangeen aurora', fx: 'sparkle' }
  ];
  const VIEWS = [
    { id: 'classic', name: 'Classic', desc: 'Reference image jaisa' },
    { id: 'centered', name: 'Centered', desc: 'Text beech mein, moments neechay' },
    { id: 'overlay', name: 'Magazine', desc: 'Bari photo, text uske upar, tiles' },
    { id: 'rail', name: 'Side rail', desc: 'Navigation left side par (sirf desktop)' },
    { id: 'cozy', name: 'Cozy', desc: 'Chhota hero, mobile par sab dikhta hai' }
  ];
  const themeOk = id => THEMES.some(t => t.id === id), viewOk = id => VIEWS.some(v => v.id === id);
  function loadTheme() {
    const base = { theme: 'lavender', view: 'classic', fx: true, autoNight: false, prev: null };
    try { return { ...base, ...(JSON.parse(localStorage.getItem(TKEY)) || {}) }; } catch { return base; }
  }
  let tSaved = loadTheme(), tDraft = null, tOpen = false;
  const isNight = () => {
    const h = +new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: 'numeric', hourCycle: 'h23' }).format(new Date());
    return h >= 20 || h < 6;
  };
  const effTheme = t => (t.autoNight && isNight() ? 'midnight' : themeOk(t.theme) ? t.theme : 'lavender');

  /* --- floating effects --- */
  const fxBox = $('#fx'); let fxKey = '';
  function syncFx(t) {
    const type = (THEMES.find(x => x.id === effTheme(t)) || {}).fx || 'none';
    const small = matchMedia('(max-width:700px)').matches;
    const on = t.fx && type !== 'none' && !reduced();
    const key = on ? `${type}|${small ? 'm' : 'd'}` : 'off';
    if (key === fxKey) return;
    fxKey = key; fxBox.innerHTML = '';
    if (!on) return;
    const twinkle = type === 'star' || type === 'sparkle';
    for (let i = 0; i < (small ? 9 : 16); i++) {
      const p = document.createElement('span'), st = p.style, dur = twinkle ? 2.5 + Math.random() * 3.5 : 9 + Math.random() * 9;
      p.className = `fx-p fx-${type}`;
      st.setProperty('--x', Math.random() * 96 + '%');
      st.setProperty('--y', Math.random() * 88 + '%');
      st.setProperty('--s', (type === 'petal' ? 9 + Math.random() * 9 : type === 'bubble' ? 8 + Math.random() * 22 : 10 + Math.random() * 14) + 'px');
      st.setProperty('--d', dur + 's');
      st.setProperty('--delay', -Math.random() * dur + 's');
      st.setProperty('--dx', Math.random() * 160 - 80 + 'px');
      st.setProperty('--r', 180 + Math.random() * 360 + 'deg');
      if (type === 'heart') p.textContent = '♡'; else if (type === 'star') p.textContent = '✦'; else if (type === 'sparkle') p.textContent = '✧';
      fxBox.append(p);
    }
  }
  function applyTheme(t) {
    htmlEl.dataset.theme = effTheme(t);
    htmlEl.dataset.view = viewOk(t.view) ? t.view : 'classic';
    syncFx(t);
  }

  /* --- panel --- */
  const tPanel = $('#themePanel');
  function renderThemePanel() {
    const tg = $('#tpThemes'), vg = $('#tpViews'); tg.innerHTML = ''; vg.innerHTML = '';
    THEMES.forEach(t => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 't-card'; b.dataset.id = t.id;
      b.innerHTML = `<span class="sw" data-theme="${t.id}"><i class="sw-paper">Aa</i><i class="sw-dot"></i><i class="sw-btn"></i></span><span class="t-name"></span><small></small>`;
      $('.t-name', b).textContent = `${t.icon} ${t.name}`; $('small', b).textContent = t.desc;
      b.addEventListener('click', () => { tDraft.theme = t.id; applyTheme(tDraft); markPanel(); });
      tg.append(b);
    });
    VIEWS.forEach(v => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'v-card'; b.dataset.id = v.id;
      b.innerHTML = '<b></b><small></small>'; $('b', b).textContent = v.name; $('small', b).textContent = v.desc;
      b.addEventListener('click', () => { tDraft.view = v.id; applyTheme(tDraft); markPanel(); });
      vg.append(b);
    });
  }
  function markPanel() {
    $$('#tpThemes .t-card').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === tDraft.theme)));
    $$('#tpViews .v-card').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === tDraft.view)));
    $('#tpFx').checked = tDraft.fx; $('#tpNight').checked = tDraft.autoNight;
  }
  function openThemePanel() {
    tDraft = { ...tSaved }; tOpen = true; tPanel.hidden = false; tPanel.classList.remove('min');
    htmlEl.dataset.tpanel = '1'; $('#tpClear').checked = false;
    renderThemePanel(); markPanel();
  }
  function closeThemePanel(revert) {
    tOpen = false; tPanel.hidden = true; delete htmlEl.dataset.tpanel;
    if (revert) applyTheme(tSaved);
    tDraft = null;
  }
  $('#openThemeBtn').addEventListener('click', () => {
    if (draft && JSON.stringify(draft) !== JSON.stringify(saved) &&
        !confirm('Content ki changes publish nahi hui hain. Unhein chhor kar Themes kholein?')) return;
    closeSettings(); openThemePanel();
  });
  $('#tpCancel').addEventListener('click', () => closeThemePanel(true));
  $('#tpMin').addEventListener('click', () => tPanel.classList.toggle('min'));
  $('#tpFx').addEventListener('change', e => { tDraft.fx = e.target.checked; applyTheme(tDraft); });
  $('#tpNight').addEventListener('change', e => { tDraft.autoNight = e.target.checked; applyTheme(tDraft); markPanel(); });
  $('#tpRandom').addEventListener('click', () => {
    const others = THEMES.filter(t => t.id !== tDraft.theme);
    tDraft.theme = others[Math.floor(Math.random() * others.length)].id;
    tDraft.view = VIEWS[Math.floor(Math.random() * VIEWS.length)].id;
    applyTheme(tDraft); markPanel();
  });
  $('#tpUndo').addEventListener('click', () => {
    const p = tSaved.prev && themeOk(tSaved.prev.theme) ? tSaved.prev : { theme: tSaved.theme, view: tSaved.view };
    tDraft.theme = p.theme; tDraft.view = viewOk(p.view) ? p.view : 'classic';
    applyTheme(tDraft); markPanel();
    toast(tSaved.prev ? 'Pichla saved look wapas aa gaya (Save dabayein to pakka hoga)' : 'Abhi tak koi pichla look save nahi hua');
  });
  $('#tpSave').addEventListener('click', () => {
    const changed = tSaved.theme !== tDraft.theme || tSaved.view !== tDraft.view;
    const next = {
      theme: tDraft.theme, view: tDraft.view, fx: tDraft.fx, autoNight: tDraft.autoNight,
      prev: changed ? { theme: tSaved.theme, view: tSaved.view } : tSaved.prev
    };
    try { localStorage.setItem(TKEY, JSON.stringify(next)); }
    catch { return toast('Theme save nahi ho saka (storage full). Purana look safe hai.'); }
    if ($('#tpClear').checked) {                      // Design Editor ke badlaav bhi saaf
      try { localStorage.removeItem(DKEY); } catch { /* ignore */ }
      dSaved = {}; applyDesign(dSaved);
    }
    tSaved = next; closeThemePanel(false);
    toast('Theme save ho gaya ✓ (is browser mein)');
  });

  /* ---------- Init ---------- */
  applyTheme(tSaved);
  apply(saved);
  applyDesign(dSaved);
  refreshPwUi();
  if (htmlEl.dataset.locked) setTimeout(() => $('#lockInput').focus(), 50);
  setInterval(() => { if (!draft) renderMoments(saved); }, 60000);   // midnight par countdown update
  setInterval(() => { if (!tOpen && tSaved.autoNight) applyTheme(tSaved); }, 300000);   // 8pm/6am par auto night badle
})();
