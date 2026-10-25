// Код шага в настоящей сборке Angular CLI: `ng build` (AOT) или `ng build --aot=false` (JIT) и размеры файлов.
// node tools/e2e/ng-build.mjs <папка шага> [--jit] [--dev]
//
// Проект — тот же, что у tools/e2e/ng-test.mjs (tools/e2e/out/cli/hk; создаётся им при первом запуске).
// Код шага кладётся в src/app (main.ts и styles.css — в src/), тесты не копируются.
import { execSync } from 'node:child_process';
import { cpSync, existsSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { readStepDir, writeFiles } from '../../scripts/step-files.mjs';
import { OUT, ROOT } from './lib.mjs';

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith('--'));
const jit = args.includes('--jit');
const dev = args.includes('--dev');
if (!dir) {
  console.error('Использование: node tools/e2e/ng-build.mjs <папка шага> [--jit] [--dev]');
  process.exit(1);
}

const NODE = process.env.NG_TEST_NODE ?? '24.15';
const project = resolve(OUT, 'cli/hk');
if (!existsSync(join(project, 'angular.json'))) {
  console.error('Нет проекта CLI: сначала запустите node tools/e2e/ng-test.mjs <папка шага> — он создаст его.');
  process.exit(1);
}
const sh = (command) =>
  execSync(`bash -lc 'source ~/.nvm/nvm.sh >/dev/null && nvm use ${NODE} >/dev/null && ${command}'`, {
    cwd: project,
    stdio: 'pipe',
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });

const app = join(project, 'src/app');
rmSync(app, { recursive: true, force: true });
const files = Object.fromEntries(
  Object.entries(readStepDir(resolve(ROOT, dir))).filter(([name]) => !name.endsWith('.spec.ts')),
);
writeFiles(app, files);
for (const file of ['main.ts', 'styles.css']) {
  if (existsSync(join(app, file))) renameSync(join(app, file), join(project, 'src', file));
}
const main = join(project, 'src/main.ts');
writeFileSync(main, readFileSync(main, 'utf8').replaceAll("from './", "from './app/"));
cpSync(resolve(ROOT, 'public/assets'), join(project, 'public/assets'), { recursive: true });

const flags = [jit ? '--aot=false' : '', dev ? '--configuration=development' : ''].filter(Boolean).join(' ');
let output;
try {
  output = sh(`npx ng build ${flags} 2>&1`);
} catch (error) {
  output = `${error.stdout ?? ''}${error.stderr ?? ''}`;
}
// eslint-disable-next-line no-control-regex
console.log(output.replace(/\x1b\[[0-9;]*m/g, ''));

// Итог по папке сборки: все .js, их размер и размер в gzip
const browserDir = join(project, 'dist/hk/browser');
if (existsSync(browserDir)) {
  let raw = 0;
  let gz = 0;
  for (const name of readdirSync(browserDir).filter((n) => n.endsWith('.js'))) {
    const path = join(browserDir, name);
    raw += statSync(path).size;
    gz += gzipSync(readFileSync(path)).length;
  }
  console.log(`Все .js: ${(raw / 1024).toFixed(1)} КБ, gzip ${(gz / 1024).toFixed(1)} КБ`);
}
