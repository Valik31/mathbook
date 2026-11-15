/* MathBook — рушій інтерактивних уроків (зміст уроків — у папці lessons/) */
// Зміст уроків лежить у папці lessons/, кожен файл додає урок у window.MB_LESSONS
const SLIDE_LESSONS = window.MB_LESSONS || [];
const fx = s => String(s)
  .replace(/\{(\d+) (\d+)\/(\d+)\}/g, (_, w, n, d) => `<span class="mixed">${w}${F(n, d)}</span>`)
  .replace(/\{(\d+)\/(\d+)\}/g, (_, n, d) => F(n, d));
const fxText = s => String(s).replace(/\{(\d+) (\d+)\/(\d+)\}/g, '$1 $2/$3').replace(/\{(\d+)\/(\d+)\}/g, '$1/$2');
const TASK_TYPES = ['choice', 'frac', 'area', 'tf', 'match', 'num'];
const isTask = sl => TASK_TYPES.includes(sl.type);

function startSlides(id) {
  const L = SLIDE_LESSONS.find(l => l.id === id);
  game = { slides: true, L, title: 'Урок: ' + L.title, view: 'cover', sec: 0, k: 0, tasks: {}, revealed: {}, seen: {}, area: { a: 1, b: 2, c: 1, d: 3 }, watched: {}, results: [] };
  render();
}
const slideKey = () => game.sec + '-' + game.k;
function slideScore() {
  let total = 0, correct = 0;
  game.L.sections.forEach((s, si) => s.slides.forEach((sl, k) => { if (isTask(sl)) { total++; if (game.tasks[si + '-' + k]?.first) correct++; } }));
  return { total, correct };
}
function goSlide(sec, k) { game.view = 'slide'; game.sec = sec; game.k = k; render(); window.scrollTo(0, 0); }
function slideStep(dir) {
  const secs = game.L.sections, n = secs[game.sec].slides.length;
  if (dir > 0 && game.k + 1 < n) return goSlide(game.sec, game.k + 1);
  if (dir > 0 && game.sec + 1 < secs.length) return goSlide(game.sec + 1, 0);
  if (dir < 0 && game.k > 0) return goSlide(game.sec, game.k - 1);
  if (dir < 0 && game.sec > 0) return goSlide(game.sec - 1, secs[game.sec - 1].slides.length - 1);
}

function slidesView() {
  const L = game.L, head = (back, label) => `<div class="top" style="margin:0"><button class="btn ghost sm" onclick="${back}">←&nbsp;${label}</button><b>${esc(L.title)}</b></div>`;
  if (game.view === 'cover') {
    return `<div class="stack">${head('quit()', 'Уроки')}
      <div class="cover"><div class="cover-art">${L.cover ? fx(L.cover) : `${F(2, 3)}<span>·</span>${F(3, 4)}<span>=</span>${F(1, 2)}`}</div>
        <div class="cover-text"><div class="eyebrow">${esc(L.grade || '')} · ${isVideoLesson(L) ? 'відеоурок' : 'інтерактивний урок'}</div><h1>${esc(L.title)}</h1><p>${esc(L.intro || '')}</p>
        <button class="btn" onclick="game.view='menu';render()">Почати урок</button></div></div></div>`;
  }
  if (game.view === 'menu') {
    const sc = slideScore();
    return `<div class="stack">${head("game.view='cover';render()", 'Обкладинка')}
      <h2>Зміст уроку</h2>
      <div class="hexes">${L.sections.map((s, si) => {
        const tasks = s.slides.filter(isTask).length, seen = s.slides.filter((_, k) => game.seen[si + '-' + k]).length;
        const solved = s.slides.filter((sl, k) => isTask(sl) && game.tasks[si + '-' + k]?.done).length;
        const status = tasks ? `${solved} з ${tasks} розв’язано` : seen === s.slides.length ? 'Переглянуто' : `${s.slides.length} ${s.slides.length === 1 ? 'слайд' : s.slides.length < 5 ? 'слайди' : 'слайдів'}`;
        return `<button class="hex ${seen === s.slides.length ? 'done' : ''}" onclick="goSlide(${si},0)"><span class="hg">${esc(s.glyph || si + 1)}</span><b>${esc(s.name)}</b><small>${status}</small></button>`;
      }).join('')}</div>
      <p class="muted" style="text-align:center">Завдання: ${sc.correct} з ${sc.total} правильно з першої спроби</p></div>`;
  }
  const sec = L.sections[game.sec], sl = sec.slides[game.k], key = slideKey();
  game.seen[key] = true;
  const last = game.sec === L.sections.length - 1 && game.k === sec.slides.length - 1;
  const mustWatch = sl.type === 'video' && sl.mustWatch && hasVideo(sl) && !game.watched[key]; // «Далі» — лише після перегляду
  return `<div class="stack">${head("game.view='menu';render()", 'Зміст')}
    <div class="slide-meta"><span class="pill-sec">${esc(sec.name)}</span><span class="muted">${game.k + 1} / ${sec.slides.length}</span></div>
    <div class="slide">${slideBody(sl, key)}</div>
    <div class="slide-nav"><button class="btn ghost" onclick="slideStep(-1)" ${game.sec === 0 && game.k === 0 ? 'disabled' : ''}>← Назад</button>
      ${last ? '' : `<button class="btn" id="slideNext" onclick="slideStep(1)" ${mustWatch ? 'disabled' : ''}>${game.k + 1 < sec.slides.length ? 'Далі →' : `До розділу «${esc(L.sections[game.sec + 1].name)}» →`}</button>`}</div></div>`;
}

function areaGrid(a, b, c, d) {
  let cells = '';
  for (let r = 0; r < d; r++) for (let col = 0; col < b; col++) {
    const A = col < a, C = r < c;
    cells += `<i class="${A && C ? 'ac' : A ? 'a' : C ? 'c' : ''}"></i>`;
  }
  return `<div class="area" style="grid-template-columns:repeat(${b},1fr);grid-template-rows:repeat(${d},1fr)" role="img" aria-label="Модель площі ${a}/${b} на ${c}/${d}">${cells}</div>`;
}
function areaWidget() {
  const { a, b, c, d } = game.area;
  const ctl = (k, label) => `<span class="stepper"><button onclick="areaSet('${k}',-1)" aria-label="${label} менше">−</button><b>${game.area[k]}</b><button onclick="areaSet('${k}',1)" aria-label="${label} більше">+</button></span>`;
  return `<div class="area-wrap"><div class="area-ctl">
      <div class="fr-ctl ka-t">${ctl('a', 'чисельник першого')}<hr>${ctl('b', 'знаменник першого')}</div><span class="op">·</span>
      <div class="fr-ctl kc-t">${ctl('c', 'чисельник другого')}<hr>${ctl('d', 'знаменник другого')}</div></div>
    ${areaGrid(a, b, c, d)}
    <p class="area-cap">${F(a, b)} · ${F(c, d)} = ${F(a * c, b * d)} <span class="muted">— зелених клітинок ${a * c} з ${b * d}</span></p></div>`;
}
function areaSet(k, dir) {
  const A = game.area;
  A[k] = Math.max(1, Math.min(6, A[k] + dir));
  if (A.a > A.b) A.a = A.b; if (A.c > A.d) A.c = A.d; // лише правильні дроби
  $('#areaW').innerHTML = areaWidget();
}

function answerHtml(sl) {
  if (sl.type === 'choice') return esc(sl.options[sl.answer]);
  if (sl.type === 'frac' || sl.type === 'area') return F(sl.answer[0], sl.answer[1]);
  if (sl.type === 'num') return esc(firstAnswer(sl.answer)) + (sl.unit ? ' ' + esc(sl.unit) : '');
  if (sl.type === 'tf') return sl.statements.map(([t, v]) => `${fx(t)} — <b>${v ? 'правда' : 'неправда'}</b>`).join('<br>');
  if (sl.type === 'match') return sl.pairs.map(([l, r]) => `${fx(l)} = ${fx(r)}`).join('<br>');
}
function slideBody(sl, key) {
  if (sl.type === 'video') return videoBody(sl, key);
  if (sl.type === 'theory') return `<h2>${esc(sl.title)}</h2><div class="theory">${fx(sl.html)}</div>${sl.widget === 'area' ? `<div id="areaW">${areaWidget()}</div>` : ''}`;
  if (sl.type === 'example') {
    const r = game.revealed[key] || 0;
    return `<h2>${esc(sl.title)}</h2><p class="task">${fx(sl.task)}</p>
      <ol class="steps">${sl.steps.slice(0, r).map(st => `<li>${fx(st)}</li>`).join('')}</ol>
      ${r < sl.steps.length ? `<button class="btn ghost" onclick="game.revealed['${key}']=${r + 1};render()">${r ? 'Наступний крок' : 'Показати розв’язок'} (${r + 1}/${sl.steps.length})</button>` : '<p class="fb ok">Розв’язок повний. Спробуй такий самий приклад у розділі «Завдання».</p>'}`;
  }
  if (sl.type === 'summary') {
    const sc = slideScore();
    return `<h2>${esc(sl.title)}</h2><div class="theory">${fx(sl.html)}</div>
      <div class="result-box"><div class="big">${sc.correct}/${sc.total}</div><p>завдань розв’язано правильно з першої спроби</p>
      <button class="btn" onclick="finishSlides()">Завершити урок і отримати ${sc.correct * data.xpPerAnswer} XP</button></div>`;
  }
  // завдання
  const st = game.tasks[key] || {}, n = game.L.sections[game.sec].slides.filter(isTask).indexOf(sl) + 1;
  const head = `<div class="eyebrow">Завдання ${n}</div><h2 class="tq">${fx(sl.q)}</h2>`;
  if (st.done) {
    return `${head}${sl.type === 'area' ? areaGrid(...sl.model) : ''}<div class="fb ${st.first ? 'ok' : 'no'}">${st.first ? 'Правильно з першої спроби!' : 'Розв’язано не з першої спроби.'}</div>
      <div class="answer"><b>Відповідь:</b><br>${answerHtml(sl)}${sl.explain ? `<p class="muted">${fx(sl.explain)}</p>` : ''}</div>`;
  }
  let body = '';
  if (sl.type === 'choice') body = `<div class="opts">${sl.options.map((o, i) => `<button class="opt" onclick="checkTask(${i})">${fx(o)}</button>`).join('')}</div>`;
  if (sl.type === 'frac' || sl.type === 'area') body = `${sl.type === 'area' ? areaGrid(...sl.model) : ''}<div class="eqn"><span class="fr">${inp('чисельник')}${inp('знаменник')}</span></div>`;
  if (sl.type === 'num') body = `<div class="eqn"><input class="num-in" inputmode="decimal" autocomplete="off" placeholder="?" aria-label="Відповідь">${sl.unit ? `<span class="unit">${esc(sl.unit)}</span>` : ''}</div>`;
  if (sl.type === 'tf') body = `<div class="tfs">${sl.statements.map(([t], i) => `<div class="tf" data-i="${i}"><span>${fx(t)}</span><span class="tfb"><button onclick="tfPick(this,1)">Правда</button><button onclick="tfPick(this,0)">Неправда</button></span></div>`).join('')}</div>`;
  if (sl.type === 'match') {
    const rights = shuffle(sl.pairs.map(p => p[1]));
    body = `<div class="matches">${sl.pairs.map(([l], i) => `<label class="m"><span>${fx(l)} =</span><select class="inp" data-i="${i}"><option value="">— обери —</option>${rights.map(r => `<option value="${esc(r)}">${esc(fxText(r))}</option>`).join('')}</select></label>`).join('')}</div>`;
  }
  return `${head}${body}<div class="fb" id="fb"></div>
    <div class="formrow" style="justify-content:center">${sl.type === 'choice' ? '' : '<button class="btn" onclick="checkTask()">Перевірити</button>'}
    <button class="btn ghost" id="tshow" ${st.first === false ? '' : 'hidden'} onclick="revealTask()">Показати відповідь</button></div>`;
}
function tfPick(btn, v) { const row = btn.closest('.tf'); row.dataset.v = v; row.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === btn)); row.classList.remove('bad'); }

function checkTask(choice) {
  const sl = game.L.sections[game.sec].slides[game.k], key = slideKey(), st = game.tasks[key] || (game.tasks[key] = {}), fb = $('#fb');
  let ok = false, soft = null;
  if (sl.type === 'choice') {
    ok = choice === sl.answer;
    document.querySelectorAll('.opt')[choice].classList.add(ok ? 'ok' : 'no');
  } else if (sl.type === 'frac' || sl.type === 'area') {
    const ins = [...document.querySelectorAll('.eqn input')], [n, d] = ins.map(el => parseInt(el.value, 10));
    if (isNaN(n) || isNaN(d) || !d) { fb.textContent = 'Заповни чисельник і знаменник.'; fb.className = 'fb warn'; return; }
    const [an, ad] = sl.answer, same = n * ad === d * an;
    ok = same && (!sl.reduce || gcdI(n, d) === 1);
    if (same && !ok) soft = 'Правильно, але дріб можна скоротити. Скороти до кінця.';
    ins.forEach(el => el.classList.toggle('no', !same));
  } else if (sl.type === 'num') {
    const el = $('.slide .num-in'), v = el.value.trim();
    if (!v) { fb.textContent = 'Впиши відповідь числом.'; fb.className = 'fb warn'; return; }
    ok = isRight(v, String(sl.answer)); // 0,5 = 0.5 = 1/2
    el.classList.toggle('no', !ok);
  } else if (sl.type === 'tf') {
    const rows = [...document.querySelectorAll('.tf')];
    if (rows.some(r => r.dataset.v === undefined)) { fb.textContent = 'Дай відповідь на кожне твердження.'; fb.className = 'fb warn'; return; }
    rows.forEach((r, i) => r.classList.toggle('bad', (r.dataset.v === '1') !== sl.statements[i][1]));
    ok = !rows.some(r => r.classList.contains('bad'));
  } else if (sl.type === 'match') {
    const sels = [...document.querySelectorAll('.matches select')];
    if (sels.some(x => !x.value)) { fb.textContent = 'Обери відповідь для кожного рядка.'; fb.className = 'fb warn'; return; }
    sels.forEach((x, i) => x.classList.toggle('no', x.value !== sl.pairs[i][1]));
    ok = sels.every((x, i) => x.value === sl.pairs[i][1]);
  }
  if (soft) { fb.textContent = soft; fb.className = 'fb warn'; return; }
  if (st.first === undefined) st.first = ok; // бал — лише за першу спробу
  if (ok) { st.done = true; render(); return; }
  fb.innerHTML = 'Є помилка. ' + (sl.hint ? fx(sl.hint) : sl.type === 'choice' ? 'Спробуй іншу відповідь.' : 'Перевір позначене червоним і спробуй ще раз.');
  fb.className = 'fb no';
  $('#tshow').hidden = false;
}
function revealTask() { const st = game.tasks[slideKey()]; st.done = true; render(); }

async function finishSlides() {
  const sc = slideScore();
  await submitResult(sc.correct, sc.total);
}
function bindSlides() {
  if (game.view !== 'slide') return;
  const sl = game.L.sections[game.sec].slides[game.k];
  if (sl.type === 'video') return bindVideo(sl);
  const ins = [...document.querySelectorAll('.slide .eqn input')];
  if (!ins.length) return;
  ins[0].focus({ preventScroll: true });
  ins.forEach((el, k) => el.addEventListener('keydown', e => { if (e.key !== 'Enter') return; e.preventDefault(); k < ins.length - 1 ? ins[k + 1].focus() : checkTask(); }));
}

/* ---------- відео в уроці: YouTube (рекомендовано) або файл з папки videos/ ---------- */
const hasVideo = sl => !!(sl.youtube || sl.src);
const isVideoLesson = L => L.sections.some(s => s.slides.some(sl => sl.type === 'video'));
// Приймаємо будь-яке посилання YouTube або сам ідентифікатор відео
function ytId(s) {
  const m = String(s).match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
  return m ? m[1] : String(s).trim();
}
// Час: 135, «2:15» або «1:02:15» → секунди
function toSec(t) {
  if (t === undefined || t === null || t === '') return 0;
  return String(t).split(':').reduce((s, x) => s * 60 + (Number(x) || 0), 0);
}
let ytReady = null;
function loadYT() {
  if (ytReady) return ytReady;
  ytReady = new Promise(resolve => {
    if (window.YT && window.YT.Player) return resolve(window.YT);
    window.onYouTubeIframeAPIReady = () => resolve(window.YT);
    const sc = document.createElement('script');
    sc.src = 'https://www.youtube.com/iframe_api';
    sc.onerror = () => { ytReady = null; resolve(null); };
    document.head.appendChild(sc);
  });
  return ytReady;
}
function videoBody(sl, key) {
  const range = sl.start || sl.end ? `<span class="muted">${sl.start ? 'з ' + sl.start : ''}${sl.end ? ' до ' + sl.end : ''}</span>` : '';
  let player;
  if (sl.youtube) player = '<div class="video"><div id="ytp"></div></div>';
  else if (sl.src) player = `<div class="video"><video id="vid" controls playsinline preload="metadata" src="${esc(sl.src)}"></video></div>`;
  else player = `<div class="video placeholder"><b>Тут буде відео</b>${sl.script ? `<p class="muted">План відео для вчителя:</p><div class="script">${fx(sl.script)}</div>` : ''}</div>`;
  const wait = sl.mustWatch && hasVideo(sl) && !game.watched[key] ? '<p class="muted" id="vwait">Досмотри відео до кінця — тоді відкриється кнопка «Далі».</p>' : '';
  return `<div class="video-head"><h2>${esc(sl.title)}</h2>${range}</div>${player}${wait}${sl.text ? `<div class="video-note">${fx(sl.text)}</div>` : ''}`;
}
function videoWatched() {
  game.watched[slideKey()] = true;
  const b = $('#slideNext'); if (b) b.disabled = false;
  const w = $('#vwait'); if (w) w.remove();
}
function bindVideo(sl) {
  const start = toSec(sl.start), end = toSec(sl.end);
  if (sl.src) {
    const v = $('#vid');
    if (start) v.addEventListener('loadedmetadata', () => { v.currentTime = start; }, { once: true });
    v.addEventListener('timeupdate', () => { if (end && v.currentTime >= end) { v.pause(); videoWatched(); } });
    v.addEventListener('ended', videoWatched);
  }
  if (sl.youtube) {
    loadYT().then(YT => {
      const box = $('#ytp');
      if (!box) return; // учень уже перейшов на інший слайд
      // відео недоступне — пояснюємо і не блокуємо урок
      const fail = text => { const el = $('#ytp') || $('.video iframe'); if (el) el.outerHTML = `<p class="fb warn" style="padding:16px">${text}</p>`; videoWatched(); };
      if (!YT) return fail('Не вдалося завантажити YouTube. Перевірте інтернет або чи не блокує його шкільна мережа. Можна перейти далі.');
      new YT.Player('ytp', {
        host: 'https://www.youtube-nocookie.com', videoId: ytId(sl.youtube),
        playerVars: Object.assign({ rel: 0, playsinline: 1, modestbranding: 1 }, start ? { start } : {}, end ? { end } : {}),
        events: {
          onStateChange: e => { if (e.data === YT.PlayerState.ENDED) videoWatched(); },
          onError: () => fail('Це відео зараз недоступне (можливо, його видалено або закрито доступ). Можна перейти далі.'),
        },
      });
    });
  }
}
