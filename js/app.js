/* MathBook — сторінки учня: вхід, головна, тренажери, рейтинг, результати */

/* ---------- стан ---------- */
let data = null;          // усе з таблиці: клас, учні, тренажери, уроки, рейтинг
let me = null;            // { name, pin, xp, done }
let tab = 'home';
let game = null;          // поточний тренажер або урок
let loginMode = 'student'; // 'student' або 'teacher' — яку форму входу показати
let teacher = null;       // кабінет вчителя: { password, d, tab, open, showPins, confirm, builder, msg }

/* ---------- режим гостя: бали лише в цьому браузері, у рейтинг не йдуть ---------- */
function loadGuest() { try { return JSON.parse(localStorage.getItem('mb-guest') || 'null') || { xp: 0, done: [] }; } catch (e) { return { xp: 0, done: [] }; } }
function saveGuest() { try { localStorage.setItem('mb-guest', JSON.stringify({ xp: me.xp, done: me.done })); } catch (e) {} }
function enterGuest() {
  me = { guest: true, name: 'Гість', ...loadGuest() };
  try { localStorage.setItem('mb-me', JSON.stringify({ guest: true })); } catch (e) {}
  render();
}

/* ---------- рівні ---------- */
function levelOf(xp) {
  let i = 0; while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1][0]) i++;
  const next = LEVELS[i + 1];
  return { n: i + 1, name: LEVELS[i][1], next, pct: next ? (xp - LEVELS[i][0]) / (next[0] - LEVELS[i][0]) : 1 };
}

/* ---------- екрани ---------- */
function render() {
  $('#cls').textContent = data ? data.className : '';
  $('#banner').innerHTML = API_URL ? '' : '<div class="banner"><b>Демо-режим.</b> Вставте адресу Apps Script у <code>API_URL</code>, щоб підключити Google Таблицю. Учень: Оля К., PIN 1234. Вчитель: пароль «вчитель».</div>';
  $('#who').innerHTML = teacher ? `<span class="guest-tag">Вчитель</span><button class="btn ghost sm" onclick="teacherLogout()">Вийти</button>` : !me ? '' : me.guest
    ? `<span class="guest-tag">Гість</span><button class="btn ghost sm" onclick="logout()">Увійти з PIN</button>`
    : `<span class="muted">${esc(me.name)}</span><button class="btn ghost sm" onclick="logout()">Вийти</button>`;
  const m = $('#main');
  if (!data) { m.innerHTML = ''; return; }
  if (teacher) { m.innerHTML = teacherView(); bindTeacher(); return; }
  if (!me) { m.innerHTML = loginMode === 'teacher' ? teacherLoginView() : loginView(); return; }
  if (game) { m.innerHTML = game.done ? resultView() : gameView(); bindGame(); return; }
  const tabs = [['home', 'Головна'], ['trainers', 'Тренажери'], ['lessons', 'Уроки'], ['rating', 'Рейтинг']];
  m.innerHTML = `<div class="stack"><nav class="tabs">${tabs.map(([k, l]) => `<button class="tab ${tab === k ? 'on' : ''}" onclick="setTab('${k}')">${l}</button>`).join('')}</nav>
    ${{ home: homeView, trainers: trainersView, lessons: lessonsView, rating: ratingView }[tab]()}</div>`;
}
function setTab(t) { tab = t; render(); }

function loginView() {
  return `<div class="card stack" style="max-width:420px;margin:30px auto">
    <h1>Привіт!</h1><p class="muted">Обери своє ім’я і введи PIN, який дав учитель.</p>
    <select class="inp" id="name"><option value="">— Твоє ім’я —</option>${data.students.map(s => `<option>${esc(s)}</option>`).join('')}</select>
    <input class="inp" id="pin" type="password" inputmode="numeric" placeholder="PIN" autocomplete="off">
    <div class="err" id="err"></div>
    <button class="btn" onclick="login()">Увійти</button>
    ${data.guestMode ? `<div class="or"><span>або</span></div>
    <button class="btn ghost" onclick="enterGuest()">Спробувати як гість</button>
    <p class="muted" style="margin:0;font-size:.85rem">Гість може проходити тренажери й уроки, але його бали не потрапляють у рейтинг класу.</p>` : ''}
    <button class="linkbtn" onclick="loginMode='teacher';render()">Я вчитель →</button></div>`;
}
async function login() {
  const name = $('#name').value, pin = $('#pin').value.trim();
  if (!name || !pin) { $('#err').textContent = 'Обери ім’я і введи PIN.'; return; }
  const r = await withLoader('Шукаю твою книжку…', () => api('login', { name, pin }));
  if (!r.ok) { $('#err').textContent = r.error; return; }
  me = { name, pin, xp: r.xp, done: r.done };
  localStorage.setItem('mb-me', JSON.stringify({ name, pin }));
  render();
}
function logout() { me = null; game = null; localStorage.removeItem('mb-me'); render(); }

function guestNote() {
  return `<div class="guest-note"><p><b>Режим гостя.</b> Бали зберігаються лише на цьому пристрої й не йдуть у рейтинг. Щоб змагатися з класом, попроси в учителя свій PIN.</p><button class="btn sm" onclick="logout()">Увійти з PIN</button></div>`;
}
function homeView() {
  const L = levelOf(me.xp), place = me.guest ? 0 : data.rating.findIndex(r => r.name === me.name) + 1;
  return `${me.guest ? guestNote() : ''}<div class="card"><div class="level"><div class="n">${L.n}</div><div><h2>${L.name}</h2><div class="muted">${me.xp} XP${place ? ` · ${place}-е місце в класі` : ''}</div></div></div>
      <div class="bar"><i style="width:${Math.round(L.pct * 100)}%"></i></div>
      <p class="muted" style="margin:8px 0 0">${L.next ? `Ще ${L.next[0] - me.xp} XP до рівня «${L.next[1]}»` : 'Найвищий рівень!'}</p></div>
    <div class="list">
      <div class="item"><div class="grow"><b>Тренажери</b><small>За кожну правильну відповідь — ${data.xpPerAnswer} XP</small></div><button class="btn sm" onclick="setTab('trainers')">Тренуватися</button></div>
      <div class="item"><div class="grow"><b>Уроки</b><small>Пояснення з питаннями крок за кроком</small></div><button class="btn sm" onclick="setTab('lessons')">Вчитися</button></div>
      <div class="item lab-item"><div class="grow"><b>AR/VR-лабораторія: циліндр</b><small>3D-сцени: елементи, розгортка, перерізи, вписані тіла — у браузері, VR-окулярах або через камеру телефона</small></div><a class="btn sm" href="ar-lab/index.html">Відкрити</a></div>
    </div>`;
}
function trainersView() {
  const fromTeacher = data.trainers.map((t, i) => `<div class="item"><div class="grow"><b>${esc(t.name)}</b><small>${t.questions.length} питань від учителя</small></div>
    ${me.done.includes(t.name) ? '<span class="tag">Пройдено</span>' : ''}<button class="btn sm" onclick="startTrainer(${i})">Почати</button></div>`).join('');
  const gens = Object.keys(GENERATORS).map(g => `<div class="item"><div class="grow"><b>${g}</b><small>10 нових прикладів щоразу</small></div><button class="btn sm ghost" onclick="startGen('${g}')">Почати</button></div>`).join('');
  const fracItem = ([name, T]) => `<div class="item"><div class="grow"><b>${name}</b><small>${T.desc || T.hint}</small></div>
    ${me.done.includes(name) ? '<span class="tag">Пройдено</span>' : ''}<button class="btn sm" onclick="startFrac('${name}')">Почати</button></div>`;
  const all = Object.entries(FRACTION_TRAINERS);
  const teacherBuilt = all.filter(([, T]) => T.teacher).map(fracItem).join(''); // тренажери вчителя, вбудовані в сайт
  const fracs = all.filter(([, T]) => !T.teacher).map(fracItem).join('');
  return `<h2>Від учителя</h2><div class="list">${teacherBuilt + fromTeacher || '<p class="muted">Учитель ще не додав тренажерів.</p>'}</div>
    <h2>Дроби</h2><div class="list">${fracs}</div>
    <h2>Генератори прикладів</h2><div class="list">${gens}</div>`;
}
function lessonsView() {
  const count = (l, f) => l.sections.reduce((n, s) => n + s.slides.filter(f).length, 0);
  // чернетки бачить лише вчитель: за посиланням з #draft або в демо-режимі
  const showDrafts = !API_URL || location.hash === '#draft';
  const slides = SLIDE_LESSONS.filter(l => !l.draft || showDrafts).map(l => `<div class="item lesson-item"><span class="lg">${l.icon ? esc(l.icon) : F(1, 2)}</span><div class="grow"><b>${esc(l.title)}</b>${l.draft ? ' <span class="tag wait">Чернетка: учні не бачать</span>' : ''}<small>${esc(l.grade || '')} · ${isVideoLesson(l) ? `відеоурок: ${count(l, sl => sl.type === 'video')} відео` : 'теорія, приклади'}, ${count(l, isTask)} завдань</small></div>
    ${me.done.includes('Урок: ' + l.title) ? '<span class="tag">Пройдено</span>' : ''}<button class="btn sm" onclick="startSlides('${l.id}')">Відкрити</button></div>`).join('');
  return `${slides ? `<h2>Інтерактивні уроки</h2><div class="list">${slides}</div>` : ''}<h2>Уроки від учителя</h2><div class="list">${data.lessons.map((l, i) => `<div class="item"><div class="grow"><b>${esc(l.name)}</b><small>${l.steps.length} кроків</small></div>
    ${me.done.includes('Урок: ' + l.name) ? '<span class="tag">Пройдено</span>' : ''}<button class="btn sm" onclick="startLesson(${i})">Відкрити</button></div>`).join('') || '<p class="muted">Учитель ще не додав уроків у таблицю.</p>'}</div>`;
}
function ratingView() {
  return `${me.guest ? guestNote() : ''}<div class="top" style="margin:0"><h2>Рейтинг класу</h2><div class="right"><button class="btn ghost sm" onclick="refresh()">Оновити</button></div></div>
    <div class="list">${data.rating.map((r, i) => `<div class="rank ${r.name === me.name ? 'me' : ''} ${i === 0 && r.xp > 0 ? 'top1' : ''}"><b class="r">${i + 1}</b><span>${esc(r.name)}${r.name === me.name ? ' (ти)' : ''} <small class="muted">· ${levelOf(r.xp).name}</small></span><b>${r.xp} XP</b></div>`).join('')}</div>`;
}
async function refresh() { data = await withLoader('Оновлюю рейтинг…', () => api('init')); render(); }

/* ---------- тренажер і урок ---------- */
function startTrainer(i) {
  const t = data.trainers[i];
  game = { title: t.name, items: shuffle(t.questions.map(q => ({ ...q, choices: q.wrong.length ? shuffle([firstAnswer(q.a), ...q.wrong]) : null }))), i: 0, results: [] };
  render();
}
function startGen(name) {
  game = { title: name, items: Array.from({ length: 10 }, GENERATORS[name]), i: 0, results: [] };
  render();
}
function startFrac(name) {
  game = { title: name, frac: FRACTION_TRAINERS[name], items: Array.from({ length: 10 }, () => FRACTION_TRAINERS[name].make()), i: 0, results: [] };
  render();
}
function startLesson(i) {
  const l = data.lessons[i];
  game = { title: 'Урок: ' + l.name, lesson: true, items: l.steps.map(s => ({ text: s.text, q: s.q, a: s.a })), i: 0, results: [] };
  render();
}
function gameView() {
  if (game.slides) return slidesView();
  const it = game.items[game.i];
  return `<div class="stack"><div class="top" style="margin:0"><button class="btn ghost sm" onclick="quit()">← Назад</button><b>${esc(game.title)}</b></div>
    <div class="dots">${game.items.map((_, k) => `<i class="${game.results[k] === true ? 'ok' : game.results[k] === false ? 'no' : ''}"></i>`).join('')}</div>
    <div class="qcard"><div class="qnum">${game.lesson ? 'Крок' : 'Питання'} ${game.i + 1} з ${game.items.length}</div>
      ${game.frac ? `<p class="muted" style="margin:0">${typeof game.frac.hint === 'function' ? game.frac.hint(it) : game.frac.hint}</p><div class="eqn">${game.frac.view(it)}</div>
        <div class="fb" id="fb"></div>
        <div class="formrow" style="justify-content:center"><button class="btn" id="fcheck">Перевірити</button><button class="btn ghost" id="fshow" hidden>Показати розв’язок</button></div>`
      : `${it.text ? `<div class="text">${esc(it.text)}</div>` : ''}
      <div class="q">${esc(it.q)}</div>
      ${it.choices ? `<div class="choices">${it.choices.map(c => `<button class="choice">${esc(c)}</button>`).join('')}</div>`
        : `<form class="af" id="af"><input class="inp" id="ans" autocomplete="off" placeholder="Відповідь"><button class="btn">OK</button></form>`}
      <div class="fb" id="fb"></div>`}
      <div><button class="btn" id="next" hidden onclick="next()">${game.i + 1 < game.items.length ? 'Далі →' : 'Завершити'}</button></div></div></div>`;
}
function bindGame() {
  if (game.done) return;
  if (game.slides) return bindSlides();
  if (game.frac) return bindFrac();
  const it = game.items[game.i];
  const af = $('#af');
  if (af) { $('#ans').focus(); af.onsubmit = e => { e.preventDefault(); const v = $('#ans').value; if (v.trim()) answer(v); }; }
  document.querySelectorAll('.choice').forEach(b => b.onclick = () => answer(b.textContent, b));
}
function answer(value, btn) {
  if (game.results[game.i] !== undefined && !game.lesson) return;
  const it = game.items[game.i], ok = isRight(value, it.a), fb = $('#fb');
  if (game.lesson && !ok) { // в уроці можна пробувати ще, поки не вийде
    fb.textContent = 'Ще не так. Перечитай пояснення і спробуй ще раз.'; fb.className = 'fb no';
    if (btn) btn.classList.add('no'); else $('#ans').classList.add('no');
    if (game.results[game.i] === undefined) game.results[game.i] = false;
    return;
  }
  if (game.results[game.i] === undefined) game.results[game.i] = ok;
  fb.textContent = ok ? 'Правильно!' : `Ні. Правильна відповідь: ${firstAnswer(it.a)}`; fb.className = 'fb ' + (ok ? 'ok' : 'no');
  if (btn) { btn.classList.add(ok ? 'ok' : 'no'); document.querySelectorAll('.choice').forEach(b => b.disabled = true); }
  else { $('#ans').className = 'inp ' + (ok ? 'ok' : 'no'); $('#ans').disabled = true; }
  $('#next').hidden = false; $('#next').focus();
}
function bindFrac() {
  const inputs = [...document.querySelectorAll('.eqn input')];
  inputs[0].focus();
  inputs.forEach((el, k) => el.addEventListener('keydown', e => { // Enter — до наступного поля, на останньому — перевірка
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (k < inputs.length - 1) inputs[k + 1].focus(); else fracCheck();
  }));
  $('#fcheck').onclick = fracCheck;
  $('#fshow').onclick = () => fracFinish(false, 'Розв’язок: ' + game.frac.solution(game.items[game.i]));
}
function setDot(ok) { const d = document.querySelectorAll('.dots i')[game.i]; if (d) d.className = ok ? 'ok' : 'no'; }
function fracCheck() {
  const inputs = [...document.querySelectorAll('.eqn input')], fb = $('#fb');
  const v = inputs.map(el => parseInt(el.value.replace(/[^\d-]/g, ''), 10));
  inputs.forEach(el => el.classList.remove('no'));
  if (v.some(isNaN)) { fb.textContent = 'Заповни всі поля.'; fb.className = 'fb warn'; return; }
  const r = game.frac.check(game.items[game.i], v);
  if (r.ok) return fracFinish(true, 'Правильно!');
  fb.textContent = r.msg; fb.className = 'fb ' + (r.soft ? 'warn' : 'no');
  if (r.soft) return; // «можна скоротити ще» — не помилка, просто підказка
  (r.bad || []).forEach(k => inputs[k] && inputs[k].classList.add('no'));
  if (r.mark) inputs.forEach((el, k) => el.classList.toggle('ok', !r.bad.includes(k))); // правильні клітинки — зелені
  if (game.results[game.i] === undefined) { game.results[game.i] = false; setDot(false); } // бал — лише з першої спроби
  $('#fshow').hidden = false;
}
function fracFinish(ok, html) {
  if (game.results[game.i] === undefined) { game.results[game.i] = ok; setDot(ok); }
  const fb = $('#fb'); fb.innerHTML = html; fb.className = 'fb ' + (ok ? 'ok' : 'no');
  document.querySelectorAll('.eqn input').forEach(el => { el.disabled = true; el.classList.toggle('ok', ok); });
  $('#fcheck').hidden = true; $('#fshow').hidden = true;
  $('#next').hidden = false; $('#next').focus();
}
async function next() {
  if (game.i + 1 < game.items.length) { game.i++; render(); return; }
  await submitResult(game.results.filter(Boolean).length, game.items.length);
}
async function submitResult(correct, total) {
  const before = levelOf(me.xp).n;
  if (me.guest) {
    const gained = correct * data.xpPerAnswer;
    me.xp += gained;
    if (!me.done.includes(game.title)) me.done.push(game.title);
    saveGuest();
    game.done = { correct, total, gained, levelUp: levelOf(me.xp).n > before };
    render();
    return;
  }
  const r = await withLoader('Записую результат у журнал…', () => api('result', { name: me.name, pin: me.pin, trainer: game.title, correct, total }));
  if (!r.ok) { alert(r.error); return; }
  me.xp = r.xp; me.done = r.done; data.rating = r.rating;
  game.done = { correct, total, gained: r.gained, levelUp: levelOf(me.xp).n > before };
  render();
}
function resultView() {
  const d = game.done;
  return `<div class="qcard"><div class="qnum">${esc(game.title)}</div>
    <div class="big">${d.correct}/${d.total}</div>
    <h2>${d.correct === d.total ? 'Бездоганно!' : d.correct / d.total >= .7 ? 'Добра робота!' : 'Варто потренуватися ще'}</h2>
    <div><span class="xp">+${d.gained} XP</span></div>
    ${d.levelUp ? `<p><b>Новий рівень: ${levelOf(me.xp).name}!</b></p>` : ''}
    ${me.guest ? '<p class="muted" style="margin:0">Ти в режимі гостя, тому бали не записані в рейтинг класу.</p>' : ''}
    <div><button class="btn" onclick="quit()">Готово</button></div></div>`;
}
function quit() { const back = game && (game.lesson || game.slides) ? 'lessons' : 'trainers'; game = null; tab = back; render(); }
