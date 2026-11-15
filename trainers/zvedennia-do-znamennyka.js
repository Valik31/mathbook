/*
 * Тренажер «Зведення до нового знаменника».
 * Як описати тренажер — див. коментар до MB.trainer у js/core.js.
 */
MB.trainer('Зведення до нового знаменника', {
  hint: 'Знайди додатковий множник і помнож на нього чисельник.',
  make() { const [n, d] = irreducible(), m = ri(2, 10); return { n, d, m, T: d * m }; },
  view: t => `${F(t.n, t.d)}<span class="op">=</span><span class="fr">${inp('чисельник')}<span>${t.T}</span></span>`,
  check: (t, [a]) => a === t.n * t.m ? { ok: true } : { msg: `Подумай ще! Додатковий множник: ${t.m}`, bad: [0] },
  solution: t => `${F(t.n, t.d)} = ${F(t.n * t.m, t.T)} <small>(множник ${t.m})</small>`,
});
