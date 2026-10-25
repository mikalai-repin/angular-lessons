# Архитектура платформы

Статический сайт без бэкенда. Весь код ученика компилируется и выполняется в браузере.

Основа — платформа курса `../pixi-js` (Vite + React + Monaco). Интерфейс, навигация, хранение прогресса, рендер уроков и e2e-инструменты перенесены с небольшими изменениями. Заново написаны **компиляция** (Angular нужен компилятор шаблонов), **превью** (DOM-приложение с роутингом), **учебный бэкенд** и вкладка **«Сеть»**.

> Всё, что ниже не помечено «план», реализовано и проверено автотестами `tools/e2e/checks/preview.mjs` и `platform.mjs`.

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
| **Заголовок вкладки** (`.preview-tab` над адресной строкой, с главы 10) | `document.title` приложения: `preview-runtime.js` следит за `<head>` (`MutationObserver`) и шлёт `title`. До первого `title` маршрута — «Превью» (`<title>` документа превью). Нужен для `title` маршрутов и `TitleStrategy` (шаг 10.8) |
| **Адресная строка превью** | Показывает адрес приложения (приложение сообщает о каждом `pushState`/`replaceState`/`popstate`). ← и → — `history.go(±1)` внутри iframe. ⟳ и ввод адреса + Enter — **перезапуск приложения с этого адреса**, как перезагрузка страницы в браузере (так ученик видит, что глубокая ссылка открывается «с нуля»). После правки кода приложение перезапускается **с текущего адреса** |
| **Вкладка «Сеть»** | Запросы к учебному бэкенду: метод, адрес, статус (`…`, `отменён`, код), время. Клик по строке — заголовки запроса (`authorization`, `content-type`, `x-xsrf-token`…), тело запроса и ответ. Переключатели «Задержка» (0/300/1000/3000 мс и значение из шага) и «Ошибка 500» действуют сразу, без перезапуска |
| **Консоль** | Метки `TS` (ошибки TypeScript из Monaco) и `Сборка` (ошибки компиляции: не найден `templateUrl` и т. п.). Одинаковые сообщения подряд схлопываются в одну строку со счётчиком (Angular повторяет NG0303 для каждого элемента `@for`). Адреса и коды `NG0xxx` — ссылки (код → `https://angular.dev/errors/NG0xxx`). На вкладке — число ошибок |
| **Вкладки `.html`/`.css`** | Подпапки в имени вкладки (`catalog/` приглушённо). Порядок без `files`: `main.ts`, затем файлы корня, затем подпапки; файлы одного компонента рядом (`.ts`, `.html`, `.css`). Активная вкладка прокручивается в видимую область |
| **Дерево файлов** (кнопка «☰ Файлы N» слева от вкладок, `src/editor/FileTree.tsx`) | Папки как в проекте CLI (сначала папки, затем файлы в порядке вкладок), сворачиваются; активный файл подсвечен; значки TS / `<>` / `#`. Открыто ли дерево — запоминается (`progress.fileTree`), по умолчанию закрыто. На узком экране всплывает поверх кода и закрывается после выбора файла |
| **Сворачивание панелей** (`useCollapsiblePanes` в `src/app/StepPage.tsx`) | Урок, код и результат сворачиваются кнопкой в шапке панели («, «, ») или перетаскиванием разделителя за минимальную ширину; свёрнутая панель — полоска 34px с вертикальной подписью, щелчок разворачивает. Содержимое остаётся смонтированным, при разворачивании результата код перезапускается (как при открытии вкладки на узком экране). Последнюю развёрнутую панель свернуть нельзя. Свёрнутые панели запоминаются (`progress.collapsed`). На узком экране не действует — там вкладки |
| **Оформление** (кнопка «Палитра» в шапке, `src/app/Appearance.tsx`) | Палитры «Angular» (по умолчанию: фиолетовый акцент и розовый щит; блок с `:root` в `src/styles.css` идёт первым, базовые цвета загрузчика в `index.html` — её), «Малиновая» (прежние цвета курса), «Голубая», «Изумрудная» — по две схемы, светлая и тёмная (тёмная — `[data-theme='dark'][data-palette='…']`). Переменные под `[data-palette='…']` получает и любой элемент с атрибутом — так образцы в меню показывают свои цвета. Выбор — `progress.palette`; скрипт в `index.html` ставит `data-palette` и `data-theme` до запуска приложения. Новая палитра — в трёх местах: `PALETTES`, `src/styles.css`, `index.html`. Логотип-щит (цвет `--logo`) в шапке и `favicon.svg`; загрузчик со щитом (`src/app/Loader.tsx`) — в `index.html` до запуска JavaScript, пока грузится страница шага (`Suspense`) и пока компилируется превью; при `prefers-reduced-motion` без анимации. Магазин «Ход конём» в коде уроков остаётся красным — это приложение ученика |
| **Тема** | Кнопка ☀/☾ в шапке переключает светлую и тёмную (`src/app/theme.ts`, `progress.theme`); **по умолчанию — тёмная**, системная настройка не учитывается. На `<html>` — `data-theme="light|dark"`; стили — `[data-theme='dark']`, редактор следит за атрибутом (`MutationObserver` в `monaco.ts`). Превью приложения ученика всегда светлое |
| **Панель урока** | Строка «Глава N…» с кнопкой «Свернуть» — липкая (`position: sticky` прямо в `.lesson-scroll`; `top` с поправкой на верхний отступ панели), при прокрутке под ней появляется граница (класс `scrolled`) |
| **Подсветка шаблонов Angular** (`src/editor/angular-html.ts`) | Своя грамматика Monarch для языка `html`: HTML + `@if`/`@for`/`@switch`/`@defer`/`@let` с выражениями, `{{ }}` (и в значениях атрибутов), `[prop]`, `[(model)]`, `(event)`, `#ref`, `*ngIf`, `animate.enter`, выражения (переменные, вызовы, пайпы, `$event`, строки, ключевые слова). Темы `course-light`/`course-dark` — `vs`/`vs-dark` + цвета Angular-токенов. Зарегистрирована для `html`, поэтому автодополнение HTML и Prettier работают как прежде |
| **Вкладка «Шаблон»** (глава 19, `src/preview/Inspector.tsx`) | Код, который JIT-компилятор сгенерировал за запуск для **классов ученика** (имена классов — из скомпилированных файлов шага): `preview-runtime.js` подменяет `JitEvaluator.prototype.evaluateCode` из `@angular/compiler` и запоминает исходник по `sourceUrl` (`ng:///GameCard.js` — определение, `ng:///GameCard/ɵfac.js` — фабрика, `…/ɵdir`, `…/ɵpipe`, `…/ɵprov`); пачка уходит родителю сообщением `templates` через 50 мс после последней компиляции. Выбор класса — `<select>` по группам (компоненты, директивы, пайпы, сервисы); код форматирует Prettier (`babel`, ширина 72) и подсвечивает Shiki (`highlightCode` из `src/lesson/markdown.ts`), результат кэшируется. Ленивые классы появляются, когда их загрузили |
| **Вкладка «Дерево»** (глава 19) | Компоненты на странице по DOM (`ng.getComponent` у каждого элемента), вложенность — по DOM. Щелчок раскрывает поля экземпляра: у сигналов вид (`signal`, `computed`, `linkedSignal`; `input` и `model` — по `ɵcmp.inputs`/`outputs`) и значение из узла без вызова, у остальных — `formatValue`; `__ngContext__` скрыт. Пока вкладка открыта, родитель раз в секунду шлёт `inspect-tree`. Наведение на строку — `highlight { id }`: полупрозрачная рамка `.course-highlight` поверх хоста в iframe |
| Нижняя панель: ▴/▾ | Разворачивает «Консоль / Сеть / Шаблон / Дерево» на 75 % высоты превью (`.console.expanded`). В режиме «Тесты» вкладок «Шаблон» и «Дерево» нет |

## Стек

| Задача | Решение | Почему |
|---|---|---|
| Сборка платформы | Vite 8 + TypeScript 6.0 | Как в курсе PixiJS. TypeScript 7 нельзя — см. «Версии» |
| UI платформы | React 19 | Готовый код из курса PixiJS |
| Роутинг платформы | `react-router`, URL вида `/:chapter/:step` | |
| Редактор | Monaco Editor 0.57 | TS language service (встроенный TS **5.9**) с типами `@angular/*` и `rxjs`; языки `html` и `css` со своими воркерами |
| Компиляция TS → JS | Веб-воркер `src/compiler/compile.worker.ts`: TypeScript 6.0 + `angularJitApplicationTransform` | TS-воркер Monaco не умеет применять трансформы; без трансформа не работают `input()`, `output()`, `model()`, `viewChild()` |
| Шаблоны → код | JIT-компилятор `@angular/compiler` в iframe превью | |
| Форматирование | Prettier 3.9.9: `typescript` для `.ts`, **`angular`** (плагин `html`) для `.html`, `css` (плагин `postcss`); настройки — `shared/lesson-prettier.json`, общие с файлами уроков; встроенные форматтеры Monaco для HTML/CSS выключены | Код уроков на диске в том же формате: «Формат» его не меняет (`checks/platform.mjs`) |
| Markdown уроков | `markdown-it` + контейнеры + Shiki: блоки `ts` подсвечиваются грамматикой **`angular-ts`**, `html` — **`angular-html`** | Подсвечиваются `@if`, привязки, шаблоны в декораторах |
| Прогресс | `localStorage`, ключ `angular-course:v1` (и выбранные тема и палитра) | |
| Загрузка | Страница шага (`StepPage`: Monaco, TypeScript Monaco, Prettier, Shiki) — ленивый чанк: начальный бандл ~2 МБ вместо ~8,8 МБ, шапка и оглавление появляются сразу | |

## Версии

Фиксируются точно в `package.json` и `content/course.json` (`angularVersion`):

- `@angular/core`, `common`, `compiler`, `compiler-cli`, `platform-browser`, `forms`, `router` — **22.2.1** (в `devDependencies`: в бандл платформы не попадают, нужны vendor-скрипту, Monaco и проверкам). `@angular/animations` не подключаем: пакет устарел.
- `@ngrx/signals`, `store`, `effects`, `operators`, `store-devtools` — **22.0.1** (глава 18; тоже `devDependencies`, точные версии). `@ngrx/entity`, `router-store` и прочие не подключены.
- `typescript` — **6.0.3**: `@angular/compiler-cli@22` требует `>=6.0 <6.1`. В курсе PixiJS стоит TypeScript 7 (Go-версия без JS API) — здесь нельзя.
- `rxjs` — **7.8.2**.
- `zone.js` — **0.16.3** (`devDependencies`, точная версия): только для шага 19.4, приложения курса — зонлесс (по умолчанию в v22).
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
- `public/vendor/ngrx/<пакет>/*.mjs` — то же для пакетов NgRx (`NGRX_PACKAGES`, глава 18): раскладка `fesm2022` + `exports` такая же, как у Angular, — копирует одна функция `copyPackage`. Типы для редактора — те же пять пакетов в `src/editor/monaco.ts` (заглушки подпутей строит общий код);
- `public/vendor/angular/common/locales/{ru,en}.mjs` — локали для пайпов (глава 7);
- `public/vendor/rxjs.mjs` — RxJS одним файлом (esbuild);
- `public/vendor/ts-angular.mjs` — TypeScript 6 + трансформ для воркера: esbuild, `platform: browser`, модули Node (`fs`, `path`, `module`, `url`, `os`, `crypto`, `process`, `util`) заменены заглушкой `scripts/node-stub.mjs`. ~4 МБ (1,2 МБ gzip). Пересобирается только при смене версий TypeScript/compiler-cli (метка `ts-angular.stamp.json`);
- `public/vendor/zone.mjs` — `zone.js/fesm2015/zone.js` (0.16.3) и запись `zone.js` в import map: глава 19 подключает зону строкой `import 'zone.js'` в `main.ts`; без импорта файл не грузится. Типы для редактора — `zone.d.ts` и `lib/*.d.ts` в `src/editor/monaco.ts`;
- `public/vendor/es-module-lexer.js`;
- **`public/preview.html`** — из `scripts/preview.template.html` с import map. Карта строится по полю `exports` в `package.json` пакетов (39 записей, из них 12 — NgRx): новые подпути при обновлении Angular попадут в неё сами. `rxjs/operators` указывает на тот же `rxjs.mjs` (в RxJS 7 операторы экспортируются и из корня).

`public/vendor/` и `public/preview.html` — в `.gitignore` (генерируются).

## Превью: `public/preview-runtime.js`

Протокол с родителем (`src/preview/Preview.tsx`), все сообщения iframe → родитель имеют `source: 'angular-course-preview'`:

| Направление | Сообщение |
|---|---|
| iframe → родитель | `ready`; `console { level, text }`; `error { text }`; `url { url }`; `title { title }`; `network { entry }` (одна запись приходит дважды: `pending`, затем итог; в записи — `requestHeaders`, `requestBody`, `responseBody`); `templates { items: [{ name, kind, parts: [{ part, code }] }] }`; `tree { nodes: [{ id, name, tag, fields, children }] }` |
| родитель → iframe | `run { files, entry: 'main.js', styles, url, backend }`; `navigate { url }`; `history { delta }`; `backend-config { config }`; `inspect-templates`, `inspect-tree`, `highlight { id \| null }` (вкладки «Шаблон» и «Дерево») |

Порядок запуска (`run`):

1. Настройки бэкенда; `<base href="/app/">`; `history.replaceState` на `/app` + начальный адрес. **Приложение живёт под `/app/`**, иначе роутер прочитал бы путь `/preview.html`. iframe не перезагружается никогда (каждый запуск — новый iframe), поэтому серверу не нужен fallback на `/app/*`.
2. Глобальные стили (`styles.css` шага) — `<style>` в `<head>`.
3. Если в результате сборки нет `main.js` — ничего не запускаем (ошибка уже в консоли).
4. Относительные импорты, **включая динамические** (`loadComponent: () => import('./cart/cart')`), переписываются на blob-URL через `es-module-lexer` (код из курса PixiJS). Модуль называется именем исходника (`//# sourceURL=cart/cart.ts`), позиции в стеке переводятся по source map.
5. `await import('@angular/compiler')`; платформа Angular создаётся заранее с перехватчиком загрузки `@defer` (ниже); затем точка входа.

**Чанки `@defer` (глава 15).** JIT не выносит зависимости блока в отдельный файл: компилятор разбирает шаблон с `deferBlockDependencies` = `undefined`, функция загрузки блока — `null`, и блок «загружается» за микрозадачу — `@loading`, `@error` и `prefetch` не видны. Среда превью до запуска кода ученика вызывает `platformBrowser([{ provide: ɵDEFER_BLOCK_DEPENDENCY_INTERCEPTOR, useValue }])` (`createPlatformWithDeferChunks`): отладочный токен Angular, его спрашивают перед загрузкой зависимостей блока в режиме разработки. Перехватчик возвращает функцию, которая просит у учебного бэкенда `backend.chunk('/chunk-defer-N.js')` — запись во вкладке «Сеть» с задержкой и ошибкой из настроек бэкенда (номер — порядок загрузки за запуск) — и отдаёт `{}` (определений нет, блок рисуется тем, что в `imports`). `bootstrapApplication` ученика переиспользует эту платформу (`createOrReusePlatformInjector`). Отличие от AOT: «грузится» каждый блок, даже без выносимых зависимостей (в сборке у такого блока функция — `null`). Как устроено в AOT — шаг 15.9.

Консоль: `console.*`, `error`, `unhandledrejection` → родителю. Значения: сигналы — `signal(3)` / `computed(…)` (значение читается из узла, без вызова — вызов создал бы зависимость), элементы DOM — `<input#id>`, объекты классов — `Catalog {…}`. Пути `http://…/vendor/angular/` в стеке сокращаются до `@angular/`.

Ошибки Angular в dev-режиме: NG0303/NG0304 и т. п. — `console.error` (код не падает), исключения в шаблоне — `ERROR TypeError…` через `ErrorHandler` (без указания места в шаблоне — ограничение JIT), ошибки компиляции шаблона (`@for` без `track`) — `Errors during JIT compilation of template for Catalog: …`.

## Учебный бэкенд: `public/backend/`

- `backend.js` — `createBackend({ originalFetch, report })` → `{ handle(request), chunk(name), upload(url), configure(config) }`; `chunk` — имитация чанка `@defer` (см. «Превью»), `upload` — файл, загруженный через `POST /api/covers`. Маршруты — `docs/project-app.md`, «Маршруты API».
- `data/*.json` — `games`, `categories`, `reviews`, `users`, `promo`. Загружаются при первом запросе **настоящим** `fetch` и живут в памяти iframe: каждый запуск — чистые данные.
- `preview-runtime.js` подменяет `window.fetch`: запросы того же origin с путём `/api/…` уходят в `backend.handle`, остальное — в настоящий `fetch`. `HttpClient` в Angular 22 по умолчанию работает через `FetchBackend` (проверено, `withFetch` устарел), `httpResource` — через `HttpClient`, поэтому перехвата `fetch` достаточно. `XMLHttpRequest` (`withXhr()`) **не перехватывается** — если понадобится, добавить.
- Настройки: `latency` (по умолчанию **300 мс**), `failRate` (0..1), `tokenTtl` — срок токена доступа в секундах (по умолчанию 3600; переключателя нет, только frontmatter). Источники: frontmatter `backend:` → переключатели вкладки «Сеть».
- Отмена: если `AbortSignal` запроса сработал во время задержки — `AbortError`, в «Сети» — «отменён». `httpResource` отменяет устаревшие запросы сам (проверено: при наборе «шах» с задержкой 400 мс два запроса отменены).
- Тело запроса: JSON или `multipart/form-data` (`FormData`, глава 17) — `request.formData()`; во вкладке «Сеть» у формы с файлом — поля и описание файла («файл cover.svg, image/svg+xml, 123 байт»), а не содержимое. `multipart` без `boundary` (заголовок поставили руками) — 400 «Не удалось разобрать тело multipart/form-data».
- Загруженные обложки (глава 17): `POST /api/covers` кладёт файл в `db.uploads` и отвечает `{ url: '/uploads/N-имя' }`. По сети такого адреса нет, поэтому `preview-runtime.js` подменяет у `<img>` сеттер свойства `src` и `Element.prototype.setAttribute('src', …)`: адрес `/uploads/…`, который знает бэкенд, превращается в `blob:` с этим файлом. Код ученика видит обычный адрес — `NgOptimizedImage` (запрещает `blob:` и `data:` в `ngSrc`, NG02952) работает с загруженной обложкой, как с файлом на сервере. Как и остальные данные — до перезапуска превью.
- Авторизация (глава 14): `POST /api/login` выдаёт JWT HS256 (подпись — `crypto.subtle`, ключ `JWT_SECRET` в `backend.js`): токен доступа на `tokenTtl` с и refresh-токен на 7 дней. Выданные токены не хранятся — вход переживает перезапуск превью; отозванные refresh-токены (`/api/refresh` с ротацией, `/api/logout`) — в памяти до перезапуска. Недействительный или истёкший `Authorization` — 401 на любом `/api/…`, кроме входа, обновления и выхода. Вечные `token-user` / `token-admin` принимаются по-прежнему (удобно для `check.ts`).

Почему не Service Worker: живёт дольше iframe, требует регистрации и обновления; перехват `fetch` проще и умирает вместе с iframe.

## Редактор: `src/editor/monaco.ts`

- Типы: `.d.ts` пакетов `@angular/{core,common,compiler,platform-browser,forms,router}/types/*` и `rxjs/dist/types/**` кладутся по настоящим путям `file:///node_modules/…`. TS-воркер Monaco ищет модули по схеме node10 и **не понимает `exports`**, поэтому для каждого подпути из `exports` создаётся заглушка `<подпуть>/index.d.ts` с `export * from '<типы>'`. Отдельно — `@standard-schema/spec` (на него ссылаются Signal Forms).
- Настройки компилятора — как в `tsconfig.json` из `ng new` (`strict`, `experimentalDecorators`, `noImplicitOverride`, …).
- Модели: `file:///steps/<stepId>/<путь>`; путь файла по модели — `fileOfModel`. Новый шаг сначала удаляет модели других шагов (`disposeOtherModels`), потом создаёт свои: очистка эффекта старого шага срабатывает позже, а каждая модель подписывается на `LanguageService._onDidChange` с порогом утечки 200 — два шага по ~100 файлов давали ошибку страницы «potential listener LEAK detected» (глава 15, 101 файл). Синхронизация моделей с TS-воркером и `refreshDiagnostics` — решения из курса PixiJS (гонка «Cannot find module» при переходе между шагами).
- Воркеры: `ts.worker`, `html.worker`, `css.worker`, `editor.worker`.

## Проверка шагов `check.ts`

Шаг может содержать `check.ts`: функция получает контекст и проверяет **результат** (DOM, адрес, консоль, запросы), а не текст кода. Формат и правила — `lesson-format.md`. Сейчас проверки есть у всех практикумов (главы 2–14).

- **Кнопка «✓ Проверить»** (`StepPage.tsx`, только у шагов с `check.ts`): компилирует код ученика и `check.ts` тем же воркером, `PreviewRun.check` — скомпилированный модуль проверки. Превью запускает приложение **заново с начального адреса шага** (`url` из frontmatter) и передаёт `check` в сообщении `run`. Перезапуск ⟳ и адресная строка проверку не повторяют.
- **В iframe** (`preview-runtime.js`, раздел «Проверка шага»): данные приложения в `localStorage` убираются (ключи платформы `angular-course*` не трогаются), модуль проверки загружается до старта приложения — его `export const storage` записывается в `localStorage`, — затем приложение стартует. Проверка ждёт корневой компонент (`ng.getComponent`, только dev-режим — превью всегда в нём) и `ApplicationRef.whenStable()`; каждое действие контекста (`click`, `fill`, `navigate`) заканчивается `settle()` — `whenStable` между двумя кадрами. Результат — сообщение `check-result`; после него `localStorage` возвращается как был.
- **Результат** — полоса под кнопками редактора: «✓ Всё работает» или «✗ подсказка». Пройденная проверка отмечает шаг пройденным.
- Таймаут проверки — 15 с; исключение в проверке — «Проверка упала…» (стек — в консоли превью предупреждением).
- Типы контекста — `shared/course-check.d.ts` (модуль `@course/check`); валидатор собирает `check.ts` и проверяет его типы вместе с кодом шагов.
- `tools/e2e/checks/step-checks.mjs [глава…]` — на каждом шаге с `check.ts`: старт не проходит (с подсказкой), решение проходит, консоль чистая; в конце — что `localStorage` ученика после проверки на месте.

## Тесты в превью (глава 16)

Шаг с `preview: tests` (или переключатель «Приложение / Тесты» над превью — он есть у шага, где есть `*.spec.ts`) запускает вместо `main.ts` все файлы `*.spec.ts`. Тесты курса без изменений работают в проекте Angular CLI 22 (`ng test`, Vitest 5): это проверено сравнением (`tools/e2e/ng-test.mjs`).

- **Компиляция.** `compileFiles(…, { tests: true })` компилирует и `*.spec.ts` (в режиме приложения их нет в сборке, и ошибка в тесте не мешает запуску). Воркер получает флаг от `compileStep(files, { tests })`.
- **Раннер** — `vendor-src/vitest.mjs`, собирается `copy-vendor` (esbuild) в `public/vendor/vitest.mjs`, в import map — как `vitest`. Матчеры и сообщения — настоящие `@vitest/expect` + `chai` 5.0.5 (`createExpect` повторяет Vitest 5), `vi.fn`/`vi.spyOn` — `@vitest/spy`, `vi.useFakeTimers` — `@sinonjs/fake-timers` с обёрткой как `FakeTimers` в Vitest. Сбор и выполнение тестов — свои (`@vitest/runner` в Vitest 5 отдельно не публикуется), семантика сверена с исходником Vitest 5.0.5: хуки `beforeEach` снаружи внутрь, `afterEach`/`afterAll` — в обратном порядке, функция из `beforeEach`/`beforeAll` — очистка; первая ошибка в цепочке `afterEach` обрывает её (внешние `afterEach`, в том числе очистку `TestBed`, и очистки `beforeEach`) — отсюда каскад «Cannot configure the test module…»; `onTestFinished` (в обратном порядке), затем `onTestFailed`; `afterAll` — и после упавшего `beforeAll`; набор или файл без тестов — ошибка набора `No test found in suite <имя>`; `.only` в пределах файла, `each` (`%s %i %#`, `$prop`), `for`, `fails`, `context.skip`, тайм-ауты 5000/10000 мс (место — строка объявления теста), упавший `beforeAll` — набор с ошибкой, тесты пропущены, `expect.assertions`/`hasAssertions`, не дождавшиеся `await` проверки `resolves`/`rejects` раннер дожидается после теста. После каждого теста — пауза на макрозадачу, в конце — ожидание простоя (`requestIdleCallback`): отложенные ошибки попадают в отчёт «Ошибки вне тестов», как «Unhandled Errors» у Vitest. Нет: `vi.mock` (модули не подменить — понятная ошибка), снапшотов, `expect.poll`, `each` с шаблонной строкой.
- **Хранилище.** На время прогона `window.localStorage` подменяется хранилищем в памяти (`installMemoryStorage` в `preview-runtime.js`): тесты начинают с пустого, как в jsdom у `ng test`, не видят корзину ученика и не стирают прогресс курса (общий origin). `check.ts` с `export storage` заполняет это же хранилище.
- **Окружение** — как у сборщика `@angular/build:unit-test` (runner vitest): глобальные имена (`globals: true`), один граф модулей на все файлы (`isolate: false`), `beforeEach(getCleanupHook(false))`/`afterEach(getCleanupHook(true))` в глобальном наборе (`setupGlobals`), `initTestEnvironment([BrowserTestingModule, TestModule], platformBrowserTesting(), { errorOnUnknownElements: true, errorOnUnknownProperties: true })` с `DynamicDOMTestComponentRenderer` (`runTests`/`setupTestBed` в `preview-runtime.js`). Платформа с перехватчиком `@defer` в режиме тестов не создаётся.
- **Отчёт** — события `{ type: 'tests', event }`: `collected` (дерево файлов и `describe`), `result` (состояние, время, ошибки: сообщение, diff, места `❯ файл.ts:строка:столбец`), `done` (время, `unhandled`). `src/preview/TestReport.tsx`: итог в панели вместо адресной строки, ⟳ — перезапуск, отчёт поверх кадра (тесты рисуют компоненты в том же iframe), прошедшие файлы сворачиваются, если что-то упало.
- **Проверка шага** (`check.ts`) у шага с тестами получает `tests` (файл, имя, полное имя, состояние, ошибки) и `unhandled`; «Проверить» всегда запускает режим из frontmatter.
- **Типы**: `shared/vitest.d.ts` — модуль `vitest` и глобальные `describe`/`it`/`expect`/`vi` (сигнатуры Vitest 5, `each` — как в Vitest) поверх настоящих типов `@vitest/expect`/`@vitest/spy`; редактор кладёт их и `.d.ts` зависимостей (`@vitest/utils`, `@vitest/pretty-format`, `tinyrainbow`, `@types/chai`), валидатор включает в `.content-check`.

**Отличия от `ng test` (знать при написании главы 16):**

- `ng test` собирает тесты **AOT**: ошибка шаблона (`NG8001` — неизвестный элемент) — ошибка сборки, ни один тест не запустится; в превью (JIT) — `NG0304` в одном тесте (если тест вызвал `configureTestingModule` — строгий режим включается там; иначе только `console.error`).
- Setup CLI выполняется перед каждым файлом (`setupFiles`), хуки очистки — на уровне файла; в превью они в глобальном наборе — для теста разницы нет. Файлы в `ng test` идут в нескольких процессах (`fileParallelism`), в превью — друг за другом в одном окне: каскад после упавшего `afterEach` в превью доходит до следующих файлов, в `ng test` — только в пределах процесса.
- Ошибки вне тестов, которые зависят от времени (`NG0205` после разбора стенда), превью ловит всегда (ждёт простоя в конце), `ng test` — если они успели случиться до конца прогона.
- `ng test` по умолчанию — **jsdom** (Node): нет `matchMedia`, `IntersectionObserver`, раскладки (`getBoundingClientRect` — нули). Превью — настоящий Chromium, как `ng test --browsers=chromiumHeadless` (Vitest browser mode + Playwright). В jsdom «летящая обложка» 15.8 падает: `TypeError: matchMedia is not a function`.
- `vi.mock` в превью нет.

## Загрузка контента и валидатор

`src/content/course.ts`: `import.meta.glob('/content/**/*', { query: '?raw', eager: true })`. Файлы шага — с подпапками. Полный код старта и решения каждого шага собирает `shared/step-chain.js` (шаг хранит только изменения, см. `lesson-format.md`).

`npm run validate`:

- `scripts/validate-content.mjs` — структура, frontmatter (YAML), цепочка шагов (шаг хранит только изменения, полный код собирает `shared/step-chain.js`; копии, лишние `start/` и пустые оверлеи — ошибки) и **сборка** полного кода каждого решения и `custom`-старта через `compile-core` (ловит ненайденные `templateUrl`/`styleUrl` и синтаксические ошибки). Полный код выгружает в `.content-check/` (не в git);
- `tsc -p .content-check/tsconfig.json` — типы полного кода шагов по настоящим `@angular/*` (настройки из `tsconfig.content.json`, как в `ng new`).
- **План** (этап 5): `ngc` с `strictTemplates` по каждому `solution/`.

## Структура исходников

```
src/
  main.tsx, styles.css
  app/            — роутинг, макет из трёх панелей (StepPage: запуск компиляции и превью)
  lesson/         — markdown (контейнеры tip/warning/task/deep/legacy/hint), навигация по шагам
  editor/         — Monaco (monaco.ts: типы, Prettier, диагностика), вкладки (CodeEditor.tsx)
  compiler/       — веб-воркер компиляции и клиент
  preview/        — Preview.tsx: iframe, адресная строка, консоль, «Сеть»; Inspector.tsx: вкладки «Шаблон» и «Дерево»
  content/        — загрузка content/
  progress/       — localStorage (шаги, лучшие результаты квизов)
  quiz/           — страница квиза главы /<глава>/quiz (перенесена из ../react-learn)
shared/
  compile-core.js — компиляция шага (браузер и Node)
  step-chain.js   — разбор lesson.md и сборка полного кода шагов из изменений (платформа и Node)
  lesson-prettier.json — настройки «Формат» для кода уроков
public/
  preview-runtime.js  — среда выполнения
  backend/            — учебный бэкенд и данные
  assets/covers/      — обложки (scripts/build-covers.mjs)
  vendor/, preview.html — генерируются copy-vendor.mjs
scripts/
  copy-vendor.mjs, preview.template.html, node-stub.mjs
  validate-content.mjs
  step-files.mjs       — полный код шагов на диске (npm run step; валидатор, e2e, генераторы)
  build-covers.mjs     — SVG-обложки по games.json (npm run covers)
tools/e2e/
  lib.mjs          — чистое превью (compileDir, openPreview, collect, pageText, appUrl, navigate)
                     и интерфейс платформы (openCourse, createChecks, clean)
  run-dir.mjs      — шаг в чистом превью: консоль, сеть, адрес, текст, скриншот
  run-chapter.mjs  — все шаги главы в интерфейсе с «Решением»
  exp.mjs          — эксперимент со сценарием
  aot-chapter.mjs  — ngc --strictTemplates по полному коду каждого шага главы
  checks/preview.mjs      — демо шага 1.1: роутинг, бэкенд, отмена запросов, ленивая загрузка, ошибка 500
  checks/platform.mjs     — интерфейс: ошибки TS/сборки/Angular, схлопывание, адресная строка, «Сеть»
  checks/chNN-*.mjs       — главы: шаги кнопкой «Далее», «Решение», взаимодействие, эксперименты
  checks/step-checks.mjs  — проверки check.ts: старт не проходит, решение проходит
tools/authoring/
  steps.py          — write_steps (запись только изменений), step_dir, rep/cut
  format-content.py — пересборка глав из content/ (формат, base/baseHash)
  ch15-gen.py       — генератор последней главы (образец; `dump <папка>` — полные снимки шагов для опытов)
```

## Подводные камни

- **TypeScript 7 нельзя** (нет JS API), нужен 6.0 — см. «Версии».
- **Monarch: `@` в регулярных выражениях.** `@имя` — ссылка на атрибут грамматики («language definition does not contain attribute 'let'» роняет всю страницу), литеральный `@` — `@@` (`/@@let/`). `@(` и `@]` безопасны.
- **Своя грамматика `html` важнее встроенной**: встроенная регистрируется лениво через `registerTokensProviderFactory` и используется, только если провайдер не задан явно; `setMonarchTokensProvider('html', …)` при загрузке модуля её перекрывает, а конфигурация языка (скобки, комментарии) остаётся встроенной.
- **Monaco 0.57 и TS 5.9**: типы Angular 22 проверяются без ошибок. Проверять при обновлении Angular (если типы потребуют TS 6, Monaco начнёт показывать ложные ошибки). `monaco.typescript.ScriptTarget` не знает `ES2022` — в настройках `ESNext`.
- **Vite и `import()` в воркере**: в dev-режиме Vite дописывает `?import` к динамическому импорту, и файл из `public/` не загружается («Failed to fetch dynamically imported module …ts-angular.mjs?import»). Поэтому воркер импортирует через `new Function('url', 'return import(url)')` с абсолютным URL.
- **Vite `optimizeDeps.include`**: все динамически импортируемые модули платформы (Shiki, Prettier) — явно (из курса PixiJS).
- **Порядок в import map**: карта должна стоять до любого модуля — поэтому `preview.html` без сборщика.
- **Относительные ключи в import map** разрешаются от адреса документа, а не модуля — неважно, т. к. относительные импорты переписываются на blob-URL.
- **Циклические импорты** не поддерживаются, в том числе через динамический `import()`: ленивые маршруты (`loadComponent`) работают, пока лениво загружаемый файл не импортирует обратно цепочку, которая его загружает. Как обойти в коде урока — ловушки в `authoring-process.md`.
- **Порт 5180** (`strictPort`): 5173 и 5174 заняты курсом PixiJS.
