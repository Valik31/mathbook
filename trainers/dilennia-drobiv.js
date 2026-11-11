/*
 * Тренажер «Ділення дробів» — у блоці «Від учителя».
 * Правила: a/b : m/n = a/b · n/m  і  a : m/n = a · n/m.
 * «Другий дріб переверни — і множ! Не забудь скоротити результат.»
 * Як описати тренажер — див. коментар до MB.trainer у js/core.js.
 */
MB.trainer('Ділення дробів', {
  teacher: true,
  desc: 'Другий дріб переверни — і множ! Дріб на дріб і число на дріб.',
  hint: t => t.kind === 'ff'
    ? 'Перший дріб залиш, другий переверни і заміни ділення множенням.'
    : 'Число залиш, дріб переверни і заміни ділення множенням.',
  make() {
    const proper = () => { let n, d; do { d = ri(2, 9); n = ri(1, d - 1); } while (gcdI(n, d) !== 1); return [n, d]; };
    if (Math.random() < 0.7) { // дріб : дріб
      let a, b, m, n;
      do { [a, b] = proper(); [m, n] = proper(); } while ((a * n) % (b * m) === 0 || (a === m && b === n)); // без цілих відповідей
      return { kind: 'ff', a, b, m, n };
    }
    let a, m, n; // число : дріб
    do { a = ri(2, 9); [m, n] = proper(); } while ((a * n) % m === 0);
    return { kind: 'nf', a, m, n };
  },
  view(t) {
    const flip = `<span class="fr">${inp('чисельник перевернутого дробу')}${inp('знаменник перевернутого дробу')}</span>`;
    const res = `<span class="fr">${inp('чисельник результату')}${inp('знаменник результату')}</span>`;
    const note = '<span class="rc-note">Другий дріб переверни — і множ! Не забудь скоротити результат.</span>';
    const card = t.kind === 'ff'
      ? `<div class="rulecard"><span class="rc-n">Дріб на дріб</span>${F('a', 'b')}<span class="op">:</span>${F('m', 'n')}<span class="op">=</span>${F('a', 'b')}<span class="dot">·</span>${F('n', 'm')}${note}</div>`
      : `<div class="rulecard"><span class="rc-n">Число на дріб</span><i>a</i><span class="op">:</span>${F('m', 'n')}<span class="op">=</span><i>a</i><span class="dot">·</span>${F('n', 'm')}${note}</div>`;
    const first = t.kind === 'ff' ? F(t.a, t.b) : `<span class="big-n">${t.a}</span>`;
    return `${card}<div class="eqn-row">${first}<span class="op">:</span>${F(t.m, t.n)}<span class="op">=</span>${first}<span class="dot">·</span>${flip}</div>
      <div class="eqn-row"><span class="op">=</span>${res}</div>`;
  },
  check(t, [p, q, rn, rd]) {
    const num = t.kind === 'ff' ? t.a * t.n : t.a * t.n, den = t.kind === 'ff' ? t.b * t.m : t.m;
    if (!(p === t.n && q === t.m)) {
      if (p === t.m && q === t.n) return { msg: `Другий дріб треба перевернути: ${t.m}/${t.n} → ${t.n}/${t.m}.`, bad: [0, 1] };
      return { msg: `Переверни дріб ${t.m}/${t.n}: чисельник і знаменник міняються місцями.`, bad: [0, 1] };
    }
    if (!rd || rn * den !== num * rd) {
      return { msg: t.kind === 'ff'
        ? `Тепер помнож: ${t.a} · ${t.n} у чисельнику, ${t.b} · ${t.m} у знаменнику.`
        : `Тепер помнож число на чисельник: ${t.a} · ${t.n}. Знаменник — ${t.m}.`, bad: [2, 3] };
    }
    if (gcdI(rn, rd) !== 1) return { soft: true, msg: `Правильно, але ${rn}/${rd} можна скоротити. Скороти до кінця!` };
    return { ok: true };
  },
  solution(t) {
    const num = t.a * t.n, den = t.kind === 'ff' ? t.b * t.m : t.m, g = gcdI(num, den);
    const first = t.kind === 'ff' ? F(t.a, t.b) : t.a;
    const prod = t.kind === 'ff' ? F(`${t.a} · ${t.n}`, `${t.b} · ${t.m}`) : F(`${t.a} · ${t.n}`, t.m);
    const n = num / g, d = den / g;
    return `${first} : ${F(t.m, t.n)} = ${first} · ${F(t.n, t.m)} = ${prod} = ${F(num, den)}${g > 1 ? ` = ${F(n, d)}` : ''}${n > d ? ` = ${MX(Math.floor(n / d), n % d, d)}` : ''}`;
  },
});
