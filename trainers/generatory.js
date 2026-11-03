/*
 * Генератори прикладів: щоразу 10 нових прикладів «питання → відповідь».
 * Новий генератор: MB.generator('Назва', () => ({ q: 'текст питання', a: 'відповідь' }));
 */
MB.generator('Усний рахунок', () => { const a = ri(10, 90), b = ri(5, 60); return Math.random() < .5 && a > b ? { q: `${a} − ${b} = ?`, a: String(a - b) } : { q: `${a} + ${b} = ?`, a: String(a + b) }; });
MB.generator('Таблиця множення', () => { const a = ri(2, 10), b = ri(2, 10); return Math.random() < .3 ? { q: `${a * b} : ${a} = ?`, a: String(b) } : { q: `${a} × ${b} = ?`, a: String(a * b) }; });
MB.generator('Дроби', () => { const d = [2, 3, 4, 5, 10][ri(0, 4)], n = ri(1, d - 1), k = ri(2, 8); return { q: `${n}/${d} від ${d * k} = ?`, a: String(n * k) }; });
MB.generator('Рівняння', () => { const x = ri(1, 12), a = ri(1, 5), b = ri(1, 15); return { q: `${a === 1 ? '' : a}x + ${b} = ${a * x + b}.  x = ?`, a: String(x) }; });
