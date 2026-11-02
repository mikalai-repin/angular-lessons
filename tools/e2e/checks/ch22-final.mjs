// Проверка главы 22 в интерфейсе платформы: шаги кнопкой «Далее» до квиза, ссылки шага 1 на варианты,
// кнопка «Решение» только у А и Б, консоль чистая на старте и на образце.
// Набор файлов шага — по архиву «Скачать» (в нём ровно файлы редактора): у А после «Решения» — образец,
// у Б нет файлов А, у В — чистый магазин главы 21 без файлов А и Б (обещание текста 22.4).
// Проверки заданий (check.ts) — в checks/step-checks.mjs 22-final-project.
// node tools/e2e/checks/ch22-final.mjs
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { toProjectFiles } from '../../../shared/cli-project.js';
import { CONTENT, OUT, clean, openCourse, readDir, wait } from '../lib.mjs';

const { page, expect, frame, title, showSolution, nextStep, checkConsoleClean, finish } =
  await openCourse('/final-project/choose-project');
const chapter = `${CONTENT}/22-final-project`;

const appText = async () =>
  clean(
    (await frame()
      ?.evaluate(() => document.body.innerText)
      .catch(() => '')) ?? '',
  );
const waitText = async (part, ms = 8000) => {
  for (let i = 0; i < ms / 250 && !(await appText()).includes(part); i++) await wait(250);
  return (await appText()).includes(part);
};
const footerButtons = () => page.$$eval('.lesson-footer-middle .button', (els) => els.map((e) => e.textContent));

// Архив «Скачать» открытого шага → файлы src/app/ (пути как в редакторе) и их код
const session = await page.createCDPSession();
const download = async (name) => {
  const dir = resolve(OUT, 'ch22-download', name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  await session.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: dir });
  await page.$$eval('.toolbar .button', (els) => els.find((e) => e.textContent === 'Скачать')?.click());
  let zip;
  for (let i = 0; i < 40 && !zip; i++) {
    await wait(250);
    zip = readdirSync(dir).find((file) => file.endsWith('.zip'));
  }
  if (!zip) return null;
  execSync(`unzip -q ${JSON.stringify(zip)}`, { cwd: dir });
  const app = join(dir, zip.replace(/\.zip$/, ''), 'src/app');
  const files = {};
  const walk = (folder) => {
    for (const entry of readdirSync(folder)) {
      const path = join(folder, entry);
      if (statSync(path).isDirectory()) walk(path);
      else files[`src/app/${relative(app, path)}`] = readFileSync(path, 'utf8');
    }
  };
  walk(app);
  return files;
};
// Файлы src/app/ архива совпадают с полным кодом папки шага: ни лишних, ни недостающих, ни других
const sameAsStep = (files, stepDir, label) => {
  if (!files) return expect(false, `${label}: архив скачан`);
  const expected = Object.fromEntries(
    Object.entries(toProjectFiles(readDir(stepDir))).filter(([path]) => path.startsWith('src/app/')),
  );
  const extra = Object.keys(files).filter((path) => !(path in expected));
  const missing = Object.keys(expected).filter((path) => !(path in files));
  const different = Object.keys(expected).filter((path) => path in files && files[path] !== expected[path]);
  if (extra.length + missing.length + different.length) console.log({ extra, missing, different });
  expect(
    extra.length + missing.length + different.length === 0,
    `${label}: в архиве ровно файлы шага (${Object.keys(expected).length})`,
  );
};
const has = (files, part) => Object.keys(files ?? {}).some((path) => path.includes(part));

// 22.1: без кода, справа магазин главы 21, ссылки на три варианта
expect((await title()) === 'Выбор проекта', `шаг 1: ${await title()}`);
expect(await waitText('Хиты'), 'шаг 1: в превью — магазин');
expect(!(await footerButtons()).includes('Решение'), 'шаг 1: кнопки «Решение» нет');
await checkConsoleClean('шаг 1');
const links = await page.$$eval('.lesson-content a[data-internal]', (els) => els.map((e) => e.getAttribute('href')));
for (const step of ['compare-wishlist', 'gift-box', 'own-app']) {
  expect(links.includes(`/final-project/${step}`), `шаг 1: ссылка на /final-project/${step}`);
}

// 22.2: старт — магазин с заготовками, «Решение» — образец; «Скачать» кладёт код редактора, то есть образец
await nextStep();
expect((await title()) === 'Вариант А: сравнение и список желаний', `шаг 2: ${await title()}`);
expect(await waitText('Каталог'), 'шаг 2: в превью — каталог');
await checkConsoleClean('шаг 2, старт');
expect((await footerButtons()).includes('Решение'), 'шаг 2: кнопка «Решение» есть');
await showSolution();
expect((await frame().$$('app-game-card .compare')).length > 0, 'шаг 2, образец: на карточках есть кнопки compare');
await checkConsoleClean('шаг 2, образец');
const compare = await download('02-solution');
sameAsStep(compare, `${chapter}/02-compare-wishlist/solution`, 'шаг 2, «Скачать» после «Решения»');

// 22.3: старт без файлов А (решение А в Б не попадает)
await nextStep();
expect((await title()) === 'Вариант Б: подарочный набор', `шаг 3: ${await title()}`);
await checkConsoleClean('шаг 3, старт');
expect((await footerButtons()).includes('Решение'), 'шаг 3: кнопка «Решение» есть');
const gift = await download('03-start');
sameAsStep(gift, `${chapter}/03-gift-box/start`, 'шаг 3, «Скачать» на старте');
expect(!has(gift, 'compare') && !has(gift, 'wishlist'), 'шаг 3: файлов варианта А нет');
expect(has(gift, 'gift/gift-store.ts'), 'шаг 3: заготовка gift/gift-store.ts на месте');

// 22.4: чистый магазин главы 21 — без файлов А и Б, без кнопки «Решение»
await nextStep();
expect((await title()) === 'Вариант В: своё приложение', `шаг 4: ${await title()}`);
expect(await waitText('Хиты'), 'шаг 4: в превью — магазин');
expect(!(await appText()).includes('Подарок'), 'шаг 4: в шапке нет ссылки «Подарок»');
expect(!(await footerButtons()).includes('Решение'), 'шаг 4: кнопки «Решение» нет');
await checkConsoleClean('шаг 4');
const own = await download('04-start');
sameAsStep(own, `${chapter}/04-own-app/start`, 'шаг 4, «Скачать»');
sameAsStep(own, `${CONTENT}/21-reading-code/07-practice/solution`, 'шаг 4, «Скачать» = магазин главы 21');

// После последнего шага — квиз главы
expect(
  (await page.$eval('.lesson-footer .button.primary', (e) => e.textContent)) === 'Квиз →',
  'шаг 4: следующая кнопка — «Квиз →»',
);
await nextStep();
expect(page.url().endsWith('/final-project/quiz'), `после шага 4 — квиз: ${page.url()}`);

await finish();
