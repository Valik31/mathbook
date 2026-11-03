/*
 * Тренажер «Скорочення дробів».
 * Як описати тренажер — див. коментар до MB.trainer у js/core.js.
 */
MB.trainer('Скорочення дробів', {
  hint: 'Скороти дріб до кінця: поділи чисельник і знаменник на їхній найбільший спільний дільник.',
  make() { const [n, d] = irreducible(), m = ri(2, 9); return { n, d, N: n * m, D: d * m }; },
  view: t => `${F(t.N, t.D)}<span class="op">=</span><span class="fr">${inp('чисельник')}${inp('знаменник')}</span>`,
  check(t, [a, b]) {
    if (a === t.n && b === t.d) return { ok: true };
    if (b && a * t.D === b * t.N) return { soft: true, msg: 'Дріб правильний, але його можна скоротити ще!' };
    return { msg: 'Неправильно. Спробуй ще раз!', bad: [0, 1] };
  },
  solution: t => `${F(t.N, t.D)} = ${F(t.n, t.d)} <small>(ділимо на ${t.N / t.n})</small>`,
});
