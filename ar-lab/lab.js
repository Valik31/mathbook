/*
 * AR/VR-лабораторія MathBook — спільний рушій для сцен A-Frame.
 *
 * Кожна сцена — окремий файл у папці scenes/, який викликає Lab.register({...}):
 *   id, title, goal   — назва і мета сцени (видно на панелі)
 *   params            — повзунки: [{ key, label, min, max, step, value, show(s), format(v), vr — коротка назва для VR }]
 *   modes             — перемикач режимів: { key, options: [[значення, підпис], ...] }
 *   toggles           — прапорці: [{ key, label, value }]
 *   actions           — кнопки: [{ label, run(s) }]
 *   play              — анімація параметра: { key, label, duration (с) }
 *   view              — початковий поворот моделі, наприклад '10 0 0' (необов'язково)
 *   build(root, s, L) — будує модель у групі THREE root за станом s (L — помічники нижче)
 *   info(s)           — { rows: [[формула, значення], ...], note: 'текст' }
 *
 * Сторінка сцени лише підключає A-Frame, цей файл, файл сцени і викликає Lab.init('id').
 * Режими: звичайний (комп'ютер/телефон), VR (окуляри, Cardboard), AR (WebXR на Android)
 * і AR з маркером Hiro (AR.js, працює й на iPhone) — Lab.init('id', { marker: true }).
 */
(function () {
  const THREE = AFRAME.THREE;
  const SCENES = {};
  const COLORS = {
    body: '#2646D4', base: '#6F86F0', edge: '#1A2140', axis: '#5A6384',
    gen: '#D33F37', radius: '#1B8A57', section: '#FFB000', plane: '#6C4BC7', inner: '#F28C28',
  };
  const fmt = (x, d = 2) => (Math.round(x * 10 ** d) / 10 ** d).toString().replace('.', ',');

  /* ---------- помічники для побудови моделей ---------- */
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  function mat(color, opacity = 1, extra = {}) {
    return new THREE.MeshStandardMaterial(Object.assign({
      color, side: THREE.DoubleSide, transparent: opacity < 1, opacity, depthWrite: opacity >= 1, roughness: .55, metalness: .05,
    }, extra));
  }
  function mesh(geom, material, pos) {
    const m = new THREE.Mesh(geom, material);
    if (pos) m.position.copy(pos);
    return m;
  }
  // Товстий відрізок (WebGL не малює ліній, ширших за 1 px)
  function rod(a, b, color, radius = .022) {
    const dir = new THREE.Vector3().subVectors(b, a), len = dir.length();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, Math.max(len, 1e-4), 10), mat(color));
    m.position.copy(a).addScaledVector(dir, .5);
    m.quaternion.setFromUnitVectors(V(0, 1, 0), dir.normalize());
    return m;
  }
  function line(points, color, dashed = false) {
    const g = new THREE.BufferGeometry().setFromPoints(points);
    const m = dashed ? new THREE.LineDashedMaterial({ color, dashSize: .08, gapSize: .06 }) : new THREE.LineBasicMaterial({ color });
    const l = new THREE.Line(g, m);
    if (dashed) l.computeLineDistances();
    return l;
  }
  const dash = (a, b, color = COLORS.axis) => line([a, b], color, true);
  // Коло (або дуга) радіуса r у горизонтальній площині на висоті y
  function arcPoints(r, y, from = 0, to = Math.PI * 2, n = 96) {
    return Array.from({ length: n + 1 }, (_, i) => { const t = from + (to - from) * i / n; return V(r * Math.cos(t), y, -r * Math.sin(t)); });
  }
  // Коло з «трубки» — добре видно і в окулярах
  function ring(r, y, color = COLORS.edge, radius = .014) {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, radius, 8, 96), mat(color));
    m.rotation.x = Math.PI / 2; m.position.y = y;
    return m;
  }
  function tube(points, color, radius = .014, closed = false) {
    const curve = new THREE.CatmullRomCurve3(points, closed);
    return new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(points.length * 2, 16), radius, 8, closed), mat(color));
  }
  function dot(p, color = COLORS.edge, r = .045) { return mesh(new THREE.SphereGeometry(r, 16, 12), mat(color), p); }

  // Підпис, що завжди повернутий до глядача (кирилиця малюється через canvas)
  function label(text, pos, o = {}) {
    const size = o.size || .16, px = 96, pad = o.bg === false ? 4 : 22;
    const font = `${o.italic ? 'italic ' : ''}${o.weight || 600} ${px}px ${o.italic ? '"Times New Roman", Georgia, serif' : '"Golos Text", system-ui, sans-serif'}`;
    const c = document.createElement('canvas'), x = c.getContext('2d');
    x.font = font;
    const w = Math.ceil(x.measureText(text).width) + pad * 2, h = px + pad * 1.4;
    c.width = w; c.height = h;
    x.font = font; x.textBaseline = 'middle'; x.textAlign = 'center';
    if (o.bg !== false) { x.fillStyle = o.bg || 'rgba(255,255,255,.88)'; roundRect(x, 0, 0, w, h, h * .3); x.fill(); }
    x.fillStyle = o.color || COLORS.edge; x.fillText(text, w / 2, h / 2 + px * .04);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    s.scale.set(size * w / h, size, 1); s.position.copy(pos); s.renderOrder = 10;
    return s;
  }
  function roundRect(x, l, t, w, h, r) { x.beginPath(); x.moveTo(l + r, t); x.arcTo(l + w, t, l + w, t + h, r); x.arcTo(l + w, t + h, l, t + h, r); x.arcTo(l, t + h, l, t, r); x.arcTo(l, t, l + w, t, r); x.closePath(); }

  // Плоский многокутник (переріз): точки в одній площині, віяло від центра
  function polygon(points, color, opacity = .85) {
    const c = points.reduce((a, p) => a.add(p), V(0, 0, 0)).multiplyScalar(1 / points.length);
    const pos = [];
    for (let i = 0; i < points.length; i++) { const a = points[i], b = points[(i + 1) % points.length]; pos.push(c.x, c.y, c.z, a.x, a.y, a.z, b.x, b.y, b.z); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
    return new THREE.Mesh(g, mat(color, opacity, { roughness: .8 }));
  }
  // Бічна поверхня циліндра (відкрита), основи і краї — найчастіше потрібне в сценах
  function cylinder(root, r, h, o = {}) {
    root.add(mesh(new THREE.CylinderGeometry(r, r, h, 72, 1, true), mat(o.color || COLORS.body, o.opacity ?? .3), V(0, h / 2, 0)));
    if (o.bases !== false) for (const y of [0, h]) {
      const b = mesh(new THREE.CircleGeometry(r, 72), mat(o.baseColor || COLORS.base, o.baseOpacity ?? .35), V(0, y, 0));
      b.rotation.x = -Math.PI / 2; root.add(b);
    }
    if (o.edges !== false) { root.add(ring(r, 0)); root.add(ring(r, h)); }
  }

  const L = { THREE, V, mat, mesh, rod, line, dash, arcPoints, ring, tube, dot, label, polygon, cylinder, COLORS, fmt };

  /* ---------- текстура з текстом для дошки у VR ---------- */
  function textCanvas(w, h, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  function planeWithTexture(w, h, tex) {
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  }

  /* ---------- обертання моделі мишкою/пальцем і масштаб коліщатком/щипком ---------- */
  AFRAME.registerComponent('lab-drag', {
    init() {
      const el = this.el, scene = el.sceneEl, model = document.getElementById('model'), pts = new Map();
      let pinch = 0;
      const canvasReady = () => {
        const cv = scene.canvas;
        cv.style.touchAction = 'none';
        cv.addEventListener('pointerdown', e => { pts.set(e.pointerId, [e.clientX, e.clientY]); });
        window.addEventListener('pointerup', e => { pts.delete(e.pointerId); pinch = 0; });
        window.addEventListener('pointercancel', e => { pts.delete(e.pointerId); pinch = 0; });
        cv.addEventListener('pointermove', e => {
          if (!pts.has(e.pointerId) || scene.is('vr-mode')) return;
          const [px, py] = pts.get(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]);
          if (pts.size === 2) {
            const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
            if (pinch) zoom((pinch - d) * .01);
            pinch = d; return;
          }
          const r = el.object3D.rotation;
          r.y += (e.clientX - px) * .01;
          r.x = Math.max(-1.3, Math.min(1.3, r.x + (e.clientY - py) * .006));
        });
        cv.addEventListener('wheel', e => { e.preventDefault(); zoom(e.deltaY * .003); }, { passive: false });
      };
      const zoom = dz => { if (Lab.marker) return; const p = model.object3D.position; p.z = Math.max(-9, Math.min(-1.6, p.z - dz)); };
      if (scene.canvas) canvasReady(); else scene.addEventListener('render-target-loaded', canvasReady);
    },
  });

  /* ---------- поведінка при вході у VR/AR ---------- */
  AFRAME.registerComponent('lab-xr', {
    init() {
      const scene = this.el, model = document.getElementById('model'), board = document.getElementById('board');
      let saved = null;
      scene.addEventListener('enter-vr', () => {
        const ar = scene.is('ar-mode');
        saved = { pos: model.object3D.position.clone(), scale: model.object3D.scale.clone(), bg: scene.object3D.background };
        document.body.classList.add(ar ? 'in-ar' : 'in-vr');
        if (ar) { // модель «на столі»: зменшена, перед телефоном; торкніться поверхні, щоб переставити
          scene.object3D.background = null;
          model.object3D.scale.setScalar(.25); model.object3D.position.set(0, .7, -1.1);
        } else {
          model.object3D.position.set(0, .2, -3); board.object3D.visible = true;
          Lab.refresh();
        }
      });
      scene.addEventListener('exit-vr', () => {
        document.body.classList.remove('in-ar', 'in-vr');
        board.object3D.visible = false;
        if (saved) { model.object3D.position.copy(saved.pos); model.object3D.scale.copy(saved.scale); scene.object3D.background = saved.bg; }
      });
    },
  });

  /* ---------- підлога з сіткою (ховається в AR) ---------- */
  AFRAME.registerComponent('lab-floor', {
    init() {
      const g = new THREE.GridHelper(24, 48, 0x9aa7d6, 0xc9d1ec);
      g.material.transparent = true; g.material.opacity = .7;
      this.el.setObject3D('mesh', g);
    },
  });

  /* ---------- сама модель: перебудовується, коли змінюється стан ---------- */
  AFRAME.registerComponent('lab-content', {
    init() { this.root = new THREE.Group(); this.el.setObject3D('mesh', this.root); Lab._content = this; this.rebuild(); },
    rebuild() {
      const root = this.root;
      root.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } });
      root.clear();
      Lab.spec.build(root, Lab.state, L);
    },
    tick(t, dt) {
      const p = Lab.spec.play;
      if (!p || !Lab.playing) return;
      const q = Lab.spec.params.find(x => x.key === p.key);
      let v = Lab.state[p.key] + (q.max - q.min) * dt / 1000 / p.duration;
      if (v >= q.max) { v = q.max; Lab.playing = false; }
      Lab.set(p.key, v, true);
    },
  });

  /* ---------- розмітка сцени і панелі ---------- */
  function sceneMarkup(marker, spec) {
    // панель не має затуляти модель: на широкому екрані модель праворуч, на телефоні — вище й далі
    const pos = marker ? '0 0 0' : innerWidth > 760 ? '.9 .25 -3.6' : innerWidth < innerHeight ? '0 1.5 -5.5' : '0 .25 -4.5';
    const model = `<a-entity id="model" position="${pos}" ${marker ? 'scale=".45 .45 .45"' : ''}>
        <a-entity id="spin" position="0 1.1 0" rotation="${marker ? '0 0 0' : spec.view || '18 -25 0'}" lab-drag>
          <a-entity id="content" position="0 -1.1 0" lab-content></a-entity></a-entity></a-entity>`;
    if (marker) return `<a-scene embedded arjs="sourceType: webcam; debugUIEnabled: false; cameraParametersUrl: data/camera_para.dat"
        vr-mode-ui="enabled: false" renderer="logarithmicDepthBuffer: true; antialias: true" lab-xr>
        <a-entity light="type: ambient; intensity: .8"></a-entity><a-entity light="type: directional; intensity: .8" position="1 3 2"></a-entity>
        <a-marker type="pattern" url="data/patt.hiro">${model}</a-marker><a-entity camera></a-entity><a-entity id="board"></a-entity></a-scene>`;
    return `<a-scene background="color: #EEF1FA" renderer="antialias: true; colorManagement: true"
        xr-mode-ui="XRMode: xr; cardboardModeEnabled: true"
        webxr="optionalFeatures: hit-test, local-floor, dom-overlay; overlayElement: #ui"
        ar-hit-test="target: #model; type: footprint" cursor="rayOrigin: mouse" raycaster="objects: .clickable" lab-xr>
        <a-entity light="type: ambient; intensity: .75"></a-entity>
        <a-entity light="type: directional; intensity: .9" position="2 4 3"></a-entity>
        <a-entity light="type: directional; intensity: .35" position="-3 2 -2"></a-entity>
        <a-entity lab-floor hide-on-enter-ar></a-entity>
        <a-entity id="rig">
          <a-entity id="cam" camera position="0 1.6 0" look-controls="enabled: false" wasd-controls="enabled: false"></a-entity>
          <a-entity laser-controls="hand: right" raycaster="objects: .clickable; far: 20"></a-entity>
          <a-entity laser-controls="hand: left" raycaster="objects: .clickable; far: 20"></a-entity>
        </a-entity>
        ${model}
        <a-entity id="board" position="2.25 1.55 -2.6" rotation="0 -35 0" visible="false"></a-entity>
      </a-scene>`;
  }

  function panelMarkup(spec, marker) {
    const p = spec;
    const modes = p.modes ? `<div class="lab-modes">${p.modes.options.map(([v, l]) => `<button data-mode="${v}">${l}</button>`).join('')}</div>` : '';
    const params = p.params.map(q => `<label class="lab-range" data-param="${q.key}"><span>${q.label} <b id="v-${q.key}"></b></span>
        <input type="range" min="${q.min}" max="${q.max}" step="${q.step}" id="in-${q.key}"></label>`).join('');
    const toggles = (p.toggles || []).map(t => `<label class="lab-check"><input type="checkbox" data-toggle="${t.key}"> ${t.label}</label>`).join('');
    const actions = [p.play ? `<button class="lab-btn" id="play">▶ ${p.play.label}</button>` : '', ...(p.actions || []).map((a, i) => `<button class="lab-btn ghost" data-action="${i}">${a.label}</button>`)].join('');
    const others = Object.values(SCENES).filter(s => s.id !== p.id);
    return `<div id="ui">
      <header class="lab-top">
        <a class="lab-back" href="${marker ? 'index.html#marker' : 'index.html'}">← Лабораторія</a>
        <b class="lab-title">${p.title}</b>
        <button class="lab-btn ghost sm" id="hide">Панель</button>
      </header>
      <aside class="lab-panel" id="panel">
        ${marker ? `<p class="lab-hint">Наведіть камеру на маркер <b>Hiro</b> (надрукований або на іншому екрані).
          ${others.length ? `<select id="pick">${Object.values(SCENES).map(s => `<option value="${s.id}" ${s.id === p.id ? 'selected' : ''}>${s.title}</option>`).join('')}</select>` : ''}</p>` : ''}
        <p class="lab-goal">${p.goal}</p>
        ${modes}${params}
        ${toggles ? `<div class="lab-checks">${toggles}</div>` : ''}
        ${actions ? `<div class="lab-actions">${actions}</div>` : ''}
        <table class="lab-info" id="info"></table>
        <p class="lab-note" id="note"></p>
        ${marker ? '' : `<details class="lab-help"><summary>Як керувати</summary>
          <p><b>Комп’ютер:</b> тягніть мишкою — модель обертається, коліщатко — ближче/далі.</p>
          <p><b>Телефон:</b> тягніть пальцем, щипок — масштаб. Кнопка <b>AR</b> (Android, Chrome) ставить модель на стіл: торкніться поверхні, щоб переставити.</p>
          <p><b>VR-окуляри або Cardboard:</b> кнопка <b>VR</b> праворуч унизу. Праворуч від моделі з’явиться дошка з формулами і кнопками — натискайте їх променем контролера.</p></details>`}
      </aside></div>`;
  }

  /* ---------- дошка з формулами й кнопками для VR ---------- */
  function buildBoard() {
    const board = document.getElementById('board');
    if (!board || Lab.marker) return;
    const W = 1.5, info = planeWithTexture(W, 1.03, new THREE.Texture());
    info.position.y = .38;
    board.setObject3D('mesh', info);
    Lab._board = info;
    const btns = [];
    const sp = Lab.spec;
    if (sp.modes) sp.modes.options.forEach(([v, l]) => btns.push([l, () => Lab.set(sp.modes.key, v)]));
    sp.params.forEach(q => {
      const name = q.vr || q.label; // коротка назва для кнопки у VR
      btns.push([`${name} −`, () => Lab.set(q.key, Lab.state[q.key] - q.step * (q.vrStep || 10))]);
      btns.push([`${name} +`, () => Lab.set(q.key, Lab.state[q.key] + q.step * (q.vrStep || 10))]);
    });
    (sp.toggles || []).forEach(t => btns.push([t.label, () => Lab.set(t.key, !Lab.state[t.key])]));
    if (sp.play) btns.push(['▶ ' + sp.play.label, () => Lab.togglePlay()]);
    (sp.actions || []).forEach(a => btns.push([a.label, () => { a.run(Lab.state); Lab.refresh(); }]));
    const cols = 3, bw = W / cols - .03, bh = .16;
    btns.forEach(([text, fn], i) => {
      const e = document.createElement('a-entity');
      e.classList.add('clickable');
      const tex = textCanvas(384, 96, (x, w, h) => {
        x.fillStyle = '#1A2140'; roundRect(x, 0, 0, w, h, 22); x.fill();
        x.fillStyle = '#fff'; x.font = '600 34px "Golos Text", system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText(text.length > 22 ? text.slice(0, 21) + '…' : text, w / 2, h / 2);
      });
      e.setObject3D('mesh', planeWithTexture(bw, bh, tex));
      e.object3D.position.set(-W / 2 + (i % cols + .5) * (W / cols), -.25 - Math.floor(i / cols) * (bh + .03), .01);
      e.addEventListener('click', fn);
      e.addEventListener('mouseenter', () => e.object3D.scale.setScalar(1.07));
      e.addEventListener('mouseleave', () => e.object3D.scale.setScalar(1));
      board.appendChild(e);
    });
  }
  function drawBoard(info) {
    if (!Lab._board || !document.body.classList.contains('in-vr')) return; // дошку видно лише у VR
    const tex = textCanvas(1024, 704, (x, w, h) => {
      x.fillStyle = 'rgba(255,255,255,.94)'; roundRect(x, 0, 0, w, h, 36); x.fill();
      x.fillStyle = '#2646D4'; x.font = '700 50px "Golos Text", system-ui, sans-serif'; x.fillText(Lab.spec.title, 40, 74);
      x.font = '500 40px "Golos Text", system-ui, sans-serif';
      info.rows.slice(0, 8).forEach(([f, v], i) => {
        x.fillStyle = '#1A2140'; x.fillText(f, 40, 150 + i * 56);
        x.textAlign = 'right'; x.fillStyle = '#2646D4'; x.fillText(v, w - 40, 150 + i * 56); x.textAlign = 'left';
      });
      if (info.note) {
        x.fillStyle = '#5A6384'; x.font = '400 30px "Golos Text", system-ui, sans-serif';
        wrap(x, info.note, 40, 150 + Math.min(info.rows.length, 8) * 56 + 6, w - 80, 38);
      }
    });
    const m = Lab._board.material; if (m.map) m.map.dispose(); m.map = tex; m.needsUpdate = true;
  }
  function wrap(x, text, l, t, maxW, lh) {
    let lineText = '';
    for (const word of text.split(' ')) {
      const test = lineText ? lineText + ' ' + word : word;
      if (x.measureText(test).width > maxW && lineText) { x.fillText(lineText, l, t); t += lh; lineText = word; } else lineText = test;
    }
    if (lineText) x.fillText(lineText, l, t);
  }

  /* ---------- стан і синхронізація панелі ---------- */
  const Lab = {
    L, playing: false, marker: false,
    register(spec) { SCENES[spec.id] = spec; },
    init(id, opts = {}) {
      const spec = SCENES[id] || Object.values(SCENES)[0];
      Lab.spec = spec; Lab.marker = !!opts.marker;
      Lab.state = {};
      if (spec.modes) Lab.state[spec.modes.key] = spec.modes.options[0][0];
      spec.params.forEach(q => Lab.state[q.key] = q.value);
      (spec.toggles || []).forEach(t => Lab.state[t.key] = t.value !== false);
      document.title = spec.title + ' · AR/VR-лабораторія';
      document.body.classList.toggle('marker', Lab.marker);
      document.body.insertAdjacentHTML('beforeend', panelMarkup(spec, Lab.marker) + sceneMarkup(Lab.marker, spec));
      Lab.bindPanel();
      const scene = document.querySelector('a-scene');
      const start = () => { buildBoard(); Lab.refresh(); };
      if (scene.hasLoaded) start(); else scene.addEventListener('loaded', start);
    },
    bindPanel() {
      const sp = Lab.spec;
      sp.params.forEach(q => { $(`#in-${q.key}`).addEventListener('input', e => Lab.set(q.key, +e.target.value)); });
      document.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => Lab.set(sp.modes.key, b.dataset.mode));
      document.querySelectorAll('[data-toggle]').forEach(c => c.onchange = () => Lab.set(c.dataset.toggle, c.checked));
      document.querySelectorAll('[data-action]').forEach(b => b.onclick = () => { sp.actions[+b.dataset.action].run(Lab.state); Lab.refresh(); });
      if ($('#play')) $('#play').onclick = () => Lab.togglePlay();
      $('#hide').onclick = () => document.body.classList.toggle('panel-hidden');
      if ($('#pick')) $('#pick').onchange = e => { location.search = '?s=' + e.target.value; };
    },
    togglePlay() {
      const p = Lab.spec.play, q = Lab.spec.params.find(x => x.key === p.key);
      if (!Lab.playing && Lab.state[p.key] >= q.max) Lab.state[p.key] = q.min; // з початку
      Lab.playing = !Lab.playing; Lab.refresh();
    },
    set(key, value, fromPlay) {
      const q = Lab.spec.params.find(x => x.key === key);
      if (q) value = Math.max(q.min, Math.min(q.max, Math.round(value / q.step) * q.step));
      if (!fromPlay && Lab.spec.play && key === Lab.spec.play.key) Lab.playing = false;
      Lab.state[key] = value;
      Lab.refresh();
    },
    refresh() {
      const s = Lab.state, sp = Lab.spec;
      sp.params.forEach(q => {
        const box = document.querySelector(`[data-param="${q.key}"]`);
        box.hidden = q.show ? !q.show(s) : false;
        $(`#in-${q.key}`).value = s[q.key];
        $(`#v-${q.key}`).textContent = q.format ? q.format(s[q.key]) : fmt(s[q.key]);
      });
      document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('on', b.dataset.mode === s[sp.modes.key]));
      document.querySelectorAll('[data-toggle]').forEach(c => c.checked = !!s[c.dataset.toggle]);
      if ($('#play')) $('#play').textContent = (Lab.playing ? '❚❚ Пауза' : '▶ ' + sp.play.label);
      const info = sp.info(s);
      $('#info').innerHTML = info.rows.map(([f, v]) => `<tr><td>${f}</td><td>${v}</td></tr>`).join('');
      $('#note').textContent = info.note || '';
      if (Lab._content) Lab._content.rebuild();
      drawBoard(info);
    },
  };
  const $ = s => document.querySelector(s);
  window.Lab = Lab;
})();
