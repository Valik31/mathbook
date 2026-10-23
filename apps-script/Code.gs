/**
 * MathBook — сервер на Google Apps Script.
 * Таблиця = база даних, цей скрипт = міст між сайтом і таблицею.
 *
 * 1. Один раз запустіть функцію setup() — вона створить аркуші з прикладами.
 * 2. Розгорніть як веб-застосунок (див. README.md).
 */

const SHEET = {
  settings: 'Налаштування',
  students: 'Учні',
  trainers: 'Тренажери',
  lessons: 'Уроки',
  results: 'Результати',
};

/* ---------- одноразове налаштування таблиці ---------- */
function setup() {
  const ss = SpreadsheetApp.getActive();
  makeSheet_(ss, SHEET.settings, [
    ['Параметр', 'Значення'],
    ['Назва класу', '5-А клас'],
    ['XP за правильну відповідь', 10],
    ['Гостьовий режим (так/ні)', 'так'],
  ]);
  makeSheet_(ss, SHEET.students, [
    ['Ім’я', 'PIN'],
    ['Оля К.', '1234'],
    ['Петро С.', '5678'],
  ], 2);
  makeSheet_(ss, SHEET.trainers, [
    ['Тренажер', 'Питання', 'Відповідь', 'Хибні варіанти (через кому, необов’язково)'],
    ['Периметр і площа', 'Периметр квадрата зі стороною 6 см', '24', ''],
    ['Периметр і площа', 'Площа прямокутника 4 см × 7 см', '28', '22, 11, 47'],
    ['Периметр і площа', 'Сторона квадрата, якщо його площа 81 см²', '9', ''],
    ['Периметр і площа', 'Скільки см² в 1 дм²?', '100', '10, 1000'],
  ]);
  makeSheet_(ss, SHEET.lessons, [
    ['Урок', 'Пояснення', 'Питання', 'Відповідь'],
    ['Що таке дріб', 'Дріб показує, на скільки рівних частин поділили ціле (знаменник — нижнє число) і скільки частин узяли (чисельник — верхнє число).', 'Піцу поділили на 8 шматків, з’їли 3. Який дріб піци з’їли?', '3/8'],
    ['Що таке дріб', 'Якщо чисельник дорівнює знаменнику, дріб дорівнює цілому: 4/4 = 1.', 'Чому дорівнює 5/5?', '1'],
    ['Що таке дріб', 'Щоб знайти дріб від числа, ділимо число на знаменник і множимо на чисельник: 3/4 від 20 = 20 : 4 · 3 = 15.', 'Скільки буде 2/5 від 30?', '12'],
  ]);
  makeSheet_(ss, SHEET.results, [
    ['Дата', 'Учень', 'Тренажер', 'Правильно', 'Всього', 'XP'],
  ]);
}

function makeSheet_(ss, name, rows, textCol) {
  if (ss.getSheetByName(name)) return;
  const sh = ss.insertSheet(name);
  if (textCol) sh.getRange(1, textCol, 500, 1).setNumberFormat('@'); // PIN як текст, щоб не губились нулі
  sh.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  sh.getRange(1, 1, 1, rows[0].length).setFontWeight('bold');
  sh.setFrozenRows(1);
  sh.autoResizeColumns(1, rows[0].length);
}

/* ---------- обробка запитів ---------- */
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'init';
  if (action === 'init') return json_(init_());
  return json_({ ok: false, error: 'Невідома дія' });
}

function doPost(e) {
  let body = {};
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'Неправильний запит' }); }
  if (body.action === 'login') return json_(login_(body));
  if (body.action === 'result') return json_(saveResult_(body));
  return json_({ ok: false, error: 'Невідома дія' });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------- читання таблиці ---------- */
function rows_(name) {
  const sh = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sh) return [];
  return sh.getDataRange().getValues().slice(1).filter(r => r.some(c => String(c).trim() !== ''));
}

function settings_() {
  const s = {};
  rows_(SHEET.settings).forEach(r => { s[String(r[0]).trim()] = r[1]; });
  return {
    className: String(s['Назва класу'] || 'Мій клас'),
    xpPerAnswer: Number(s['XP за правильну відповідь']) || 10,
    guestMode: String(s['Гостьовий режим (так/ні)'] || 'так').trim().toLowerCase() !== 'ні',
  };
}

function groupBy_(rows, map) {
  const groups = [];
  const index = {};
  rows.forEach(r => {
    const name = String(r[0]).trim();
    if (!name) return;
    if (!(name in index)) { index[name] = groups.length; groups.push({ name: name, items: [] }); }
    groups[index[name]].items.push(map(r));
  });
  return groups;
}

function rating_() {
  const xp = {};
  rows_(SHEET.students).forEach(r => { xp[String(r[0]).trim()] = 0; });
  rows_(SHEET.results).forEach(r => {
    const name = String(r[1]).trim();
    if (name in xp) xp[name] += Number(r[5]) || 0;
  });
  return Object.keys(xp).map(n => ({ name: n, xp: xp[n] })).sort((a, b) => b.xp - a.xp);
}

function init_() {
  const s = settings_();
  return {
    ok: true,
    className: s.className,
    xpPerAnswer: s.xpPerAnswer,
    guestMode: s.guestMode,
    students: rows_(SHEET.students).map(r => String(r[0]).trim()).filter(Boolean),
    trainers: groupBy_(rows_(SHEET.trainers), r => ({
      q: String(r[1]),
      a: String(r[2]),
      wrong: String(r[3] || '').split(',').map(x => x.trim()).filter(Boolean),
    })).map(g => ({ name: g.name, questions: g.items })),
    lessons: groupBy_(rows_(SHEET.lessons), r => ({
      text: String(r[1]),
      q: String(r[2]),
      a: String(r[3]),
    })).map(g => ({ name: g.name, steps: g.items })),
    rating: rating_(),
  };
}

/* ---------- учні ---------- */
function checkPin_(name, pin) {
  name = String(name || '').trim();
  pin = String(pin || '').trim();
  return rows_(SHEET.students).some(r => String(r[0]).trim() === name && String(r[1]).trim() === pin);
}

function studentInfo_(name) {
  const done = {};
  rows_(SHEET.results).forEach(r => {
    if (String(r[1]).trim() === name) done[String(r[2])] = true;
  });
  const me = rating_().find(r => r.name === name);
  return { xp: me ? me.xp : 0, done: Object.keys(done) };
}

function login_(body) {
  if (!checkPin_(body.name, body.pin)) return { ok: false, error: 'Неправильне ім’я або PIN' };
  const info = studentInfo_(String(body.name).trim());
  return { ok: true, name: String(body.name).trim(), xp: info.xp, done: info.done };
}

function saveResult_(body) {
  if (!checkPin_(body.name, body.pin)) return { ok: false, error: 'Неправильне ім’я або PIN' };
  const total = Math.max(1, Math.min(100, Math.floor(Number(body.total) || 0)));
  const correct = Math.max(0, Math.min(total, Math.floor(Number(body.correct) || 0)));
  const xp = correct * settings_().xpPerAnswer;
  const name = String(body.name).trim();
  const trainer = String(body.trainer || '').slice(0, 100);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    SpreadsheetApp.getActive().getSheetByName(SHEET.results)
      .appendRow([new Date(), name, trainer, correct, total, xp]);
  } finally {
    lock.releaseLock();
  }
  const info = studentInfo_(name);
  return { ok: true, gained: xp, xp: info.xp, done: info.done, rating: rating_() };
}
