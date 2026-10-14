// Проверки шагов (check.ts) в интерфейсе платформы: на стартовом коде «Проверить» должна не пройти
// с подсказкой, на решении — пройти. Без аргументов — все шаги курса с check.ts.
// node tools/e2e/checks/step-checks.mjs [папка главы…]
import { existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { chapterSteps } from '../../../scripts/step-files.mjs';
import { CONTENT, openCourse, wait } from '../lib.mjs';

const course = JSON.parse(readFileSync(join(CONTENT, 'course.json'), 'utf8'));
const chapters = process.argv.slice(2).length ? process.argv.slice(2) : course.chapters;
const strip = (dir) => dir.replace(/^\d+-/, '');
const steps = chapters.flatMap((chapter) =>
  chapterSteps(join(CONTENT, chapter))
    .filter((path) => existsSync(join(path, 'check.ts')))
    .map((path) => `/${strip(chapter)}/${strip(basename(path))}`),
);
if (!steps.length) {
  console.error('Нет шагов с check.ts');
  process.exit(1);
}

const course$ = await openCourse(steps[0]);
const { page, expect } = course$;

/** «Проверить» и ожидание результата: { cls: 'pass' | 'fail', text } */
async function runCheck() {
  await page.click('.check-button');
  await page.waitForSelector('.check-result.pass, .check-result.fail', { timeout: 30000 });
  return page.$eval('.check-result', (e) => ({
    cls: e.classList.contains('pass') ? 'pass' : 'fail',
    text: e.firstChild?.textContent?.trim() ?? '',
  }));
}

for (const step of steps) {
  await page.goto(`${page.url().split('/').slice(0, 3).join('/')}${step}`, { waitUntil: 'networkidle0' });
  await wait(2500);
  const start = await runCheck();
  expect(start.cls === 'fail' && start.text.length > 2, `${step}: на старте не проходит — ${start.text}`);
  await course$.showSolution();
  const solution = await runCheck();
  expect(solution.cls === 'pass', `${step}: на решении проходит — ${solution.text}`);
  await course$.checkConsoleClean(step);
}

// Данные приложения ученика в localStorage: на время проверки убираются, после — возвращаются
await page.evaluate(() => localStorage.setItem('hod-konem:cart:v1', '[{"id":1,"quantity":2}]'));
await runCheck();
expect(
  (await page.evaluate(() => localStorage.getItem('hod-konem:cart:v1'))) === '[{"id":1,"quantity":2}]',
  'сохранённая корзина ученика после проверки — на месте',
);

await course$.finish();
