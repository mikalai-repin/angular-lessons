// Тест-раннер превью в интерфейсе платформы на шагах главы 16 «Тестирование»: отчёт о тестах (*.spec.ts),
// переключатель «Приложение / Тесты», перезапуск ⟳, упавший тест с diff и местом, ошибки вне тестов (NG0205),
// пустой набор («No test found in suite»), своё localStorage у тестов, «Проверить» по результатам тестов.
// node tools/e2e/checks/test-runner.mjs
// Семантика раннера (хуки, each, fails, тайм-ауты…) — набор tools/e2e/fixtures/test-runner в чистом превью:
// node tools/e2e/run-tests.mjs content/15-performance/08-practice/solution --with tools/e2e/fixtures/test-runner
import { resolve } from 'node:path';
import { PROGRESS_KEY, ROOT, openCourse, readDir, wait } from '../lib.mjs';

const LAST = 'testing/tests-inside';
const { page, expect, frame, consoleText, showSolution, runWithCode, finish } = await openCourse(`/${LAST}`);

const summary = () =>
  page.$eval('.test-summary', (e) => e.textContent.replace(/\s+/g, ' ').trim()).catch(() => 'выполняются');
const waitDone = async () => {
  for (let i = 0; i < 200; i++) {
    if (!/выполняются/.test(await summary())) return;
    await wait(100);
  }
};
const report = () => page.$eval('.test-report', (e) => e.innerText);
// Числа из итога в панели: ✓ 42 ✗ 1 (прошедшие файлы в отчёте свёрнуты, если что-то упало)
const counts = () =>
  page.$eval('.test-summary', (e) => {
    const n = (cls) => Number(e.querySelector(`.${cls}`)?.textContent.match(/\d+/)?.[0] ?? 0);
    return { pass: n('test-pass'), fail: n('test-fail'), skip: n('test-skip'), todo: n('test-todo') };
  });

// 1. Последний шаг главы: все тесты магазина проходят
await waitDone();
let c = await counts();
expect(c.pass === 42 && c.fail === 0, `16.9: все тесты главы проходят ${JSON.stringify(c)}`);
let shown = await report();
expect(shown.includes('core/cart-store.spec.ts') && shown.includes('CartStore'), 'файлы и describe в отчёте');
expect(!/Ошибки вне тестов/.test(shown), 'ошибок вне тестов нет');
expect(!(await page.$('.address-input')), 'в режиме тестов нет адресной строки');

// 2. Своё localStorage у тестов: корзина магазина и прогресс курса переживают localStorage.clear() в тестах
await page.evaluate(() => localStorage.setItem('hod-konem:cart:v2', '[]'));
await page.click('.test-bar .icon-button');
await wait(500);
await waitDone();
const storage = await page.evaluate(() => Object.keys(localStorage));
expect(
  storage.includes('hod-konem:cart:v2') && storage.some((key) => key.startsWith('angular-course')),
  `тесты не трогают localStorage платформы: ${storage.join(', ')}`,
);

// 3. Переключатель: приложение и обратно
await page.$$eval('.preview-mode', (els) => els.find((e) => e.textContent.includes('Приложение')).click());
await wait(3500);
expect(Boolean(await page.$('.address-input')) && !(await page.$('.test-report')), 'режим «Приложение»');
const appText = await frame().$eval('body', (e) => e.innerText);
expect(appText.includes('Ход конём'), 'приложение запустилось');
await page.$$eval('.preview-mode', (els) => els.find((e) => e.textContent.includes('Тесты')).click());
await wait(1000);
await waitDone();
expect((await counts()).pass === 42, 'снова тесты');

// 4. Упавший тест (diff и место), NG0205 вне тестов (аналитика без catch), пустой набор
const step = (path) => readDir(resolve(ROOT, `content/16-testing/${path}`));
const final = step('09-tests-inside/start');
const files = {
  'shared/plural.spec.ts': final['shared/plural.spec.ts'].replace(
    "expect(plural(21, PLAYER)).toBe('игрок');",
    "expect(plural(21, PLAYER)).toBe('игроков');",
  ),
  'core/cart-store.ts': final['core/cart-store.ts'].replace(
    "this.track('В корзину', game.title);",
    "this.analytics().then((a) => a.track('В корзину', game.title));",
  ),
  'shared/game-card/game-card.spec.ts': step('04-component-tests/start')['shared/game-card/game-card.spec.ts'],
};
expect(files['core/cart-store.ts'] !== final['core/cart-store.ts'], 'опыт: CartStore без catch');
await runWithCode(LAST, files, 1000);
await waitDone();
c = await counts();
shown = await report();
expect(c.fail >= 3, `упавший тест и пустые наборы считаются ✗: ${JSON.stringify(c)}`);
expect(
  shown.includes("expected 'игрок' to be 'игроков' // Object.is equality") && shown.includes('Received: "игрок"'),
  'сообщение и diff упавшего теста',
);
expect(/shared\/plural\.spec\.ts:\d+:\d+/.test(shown), 'место ошибки — строка .spec.ts');
expect(shown.includes('No test found in suite GameCard'), 'пустой describe — «No test found in suite»');
expect(/Ошибки вне тестов: \d+/.test(shown) && shown.includes('NG0205'), 'ошибки вне тестов (NG0205 из CartStore)');

// 5. «Проверить» практикума: старт не проходит, решение проходит
await page.evaluate((key) => localStorage.removeItem(key), PROGRESS_KEY);
await page.goto(page.url().replace(LAST, 'testing/practice'), { waitUntil: 'networkidle0' });
await wait(3000);
await waitDone();
await page.click('.check-button');
await page.waitForSelector('.check-result.pass, .check-result.fail', { timeout: 30000 });
let check = await page.$eval('.check-result', (e) => e.className + ' ' + e.textContent);
expect(check.includes('fail') && check.includes('checkout-schema.spec.ts'), `старт практикума не проходит: ${check}`);
await showSolution();
await waitDone();
await page.click('.check-button');
await page.waitForSelector('.check-result.pass, .check-result.fail', { timeout: 30000 });
check = await page.$eval('.check-result', (e) => e.className + ' ' + e.textContent);
expect(check.includes('pass'), `решение практикума проходит: ${check}`);
expect(!/TS\d{4}/.test(await consoleText()), 'консоль без ошибок TypeScript');

await finish();
