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

**Шаг хранит только изменения**: `solution/` — файлы, которые шаг добавил или изменил, `start/` — только у шагов `startFrom: custom` (у первого шага главы — полный снимок), удаления — `removedInStart` / `removedInSolution` во frontmatter (подробно — `lesson-format.md`). Так решено в два захода: после главы 5 убрали копии `start/` (753 файла → 142 разных), после главы 6 — копии в `solution/` (812 → 243). Код генерирует Python-скрипт `tools/authoring/chNN-gen.py`: общие куски — строковые константы, шаги — **полные снимки** кода. Запись — только через `write_steps(ROOT, steps)` из `tools/authoring/steps.py`: он сам вычисляет, что изменилось, пишет только это и подсказывает, какие `removedIn…` нужны во frontmatter. Полный код прошлой главы генератор читает через `step_dir(путь)` (выгрузка в `tools/e2e/out/steps/`). Целиком посмотреть шаг — `npm run step <…/шаг/solution>`.

Правила:

- первый шаг главы — `startFrom: custom`, его старт (полный снимок) — очищенное решение последнего шага прошлой главы. Что убрали или вынесли в файлы, объясняется в тексте первого шага;
- если старт отличается от прошлого решения хотя бы строкой `// TODO`, шаг тоже `custom` (и только тогда у него есть `start/` — с изменёнными файлами; если `write_steps` не записал `start/` у шага `custom` или записал у `previous`, валидатор скажет об этом);
- новый файл, появившийся в шаге, — тоже `custom`; в старте лежит заготовка с `// TODO`;
- интерфейс магазина должен помещаться в превью **500 × 600** без растягивания панелей;
- после генерации: `npm run validate` — полный код всех шагов собирается и проверяется по настоящим типам `@angular/*` (в `.content-check/`);
- правка файла в шаге N действует во всех следующих шагах главы, которые этот файл не меняют. Это удобно (исправил один раз), но изменение расходится молча: после правок старых шагов — `npm run validate`, `run-chapter` и `checks/*` главы.

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
| «Счётчик застрял из-за зонлесс + OnPush» (план 3.1) | Из-за зонлесс: с `ChangeDetectionStrategy.Eager` счётчик из `setTimeout` застревает так же — проверки нет вообще. OnPush с одним компонентом не виден |
| `linkedSignal(() => (this.soldOut() ? 0 : 1))` «сбрасывается при смене игры» (гл. 3) | Не сбрасывается между играми в наличии: `soldOut` пересчитался, но остался `false` — отсечение по равенству. Нашла проверка `ch03-signals.mjs`. Читать в `linkedSignal` то, изменение чего должно сбрасывать (`game()`) |
| Пример очистки эффекта: таймер без чтения сигналов (гл. 3) | Эффект без зависимостей запускается один раз — очистка не показывает ничего. В примере эффект должен читать сигнал |
| «Мы видели в консоли: эффект раньше шаблона» (черновик 3.5) | Ученик этого не видел — заменено экспериментом с `console.log` в `cartTotal` |
| «Консоль превью покажет `computed(ещё не вычислен)`» (гл. 3) | Показывала `computed(0)`: Chrome с подключённым CDP вызывает `toString()` у аргументов `console.log`, а `toString` у `computed` из `@angular/core` вызывает геттер. Исправлено в `preview-runtime.js`: форматирование до вызова настоящей консоли |
| Фильтр «Рейтинг от N звёзд» с целыми звёздами (замысел гл. 5) | Рейтинги игр 4,1–4,9: от 1 до 4 — все 12, от 5 — ни одной. Фильтр бессмыслен; добавлен выбор половинки звезды (от 4,5 — 7 игр) |
| Половинка звезды по `event.offsetX < target.offsetWidth / 2` (гл. 5) | У строчного `<span>` в строчном хосте Chrome даёт `offsetX` не от элемента (84 при ширине 20). В чистом превью проверялось решение шага 9, где хост уже `inline-flex`, — ошибку нашла `ch05-components.mjs` в шаге 4. Заменено на `clientX - getBoundingClientRect().left` |
| `@switch (game().category)` с `@default never;` после перехода на сигнальный вход (гл. 5) | JIT молчит, AOT — TS2322: сужение не работает для вызова функции. Нужен `@let category = game().category;` |
| «Запасное содержимое `<ng-content>` покажется у карточек без стикеров» (гл. 5) | Не покажется: блоки `@if` попадают в слот и с ложным условием. Видно только у компонента совсем без содержимого |
| «Эффект с `viewChildren(GameCard)` срабатывает на каждую букву поиска» (гл. 6) | Только когда меняется набор карточек: «кот» — две строки (6 и 1), а не три |
| «Компонент проверяется, когда его родитель проверяется и …» (черновик 6.9) | Противоречит тику таймера: `Countdown` обновляется без проверки предков (сигнал + `markAncestorsForTraversal`). Правило переписано без «родитель проверяется» |
| «Для `ngOnChanges` компилятор добавляет обёртку» (черновик 6.7) | Делает рантайм: `registerPreOrderHooks` смотрит прототип, `NgOnChangesFeatureImpl` подменяет `setInput`, прошлые значения — в `__ngSimpleChanges__` |
| «До Angular 22 стратегией по умолчанию была `Default`» (черновик 6.9) | Версию перехода по исходникам не подтвердить — оставлено проверенное: в 22 `Default` — `@deprecated` синоним `Eager` |
| `checks/ch06`: «каждую секунду две строки `Проверены: Countdown`» | Консоль платформы сворачивает одинаковые строки подряд в одну со счётчиком (`.console-count`). Тексты шагов 4 и 9 предупреждают об этом |
| Горячая клавиша «/» для поиска (замысел 6.2) | `keydown./` зависит от раскладки: в русской «/» набирается иначе. Горячую клавишу не делали — фокус только после сброса фильтров |

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
- **Намеренно сломанный старт** (шаг про ошибки): frontmatter `brokenStart: true` — валидатор такой старт не собирает и не проверяет типы.
- **Prettier форматирует шаблоны внутри `template:` в `.ts`** (через встроенный парсер Angular). Однострочный шаблон с двумя элементами он переносит некрасиво — пишите многострочный шаблон в обратных кавычках. Проверка кода главы: `npx prettier --print-width 120 --single-quote --trailing-comma all --check "content/**/*.ts"`; для `.html` — парсер `angular` (пример в `docs/architecture.md`, «Стек»).
- **Puppeteer и Monaco**: пробелы в строках редактора — неразрывные, токены объединяются в один `span` (`" games = httpResource<"`). Чтобы навести мышь на слово, ищите `span` по `includes` и берите координаты через `document.createRange()`.
- **Проверка в настоящем AOT**: `ngc` из `@angular/compiler-cli` работает на Node 20 (в отличие от CLI). Папка с `tsconfig.json` (`experimentalDecorators`, `angularCompilerOptions`), симлинк на `node_modules` проекта, `node node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js -p tsconfig.json` → `out/*.js`.
- **zsh и `echo =====`**: слово из одних `=` zsh разворачивает как путь к команде («==== not found»). Разделители в командах — в кавычках.
- **Проверка шаблонов в AOT строже JIT**: литеральные типы `readonly`-полей, необязательные поля (`oldPrice?`) в арифметике, правила `@let` — JIT молчит. Прогоняйте решения главы через `ngc` со `strictTemplates: true`.
- **Чистое превью `exp.mjs`**: приложение — сама страница, без iframe: `page.click('.card button')`, `page.type('.search', …)`.
- **Шаг со стартом без решения**: в `run-chapter` «Решение» нажимается автоматически, а в своих проверках — нет; стартовый код может не содержать элементов, которые ищет проверка.
- **Генератор главы перезаписывает десятки файлов** — Vite шлёт волну HMR-обновлений, и первая проверка сразу после генерации может упасть по таймауту навигации или без iframe превью. Подождать и повторить.
- **Литеральные типы из функций**: `linkedSignal(() => (cond ? 0 : 1))` и `computed` выводят тип `0 | 1`, и `update((q) => q + 1)` — TS2322. Указывать тип: `linkedSignal<number>(…)`. У `signal(0)` тип расширяется до `number`.
- **`exp.mjs`**: строки `console.log` самого сценария печатаются сразу, а консоль страницы — в конце; порядок между ними по выводу не восстановить. Нужен порядок — пишите метки в консоль страницы (`page.evaluate(() => console.log(…))`).
- **Prettier раскрывает `@case (…) { Текст }` на три строки** — в тексте урока фрагмент можно дать компактно и предупредить, что после «Формат» он станет длиннее.
- **Ширина ASCII-схем в тексте урока — не больше 46 символов**: панель урока при окне 1440 px показывает около 49 символов моноширинного блока, остальное уходит в горизонтальную прокрутку. Код и вывод консоли могут быть шире.
- **Проверки AOT в scratchpad**: TypeScript 6 требует `rootDir` в `tsconfig.json` папки для `ngc`, если исходники в `src/` (TS5011).
- **В `content/` у шага только изменения.** Пути `content/<глава>/<шаг>/start` и `…/solution` в `run-dir.mjs`, `exp.mjs` и `readDir` дают полный код (`scripts/step-files.mjs`). В Python — `step_dir()` из `tools/authoring/steps.py`; копировать папку шага напрямую (`shutil.copytree`, `cp -r`) нельзя — получите только изменения. Для экспериментов: `npm run step <путь> <папка>`, потом правки в копии.
- **IDE и частичные папки**: открытый `solution/app.ts` может подчёркивать `import … from './core/models'` — файла в этой папке нет, он в старте. Ошибки типов смотрите в `npm run validate`.
- **Проверяйте эксперименты на коде того шага, о котором текст**, а не на решении последнего шага: поведение может зависеть от того, что появилось позже (в главе 5 — `display: inline-flex` хоста из шага 7 скрывал ошибку шага 4).
- **Щелчки в iframe платформы**: `page.mouse.click` по координатам `boundingBox()` элемента внутри iframe в `checks/*` ненадёжен — используйте `elementHandle.click({ offset })`.
- **Сигнальный вход и `@default never;`**: после замены `game` на `game()` в шаблоне с `@switch` нужна `@let` — иначе ошибка только в AOT.
- **Отдельный скрипт с `launch()` из `tools/e2e/lib.mjs`, запущенный не как `checks/*.mjs`**, у автора зависал без вывода; диагностику удобнее встроить в проверку главы.
- **Консоль платформы сворачивает одинаковые строки подряд** в одну со счётчиком повторов (`.console-count`). Эксперименты «смотрите, сколько раз напечаталось» описывать через счётчик; в `checks/*` читать `.console-count`. В `exp.mjs` (чистое превью) строки не сворачиваются.
- **Эксперименты с правкой кода — копией шага в scratchpad**: `npm run step <…/шаг/solution> <папка в scratchpad>` (полный код), затем замены с `assert` (скрипт вида `mk.py <имя> <папка> файл 'старое' 'новое' …`) и `exp.mjs` по копии. Так проверены все эксперименты главы 6.
- **Порядок фаз после отрисовки действует между компонентами**: замер в `earlyRead` одного компонента идёт раньше `afterNextRender` без фазы (`mixedReadWrite`) другого. Если элемент открывает/показывает чужой `afterNextRender` (`showModal()`), замеряйте в `read`.
- **`IntersectionObserver` сообщает об изменении видимости**: если после новой порции элемент остаётся видимым, повторного вызова нет (проверено: порция 3, окно 500 × 1400 — застряло на 9). Кнопка «Показать ещё» — запасной путь.
- **Журнал проверок компонентов** — `ng.ɵsetProfiler` (только dev): помощник `cd-log.ts` шага 6.9. Пригодится в следующих главах «под капотом».

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

Код магазина на конец главы 1 (`content/01-first-app/06-debugging/solution/` — старт шага 07): `main.ts` (`bootstrapApplication(App, appConfig).then(лог числа компонентов).catch(...)`), `app.ts` (`templateUrl`, `styleUrl`, пустой класс), `app.html` (шапка `.header` с `.logo` + `main.page` с `h1` и `p.muted`), `app.css` (шапка, `h1` фирменного цвета), `app.config.ts` (`provideBrowserGlobalErrorListeners()`), `styles.css` (переменные `--brand` и др., `body`, `h1`, `.muted`, `.button`, `.grid`).

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

Код магазина на конец главы 2 (`content/02-templates/08-practice/solution/` — старт шага 09): `main.ts` (`bootstrapApplication(App, appConfig).catch(...)`), `app.ts` (`game = GAMES[0]`, `addToCart()` и `search(query)` пишут в консоль), `app.html` (шапка, поле поиска `#searchBox` + абзац «Ищем», `@let soldOut`/`discount`, горизонтальная карточка `article.card`), `app.css` (шапка, поиск, карточка, рейтинг, `.sold-out`), `core/models.ts` (`Game`), `core/games-data.ts` (`GAMES` — 12 игр из `games.json`, у первой в описании `<b>`), `app.config.ts`, `styles.css` — без изменений.

Код шагов генерирует `tools/authoring/ch02-gen.py`, проверка взаимодействия — `tools/e2e/checks/ch02-templates.mjs`. Все решения проверены и `ngc --strictTemplates` (папка в scratchpad, как в главе 1).

## Глава 3 «Сигналы» — 9 шагов

| Шаг | Что вводит | Старт |
|---|---|---|
| 01-problem | Вводный шаг главы; поле в `(click)` обновляет экран, в `setTimeout` — нет (отставание на одно нажатие); зонлесс; OnPush и эксперимент с `Eager`; legacy zone.js | custom: решение 2.8 + «В корзине: 0» в шапке, `app.css` со стилями всей главы, TODO в `app.ts` |
| 02-signal | `signal`, чтение вызовом, `set`/`update`, `readonly`; `{{ cartCount }}` → `[Signal: 0]`, AOT NG8109; TS2540; `signal(1)` в консоли превью; в конце задержка убирается | решение 01 |
| 03-computed | переключатель игр (`gameIndex` + `computed` `game`/`soldOut`/`discount`), «храните минимум», ленивость и кэш (эксперимент с `console.log`), `@let` → `computed`, TS2339, NG0600 | решение 02 |
| 04-immutability | `CartItem`, `cart = signal<CartItem[]>`, `cartCount`/`cartTotal`/`cartSummary`; эксперимент с `push` (мини-корзина без списка, шапка `0 · 0 ₽`), `Object.is`, `readonly CartItem[]`, `equal` | решение 03 |
| 05-effect | `effect` в конструкторе (лог корзины), контекст внедрения, NG0203, время запуска и объединение изменений, «когда эффект не нужен», `onCleanup`, эффекты компонента и корневые | решение 04 |
| 06-untracked | название открытой игры в логе через `untracked`, реактивный контекст, чужой код в эффектах | решение 05 |
| 07-linked-signal | выбор количества `linkedSignal<number>(() => (this.game().inStock > 0 ? 1 : 0))`, литеральный тип `0 \| 1`, ловушка с `soldOut()`, полная форма `source`/`computation`/`previous` | решение 06 |
| 08-practice | практикум: `inCart`, `available`, `deliveryLeft`, «Убрать», «Очистить», склад, бесплатная доставка от `FREE_DELIVERY_FROM = 5000`; «Итоги главы» | custom: TODO в `app.ts`/`app.html`, константа `FREE_DELIVERY_FROM` |
| 09-signal-graph | граф сигналов магазина (`signal-graph.ts` — помощник по внутренним полям узлов), производители и потребители, активный потребитель, динамические зависимости, push-pull, отсечение по равенству, живые потребители, `markAncestorsForTraversal`, планировщик, `debugName` в AOT | custom: решение 08 + `signal-graph.ts` (`noSolution`) |

Отличия от `course-plan.md`: «застрявший» счётчик — на `setTimeout` (обработчик клика экран обновляет); «Выбранное издание» в 3.7 заменено выбором количества (изданий в данных нет); `linkedSignal` в практикуме — `this.game().inStock > this.inCart() ? 1 : 0`.

Код магазина на конец главы 3 (`content/03-signals/09-signal-graph/start/` без `signal-graph.ts`): `app.ts` — `gameIndex`, `gamesCount`, `computed` `game`/`soldOut`/`discount`, `linkedSignal` `quantity`, `cart: signal<CartItem[]>`, `computed` `cartCount`/`cartTotal`/`cartSummary`/`inCart`/`available`/`deliveryLeft`, эффект с `untracked` в конструкторе, методы `showPrevious`/`showNext`/`decreaseQuantity`/`increaseQuantity`/`addToCart`/`removeFromCart`/`clearCart`/`search`; `app.html` — шапка «В корзине: N · S ₽», поиск, переключатель `.pager`, карточка с `.actions` (−, N, +, «В корзину»), «Уже в корзине: N шт. Убрать», мини-корзина `.mini-cart` (список строкой, итог, доставка через пары `[hidden]`, «Очистить»); `core/models.ts` — `Game`, `CartItem`; `core/games-data.ts`, `main.ts`, `app.config.ts`, `styles.css` — без изменений.

Код шагов генерирует `tools/authoring/ch03-gen.py` (в конце — Prettier по коду шагов), проверка взаимодействия — `tools/e2e/checks/ch03-signals.mjs` (в т. ч. эксперименты: формат сигналов в консоли и вывод графа шага 3.9). Все решения проверены `ngc --strictTemplates` — без ошибок и предупреждений.

## Глава 4 «Управляющие блоки» — 8 шагов

| Шаг | Что вводит | Старт |
|---|---|---|
| 01-if | вводный шаг главы; `@if`, `as` (сужение типа в AOT, ловушка с `0`), `@else if` / `@else` — строка наличия (`FEW_LEFT = 5`), все `[hidden]` → `@if` (кроме «Ищем»), `@if` против `[hidden]`; legacy `*ngIf`, миграция `control-flow` | custom: решение 3.8, `app.css` со стилями всей главы |
| 02-for | каталог-сетка `@for (game of games; track game.id)`, зачем `track`, `@let` и `@if` внутри `@for`; legacy `*ngFor` + `trackBy` | custom: из `app.ts` убраны сигналы открытой игры и `linkedSignal`, `games = GAMES`, `addToCart(game)`, `inCart` — `Map`; в `app.html` TODO на месте каталога, мини-корзина наверху |
| 03-for-variables | строки корзины `@for (item of cart(); track item.game.id)`, `$index` (номер), `$even` («зебра»), таблица переменных, `let i = $index`; `changeQuantity`, `removeFromCart` | решение 02 |
| 04-empty | `query` + `visibleGames` (название и теги), `(input)="query.set(…)"`, `@empty`; «Ищем» и `search()` удалены | решение 03 |
| 05-switch | бейдж категории `@switch` с пятью `@case` и `@default never;`, объединение `@case`, словарь `Record` как альтернатива; legacy `ngSwitch` | решение 04 |
| 06-ng-template | обзор (`noSolution`): `<ng-container>`, `<ng-template>` + `NgTemplateOutlet` (`priceTpl`, `let-game`, `$implicit`), `let-` — `any`; блоки — тоже шаблоны | решение 05 |
| 07-practice | практикум: «Только в наличии», сортировка (`SortKey`, `changeSort`), «Сбросить фильтры» с `[value]`/`[checked]`; «Итоги главы» | custom: TODO в `app.ts` и `app.html` |
| 08-track | наблюдатель `dom-watch.ts` (`MutationObserver`: создано / перемещено / удалено / тексты), `track game.id` / `$index` / копии + `track game` (NG0956) / `game.category` (NG0955), `ɵɵrepeaterCreate`, алгоритм `reconcile` | custom: решение 07 + `dom-watch.ts` (`noSolution`) |

Отличия от `course-plan.md`: «Нумерация, разделители» в 4.3 — нумерация и «зебра» строк корзины; 4.6 — шаг без задания (только эксперименты).

Код магазина на конец главы 4 (`content/04-control-flow/08-track/start/` без `dom-watch.ts`): `app.ts` — константы `FREE_DELIVERY_FROM`, `FEW_LEFT`, тип `SortKey`; сигналы `query`, `inStockOnly`, `sortBy`, `computed` `visibleGames` (поиск по названию и тегам, фильтр, сортировка копии), `fewLeft`, `cart`, `cartCount`, `cartTotal`, `cartSummary` (только для эффекта), `deliveryLeft`, `inCart` (`Map` id → количество), эффект-лог корзины; методы `addToCart(game)`, `changeQuantity(item, delta)`, `removeFromCart(item)`, `clearCart`, `changeSort`, `resetFilters`. `app.html` — шапка, поиск с `[value]`, мини-корзина (`@if`, строки `@for` с `$index`/`$even`, итог, доставка `@if`/`@else`), фильтры, сетка `.grid` с плитками `.tile` (бейдж `@switch`, цена `@if … as`, наличие `@if`/`@else if`, «В корзине: N шт.»), `@empty` со сбросом. `core/models.ts`, `core/games-data.ts`, `main.ts`, `app.config.ts`, `styles.css` — без изменений.

Код шагов генерирует `tools/authoring/ch04-gen.py`, проверка взаимодействия — `tools/e2e/checks/ch04-control-flow.mjs` (в т. ч. эксперимент шага 8 с наблюдателем). Все решения проверены `ngc --strictTemplates` — без ошибок и предупреждений.

## Глава 5 «Компоненты и их связь» — 10 шагов

| Шаг | Что вводит | Старт |
|---|---|---|
| 01-component | вводный шаг главы, дерево компонентов; `GameCard` (`shared/game-card/`), `selector`, `imports`, NG0304 / NG8001, короткие классы в стилях компонента; 12 одинаковых карточек (`game = GAMES[0]`); эксперимент «`.tile` в `app.css` не действует»; legacy `NgModule` | custom: решение 4.7, `app.css` очищен от большой карточки главы 3, стили плитки — блоком в конце (ученик удаляет), стили главы; заготовки `game-card.ts`/`.html`, готовый `game-card.css` |
| 02-inputs | `input.required<Game>()`, `input(0)` (`inCart`), `[game]`, TS2339 на `set`, `@let category` для `@default never;` (AOT TS2322), NG0950 / NG8008 / NG0303 / NG8002 / TS2322; эксперимент с начальной корзиной; legacy `@Input()` | решение 01 |
| 03-outputs | `output()`, `emit()`, `(add)`, `$event` и `output<T>()`, TS2345, «данные вниз — события вверх», не всплывает, синхронно; эксперимент с выходом `click`; legacy `EventEmitter` | решение 02 |
| 04-model | `Rating` (`shared/rating/`), `model(0)`, `valueChange`, `[(value)]="minRating"` (без вызова; `Unsupported expression in a two-way binding`), фильтр «Рейтинг от» с половинками, `@if` в звёздах; эксперимент «односторонняя привязка к модели»; `input` + `linkedSignal` как черновик; `ɵɵtwoWayBindingSet` | custom: решение 03 + заготовки `rating.ts`/`.html`, готовый `rating.css` |
| 05-input-transforms | `readonly` с `booleanAttribute` (без него `''` → ложь, AOT TS2322), `numberAttribute`, свои преобразования, `alias`; legacy сеттеры и `coerceBooleanProperty` | решение 04 |
| 06-content-projection | стикеры «Хит» (`HIT_RATING = 4.8`) и «Скидка», `<ng-content select="[sticker]">`, слот по умолчанию, `@if` с одним корнем, NG8011, стили содержимого — у родителя, запасное содержимое | решение 05 |
| 07-host | `host` у `Rating`: `role` img/slider, `aria-*`, `tabindex`, `[class.readonly]`, `(keydown.arrowright/left)` → `step(±0.5)`; `:host`, `:host(:focus-visible)`, `:host(.readonly)`; `hostBindings`; legacy `@HostBinding`/`@HostListener` | решение 06 |
| 08-styles | карточка без `<article>`: `host: { role: 'article', '[class.sold-out]' }`, `:host`, `:host(.sold-out)`; таблица «что куда достаёт»; эксперименты `ViewEncapsulation.None` и `ShadowDom`; legacy `::ng-deep` | решение 07 |
| 09-practice | практикум: `Quantity` (`shared/quantity/`, `model.required`, `min`/`max` с `numberAttribute`), `[value]` + `(valueChange)` вместо `[(value)]="item.quantity"` (мутация — шапка не обновляется), `setQuantity`; «Итоги главы» | custom: заготовки `quantity.ts`/`.html`, готовый `quantity.css`, TODO в `app.ts`/`app.html` |
| 10-encapsulation | `_nghost`/`_ngcontent`, идентификатор компонента, переписанные селекторы, специфичность, `<style>` появляется/удаляется (5 → 6 → 5 с `Quantity`), компонент без стилей → `None`, `%COMP%` и `%NS%` (`provideCssVarNamespacing`) в AOT, теневой DOM | решение 09 (`noSolution`) |

Отличия от `course-plan.md`: события (5.3) — сразу после входов, чтобы корзина не была сломана три шага; двусторонняя привязка (5.4) — раньше преобразований (у `readonly` появляется мотивация: звёзды в карточке меняются от щелчка); «Карточка-обёртка с бейджами» — стикеры через `select`; хост-элемент — на `Rating` (доступность и клавиатура), `:host` для карточки — в шаге про стили; `compact` не понадобился.

Код магазина на конец главы 5 (`content/05-components/09-practice/solution/` — старт шага 10): `app.ts` — `FREE_DELIVERY_FROM`, `HIT_RATING`, `SortKey`; сигналы `query`, `inStockOnly`, `minRating`, `sortBy`, `computed` `visibleGames` (с рейтингом), `hitRating`, `cart`, `cartCount`, `cartTotal`, `cartSummary`, `deliveryLeft`, `inCart` (`Map`), эффект-лог; методы `addToCart(game)`, `setQuantity(item, quantity)`, `removeFromCart`, `clearCart`, `changeSort`, `resetFilters`; `imports: [GameCard, Rating, Quantity]`. `app.html` — шапка, поиск, мини-корзина (строки с `<app-quantity min="1" [max] [value] (valueChange)>`), фильтры (флажок, «Рейтинг от» `<app-rating [(value)]="minRating">`, сортировка), сетка `<app-game-card [game] [inCart] (add)>` со стикерами `[sticker]`. `shared/game-card/` — `GameCard` (`game` обязательный, `inCart`, `add`, `host` с `role` и `sold-out`, слот стикеров, `<app-rating readonly>`, `FEW_LEFT`), стили через `:host`. `shared/rating/` — `Rating` (`value` модель, `readonly` с `booleanAttribute`, половинки звёзд, `host` с ARIA и стрелками). `shared/quantity/` — `Quantity`. `core/*`, `main.ts`, `app.config.ts`, `styles.css` — без изменений.

Код шагов генерирует `tools/authoring/ch05-gen.py` (в конце — Prettier по `.ts`, `.html`, `.css`), проверка взаимодействия — `tools/e2e/checks/ch05-components.mjs`. Все решения проверены `ngc --strictTemplates` — без ошибок и предупреждений.

## Глава 6 «Жизненный цикл и DOM» — 9 шагов

| Шаг | Что вводит | Старт |
|---|---|---|
| 01-lifecycle | вводный шаг главы; окно «Подробнее» (`@if` создаёт/уничтожает `GameDetails`), выход `open` у карточки, схема жизни компонента; эксперименты: NG0950 в конструкторе, `inject(ElementRef)` — хост пуст и не в документе, эффект — до обновления шаблона, NG0203; legacy — DI через конструктор | custom: решение 5.9 + готовый `GameDetails` (`<dialog open>` + `.backdrop`), стили `.title-button`, TODO в карточке и `App` |
| 02-view-child | `viewChild.required<ElementRef<HTMLInputElement>>('searchBox')`, фокус после «Сбросить фильтры» (без него — `BODY`); `viewChildren` — сигнал, видит только свой шаблон (1 `Rating` из 13), `read: ElementRef`, NG0951; legacy `@ViewChild`/`QueryList` | решение 01 |
| 03-after-next-render | `<dialog>` + `showModal()` в `afterNextRender`, `(close)`, `::backdrop`; эксперименты: конструктор (NG0951), `effect` (работает, но заголовок пуст), `afterEveryRender`; SSR; фазы — `deep` | решение 02 |
| 04-destroy-ref | `Countdown` (`shared/countdown/`): сигнал `now` + `setInterval` + `DestroyRef.onDestroy`; эксперимент «три открытия — три таймера»; что убирать самим, `host`-слушатели снимаются; `onCleanup` против `DestroyRef`; legacy `ngOnDestroy` | custom: заготовка `countdown.ts` с готовыми `untilMidnight`/`formatTime`, готовые `.html`/`.css`, TODO в окне |
| 05-content-children | `Tabs`/`Tab` (`shared/tabs/`): `contentChildren(Tab)`, `Tab.active` — сигнал, который меняет эффект `Tabs`, `[hidden]` у хоста; вкладка «Характеристики» (`<dl class="specs">`); эксперименты: вкладка в `@if`, в `<div>` (`descendants`), `contentChild`, `viewChildren(Tab)` = 0; legacy `@ContentChildren` | custom: заготовки `tabs.ts`, `tabs.html`, `tab.ts`, готовые `tabs.css` (с `.ink`), `tab.html`; `.specs` в `game-details.css` |
| 06-after-render-effect | полоска под вкладкой: `viewChildren('tabButton')`, сигнал `ink`, `afterRenderEffect({ read })`; фазы; эксперименты: `earlyRead` (0 при открытии), `effect` (отставание на отрисовку: 86/110 вместо 83/116), счёт запусков против `afterEveryRender` | решение 05 |
| 07-lifecycle-hooks | `ngOnChanges` (`SimpleChanges<T>`), `ngOnInit`, `ngAfterViewInit`, `ngOnDestroy` — порядок по логу вместе с `effect`/`afterNextRender`/`DestroyRef`; хуки против функций (`noSolution`) | решение 06 |
| 08-practice | практикум: `LoadMore` (`shared/load-more/`, `inject(ElementRef)`, `IntersectionObserver` в `afterNextRender`, `DestroyRef`), `PAGE_SIZE = 6`, `shownCount = linkedSignal<Game[], number>`, `shownGames`, `showMore`; «Итоги главы» | custom: заготовки `load-more.ts`/`.html`, готовый `.css`, TODO в `app.ts`/`app.html` |
| 09-change-detection | что такое проверка, дерево представлений, журнал `cd-log.ts` (`ng.ɵsetProfiler`): «В корзину», «+», тик таймера, вкладка, `Eager`; планировщик; legacy `Default`/zone.js/`markForCheck` (`noSolution`) | custom: решение 08 + `cd-log.ts`, `main.ts` вызывает `logChangeDetection()` |

Отличия от `course-plan.md`: шаг «Когда что происходит» сразу добавляет окно «Подробнее» (иначе в главе негде показать создание и уничтожение компонента и работу с DOM); «Фокус в поле поиска» — после сброса фильтров, а не при запуске (превью перезапускается при каждой правке кода, и автофокус мог бы забирать фокус у редактора — не проверялось, просто не стали рисковать); «Замер высоты блока» — замер кнопки вкладки для полоски (шаг 6), отдельным шагом после вкладок; вкладки `Tabs`/`Tab` — в шаге 5, а практикум — «Показать ещё» с `IntersectionObserver`.

Код магазина на конец главы 6 (`content/06-lifecycle/08-practice/solution/` — старт шага 09 без `cd-log.ts`): `app.ts` — к главе 5 добавлены `PAGE_SIZE`, `searchBox` (`viewChild.required`, фокус в `resetFilters`), `selectedGame`, `shownCount` (`linkedSignal` от `visibleGames`), `shownGames`, `showMore`; `imports: [GameCard, GameDetails, LoadMore, Rating, Quantity]`. `app.html` — карточки по `shownGames()` с `(open)`, `<app-load-more>` под сеткой, `@if (selectedGame(); as game)` с `<app-game-details>` в конце `<main>`. `shared/game-card/` — название-кнопка `.title-button` и выход `open`. `shared/game-details/` — `GameDetails` (`<dialog #dialog>`, `showModal()` в `afterNextRender`, `(close)` → `closed`, цена, `<app-countdown>` для скидки, вкладки «Описание»/«Характеристики»). `shared/countdown/` — `Countdown`. `shared/tabs/` — `Tabs` (`contentChildren`, эффект `active`, полоска через `afterRenderEffect`) и `Tab`. `shared/load-more/` — `LoadMore`. `shared/rating/`, `shared/quantity/`, `core/*`, `main.ts`, `app.config.ts`, `styles.css`, `app.css` — без изменений.

Код шагов генерирует `tools/authoring/ch06-gen.py` (в конце — Prettier), проверка взаимодействия — `tools/e2e/checks/ch06-lifecycle.mjs`. Все решения и заготовки проверены `ngc --strictTemplates` — без ошибок и предупреждений.

## Песочница

`content/00-sandbox` — служебная глава (`devChapters` в `content/course.json`), только в режиме разработки. На ней работают `tools/e2e/checks/platform.mjs` и `ch00-sandbox.mjs`. Её `02-search/solution` — ещё и демо в шаге 1.1: меняя песочницу, перезапустите генератор главы 1.
