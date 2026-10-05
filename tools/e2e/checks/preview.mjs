// Проверка среды превью на демо-магазине шага 1.1: роутинг в iframe, учебный бэкенд, отмена запросов,
// ленивая загрузка. Демо-магазин — единственный код курса с роутером и HTTP до глав 10–11.
// node tools/e2e/checks/preview.mjs
import { appUrl, collect, compileDir, CONTENT, launch, navigate, openPreview, pageText, wait } from '../lib.mjs';

const browser = await launch();
const failures = [];
const expect = (ok, message) => {
  console.log(`${ok ? '✓' : '✗'} ${message}`);
  if (!ok) failures.push(message);
};

const compiled = compileDir(`${CONTENT}/01-first-app/01-what-is-angular/start`);
expect(compiled.errors.length === 0, `сборка без ошибок ${JSON.stringify(compiled.errors)}`);

// Задержка 400 мс: поиск по буквам должен отменять устаревшие запросы
const { page, logs, network } = await openPreview(browser, compiled, { backend: { latency: 400 }, waitMs: 1500 });
expect((await pageText(page)).includes('Найдено игр: 12'), 'каталог загружен: 12 игр');

await page.type('.search', 'шах', { delay: 50 });
await wait(1200);
await collect(page, logs, network);
const searches = network.filter((e) => e.url.startsWith('/api/games?q=%D1'));
expect(
  searches.some((e) => e.status === 'canceled'),
  `устаревшие запросы поиска отменены: ${searches.map((e) => e.status).join(', ')}`,
);
expect((await pageText(page)).includes('Найдено игр: 1'), 'поиск «шах» нашёл одну игру');

await page.click('app-game-card a.cover');
await wait(800);
expect((await appUrl(page)) === '/games/8', `переход по ссылке карточки: ${await appUrl(page)}`);
expect((await pageText(page)).includes('Деревянные шахматы'), 'страница игры загружена по :id');

await page.click('.button');
await page.click('.button');
await wait(100);
expect((await pageText(page)).includes('Корзина (2)'), 'счётчик корзины в шапке = 2');

await navigate(page, '/cart', 800);
const cartText = await pageText(page);
expect(
  cartText.includes('Шахматы «Классика» × 2') && cartText.includes('Итого: 5980'),
  'ленивая корзина открылась через адресную строку',
);

await navigate(page, '/nope', 500);
expect((await pageText(page)).includes('Нет такой страницы'), 'адрес /nope → 404');

await page.evaluate(() => window.postMessage({ type: 'history', delta: -1 }, '*'));
await wait(500);
expect((await appUrl(page)) === '/cart', `назад по истории: ${await appUrl(page)}`);

await collect(page, logs, network);
const problems = logs.filter((l) => /error|pageerror|warn/.test(l));
expect(problems.length === 0, `консоль без ошибок и предупреждений ${JSON.stringify(problems)}`);

// Ошибка сервера: httpResource переходит в состояние error, шаблон показывает «Повторить»
const failing = await openPreview(browser, compiled, { backend: { latency: 0, failRate: 1 }, waitMs: 1000 });
expect((await pageText(failing.page)).includes('Не удалось загрузить каталог'), 'при ошибке 500 виден текст ошибки');

await browser.close();
console.log(failures.length ? `\nПровалено: ${failures.length}` : '\nВсё прошло');
process.exit(failures.length ? 1 : 0);
