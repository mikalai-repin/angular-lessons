// Тест-раннер превью в интерфейсе платформы: шаг с preview: tests показывает отчёт о тестах (*.spec.ts),
// переключатель «Приложение / Тесты», перезапуск тестов, «Проверить» получает результаты тестов.
// node tools/e2e/checks/test-runner.mjs <путь шага с тестами, например /testing/…>
// Ожидания — под набор tools/e2e/fixtures/test-runner (21 тест проходит, 5 падают намеренно, NG0205 вне тестов);
// шаг для проверки: старт — код главы 15, файлы — из фикстуры, preview: tests, check.ts — «прошло не меньше трёх».
// Без шага в content/ проверку не запустить: тот же набор в чистом превью — node tools/e2e/run-tests.mjs … --with …
import { openCourse, wait } from '../lib.mjs';

const stepPath = process.argv[2];
if (!stepPath) {
  console.error('Использование: node tools/e2e/checks/test-runner.mjs <путь шага с preview: tests>');
  process.exit(1);
}
const { page, expect, frame, consoleText, finish } = await openCourse(stepPath);

const summary = () => page.$eval('.test-summary', (e) => e.textContent.replace(/\s+/g, ' ').trim());
const waitDone = async () => {
  for (let i = 0; i < 100; i++) {
    if (!/выполняются/.test(await summary())) return;
    await wait(100);
  }
};
const report = () => page.$eval('.test-report', (e) => e.innerText);
// Числа из итога в панели: ✓ 21 ✗ 5 ↓ 1 … 1 (прошедшие файлы в отчёте свёрнуты, если что-то упало)
const counts = () =>
  page.$eval('.test-summary', (e) => {
    const n = (cls) => Number(e.querySelector(`.${cls}`)?.textContent.match(/\d+/)?.[0] ?? 0);
    return { pass: n('test-pass'), fail: n('test-fail'), skip: n('test-skip'), todo: n('test-todo') };
  });

await waitDone();
const text = await summary();
expect(/✓ \d+/.test(text) && /✗ \d+/.test(text), `итог в панели: ${text}`);
const c = await counts();
expect(c.pass >= 21 && c.fail >= 5 && c.skip === 1 && c.todo === 1, `отчёт: ${JSON.stringify(c)}`);
const shown = await report();
expect(shown.includes('core/cart-store.spec.ts') && shown.includes('CartStore'), 'файлы и describe в отчёте');
expect(
  shown.includes("expected 'игроков' to be 'игрока' // Object.is equality") && shown.includes('Received: "игроков"'),
  'сообщение и diff упавшего теста',
);
expect(/shared\/plural\.spec\.ts:\d+:\d+/.test(shown), 'место ошибки — строка .spec.ts');
expect(/Ошибки вне тестов: \d+/.test(shown) && shown.includes('NG0205'), 'ошибки вне тестов (NG0205 после CartStore)');
expect(!(await page.$('.address-input')), 'в режиме тестов нет адресной строки');

// Переключатель: приложение
await page.$$eval('.preview-mode', (els) => els.find((e) => e.textContent.includes('Приложение')).click());
await wait(3500);
expect(
  Boolean(await page.$('.address-input')) && !(await page.$('.test-report')),
  'режим «Приложение»: адресная строка',
);
const appText = await frame().$eval('body', (e) => e.innerText);
expect(appText.includes('Ход конём'), 'приложение запустилось');

// Обратно к тестам и перезапуск ⟳
await page.$$eval('.preview-mode', (els) => els.find((e) => e.textContent.includes('Тесты')).click());
await wait(1000);
await waitDone();
expect((await counts()).pass >= 20, 'снова тесты');
await page.click('.test-bar .icon-button');
await wait(500);
await waitDone();
expect((await counts()).pass >= 20, 'перезапуск ⟳');

// Проверка шага с тестами: check.ts получает результаты
await page.click('.check-button');
await page.waitForSelector('.check-result.pass, .check-result.fail', { timeout: 30000 });
const check = await page.$eval('.check-result', (e) => e.className + ' ' + e.textContent);
expect(check.includes('pass'), `«Проверить» по результатам тестов: ${check}`);
expect(!/ERROR|TS\d{4}/.test(await consoleText()), 'консоль без ошибок TypeScript и Angular');

await finish();
