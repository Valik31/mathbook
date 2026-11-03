/* MathBook — кабінет вчителя */
function teacherLoginView() {
  return `<div class="card stack" style="max-width:420px;margin:30px auto">
    <h1>Кабінет вчителя</h1><p class="muted">Пароль задається в таблиці, аркуш «Налаштування».</p>
    <input class="inp" id="tpass" type="password" placeholder="Пароль вчителя" autocomplete="current-password"
      onkeydown="if(event.key==='Enter')teacherLogin()">
    <div class="err" id="err"></div>
    <button class="btn" onclick="teacherLogin()">Увійти</button>
    <button class="linkbtn" onclick="loginMode='student';render()">← Я учень</button></div>`;
}
async function teacherLogin(saved) {
  const password = saved || $('#tpass').value.trim();
  if (!password) { $('#err').textContent = 'Введіть пароль.'; return; }
  const r = await withLoader('Відкриваю кабінет…', () => api('teacher', { password, op: 'login' }));
  if (!r.ok) {
    if (saved) { sessionStorage.removeItem('mb-teacher'); render(); return; }
    // стара версія скрипта не знає дії 'teacher' — підказуємо, як оновити розгортання
    $('#err').textContent = r.error === 'Невідома дія'
      ? 'Скрипт у Google ще старої версії. В Apps Script: Розгорнути → Керувати розгортаннями → ✏️ → Версія: «Нова версія» → Розгорнути.'
      : r.error;
    return;
  }
  teacher = { password, d: r, tab: 'overview', open: null, showPins: false, confirm: null, builder: newBuilder(), msg: null };
  try { sessionStorage.setItem('mb-teacher', password); } catch (e) {} // лише до закриття вкладки
  render();
}
async function teacherLogout() {
  teacher = null; loginMode = 'student';
  try { sessionStorage.removeItem('mb-teacher'); } catch (e) {}
  data = await withLoader('Оновлюю дані…', () => api('init')); // зміни вчителя одразу видно учням
  render();
}
async function tDo(op, payload, loaderText, okText) {
  const r = await withLoader(loaderText, () => api('teacher', { password: teacher.password, op, ...payload }));
  if (!r.ok) { teacher.msg = { ok: false, text: r.error }; render(); return false; }
  teacher.d = r; teacher.confirm = null; teacher.msg = okText ? { ok: true, text: okText } : null;
  render(); return true;
}
function tTab(t) { teacher.tab = t; teacher.msg = null; teacher.confirm = null; render(); }

const dayKey = d => { const x = new Date(d); return isNaN(x) ? '' : x.toDateString(); };
function fmtDate(d) {
  const x = new Date(d); if (!d || isNaN(x)) return '—';
  if (dayKey(x) === new Date().toDateString()) return 'сьогодні, ' + x.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
  return x.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
}
function meter(pct) {
  const cls = pct < 50 ? 'lo' : pct < 75 ? 'mid' : 'hi';
  return `<span class="meter"><i><b class="${cls}" style="width:${pct}%"></b></i><span>${pct}%</span></span>`;
}
function tStats() {
  const d = teacher.d, per = {};
  d.students.forEach(s => per[s.name] = { name: s.name, xp: 0, attempts: 0, correct: 0, total: 0, last: '', hist: [] });
  const topics = {};
  d.results.forEach(r => {
    const p = per[r.name]; if (!p) return; // результати видалених учнів не рахуємо
    p.xp += r.xp; p.attempts++; p.correct += r.correct; p.total += r.total; p.hist.push(r);
    if (r.date && (!p.last || new Date(r.date) > new Date(p.last))) p.last = r.date;
    const t = topics[r.trainer] || (topics[r.trainer] = { name: r.trainer, attempts: 0, correct: 0, total: 0 });
    t.attempts++; t.correct += r.correct; t.total += r.total;
  });
  const students = Object.values(per).sort((a, b) => b.xp - a.xp);
  const pct = (c, t) => t ? Math.round(c / t * 100) : 0;
  const today = new Date().toDateString();
  const sumC = students.reduce((s, p) => s + p.correct, 0), sumT = students.reduce((s, p) => s + p.total, 0);
  return {
    students, pct,
    topics: Object.values(topics).map(t => ({ ...t, pct: pct(t.correct, t.total) })).sort((a, b) => a.pct - b.pct),
    activeToday: students.filter(p => dayKey(p.last) === today).length,
    solved: sumC, accuracy: pct(sumC, sumT),
  };
}

function teacherView() {
  const tabs = [['overview', 'Огляд'], ['students', 'Учні'], ['trainers', 'Тренажери'], ['settings', 'Налаштування']];
  const m = teacher.msg;
  return `<div class="stack"><nav class="tabs">${tabs.map(([k, l]) => `<button class="tab ${teacher.tab === k ? 'on' : ''}" onclick="tTab('${k}')">${l}</button>`).join('')}</nav>
    ${m ? `<div class="msg ${m.ok ? 'ok' : 'no'}">${esc(m.text)}</div>` : ''}
    ${{ overview: tOverview, students: tStudents, trainers: tTrainers, settings: tSettings, print: tPrint }[teacher.tab]()}</div>`;
}

/* ---------- друк і експорт PIN-кодів ---------- */
const siteUrl = () => (location.origin + location.pathname).replace(/index\.html$/, '').replace(/^https?:\/\//, '');
const byName = () => [...teacher.d.students].sort((a, b) => a.name.localeCompare(b.name, 'uk'));
function tPrint() {
  const cls = teacher.d.settings.className, url = siteUrl();
  const cards = byName().map(s => `<div class="pincard"><div class="pc-top"><b>MathBook</b><span>${esc(cls)}</span></div>
      <div class="pc-name">${esc(s.name)}</div>
      <div class="pc-pin"><span>PIN</span><b>${esc(s.pin)}</b></div>
      <div class="pc-how">Відкрий <b>${esc(url)}</b>, обери своє ім’я і введи PIN. Нікому його не показуй.</div></div>`).join('');
  return `<div class="noprint formrow" style="align-items:center"><button class="btn ghost sm" onclick="tTab('students')">← До списку учнів</button>
      <span class="muted grow">${teacher.d.students.length} карток · вирізайте по пунктирній лінії</span>
      <button class="btn" onclick="window.print()">Надрукувати</button></div>
    <div class="pincards">${cards}</div>`;
}
function downloadPins() {
  // крапка з комою і BOM — щоб український Excel одразу відкрив колонки й кирилицю
  const rows = [['Ім’я', 'PIN'], ...byName().map(s => [s.name, s.pin])];
  const csv = '\ufeff' + rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = 'mathbook-pin-kody.csv'; // латиницею: браузери відкидають назви з кирилицею й пробілами
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function tOverview() {
  const S = tStats();
  const rows = S.students.map(p => {
    const open = teacher.open === p.name;
    const hist = open ? `<tr class="hist"><td colspan="6">${p.hist.length ? p.hist.slice(-15).reverse().map(r =>
      `${fmtDate(r.date)} · <b>${esc(r.trainer)}</b> · ${r.correct}/${r.total} · +${r.xp} XP`).join('<br>') : 'Ще нічого не проходив.'}</td></tr>` : '';
    return `<tr class="click" onclick="teacher.open=${open ? 'null' : esc(JSON.stringify(p.name))};render()">
      <td>${open ? '▾' : '▸'} ${esc(p.name)}</td><td class="n">${p.xp}</td><td>${levelOf(p.xp).name}</td><td class="n">${p.attempts}</td>
      <td>${p.total ? meter(S.pct(p.correct, p.total)) : '—'}</td><td>${fmtDate(p.last)}</td></tr>${hist}`;
  }).join('');
  return `<div class="tiles">
      <div class="tile"><b>${S.students.length}</b><span>учнів у класі</span></div>
      <div class="tile"><b>${S.activeToday}</b><span>займалися сьогодні</span></div>
      <div class="tile"><b>${S.solved}</b><span>правильних відповідей</span></div>
      <div class="tile"><b>${S.accuracy}%</b><span>середня точність</span></div></div>
    <div class="top" style="margin:0"><h2>Учні</h2><div class="right"><button class="btn ghost sm" onclick="tDo('overview',{},'Оновлюю…')">Оновити</button></div></div>
    <p class="muted" style="margin:-8px 0 0;font-size:.85rem">Натисніть на учня, щоб побачити його історію.</p>
    ${S.students.length ? `<div class="tbl"><table><thead><tr><th>Учень</th><th class="n">XP</th><th>Рівень</th><th class="n">Спроб</th><th>Точність</th><th>Останній раз</th></tr></thead><tbody>${rows}</tbody></table></div>`
      : '<p class="muted">Учнів ще немає. Додайте їх на вкладці «Учні».</p>'}
    <h2>Найважчі теми</h2>
    ${S.topics.length ? `<div class="tbl"><table><thead><tr><th>Тренажер або урок</th><th class="n">Спроб</th><th>Середній результат</th></tr></thead><tbody>
      ${S.topics.map(t => `<tr><td>${esc(t.name)}</td><td class="n">${t.attempts}</td><td>${meter(t.pct)}</td></tr>`).join('')}</tbody></table></div>`
      : '<p class="muted">Тут з’явиться статистика, коли учні пройдуть перші тренажери.</p>'}`;
}

function tStudents() {
  const st = teacher.d.students;
  return `<div class="card stack"><h2>Додати учня</h2>
      <div class="formrow"><input class="inp" id="sname" maxlength="40" placeholder="Ім’я та перша літера прізвища, напр. Оля К.">
      <input class="inp" id="spin" inputmode="numeric" maxlength="6" placeholder="PIN (якщо порожньо — згенерується)" style="max-width:260px">
      <button class="btn" onclick="addStudent()">Додати</button></div></div>
    ${st.length ? `<div class="card export"><div class="grow"><b>Роздати PIN-коди</b><small class="muted">Картки для вирізання або список для Excel</small></div>
      <button class="btn sm" onclick="tTab('print')">Картки з PIN для друку</button>
      <button class="btn ghost sm" onclick="downloadPins()">Завантажити список (Excel)</button></div>` : ''}
    <div class="top" style="margin:0"><h2>Список класу (${st.length})</h2><div class="right">
      <label class="chk"><input type="checkbox" ${teacher.showPins ? 'checked' : ''} onchange="teacher.showPins=this.checked;render()"> Показати PIN-коди</label></div></div>
    <div class="list">${st.map(s => `<div class="item"><div class="grow"><b>${esc(s.name)}</b></div>
      <span class="pin">${teacher.showPins ? esc(s.pin) : '••••'}</span>
      ${teacher.confirm === 's:' + s.name
        ? `<button class="btn sm" style="background:var(--red);border-color:var(--red)" onclick="tDo('deleteStudent',{name:${esc(JSON.stringify(s.name))}},'Видаляю…','Учня видалено')">Так, видалити</button><button class="btn ghost sm" onclick="teacher.confirm=null;render()">Ні</button>`
        : `<button class="btn ghost sm" onclick="teacher.confirm=${esc(JSON.stringify('s:' + s.name))};render()">Видалити</button>`}</div>`).join('') || '<p class="muted">Поки порожньо.</p>'}</div>
    <p class="muted" style="font-size:.85rem">PIN роздавайте кожному учневі особисто. Якщо учня видалити, його старі результати лишаться на аркуші «Результати», але зникнуть з рейтингу.</p>`;
}
async function addStudent() {
  const name = $('#sname').value.trim(), pin = $('#spin').value.trim();
  if (!name) { teacher.msg = { ok: false, text: 'Вкажіть ім’я учня.' }; render(); return; }
  await tDo('addStudent', { name, pin }, 'Додаю учня…', `Учня «${name}» додано.`);
  teacher.showPins = true; render(); // одразу видно PIN нового учня
}

function newBuilder() { return { name: '', rows: [{ q: '', a: '', wrong: '' }, { q: '', a: '', wrong: '' }, { q: '', a: '', wrong: '' }] }; }
function readBuilder() {
  const b = teacher.builder, n = $('#tname'); if (!n) return;
  b.name = n.value;
  b.rows = [...document.querySelectorAll('.qrow')].map(r => ({ q: r.children[0].value, a: r.children[1].value, wrong: r.children[2].value }));
}
function tTrainers() {
  const b = teacher.builder, tr = teacher.d.trainers;
  return `<div class="card stack"><h2>Новий тренажер</h2>
      <input class="inp" id="tname" maxlength="60" placeholder="Назва, напр. Периметр і площа" value="${esc(b.name)}">
      <div class="list">${b.rows.map((r, i) => `<div class="qrow">
        <input class="inp" placeholder="Питання ${i + 1}" value="${esc(r.q)}">
        <input class="inp" placeholder="Відповідь" value="${esc(r.a)}">
        <input class="inp" placeholder="Хибні варіанти через кому" value="${esc(r.wrong)}">
        <button class="x" onclick="readBuilder();teacher.builder.rows.splice(${i},1);render()" aria-label="Прибрати">×</button></div>`).join('')}</div>
      <p class="muted" style="margin:0;font-size:.85rem">Хибні варіанти необов’язкові: якщо їх вказати, питання стане тестом із вибором. Кілька правильних відповідей пишіть через <b>|</b>, напр. <b>5|п’ять</b>.</p>
      <div class="formrow"><button class="btn ghost" onclick="readBuilder();teacher.builder.rows.push({q:'',a:'',wrong:''});render()">+ Питання</button>
        <span style="flex:1"></span><button class="btn" onclick="saveTrainer()">Опублікувати</button></div></div>
    <h2>Тренажери класу (${tr.length})</h2>
    <div class="list">${tr.map(t => `<div class="item"><div class="grow"><b>${esc(t.name)}</b><small>${t.questions.length} питань</small></div>
      ${teacher.confirm === 't:' + t.name
        ? `<button class="btn sm" style="background:var(--red);border-color:var(--red)" onclick="tDo('deleteTrainer',{name:${esc(JSON.stringify(t.name))}},'Видаляю…','Тренажер видалено')">Так, видалити</button><button class="btn ghost sm" onclick="teacher.confirm=null;render()">Ні</button>`
        : `<button class="btn ghost sm" onclick="teacher.confirm=${esc(JSON.stringify('t:' + t.name))};render()">Видалити</button>`}</div>`).join('') || '<p class="muted">Ще немає тренажерів.</p>'}</div>
    <p class="muted" style="font-size:.85rem">Уроки поки редагуються прямо в таблиці, на аркуші «Уроки».</p>`;
}
async function saveTrainer() {
  readBuilder();
  const b = teacher.builder, questions = b.rows.filter(r => r.q.trim() && r.a.trim());
  if (!b.name.trim()) { teacher.msg = { ok: false, text: 'Вкажіть назву тренажера.' }; render(); return; }
  if (!questions.length) { teacher.msg = { ok: false, text: 'Додайте хоча б одне питання з відповіддю.' }; render(); return; }
  const name = b.name.trim();
  if (await tDo('addTrainer', { name, questions }, 'Записую тренажер у таблицю…', `Тренажер «${name}» опубліковано.`)) { teacher.builder = newBuilder(); render(); }
}

function tSettings() {
  const s = teacher.d.settings;
  return `<div class="card stack" style="max-width:520px">
    <label class="stack" style="gap:4px"><b>Назва класу</b><input class="inp" id="sClass" maxlength="40" value="${esc(s.className)}"></label>
    <label class="stack" style="gap:4px"><b>XP за правильну відповідь</b><input class="inp" id="sXp" type="number" min="1" max="100" value="${s.xpPerAnswer}" style="max-width:120px"></label>
    <label class="chk"><input type="checkbox" id="sGuest" ${s.guestMode ? 'checked' : ''}> Дозволити режим гостя</label>
    <label class="stack" style="gap:4px"><b>Новий пароль вчителя</b><input class="inp" id="sPass" type="password" autocomplete="new-password" placeholder="Залиште порожнім, щоб не змінювати">
      <span class="muted" style="font-size:.82rem">Щонайменше 6 символів.</span></label>
    <div><button class="btn" onclick="saveSettings()">Зберегти</button></div></div>`;
}
async function saveSettings() {
  const newPassword = $('#sPass').value.trim();
  if (newPassword && newPassword.length < 6) { teacher.msg = { ok: false, text: 'Пароль має бути щонайменше 6 символів.' }; render(); return; }
  const payload = { className: $('#sClass').value.trim(), xpPerAnswer: +$('#sXp').value || 10, guestMode: $('#sGuest').checked, newPassword };
  if (await tDo('saveSettings', payload, 'Зберігаю…', 'Налаштування збережено.') && newPassword) {
    teacher.password = newPassword; try { sessionStorage.setItem('mb-teacher', newPassword); } catch (e) {}
  }
}
function bindTeacher() {}
