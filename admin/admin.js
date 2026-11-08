/* =====================================================================
   Administrace webu Správa SVJ Havlíčkův Brod
   Obsah webu je v repozitáři (_data/*.json). Uložení = jeden commit přes backend
   webhunter-admin (Cloudflare Worker, přihlášení heslem, id spravasvj-hb); GitHub Action
   pak web přegeneruje (~1 min). Vzor: administrace breu-elektro (8. 11. 2026).
   ===================================================================== */
'use strict';
(() => {
const CFG = {
  id: 'spravasvj-hb', site: '../',
  api: /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && location.search.includes('local') ? 'http://localhost:8787' : 'https://webhunter-admin.webhunter.workers.dev',
};
const FILES = { texty: '_data/texty.json', sluzby: '_data/sluzby.json', cenik: '_data/cenik.json', site: '_data/site.json' };
const LABEL = { texty: 'Texty', sluzby: 'Služby', cenik: 'Ceník', site: 'Kontakty a logo' };
const SK = 'spravasvjhb_admin';
const S = { sess: null, def: false, D: {}, snap: {}, pending: {}, preview: {}, saving: false, lib: null, forms: null };
/* ---------------------------------------------------------------- ikony */
const I = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const IC = {
  home: I('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>'),
  compass: I('<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>'),
  users: I('<circle cx="9" cy="8" r="3.2"/><path d="M3 20c.6-3.4 3-5.5 6-5.5s5.4 2.1 6 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M16.5 14.6c2.3.3 4 2.2 4.5 5.4"/>'),
  text: I('<path d="M5 6h14M5 11h14M5 16h9"/>'),
  q: I('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7M12 17h0"/>'),
  phone: I('<path d="M4 6l8 6 8-6"/><rect x="3" y="5" width="18" height="14" rx="2"/>'),
  gear: I('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8 2 2 0 1 1-2.8 2.8 1.7 1.7 0 0 0-2.8 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.8-1.2 2 2 0 1 1-2.8-2.8A1.7 1.7 0 0 0 3.3 14a2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.2-2.8 2 2 0 1 1 2.8-2.8A1.7 1.7 0 0 0 10 3.3a2 2 0 1 1 4 0 1.7 1.7 0 0 0 2.8 1.2 2 2 0 1 1 2.8 2.8A1.7 1.7 0 0 0 20.7 10a2 2 0 1 1 0 4 1.7 1.7 0 0 0-1.3 1z"/>'),
  help: I('<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h0"/>'),
  ext: I('<path d="M14 4h6v6M20 4L10 14"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>'),
  menu: I('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  x: I('<path d="M18 6L6 18M6 6l12 12"/>'),
  up: I('<path d="M12 19V5M6 11l6-6 6 6"/>'),
  down: I('<path d="M12 5v14M6 13l6 6 6-6"/>'),
  left: I('<path d="M15 18l-6-6 6-6"/>'),
  right: I('<path d="M9 18l6-6-6-6"/>'),
  trash: I('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
  plus: I('<path d="M12 5v14M5 12h14"/>'),
  minus: I('<path d="M5 12h14"/>'),
  chev: I('<path d="M6 9l6 6 6-6"/>'),
  eye: I('<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>'),
  upload: I('<path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4M17 8l-5-5-5 5M12 3v12"/>'),
  image: I('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>'),
  logout: I('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>'),
  inbox: I('<path d="M3 13h5l1.5 3h5l1.5-3h5"/><path d="M5 5h14l2 8v6H3v-6z"/>'),
  refresh: I('<path d="M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4"/>'),
  copy: I('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>'),
  bolt: I('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'),
  tag: I('<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="8" cy="8" r="1.5"/>'),
};
const LOGO = '<span class="adm-logo"><i class="dum" aria-hidden="true"></i>Správa SVJ HB</span>';
/* ---------------------------------------------------------------- utils */
const $ = (s, c = document) => c.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 8);
const slugify = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const imgSrc = (p) => !p ? '' : S.preview[p] || (/^(https?:|blob:|data:)/.test(p) ? p : CFG.site + p);
const plural = (n, a, b, c) => (n === 1 ? a : n >= 2 && n <= 4 ? b : c);

function h(sel, props = {}, ...kids) {
  const [tag, ...cls] = sel.split('.');
  const el = document.createElement(tag || 'div');
  if (cls.length) el.className = cls.join(' ');
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'value') el.value = v;
    else if (k === 'checked') el.checked = !!v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) el.append(k.nodeType ? k : document.createTextNode(k));
  return el;
}
function toast(title, sub = '', type = '') {
  const el = h('div.toast' + (type ? '.' + type : ''), {}, h('b', {}, title), sub ? h('small', {}, sub) : null);
  $('#toasts').append(el);
  setTimeout(() => { el.style.transition = 'opacity .4s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 450); }, type === 'err' ? 7000 : 4000);
}
function modal({ title, body, actions = [] }) {
  return new Promise((resolve) => {
    const close = (v) => { bg.remove(); resolve(v); };
    const box = h('div.modal', { role: 'dialog', 'aria-modal': 'true' }, h('h2', {}, title));
    if (typeof body === 'string') box.append(h('div', { html: body })); else if (body) box.append(body);
    box.append(h('div.modal-actions', {}, actions.map((a) => h('button.btn' + (a.cls ? '.' + a.cls : ''), { type: 'button', onclick: () => close(typeof a.value === 'function' ? a.value(box) : a.value) }, a.label))));
    const bg = h('div.modal-bg', { onclick: (e) => { if (e.target === bg) close(null); } }, box);
    $('#modal-root').append(bg);
    const f = box.querySelector('input,textarea,select,button.btn-primary'); if (f) setTimeout(() => f.focus(), 50);
  });
}
const confirmDlg = (title, text, ok = 'Smazat', cls = 'btn-dark') => modal({ title, body: `<p>${esc(text)}</p>`, actions: [{ label: 'Zrušit', value: false }, { label: ok, cls, value: true }] }).then((v) => v === true);

/* ---------------------------------------------------------------- API */
const b64e = (bytes) => { let s = ''; bytes = new Uint8Array(bytes); for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); };
const utf8b64 = (str) => b64e(new TextEncoder().encode(str));
function saveSess() { localStorage.setItem(SK, JSON.stringify({ t: S.sess, def: S.def, exp: Date.now() + 11.5 * 3600e3 })); }
async function api(path, opt = {}, retried = false) {
  const headers = { ...(typeof opt.body === 'string' ? { 'Content-Type': 'application/json' } : {}) };
  if (S.sess) headers.Authorization = 'Bearer ' + S.sess;
  let r;
  try { r = await fetch(`${CFG.api}/api/${CFG.id}${path}`, { ...opt, headers, cache: 'no-store' }); }
  catch { throw new Error('Nelze se spojit se serverem. Zkontrolujte připojení k internetu.'); }
  if (r.status === 401 && path !== '/login' && !retried && S.D.site) { if (await reauth()) return api(path, opt, true); }
  if (!r.ok) { let m = r.statusText; try { m = (await r.json()).error || m; } catch {} const e = new Error(m); e.status = r.status; throw e; }
  return opt.raw ? r.text() : r.json();
}
const readFile = (p) => api('/file?path=' + encodeURIComponent(p) + '&t=' + Date.now(), { raw: true });
async function commit(files, message) {
  const out = []; const queue = [...files];
  const worker = async () => { while (queue.length) { const f = queue.shift(); const { sha } = await api('/blob', { method: 'POST', body: JSON.stringify({ content: f.b64 ?? utf8b64(f.content), encoding: 'base64' }) }); out.push({ path: f.path, sha }); } };
  await Promise.all([worker(), worker(), worker()]);
  return (await api('/commit', { method: 'POST', body: JSON.stringify({ files: out, message }) })).sha;
}
async function reauth() {
  const inp = h('input', { type: 'password', autocomplete: 'current-password', placeholder: 'Heslo' });
  const pw = await modal({ title: 'Přihlášení vypršelo', body: h('div', {}, h('p', {}, 'Zadejte prosím heslo znovu — rozdělaná práce zůstane zachovaná.'), inp), actions: [{ label: 'Zrušit', value: null }, { label: 'Přihlásit', cls: 'btn-primary', value: () => inp.value }] });
  if (!pw) return false;
  try { const r = await api('/login', { method: 'POST', body: JSON.stringify({ password: pw }) }); S.sess = r.token; S.def = r.def; saveSess(); return true; }
  catch (e) { toast('Přihlášení se nepovedlo', e.message, 'err'); return false; }
}

/* ---------------------------------------------------------------- data */
async function loadAll() {
  const keys = Object.keys(FILES);
  const res = await Promise.all(keys.map((k) => readFile(FILES[k]).then(JSON.parse)));
  keys.forEach((k, i) => { S.D[k] = res[i]; });
  snapshot();
}
function snapshot(keys = Object.keys(FILES)) { keys.forEach((k) => { S.snap[k] = JSON.stringify(S.D[k]); }); }
const dirtyKeys = () => Object.keys(FILES).filter((k) => S.D[k] && JSON.stringify(S.D[k]) !== S.snap[k]);
const changed = debounce(() => updateSavebar(), 100);
window.addEventListener('beforeunload', (e) => { if (dirtyKeys().length) { e.preventDefault(); e.returnValue = ''; } });


function validate() {
  for (const x of S.D.sluzby) if (!String(x.nazev || '').trim()) return 'Jedna služba nemá nadpis.';
  for (const x of S.D.cenik.polozky) if (!String(x.nazev || '').trim() && String(x.cena || '').trim()) return 'Jedna položka ceníku má cenu, ale nemá název.';
  S.D.cenik.polozky = S.D.cenik.polozky.filter((x) => String(x.nazev || '').trim() || String(x.cena || '').trim());
  const k = S.D.site.kontakt || {};
  if (k.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(k.email)) return 'E-mail v Kontaktech nevypadá správně.';
  if (!String(S.D.texty.hero.h1 || '').trim()) return 'Hlavní nadpis na úvodu nesmí být prázdný.';
  return null;
}
async function saveAll() {
  const keys = dirtyKeys();
  if (!keys.length || S.saving) return;
  const err = validate(); if (err) return toast('Nelze uložit', err, 'err');
  S.saving = true; updateSavebar();
  const bar = h('div.progress-line'); document.body.append(bar);
  try {
    const keys2 = dirtyKeys();
    if (keys2.includes('site')) {   // technická pole (doména, formulář) nastavujeme my – vzít aktuální z repozitáře
      const cur = JSON.parse(await readFile(FILES.site));
      ['slug', 'url', 'domena', 'navrh', 'formular', 'nav', 'lang', 'typ', 'og_image', 'theme_color', 'cookie_lista', 'ga_id', 'base'].forEach((k) => { if (k in cur) S.D.site[k] = cur[k]; });
    }
    const files = keys2.map((k) => ({ path: FILES[k], content: JSON.stringify(S.D[k], null, 1) + '\n' }));
    const used = JSON.stringify(S.D);
    const imgs = Object.keys(S.pending).filter((p) => used.includes(p));
    imgs.forEach((p) => files.push({ path: p, b64: S.pending[p] }));
    const sha = await commit(files, keys2.map((k) => LABEL[k]).join(', ') + (imgs.length ? ` (+${imgs.length} foto)` : ''));
    imgs.forEach((p) => delete S.pending[p]);
    snapshot(keys2);
    toast('Uloženo', 'Změny se na webu objeví přibližně za minutu.', 'ok');
    watchPublish(sha);
  } catch (e) { toast('Uložení se nepovedlo', e.message, 'err'); }
  finally { S.saving = false; bar.remove(); updateSavebar(); }
}
function discard() { dirtyKeys().forEach((k) => { S.D[k] = JSON.parse(S.snap[k]); }); updateSavebar(); route(); toast('Změny zahozeny'); }

/* publikace — čeká, až version.json na webu obsahuje nový commit */
let pubTimer = null;
function setPub(state, text) { const el = $('.pub'); if (el) { el.className = 'pub ' + state; el.innerHTML = `<i></i><span>${esc(text)}</span>`; } }
function watchPublish(sha) {
  localStorage.setItem(SK + '_pub', JSON.stringify({ sha, t: Date.now() }));
  clearInterval(pubTimer); setPub('busy', 'Zveřejňuji změny…');
  const t0 = Date.now();
  pubTimer = setInterval(async () => {
    try {
      const v = await fetch(CFG.site + 'version.json?t=' + Date.now(), { cache: 'no-store' }).then((r) => r.json());
      if (v.sha === sha) { clearInterval(pubTimer); localStorage.removeItem(SK + '_pub'); setPub('', 'Web je aktuální'); toast('Změny jsou na webu', 'Web byl právě aktualizován.', 'ok'); return; }
    } catch {}
    if (Date.now() - t0 > 8 * 60000) { clearInterval(pubTimer); setPub('warn', 'Zveřejnění trvá déle'); }
  }, 6000);
}
function initPub() { const p = JSON.parse(localStorage.getItem(SK + '_pub') || 'null'); if (p && Date.now() - p.t < 10 * 60000) watchPublish(p.sha); else setPub('', 'Web je aktuální'); }

/* ---------------------------------------------------------------- fotky */
async function compress(file, max = 1800) {
  let bmp;
  try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { throw new Error(`Soubor „${file.name}“ nejde načíst. Použijte fotku JPG, PNG nebo WebP (fotky z iPhonu ve formátu HEIC nejdřív uložte jako JPG).`); }
  const sc = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * sc); c.height = Math.round(bmp.height * sc);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await new Promise((r) => c.toBlob(r, 'image/webp', 0.82));
  if (!blob || blob.type !== 'image/webp') throw new Error('Tento prohlížeč neumí fotku převést. Zkuste prosím Chrome, Safari nebo Edge.');
  return { blob, w: c.width, h: c.height };
}
async function upload(file, hint, max) {
  const { blob, w, h: hh } = await compress(file, max);
  const d = new Date();
  const name = (slugify(hint) || slugify(file.name.replace(/\.[^.]+$/, '')) || 'foto').slice(0, 40);
  const path = `img/uploads/${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}/${name}-${uid()}.webp`;
  S.pending[path] = b64e(await blob.arrayBuffer());
  S.preview[path] = URL.createObjectURL(blob);
  return { src: path, w, h: hh };
}
async function library() {
  if (!S.lib) { try { S.lib = await fetch(CFG.site + 'admin/images.json?t=' + Date.now()).then((r) => r.json()); } catch { S.lib = []; } }
  return [...Object.keys(S.pending), ...S.lib.filter((p) => !/-sm\.webp$/.test(p))];
}
async function pickFromLibrary(title = 'Vybrat fotku z webu') {
  const list = await library();
  return new Promise((resolve) => {
    let done = false;
    const grid = h('div.lib', {}, list.map((p) => h('button', { type: 'button', onclick: () => { done = true; resolve(p); document.querySelector('.modal-bg')?.remove(); } }, h('img', { src: imgSrc(p), loading: 'lazy', alt: '' }))));
    modal({ title, body: grid, actions: [{ label: 'Zavřít', value: null }] }).then(() => { if (!done) resolve(null); });
  });
}
const setPhoto = (obj, r) => { obj.src = r.src; if (r.w) { obj.w = r.w; obj.h = r.h; } else { delete obj.w; delete obj.h; } };

/* ---------------------------------------------------------------- pole formulářů */
const bump = () => changed();
function fText(obj, key, label, o = {}) {
  const inp = o.multi
    ? h('textarea', { rows: o.rows || 4, placeholder: o.ph || '', oninput: (e) => { obj[key] = e.target.value; bump(); o.on?.(); } })
    : h('input', { type: o.type || 'text', placeholder: o.ph || '', inputmode: o.inputmode, min: o.min, max: o.max, autocomplete: 'off', oninput: (e) => { obj[key] = o.type === 'number' ? (e.target.value === '' ? '' : +e.target.value) : e.target.value; bump(); o.on?.(); } });
  inp.value = obj[key] ?? '';
  return h('label.field', {}, h('span', {}, label), inp, o.hint ? h('small', {}, o.hint) : null);
}
function fSelect(obj, key, label, options, o = {}) {
  if (obj[key] != null && obj[key] !== '' && !options.some(([v]) => String(v) === String(obj[key]))) options = [[obj[key], String(obj[key])], ...options];
  const sel = h('select', { onchange: (e) => { obj[key] = o.num ? +e.target.value : e.target.value; bump(); o.on?.(); } }, options.map(([v, t]) => h('option', { value: v }, t)));
  sel.value = String(obj[key] ?? options[0][0]);
  return h('label.field', {}, h('span', {}, label), sel, o.hint ? h('small', {}, o.hint) : null);
}
function fCheck(obj, key, label, on) {
  return h('label.check', {}, h('input', { type: 'checkbox', checked: obj[key], onchange: (e) => { obj[key] = e.target.checked; bump(); on?.(); } }), h('span', {}, label));
}
/** jedna fotka: obj.src (+ w, h) */
function fImage(obj, label, hint = '', o = {}) {
  const prev = h('img.prev', { src: imgSrc(obj.src), alt: '' });
  const set = (r) => { setPhoto(obj, r); prev.src = imgSrc(r.src); bump(); o.on?.(); };
  const file = h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { set(await upload(f, hint)); toast('Fotka připravena', 'Na web se nahraje po uložení.'); } catch (er) { toast('Fotku se nepodařilo načíst', er.message, 'err'); }
    e.target.value = '';
  } });
  return h('div.field', {}, h('span', {}, label),
    h('div.img-field', {}, prev, h('div.acts', {},
      h('button.btn.btn-sm', { type: 'button', onclick: () => file.click(), html: IC.upload + 'Nahrát novou' }),
      h('button.btn.btn-sm.btn-ghost', { type: 'button', onclick: async () => { const p = await pickFromLibrary(); if (p) set({ src: p }); }, html: IC.image + 'Vybrat z webu' }), file)),
    o.hint ? h('small', {}, o.hint) : null);
}
/** mřížka fotek: nahrát více najednou, popis, pořadí, mazání */
function fPhotos(arr, o = {}) {
  const wrap = h('div');
  const render = () => {
    const grid = h('div.photos');
    arr.forEach((p, i) => {
      const alt = h('textarea', { rows: 2, placeholder: o.altPh || 'Popis fotky (co je na ní)', 'aria-label': 'Popis fotky', oninput: (e) => { p.alt = e.target.value; bump(); } }); alt.value = p.alt || '';
      const img = h('img', { src: imgSrc(p.src), alt: '', title: 'Vyměnit fotku', onclick: () => replace(i) });
      grid.append(h('div.photo', {}, img,
        h('div.ph-tools', {},
          h('button.btn.btn-icon.btn-ghost', { type: 'button', title: 'Posunout dopředu', 'aria-label': 'Posunout dopředu', disabled: i === 0, onclick: () => { arr.splice(i - 1, 0, arr.splice(i, 1)[0]); bump(); render(); }, html: IC.left }),
          h('button.btn.btn-icon.btn-ghost', { type: 'button', title: 'Smazat fotku', 'aria-label': 'Smazat fotku', onclick: async () => { if (await confirmDlg('Smazat fotku?', 'Fotka zmizí z webu (po uložení).')) { arr.splice(i, 1); bump(); render(); } }, html: IC.trash }),
          h('button.btn.btn-icon.btn-ghost', { type: 'button', title: 'Posunout dozadu', 'aria-label': 'Posunout dozadu', disabled: i === arr.length - 1, onclick: () => { arr.splice(i + 1, 0, arr.splice(i, 1)[0]); bump(); render(); }, html: IC.right })),
        alt));
    });
    const file = h('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true, onchange: async (e) => {
      const fs = [...e.target.files]; e.target.value = '';
      for (const f of fs) {
        try { const r = await upload(f, o.hint || 'foto'); arr.push({ src: r.src, w: r.w, h: r.h, alt: '' }); bump(); }
        catch (er) { toast('Fotku se nepodařilo načíst', er.message, 'err'); }
      }
      render(); if (fs.length) toast(fs.length === 1 ? 'Fotka přidána' : `Přidáno ${fs.length} fotek`, 'Doplňte popis a uložte změny.');
    } });
    grid.append(h('button.photo-add', { type: 'button', onclick: () => file.click(), html: IC.upload + '<span>Nahrát fotky<br><small>můžete vybrat víc najednou</small></span>' }), file);
    grid.append(h('button.photo-add', { type: 'button', onclick: async () => { const p = await pickFromLibrary(); if (p) { arr.push({ src: p, alt: '' }); bump(); render(); } }, html: IC.image + '<span>Vybrat z fotek na webu</span>' }));
    wrap.replaceChildren(grid);
  };
  const replace = async (i) => {
    const r = await modal({ title: 'Vyměnit fotku', body: '<p>Nahrajte novou fotku, nebo vyberte některou z fotek, které už na webu jsou. Popis fotky zůstane.</p>', actions: [{ label: 'Zrušit', value: null }, { label: 'Vybrat z webu', value: 'lib' }, { label: 'Nahrát novou', cls: 'btn-primary', value: 'up' }] });
    if (r === 'lib') { const p = await pickFromLibrary(); if (p) { setPhoto(arr[i], { src: p }); bump(); render(); } }
    if (r === 'up') {
      const file = h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: async (e) => {
        const f = e.target.files[0]; if (!f) return;
        try { setPhoto(arr[i], await upload(f, o.hint || 'foto')); bump(); render(); toast('Fotka vyměněna', 'Na web se nahraje po uložení.'); } catch (er) { toast('Fotku se nepodařilo načíst', er.message, 'err'); }
      } });
      document.body.append(file); file.click(); setTimeout(() => file.remove(), 60000);
    }
  };
  render();
  return wrap;
}
/** seznam položek s rozbalováním, řazením a mazáním */
function fList(arr, o) {
  const wrap = h('div');
  const render = (openIdx = -1) => {
    wrap.replaceChildren();
    const items = h('div.items');
    if (!arr.length) items.append(h('p.empty', {}, o.empty || 'Zatím tu nic není.'));
    arr.forEach((it, i) => {
      const title = h('b'), sub = h('small'), thumb = o.thumb ? h('img.thumb', { alt: '' }) : null;
      const refresh = () => { title.textContent = o.title(it) || '(bez názvu)'; sub.textContent = o.sub ? o.sub(it) : ''; if (thumb) thumb.src = imgSrc(o.thumb(it)); };
      const body = h('div.item-body');
      let built = false;
      const el = h('div.item');
      const toggle = () => { if (!built) { o.body(it, body, refresh); built = true; } el.classList.toggle('open'); };
      const head = h('div.item-head', {},
        thumb, h('div.t', { onclick: toggle }, title, sub),
        h('div.item-tools', {},
          o.noSort ? null : h('button.btn.btn-icon.btn-ghost', { type: 'button', title: 'Posunout nahoru', 'aria-label': 'Posunout nahoru', disabled: i === 0, onclick: () => { arr.splice(i - 1, 0, arr.splice(i, 1)[0]); bump(); render(); }, html: IC.up }),
          o.noSort ? null : h('button.btn.btn-icon.btn-ghost', { type: 'button', title: 'Posunout dolů', 'aria-label': 'Posunout dolů', disabled: i === arr.length - 1, onclick: () => { arr.splice(i + 1, 0, arr.splice(i, 1)[0]); bump(); render(); }, html: IC.down }),
          o.copy ? h('button.btn.btn-icon.btn-ghost', { type: 'button', title: 'Duplikovat (nový termín)', 'aria-label': 'Duplikovat', onclick: () => { const c = o.copy(JSON.parse(JSON.stringify(it))); arr.splice(i + 1, 0, c); bump(); render(i + 1); toast('Položka zkopírována', 'Upravte termín a uložte.'); }, html: IC.copy }) : null,
          h('button.btn.btn-icon.btn-ghost', { type: 'button', title: 'Smazat', 'aria-label': 'Smazat', onclick: async () => { if (await confirmDlg('Smazat položku?', `„${o.title(it) || 'bez názvu'}“ bude odstraněna.`)) { arr.splice(i, 1); bump(); render(); } }, html: IC.trash }),
          h('button.btn.btn-icon.btn-ghost.chev', { type: 'button', 'aria-label': 'Rozbalit', onclick: toggle, html: IC.chev })));
      el.append(head, body); items.append(el); refresh();
      if (i === openIdx) toggle();
    });
    wrap.append(...[items, o.make ? h('button.btn.add', { type: 'button', onclick: () => { arr.push(o.make()); bump(); render(arr.length - 1); }, html: IC.plus + (o.addLabel || 'Přidat') }) : null].filter(Boolean));
  };
  render(o.open ?? -1);
  return wrap;
}
/** seznam textů (odrážky) */
function fStrList(arr, label, o = {}) {
  const box = h('div.field', {}, h('span', {}, label));
  const list = h('div');
  const render = () => {
    list.replaceChildren(...arr.map((v, i) => {
      const inp = o.multi ? h('textarea', { rows: 2 }) : h('input', { type: 'text', placeholder: o.ph || '' });
      inp.value = v; inp.addEventListener('input', (e) => { arr[i] = e.target.value; bump(); o.on?.(); });
      return h('div', { style: 'display:flex;gap:.4rem;align-items:flex-start;margin-bottom:.45rem' }, inp,
        h('button.btn.btn-icon.btn-ghost', { type: 'button', 'aria-label': 'Posunout nahoru', disabled: i === 0, onclick: () => { arr.splice(i - 1, 0, arr.splice(i, 1)[0]); bump(); o.on?.(); render(); }, html: IC.up }),
        h('button.btn.btn-icon.btn-ghost', { type: 'button', 'aria-label': 'Smazat', onclick: () => { arr.splice(i, 1); bump(); o.on?.(); render(); }, html: IC.trash }));
    }), h('button.btn.btn-sm', { type: 'button', onclick: () => { arr.push(''); bump(); render(); }, html: IC.plus + (o.add || 'Přidat') }));
  };
  render(); box.append(...[list, o.hint ? h('small', {}, o.hint) : null].filter(Boolean));
  return box;
}
/** zastávky trasy: v datech text „A · B · C“, v administraci seznam */
const card = (title, hint, ...kids) => h('section.card', {}, title ? h('h2', {}, title) : null, hint ? h('p.hint', {}, hint) : null, ...kids);
const row2 = (...kids) => h('div.row2', {}, ...kids);
const view = (title, lead, ...kids) => { const m = $('main.view'); m.replaceChildren(h('div.view-head', {}, h('h1', {}, title), lead ? h('p', {}, lead) : null), ...kids); window.scrollTo(0, 0); };
/* ---------------------------------------------------------------- pohledy */
const NAV = [
  ['', 'Přehled', 'home'], ['-'],
  ['texty', 'Texty webu', 'text', 'texty'], ['sluzby', 'Služby', 'bolt', 'sluzby'],
  ['cenik', 'Ceník', 'tag', 'cenik'], ['kontakty', 'Kontakty', 'phone', 'site'], ['-'],
  ['napoveda', 'Návod', 'help'], ['nastaveni', 'Heslo a odhlášení', 'gear'],
];
const H3 = (t) => h('h3', { style: 'margin:1.2rem 0 .4rem;font-family:var(--serif);font-weight:700;font-size:1.1rem' }, t);

function vDash() {
  const tiles = [['texty', 'Texty', 'text', 'Úvod, o nás, kontakt'], ['sluzby', 'Služby', 'bolt', 'Co zajišťujete'],
    ['cenik', 'Ceník', 'tag', 'Ceny služeb'], ['kontakty', 'Kontakty', 'phone', 'Telefon, e-mail, adresa']]
    .map(([id, label, ic, sub]) => h('a.tile', { href: '#/' + id }, h('span', { html: IC[ic] }), h('b', {}, label), h('small', {}, sub)));
  view('Dobrý den 👋', 'Tady si upravujete svůj web: texty, služby a ceník. Změny uložíte tlačítkem „Uložit změny“ dole, na webu se objeví zhruba za minutu.',
    h('div.tiles', {}, tiles),
    card('Jak to funguje', null, h('div.help', { html: '<ol><li>Vlevo (na mobilu v menu ☰) vyberte, co chcete upravit.</li><li>Přepište text nebo upravte ceník.</li><li>Dole se objeví lišta – klikněte na <b>Uložit změny</b>.</li><li>Nahoře uvidíte, kdy je změna na webu (zhruba za minutu).</li></ol>' })),
    h('a.btn.btn-dark', { href: CFG.site, target: '_blank', rel: 'noopener', style: 'margin-top:.5rem', html: IC.ext + 'Otevřít web' }));
}

/* ---------------------------------------------------------------- texty */
const TEXTY = { uvod: 'Úvod', sluzby: 'Nadpis služeb', pece: 'Na čem si zakládáme', kontakt: 'Kontakt' };
function vTexty(arg) {
  const key = TEXTY[arg] ? arg : 'uvod';
  const T = S.D.texty;
  let obsah;
  if (key === 'uvod') {
    obsah = [card('Úvod (první obrazovka)', null,
      fText(T.hero, 'stitek', 'Řádek nad nadpisem'), fText(T.hero, 'h1', 'Hlavní nadpis'),
      fText(T.hero, 'uvod', 'Text pod nadpisem', { multi: true, rows: 4 }),
      row2(fText(T.hero, 'tlacitko', 'Tlačítko (vede na kontakt)'), fText(T.hero, 'tlacitko2', 'Druhý odkaz (vede na služby)')))];
  } else if (key === 'sluzby') {
    obsah = [card('Nadpis nad službami', 'Samotné služby upravíte v části Služby.', fText(T.sluzby, 'nadpis', 'Nadpis'), fText(T.sluzby, 'text', 'Text pod nadpisem', { multi: true, rows: 3 }))];
  } else if (key === 'pece') {
    obsah = [card('Na čem si zakládáme', 'Čtyři body s ikonami.', fText(T.pece, 'nadpis', 'Nadpis'), fText(T.pece, 'text', 'Text pod nadpisem', { multi: true, rows: 3 }),
      ...T.pece.body.map((b, i) => h('div', {}, H3(`${i + 1}. bod`), fText(b, 'nadpis', 'Nadpis'), fText(b, 'text', 'Text', { multi: true, rows: 2 }))))];
  } else {
    obsah = [card('Kontakt', 'Telefon, e-mail a adresu upravíte v části Kontakty.', fText(T.kontakt, 'nadpis', 'Nadpis'), fText(T.kontakt, 'text', 'Text', { multi: true, rows: 3 }),
      fText(T.kontakt, 'oblast_nadpis', 'Rámeček – nadpis'), fText(T.kontakt, 'oblast_text', 'Rámeček – text', { multi: true, rows: 3 }))];
  }
  view('Texty webu', 'Vyberte část webu a přepište text.',
    h('div', { style: 'display:flex;gap:.4rem;flex-wrap:wrap;margin-bottom:1rem' }, Object.entries(TEXTY).map(([k, t]) => h('a.btn.btn-sm' + (k === key ? '.btn-dark' : '.btn-ghost'), { href: '#/texty/' + k }, t))),
    ...obsah);
}

/* ---------------------------------------------------------------- služby */
function vSluzby() {
  view('Služby', 'Služby se na webu ukazují jako okna domu. Můžete je přidat, přepsat nebo odebrat.',
    card('Seznam služeb', null, fList(S.D.sluzby, { title: (x) => x.nazev, sub: (x) => x.popis, addLabel: 'Přidat službu', empty: 'Zatím žádná služba.',
      make: () => ({ nazev: '', popis: '' }),
      body: (x, box, r) => box.append(fText(x, 'nazev', 'Název služby', { on: r }), fText(x, 'popis', 'Popis', { multi: true, rows: 3, on: r })) })));
}

/* ---------------------------------------------------------------- ceník */
function vCenik() {
  const C = S.D.cenik;
  view('Ceník', 'Cenu pište i s měnou, např. „150 Kč“. Do pole „za co“ patří jednotka, např. „za bytovou jednotku měsíčně“.',
    card('Položky ceníku', null, fList(C.polozky, { title: (p) => p.nazev, sub: (p) => [p.cena, p.jednotka].filter(Boolean).join(' '), addLabel: 'Přidat položku', empty: 'Ceník je zatím prázdný.',
      make: () => ({ nazev: '', cena: '', jednotka: '' }),
      body: (p, box, r) => box.append(fText(p, 'nazev', 'Služba', { on: r }), row2(fText(p, 'cena', 'Cena', { on: r, ph: '150 Kč' }), fText(p, 'jednotka', 'Za co', { on: r, ph: 'za bytovou jednotku měsíčně' }))) })),
    card('Nadpis', null, fText(C, 'nadpis', 'Nadpis sekce')));
}

/* ---------------------------------------------------------------- kontakty */
function vKontakty() {
  const s = S.D.site; s.kontakt = s.kontakt || {}; const k = s.kontakt; k.adresa = k.adresa || {};
  view('Kontakty', 'Údaje v kontaktu, v patičce a pro Google. Kam chodí zprávy z formuláře, nastavujeme my, napište nám.',
    card('Kontakty', null, row2(fText(k, 'telefon', 'Telefon', { type: 'tel' }), fText(k, 'email', 'E-mail', { type: 'email' })),
      fText(k.adresa, 'ulice', 'Adresa (ulice a číslo)'), row2(fText(k.adresa, 'psc', 'PSČ'), fText(k.adresa, 'mesto', 'Obec'))),
    card('Firma', null, row2(fText(s, 'nazev', 'Název firmy'), fText(s, 'ico', 'IČO', { inputmode: 'numeric' }))),
    card('Vyhledávače', null, fText(s, 'popis', 'Popis webu (Google, sdílení na sítích)', { multi: true, rows: 3, hint: 'Ideálně 120–160 znaků.' })));
}

function vNapoveda() {
  view('Návod', null,
    card('Změnit text', null, h('div.help', { html: '<ol><li>Texty úvodu, kontaktu a „Na čem si zakládáme“ jsou v <b>Texty webu</b>, popisy služeb ve <b>Službách</b>.</li><li>Přepište text a dole klikněte na <b>Uložit změny</b>.</li></ol>' })),
    card('Upravit ceník', null, h('div.help', { html: '<ol><li>Otevřete <b>Ceník</b>, klikněte na položku a upravte ji, nebo přidejte novou.</li><li>Uložte. Změna je na webu zhruba za minutu.</li></ol>' })),
    card('Statistiky návštěvnosti (Google Analytics)', null, h('div.help', { html: '<ol><li>Otevřete <a href="https://analytics.google.com" target="_blank" rel="noopener">analytics.google.com</a> a přihlaste se Google účtem, který jsme k webu přiřadili.</li><li>V přehledu uvidíte počet návštěvníků, odkud přišli a které stránky otevřeli.</li><li>Měří se jen návštěvníci, kteří na liště souhlasili s cookies.</li></ol>' })),
    card('Něco nejde?', null, h('p', {}, 'Napište nám na info.webhunter@email.cz, rádi pomůžeme.')));
}

function vSettings() {
  const f = { old: '', pw: '', pw2: '' };
  const msg = h('p', { style: 'color:var(--err);font-size:.9rem;min-height:1.2rem' });
  const pwInput = (key, label, ac) => h('label.field', {}, h('span', {}, label), h('input', { type: 'password', autocomplete: ac, oninput: (e) => { f[key] = e.target.value; } }));
  view('Heslo a odhlášení', null,
    card('Změnit heslo', 'Po změně hesla se odhlásí všechna ostatní zařízení. Heslo musí mít alespoň 8 znaků.',
      pwInput('old', 'Současné heslo', 'current-password'), pwInput('pw', 'Nové heslo', 'new-password'), pwInput('pw2', 'Nové heslo znovu', 'new-password'), msg,
      h('button.btn.btn-primary', { type: 'button', onclick: async (e) => {
        msg.textContent = '';
        if (f.pw.length < 8) return (msg.textContent = 'Nové heslo musí mít alespoň 8 znaků.');
        if (f.pw !== f.pw2) return (msg.textContent = 'Nová hesla se neshodují.');
        e.target.disabled = true;
        try { const r = await api('/password', { method: 'POST', body: JSON.stringify({ old: f.old, password: f.pw }) }); S.sess = r.token; S.def = false; saveSess(); toast('Heslo změněno', 'Příště se přihlaste novým heslem.', 'ok'); route(); }
        catch (er) { msg.textContent = er.message; } finally { e.target.disabled = false; }
      } }, 'Uložit nové heslo')),
    card('Odhlásit se', null, h('button.btn', { type: 'button', onclick: logout, html: IC.logout + 'Odhlásit' })));
}

/* ---------------------------------------------------------------- shell */
function renderShell() {
  const nav = h('nav.nav', { id: 'nav', 'aria-label': 'Sekce administrace' },
    h('button.btn.btn-icon.btn-ghost.nav-close', { type: 'button', 'aria-label': 'Zavřít menu', onclick: () => nav.classList.remove('open'), html: IC.x }),
    NAV.map(([id, label, ic, key]) => id === '-' ? h('hr') : h('a', { href: '#/' + id, 'data-id': id, 'data-key': key || '', onclick: () => nav.classList.remove('open'), html: IC[ic] + `<span>${esc(label)}</span>` })),
    h('hr'), h('a', { href: CFG.site, target: '_blank', rel: 'noopener', html: IC.ext + '<span>Zobrazit web</span>' }));
  const bar = h('div.savebar', { id: 'savebar' }, h('span', {}, ''),
    h('button.btn.btn-ghost.btn-sm', { type: 'button', onclick: async () => { if (await confirmDlg('Zahodit změny?', 'Neuložené úpravy se ztratí.', 'Zahodit')) discard(); } }, 'Zahodit'),
    h('button.btn.btn-primary', { type: 'button', onclick: saveAll }, 'Uložit změny'));
  $('#app').replaceChildren(h('div.shell', {},
    h('header.top', {},
      h('button.btn.btn-icon.btn-ghost.menu-btn', { type: 'button', 'aria-label': 'Menu', onclick: () => nav.classList.add('open'), html: IC.menu }),
      h('a.top-logo.brand', { href: '#/', html: LOGO + '<span>Administrace</span>' }),
      h('div.pub'), h('a.btn.btn-sm', { href: CFG.site, target: '_blank', rel: 'noopener', html: IC.eye + '<span>Web</span>' })),
    h('div.layout', {}, nav, h('main.view'))), bar);
  initPub();
}
function updateSavebar() {
  const keys = dirtyKeys(); const bar = $('#savebar'); if (!bar) return;
  bar.classList.toggle('on', keys.length > 0 || S.saving);
  bar.querySelector('span').textContent = S.saving ? 'Ukládám…' : `Neuložené změny: ${keys.map((k) => LABEL[k]).join(', ')}`;
  bar.querySelectorAll('button').forEach((b) => { b.disabled = S.saving; });
  document.querySelectorAll('.nav a[data-key]').forEach((a) => { a.querySelector('.dot')?.remove(); if (keys.includes(a.dataset.key)) a.append(h('i.dot')); });
}
const VIEWS = { '': vDash, texty: vTexty, sluzby: vSluzby, cenik: vCenik, kontakty: vKontakty, napoveda: vNapoveda, nastaveni: vSettings };
function route() {
  const [id, arg] = location.hash.replace(/^#\/?/, '').split('/');
  (VIEWS[id] || vDash)(arg);
  document.querySelectorAll('.nav a[data-id]').forEach((a) => a.classList.toggle('on', a.dataset.id === (VIEWS[id] ? id : '')));
  updateSavebar();
}
window.addEventListener('hashchange', route);

/* ---------------------------------------------------------------- přihlášení */
function renderLogin(msg = '') {
  const inp = h('input', { type: 'password', id: 'pw', autocomplete: 'current-password', placeholder: 'Heslo', required: true });
  const err = h('p.login-err', {}, msg);
  const btn = h('button.btn.btn-primary', { type: 'submit' }, 'Přihlásit se');
  const form = h('form.login-card', { onsubmit: async (e) => {
    e.preventDefault(); err.textContent = ''; btn.disabled = true; btn.textContent = 'Přihlašuji…';
    try {
      const r = await api('/login', { method: 'POST', body: JSON.stringify({ password: inp.value }) });
      S.sess = r.token; S.def = r.def; saveSess(); await start();
    } catch (er) { err.textContent = er.message; btn.disabled = false; btn.textContent = 'Přihlásit se'; inp.select(); }
  } },
  h('div.brand', { html: LOGO }), h('h1', {}, 'Administrace webu'), h('p', {}, 'Přihlaste se heslem k administraci.'),
  h('label.field', {}, h('span', {}, 'Heslo'), h('div.pw-wrap', {}, inp, h('button.pw-eye', { type: 'button', 'aria-label': 'Zobrazit heslo', onclick: () => { inp.type = inp.type === 'password' ? 'text' : 'password'; }, html: IC.eye }))),
  btn, err);
  $('#app').replaceChildren(h('div.login', {}, form));
  setTimeout(() => inp.focus(), 50);
}
function logout() {
  if (dirtyKeys().length && !confirm('Máte neuložené změny. Opravdu se odhlásit?')) return;
  localStorage.removeItem(SK); S.sess = null; S.D = {}; renderLogin();
}
async function start() {
  $('#app').innerHTML = `<div class="boot"><div class="brand">${LOGO}</div><span class="spin"></span></div>`;
  try { await loadAll(); } catch (e) {
    if (e.status === 401) { localStorage.removeItem(SK); S.sess = null; return renderLogin('Přihlášení vypršelo, přihlaste se prosím znovu.'); }
    return renderLogin('Obsah webu se nepodařilo načíst: ' + e.message);
  }
  renderShell(); route();
}
function boot() {
  const s = JSON.parse(localStorage.getItem(SK) || 'null');
  if (s && s.exp > Date.now()) { S.sess = s.t; S.def = s.def; start(); } else renderLogin();
}
boot();
})();
