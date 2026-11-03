/* MathBook — ядро: утиліти, перевірка відповідей, реєстр тренажерів і уроків */

const LEVELS = [[0,'Новачок'],[100,'Учень'],[300,'Знавець'],[600,'Майстер'],[1000,'Експерт'],[1500,'Піфагор']];
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ri = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/* ---------- перевірка відповіді: 0,5 = 0.5 = 1/2 ---------- */
function toNum(s) {
  s = String(s).trim().replace(/\s+/g, '').replace(/,/g, '.').replace(/[−–]/g, '-');
  const m = s.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/);
  if (m) return +m[2] ? +m[1] / +m[2] : NaN;
  return /^-?(\d+\.?\d*|\.\d+)$/.test(s) ? +s : NaN;
}
function isRight(given, answer) {
  return String(answer).split('|').some(alt => {
    const a = toNum(alt), b = toNum(given);
    if (!isNaN(a) && !isNaN(b)) return Math.abs(a - b) < 1e-9;
    return given.trim().toLowerCase() === alt.trim().toLowerCase();
  });
}
const firstAnswer = a => String(a).split('|')[0].trim();

/* ---------- тренажери з дробами: введення чисельника й знаменника, перевірка по кроках ---------- */
const gcdI = (a, b) => b ? gcdI(b, a % b) : Math.abs(a);
const F = (n, d) => `<span class="fr"><span>${n}</span><span>${d}</span></span>`;
const inp = (label, ph = '?') => `<input inputmode="numeric" autocomplete="off" placeholder="${ph}" aria-label="${label}">`;
const MX = (w, n, d) => `<span class="mx"><span class="w">${w}</span>${F(n, d)}</span>`; // мішане число
function irreducible() { let n, d; do { n = ri(1, 9); d = ri(2, 10); } while (n >= d || gcdI(n, d) !== 1); return [n, d]; }

/* ---------- реєстр: файли з папок trainers/ і lessons/ додають себе сюди ---------- */
const GENERATORS = {};        // прості генератори «питання → відповідь»
const FRACTION_TRAINERS = {}; // тренажери з полями для чисел і перевіркою по кроках
window.MB_LESSONS = window.MB_LESSONS || []; // інтерактивні уроки
const MB = {
  // MB.generator('Назва', () => ({ q: '2 + 2 = ?', a: '4' }))
  generator(name, make) { GENERATORS[name] = make; },
  /*
   * MB.trainer('Назва', {
   *   teacher: true,          — показувати в блоці «Від учителя» (інакше — у «Дроби»)
   *   desc, hint,             — опис у списку і підказка над завданням (hint може бути функцією від завдання)
   *   make(),                 — створює одне завдання (об'єкт з числами)
   *   view(t),                — HTML завдання; поля вводу — через inp('підпис', 'підказка')
   *   check(t, values),       — values — числа з полів по порядку; повертає
   *                             { ok: true } | { soft: true, msg } (підказка, не помилка) | { msg, bad: [номери полів] }
   *   solution(t),            — HTML розв'язку для кнопки «Показати розв'язок»
   * })
   */
  trainer(name, def) { FRACTION_TRAINERS[name] = def; },
};
