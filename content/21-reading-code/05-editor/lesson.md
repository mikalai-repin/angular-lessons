---
title: Встроенный редактор
noSolution: true
focus: main.ts
api: [WebContainers, NodeRuntimeSandbox, CodeMirror, '@typescript/vfs', crossOriginIsolated, JIT в браузере]
---

У туториалов и песочницы angular.dev есть то же, что у этого курса: текст слева, редактор кода, живое приложение в превью. Задача одна — запустить код ученика на Angular прямо в браузере. Решения противоположные. Разберём, как устроен редактор angular.dev, что мы увидели, запустив его, и почему наша платформа сделана иначе.

## Как запускается редактор

Код — в папке [`src/app/editor/`](https://github.com/angular/angular/tree/fb7711f/adev/src/app/editor), у неё есть подробный [`README.md`](https://github.com/angular/angular/blob/fb7711f/adev/src/app/editor/README.md). Путь от открытия шага туториала до приложения в превью:

1. Страница `Tutorial` после первой отрисовки (`afterNextRender`) загружает компонент редактора через `import('../../editor/index')` и рисует его `*ngComponentOutlet` (шаг 1). Код редактора в главный бандл не попадает.
2. `EmbeddedTutorialManager` запрашивает файлы шага: `assets/tutorials/learn-angular/1-components-in-angular/source-code.json` и `metadata.json` — дерево файлов проекта и список «какие показать, какие скрыть, где ответ».
3. `injectNodeRuntimeSandbox` лениво загружает [`NodeRuntimeSandbox`](https://github.com/angular/angular/blob/fb7711f/adev/src/app/editor/node-runtime-sandbox.service.ts) (шаг 3), и его метод `init` делает то, что вы делали в терминале в главе 20:

```ts adev/src/app/editor/node-runtime-sandbox.service.ts
webContainer = await this.boot();             // WebContainer.boot({workdirName: 'angular'})
await this.startInteractiveTerminal(webContainer); // bash для вкладки «Terminal»
await this.mountProjectFiles();               // файлы шага — в файловую систему
const exitCode = await this.installDependencies(); // npm install
await Promise.all([this.loadTypes(), this.startDevServer()]); // npm run start → ng serve
```

4. `startDevServer` ждёт в выводе `ng serve` строку `Watch mode enabled. Watching for file changes...`, а событие `server-ready` даёт адрес сервера — его получает `iframe` превью.
5. Правка в редакторе (CodeMirror) через 500 мс (`EDITOR_CONTENT_CHANGE_DELAY_MILLIES`) записывается файлом в файловую систему, `ng serve` пересобирает — превью обновляется.
6. Подсказки и ошибки типов в редакторе — свой воркер на `@typescript/vfs` и языковой службе TypeScript. Типы пакетов `TypingsLoader` читает из `node_modules` внутри контейнера, стандартную библиотеку TypeScript воркер берёт с CDN (`createDefaultMapFromCDN`).

## WebContainers

**WebContainers** — технология StackBlitz: Node.js, который работает в браузере, с файловой системой, процессами и `npm`. Не эмуляция «как будто» — настоящий `ng serve` из пакета `@angular/cli`.

У неё есть требования, и все они видны в коде сайта:

- **Изоляция страницы.** README пакета `@webcontainer/api`: технологии нужен `SharedArrayBuffer`, а браузер даёт его только странице, изолированной от чужих источников (cross-origin isolated). Отсюда заголовки `Cross-Origin-Opener-Policy` и `Cross-Origin-Embedder-Policy` в `angular.json` (шаг 1) и `firebase.json` (шаг 4). На angular.dev `window.crossOriginIsolated` — `true`, мы проверили.
- **Серверы StackBlitz.** Тот же README: API «опирается на прокси и серверное ускорение StackBlitz», и, подключая его, вы соглашаетесь с условиями StackBlitz. В нашем запуске браузер сходил на `stackblitz.com`, загрузил `webcontainer.js` с `w-corp-staticblitz.com`, а пакеты для `npm install` — с `t.staticblitz.com`, не с `registry.npmjs.org`.
- **Память и устройства.** На iOS редактор не запускается вовсе (`NodeRuntimeState.checkUnsupportedEnvironment`), на телефонах предупреждает о нехватке памяти. А [`AlertManager`](https://github.com/angular/angular/blob/fb7711f/adev/src/app/editor/alert-manager.service.ts) считает открытые вкладки с редактором через `localStorage` и событие `storage`: больше трёх (`MAX_RECOMMENDED_WEBCONTAINERS_INSTANCES`) — просьба закрыть лишние.

Терминал пропускает только команды `ng` — список в [`CommandValidator`](https://github.com/angular/angular/blob/fb7711f/adev/src/app/editor/terminal/command-validator.service.ts): `ng serve`, `ng generate`, `ng version` и ещё несколько. Остальное — «Angular Documentation - Not allowed command!». Это забота об ученике, а не защита: с `?sudo=true` в адресе проверка отключается, а всё и так выполняется в его же браузере.

## Что мы увидели, запустив его

Мы открыли первый шаг туториала [learn-angular](https://angular.dev/tutorials/learn-angular/1-components-in-angular) в Chrome без интерфейса (headless) 26 октября 2026 года и записывали, что показывает превью. Один из запусков (в других — те же этапы, на секунды позже):

```text
 2,3 с  Booting
 5,8 с  Installing packages
14,8 с  Initializing dev server
```

Во вкладке «Console» редактора — вывод `npm install` и `ng serve`:

```text
added 222 packages in 6s
> ng serve
[rolldown] Downloading @rolldown/binding-wasm32-wasi@1.2.8 on WebContainer...
An unhandled exception occurred: Cannot find native binding. …
[oxc-parser] Downloading @oxc-parser/binding-wasm32-wasi@0.150.0 on WebContainer…
Error [ERR_REQUIRE_CYCLE_MODULE]: Cannot require() ES Module
/home/angular/node_modules/oxc-parser/src-js/index.js in a cycle.
(from /home/angular/node_modules/@angular/build/src/tools/oxc/oxc-transform.js)
Node.js v22.22.3
```

Сервер разработки не запустился, превью так и осталось на «Initializing dev server». Песочница [/playground](https://angular.dev/playground) — то же самое. Что произошло, видно по выводу. Сборщик CLI использует быстрые инструменты с нативными двоичными файлами (`rolldown`, `oxc-parser`). В браузере нативный код не запустить, и они докачивают версии на WebAssembly (`wasm32-wasi`) — на этот раз неудачно.

А почему сломалось то, что раньше работало? Мы набрали во вкладке «Terminal» `ng version`:

```text
Angular CLI       : 22.2.3
Node.js           : 22.22.3
│ @angular/build            │ 22.2.3            │ ^22.2.0-next  │
│ @angular/core             │ 22.2.3            │ ^22.2.0-next  │
```

В `package.json` проекта туториала ([`learn-angular/common/package.json`](https://github.com/angular/angular/blob/fb7711f/adev/src/content/tutorials/learn-angular/common/package.json)) версии — диапазоны `^22.2.0-next`, а `package-lock.json` нет. Каждый запуск редактора у каждого ученика заново ставит последние подходящие версии пакетов. Новый выпуск любой зависимости меняет окружение туториала без единого коммита в angular.dev. Это ровно то, о чём шаг 20.2: диапазоны semver плюс отсутствие lock-файла — и «у меня вчера работало».

Мы не знаем, сломан ли редактор у всех: проверяли в headless Chrome на одной машине. Откройте туториал у себя — и посмотрите, что напишет вкладка «Console» сегодня.

## Наш редактор

Наша платформа отвечает на ту же задачу без Node.js (подробности — в `docs/architecture.md` репозитория курса):

- редактор — Monaco со встроенным воркером TypeScript, типы Angular лежат в самом курсе;
- TypeScript 6 вместе с трансформацией `angularJitApplicationTransform` из `@angular/compiler-cli` работает в веб-воркере и превращает файлы шага в JavaScript — без сборщика;
- превью — `iframe`, где пакеты Angular подключены картой импортов, а шаблоны компилирует JIT-компилятор во время выполнения (главы 1 и 19);
- учебный бэкенд — перехват `fetch` по адресам `/api/…` прямо в превью.

Мы замерили в платформе курса: шаг с магазином открывается за 4 с (вместе с загрузкой редактора и компиляцией 75 файлов TypeScript с их шаблонами и стилями), перезапуск превью кнопкой ⟳ — 0,11–0,18 с. Версии пакетов — точные, из `package.json` курса: окружение не меняется само.

## Сравнение

| | angular.dev | Этот курс |
|---|---|---|
| Что выполняет код | настоящий `ng serve` в Node.js внутри WebContainers | TypeScript — в воркере, шаблоны — JIT в `iframe` |
| Шаблоны | AOT, ошибки — при сборке, как в проекте | JIT: ошибки шаблонов — во время выполнения (шаг 20.4) |
| Холодный старт | десятки секунд: контейнер, `npm install`, сборка | несколько секунд; перезапуск — десятые доли секунды |
| Сеть | пакеты с CDN StackBlitz при каждом запуске | ничего, кроме файлов курса |
| Версии | `^22.2.0-next` без lock-файла | точные |
| Терминал | есть, команды `ng` | нет: CLI — на вашей машине (глава 20) |
| Требования | изоляция страницы, не iOS, память | обычная страница |
| Сервер с данными | нет | учебный бэкенд |
| Ответ | «Reveal Answer» записывает файлы ответа в контейнер | «Решение» |
| Скачать | ZIP текущих файлов (`DownloadManager`, `fflate`) | архив поверх `ng new` (шаг 20.2) |

Ни один вариант не «правильный». WebContainers дают настоящий инструмент: можно учить `ng generate` в терминале, а код редактора даже предусматривает туториалы без превью, только с терминалом (тип `TutorialType.CLI`; на нашем коммите ни один туториал его не использует). Цена — время, сеть, память и хрупкость: окружение собирается заново у каждого ученика. JIT в браузере быстрый и предсказуемый, но это не тот путь, которым код идёт в продакшен, — поэтому в курсе есть глава 20 и отдельные слова об отличиях JIT от AOT.

## Проверьте себя

::: task
1. Зачем `angular.json` сайта отдаёт `Cross-Origin-Embedder-Policy` даже в `ng serve`?
2. Почему туториал angular.dev мог сломаться, хотя в коде сайта ничего не менялось? Как бы вы это исправили?
3. Чем «Решение» в нашем курсе технически отличается от «Reveal Answer» в angular.dev?
4. Почему `CommandValidator` — не защита?
:::

::: hint Ответы
1. Встроенному редактору нужен `SharedArrayBuffer`, а он есть только у изолированной страницы. Без заголовков WebContainers не запустятся и при разработке.
2. Зависимости туториала — диапазоны `^22.2.0-next` без `package-lock.json`: каждый запуск ставит последние версии, и новый выпуск пакета меняет окружение. Исправить — зафиксировать версии: точные версии в `package.json` или `package-lock.json` в файлах туториала.
3. Наше «Решение» подставляет код решения шага в редактор, и платформа компилирует его заново. «Reveal Answer» записывает файлы ответа в файловую систему контейнера, а `ng serve` замечает изменения и пересобирает проект.
4. Проверка выполняется в браузере ученика и отключается параметром `?sudo=true`. Всё, что можно сделать в терминале, ученик и так делает в своём браузере, на своей машине: защищать нечего, проверка лишь не даёт запутаться.
:::
