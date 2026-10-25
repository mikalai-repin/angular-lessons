// Кнопка «Скачать»: архив шага кладётся поверх проекта `ng new` (глава 20).
// node tools/e2e/checks/download.mjs [адрес шага] [папка для распаковки]
// По умолчанию — последний шаг главы 19; архив распаковывается в tools/e2e/out/download/.
// Проверяет раскладку (src/main.ts с импортами из ./app/, src/app, обложки, учебный бэкенд, README)
// и что код в архиве совпадает с кодом шага (полный код — scripts/step-files.mjs).
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { toProjectFiles } from '../../../shared/cli-project.js';
import { CONTENT, OUT, openCourse, readDir, wait } from '../lib.mjs';

const stepPath = process.argv[2] ?? '/internals/practice';
const outDir = resolve(process.argv[3] ?? join(OUT, 'download'));
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const { page, expect: check, finish } = await openCourse(stepPath);
// Подробности печатаются только при неудаче
const expect = (ok, message, details) => {
  check(ok, message);
  if (!ok && details !== undefined) console.log(details);
};
const session = await page.createCDPSession();
await session.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: outDir });

const button = await page.$$eval('.toolbar .button', (els) => els.map((e) => e.textContent));
expect(button.includes('Скачать'), 'в панели редактора есть кнопка «Скачать»', button.join(' | '));
await page.$$eval('.toolbar .button', (els) => els.find((e) => e.textContent === 'Скачать')?.click());

let zip;
for (let i = 0; i < 40 && !zip; i++) {
  await wait(250);
  zip = readdirSync(outDir).find((name) => name.endsWith('.zip'));
}
expect(Boolean(zip), 'архив скачан', readdirSync(outDir).join(', '));
if (zip) {
  execSync(`unzip -q ${JSON.stringify(zip)}`, { cwd: outDir });
  const root = join(outDir, zip.replace(/\.zip$/, ''));
  const has = (path) => existsSync(join(root, path));
  console.log(`Архив: ${zip}`);
  expect(has('README.md'), 'README.md в корне архива');
  expect(has('src/main.ts') && has('src/styles.css'), 'main.ts и styles.css — в src/');
  expect(has('src/app/app.ts') && !has('src/app/main.ts'), 'код шага — в src/app/');
  const main = readFileSync(join(root, 'src/main.ts'), 'utf8');
  expect(main.includes("from './app/app'"), 'main.ts импортирует ./app/app', main);
  expect(has('public/assets/covers/treasure-island.svg'), 'обложки — в public/assets/covers');
  expect(
    has('server/api.mjs') && has('server/backend.mjs') && has('server/data/games.json') && has('proxy.conf.json'),
    'учебный бэкенд: server/api.mjs, backend.mjs, data/*.json и proxy.conf.json',
  );
  const readme = readFileSync(join(root, 'README.md'), 'utf8');
  expect(readme.includes('npm install --save-exact @ngrx/'), 'README называет пакеты NgRx с версиями', readme);

  // Код в архиве = полный код шага (ученик не менял код: прогресс чистый)
  const [chapter, step] = stepPath.split('/').filter(Boolean);
  const chapterDir = readdirSync(CONTENT).find((name) => name.replace(/^\d+-/, '') === chapter);
  const stepDir = readdirSync(join(CONTENT, chapterDir)).find((name) => name.replace(/^\d+-/, '') === step);
  // Редактор открывает шаг со стартовым кодом
  const expected = toProjectFiles(readDir(join(CONTENT, chapterDir, stepDir, 'start')));
  const different = Object.entries(expected).filter(
    ([path, code]) => !has(path) || readFileSync(join(root, path), 'utf8') !== code,
  );
  expect(
    different.length === 0,
    `все ${Object.keys(expected).length} файлов шага совпадают`,
    different.map(([p]) => p),
  );
}

await finish();
