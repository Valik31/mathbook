/*
 * Тренажер «Взаємно обернені числа» — у блоці «Від учителя».
 * За пам'яткою § 11: дроби, натуральні числа, мішані числа, десяткові дроби.
 * Як описати тренажер — див. коментар до MB.trainer у js/core.js.
 */
const OBERNENI_RULES = {
  frac: { label: 'Дроби', rule: () => `<b>Переверни дріб!</b> ${F('a', 'b')} і ${F('b', 'a')}` },
  nat: { label: 'Натуральні числа', rule: () => `Для числа n обернене — ${F(1, 'n')}: &nbsp;2 і ${F(1, 2)}` },
  mixed: { label: 'Мішані числа', rule: () => `${MX(1, 1, 3)} = ${F(4, 3)} &nbsp;→&nbsp; обернене: ${F(3, 4)}` },
  dec: { label: 'Десятковий дріб', rule: () => `0,03 = ${F(3, 100)} &nbsp;→&nbsp; обернене: ${F(100, 3)}` },
};
const decStr = (k, den) => (k / den).toFixed(den === 10 ? 1 : 2).replace('.', ',');

MB.trainer('Взаємно обернені числа', {
  teacher: true,
  desc: 'Дроби, натуральні, мішані й десяткові числа: знайди число, добуток з яким дорівнює 1.',
  hint: t => ({
    frac: 'Переверни дріб: чисельник стає знаменником, а знаменник — чисельником.',
    nat: 'Натуральне число n — це дріб n/1. Переверни його.',
    mixed: 'Спершу переведи мішане число в неправильний дріб, потім переверни його.',
    dec: 'Спершу запиши десятковий дріб звичайним, потім переверни його.',
  })[t.kind],
  make() {
    const r = Math.random();
    if (r < 0.3) { // дріб: правильний або неправильний, інколи з чисельником 1
      let a, b; do { a = Math.random() < .25 ? 1 : ri(1, 20); b = ri(2, 20); } while (gcdI(a, b) !== 1 || a === b);
      return { kind: 'frac', a, b };
    }
    if (r < 0.5) { const ns = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 20, 25, 50, 100]; return { kind: 'nat', n: ns[ri(0, ns.length - 1)] }; }
    if (r < 0.8) { let d, n; do { d = ri(2, 9); n = ri(1, d - 1); } while (gcdI(n, d) !== 1); return { kind: 'mixed', w: ri(1, 5), n, d }; }
    const den = Math.random() < .5 ? 10 : 100; let k;
    do { k = ri(1, den - 1); } while (den === 100 && k % 10 === 0);
    return { kind: 'dec', k, den };
  },
  view(t) {
    const R = OBERNENI_RULES[t.kind];
    const card = `<div class="rulecard"><span class="rc-n">${R.label}</span>${R.rule()}<span class="rc-note">Добуток взаємно обернених чисел дорівнює 1.</span></div>`;
    const answer = `<span class="op lbl">обернене:</span><span class="fr">${inp('чисельник оберненого числа')}${inp('знаменник оберненого числа')}</span>`;
    const step = `<span class="op">=</span><span class="fr">${inp('чисельник', 'Ч')}${inp('знаменник', 'З')}</span>`;
    if (t.kind === 'frac') return `${card}<div class="eqn-row">${F(t.a, t.b)}<span class="op">→</span>${answer}</div>`;
    if (t.kind === 'nat') return `${card}<div class="eqn-row"><span class="big-n">${t.n}</span><span class="op">→</span>${answer}</div>`;
    const given = t.kind === 'mixed' ? MX(t.w, t.n, t.d) : `<span class="big-n">${decStr(t.k, t.den)}</span>`;
    return `${card}<div class="eqn-row">${given}${step}</div><div class="eqn-row">${answer}</div>`;
  },
  check(t, v) {
    const eq = (n, d, p, q) => d && n * q === p * d; // однакові за значенням дроби
    const flipHint = 'Чисельник і знаменник міняються місцями.';
    if (t.kind === 'frac') {
      const [n, d] = v;
      if (eq(n, d, t.b, t.a)) return { ok: true };
      if (eq(n, d, t.a, t.b)) return { msg: 'Це той самий дріб. Переверни його! ' + flipHint, bad: [0, 1] };
      return { msg: `Переверни дріб ${t.a}/${t.b}. ${flipHint}`, bad: [0, 1] };
    }
    if (t.kind === 'nat') {
      const [n, d] = v;
      if (eq(n, d, 1, t.n)) return { ok: true };
      if (eq(n, d, t.n, 1)) return { msg: `Це саме число ${t.n}. Обернене до нього — 1/${t.n}.`, bad: [0, 1] };
      return { msg: `${t.n} = ${t.n}/1. Переверни цей дріб.`, bad: [0, 1] };
    }
    const [p, q, n, d] = v;
    if (t.kind === 'mixed') {
      const P = t.w * t.d + t.n;
      if (p !== P || q !== t.d) return { msg: `Мішане число в неправильний дріб: (${t.w} · ${t.d}) + ${t.n} у чисельнику, ${t.d} у знаменнику.`, bad: [0, 1] };
      if (eq(n, d, t.d, P)) return { ok: true };
      if (eq(n, d, P, t.d)) return { msg: 'Тепер переверни отриманий дріб. ' + flipHint, bad: [2, 3] };
      return { msg: `Переверни дріб ${P}/${t.d}.`, bad: [2, 3] };
    }
    // десятковий: можна записати і нескороченим (25/100), і скороченим (1/4)
    if (!eq(p, q, t.k, t.den)) return { msg: `${decStr(t.k, t.den)} — це ${t.k} ${t.den === 10 ? 'десятих' : 'сотих'}: ${t.k}/${t.den}.`, bad: [0, 1] };
    if (eq(n, d, t.den, t.k)) return { ok: true };
    if (eq(n, d, t.k, t.den)) return { msg: 'Тепер переверни отриманий дріб. ' + flipHint, bad: [2, 3] };
    return { msg: `Переверни дріб ${p}/${q}.`, bad: [2, 3] };
  },
  solution(t) {
    // неправильний дріб у відповіді ще й як мішане число, як у пам'ятці: 100/3 = 33 1/3
    const asMixed = (n, d) => { const g = gcdI(n, d); n /= g; d /= g; return d === 1 ? ` = ${n}` : n > d ? ` = ${MX(Math.floor(n / d), n % d, d)}` : ''; };
    if (t.kind === 'frac') return `${F(t.a, t.b)} і ${F(t.b, t.a)}${asMixed(t.b, t.a)}`;
    if (t.kind === 'nat') return `${t.n} і ${F(1, t.n)}`;
    if (t.kind === 'mixed') { const P = t.w * t.d + t.n; return `${MX(t.w, t.n, t.d)} = ${F(P, t.d)}, обернене: ${F(t.d, P)}`; }
    const g = gcdI(t.k, t.den);
    return `${decStr(t.k, t.den)} = ${F(t.k, t.den)}${g > 1 ? ` = ${F(t.k / g, t.den / g)}` : ''}, обернене: ${F(t.den / g, t.k / g)}${asMixed(t.den, t.k)}`;
  },
});
