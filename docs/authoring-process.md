Документ для того, кто пишет курс: человека или модели в новом чате. Здесь описан **процесс** написания главы, обязательные проверки и ловушки. Процесс перенесён из курса PixiJS (`../pixi-js/docs/authoring-process.md`), где по нему написаны 11 глав и найдено несколько десятков ошибок в черновиках. Прочитайте этот документ целиком перед началом работы вместе с `CLAUDE.md`, `docs/writing-guide.md` и `docs/modern-angular.md`.

# Процесс написания главы

## 0. Подготовка

```bash
npm install
npm run dev           # dev-сервер на http://localhost:5180 — нужен для всех проверок
node tools/e2e/checks/platform.mjs   # платформа в порядке? должно быть «Всё прошло»
```

Прочитайте:

- строки главы в `docs/course-plan.md` — план шагов (ориентир, а не закон);
- что глава добавляет в магазин — `docs/project-app.md`;
- **последний шаг предыдущей главы** целиком (`content/<глава>/<последний шаг>/solution/*`) — стартовая точка новой главы;
- раздел «Проверить при написании…» в `docs/modern-angular.md` — пункты, относящиеся к главе.

## 1. Сверка API до написания кода

Никаких утверждений об API по памяти. В интернете и в памяти модели много Angular 2–17. Перед главой выпишите все API, которые она вводит, и проверьте каждое:

```bash
T=node_modules/@angular/core/types        # типы: core.d.ts и чанки _*-chunk.d.ts
F=node_modules/@angular/core/fesm2022     # код — для поведения и значений по умолчанию
# экспорты собраны списками `export { … }`: искать «declare function X», а не «export declare function X»
python3 -c "…"                            # для поиска удобнее Python + re, чем grep в zsh
```

Что проверять:

- сигнатуры и названия параметров;
- **стабильность**: теги `@publicApi <версия>`, `@experimental`, `@developerPreview`, `@deprecated` в JSDoc;
- **значения по умолчанию** — в v22 многое поменялось (OnPush, зонлесс, standalone);
- **поведение** — читать реализацию в `fesm2022`, а не только комментарии;
- **поведение в JIT** — если API связан с компилятором (`@defer`, сигнальные входы, `host`, `templateUrl`), проверить запуском в превью, а не только по документации.

Новые проверенные факты записывайте в `docs/modern-angular.md`.

## 2. Код шагов

Код каждого шага — полные снимки файлов в `start/` и `solution/`. Удобнее всего генерировать их Python-скриптом **во временной папке** (scratchpad, не в репозитории): общие куски — строковые константы, шаги — их комбинации. Так цепочка «решение шага N = старт шага N+1» получается автоматически.

Правила:

- первый шаг главы — `startFrom: custom`, его старт — очищенное решение последнего шага прошлой главы. Что убрали или вынесли в файлы, объясняется в тексте первого шага;
- если старт отличается от прошлого решения хотя бы строкой `// TODO`, шаг тоже `custom`;
- новый файл, появившийся в шаге, — тоже `custom`; в старте лежит заготовка с `// TODO`;
- интерфейс магазина должен помещаться в превью **500 × 600** без растягивания панелей;
- после генерации: `npx tsc -p tsconfig.content.json` — весь код уроков проверяется по настоящим типам `@angular/*`.

## 3. Проверка запуском до текста

```bash
node tools/e2e/run-dir.mjs content/03-signals/02-signal/solution          # консоль, запросы, адрес, текст, скриншот
node tools/e2e/run-dir.mjs content/10-routing/03-params/solution /games/8  # с начального адреса
```

Обязательно:

- консоль без ошибок и без предупреждений Angular (`NG0xxx`) — кроме тех, что шаг показывает намеренно;
- текст страницы — тот, что обещает урок;
- скриншот — откройте и посмотрите глазами (вёрстка в 500 px, переполнение, пустые места).

Для экспериментов из текста создайте временную папку (scratchpad) с копией шага и правкой и запустите её тем же `run-dir.mjs`; сценарий действий (клики, ввод, переходы) — через `tools/e2e/exp.mjs`:

```js
// сценарий.mjs
export default async ({ page, pageText, navigate, wait }) => {
  await page.type('.search', 'шах');
  await wait(500);
  console.log(await pageText());
  await navigate('/cart');
};
```

В `tools/e2e/lib.mjs` есть всё для своих проверок глав: `compileDir`, `openPreview(browser, compiled, { url, backend, waitMs })`, `collect` (ошибки среды и запросы бэкенда), `pageText`, `appUrl`, `navigate`. Образцы — `checks/ch00-sandbox.mjs` (чистое превью) и `checks/platform.mjs` (интерфейс платформы, код ученика подкладывается в `localStorage`).

## 4. Текст уроков

По `docs/writing-guide.md`. Структура шага: зачем → объяснение → код с подсветкой строк → `::: task` → «Что получилось» → эксперименты → «Как в настоящем проекте» → `::: deep` / `::: legacy`. Практикум: `::: task` со списком, `::: hint` от общего к конкретному, «Проверьте себя», «Итоги главы» с мостиком к следующей главе.

## 5. Проверка каждого утверждения в тексте

Самый важный этап. Каждое фактическое утверждение и **каждый предложенный эксперимент** («уберите X — увидите Y») проверяется кодом или исходниками. Особенно:

- тексты и коды ошибок (`NG0xxx`) — только увиденные в консоли;
- «Angular обновит / не обновит экран» — проверить запуском (OnPush по умолчанию меняет многие привычные ответы);
- «этот запрос отменится / не отменится» — по вкладке «Сеть» или логу учебного бэкенда;
- порядок хуков и эффектов — логом в консоли.

Записывайте найденные ошибки черновиков в таблицу ниже — это память проекта.

| Утверждение в черновике | Как на самом деле |
|---|---|
| «`private`-поле в шаблоне не скомпилируется в AOT» (гл. 2) | AOT 22.2 принимает `private`; `protected` — только рекомендация стиля |
| «Поменяли поле в обработчике — экран не обновится (OnPush + зонлесс)» (план 3.1) | Обновится: обработчик в шаблоне помечает представление «грязным». Не обновится, только если изменение пришло не из события шаблона |
| «`aria-label` — только через `[attr.aria-label]`» (гл. 2) | В 22.2 работает и `[aria-label]` (`ɵɵariaProperty`); для примера «у атрибута нет свойства» взяли `data-*` |
| «Ошибки `@let` (чтение до объявления, присваивание) видны в превью» (гл. 2) | JIT их не проверяет — только AOT (NG8015–NG8017) |
| `protected readonly inStock = 12` + `[disabled]="inStock === 0"` (гл. 2) | AOT `strictTemplates`: TS2367 из-за литерального типа `12`; нужен `: number` |
| «В шаблоне нельзя шаблонные строки, `typeof`, стрелочные функции» (память модели) | В 22.2 всё это работает |

Вывод из курса PixiJS: **не доверяйте себе**. Если утверждение нельзя проверить, лучше его не писать.

## 6. Регистрация и прогон в платформе

```bash
# добавить папку главы в content/course.json → chapters
npm run validate                                  # структура, цепочка start/solution, YAML, типы
node tools/e2e/run-chapter.mjs 03-signals         # все шаги в интерфейсе: «Решение», консоль, ошибки
```

`run-chapter` должен закончиться строкой `Ошибки страницы: []`. Если в главе есть взаимодействие (формы, роутинг, корзина), напишите проверку в `tools/e2e/checks/chNN-*.mjs`: клики, ввод, переходы, состояние после «перезагрузки». Числа из этих проверок можно цитировать в тексте («мы проверили: …»).

Переходы между шагами кнопкой «Далее» (а не только `goto`) — обязательно: в курсе PixiJS именно так нашлась гонка синхронизации TS-воркера Monaco.

## 7. Документация

- `docs/roadmap.md` — отметить главу, записать технический долг;
- `docs/project-app.md` — если изменилась структура файлов магазина;
- `docs/modern-angular.md` — новые проверенные факты, закрытые пункты «Проверить»;
- этот документ — новые ловушки и раздел «Фактическое состояние».

# Ловушки окружения

Перенесены из курса PixiJS и прототипа; дополнять по мере работы.

- **TypeScript 7** (Go-версия) не имеет JS API. Воркеру компиляции и `@angular/compiler-cli` нужен **TypeScript 6.0**.
- **`@angular/compiler-cli` — только ESM**: `require()` не работает, скрипты — `.mjs`. Трансформ: `import { angularJitApplicationTransform } from '@angular/compiler-cli'`.
- **Node 20** не запускает `.ts` напрямую: скрипты в `scripts/` и `tools/` — `.mjs`.
- **Vite `optimizeDeps.include`**: новые динамически импортируемые модули платформы — туда, иначе «Failed to fetch dynamically imported module».
- **zsh**: `$x[?]`, `*.d.ts` без кавычек в аргументах интерпретируются как glob («no matches found»). Для поиска — Python.
- **Не пишите во временные файлы `/tmp`**: используйте папку scratchpad сессии или `tools/e2e/out/` (в `.gitignore`).
- **YAML во frontmatter**: `@`, `{`, `[`, `:` внутри списков — в кавычках.
- **Import map**: относительные ключи разрешаются от адреса документа (см. `architecture.md`).
- **`import '@angular/compiler'`** должен выполниться до кода приложения, иначе JIT не работает (делает `preview-runtime.js`).
- **Angular CLI 22 требует Node 22.22+ / 24.15+**, а по умолчанию в терминале автора Node 20.19 (nvm: есть 22.15, 24.15). Для `ng new` — `nvm use 24.15` или читать шаблоны из `@schematics/angular` (`npm pack @schematics/angular@<версия>`). Важно для главы 20: ученику нужен Node 22+.
- **Порты**: 5173 и 5174 заняты dev-серверами курса PixiJS — курс Angular на 5180.
- **Эксперименты «сломайте X»**: исключение в конструкторе компонента (вызов несуществующего метода) не даст отрисоваться шаблону — ошибок шаблона (NG0303) уже не будет. Для демонстрации ошибки TypeScript без падения — ошибка только в типах (`let n: number = 'строка'`).
- **Puppeteer и iframe превью**: после перезапуска (ввод адреса, ⟳) старый iframe может ещё числиться в `page.frames()` — брать последний (`.filter(f => f.url().includes('/app')).at(-1)`).
- **Намеренно сломанный старт** (шаг про ошибки): frontmatter `brokenStart: true` и папка `start/` в `exclude` файла `tsconfig.content.json` — иначе `npm run validate` упадёт. Валидатор проверяет, что исключение не забыто.
- **Prettier форматирует шаблоны внутри `template:` в `.ts`** (через встроенный парсер Angular). Однострочный шаблон с двумя элементами он переносит некрасиво — пишите многострочный шаблон в обратных кавычках. Проверка кода главы: `npx prettier --print-width 120 --single-quote --trailing-comma all --check "content/**/*.ts"`; для `.html` — парсер `angular` (пример в `docs/architecture.md`, «Стек»).
- **Puppeteer и Monaco**: пробелы в строках редактора — неразрывные, токены объединяются в один `span` (`" games = httpResource<"`). Чтобы навести мышь на слово, ищите `span` по `includes` и берите координаты через `document.createRange()`.
- **Проверка в настоящем AOT**: `ngc` из `@angular/compiler-cli` работает на Node 20 (в отличие от CLI). Папка с `tsconfig.json` (`experimentalDecorators`, `angularCompilerOptions`), симлинк на `node_modules` проекта, `node node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js -p tsconfig.json` → `out/*.js`.
- **zsh и `echo =====`**: слово из одних `=` zsh разворачивает как путь к команде («==== not found»). Разделители в командах — в кавычках.
- **Проверка шаблонов в AOT строже JIT**: литеральные типы `readonly`-полей, необязательные поля (`oldPrice?`) в арифметике, правила `@let` — JIT молчит. Прогоняйте решения главы через `ngc` со `strictTemplates: true`.
- **Чистое превью `exp.mjs`**: приложение — сама страница, без iframe: `page.click('.card button')`, `page.type('.search', …)`.
- **Шаг со стартом без решения**: в `run-chapter` «Решение» нажимается автоматически, а в своих проверках — нет; стартовый код может не содержать элементов, которые ищет проверка.

# Фактическое состояние

## Глава 1 «Первое приложение» — 7 шагов

| Шаг | Что вводит | Старт |
|---|---|---|
| 01-what-is-angular | Что такое Angular, AOT/JIT, интерфейс курса (`noSolution`) | Демо-магазин из песочницы (15 файлов) |
| 02-first-component | `@Component`, `selector`, `template`, NG0906, селектор по умолчанию `ng-component` | `main.ts` + `app.ts` без декоратора (custom) |
| 03-bootstrap | `bootstrapApplication`, `ApplicationRef`, NG05104 (выводится дважды: `ErrorHandler` и `.catch`), `ng-version` | решение 02 |
| 04-template-files | `templateUrl`, `styleUrl`, глобальный `styles.css`, инкапсуляция (`_ngcontent-ng-c…`) | custom: `app.html` с TODO, `app.css` и `styles.css` готовые |
| 05-app-config | `ApplicationConfig`, `providers`, `provideBrowserGlobalErrorListeners` | custom: `app.config.ts` с TODO |
| 06-debugging | Метки ошибок TS / Сборка / выполнение, чтение ошибки JIT (`@4:28` — с нуля), коды NG, `ng.getComponent($0)` | custom, **`brokenStart: true`**: `styleUrl: './app.scss'`, `</h2>`, `appRef.component` |
| 07-compiler | `ɵcmp.template`, инструкции, `consts`, `rf & 1` / `rf & 2`, сравнение с AOT (`ngc`) | решение 06 (`noSolution`) |

Отличия от `course-plan.md`: «Под капотом: компилятор» — отдельный шаг 1.7, а не врезка; глобальный `ng` — в шаге 1.6.

Код магазина на конец главы 1 (`content/01-first-app/07-compiler/start/`): `main.ts` (`bootstrapApplication(App, appConfig).then(лог числа компонентов).catch(...)`), `app.ts` (`templateUrl`, `styleUrl`, пустой класс), `app.html` (шапка `.header` с `.logo` + `main.page` с `h1` и `p.muted`), `app.css` (шапка, `h1` фирменного цвета), `app.config.ts` (`provideBrowserGlobalErrorListeners()`), `styles.css` (переменные `--brand` и др., `body`, `h1`, `.muted`, `.button`, `.grid`).

Код шагов генерирует `tools/authoring/ch01-gen.py`.

## Глава 2 «Шаблоны и привязки» — 9 шагов

| Шаг | Что вводит | Старт |
|---|---|---|
| 01-interpolation | Вводный шаг главы, `{{ }}`, выражения шаблона и их ограничения, `protected readonly` | custom: решение 1.7, `main.ts` как в `ng new`, карточка в `app.html` статичной разметкой, `app.css` со стилями всей главы |
| 02-property-binding | `[src]`, `[alt]`, `[disabled]`, свойство DOM и атрибут HTML, NG0303 / NG8002, `inStock: number` | решение 01 |
| 03-attr-class-style | `[attr.aria-label]` (рейтинг `role="img"`), `[class.sold-out]`, `[style.width.%]`, групповые `[class]`/`[style]`, legacy `ngClass` | решение 02 |
| 04-events | `(click)`, `(keydown.enter)`, `$event`, именование обработчиков | решение 03 |
| 05-template-refs | `#searchBox`, `[hidden]`, загадка «шаблон обновляется только после событий» | решение 04 |
| 06-let | `@let soldOut`, `@let discount`, `toFixed` вместо `Math`, ошибки AOT NG8015–8017 | решение 05 |
| 07-security | экранирование интерполяции, `[innerHTML]`, санитизация, `unsafe:`, `DomSanitizer` (упоминание) | решение 06 |
| 08-practice | практикум: один объект `game = GAMES[0]`, характеристики, текст кнопки, `[hidden]` для скидки; «Итоги главы» | custom: + `core/models.ts`, `core/games-data.ts`, TODO в `app.ts` |
| 09-template-context | `ɵcmp.template`: блок обновления, `ctx.`, `textInterpolateN`, `domProperty` + санитайзер, `@let` → `const`, обработчики и `markViewDirty` | решение 08 (`noSolution`) |

Отличия от `course-plan.md`: шаг 2.5 выводит запрос через `#ref` + `[hidden]` (состояния ещё нет), «Под капотом» — отдельный шаг 2.9.

Код магазина на конец главы 2 (`content/02-templates/09-template-context/start/`): `main.ts` (`bootstrapApplication(App, appConfig).catch(...)`), `app.ts` (`game = GAMES[0]`, `addToCart()` и `search(query)` пишут в консоль), `app.html` (шапка, поле поиска `#searchBox` + абзац «Ищем», `@let soldOut`/`discount`, горизонтальная карточка `article.card`), `app.css` (шапка, поиск, карточка, рейтинг, `.sold-out`), `core/models.ts` (`Game`), `core/games-data.ts` (`GAMES` — 12 игр из `games.json`, у первой в описании `<b>`), `app.config.ts`, `styles.css` — без изменений.

Код шагов генерирует `tools/authoring/ch02-gen.py`, проверка взаимодействия — `tools/e2e/checks/ch02-templates.mjs`. Все решения проверены и `ngc --strictTemplates` (папка в scratchpad, как в главе 1).

## Песочница

`content/00-sandbox` — служебная глава (`devChapters` в `content/course.json`), только в режиме разработки. На ней работают `tools/e2e/checks/platform.mjs` и `ch00-sandbox.mjs`. Её `02-search/solution` — ещё и демо в шаге 1.1: меняя песочницу, перезапустите генератор главы 1.
