/*
 * Тренажер «Перетворення мішаного числа» — у блоці «Від учителя».
 * Як описати тренажер — див. коментар до MB.trainer у js/core.js.
 */
MB.trainer('Перетворення мішаного числа', {
  teacher: true,
  desc: 'Мішане число → неправильний дріб: (ціле · знаменник) + чисельник.',
  hint: 'Заповни пропуски, щоб перетворити мішане число на неправильний дріб.',
  make() {
    let d, n; do { d = ri(2, 10); n = ri(1, d - 1); } while (gcdI(n, d) !== 1);
    return { w: ri(1, 9), n, d };
  },
  view(t) {
    const ex = `<div class="rulecard howto"><span class="rc-n">Як це працює</span>
      <span class="mx"><span class="w cw">3</span>${F('<span class="cn">2</span>', '<span class="cd">5</span>')}</span><span class="op">=</span>
      ${F('(<span class="cw">3</span> · <span class="cd">5</span>) + <span class="cn">2</span>', '<span class="cd">5</span>')}<span class="op">=</span>${F(17, 5)}</div>`;
    return `${ex}<div class="eqn-row">${MX(t.w, t.n, t.d)}<span class="op">=</span>
      <span class="fr"><span class="pair">(${inp('ціла частина', 'Ц')}<span class="dot">·</span>${inp('знаменник', 'З')})<span class="dot">+</span>${inp('чисельник', 'Ч')}</span><span class="pair">${inp('знаменник', 'З')}</span></span>
      <span class="op">=</span><span class="fr">${inp('чисельник результату', 'Ч')}${inp('знаменник результату', 'З')}</span></div>`;
  },
  check(t, [w, d1, n, d2, rn, rd]) {
    // як в оригіналі: кожну клітинку перевіряємо окремо й підсвічуємо всі помилкові
    const order = (w === t.w && d1 === t.d) || (w === t.d && d1 === t.w);
    const bad = [];
    if (!order) bad.push(0, 1);
    if (n !== t.n) bad.push(2);
    if (d2 !== t.d) bad.push(3);
    if (rn !== t.w * t.d + t.n) bad.push(4);
    if (rd !== t.d) bad.push(5);
    if (!bad.length) return { ok: true };
    const msg = bad.includes(3) || bad.includes(5) ? 'Знаменник не змінюється. Перевір червоні клітинки!' : 'Є помилка. Перевір червоні клітинки!';
    return { msg, bad, mark: true };
  },
  solution: t => `${MX(t.w, t.n, t.d)} = ${F(`(${t.w} · ${t.d}) + ${t.n}`, t.d)} = ${F(t.w * t.d + t.n, t.d)}`,
});
