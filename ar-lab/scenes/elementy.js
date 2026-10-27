/* Сцена 1. Елементи циліндра: основи, вісь, радіус, твірна, висота; формули площ і об'єму */
Lab.register({
  id: 'elementy',
  title: 'Елементи циліндра',
  goal: 'Розгляньте циліндр з усіх боків. Вмикайте й вимикайте елементи, змінюйте радіус і висоту — і стежте, як змінюються площі та об’єм.',
  params: [
    { key: 'r', vr: 'r', label: 'Радіус r', min: .3, max: 1.2, step: .05, value: .8, vrStep: 2 },
    { key: 'h', vr: 'h', label: 'Висота h', min: .5, max: 2.4, step: .05, value: 1.8, vrStep: 2 },
  ],
  toggles: [
    { key: 'bases', label: 'Основи' }, { key: 'axis', label: 'Вісь OO₁' }, { key: 'radius', label: 'Радіуси' },
    { key: 'gen', label: 'Твірна AA₁' }, { key: 'labels', label: 'Підписи' },
  ],
  actions: [
    { label: 'Рівносторонній (h = 2r)', run: s => { s.h = 2 * s.r; } },
  ],
  build(root, s, L) {
    const { V, COLORS: C } = L, r = s.r, h = s.h, lb = (t, p, o) => s.labels && root.add(L.label(t, p, o));
    L.cylinder(root, r, h, { bases: s.bases });
    if (s.axis) {
      root.add(L.dash(V(0, -.35, 0), V(0, h + .35, 0)));
      root.add(L.dot(V(0, 0, 0)), L.dot(V(0, h, 0)));
      lb('O', V(-.13, -.1, 0), { italic: true }); lb('O₁', V(-.15, h + .12, 0), { italic: true });
      lb('вісь', V(0, h + .5, 0), { color: C.axis, size: .13 });
    }
    const A = V(r, 0, 0), A1 = V(r, h, 0);
    if (s.radius) {
      root.add(L.rod(V(0, 0, 0), A, C.radius), L.rod(V(0, h, 0), A1, C.radius));
      lb('r', V(r / 2, -.14, 0), { italic: true, color: C.radius }); lb('r', V(r / 2, h + .13, 0), { italic: true, color: C.radius });
    }
    if (s.gen) {
      root.add(L.rod(A, A1, C.gen, .028));
      // ще кілька твірних пунктиром: усі вони рівні й паралельні осі
      for (let k = 1; k < 8; k++) { const t = k * Math.PI / 4; root.add(L.line([V(r * Math.cos(t), 0, -r * Math.sin(t)), V(r * Math.cos(t), h, -r * Math.sin(t))], C.gen, true)); }
      lb('твірна', V(r + .38, h * .62, 0), { color: C.gen, size: .13 });
      lb('h', V(r + .16, h * .4, 0), { italic: true, color: C.gen });
    }
    root.add(L.dot(A, C.gen, .04), L.dot(A1, C.gen, .04));
    lb('A', V(r + .14, -.1, 0), { italic: true }); lb('A₁', V(r + .16, h + .12, 0), { italic: true });
    if (s.bases) lb('основа', V(-r * .2, -.02, r * .55), { size: .12, color: C.body });
  },
  info(s) {
    const { fmt } = Lab.L, r = s.r, h = s.h, P = Math.PI;
    return {
      rows: [
        ['Радіус r', fmt(r)], ['Висота h', fmt(h)], ['Діаметр d = 2r', fmt(2 * r)],
        ['S осн = πr²', fmt(P * r * r)], ['S біч = 2πrh', fmt(2 * P * r * h)],
        ['S повн = 2πr(r + h)', fmt(2 * P * r * (r + h))], ['V = πr²h', fmt(P * r * r * h)],
      ],
      note: Math.abs(h - 2 * r) < 1e-6
        ? 'Рівносторонній циліндр: висота дорівнює діаметру, осьовий переріз — квадрат.'
        : 'Усі твірні циліндра рівні й паралельні осі; у прямому циліндрі висота дорівнює твірній.',
    };
  },
});
