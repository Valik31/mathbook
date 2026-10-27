/* Сцена 2. Циліндр як тіло обертання: прямокутник обертається навколо своєї сторони */
Lab.register({
  id: 'obertannia',
  title: 'Циліндр — тіло обертання',
  goal: 'Прямокутник OAA₁O₁ обертається навколо сторони OO₁. Запустіть обертання і простежте, що описує кожна сторона прямокутника.',
  params: [
    { key: 'phi', vr: 'φ', label: 'Кут повороту φ, °', min: 0, max: 360, step: 1, value: 0, vrStep: 30, format: v => Math.round(v) + '°' },
    { key: 'r', vr: 'r', label: 'Сторона OA = r', min: .4, max: 1.2, step: .05, value: .85, vrStep: 2 },
    { key: 'h', vr: 'h', label: 'Сторона OO₁ = h', min: .6, max: 2.2, step: .05, value: 1.7, vrStep: 2 },
  ],
  toggles: [{ key: 'trace', label: 'Слід обертання' }, { key: 'labels', label: 'Підписи' }],
  play: { key: 'phi', label: 'Обертати', duration: 6 },
  build(root, s, L) {
    const { V, THREE, COLORS: C } = L, r = s.r, h = s.h, f = s.phi * Math.PI / 180;
    root.add(L.dash(V(0, -.4, 0), V(0, h + .4, 0)));
    if (s.labels) root.add(L.label('вісь обертання', V(0, h + .55, 0), { size: .12, color: C.axis }));
    if (s.trace && f > 0) {
      // бічна поверхня, яку описує AA₁, і сектори основ, які описують OA та O₁A₁
      root.add(L.mesh(new THREE.CylinderGeometry(r, r, h, 72, 1, true, Math.PI / 2, f), L.mat(C.body, .3), V(0, h / 2, 0)));
      for (const y of [0, h]) {
        const m = L.mesh(new THREE.CircleGeometry(r, 72, 0, f), L.mat(C.base, .35), V(0, y, 0));
        m.rotation.x = -Math.PI / 2; root.add(m);
      }
      root.add(L.tube(L.arcPoints(r, 0, 0, f, 72), C.edge, .012), L.tube(L.arcPoints(r, h, 0, f, 72), C.edge, .012));
    }
    // сам прямокутник у поточному положенні
    const c = Math.cos(f), sn = Math.sin(f), P = (x, y) => V(x * c, y, -x * sn);
    const O = P(0, 0), O1 = P(0, h), A = P(r, 0), A1 = P(r, h);
    root.add(L.polygon([O, A, A1, O1], C.section, .55));
    root.add(L.rod(O, A, C.radius), L.rod(O1, A1, C.radius), L.rod(A, A1, C.gen, .03), L.rod(O, O1, C.edge, .018));
    root.add(L.dot(O), L.dot(O1), L.dot(A, C.gen), L.dot(A1, C.gen));
    if (s.labels) {
      const out = (x, y, dx) => P(x + dx, y);
      root.add(L.label('O', V(-.14, -.1, 0), { italic: true }), L.label('O₁', V(-.16, h + .12, 0), { italic: true }),
        L.label('A', out(r, -.1, .14), { italic: true }), L.label('A₁', out(r, h + .12, .16), { italic: true }));
    }
  },
  info(s) {
    const { fmt } = Lab.L, P = Math.PI, done = s.phi >= 360;
    return {
      rows: [
        ['Кут повороту φ', Math.round(s.phi) + '°'], ['Частина оберту', Math.round(s.phi / 3.6) + '%'],
        ['Радіус циліндра r = OA', fmt(s.r)], ['Висота циліндра h = OO₁', fmt(s.h)],
        ['Описана частина S біч = 2πrh · φ/360°', fmt(2 * P * s.r * s.h * s.phi / 360)],
      ],
      note: done
        ? 'Повний оберт: утворився циліндр. Сторона AA₁ описала бічну поверхню (вона — твірна), сторони OA і O₁A₁ — основи-круги, а OO₁ стала віссю.'
        : 'Сторона OO₁ лежить на осі й не рухається. Що опише сторона AA₁? А сторони OA і O₁A₁?',
    };
  },
});
