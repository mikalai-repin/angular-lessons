# Архитектура платформы

Статический сайт без бэкенда. Весь код ученика компилируется и выполняется в браузере.

Основа — платформа курса `../pixi-js` (Vite + React + Monaco). Интерфейс, навигация, хранение прогресса, рендер уроков и e2e-инструменты перенесены с небольшими изменениями. Заново написаны **компиляция** (Angular нужен компилятор шаблонов), **превью** (DOM-приложение с роутингом), **учебный бэкенд** и вкладка **«Сеть»**.

> Состояние: этап 1 готов (см. `roadmap.md`). Всё, что ниже не помечено «план», реализовано и проверено автотестами `tools/e2e/checks/ch00-sandbox.mjs` и `platform.mjs`.

## Интерфейс

```
┌─────────────────────┬─────────────────────────────────┬──────────────────────────┐
│  Урок               │ [main.ts][app.ts][app.html]…    │ ← → ⟳  /games/8          │
│                     │                                 ├──────────────────────────┤
│  Заголовок   3 / 8 ▾│  редактор кода                  │                          │
│                     │                                 │   приложение (iframe)    │
│  текст, код,        │                                 │                          │
│  врезки             │                                 ├──────────────────────────┤
│                     │                                 │ КОНСОЛЬ 3 │ СЕТЬ 2       │
│  [Решение] [Далее →]│  [▶ Запустить] [Формат] [Сброс] │                          │
└─────────────────────┴─────────────────────────────────┴──────────────────────────┘
```

Из курса PixiJS без изменений: три колонки с перетаскиваемыми границами (на узком экране — вкладки «Урок / Код / Результат»), список шагов главы и оглавление, «Решение» / «Вернуть мой код» / «Сброс», автозапуск через 1 с после правки, `Ctrl/Cmd+Enter`, форматирование (кнопка, `Ctrl/Cmd+S`, `Shift+Alt+F`).

Новое:

| Элемент | Как работает |
|---|---|
| **Адресная строка превью** | Показывает адрес приложения (приложение сообщает о каждом `pushState`/`replaceState`/`popstate`). ← и → — `history.go(±1)` внутри iframe. ⟳ и ввод адреса + Enter — **перезапуск приложения с этого адреса**, как перезагрузка страницы в браузере (так ученик видит, что глубокая ссылка открывается «с нуля»). После правки кода приложение перезапускается **с текущего адреса** |
| **Вкладка «Сеть»** | Запросы к учебному бэкенду: метод, адрес, статус (`…`, `отменён`, код), время. Клик по строке — тело запроса и ответа. Переключатели «Задержка» (0/300/1000/3000 мс и значение из шага) и «Ошибка 500» действуют сразу, без перезапуска |
| **Консоль** | Метки `TS` (ошибки TypeScript из Monaco) и `Сборка` (ошибки компиляции: не найден `templateUrl` и т. п.). Одинаковые сообщения подряд схлопываются в одну строку со счётчиком (Angular повторяет NG0303 для каждого элемента `@for`). Адреса и коды `NG0xxx` — ссылки (код → `https://angular.dev/errors/NG0xxx`). На вкладке — число ошибок |
| **Вкладки `.html`/`.css`** | Подпапки в имени вкладки (`catalog/` приглушённо). Порядок без `files`: `main.ts`, затем файлы корня, затем подпапки; файлы одного компонента рядом (`.ts`, `.html`, `.css`). Активная вкладка прокручивается в видимую область |
| **Дерево файлов** (кнопка «☰ Файлы N» слева от вкладок, `src/editor/FileTree.tsx`) | Папки как в проекте CLI (сначала папки, затем файлы в порядке вкладок), сворачиваются; активный файл подсвечен; значки TS / `<>` / `#`. Открыто ли дерево — запоминается (`progress.fileTree`), по умолчанию закрыто. На узком экране всплывает поверх кода и закрывается после выбора файла |
| **Подсветка шаблонов Angular** (`src/editor/angular-html.ts`) | Своя грамматика Monarch для языка `html`: HTML + `@if`/`@for`/`@switch`/`@defer`/`@let` с выражениями, `{{ }}` (и в значениях атрибутов), `[prop]`, `[(model)]`, `(event)`, `#ref`, `*ngIf`, `animate.enter`, выражения (переменные, вызовы, пайпы, `$event`, строки, ключевые слова). Темы `course-light`/`course-dark` — `vs`/`vs-dark` + цвета Angular-токенов. Зарегистрирована для `html`, поэтому автодополнение HTML и Prettier работают как прежде |
| Вкладка «Шаблон», дерево компонентов | **План** (этап 5) |

## Стек

| Задача | Решение | Почему |
|---|---|---|
| Сборка платформы | Vite 8 + TypeScript 6.0 | Как в курсе PixiJS. TypeScript 7 нельзя — см. «Версии» |
| UI платформы | React 19 | Готовый код из курса PixiJS |
| Роутинг платформы | `react-router`, URL вида `/:chapter/:step` | |
| Редактор | Monaco Editor 0.57 | TS language service (встроенный TS **5.9**) с типами `@angular/*` и `rxjs`; языки `html` и `css` со своими воркерами |
| Компиляция TS → JS | Веб-воркер `src/compiler/compile.worker.ts`: TypeScript 6.0 + `angularJitApplicationTransform` | TS-воркер Monaco не умеет применять трансформы; без трансформа не работают `input()`, `output()`, `model()`, `viewChild()` |
| Шаблоны → код | JIT-компилятор `@angular/compiler` в iframe превью | |
| Форматирование | Prettier 3.9.9: `typescript` для `.ts`, **`angular`** (плагин `html`) для `.html`, `css` (плагин `postcss`) | Шаблоны песочницы Prettier не меняет — стиль совпадает |
| Markdown уроков | `markdown-it` + контейнеры + Shiki: блоки `ts` подсвечиваются грамматикой **`angular-ts`**, `html` — **`angular-html`** | Подсвечиваются `@if`, привязки, шаблоны в декораторах |
| Прогресс | `localStorage`, ключ `angular-course:v1` | |

## Версии

Фиксируются точно в `package.json` и `content/course.json` (`angularVersion`):

- `@angular/core`, `common`, `compiler`, `compiler-cli`, `platform-browser`, `forms`, `router` — **22.2.1** (в `devDependencies`: в бандл платформы не попадают, нужны vendor-скрипту, Monaco и проверкам). `@angular/animations` не подключаем: пакет устарел.
- `typescript` — **6.0.3**: `@angular/compiler-cli@22` требует `>=6.0 <6.1`. В курсе PixiJS стоит TypeScript 7 (Go-версия без JS API) — здесь нельзя.
- `rxjs` — **7.8.2**.
- `zone.js` не подключаем (зонлесс — по умолчанию в v22).
- `monaco-editor` — **0.57.0** точно (внутри TS 5.9).

Обновление Angular — только между главами: `npm i @angular/*@<версия> @angular/compiler-cli@<версия>`, `npm run vendor` (пересоберёт `ts-angular.mjs` по метке версий), поменять `angularVersion` в `content/course.json`, прогнать `validate`, обе проверки из `tools/e2e/checks/` и `run-chapter` по всем главам.

## Компиляция кода ученика

Один модуль на чистом JS — **`shared/compile-core.js`** (+ `compile-core.d.ts`) — используется в трёх местах с одинаковым результатом:

| Где | Откуда берёт TypeScript и трансформ |
|---|---|
| Воркер платформы `src/compiler/compile.worker.ts` (клиент — `src/compiler/index.ts`, `compileStep(files)`) | `/vendor/ts-angular.mjs` — грузится при первом запуске |
| Проверки `tools/e2e/lib.mjs` (`compileDir`) | `typescript` и `@angular/compiler-cli` из `node_modules` |
| Валидатор `scripts/validate-content.mjs` | то же |

`compileFiles(ts, angularJitApplicationTransform, files)`:

1. **Подстановка ресурсов.** В `@Component({...})` свойства `templateUrl: './x.html'`, `styleUrl`, `styleUrls` заменяются на `template: "<JSON-строка>"` и `styles: [...]`. Замена — в тексте по позициям из AST, содержимое — одной строкой JSON, поэтому **номера строк не сдвигаются** и source map остаётся верной. Не найден файл → ошибка `app.ts:8 — не найден файл «./app2.html» (templateUrl)`, компонент получает пустой шаблон, остальное запускается.
2. **TypeScript** строит программу по виртуальной ФС (`/` — корень шага) с `noResolve`, `noLib` (типы для emit не нужны), `experimentalDecorators`, `useDefineForClassFields: false`, `target ES2022`, встроенные source map. Emit с `before: [angularJitApplicationTransform(program)]`. Синтаксические ошибки идут в список ошибок сборки.
3. Результат: `{ files: { 'main.js', 'core/cart-store.js', … }, styles: [содержимое styles.css], errors: [...] }`. Файлы `*.spec.ts` и `.d.ts` не компилируются (тесты — этап 4).

**Ошибки типов** даёт TS-воркер Monaco (`collectDiagnostics` в `src/editor/monaco.ts`) параллельно с компиляцией; они в консоли с меткой `TS` и **не блокируют запуск**.

`StepPage.runCode`: `Promise.all([compileStep(readModels(...)), collectDiagnostics(...)])`; результат устаревшего запуска отбрасывается (если за время компиляции начался следующий).

### Почему не WebContainers и не AOT в браузере

| Вариант | Плюсы | Минусы | Решение |
|---|---|---|---|
| **JIT в браузере** (выбран) | Быстро (десятки мс), офлайн, переиспользуется превью PixiJS | Нет проверки типов в шаблонах; ошибки шаблонов — во время выполнения; нет SSR, CLI, `ng test` | Основной путь. Недостающее — в части 3 на машине ученика |
| WebContainers (как angular.dev) | Настоящий `ng serve` | Холодный старт десятки секунд; COOP/COEP; лицензия; CLI 22 требует Node 22+ | Не используем |
| AOT (`ngtsc`) в воркере | Ошибки шаблонов как в CLI | Тяжелее; нужна виртуальная ФС с `.d.ts` | **План** — только для проверки шаблонов (этап 5) |

## Vendor: `scripts/copy-vendor.mjs`

Запускается перед `dev` и `build` (`predev`, `prebuild`), <1 с:

- `public/vendor/angular/<пакет>/*.mjs` (+ `.map`) — `fesm2022` пакетов Angular как есть (они ссылаются на соседние чанки относительными путями);
- `public/vendor/angular/common/locales/{ru,en}.mjs` — локали для пайпов (глава 7);
- `public/vendor/rxjs.mjs` — RxJS одним файлом (esbuild);
- `public/vendor/ts-angular.mjs` — TypeScript 6 + трансформ для воркера: esbuild, `platform: browser`, модули Node (`fs`, `path`, `module`, `url`, `os`, `crypto`, `process`, `util`) заменены заглушкой `scripts/node-stub.mjs`. ~4 МБ (1,2 МБ gzip). Пересобирается только при смене версий TypeScript/compiler-cli (метка `ts-angular.stamp.json`);
- `public/vendor/es-module-lexer.js`;
- **`public/preview.html`** — из `scripts/preview.template.html` с import map. Карта строится по полю `exports` в `package.json` пакетов (26 записей): новые подпути при обновлении Angular попадут в неё сами. `rxjs/operators` указывает на тот же `rxjs.mjs` (в RxJS 7 операторы экспортируются и из корня).

`public/vendor/` и `public/preview.html` — в `.gitignore` (генерируются).

## Превью: `public/preview-runtime.js`

Протокол с родителем (`src/preview/Preview.tsx`), все сообщения iframe → родитель имеют `source: 'angular-course-preview'`:

| Направление | Сообщение |
|---|---|
| iframe → родитель | `ready`; `console { level, text }`; `error { text }`; `url { url }`; `network { entry }` (одна запись приходит дважды: `pending`, затем итог) |
| родитель → iframe | `run { files, entry: 'main.js', styles, url, backend }`; `navigate { url }`; `history { delta }`; `backend-config { config }` |

Порядок запуска (`run`):

1. Настройки бэкенда; `<base href="/app/">`; `history.replaceState` на `/app` + начальный адрес. **Приложение живёт под `/app/`**, иначе роутер прочитал бы путь `/preview.html`. iframe не перезагружается никогда (каждый запуск — новый iframe), поэтому серверу не нужен fallback на `/app/*`.
2. Глобальные стили (`styles.css` шага) — `<style>` в `<head>`.
3. Если в результате сборки нет `main.js` — ничего не запускаем (ошибка уже в консоли).
4. Относительные импорты, **включая динамические** (`loadComponent: () => import('./cart/cart')`), переписываются на blob-URL через `es-module-lexer` (код из курса PixiJS). Модуль называется именем исходника (`//# sourceURL=cart/cart.ts`), позиции в стеке переводятся по source map.
5. `await import('@angular/compiler')`, затем точка входа.

Консоль: `console.*`, `error`, `unhandledrejection` → родителю. Значения: сигналы — `signal(3)` / `computed(…)` (значение читается из узла, без вызова — вызов создал бы зависимость), элементы DOM — `<input#id>`, объекты классов — `Catalog {…}`. Пути `http://…/vendor/angular/` в стеке сокращаются до `@angular/`.

Ошибки Angular в dev-режиме: NG0303/NG0304 и т. п. — `console.error` (код не падает), исключения в шаблоне — `ERROR TypeError…` через `ErrorHandler` (без указания места в шаблоне — ограничение JIT), ошибки компиляции шаблона (`@for` без `track`) — `Errors during JIT compilation of template for Catalog: …`.

## Учебный бэкенд: `public/backend/`

- `backend.js` — `createBackend({ originalFetch, report })` → `{ handle(request), configure(config) }`. Маршруты — `docs/project-app.md`, «Маршруты API».
- `data/*.json` — `games`, `categories`, `reviews`, `users`, `promo`. Загружаются при первом запросе **настоящим** `fetch` и живут в памяти iframe: каждый запуск — чистые данные.
- `preview-runtime.js` подменяет `window.fetch`: запросы того же origin с путём `/api/…` уходят в `backend.handle`, остальное — в настоящий `fetch`. `HttpClient` в Angular 22 по умолчанию работает через `FetchBackend` (проверено, `withFetch` устарел), `httpResource` — через `HttpClient`, поэтому перехвата `fetch` достаточно. `XMLHttpRequest` (`withXhr()`) **не перехватывается** — если понадобится, добавить.
- Настройки: `latency` (по умолчанию **300 мс**), `failRate` (0..1). Источники: frontmatter `backend:` → переключатели вкладки «Сеть».
- Отмена: если `AbortSignal` запроса сработал во время задержки — `AbortError`, в «Сети» — «отменён». `httpResource` отменяет устаревшие запросы сам (проверено: при наборе «шах» с задержкой 400 мс два запроса отменены).
- Авторизация: `Authorization: Bearer token-user` / `token-admin` (выдаёт `POST /api/login`).

Почему не Service Worker: живёт дольше iframe, требует регистрации и обновления; перехват `fetch` проще и умирает вместе с iframe.

## Редактор: `src/editor/monaco.ts`

- Типы: `.d.ts` пакетов `@angular/{core,common,compiler,platform-browser,forms,router}/types/*` и `rxjs/dist/types/**` кладутся по настоящим путям `file:///node_modules/…`. TS-воркер Monaco ищет модули по схеме node10 и **не понимает `exports`**, поэтому для каждого подпути из `exports` создаётся заглушка `<подпуть>/index.d.ts` с `export * from '<типы>'`. Отдельно — `@standard-schema/spec` (на него ссылаются Signal Forms).
- Настройки компилятора — как в `tsconfig.json` из `ng new` (`strict`, `experimentalDecorators`, `noImplicitOverride`, …).
- Модели: `file:///steps/<stepId>/<путь>`; путь файла по модели — `fileOfModel`. Синхронизация моделей с TS-воркером и `refreshDiagnostics` — решения из курса PixiJS (гонка «Cannot find module» при переходе между шагами).
- Воркеры: `ts.worker`, `html.worker`, `css.worker`, `editor.worker`.

## Проверка шагов `check.ts` — план (этап 3)

Шаг может содержать `check.ts`: функция получает контекст и проверяет **результат** (DOM, URL, запросы), а не текст кода:

```ts
import type { CheckContext, CheckResult } from '@course/check';

export default async function check({ document, navigate }: CheckContext): Promise<CheckResult> {
  await navigate('/catalog');
  if (document.querySelectorAll('app-game-card').length === 0) {
    return { pass: false, hint: 'В каталоге нет ни одной карточки: проверьте @for в catalog.html' };
  }
  return { pass: true };
}
```

## Тесты в превью — план (этап 4, глава 15)

`TestBed` работает в JIT (его родной режим). Нужен раннер с API Vitest (`describe`, `it`, `expect`, `beforeEach`, `vi.fn`) — тесты из курса должны без изменений запускаться в проекте Angular CLI (там Vitest по умолчанию — проверено по `@schematics/angular`). Вкладка «Тесты» вместо приложения при `preview: tests`.

## Загрузка контента и валидатор

`src/content/course.ts`: `import.meta.glob('/content/**/*', { query: '?raw', eager: true })`. Файлы шага — с подпапками.

`npm run validate`:

- `scripts/validate-content.mjs` — структура, frontmatter (YAML), цепочка `start`/`solution` и **сборка** каждого `start/` и `solution/` через `compile-core` (ловит ненайденные `templateUrl`/`styleUrl` и синтаксические ошибки);
- `tsc -p tsconfig.content.json` — типы кода уроков по настоящим `@angular/*` (настройки как в `ng new`).
- **План** (этап 5): `ngc` с `strictTemplates` по каждому `solution/`.

## Структура исходников

```
src/
  main.tsx, styles.css
  app/            — роутинг, макет из трёх панелей (StepPage: запуск компиляции и превью)
  lesson/         — markdown (контейнеры tip/warning/task/deep/legacy/hint), навигация по шагам
  editor/         — Monaco (monaco.ts: типы, Prettier, диагностика), вкладки (CodeEditor.tsx)
  compiler/       — веб-воркер компиляции и клиент
  preview/        — Preview.tsx: iframe, адресная строка, консоль, «Сеть»
  content/        — загрузка content/
  progress/       — localStorage
shared/
  compile-core.js — компиляция шага (браузер и Node)
public/
  preview-runtime.js  — среда выполнения
  backend/            — учебный бэкенд и данные
  assets/covers/      — обложки (scripts/build-covers.mjs)
  vendor/, preview.html — генерируются copy-vendor.mjs
scripts/
  copy-vendor.mjs, preview.template.html, node-stub.mjs
  validate-content.mjs
  build-covers.mjs     — SVG-обложки по games.json (npm run covers)
tools/e2e/
  lib.mjs          — launch, compileDir, openPreview, collect, pageText, appUrl, navigate
  run-dir.mjs      — шаг в чистом превью: консоль, сеть, адрес, текст, скриншот
  run-chapter.mjs  — все шаги главы в интерфейсе с «Решением»
  exp.mjs          — эксперимент со сценарием
  checks/ch00-sandbox.mjs — роутинг, бэкенд, отмена запросов, ленивая загрузка, ошибка 500
  checks/platform.mjs     — интерфейс: ошибки TS/сборки/Angular, схлопывание, адресная строка, «Сеть»
```

## Подводные камни

- **TypeScript 7 нельзя** (нет JS API), нужен 6.0.
- **Monarch: `@` в регулярных выражениях.** `@имя` — ссылка на атрибут грамматики («language definition does not contain attribute 'let'» роняет всю страницу), литеральный `@` — `@@` (`/@@let/`). `@(` и `@]` безопасны.
- **Своя грамматика `html` важнее встроенной**: встроенная регистрируется лениво через `registerTokensProviderFactory` и используется, только если провайдер не задан явно; `setMonarchTokensProvider('html', …)` при загрузке модуля её перекрывает, а конфигурация языка (скобки, комментарии) остаётся встроенной.
- **Monaco 0.57 и TS 5.9**: типы Angular 22 проверяются без ошибок. Проверять при обновлении Angular (если типы потребуют TS 6, Monaco начнёт показывать ложные ошибки). `monaco.typescript.ScriptTarget` не знает `ES2022` — в настройках `ESNext`.
- **Vite и `import()` в воркере**: в dev-режиме Vite дописывает `?import` к динамическому импорту, и файл из `public/` не загружается («Failed to fetch dynamically imported module …ts-angular.mjs?import»). Поэтому воркер импортирует через `new Function('url', 'return import(url)')` с абсолютным URL.
- **Vite `optimizeDeps.include`**: все динамически импортируемые модули платформы (Shiki, Prettier) — явно (из курса PixiJS).
- **Порядок в import map**: карта должна стоять до любого модуля — поэтому `preview.html` без сборщика.
- **Относительные ключи в import map** разрешаются от адреса документа, а не модуля — неважно, т. к. относительные импорты переписываются на blob-URL.
- **Циклические импорты** не поддерживаются, в том числе через динамический `import()`: ошибка «Циклический импорт: main.ts → app.ts → core/models.ts → app.ts». Ленивые маршруты (`loadComponent`) работают, пока лениво загружаемый файл не импортирует обратно цепочку, которая его загружает.
- **Ошибки в конструкторе компонента** (например, вызов несуществующего метода) роняют создание компонента — его шаблон не отрисуется, и ошибок шаблона (NG0303) уже не будет. Учитывать при подготовке экспериментов «сломайте X».
- **Порты**: 5173 и 5174 обычно заняты курсом PixiJS; у курса Angular — **5180** (`strictPort`).
