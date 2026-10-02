'use strict';
/* HIT Connect - front-end demo. "Database" = browser localStorage. */
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const KEY = 'hitconnect.v1', PAGES = ['feed', 'market', 'skills', 'connect', 'rate', 'messages', 'profile'], STUDENT = /^h(\d{2})\d{4}[a-z]@hit\.ac\.zw$/;
let db; try { db = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
db = Object.assign({ users: [], posts: [], skills: [], items: [], ratings: [], love: [], msgs: [], follow: {}, me: null }, db || {});
const F = { market: 'All', skills: 'All', connect: 'All' };
let chatWith = null;

const themeKey = 'hitconnect.theme';
const applyTheme = () => {
  const isDark = localStorage.getItem(themeKey) === 'dark';
  document.body.classList.toggle('dark-mode', isDark);
  const toggles = document.querySelectorAll('.theme-toggle');
  toggles.forEach(btn => {
    const isDarkMode = document.body.classList.contains('dark-mode');
    btn.textContent = isDarkMode ? '☀️' : '🌙';
    btn.setAttribute('aria-label', isDarkMode ? 'Switch to light mode' : 'Switch to dark mode');
    btn.setAttribute('aria-pressed', String(isDarkMode));
  });
};

const toggleTheme = () => {
  const isDark = !document.body.classList.contains('dark-mode');
  localStorage.setItem(themeKey, isDark ? 'dark' : 'light');
  applyTheme();
};

applyTheme();

const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { toast('Storage full. Delete old posts or use smaller pictures.'); } };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const when = t => new Date(t).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
const me = () => db.users.find(u => u.email === db.me);
const nameOf = e => (db.users.find(u => u.email === e) || { name: e }).name;
const handle = e => e.split('@')[0];
const av = e => `<span class="av c${[...e].reduce((a, c) => a + c.charCodeAt(0), 0) % 6}">${esc(nameOf(e)[0] || '?')}</span>`;
const img = (s, c = '') => s ? `<img class="pic ${c}" src="${s}" alt="">` : '';
const stars = n => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));
const Q = () => $('#gq').value.toLowerCase();
const empty = t => `<p class="empty">${t}</p>`;
const own = (it, col, extra = '') => it.by === db.me ? `${extra}<button class="ghost" data-act="del" data-col="${col}" data-id="${it.id}">Delete</button>` : '';
const chatBtn = (to, label = 'Message') => to !== db.me ? `<button class="ghost" data-act="chat" data-to="${esc(to)}">${label}</button>` : '';
const sha = async s => crypto.subtle ? [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('') : s;
const pills = (id, page, list) => $(id).innerHTML = ['All', ...list].map(v => `<button class="${F[page] === v ? 'on' : ''}" data-pill="${page}|${v}">${v}</button>`).join('');

function toast(m) { const t = $('#toast'); t.textContent = m; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 3500); }

const readImg = f => new Promise((ok, no) => {
  const r = new FileReader();
  r.onload = () => { const i = new Image(); i.onload = () => {
    const k = Math.min(1, 640 / Math.max(i.width, i.height)), c = document.createElement('canvas');
    c.width = i.width * k; c.height = i.height * k; c.getContext('2d').drawImage(i, 0, 0, c.width, c.height);
    ok(c.toDataURL('image/jpeg', .7)); }; i.onerror = () => no(Error('That file is not a valid picture.')); i.src = r.result; };
  r.readAsDataURL(f);
});
const pic = async (fd, required) => {
  const f = fd.get('img');
  if (f && f.size) return readImg(f);
  if (required) throw Error('Please upload a picture first.');
  return '';
};

/* ---------- Views ---------- */
const postCard = p => `<article class="card"><div class="meta">${av(p.by)}<div><b>${esc(nameOf(p.by))}</b> <small>@${esc(handle(p.by))}</small></div><time>${when(p.t)}</time></div>
  <p>${esc(p.text).replace(/#(\w+)/g, '<b style="color:var(--blue)">#$1</b>')}</p>${img(p.img)}
  <div class="acts"><button class="ghost" data-act="like" data-col="posts" data-id="${p.id}">${p.likes.includes(db.me) ? '♥' : '♡'} ${p.likes.length}</button>${own(p, 'posts')}</div></article>`;
const CATS = { Tutoring: ['#2563eb', '📐'], Coding: ['#7c3aed', '&lt;/&gt;'], Design: ['#db2777', '🎨'], Media: ['#d97706', '🎬'], Other: ['#059669', '⭐'] };

const views = {
  feed() {
    $('#feedList').innerHTML = [...db.posts].reverse().filter(p => (p.text + nameOf(p.by)).toLowerCase().includes(Q())).map(postCard).join('') || empty('No posts yet. Share the first one.');
    const fol = db.follow[db.me] || [];
    $('#follow').innerHTML = db.users.filter(u => u.email !== db.me).slice(0, 5).map(u => `<div class="frow">${av(u.email)}<div><b>${esc(u.name)}</b><small>@${esc(handle(u.email))}</small></div>
      <button class="ghost pb" data-act="follow" data-to="${esc(u.email)}">${fol.includes(u.email) ? 'Following' : 'Follow'}</button></div>`).join('') || empty('Invite classmates to join.');
    const tags = {}; db.posts.forEach(p => (p.text.match(/#\w+/g) || []).forEach(t => tags[t] = (tags[t] || 0) + 1));
    $('#trend').innerHTML = Object.entries(tags).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([t, n]) => `<p><b>${esc(t)}</b><br><small class="hint">${n} post${n > 1 ? 's' : ''}</small></p>`).join('') || empty('Use #hashtags in posts.');
  },
  market() {
    pills('#pillsMarket', 'market', ['Electronics', 'Books', 'Home', 'Furniture', 'Other']);
    $('#marketList').innerHTML = [...db.items].reverse().filter(i => (F.market === 'All' || (i.cat || 'Other') === F.market) && (i.title + i.text + nameOf(i.by)).toLowerCase().includes(Q())).map(i => `<article class="card ${i.sold ? 'sold' : ''}">
      <img class="pic thumb" src="${i.img || 'images/' + (i.cat || 'Other').toLowerCase() + '.jpg'}" onerror="this.onerror=null;this.src='images/${(i.cat || 'Other').toLowerCase()}.svg'" alt="">
      <b>${esc(i.title)}</b> ${i.sold ? '<span class="tag">Sold</span>' : ''}<div class="price">$${esc(Number(i.price).toFixed(2))}</div>
      <small class="hint">${esc(i.cat || 'Other')}</small><div class="meta">${av(i.by)}<small>${esc(nameOf(i.by))}</small></div>
      <div class="acts">${chatBtn(i.by)}${own(i, 'items', i.by === db.me ? `<button class="ghost" data-act="sold" data-col="items" data-id="${i.id}">${i.sold ? 'Relist' : 'Mark sold'}</button>` : '')}</div></article>`).join('') || empty('Nothing for sale yet. Add the first product.');
  },
  skills() {
    pills('#pillsSkills', 'skills', Object.keys(CATS));
    $('#skillList').innerHTML = [...db.skills].reverse().filter(s => (F.skills === 'All' || s.cat === F.skills) && (s.title + s.text + nameOf(s.by)).toLowerCase().includes(Q())).map(s => { const c = CATS[s.cat] || CATS.Other; return `<article class="card">
      <div class="icon" style="background:${c[0]}">${c[1]}</div><b>${esc(s.title)}</b><p class="hint">${esc(s.text)}</p>
      <div class="meta">${av(s.by)}<small>${esc(nameOf(s.by))}</small>${s.rate ? `<b class="price pb" style="font-size:1rem">${esc(s.rate)}</b>` : ''}</div>
      <div class="acts">${chatBtn(s.by, 'Contact')}${own(s, 'skills')}</div></article>`; }).join('') || empty('No skills found. Share yours.');
  },
  connect() {
    pills('#pillsConnect', 'connect', ['Love', 'Friends', 'Study partner']);
    $('#loveList').innerHTML = [...db.love].reverse().filter(p => (F.connect === 'All' || (p.kind || 'Love') === F.connect) && (p.text + nameOf(p.by)).toLowerCase().includes(Q())).map(p => `<article class="card center">
      <img class="round" src="${p.img}" alt=""><b>${esc(nameOf(p.by))}</b><div class="hint">${esc(p.gender)}, ${esc(p.age)}${(db.users.find(u => u.email === p.by) || {}).year ? ' · Intake ' + db.users.find(u => u.email === p.by).year : ''}</div>
      <span class="tag">${esc(p.kind || 'Love')}</span><p class="hint">${esc(p.text)}</p>
      <div class="acts" style="justify-content:center">${p.by !== db.me ? `<button class="btn" data-act="chat" data-to="${esc(p.by)}">Connect</button>` : ''}${own(p, 'love')}</div></article>`).join('') || empty('No profiles yet. Create yours.');
  },
  rate() {
    const sel = $('#rateWho'), keep = sel.value;
    sel.innerHTML = db.users.filter(u => u.email !== db.me).map(u => `<option value="${esc(u.email)}">${esc(u.name)}</option>`).join('') || '<option value="">No other members yet</option>';
    if (keep) sel.value = keep;
    const avg = {}; db.ratings.forEach(r => (avg[r.to] = avg[r.to] || []).push(r.stars));
    $('#rateSummary').innerHTML = Object.entries(avg).map(([e, a]) => `<span><b>${esc(nameOf(e))}</b> <span class="stars">${stars(a.reduce((x, y) => x + y) / a.length)}</span> (${a.length})</span>`).join('');
    $('#rateList').innerHTML = [...db.ratings].reverse().map(r => `<article class="card"><div class="meta">${av(r.by)}<b>${esc(nameOf(r.by))}</b> rated <b>${esc(nameOf(r.to))}</b><time>${when(r.t)}</time></div>
      <div class="stars">${stars(r.stars)}</div><p>${esc(r.text)}</p>${img(r.img)}<div class="acts">${own(r, 'ratings')}</div></article>`).join('') || empty('No ratings yet.');
  },
  messages() {
    const mine = db.msgs.filter(m => m.by === db.me || m.to === db.me), partners = [...new Set(mine.map(m => m.by === db.me ? m.to : m.by))];
    if (chatWith && !partners.includes(chatWith)) partners.unshift(chatWith);
    $('#convos').innerHTML = partners.map(e => `<button class="convo ${e === chatWith ? 'on' : ''}" data-act="open" data-to="${esc(e)}">${av(e)}<b>${esc(nameOf(e).split(' ')[0])}</b></button>`).join('') || empty('Start a chat from Marketplace, Skills or Campus Connect.');
    $('#msgForm').hidden = !chatWith;
    const activeLabel = chatWith ? `${esc(nameOf(chatWith))} · Open conversation` : 'Open conversation';
    $('#threadHeader').textContent = activeLabel;
    $('#thread').innerHTML = chatWith ? (mine.filter(m => m.by === chatWith || m.to === chatWith).map(m => `<div class="bub ${m.by === db.me ? 'me' : ''}">${esc(m.text)}</div>`).join('') || empty('Say hello to ' + esc(nameOf(chatWith)) + '.')) : empty('Pick a conversation.');
    $('#thread').scrollTop = 1e6;
  },
  profile() {
    const u = me(), mine = db.posts.filter(p => p.by === db.me), followers = Object.values(db.follow).filter(a => a.includes(db.me)).length;
    $('#profHead').innerHTML = `<div class="cover"></div><div class="pinfo">${av(u.email)}<h2>${esc(u.name)}</h2><p class="hint">@${esc(handle(u.email))}${u.year ? ' · Intake ' + u.year : ''}</p>
      <div class="pstats"><div><b>${mine.length}</b>Posts</div><div><b>${followers}</b>Followers</div><div><b>${(db.follow[db.me] || []).length}</b>Following</div></div></div>`;
    $('#profPosts').innerHTML = [...mine].reverse().map(postCard).join('') || empty('You have not posted yet.');
  }
};

function render() {
  const u = me(); if (!u) db.me = null;
  $('#landing').hidden = !!u; $('#app').hidden = !u;
  if (!u) {
    $('#stats').innerHTML = [['Members', db.users.length], ['Products listed', db.items.length], ['Skills shared', db.skills.length], ['Messages sent', db.msgs.length]].map(([l, n]) => `<div><b>${n}</b><span>${l}</span></div>`).join('');
    return;
  }
  const h = location.hash.slice(1), pg = PAGES.includes(h) ? h : 'feed';
  $$('#app main>section').forEach(s => s.hidden = s.id !== pg);
  $('#rail').hidden = pg !== 'feed';
  $$('#nav a').forEach(a => a.classList.toggle('on', a.hash === '#' + pg));
  $('#who').innerHTML = `${av(u.email)}<span>${esc(u.name)}${u.year ? ' · ' + u.year : ''}</span>`;
  views[pg]();
}

/* ---------- Forms ---------- */
const form = (sel, fn) => $(sel).addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target;
  try { await fn(new FormData(f)); f.reset(); f.closest('details')?.removeAttribute('open'); save(); render(); }
  catch (x) { toast(x.message || 'Something went wrong.'); }
});
const base = () => ({ id: uid(), by: db.me, t: Date.now() });

form('#reg', async fd => {
  const email = fd.get('email').trim().toLowerCase(), name = fd.get('name').trim(), m = email.match(STUDENT);
  if (!m) throw Error('Use your student email: h + 6 digits + 1 letter, e.g. h261198w@hit.ac.zw');
  if (+m[1] > new Date().getFullYear() % 100) throw Error('The first 2 digits are your enrolment year. That year has not happened yet.');
  if (db.users.some(u => u.email === email)) throw Error('That email is already registered. Log in instead.');
  db.users.push({ email, name, year: 2000 + +m[1], pw: await sha(fd.get('pw')) }); db.me = email; location.hash = '#feed';
});
form('#login', async fd => {
  const email = fd.get('email').trim().toLowerCase(), pw = await sha(fd.get('pw'));
  if (!db.users.some(u => u.email === email && u.pw === pw)) throw Error('Wrong email or password.');
  db.me = email; location.hash = '#feed';
});
form('#postForm', async fd => db.posts.push({ ...base(), text: fd.get('text').trim(), img: await pic(fd), likes: [] }));
form('#skillForm', async fd => db.skills.push({ ...base(), title: fd.get('title').trim(), cat: fd.get('cat'), rate: fd.get('rate').trim(), text: fd.get('text').trim() }));
form('#itemForm', async fd => db.items.push({ ...base(), title: fd.get('title').trim(), price: fd.get('price'), cat: fd.get('cat'), text: fd.get('text').trim(), img: await pic(fd), sold: false }));
form('#rateForm', async fd => {
  if (!fd.get('to')) throw Error('Pick someone to rate.');
  db.ratings.push({ ...base(), to: fd.get('to'), stars: +fd.get('stars'), text: fd.get('text').trim(), img: await pic(fd, true) });
});
form('#loveForm', async fd => {
  if (+fd.get('age') < 18) throw Error('You must be 18 or older.');
  const image = await pic(fd, true);
  db.love = db.love.filter(p => p.by !== db.me);
  db.love.push({ ...base(), age: fd.get('age'), gender: fd.get('gender'), kind: fd.get('kind'), text: fd.get('text').trim(), img: image });
});
form('#msgForm', async fd => db.msgs.push({ ...base(), to: chatWith, text: fd.get('text').trim() }));

/* ---------- Events ---------- */
document.addEventListener('click', e => {
  const themeToggle = e.target.closest('.theme-toggle');
  if (themeToggle) {
    toggleTheme();
    return;
  }

  const tab = e.target.closest('[data-tab]');
  if (tab) {
    $$('.tabs [data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === tab.dataset.tab));
    $('#login').hidden = tab.dataset.tab !== 'login'; $('#reg').hidden = tab.dataset.tab !== 'reg';
    return $('.authbox').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  const pl = e.target.closest('[data-pill]');
  if (pl) { const [p, v] = pl.dataset.pill.split('|'); F[p] = v; return render(); }
  const b = e.target.closest('[data-act]'); if (!b) return;
  const { act, col, id, to } = b.dataset;
  if (act === 'out') { db.me = null; save(); location.hash = ''; return render(); }
  if (act === 'follow') { const s = new Set(db.follow[db.me] || []); s.has(to) ? s.delete(to) : s.add(to); db.follow[db.me] = [...s]; save(); return render(); }
  if (act === 'chat' || act === 'open') { chatWith = to; if (location.hash === '#messages') return render(); location.hash = '#messages'; return; }
  const it = db[col].find(x => x.id === id); if (!it) return;
  if (act === 'like') { const s = new Set(it.likes); s.has(db.me) ? s.delete(db.me) : s.add(db.me); it.likes = [...s]; }
  else if (it.by !== db.me) return;
  else if (act === 'del') { if (!confirm('Delete this?')) return; db[col] = db[col].filter(x => x.id !== id); }
  else if (act === 'sold') it.sold = !it.sold;
  save(); render();
});
$('#gq').addEventListener('input', render);
addEventListener('hashchange', render);

/* ---------- 3D card tilt ---------- */
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    const c = e.target.closest('.grid .card, #feedList .card, .tile');
    $$('.tilting').forEach(x => { if (x !== c) { x.style.transform = ''; x.classList.remove('tilting'); } });
    if (!c) return;
    const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    c.classList.add('tilting');
    c.style.transform = `perspective(700px) rotateY(${x * 12}deg) rotateX(${-y * 12}deg) translateZ(8px)`;
  });
}
render();
