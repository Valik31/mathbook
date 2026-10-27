/* Сцена 4. Перерізи циліндра площиною: осьовий, паралельний осі, перпендикулярний осі, похилий */
Lab.register({
  id: 'pererizy',
  title: 'Перерізи циліндра',
  goal: 'Оберіть, як проходить січна площина, і рухайте її повзунком. Яка фігура утворюється в перерізі і як знайти її площу?',
  modes: { key: 'mode', options: [['axial', 'Осьовий'], ['parallel', 'Паралельний осі'], ['perp', 'Перпендикулярний осі'], ['oblique', 'Похилий']] },
  params: [
    { key: 'r', label: 'Радіус r', min: .5, max: 1.1, step: .05, value: .9, vrStep: 2 },
    { key: 'h', label: 'Висота h', min: 1, max: 2.4, step: .05, value: 2, vrStep: 2 },
    { key: 'd', vr: 'd', label: 'Відстань від осі d (частка r)', min: 0, max: .95, step: .01, value: .5, vrStep: 10, show: s => s.mode === 'parallel', format: v => Math.round(v * 100) + '% r' },
    { key: 'y', vr: 'Висота перерізу', label: 'Висота перерізу (частка h)', min: .02, max: .98, step: .01, value: .5, vrStep: 10, show: s => s.mode === 'perp', format: v => Math.round(v * 100) + '% h' },
    { key: 'a', vr: 'α', label: 'Кут нахилу α (частка найбільшого)', min: 0, max: 1, step: .01, value: .6, vrStep: 10, show: s => s.mode === 'oblique',
      format: v => Math.round(v * Lab.L.maxTilt(Lab.state) * 180 / Math.PI) + '°' },
  ],
  toggles: [{ key: 'plane', label: 'Січна площина' }, { key: 'labels', label: 'Підписи' }],
  build(root, s, L) {
    const { V, THREE, COLORS: C } = L, r = s.r, h = s.h, sec = section(s);
    L.cylinder(root, r, h, { opacity: .22, baseOpacity: .25 });
    root.add(L.dash(V(0, -.3, 0), V(0, h + .3, 0)));
    root.add(L.polygon(sec.pts, C.section, .9));
    if (sec.smooth) root.add(L.tube(sec.pts, C.edge, .016, true));
    else sec.pts.forEach((p, i) => root.add(L.rod(p, sec.pts[(i + 1) % sec.pts.length], C.edge, .016)));
    if (s.plane) { // велика напівпрозора площина
      const size = Math.max(2 * r, h) + 1.2, p = L.mesh(new THREE.PlaneGeometry(size, size), L.mat(C.plane, .14), sec.center);
      p.quaternion.setFromUnitVectors(V(0, 0, 1), sec.normal); root.add(p);
      const b = new THREE.LineSegments(new THREE.EdgesGeometry(p.geometry), new THREE.LineBasicMaterial({ color: C.plane }));
      b.position.copy(p.position); b.quaternion.copy(p.quaternion); root.add(b);
    }
    if (s.labels) for (const [t, p, o] of sec.labels) root.add(L.label(t, p, o));
  },
  info(s) {
    const sec = section(s);
    return { rows: [['Фігура перерізу', sec.shape], ...sec.rows], note: sec.note };
  },
});

// Найбільший кут похилої площини через центр, за якого вона ще не перетинає основи
Lab.L.maxTilt = s => Math.atan(s.h / (2 * s.r));

function section(s) {
  const { V, fmt, COLORS: C } = Lab.L, r = s.r, h = s.h, P = Math.PI;
  const rect = (z, w) => [V(-w, 0, z), V(w, 0, z), V(w, h, z), V(-w, h, z)];
  if (s.mode === 'axial') return {
    pts: rect(0, r), center: V(0, h / 2, 0), normal: V(0, 0, 1), shape: 'прямокутник',
    rows: [['Сторони: 2r і h', `${fmt(2 * r)} × ${fmt(h)}`], ['S = 2r · h', fmt(2 * r * h)]],
    labels: [['2r', V(0, -.15, 0), { italic: true }], ['h', V(r + .15, h / 2, 0), { italic: true, color: C.gen }]],
    note: 'Осьовий переріз проходить через вісь. Це прямокутник 2r × h — найбільший з усіх перерізів, паралельних осі.',
  };
  if (s.mode === 'parallel') {
    const d = s.d * r, w = Math.sqrt(r * r - d * d);
    return {
      pts: rect(d, w), center: V(0, h / 2, d), normal: V(0, 0, 1), shape: 'прямокутник',
      rows: [['Відстань від осі d', fmt(d)], ['Ширина 2√(r² − d²)', fmt(2 * w)], ['Висота h', fmt(h)], ['S = 2√(r² − d²) · h', fmt(2 * w * h)]],
      labels: [['d', V(.12, h + .12, d / 2), { italic: true, color: C.plane }], ['2√(r²−d²)', V(0, -.15, d), { italic: true }]],
      note: 'Площина, паралельна осі, перетинає циліндр по прямокутнику. Чим далі площина від осі, тим він вужчий; при d = r площина лише дотикається до циліндра.',
    };
  }
  if (s.mode === 'perp') {
    const y = s.y * h;
    return {
      pts: Lab.L.arcPoints(r, y, 0, 2 * P, 72).slice(0, -1), center: V(0, y, 0), normal: V(0, 1, 0), shape: 'круг', smooth: true,
      rows: [['Відстань від нижньої основи', fmt(y)], ['Радіус перерізу = r', fmt(r)], ['S = πr²', fmt(P * r * r)]],
      labels: [['r', V(r / 2, y + .12, 0), { italic: true, color: C.radius }]],
      note: 'Будь-який переріз, перпендикулярний осі, — круг, що дорівнює основі циліндра.',
    };
  }
  const a = s.a * Lab.L.maxTilt(s), tan = Math.tan(a), b = r / Math.cos(a);
  const pts = Array.from({ length: 72 }, (_, i) => { const t = i / 72 * 2 * P; return V(r * Math.cos(t), h / 2 + r * Math.sin(t) * tan, r * Math.sin(t)); });
  return {
    pts, smooth: true, center: V(0, h / 2, 0), normal: V(0, Math.cos(a), -Math.sin(a)), shape: a < 1e-3 ? 'круг' : 'еліпс',
    rows: [['Кут нахилу до основи α', Math.round(a * 180 / P) + '°'], ['Мала піввісь = r', fmt(r)], ['Велика піввісь = r / cos α', fmt(b)], ['S = πr² / cos α', fmt(P * r * b)]],
    labels: [['α = ' + Math.round(a * 180 / P) + '°', V(r + .35, h / 2 + .1, 0), { color: C.plane, size: .13 }]],
    note: 'Похила площина, що перетинає лише бічну поверхню, дає еліпс. Його площа більша за площу основи: S = S осн / cos α.',
  };
}
