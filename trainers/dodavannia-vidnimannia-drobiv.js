/*
 * Тренажер «Додавання і віднімання дробів».
 * Як описати тренажер — див. коментар до MB.trainer у js/core.js.
 */
MB.trainer('Додавання і віднімання дробів', {
  hint: 'Зведи дроби до найменшого спільного знаменника, а потім виконай дію.',
  make() {
    let d1, d2, n1, n2, op;
    do {
      d1 = ri(2, 9); do d2 = ri(2, 9); while (d2 === d1);
      n1 = ri(1, d1 - 1); n2 = ri(1, d2 - 1); op = Math.random() < .5 ? '+' : '−';
      if (op === '−' && n1 / d1 < n2 / d2) { [n1, n2] = [n2, n1]; [d1, d2] = [d2, d1]; } // результат додатний
    } while (op === '−' && n1 * d2 === n2 * d1);
    const l = d1 * d2 / gcdI(d1, d2), c1 = n1 * l / d1, c2 = n2 * l / d2;
    return { n1, d1, n2, d2, op, l, c1, c2, r: op === '+' ? c1 + c2 : c1 - c2 };
  },
  view: t => `${F(t.n1, t.d1)}<span class="op">${t.op}</span>${F(t.n2, t.d2)}<span class="op">=</span>
    <span class="fr">${inp('чисельник першого дробу')}${inp('спільний знаменник')}</span><span class="op">${t.op}</span>
    <span class="fr">${inp('чисельник другого дробу')}${inp('спільний знаменник')}</span><span class="op">=</span>
    <span class="fr">${inp('чисельник результату')}${inp('знаменник результату')}</span>`,
  check(t, [a1, b1, a2, b2, rn, rd]) {
    if (b1 !== t.l || b2 !== t.l) return { msg: 'Знайди найменший спільний знаменник!', bad: [1, 3] };
    if (a1 !== t.c1) return { msg: 'Неправильний чисельник першого дробу.', bad: [0] };
    if (a2 !== t.c2) return { msg: 'Неправильний чисельник другого дробу.', bad: [2] };
    if (rd && rn * t.l === t.r * rd) return { ok: true }; // можна скорочений або нескорочений
    return { msg: t.op === '+' ? 'Помилка в додаванні чисельників.' : 'Помилка у відніманні чисельників.', bad: [4, 5] };
  },
  solution: t => { const g = gcdI(t.r, t.l);
    return `${F(t.n1, t.d1)} ${t.op} ${F(t.n2, t.d2)} = ${F(t.c1, t.l)} ${t.op} ${F(t.c2, t.l)} = ${F(t.r, t.l)}${g > 1 ? ` = ${F(t.r / g, t.l / g)}` : ''}`; },
});
