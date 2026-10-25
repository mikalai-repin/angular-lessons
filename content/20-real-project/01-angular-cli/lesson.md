---
title: Angular CLI
startFrom: custom
base: 19-internals/07-practice
baseHash: '4f3d2c2c9bb4'
noSolution: true
focus: main.ts
removedInStart: [debug/cd-log.ts, debug/signal-lab.ts, debug/view-log.ts]
api: [ng new, ng serve, ng version, angular.json, tsconfig.json, strictTemplates]
---

Девятнадцать глав «Ход конём» жил в превью курса: код компилировался прямо в браузере, а данные отдавал учебный бэкенд внутри iframe. Это удобно для учёбы, но настоящие приложения на Angular так не делают. Их создают и собирают **Angular CLI** — инструментом командной строки, который знает всё о проекте: как его запускать, собирать, тестировать и обновлять.

В этой главе магазин переезжает на вашу машину. К концу главы у вас будет проект Angular CLI с тем же кодом, который:

- собирается компилятором AOT и укладывается в бюджет размера;
- проверяет шаблоны при сборке и проходит линтер;
- запускает тесты главы 16 командой `ng test`;
- рендерит страницы на сервере и гидратирует их в браузере;
- собирается для продакшена и запускается как обычный сервер Node.js.

Шаги этой главы выполняются **в терминале**, а не в превью. В редакторе — магазин в том виде, в каком он переезжает, а команды, их вывод и файлы, которых в превью нет, — в тексте. Весь вывод в уроках получен на настоящем проекте, собранном по этим шагам.

## Что изменилось в коде

Один шаг подготовки уже сделан: из магазина убрана папка `debug/` из главы 19. Её помощники читали внутренности Angular (`LView`, флаги, профайлер) и держались на отладочном API `ng` — его нет в продакшен-сборке. Вместе с ними из `main.ts` ушёл вызов помощников. Теперь `main.ts` такой же, как его создаёт CLI:

```ts main.ts
bootstrapApplication(App, appConfig).catch((err) =>
  console.error(err),
);
```

## Что нужно на машине

- **Node.js** одной из версий, которые поддерживает Angular 22: `^22.22.3`, `^24.15.0` или `>=26.0.0` (так записано в поле `engines` пакетов `@angular/cli` и `@angular/core`). Проверьте: `node --version`.
- **npm** — ставится вместе с Node.js.
- Редактор. Для VS Code есть расширение **Angular Language Service**: подсказки и ошибки прямо в шаблонах. `ng new` сам предложит его через `.vscode/extensions.json`.

## Установка и первый запуск

Angular CLI — пакет npm `@angular/cli`, команда в нём называется `ng`. Ставим глобально, той версии, на которой проверен курс:

```bash
npm install -g @angular/cli@22.2.1
ng version
```

При первом запуске `ng` задаст два вопроса:

```text
? Would you like to enable autocompletion? … (Y/n)
? Would you like to share pseudonymous usage data about this project
  with the Angular Team at Google … (y/N)
```

Первый — автодополнение команд по Tab: CLI допишет строку `source <(ng completion script)` в файл настроек оболочки (у нас — `~/.zshrc`). Второй — анонимная статистика использования. Отвечайте как хотите, на проект это не влияет.

Теперь создаём проект:

```bash
ng new hod-konem
```

`ng new` спросит ещё три вещи:

| Вопрос | Ответ | Почему |
|---|---|---|
| Which stylesheet system would you like to use? | **CSS** | Стили магазина — обычный CSS. Есть Tailwind, Sass (SCSS и Indented), Less |
| Do you want to enable Server-Side Rendering (SSR) and Static Site Generation (SSG/Prerendering)? | **N** | Рендеринг на сервере добавим в шаге 7 — и посмотрим, что он меняет |
| Which AI tools should Angular integrate with? | **None** | Файлы инструкций для ИИ-ассистентов (`CLAUDE.md`, `AGENTS.md`) и настройки сервера MCP Angular. Для учёбы не нужны |

CLI создаст файлы и установит пакеты npm — это займёт минуту-другую. Запускаем:

```bash
cd hod-konem
ng serve
```

```text
Initial chunk files | Names         | Raw size
main.js             | main          | 48.09 kB |
styles.css          | styles        | 95 bytes |

                    | Initial total | 48.19 kB

Application bundle generation complete. [0.564 seconds]

Watch mode enabled. Watching for file changes...
  ➜  Local:   http://localhost:4200/
```

Откройте `http://localhost:4200/` — там страница-заготовка с заголовком «Hello, hod-konem». `ng serve` собирает приложение и следит за файлами: поменяйте `title` в `src/app/app.ts`, сохраните — страница обновится сама.

::: tip
`ng` из глобальной установки, запущенный внутри проекта, передаёт работу **локальному** CLI из `node_modules` проекта. Поэтому у разных проектов на одной машине могут быть разные версии Angular — каждый работает со своей.
:::

## Что внутри проекта

```text
hod-konem/
  angular.json        — настройки сборки, сервера, тестов
  package.json        — пакеты и скрипты npm
  tsconfig.json       — TypeScript и компилятор Angular
  tsconfig.app.json   — …для приложения
  tsconfig.spec.json  — …для тестов
  .editorconfig, .prettierrc, .vscode/
  public/favicon.ico  — файлы «как есть»
  src/
    index.html        — страница с <app-root>
    main.ts           — запуск приложения
    styles.css        — глобальные стили
    app/
      app.ts, app.html, app.css
      app.config.ts, app.routes.ts
      app.spec.ts     — тест заготовки
```

Узнаёте? Курс с главы 1 раскладывал файлы так же: `app.ts` с `templateUrl` и `styleUrl`, `app.config.ts` с `provideBrowserGlobalErrorListeners()` и `provideRouter(routes)`, имена без суффиксов `.component`. Это и есть соглашения `ng new` 22. Корень шага в превью — это `src/app` проекта, а `main.ts` и `styles.css` лежат уровнем выше, в `src/`.

Две вещи в превью делались незаметно, а здесь видны:

- **`index.html`** — страница, в которую вставляется приложение. В ней элемент `<app-root>` (селектор `App`) и `<base href="/">` — от него роутер считает адреса. Превью писало такую страницу само.
- **`public/`** — файлы, которые попадают в сборку без изменений: картинки, иконки. Обложки игр переедут сюда в следующем шаге.

## `angular.json`

Главный файл настроек. Сокращённо:

```json
{
  "projects": {
    "hod-konem": {
      "sourceRoot": "src",
      "prefix": "app",
      "architect": {
        "build": {
          "builder": "@angular/build:application",
          "options": {
            "browser": "src/main.ts",
            "tsConfig": "tsconfig.app.json",
            "assets": [{ "glob": "**/*", "input": "public" }],
            "styles": ["src/styles.css"]
          },
          "configurations": {
            "production": { "budgets": […], "outputHashing": "all" },
            "development": { "optimization": false, "sourceMap": true }
          },
          "defaultConfiguration": "production"
        },
        "serve": { "builder": "@angular/build:dev-server", … },
        "test": { "builder": "@angular/build:unit-test" }
      }
    }
  }
}
```

- **`projects`** — в одном рабочем пространстве может быть несколько приложений и библиотек. У нас одно — `hod-konem`.
- **`prefix`** — начало селекторов: `ng generate` назовёт новый компонент `app-…`. Так же назывались компоненты магазина.
- **`architect`** — **цели** (targets): `build`, `serve`, `test`. У каждой цели — **сборщик** (builder), пакет, который делает работу, и его настройки. `ng build` — это запуск цели `build`, `ng serve` — цели `serve`. Полная форма: `ng run hod-konem:build`.
- **`configurations`** — наборы настроек поверх `options`. `production` добавляет бюджеты размера и хеши в именах файлов, `development` выключает оптимизацию и включает карты исходников. `ng build` по умолчанию собирает `production`, `ng serve` — `development`.

Сборщик `@angular/build:application` работает на **esbuild**, а сервер разработки — на **Vite**. Сам проект их не настраивает: всё, что нужно, — в `angular.json`.

## `tsconfig.json` и строгость

```json
{
  "compilerOptions": {
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "experimentalDecorators": true,
    "target": "ES2022",
    "module": "preserve"
  },
  "angularCompilerOptions": {
    "strictInjectionParameters": true,
    "strictInputAccessModifiers": true
  }
}
```

Вы не найдёте здесь ни `"strict": true`, ни `"strictTemplates": true` — и это не значит, что проект нестрогий. Оба режима теперь включены **по умолчанию**:

- TypeScript 6 включает `strict` сам. Мы проверили: тот же код без `strict` в `tsconfig.json` даёт ошибки `TS7006` (параметр неявно `any`) и `TS2322` (`null` в `string`).
- Компилятор Angular 22 считает `strictTemplates` включённым, пока его не выключат явно. В исходниках `@angular/compiler-cli` так и написано: «strictTemplate is `true` by default. Explicit opt-out is required to disable strictness».

Наоборот, `ng new --strict=false` записывает в `tsconfig.json` `"strict": false` и `"strictTemplates": false`. Что даёт строгая проверка шаблонов, разберём в шаге 4.

## Что получилось

У вас есть пустой проект Angular CLI 22 и запущенный сервер разработки. Посмотрите, что именно установилось:

```bash
ng version
```

```text
Angular CLI       : 22.2.4
Angular           : 22.2.3
Node.js           : 24.15.0
```

Версии новее, чем 22.2.1, которой вы ставили CLI. Это не ошибка: `ng new` записал в `package.json` диапазоны вида `"^22.2.0"`, и npm поставил последние исправления ветки 22.2 на день установки. У вас цифры могут быть ещё новее. Как устроены эти диапазоны, разберём в следующем шаге.

::: deep Под капотом: ng — это запуск сборщиков
`ng serve` не содержит логики сервера. CLI читает `angular.json`, находит цель `serve` проекта, загружает пакет сборщика (`@angular/build`), берёт из него сборщик `dev-server` и передаёт ему настройки: `options`, поверх них — выбранную `configuration`, поверх — флаги командной строки (`ng serve --port 4300`). Сборщик `dev-server` сам запускает цель `build` в режиме наблюдения и раздаёт результат через Vite.

Поэтому новые возможности CLI часто появляются как новые сборщики: `@angular/build:unit-test` для Vitest, `@angular-eslint/builder:lint` для линтера в шаге 5. Подключи пакет — и в `angular.json` появится цель, а у `ng` — команда.
:::

::: legacy Вы встретите в старом коде: angular.json до Angular 17
Так `ng new` 16.2 описывал цель `build` (по шаблонам `@schematics/angular@16.2.16`):

```json
"build": {
  "builder": "@angular-devkit/build-angular:browser",
  "options": {
    "main": "src/main.ts",
    "polyfills": ["zone.js"],
    "assets": ["src/favicon.ico", "src/assets"]
  }
}
```

Другой сборщик (на webpack), `main` вместо `browser`, zone.js в `polyfills`, картинки — в `src/assets`, а цель `test` — сборщик `@angular-devkit/build-angular:karma`. Такие проекты переводят на новые сборщики командой `ng update` (шаг 5).
:::
