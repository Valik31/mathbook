/* MathBook — нагороди для учня: зірки, досягнення, крамниця, сертифікати.
 * Правила нарахування зірок і досягнень — у js/rewards.js. */

let rwConfirm = null; // нагорода, яку учень зараз підтверджує до покупки
let rwMsg = null;     // { ok, text } — повідомлення після покупки
let certItem = null;  // відкритий сертифікат (покупка)

const FRAMES = { gold: 'Золота', space: 'Космічна', fire: 'Вогняна', mint: 'М’ятна', rainbow: 'Веселкова' };
const avatar = (name, frame, big) => `<span class="ava ${frame && FRAMES[frame] ? 'frame-' + frame : ''} ${big ? 'big' : ''}">${esc(String(name || '?').trim().charAt(0).toUpperCase())}</span>`;
const starTag = n => `<span class="stars">★ ${n}</span>`;
const fmtDay = d => { const x = new Date(d); return isNaN(x) ? '' : x.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' }); };
const rwOwned = () => (me.rw ? me.rw.purchases : []).filter(p => p.status !== 'відхилено');

function rewardsView() {
  if (me.guest) return `${guestNote()}<p class="muted">Зірки, досягнення і крамниця доступні учням, які увійшли з PIN.</p>`;
  const rw = me.rw || { stars: 0, earned: 0, spent: 0, achievements: [], purchases: [], streak: 0 };
  const msg = rwMsg ? `<div class="msg ${rwMsg.ok ? 'ok' : 'no'}">${esc(rwMsg.text)}</div>` : '';
  rwMsg = null;
  const ach = RW_ACHIEVEMENTS.map(a => {
    const got = rw.achievements.includes(a.id);
    return `<div class="ach ${got ? 'got' : ''}"><span class="ach-i">${a.icon}</span><div><b>${a.name}</b><small>${a.desc}</small></div><span class="ach-s">+${a.stars} ★</span></div>`;
  }).join('');
  const groups = [['рамка', 'Рамки для значка'], ['звання', 'Звання в рейтингу'], ['сертифікат', 'Сертифікати'], ['оцінка', 'Бонус до оцінки']];
  const shop = groups.map(([type, title]) => {
    const items = (data.shop || []).filter(x => x.type === type);
    return items.length ? `<h3>${title}</h3><div class="shop">${items.map(shopItem).join('')}</div>` : '';
  }).join('');
  const mine = rw.purchases.slice().reverse().map(p => {
    const item = (data.shop || []).find(x => x.name === p.reward);
    const pill = p.status === 'видано' ? '<span class="tag">Отримано</span>' : p.status === 'очікує' ? '<span class="tag wait">Чекає на вчителя</span>' : '<span class="tag no">Відхилено, зірки повернуто</span>';
    const act = item && item.type === 'сертифікат' && p.status === 'видано' ? `<button class="btn sm" onclick='openCert(${JSON.stringify(p.id)})'>Відкрити сертифікат</button>` : '';
    return `<div class="item"><div class="grow"><b>${esc(p.reward)}</b><small>${fmtDay(p.date)} · ${p.price} ★</small></div>${pill}${act}</div>`;
  }).join('');
  return `${msg}<div class="card wallet"><div class="w-main"><span class="w-star">★</span><div><div class="w-n">${rw.stars}</div><div class="muted">зірок можна витратити</div></div></div>
      <div class="w-side"><span>Зароблено: <b>${rw.earned} ★</b></span><span>Витрачено: <b>${rw.spent} ★</b></span><span>Найдовша серія: <b>${rw.streak} дн.</b></span></div></div>
    <details class="how"><summary>Як заробити зірки</summary><ul>
      <li>1 ★ за кожну правильну відповідь у тренажерах і уроках (у генераторах прикладів — ½ ★).</li>
      <li>+5 ★ за тренажер без жодної помилки (від 5 питань) і за кожен завершений урок.</li>
      <li>Той самий тренажер у той самий день: друга спроба — половина зірок, далі — без зірок. Краще спробуй інший!</li>
      <li>За кожне досягнення — додаткові зірки.</li></ul></details>
    <h2>Досягнення <span class="muted">${rw.achievements.length} з ${RW_ACHIEVEMENTS.length}</span></h2><div class="achs">${ach}</div>
    <h2>Крамниця</h2>${shop || '<p class="muted">Учитель ще не додав нагород.</p>'}
    <h2>Мої нагороди</h2><div class="list">${mine || '<p class="muted">Тут з’являться нагороди, які ти отримаєш у крамниці.</p>'}</div>`;
}

function shopItem(x) {
  const rw = me.rw, owned = rwOwned().filter(p => p.reward === x.name);
  const preview = x.type === 'рамка' ? avatar(me.name, x.param, true)
    : x.type === 'звання' ? '<span class="sh-ic">Аа</span>'
    : x.type === 'сертифікат' ? '<span class="mini-cert"><i></i><i></i><i></i></span>' : '<span class="sh-ic">+1</span>';
  let btn;
  const cosmetic = x.type === 'рамка' || x.type === 'звання';
  const now = new Date(), thisMonth = owned.filter(p => { const d = new Date(p.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
  if (cosmetic && owned.length) {
    const kind = x.type === 'рамка' ? 'frame' : 'title', value = x.type === 'рамка' ? x.param : (x.param || x.name);
    const on = (kind === 'frame' ? rw.frame : rw.title) === value;
    btn = `<button class="btn sm ${on ? 'ghost' : ''}" onclick='equipReward("${kind}", ${on ? '""' : JSON.stringify(value)})'>${on ? 'Зняти' : 'Вдягнути'}</button>`;
  } else if (x.limit && thisMonth.length >= x.limit) btn = '<button class="btn sm" disabled>Ліміт на цей місяць</button>';
  else if (rw.stars < x.price) btn = `<button class="btn sm" disabled>Ще ${x.price - rw.stars} ★</button>`;
  else if (rwConfirm === x.name) btn = `<span class="confirm">Купити за ${x.price} ★?</span><button class="btn sm" onclick='buyReward(${JSON.stringify(x.name)})'>Так</button><button class="btn ghost sm" onclick="rwConfirm=null;render()">Ні</button>`;
  else btn = `<button class="btn sm" onclick='rwConfirm=${JSON.stringify(x.name)};render()'>Купити</button>`;
  return `<div class="sh-item"><div class="sh-prev">${preview}</div><div class="grow"><b>${esc(x.name)}</b>${x.type === 'звання' ? `<span class="title-pill sm" style="margin:4px 0 2px">${esc(x.param || x.name)}</span>` : ''}<small>${esc(x.desc)}${x.type === 'оцінка' ? ' Потрібне підтвердження вчителя.' : ''}${x.limit ? ` Не більше ${x.limit} на місяць.` : ''}</small></div>
    <div class="sh-buy">${owned.length && cosmetic ? '<span class="tag">Твоя</span>' : starTag(x.price)}${btn}</div></div>`;
}

async function buyReward(reward) {
  rwConfirm = null;
  const r = await withLoader('Обмінюю зірки…', () => api('buy', { name: me.name, pin: me.pin, reward }));
  if (r.ok) {
    me.rw = r.rewards; data.rating = r.rating;
    rwMsg = { ok: true, text: r.status === 'очікує' ? `Запит «${reward}» надіслано вчителеві. Якщо він його відхилить, зірки повернуться.` : `Готово! «${reward}» отримано.` };
  } else rwMsg = { ok: false, text: r.error };
  render();
}
async function equipReward(kind, value) {
  const r = await withLoader('Зберігаю…', () => api('equip', { name: me.name, pin: me.pin, kind, value }));
  if (r.ok) { me.rw = r.rewards; data.rating = r.rating; } else rwMsg = { ok: false, text: r.error };
  render();
}

/* ---------- сертифікат для друку ---------- */
function openCert(id) { certItem = me.rw.purchases.find(p => p.id === id); tab = 'cert'; render(); window.scrollTo(0, 0); }
function certView() {
  const p = certItem, item = (data.shop || []).find(x => x.name === p.reward) || { param: p.reward, desc: '' };
  return `<div class="noprint formrow" style="align-items:center"><button class="btn ghost sm" onclick="setTab('rewards')">← До нагород</button>
      <span class="grow muted">Порада: у вікні друку оберіть альбомну орієнтацію.</span><button class="btn" onclick="window.print()">Надрукувати</button></div>
    <div class="cert"><div class="cert-in">
      <div class="cert-top">MathBook · ${esc(data.className)}</div>
      <div class="cert-h">Сертифікат</div>
      <div class="cert-sub">засвідчує, що</div>
      <div class="cert-name">${esc(me.name)}</div>
      <div class="cert-sub">отримує нагороду</div>
      <div class="cert-title">«${esc(item.param || p.reward)}»</div>
      ${item.desc ? `<div class="cert-desc">${esc(item.desc)}</div>` : ''}
      <div class="cert-foot"><span>${fmtDay(p.date)}</span><span class="seal">★</span><span>Учитель математики ______________</span></div>
    </div></div>`;
}
