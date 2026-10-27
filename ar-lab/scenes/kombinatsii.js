/* Сцена 5. Комбінації тіл: вписана й описана призми, вписані куля і конус; співвідношення об'ємів */
Lab.register({
  id: 'kombinatsii',
  title: 'Циліндр і інші тіла',
  goal: 'Порівняйте циліндр з вписаними й описаними тілами. Збільшуйте кількість сторін призми — до чого наближається її об’єм?',
  modes: { key: 'mode', options: [['in', 'Вписана призма'], ['out', 'Описана призма'], ['sphere', 'Вписана куля'], ['cone', 'Вписаний конус']] },
  params: [
    { key: 'n', vr: 'n', label: 'Кількість сторін основи n', min: 3, max: 24, step: 1, value: 6, vrStep: 1, show: s => s.mode === 'in' || s.mode === 'out', format: v => String(v) },
    { key: 'r', vr: 'r', label: 'Радіус r', min: .4, max: 1.1, step: .05, value: .8, vrStep: 2 },
    { key: 'h', vr: 'h', label: 'Висота h', min: .6, max: 2.2, step: .05, value: 1.6, vrStep: 2, show: s => s.mode !== 'sphere' },
  ],
  toggles: [{ key: 'labels', label: 'Підписи' }],
  build(root, s, L) {
    const { V, THREE, COLORS: C } = L, r = s.r, n = s.n, h = s.mode === 'sphere' ? 2 * r : s.h;
    const solid = (g, pos, color = C.inner, opacity = .9) => {
      const m = L.mesh(g, L.mat(color, opacity, { flatShading: true }), pos); root.add(m);
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(g, 20), new THREE.LineBasicMaterial({ color: C.edge }));
      e.position.copy(m.position); e.rotation.copy(m.rotation); root.add(e);
      return m;
    };
    if (s.mode === 'out') { // циліндр усередині, призма прозора
      L.cylinder(root, r, h, { opacity: .85, baseOpacity: .9 });
      const R = r / Math.cos(Math.PI / n); // радіус описаного кола, щоб апофема дорівнювала r
      solid(new THREE.CylinderGeometry(R, R, h, n), V(0, h / 2, 0), C.inner, .3);
    } else {
      L.cylinder(root, r, h, { opacity: .2, baseOpacity: .2 });
      if (s.mode === 'in') solid(new THREE.CylinderGeometry(r, r, h, n), V(0, h / 2, 0));
      if (s.mode === 'sphere') { const m = L.mesh(new THREE.SphereGeometry(r, 48, 32), L.mat(C.inner, .9), V(0, r, 0)); root.add(m); root.add(L.ring(r, r, C.edge, .01)); }
      if (s.mode === 'cone') solid(new THREE.ConeGeometry(r, h, 72), V(0, h / 2, 0));
    }
    root.add(L.dash(V(0, -.3, 0), V(0, h + .3, 0)));
    if (s.labels) {
      root.add(L.rod(V(0, 0, 0), V(r, 0, 0), C.radius, .014), L.label('r', V(r / 2, -.14, 0), { italic: true, color: C.radius }));
      if (s.mode === 'sphere') root.add(L.label('h = 2r', V(r + .3, r, 0), { italic: true }));
      else root.add(L.label('h', V(-r - .15, h / 2, 0), { italic: true }));
    }
  },
  info(s) {
    const { fmt } = Lab.L, P = Math.PI, r = s.r, n = s.n, h = s.mode === 'sphere' ? 2 * r : s.h, Vc = P * r * r * h;
    const pct = x => fmt(x * 100, 1) + '%';
    if (s.mode === 'in') {
      const Vp = n / 2 * r * r * Math.sin(2 * P / n) * h;
      return {
        rows: [['V циліндра = πr²h', fmt(Vc)], ['V призми = (n/2)·r²·sin(360°/n)·h', fmt(Vp)], ['V призми / V циліндра', pct(Vp / Vc)]],
        note: 'Вершини основ призми лежать на колах основ циліндра, бічні ребра — твірні. Зі збільшенням n об’єм вписаної призми наближається до πr²h.',
      };
    }
    if (s.mode === 'out') {
      const Vp = n * r * r * Math.tan(P / n) * h;
      return {
        rows: [['V циліндра = πr²h', fmt(Vc)], ['V призми = n·r²·tg(180°/n)·h', fmt(Vp)], ['V призми / V циліндра', pct(Vp / Vc)]],
        note: 'Бічні грані описаної призми дотикаються до циліндра по твірних. Об’єм описаної призми більший за об’єм циліндра, а вписаної — менший: циліндр «затиснутий» між ними.',
      };
    }
    if (s.mode === 'sphere') {
      const Vs = 4 / 3 * P * r ** 3;
      return {
        rows: [['V циліндра = 2πr³', fmt(Vc)], ['V кулі = 4/3·πr³', fmt(Vs)], ['V кулі / V циліндра', '2/3'], ['S сфери = 4πr²', fmt(4 * P * r * r)], ['S біч циліндра = 2πr·2r', fmt(4 * P * r * r)]],
        note: 'Кулю можна вписати лише в рівносторонній циліндр (h = 2r). Теорема Архімеда: об’єм кулі — 2/3 об’єму циліндра, а площа сфери дорівнює площі бічної поверхні циліндра.',
      };
    }
    return {
      rows: [['V циліндра = πr²h', fmt(Vc)], ['V конуса = 1/3·πr²h', fmt(Vc / 3)], ['V конуса / V циліндра', '1/3']],
      note: 'Конус і циліндр мають спільну основу й рівні висоти. Об’єм конуса втричі менший — три такі конуси «заповнять» циліндр.',
    };
  },
});
