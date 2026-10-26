// Скачивает код angular.dev (папка adev/ репозитория angular/angular) в reference/angular на зафиксированном коммите.
// Папка не хранится в git: это чужой код, который всегда можно получить заново. Глава 21 ссылается на тот же коммит.
import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const COMMIT = 'fb7711f87d293ba1a282f21d0e9c1ef651c1b343'; // release: cut the v22.2.1 release, 2026-09-30
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = resolve(root, 'reference/angular');

if (existsSync(target)) {
  console.log('[reference] reference/angular уже есть, пропускаем. Удалите папку, чтобы скачать заново.');
  process.exit(0);
}

const run = (command) => execSync(command, { stdio: 'inherit', cwd: root });
// Репозиторий большой: один коммит, без истории, только adev/ и LICENSE
run(`git init --quiet "${target}"`);
run(`git -C "${target}" sparse-checkout set --no-cone /adev/ /LICENSE`);
run(`git -C "${target}" fetch --quiet --depth 1 --filter=blob:none https://github.com/angular/angular ${COMMIT}`);
run(`git -C "${target}" checkout --quiet FETCH_HEAD`);
// Без .git, чтобы редактор не показывал вложенный репозиторий
rmSync(resolve(target, '.git'), { recursive: true, force: true });
console.log(`[reference] готово: reference/angular/adev @ ${COMMIT.slice(0, 7)}`);
