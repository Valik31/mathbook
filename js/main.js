/* MathBook — запуск: завантажуємо дані класу і показуємо потрібну сторінку */
(async function start() {
  data = await withLoader('Відкриваю MathBook…', () => api('init'));
  let tpass = null;
  try { tpass = sessionStorage.getItem('mb-teacher'); } catch (e) {}
  if (tpass) { await teacherLogin(tpass); if (teacher) return; }
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem('mb-me') || 'null'); } catch (e) {}
  if (saved && saved.guest && data.guestMode) me = { guest: true, name: 'Гість', ...loadGuest() };
  else if (saved && data.students.includes(saved.name)) {
    const r = await withLoader('Шукаю твою книжку…', () => api('login', saved));
    if (r.ok) me = { ...saved, xp: r.xp, done: r.done, rw: r.rewards };
  }
  render();
})();
