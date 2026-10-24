// Тесты шага в настоящем проекте Angular CLI — сверка тест-раннера превью с `ng test` (Vitest 5).
// node tools/e2e/ng-test.mjs <папка шага> [--with <папка с файлами поверх шага>] [--browser] [--include=<путь .spec.ts>]
//
// Проект создаётся один раз в tools/e2e/out/cli/hk (`ng new` той же версии Angular, что в курсе, затем пакеты
// @angular/* фиксируются на ней). Angular CLI 22 требует Node 22.22+/24.15+: скрипт запускает его через nvm
// (NG_TEST_NODE, по умолчанию 24.15). Пакеты NgRx ставятся тех же версий, что у платформы.
// Код шага кладётся в src/app (main.ts и styles.css — в src/).
// --browser — Vitest в Chromium (как превью; ставит @vitest/browser-playwright и браузер Playwright),
// без него — jsdom (так `ng test` работает по умолчанию: нет matchMedia, IntersectionObserver, раскладки).
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { readStepDir, writeFiles } from '../../scripts/step-files.mjs';
import { OUT, ROOT, readFolder } from './lib.mjs';

const args = process.argv.slice(2);
const withIndex = args.indexOf('--with');
const overlay = withIndex === -1 ? null : args.splice(withIndex, 2)[1];
const dir = args.find((a) => !a.startsWith('--'));
const browser = args.includes('--browser');
const include = args.find((a) => a.startsWith('--include='));
if (!dir) {
  console.error('Использование: node tools/e2e/ng-test.mjs <папка шага> [--browser] [--include=src/app/x.spec.ts]');
  process.exit(1);
}

const NODE = process.env.NG_TEST_NODE ?? '24.15';
const angular = JSON.parse(readFileSync(resolve(ROOT, 'content/course.json'), 'utf8')).angularVersion;
const cliDir = resolve(OUT, 'cli');
const project = join(cliDir, 'hk');
const sh = (command, cwd = project) =>
  execSync(`bash -lc 'source ~/.nvm/nvm.sh >/dev/null && nvm use ${NODE} >/dev/null && ${command}'`, {
    cwd,
    stdio: 'pipe',
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });

if (!existsSync(join(project, 'angular.json'))) {
  mkdirSync(cliDir, { recursive: true });
  console.log(`Создаю проект Angular CLI ${angular} (один раз)…`);
  sh(`npx -y @angular/cli@${angular} new hk --defaults --skip-git --ssr=false`, cliDir);
  // ng new ставит ^22.x — фиксируем ровно версию курса
  const pkg = JSON.parse(readFileSync(join(project, 'package.json'), 'utf8'));
  for (const deps of [pkg.dependencies, pkg.devDependencies]) {
    for (const name of Object.keys(deps)) if (name.startsWith('@angular/')) deps[name] = angular;
  }
  writeFileSync(join(project, 'package.json'), JSON.stringify(pkg, null, 2));
  rmSync(join(project, 'node_modules'), { recursive: true, force: true });
  rmSync(join(project, 'package-lock.json'), { force: true });
  sh('npm install');
}
// Пакеты NgRx (глава 18) — те же версии, что у платформы (devDependencies курса)
const ngrx = Object.entries(JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')).devDependencies).filter(
  ([name]) => name.startsWith('@ngrx/'),
);
const missing = ngrx.filter(([name]) => !existsSync(join(project, 'node_modules', name)));
if (missing.length > 0) {
  sh(`npm install --save-exact ${missing.map(([name, version]) => `${name}@${version}`).join(' ')}`);
}
if (browser && !existsSync(join(project, 'node_modules/@vitest/browser-playwright'))) {
  const vitest = JSON.parse(readFileSync(join(project, 'node_modules/vitest/package.json'), 'utf8')).version;
  sh(`npm install -D --save-exact @vitest/browser-playwright@${vitest} playwright && npx playwright install chromium`);
}

// Код шага → src/app, точка входа и глобальные стили → src/
const app = join(project, 'src/app');
rmSync(app, { recursive: true, force: true });
writeFiles(app, { ...readStepDir(resolve(ROOT, dir)), ...(overlay ? readFolder(resolve(ROOT, overlay)) : {}) });
for (const file of ['main.ts', 'styles.css']) {
  if (existsSync(join(app, file))) renameSync(join(app, file), join(project, 'src', file));
}
const main = join(project, 'src/main.ts');
writeFileSync(main, readFileSync(main, 'utf8').replaceAll("from './", "from './app/"));
cpSync(resolve(ROOT, 'public/assets'), join(project, 'public/assets'), { recursive: true });

const flags = ['--watch=false', browser ? '--browsers=chromiumHeadless' : '', include ?? ''].filter(Boolean).join(' ');
let output;
try {
  output = sh(`npx ng test ${flags} 2>&1`);
} catch (error) {
  output = `${error.stdout ?? ''}${error.stderr ?? ''}`;
}
// eslint-disable-next-line no-control-regex
console.log(output.replace(/\x1b\[[0-9;]*m/g, ''));
