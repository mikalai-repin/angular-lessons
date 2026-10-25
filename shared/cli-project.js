// Код шага курса → файлы поверх проекта `ng new` (глава 20). Общий для платформы (кнопка «Скачать»,
// src/app/download.ts) и Node (tools/e2e/ng-*.mjs): ученик скачивает ровно то, что проверяют скрипты.
//
// Раскладка: корень шага — это src/app проекта Angular CLI, кроме main.ts и styles.css — они лежат в src/
// (в main.ts импорты './app' становятся './app/app'). Если код ходит на /api/…, к нему добавляется учебный
// бэкенд: server/api.mjs (HTTP-сервер вокруг того же backend.js, что в превью), server/backend.mjs, данные
// server/data/*.json и proxy.conf.json для ng serve. Обложки — в public/assets, как в превью.

/** Файлы корня шага, которые в проекте CLI лежат в src/, а не в src/app/ */
const SRC_FILES = ['main.ts', 'styles.css'];

/** Пакеты, которые `ng new` уже поставил: их не нужно доустанавливать */
const BUILT_IN = /^(@angular\/(core|common|compiler|forms|platform-browser|router)|rxjs|tslib)(\/|$)/;

/** Данные учебного бэкенда (public/backend/data) — тот же список, что грузит backend.js */
export const BACKEND_DATA = ['games', 'categories', 'reviews', 'users', 'promo'];

/**
 * Путь файла шага в проекте CLI
 * @param {string} name
 */
export function projectPath(name) {
  return SRC_FILES.includes(name) ? `src/${name}` : `src/app/${name}`;
}

/**
 * Файлы шага с путями проекта CLI; в main.ts относительные импорты смотрят в app/
 * @param {Record<string, string>} files
 * @returns {Record<string, string>}
 */
export function toProjectFiles(files) {
  return Object.fromEntries(
    Object.entries(files).map(([name, code]) => [
      projectPath(name),
      name === 'main.ts'
        ? code.replaceAll("from './", "from './app/").replaceAll("import('./", "import('./app/")
        : code,
    ]),
  );
}

/**
 * Пакеты npm, которые импортирует код шага и которых нет в проекте `ng new` (NgRx, zone.js)
 * @param {Record<string, string>} files
 */
export function extraPackages(files) {
  const names = new Set();
  for (const code of Object.values(files)) {
    for (const [, spec] of code.matchAll(/(?:from|import)\s*\(?\s*'([^'./][^']*)'/g)) {
      if (BUILT_IN.test(spec)) continue;
      const parts = spec.split('/');
      names.add(spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]);
    }
  }
  return [...names].sort();
}

/**
 * Ходит ли код шага к учебному бэкенду
 * @param {Record<string, string>} files
 */
export function usesBackend(files) {
  return Object.values(files).some((code) => code.includes("'/api/") || code.includes('`/api/'));
}

/**
 * README архива: что это и как положить поверх проекта `ng new`
 * @param {{ chapter: string, step: string, packages: string[], backend: boolean, angular: string }} info
 *   packages — с версиями: '@ngrx/signals@22.0.1'
 */
export function projectReadme({ chapter, step, packages, backend, angular }) {
  const install = packages.length > 0 ? `\nnpm install --save-exact ${packages.join(' ')}` : '';
  const run = backend
    ? `Магазин ходит за данными к учебному бэкенду — тому же, что работает в превью курса. Здесь это
обычный HTTP-сервер на Node.js, а \`ng serve\` пересылает ему запросы \`/api/…\` (файл \`proxy.conf.json\`):

\`\`\`bash
node server/api.mjs                          # первый терминал: бэкенд на http://localhost:3000
ng serve --proxy-config proxy.conf.json      # второй терминал: магазин на http://localhost:4200
\`\`\`

Задержку ответа (по умолчанию 300 мс) меняет переменная окружения: \`LATENCY=0 node server/api.mjs\`.
Данные бэкенда живут в памяти до его перезапуска.`
    : `\`\`\`bash
ng serve                                     # http://localhost:4200
\`\`\``;
  return `# «Ход конём»: ${chapter} — ${step}

Код шага курса «Angular — интерактивный курс» для проекта Angular CLI. Это не самостоятельный проект:
файлы кладутся поверх нового проекта \`ng new\` (глава 20, шаги «Angular CLI» и «Перенос магазина»).

\`\`\`bash
ng new hod-konem          # Angular CLI ${angular}; нужен Node.js 22.22+ или 24.15+
cd hod-konem
rm -rf src/app            # заготовку ng new заменит код магазина${install}
\`\`\`

Затем скопируйте содержимое архива в корень проекта с заменой файлов: \`src/main.ts\` и \`src/styles.css\`
заменят файлы \`ng new\`, код шага ляжет в \`src/app/\`.

${run}
`;
}
