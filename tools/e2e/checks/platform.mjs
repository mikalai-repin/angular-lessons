// Проверка интерфейса платформы на демо-магазине шага 1.1: ошибки TypeScript, сборки и Angular в консоли,
// схлопывание повторов, адресная строка, вкладка «Сеть», ошибка 500 из переключателя.
// node tools/e2e/checks/platform.mjs
import { readFileSync } from 'node:fs';
import { BASE_URL, CONTENT, launch, OUT, readDir, wait } from '../lib.mjs';

const failures = [];
const expect = (ok, message) => {
  console.log(`${ok ? '✓' : '✗'} ${message}`);
  if (!ok) failures.push(message);
};

const browser = await launch();
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 900 });
page.on('dialog', (d) => d.accept());
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));

// Код ученика с ошибками подкладываем в сохранённый прогресс — так же, как его сохранил бы редактор
const files = readDir(`${CONTENT}/01-first-app/01-what-is-angular/start`);
// Ошибка только в типах: код при этом запускается, и шаблон каталога отрисовывается
files['catalog/catalog.ts'] = files['catalog/catalog.ts'].replace("signal('')", "signal('')\n  protected wrong: number = 'строка';");
// Неизвестный элемент внутри @for: Angular повторяет NG0303 для каждой карточки
files['catalog/catalog.html'] = files['catalog/catalog.html'].replace('<app-game-card ', '<app-game-crad ');
files['app.ts'] = files['app.ts'].replace("styleUrl: './app.css'", "styleUrl: './app2.css'");

await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0' });
await page.evaluate((code) => {
  localStorage.setItem('angular-course:v1', JSON.stringify({ steps: { 'first-app/what-is-angular': { code } } }));
}, files);
await page.goto(`${BASE_URL}/first-app/what-is-angular`, { waitUntil: 'networkidle0' });
await wait(4000);

const lines = () =>
  page.$$eval('.console-line', (els) => els.map((e) => ({ cls: e.className, text: e.textContent ?? '' })));
let consoleLines = await lines();
const has = (cls, text) => consoleLines.some((l) => l.cls.includes(cls) && l.text.includes(text));
expect(has('console-ts', "Type 'string' is not assignable to type 'number'"), 'ошибка TypeScript с меткой TS');
expect(!consoleLines.some((l) => l.text.includes("Cannot find module '@angular")), 'Monaco находит типы @angular/*');
expect(has('console-build', 'не найден файл «./app2.css»'), 'ошибка сборки: не найден styleUrl');
const ng0303 = consoleLines.find((l) => l.text.includes('NG0303'));
expect(Boolean(ng0303), 'ошибка Angular NG0303 в консоли');
const ng0303Count = await page.$$eval('.console-line', (els) => {
  const line = els.find((e) => e.textContent?.includes('NG0303'));
  return line?.querySelector('.console-count')?.textContent ?? '1';
});
expect(
  consoleLines.filter((l) => l.text.includes('NG0303')).length === 1 && Number(ng0303Count) > 1,
  `повторы NG0303 схлопнуты в одну строку (×${ng0303Count})`,
);
expect(has('console-error', 'NG0304'), 'ошибка NG0304 (неизвестный элемент)');
expect(
  await page.$$eval('.console-line a', (as) => as.some((a) => a.getAttribute('href') === 'https://angular.dev/errors/NG0303')),
  'код NG0303 — ссылка на angular.dev/errors',
);
await page.screenshot({ path: `${OUT}/platform-errors.png` });

// Тот же шаг без ошибок: адресная строка и сеть
await page.evaluate(() => localStorage.clear());
await page.goto(`${BASE_URL}/first-app/what-is-angular`, { waitUntil: 'networkidle0' });
await wait(3000);
// После перезапуска старый iframe может ещё числиться в списке — берём последний
const frame = () => page.frames().filter((f) => f.url().includes('/app')).at(-1);
await frame().click('app-game-card a.cover');
await wait(1500);
const address = () => page.$eval('.address-input', (e) => e.value);
expect((await address()) === '/games/1', `клик по ссылке в приложении меняет адресную строку: ${await address()}`);

await page.click('.address-input', { clickCount: 3 });
await page.type('.address-input', '/cart\n');
await wait(2500);
expect((await frame().evaluate(() => document.body.innerText)).includes('Корзина пуста'), 'ввод адреса /cart открывает корзину с нуля');

await page.click('.icon-button[title="Назад"]');
await wait(500);

await page.click('.address-input', { clickCount: 3 });
await page.type('.address-input', '/\n');
await wait(2500);
const tabs = await page.$$('.panel-tab');
await tabs[1].click();
await wait(200);
const rows = await page.$$eval('.network-row', (rs) => rs.map((r) => r.textContent));
expect(rows.some((r) => r?.includes('/api/games') && r.includes('200')), `вкладка «Сеть» показывает запрос: ${rows[0]}`);

await page.click('.backend-controls input[type=checkbox]');
await frame().type('.search', 'x');
await wait(1500);
const rows2 = await page.$$eval('.network-row', (rs) => rs.map((r) => r.textContent));
expect(rows2.some((r) => r?.includes('500')), 'переключатель «Ошибка 500» действует сразу');
expect((await frame().evaluate(() => document.body.innerText)).includes('Не удалось загрузить каталог'), 'приложение показывает ошибку загрузки');
await page.screenshot({ path: `${OUT}/platform-network.png` });

expect(pageErrors.length === 0, `ошибок страницы нет ${JSON.stringify(pageErrors)}`);
await browser.close();
console.log(failures.length ? `\nПровалено: ${failures.length}` : '\nВсё прошло');
process.exit(failures.length ? 1 : 0);
