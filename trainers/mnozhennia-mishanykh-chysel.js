/*
 * Тренажер «Множення мішаних чисел» — у блоці «Від учителя».
 * Як описати тренажер — див. коментар до MB.trainer у js/core.js.
 */
MB.trainer('Множення мішаних чисел', {
  teacher: true,
  desc: 'Перетвори мішані числа на неправильні дроби, помнож, скороти й виділи цілу частину.',
  hint: 'Розв’язуй по кроках, як у правилі. Відповідь запиши мішаним числом.',
  make() {
    const mixed = () => { let d, n; do { d = ri(2, 6); n = ri(1, d - 1); } while (gcdI(n, d) !== 1); return [ri(1, 3), n, d]; };
    let A, B, p, q;
    do {
      A = mixed(); B = mixed();
      const a = A[0] * A[2] + A[1], c = B[0] * B[2] + B[1], g = gcdI(a * c, A[2] * B[2]);
      p = a * c / g; q = A[2] * B[2] / g;
    } while (q === 1 || p > 60); // без цілих відповідей і надто великих чисел
    return { A, B, p, q };
  },
  view(t) {
    const card = `<div class="rulecard steps3"><span class="rc-n">Правило</span>
      <ol><li>Мішані числа → неправильні дроби</li><li>Множимо й скорочуємо</li><li>Виділяємо цілу частину</li></ol></div>`;
    const fracIn = (a, b) => `<span class="fr">${inp(a)}${inp(b)}</span>`;
    return `${card}<div class="eqn-row">${MX(...t.A)}<span class="op">·</span>${MX(...t.B)}<span class="op">=</span>
        ${fracIn('чисельник першого дробу', 'знаменник першого дробу')}<span class="op">·</span>${fracIn('чисельник другого дробу', 'знаменник другого дробу')}</div>
      <div class="eqn-row"><span class="op">=</span>${fracIn('чисельник добутку', 'знаменник добутку')}<span class="op">=</span>
        <span class="mx">${inp('ціла частина', 'Ц')}${fracIn('чисельник дробової частини', 'знаменник дробової частини')}</span></div>`;
  },
  check(t, [a, b, c, d, p, q, W, N, D]) {
    const [w1, n1, d1] = t.A, [w2, n2, d2] = t.B;
    if (a !== w1 * d1 + n1 || b !== d1) return { msg: `Перетвори ${w1} ${n1}/${d1}: (${w1} · ${d1}) + ${n1} = ?, знаменник ${d1}.`, bad: [0, 1] };
    if (c !== w2 * d2 + n2 || d !== d2) return { msg: `Перетвори ${w2} ${n2}/${d2}: (${w2} · ${d2}) + ${n2} = ?, знаменник ${d2}.`, bad: [2, 3] };
    if (!q || p * t.q !== t.p * q) return { msg: `Помнож: ${a} · ${c} у чисельнику, ${b} · ${d} у знаменнику.`, bad: [4, 5] };
    if (gcdI(p, q) !== 1) return { soft: true, msg: `Правильно, але ${p}/${q} можна скоротити. Скороти до кінця!` };
    if (W !== Math.floor(t.p / t.q) || N !== t.p % t.q || D !== t.q) return { msg: `Виділи цілу частину: ${t.p} : ${t.q} = ? (остача — новий чисельник).`, bad: [6, 7, 8] };
    return { ok: true };
  },
  solution(t) {
    const [w1, n1, d1] = t.A, [w2, n2, d2] = t.B, a = w1 * d1 + n1, c = w2 * d2 + n2;
    return `${MX(...t.A)} · ${MX(...t.B)} = ${F(a, d1)} · ${F(c, d2)} = ${F(a * c, d1 * d2)}${a * c !== t.p ? ` = ${F(t.p, t.q)}` : ''} = ${MX(Math.floor(t.p / t.q), t.p % t.q, t.q)}`;
  },
});
