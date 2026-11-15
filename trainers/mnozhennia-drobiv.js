/*
 * Тренажер «Множення дробів» — у блоці «Від учителя».
 * Як описати тренажер — див. коментар до MB.trainer у js/core.js.
 */
// Картка-правило з фігурами, як на плакаті: ▲/⏢ · ●/■ = (▲·●)/(⏢·■) і ▲ · ●/■ = (▲·●)/■
const SHAPE = {
  tri: '<svg class="sh" viewBox="0 0 24 22" aria-hidden="true"><path d="M12 2 22 20H2z"/></svg>',
  circ: '<svg class="sh" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/></svg>',
  trap: '<svg class="sh o" viewBox="0 0 28 22" aria-hidden="true"><path d="M7 2h14l5 18H2z"/></svg>',
  sq: '<svg class="sh o" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="2" width="20" height="20"/></svg>',
};
function ruleCard(n) {
  const { tri, circ, trap, sq } = SHAPE, dot = '<span class="dot">·</span>';
  const note = '<span class="rc-note">Наприкінці скороти дріб, якщо можна.</span>';
  return n === 1
    ? `<div class="rulecard"><span class="rc-n">Правило 1</span>${F(tri, trap)}${dot}${F(circ, sq)}<span class="op">=</span>${F(tri + dot + circ, trap + dot + sq)}${note}</div>`
    : `<div class="rulecard"><span class="rc-n">Правило 2</span>${tri}${dot}${F(circ, sq)}<span class="op">=</span>${F(tri + dot + circ, sq)}${note}</div>`;
}

MB.trainer('Множення дробів', {
  teacher: true,
  desc: 'Два правила: дріб на дріб і число на дріб. Не забувай скорочувати.',
  hint: t => t.kind === 'ff' ? 'Чисельник множимо на чисельник, знаменник — на знаменник.' : 'Число множимо лише на чисельник, знаменник не змінюється.',
  make() {
    if (Math.random() < .6) { // правило 1: дріб · дріб
      let a, b, c, d;
      do { b = ri(2, 9); d = ri(2, 9); a = ri(1, b - 1); c = ri(1, d - 1); } while (a * c === b * d);
      return { kind: 'ff', a, b, c, d };
    }
    let n, c, d; // правило 2: число · дріб (без цілих відповідей)
    do { d = ri(3, 12); c = ri(1, d - 1); n = ri(2, 6); } while ((n * c) % d === 0);
    return { kind: 'nf', n, c, d };
  },
  view(t) {
    const pair = (x, y) => `<span class="pair">${x}<span class="dot">·</span>${y}</span>`;
    if (t.kind === 'ff') return `${ruleCard(1)}<div class="eqn-row">${F(t.a, t.b)}<span class="op">·</span>${F(t.c, t.d)}<span class="op">=</span>
      <span class="fr">${pair(inp('множник чисельника'), inp('множник чисельника'))}${pair(inp('множник знаменника'), inp('множник знаменника'))}</span>
      <span class="op">=</span><span class="fr">${inp('чисельник результату')}${inp('знаменник результату')}</span></div>`;
    return `${ruleCard(2)}<div class="eqn-row"><span>${t.n}</span><span class="op">·</span>${F(t.c, t.d)}<span class="op">=</span>
      <span class="fr">${pair(inp('множник чисельника'), inp('множник чисельника'))}<span class="pair">${inp('знаменник')}</span></span>
      <span class="op">=</span><span class="fr">${inp('чисельник результату')}${inp('знаменник результату')}</span></div>`;
  },
  check(t, v) {
    // правильний, але нескорочений результат — підказка, а не помилка
    const reduced = (n, d) => gcdI(n, d) === 1 ? { ok: true } : { soft: true, msg: `Правильно, але ${n}/${d} можна скоротити. Скороти до кінця!` };
    const same = (x, y, p, q) => (x === p && y === q) || (x === q && y === p); // множники можна в будь-якому порядку
    if (t.kind === 'ff') {
      const [p1, p2, q1, q2, rn, rd] = v;
      if (!same(p1, p2, t.a, t.c)) return { msg: `У чисельнику множимо чисельники: ${t.a} · ${t.c}.`, bad: [0, 1] };
      if (!same(q1, q2, t.b, t.d)) return { msg: `У знаменнику множимо знаменники: ${t.b} · ${t.d}.`, bad: [2, 3] };
      if (rd && rn * t.b * t.d === t.a * t.c * rd) return reduced(rn, rd);
      return { msg: `Перевір множення: ${t.a} · ${t.c} = ?, ${t.b} · ${t.d} = ?`, bad: [4, 5] };
    }
    const [p1, p2, q, rn, rd] = v;
    if (!same(p1, p2, t.n, t.c)) return { msg: `Число ${t.n} множимо на чисельник ${t.c}.`, bad: [0, 1] };
    if (q !== t.d) return { msg: q === t.n * t.d ? 'Знаменник не змінюється! На число множимо лише чисельник.' : `Знаменник залишається ${t.d}.`, bad: [2] };
    if (rd && rn * t.d === t.n * t.c * rd) return reduced(rn, rd);
    return { msg: `Перевір множення: ${t.n} · ${t.c} = ?`, bad: [3, 4] };
  },
  solution(t) {
    const g = (n, d) => { const k = gcdI(n, d); return k > 1 ? ` = ${F(n / k, d / k)}` : ''; };
    if (t.kind === 'ff') return `${F(t.a, t.b)} · ${F(t.c, t.d)} = ${F(t.a + ' · ' + t.c, t.b + ' · ' + t.d)} = ${F(t.a * t.c, t.b * t.d)}${g(t.a * t.c, t.b * t.d)}`;
    return `${t.n} · ${F(t.c, t.d)} = ${F(t.n + ' · ' + t.c, t.d)} = ${F(t.n * t.c, t.d)}${g(t.n * t.c, t.d)}`;
  },
});
