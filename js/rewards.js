/* MathBook — правила зірок і досягнень.
 * Цей самий блок (між рядками ===== RW) скопійовано в apps-script/Code.gs:
 * сайт показує зірки, а скрипт Google перевіряє їх під час покупки.
 * Змінюєте правила — змініть в обох файлах однаково.
 */
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
