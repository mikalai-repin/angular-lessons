// Код шага поверх проекта `ng new` — та же раскладка, что у архива кнопки «Скачать» (shared/cli-project.js):
// src/app, src/main.ts, src/styles.css, обложки в public/assets, учебный бэкенд в server/ и proxy.conf.json.
// node tools/e2e/cli-overlay.mjs <папка шага> <папка проекта> [--keep-app]
// Папка шага в content/ — полный код по цепочке (…/<шаг>/start|solution); любая другая — обычная папка с полным
// кодом (дамп генератора главы, копия шага для опыта).
//
// Без --keep-app папка src/app проекта сначала удаляется (как велит README архива): иначе остаются файлы
// заготовки ng new (app.spec.ts с проверкой заголовка «Hello, …»).
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { BACKEND_DATA, extraPackages, toProjectFiles, usesBackend } from '../../shared/cli-project.js';
import { readStepDir } from '../../scripts/step-files.mjs';
import { CONTENT, ROOT, readFolder } from './lib.mjs';

const args = process.argv.slice(2);
const [dir, target] = args.filter((a) => !a.startsWith('--'));
if (!dir || !target) {
  console.error('Использование: node tools/e2e/cli-overlay.mjs <папка шага> <папка проекта> [--keep-app]');
  process.exit(1);
}
const project = resolve(target);
const source = resolve(ROOT, dir);
const files = source.startsWith(`${CONTENT}/`) ? readStepDir(source) : readFolder(source);

if (!args.includes('--keep-app')) rmSync(join(project, 'src/app'), { recursive: true, force: true });
for (const [path, code] of Object.entries(toProjectFiles(files))) {
  mkdirSync(dirname(join(project, path)), { recursive: true });
  writeFileSync(join(project, path), code);
}
cpSync(resolve(ROOT, 'public/assets'), join(project, 'public/assets'), { recursive: true });
if (usesBackend(files)) {
  mkdirSync(join(project, 'server/data'), { recursive: true });
  cpSync(resolve(ROOT, 'cli-project/server/api.mjs'), join(project, 'server/api.mjs'));
  cpSync(resolve(ROOT, 'public/backend/backend.js'), join(project, 'server/backend.mjs'));
  for (const name of BACKEND_DATA) {
    cpSync(resolve(ROOT, `public/backend/data/${name}.json`), join(project, `server/data/${name}.json`));
  }
  cpSync(resolve(ROOT, 'cli-project/proxy.conf.json'), join(project, 'proxy.conf.json'));
}
const versions = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')).devDependencies;
const packages = extraPackages(files).map((name) => `${name}@${versions[name] ?? 'latest'}`);
console.log(`Файлов шага: ${Object.keys(files).length}; бэкенд: ${usesBackend(files) ? 'да' : 'нет'}`);
if (packages.length > 0) console.log(`Доустановить: npm install --save-exact ${packages.join(' ')}`);
