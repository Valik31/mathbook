/* Сцена 3. Розгортка циліндра: бічна поверхня розгортається в прямокутник 2πr × h, основи відкидаються */
Lab.register({
  id: 'rozghortka',
  title: 'Розгортка циліндра',
  goal: 'Розріжте бічну поверхню по твірній і розгорніть її на площину. Яка фігура вийде? Чому дорівнюють її сторони?',
  params: [
    { key: 't', vr: 'Розгортка', label: 'Розгортання', min: 0, max: 1, step: .01, value: 0, vrStep: 10, format: v => Math.round(v * 100) + '%' },
    { key: 'r', label: 'Радіус r', min: .3, max: .9, step: .05, value: .6, vrStep: 2 },
    { key: 'h', label: 'Висота h', min: .6, max: 2, step: .05, value: 1.3, vrStep: 2 },
  ],
  toggles: [{ key: 'bases', label: 'Основи' }, { key: 'lines', label: 'Твірні-сітка' }, { key: 'labels', label: 'Підписи' }],
  play: { key: 't', label: 'Розгорнути', duration: 4 },
  view: '12 -15 0',
  build(root, s, L) {
    const { V, THREE, COLORS: C } = L, r = s.r, h = s.h, t = s.t, k = 1 - t;
    // Точка бічної поверхні з дугою u від «нерухомої» задньої твірної: при k = 1 — циліндр, при k → 0 — площина
    const at = (u, y) => {
      if (k < 1e-4) return V(u, y, 0);
      const R = r / k, a = u / R;
      return V(R * Math.sin(a), y, R * (1 - Math.cos(a)));
    };
    const U = 96, half = Math.PI * r, pos = [], idx = [];
    for (let i = 0; i <= U; i++) { const u = -half + 2 * half * i / U; for (const y of [0, h]) { const p = at(u, y); pos.push(p.x, p.y, p.z); } }
    for (let i = 0; i < U; i++) { const a = 2 * i; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    root.add(new THREE.Mesh(g, L.mat(C.body, .4)));
    // краї: нижня й верхня лінії та дві твірні по розрізу
    const edge = y => Array.from({ length: U + 1 }, (_, i) => at(-half + 2 * half * i / U, y));
    root.add(L.tube(edge(0), C.edge, .012), L.tube(edge(h), C.edge, .012));
    root.add(L.rod(at(-half, 0), at(-half, h), C.gen, .025), L.rod(at(half, 0), at(half, h), C.gen, .025));
    if (s.lines) for (let j = 1; j < 12; j++) { const u = -half + 2 * half * j / 12; root.add(L.line([at(u, 0), at(u, h)], C.edge, true)); }
    // основи «відкидаються» на петлях у точках дотику з нерухомою твірною
    if (s.bases) for (const [y, sign] of [[h, -1], [0, 1]]) {
      const hinge = new THREE.Group(); hinge.position.set(0, y, 0); hinge.rotation.x = sign * t * Math.PI / 2;
      const disk = L.mesh(new THREE.CircleGeometry(r, 72), L.mat(C.base, .55), V(0, 0, r)); disk.rotation.x = -Math.PI / 2;
      const rim = L.ring(r, 0); rim.position.z = r;
      hinge.add(disk, rim); root.add(hinge);
    }
    if (s.labels) {
      if (t > .85) {
        root.add(L.label('2πr', V(half * .55, -.16, .02), { italic: true, color: C.edge }));
        root.add(L.label('h', V(half + .16, h / 2, .02), { italic: true, color: C.gen }));
        if (s.bases) root.add(L.label('r', V(r / 2, h + r + .14, .02), { italic: true, color: C.radius }), L.rod(V(0, h + r, .01), V(r, h + r, .01), C.radius, .015));
      } else root.add(L.label('розріз по твірній', V(0, h + .25, 2 * r * Math.max(k, .3)), { size: .12, color: C.gen }));
    }
  },
  info(s) {
    const { fmt } = Lab.L, P = Math.PI, r = s.r, h = s.h;
    return {
      rows: [
        ['Довжина прямокутника = 2πr', fmt(2 * P * r)], ['Ширина прямокутника = h', fmt(h)],
        ['S біч = 2πr · h', fmt(2 * P * r * h)], ['S двох основ = 2πr²', fmt(2 * P * r * r)],
        ['S повн = 2πrh + 2πr²', fmt(2 * P * r * (h + r))],
      ],
      note: s.t >= 1
        ? 'Розгортка бічної поверхні — прямокутник: одна сторона дорівнює довжині кола основи 2πr, інша — висоті h. Тому S біч = 2πrh.'
        : 'Довжина дуги під час розгортання не змінюється: нижній край перетвориться на відрізок завдовжки 2πr.',
    };
  },
});
