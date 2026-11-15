/* MathBook — зв'язок з Google Таблицею (Apps Script) і демо-режим без неї */

/* ---------- зв'язок із таблицею ---------- */
async function api(action, payload = {}) {
  if (!API_URL) return demoApi(action, payload);
  if (action === 'init') return (await fetch(API_URL + '?action=init')).json();
  // text/plain (за замовчуванням) — щоб Google не вимагав додаткових дозволів CORS
  return (await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action, ...payload }) })).json();
}
async function withLoader(text, fn) {
  $('#loaderText').textContent = text;
  $('#loader').hidden = false;
  try { return await fn(); }
  catch (e) { alert('Немає зв’язку з таблицею. Перевірте інтернет і спробуйте ще раз.'); throw e; }
  finally { $('#loader').hidden = true; }
}

/* ---------- демо-режим, поки API_URL порожній ---------- */
const DEMO = {
  className: 'Демо-клас', xpPerAnswer: 10, guestMode: true, password: 'вчитель',
  students: [{ name: 'Оля К.', pin: '1234' }, { name: 'Петро С.', pin: '5678' }],
  trainers: [{ name: 'Периметр і площа', questions: [
    { q: 'Периметр квадрата зі стороною 6 см', a: '24', wrong: [] },
    { q: 'Площа прямокутника 4 см × 7 см', a: '28', wrong: ['22', '11', '47'] },
    { q: 'Скільки см² в 1 дм²?', a: '100', wrong: ['10', '1000'] }] }],
  lessons: [{ name: 'Що таке дріб', steps: [
    { text: 'Дріб показує, на скільки рівних частин поділили ціле (знаменник — нижнє число) і скільки частин узяли (чисельник — верхнє).', q: 'Піцу поділили на 8 шматків, з’їли 3. Який дріб піци з’їли?', a: '3/8' },
    { text: 'Щоб знайти дріб від числа, ділимо на знаменник і множимо на чисельник: 3/4 від 20 = 15.', q: 'Скільки буде 2/5 від 30?', a: '12' }] }],
};
const daysAgo = n => new Date(Date.now() - n * 864e5).toISOString();
const DEMO_SEED = [ // приклад історії, щоб у демо-кабінеті вчителя було що показати
  { date: daysAgo(2), name: 'Оля К.', trainer: 'Таблиця множення', correct: 9, total: 10, xp: 90 },
  { date: daysAgo(1), name: 'Петро С.', trainer: 'Периметр і площа', correct: 1, total: 3, xp: 10 },
  { date: daysAgo(0), name: 'Оля К.', trainer: 'Дроби', correct: 6, total: 10, xp: 60 },
];
function demoResults() { try { const v = localStorage.getItem('mb-demo'); return v ? JSON.parse(v) : DEMO_SEED; } catch (e) { return DEMO_SEED; } }
function demoRating() {
  const xp = Object.fromEntries(DEMO.students.map(s => [s.name, 0]));
  demoResults().forEach(r => { if (r.name in xp) xp[r.name] += r.xp; });
  return Object.entries(xp).map(([name, xp]) => ({ name, xp })).sort((a, b) => b.xp - a.xp);
}
async function demoApi(action, p) {
  await new Promise(r => setTimeout(r, 900)); // імітуємо затримку Google
  const ok = DEMO.students.some(s => s.name === p.name && s.pin === String(p.pin).trim());
  const info = name => ({ xp: demoRating().find(r => r.name === name)?.xp || 0, done: [...new Set(demoResults().filter(r => r.name === name).map(r => r.trainer))] });
  if (action === 'init') return { ok: true, ...DEMO, password: undefined, students: DEMO.students.map(s => s.name), rating: demoRating() };
  if (action === 'teacher') return demoTeacher(p);
  if (!ok) return { ok: false, error: 'Неправильне ім’я або PIN' };
  if (action === 'login') return { ok: true, name: p.name, ...info(p.name) };
  if (action === 'result') {
    const xp = Math.min(p.correct, p.total) * DEMO.xpPerAnswer;
    localStorage.setItem('mb-demo', JSON.stringify([...demoResults(), { date: new Date().toISOString(), name: p.name, trainer: p.trainer, correct: Math.min(p.correct, p.total), total: p.total, xp }]));
    return { ok: true, gained: xp, ...info(p.name), rating: demoRating() };
  }
}

/* демо-версія кабінету (без таблиці) — зміни живуть до перезавантаження сторінки */
function demoTeacher(p) {
  if (p.password !== DEMO.password) return { ok: false, error: 'Неправильний пароль' };
  const err = e => ({ ok: false, error: e });
  if (p.op === 'addStudent') {
    if (!p.name) return err('Вкажіть ім’я учня');
    if (DEMO.students.some(s => s.name === p.name)) return err('Учень з таким ім’ям уже є');
    if (p.pin && !/^\d{4,6}$/.test(p.pin)) return err('PIN — це 4–6 цифр');
    DEMO.students.push({ name: p.name, pin: p.pin || String(ri(1000, 9999)) });
  }
  if (p.op === 'deleteStudent') DEMO.students = DEMO.students.filter(s => s.name !== p.name);
  if (p.op === 'addTrainer') {
    if (DEMO.trainers.some(t => t.name === p.name)) return err('Тренажер з такою назвою вже є');
    DEMO.trainers.push({ name: p.name, questions: p.questions.map(q => ({ q: q.q, a: q.a, wrong: q.wrong.split(',').map(x => x.trim()).filter(Boolean) })) });
  }
  if (p.op === 'deleteTrainer') DEMO.trainers = DEMO.trainers.filter(t => t.name !== p.name);
  if (p.op === 'saveSettings') {
    if (p.className) DEMO.className = p.className;
    DEMO.xpPerAnswer = p.xpPerAnswer; DEMO.guestMode = p.guestMode;
    if (p.newPassword) DEMO.password = p.newPassword;
  }
  return { ok: true, settings: { className: DEMO.className, xpPerAnswer: DEMO.xpPerAnswer, guestMode: DEMO.guestMode },
    students: DEMO.students, results: demoResults(), trainers: DEMO.trainers };
}
