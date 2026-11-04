/**
 * MathBook — сервер на Google Apps Script.
 * Таблиця = база даних, цей скрипт = міст між сайтом і таблицею.
 *
 * 1. Запустіть функцію setup() — вона створить аркуші з прикладами
 *    (а якщо аркуші вже є — лише додасть нові налаштування, нічого не стираючи).
 * 2. Розгорніть як веб-застосунок (див. README.md).
 *    Після зміни цього коду: Розгорнути → Керувати розгортаннями → ✏️ → Нова версія.
 */

const SHEET = {
  settings: 'Налаштування',
  students: 'Учні',
  trainers: 'Тренажери',
  lessons: 'Уроки',
  results: 'Результати',
  rewards: 'Нагороди',
  purchases: 'Покупки',
};

const REWARDS_HEADER = ['Нагорода', 'Тип (рамка / звання / сертифікат / оцінка)', 'Ціна, ★', 'Ліміт на місяць', 'Параметр', 'Опис'];
const REWARDS_DEFAULT = [
  ['Золота рамка', 'рамка', 40, '', 'gold', 'Золота рамка навколо твого значка в рейтингу'],
  ['Космічна рамка', 'рамка', 70, '', 'space', 'Темно-синя рамка із зорями'],
  ['Вогняна рамка', 'рамка', 100, '', 'fire', 'Помаранчево-червона рамка'],
  ['Звання «Знавець дробів»', 'звання', 50, '', 'Знавець дробів', 'Звання під твоїм іменем у рейтингу'],
  ['Звання «Гросмейстер обчислень»', 'звання', 150, '', 'Гросмейстер обчислень', 'Звання під твоїм іменем у рейтингу'],
  ['Сертифікат «Майстер дробів»', 'сертифікат', 120, 1, 'Майстер дробів', 'за успіхи у вивченні дробів'],
  ['Сертифікат «Зірка класу»', 'сертифікат', 200, 1, 'Зірка класу', 'за старанність і наполегливість у математиці'],
  ['+1 бал до самостійної роботи', 'оцінка', 250, 1, '', 'Учитель додасть 1 бал до оцінки за самостійну роботу'],
];
const PURCHASES_HEADER = ['ID', 'Дата', 'Учень', 'Нагорода', 'Ціна, ★', 'Статус (видано / очікує / відхилено)'];

/* ---------- одноразове налаштування таблиці ---------- */
function setup() {
  const ss = SpreadsheetApp.getActive();
  makeSheet_(ss, SHEET.settings, [
    ['Параметр', 'Значення'],
    ['Назва класу', '5-А клас'],
    ['XP за правильну відповідь', 10],
    ['Гостьовий режим (так/ні)', 'так'],
    ['Пароль вчителя', 'змініть-мене'],
  ]);
  makeSheet_(ss, SHEET.students, [
    ['Ім’я', 'PIN'],
    ['Оля К.', '1234'],
    ['Петро С.', '5678'],
  ], true);
  makeSheet_(ss, SHEET.trainers, [
    ['Тренажер', 'Питання', 'Відповідь', 'Хибні варіанти (через кому, необов’язково)'],
    ['Периметр і площа', 'Периметр квадрата зі стороною 6 см', '24', ''],
    ['Периметр і площа', 'Площа прямокутника 4 см × 7 см', '28', '22, 11, 47'],
    ['Периметр і площа', 'Сторона квадрата, якщо його площа 81 см²', '9', ''],
    ['Периметр і площа', 'Скільки см² в 1 дм²?', '100', '10, 1000'],
  ], true);
  makeSheet_(ss, SHEET.lessons, [
    ['Урок', 'Пояснення', 'Питання', 'Відповідь'],
    ['Що таке дріб', 'Дріб показує, на скільки рівних частин поділили ціле (знаменник — нижнє число) і скільки частин узяли (чисельник — верхнє число).', 'Піцу поділили на 8 шматків, з’їли 3. Який дріб піци з’їли?', '3/8'],
    ['Що таке дріб', 'Якщо чисельник дорівнює знаменнику, дріб дорівнює цілому: 4/4 = 1.', 'Чому дорівнює 5/5?', '1'],
    ['Що таке дріб', 'Щоб знайти дріб від числа, ділимо число на знаменник і множимо на чисельник: 3/4 від 20 = 20 : 4 · 3 = 15.', 'Скільки буде 2/5 від 30?', '12'],
  ], true);
  migrate_(ss);
  makeSheet_(ss, SHEET.results, [
    ['Дата', 'Учень', 'Тренажер', 'Правильно', 'Всього', 'XP'],
  ]);
}

function makeSheet_(ss, name, rows, asText) {
  if (ss.getSheetByName(name)) return;
  const sh = ss.insertSheet(name);
  // Текстовий формат: PIN «0123» не втратить нуль, а відповідь «3/8» не стане датою
  if (asText) sh.getRange(1, 1, 1000, rows[0].length).setNumberFormat('@');
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
  if (body.action === 'teacher') return json_(teacher_(body));
  if (body.action === 'buy') return json_(buy_(body));
  if (body.action === 'equip') return json_(equip_(body));
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

function settingsRaw_() {
  const s = {};
  rows_(SHEET.settings).forEach(r => { s[String(r[0]).trim()] = r[1]; });
  return s;
}

function settings_() {
  const s = settingsRaw_();
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
  const xp = {}, cos = cosmetics_();
  rows_(SHEET.students).forEach(r => { xp[String(r[0]).trim()] = 0; });
  rows_(SHEET.results).forEach(r => {
    const name = String(r[1]).trim();
    if (name in xp) xp[name] += Number(r[5]) || 0;
  });
  return Object.keys(xp).map(n => ({ name: n, xp: xp[n], frame: (cos[n] || {}).frame || '', title: (cos[n] || {}).title || '' }))
    .sort((a, b) => b.xp - a.xp);
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
    shop: shop_(),
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
  return { ok: true, name: String(body.name).trim(), xp: info.xp, done: info.done, rewards: rewardsState_(String(body.name).trim()) };
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
  return { ok: true, gained: xp, xp: info.xp, done: info.done, rating: rating_(), rewards: rewardsState_(name) };
}

/* ---------- оновлення таблиці, створеної старішою версією ---------- */
function migrate_(ss) {
  // нові налаштування, яких могло не бути
  const have = settingsRaw_();
  if (!('Гостьовий режим (так/ні)' in have)) setSetting_('Гостьовий режим (так/ні)', 'так');
  if (!('Пароль вчителя' in have)) setSetting_('Пароль вчителя', 'змініть-мене');
  // нагороди: аркуші й колонки для рамки та звання учня
  makeSheet_(ss, SHEET.rewards, [REWARDS_HEADER].concat(REWARDS_DEFAULT));
  makeSheet_(ss, SHEET.purchases, [PURCHASES_HEADER]);
  const st = ss.getSheetByName(SHEET.students);
  if (st && !String(st.getRange(1, 3).getValue()).trim()) st.getRange(1, 3, 1, 2).setValues([['Рамка', 'Звання']]).setFontWeight('bold');
  // текстовий формат для аркушів з відповідями та PIN
  [SHEET.students, SHEET.trainers, SHEET.lessons].forEach(name => {
    const sh = ss.getSheetByName(name);
    if (sh) sh.getRange(2, 1, sh.getMaxRows() - 1, Math.min(4, sh.getMaxColumns())).setNumberFormat('@');
  });
  // відповідь «3/8» у прикладі уроку могла перетворитися на дату — повертаємо як текст
  const ls = ss.getSheetByName(SHEET.lessons);
  if (ls) {
    const v = ls.getDataRange().getValues();
    for (let i = 1; i < v.length; i++) {
      if (String(v[i][2]).indexOf('Піцу поділили на 8') === 0 && v[i][3] instanceof Date) ls.getRange(i + 1, 4).setValue('3/8');
    }
  }
}

/* ---------- кабінет вчителя ---------- */
function teacher_(b) {
  const pass = String(settingsRaw_()['Пароль вчителя'] || '').trim();
  if (!pass) return { ok: false, error: 'Пароль вчителя не задано. Запустіть setup() у скрипті ще раз.' };
  if (String(b.password || '').trim() !== pass) {
    Utilities.sleep(1000); // гальмуємо підбір пароля
    return { ok: false, error: 'Неправильний пароль' };
  }
  if (b.op === 'login' || b.op === 'overview') return overview_();

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    let err = null;
    if (b.op === 'addStudent') err = addStudent_(b);
    else if (b.op === 'deleteStudent') deleteWhere_(SHEET.students, r => String(r[0]).trim() === String(b.name).trim());
    else if (b.op === 'addTrainer') err = addTrainer_(b);
    else if (b.op === 'deleteTrainer') deleteWhere_(SHEET.trainers, r => String(r[0]).trim() === String(b.name).trim());
    else if (b.op === 'saveSettings') saveSettings_(b);
    else if (b.op === 'decidePurchase') err = decidePurchase_(b);
    else err = 'Невідома дія';
    if (err) return { ok: false, error: err };
  } finally {
    lock.releaseLock();
  }
  return overview_();
}

function overview_() {
  const s = settings_();
  return {
    ok: true,
    settings: { className: s.className, xpPerAnswer: s.xpPerAnswer, guestMode: s.guestMode },
    students: rows_(SHEET.students).map(r => ({ name: String(r[0]).trim(), pin: String(r[1]).trim() })).filter(x => x.name),
    results: rows_(SHEET.results).map(r => ({
      date: r[0] instanceof Date ? r[0].toISOString() : String(r[0]),
      name: String(r[1]).trim(), trainer: String(r[2]),
      correct: Number(r[3]) || 0, total: Number(r[4]) || 0, xp: Number(r[5]) || 0,
    })),
    trainers: init_().trainers,
    purchases: purchases_(),
    shop: shop_(),
  };
}

function addStudent_(b) {
  const name = String(b.name || '').trim().slice(0, 40);
  if (!name) return 'Вкажіть ім’я учня';
  const students = rows_(SHEET.students);
  if (students.some(r => String(r[0]).trim() === name)) return 'Учень з таким ім’ям уже є';
  let pin = String(b.pin || '').trim();
  if (pin && !/^\d{4,6}$/.test(pin)) return 'PIN — це 4–6 цифр';
  if (!pin) pin = String(Math.floor(1000 + Math.random() * 9000));
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET.students);
  sh.getRange(sh.getLastRow() + 1, 1, 1, 2).setNumberFormat('@').setValues([[name, pin]]);
  return null;
}

function addTrainer_(b) {
  const name = String(b.name || '').trim().slice(0, 60);
  if (!name) return 'Вкажіть назву тренажера';
  if (rows_(SHEET.trainers).some(r => String(r[0]).trim() === name)) return 'Тренажер з такою назвою вже є';
  const qs = (b.questions || []).slice(0, 50)
    .map(q => [name, String(q.q || '').trim(), String(q.a || '').trim(), String(q.wrong || '').trim()])
    .filter(r => r[1] && r[2]);
  if (!qs.length) return 'Додайте хоча б одне питання з відповіддю';
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET.trainers);
  sh.getRange(sh.getLastRow() + 1, 1, qs.length, 4).setNumberFormat('@').setValues(qs);
  return null;
}

function saveSettings_(b) {
  if (b.className) setSetting_('Назва класу', String(b.className).trim().slice(0, 40));
  if (b.xpPerAnswer) setSetting_('XP за правильну відповідь', Math.max(1, Math.min(100, Number(b.xpPerAnswer) || 10)));
  if (typeof b.guestMode === 'boolean') setSetting_('Гостьовий режим (так/ні)', b.guestMode ? 'так' : 'ні');
  if (b.newPassword && String(b.newPassword).trim().length >= 6) setSetting_('Пароль вчителя', String(b.newPassword).trim());
}

function setSetting_(key, value) {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET.settings);
  const v = sh.getDataRange().getValues();
  for (let i = 1; i < v.length; i++) {
    if (String(v[i][0]).trim() === key) { sh.getRange(i + 1, 2).setValue(value); return; }
  }
  sh.appendRow([key, value]);
}

function deleteWhere_(sheetName, test) {
  const sh = SpreadsheetApp.getActive().getSheetByName(sheetName);
  const v = sh.getDataRange().getValues();
  for (let i = v.length - 1; i >= 1; i--) if (test(v[i])) sh.deleteRow(i + 1);
}

/* ---------- нагороди: зірки, досягнення, крамниця ---------- */
const REWARD_TYPES = ['рамка', 'звання', 'сертифікат', 'оцінка'];

function shop_() {
  return rows_(SHEET.rewards).map(r => ({
    name: String(r[0]).trim(), type: String(r[1]).trim().toLowerCase(), price: Number(r[2]) || 0,
    limit: Number(r[3]) || 0, param: String(r[4] || '').trim(), desc: String(r[5] || '').trim(),
  })).filter(x => x.name && x.price > 0 && REWARD_TYPES.indexOf(x.type) >= 0);
}

function purchases_(name) {
  return rows_(SHEET.purchases).map(r => ({
    id: String(r[0]).trim(), date: r[1] instanceof Date ? r[1].toISOString() : String(r[1]),
    name: String(r[2]).trim(), reward: String(r[3]).trim(), price: Number(r[4]) || 0, status: String(r[5]).trim(),
  })).filter(p => p.id && (!name || p.name === name));
}

function resultRows_(name) {
  return rows_(SHEET.results).filter(r => String(r[1]).trim() === name)
    .map(r => ({ date: r[0], trainer: String(r[2]), correct: Number(r[3]) || 0, total: Number(r[4]) || 0 }));
}

function cosmetics_() {
  const c = {};
  rows_(SHEET.students).forEach(r => { c[String(r[0]).trim()] = { frame: String(r[2] || '').trim(), title: String(r[3] || '').trim() }; });
  return c;
}

function rewardsState_(name) {
  const purchases = purchases_(name), sum = rwSummary(resultRows_(name), purchases), cos = cosmetics_()[name] || {};
  return { stars: sum.balance, earned: sum.earned, spent: sum.spent, achievements: sum.achievements, streak: sum.streak,
    purchases: purchases, frame: cos.frame || '', title: cos.title || '' };
}

function setCosmetic_(name, kind, value) {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET.students);
  const v = sh.getDataRange().getValues();
  for (let i = 1; i < v.length; i++) {
    if (String(v[i][0]).trim() === name) { sh.getRange(i + 1, kind === 'frame' ? 3 : 4).setNumberFormat('@').setValue(value); return; }
  }
}

function buy_(b) {
  if (!checkPin_(b.name, b.pin)) return { ok: false, error: 'Неправильне ім’я або PIN' };
  const name = String(b.name).trim();
  const item = shop_().find(x => x.name === String(b.reward || ''));
  if (!item) return { ok: false, error: 'Такої нагороди вже немає. Оновіть сторінку.' };
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  let status;
  try {
    const st = rewardsState_(name);
    const mine = st.purchases.filter(p => p.reward === item.name && p.status !== 'відхилено');
    if ((item.type === 'рамка' || item.type === 'звання') && mine.length) return { ok: false, error: 'Ця нагорода в тебе вже є.' };
    if (item.limit) {
      const now = new Date();
      const month = mine.filter(p => { const d = new Date(p.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
      if (month.length >= item.limit) return { ok: false, error: 'Цю нагороду можна взяти не більше ' + item.limit + ' раз(и) на місяць.' };
    }
    if (st.stars < item.price) return { ok: false, error: 'Не вистачає ' + (item.price - st.stars) + ' ★.' };
    status = item.type === 'оцінка' ? 'очікує' : 'видано'; // бонус до оцінки підтверджує вчитель
    SpreadsheetApp.getActive().getSheetByName(SHEET.purchases)
      .appendRow(['p' + Utilities.getUuid().replace(/-/g, '').slice(0, 10), new Date(), name, item.name, item.price, status]);
    if (item.type === 'рамка') setCosmetic_(name, 'frame', item.param);
    if (item.type === 'звання') setCosmetic_(name, 'title', item.param || item.name);
  } finally {
    lock.releaseLock();
  }
  return { ok: true, status: status, rewards: rewardsState_(name), rating: rating_() };
}

function equip_(b) {
  if (!checkPin_(b.name, b.pin)) return { ok: false, error: 'Неправильне ім’я або PIN' };
  const name = String(b.name).trim(), kind = b.kind === 'frame' ? 'frame' : 'title', value = String(b.value || '');
  if (value) {
    const owned = rewardsState_(name).purchases.filter(p => p.status === 'видано').map(p => p.reward);
    const ok = shop_().some(x => owned.indexOf(x.name) >= 0 && x.type === (kind === 'frame' ? 'рамка' : 'звання')
      && (kind === 'frame' ? x.param : (x.param || x.name)) === value);
    if (!ok) return { ok: false, error: 'Спершу отримай цю нагороду в крамниці.' };
  }
  setCosmetic_(name, kind, value);
  return { ok: true, rewards: rewardsState_(name), rating: rating_() };
}

function decidePurchase_(b) {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET.purchases);
  const v = sh.getDataRange().getValues();
  for (let i = 1; i < v.length; i++) {
    if (String(v[i][0]).trim() === String(b.id)) {
      if (String(v[i][5]).trim() !== 'очікує') return 'Цей запит уже розглянуто.';
      sh.getRange(i + 1, 6).setValue(b.approve ? 'видано' : 'відхилено'); // відхилене — зірки повертаються учневі
      return null;
    }
  }
  return 'Запит не знайдено. Оновіть кабінет.';
}

// ===== RW: ПОЧАТОК ПРАВИЛ =====
const RW_GENERATORS = ['Усний рахунок', 'Таблиця множення', 'Дроби', 'Рівняння'];
const RW_FRACTIONS = ['Скорочення дробів', 'Зведення до нового знаменника', 'Додавання і віднімання дробів',
  'Множення дробів', 'Перетворення мішаного числа', 'Множення мішаних чисел'];
const RW_ACHIEVEMENTS = [
  { id: 'first', name: 'Перший крок', desc: 'Пройди перший тренажер або урок', stars: 5, icon: '1' },
  { id: 'perfect', name: 'Без помилок', desc: 'Розв’яжи тренажер (від 5 питань) без жодної помилки', stars: 10, icon: '✓' },
  { id: 'sniper', name: 'Снайпер', desc: '5 разів пройди тренажер без помилок', stars: 30, icon: '◎' },
  { id: 'lesson', name: 'Перший урок', desc: 'Заверши будь-який урок', stars: 10, icon: '¾' },
  { id: 'explorer', name: 'Дослідник', desc: 'Спробуй 5 різних тренажерів', stars: 15, icon: '5' },
  { id: 'streak3', name: 'Три дні поспіль', desc: 'Займайся 3 дні підряд', stars: 15, icon: '3д' },
  { id: 'streak7', name: 'Тиждень поспіль', desc: 'Займайся 7 днів підряд', stars: 40, icon: '7д' },
  { id: 'hundred', name: 'Сотня', desc: 'Дай 100 правильних відповідей', stars: 20, icon: '100' },
  { id: 'fivehundred', name: 'П’ятсот', desc: 'Дай 500 правильних відповідей', stars: 60, icon: '500' },
  { id: 'persistent', name: 'Наполегливий', desc: 'Покращ свій результат у тренажері на 3 відповіді або більше', stars: 15, icon: '↑' },
  { id: 'fractions', name: 'Майстер дробів', desc: 'Пройди всі тренажери з дробами на 8 з 10 або краще', stars: 50, icon: '½' },
];
function rwDayNum(d) { const x = new Date(d); return isNaN(x) ? -1 : Math.floor(Date.UTC(x.getFullYear(), x.getMonth(), x.getDate()) / 864e5); }
function rwIsLesson(trainer) { return String(trainer).indexOf('Урок: ') === 0; }

// Зірки за кожен результат (rows — результати одного учня в порядку часу: { date, trainer, correct, total }).
// Перша спроба тренажера за день — повністю, друга — половина, далі — 0 (захист від накруток).
// Генератори прикладів дають половину. +5 за проходження без помилок (від 5 питань) і за урок.
function rwStarsFor(rows) {
  const seen = {};
  return rows.map(function (r) {
    const key = r.trainer + '|' + rwDayNum(r.date);
    const k = seen[key] = (seen[key] || 0) + 1;
    const mult = k === 1 ? 1 : k === 2 ? 0.5 : 0;
    let s = r.correct * (RW_GENERATORS.indexOf(r.trainer) >= 0 ? 0.5 : 1);
    if (r.total >= 5 && r.correct === r.total) s += 5;
    if (rwIsLesson(r.trainer)) s += 5;
    return Math.floor(s * mult);
  });
}

// Найдовша серія днів поспіль
function rwStreak(rows) {
  const days = Array.from(new Set(rows.map(function (r) { return rwDayNum(r.date); }))).filter(function (d) { return d >= 0; }).sort(function (a, b) { return a - b; });
  let best = 0, cur = 0;
  days.forEach(function (d, i) { cur = i && d === days[i - 1] + 1 ? cur + 1 : 1; best = Math.max(best, cur); });
  return best;
}

// Які досягнення вже є (масив id)
function rwAchievements(rows) {
  const perfect = rows.filter(function (r) { return r.total >= 5 && r.correct === r.total; }).length;
  const trainers = Array.from(new Set(rows.filter(function (r) { return !rwIsLesson(r.trainer); }).map(function (r) { return r.trainer; })));
  const correct = rows.reduce(function (s, r) { return s + r.correct; }, 0);
  const streak = rwStreak(rows);
  const minSoFar = {};
  let persistent = false;
  rows.forEach(function (r) {
    if (r.trainer in minSoFar && r.correct - minSoFar[r.trainer] >= 3) persistent = true;
    minSoFar[r.trainer] = Math.min(r.trainer in minSoFar ? minSoFar[r.trainer] : Infinity, r.correct);
  });
  const fractions = RW_FRACTIONS.every(function (name) { return rows.some(function (r) { return r.trainer === name && r.total && r.correct / r.total >= 0.8; }); });
  const got = {
    first: rows.length > 0, perfect: perfect >= 1, sniper: perfect >= 5, lesson: rows.some(function (r) { return rwIsLesson(r.trainer); }),
    explorer: trainers.length >= 5, streak3: streak >= 3, streak7: streak >= 7, hundred: correct >= 100, fivehundred: correct >= 500,
    persistent: persistent, fractions: fractions,
  };
  return RW_ACHIEVEMENTS.filter(function (a) { return got[a.id]; }).map(function (a) { return a.id; });
}

// Підсумок: зароблено, витрачено, баланс. purchases — { reward, price, status }; відхилені покупки не рахуються.
function rwSummary(rows, purchases) {
  const sorted = rows.slice().sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
  const achievements = rwAchievements(sorted);
  const fromResults = rwStarsFor(sorted).reduce(function (s, x) { return s + x; }, 0);
  const fromAch = RW_ACHIEVEMENTS.filter(function (a) { return achievements.indexOf(a.id) >= 0; }).reduce(function (s, a) { return s + a.stars; }, 0);
  const spent = (purchases || []).filter(function (p) { return p.status !== 'відхилено'; }).reduce(function (s, p) { return s + (Number(p.price) || 0); }, 0);
  return { earned: fromResults + fromAch, spent: spent, balance: fromResults + fromAch - spent, achievements: achievements, streak: rwStreak(sorted) };
}
// ===== RW: КІНЕЦЬ ПРАВИЛ =====
