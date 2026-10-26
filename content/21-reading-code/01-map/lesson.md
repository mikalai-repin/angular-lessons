---
title: Карта проекта
startFrom: custom
base: 20-real-project/09-deploy
baseHash: 'f58e92a741f7'
noSolution: true
focus: app.config.ts
api: [angular.dev, adev, '@angular/docs', Bazel, 'workspace:*', mergeApplicationConfig]
---

«Ход конём» написан, собран и выпущен. Остался последний вопрос: как выглядит большое приложение на Angular, которое пишут не для учебника? Откроем код **angular.dev** — сайта документации, по ссылкам на который вы весь курс читали об API и кодах ошибок. Его пишет команда Angular, код открыт (лицензия MIT) и лежит в репозитории самого фреймворка, в папке [`adev/`](https://github.com/angular/angular/tree/fb7711f/adev).

В этой главе нет заданий в редакторе, кроме практикума: справа — ваш магазин, в редакторе — его код, а читать предстоит чужой. Все ссылки ведут на коммит [`fb7711f`](https://github.com/angular/angular/commit/fb7711f87d293ba1a282f21d0e9c1ef651c1b343) — «release: cut the v22.2.1 release» от 30 сентября 2026 года, ту же версию Angular, что у курса. Код по этим ссылкам не изменится. Живой сайт собирается из ветки `22.2.x` и обновляется почти каждый день: когда мы писали главу, его HTML начинался с `ng-version="22.2.3+sha-be309d5"`. Что команда успела поменять за месяц после нашего коммита — в шаге 6.

Откройте репозиторий в соседней вкладке и держите рядом.

## Как читать чужой проект

Незнакомый проект не читают от первого файла по алфавиту. Удобный порядок:

1. **Что это и как запустить**: `README.md`, `package.json` — зависимости и команды.
2. **Точка входа**: что выполняется первым и с какими провайдерами.
3. **Скелет**: какие папки главные и как они связаны — не вникая в детали.
4. **Один сценарий от начала до конца**: например, «пользователь открыл страницу» — через все файлы, которые в нём участвуют.

Так и пойдём.

## Монорепозиторий

Репозиторий [angular/angular](https://github.com/angular/angular) — **монорепозиторий**: в одном репозитории лежит много пакетов. В `packages/` — сам фреймворк (`core`, `router`, `compiler`, `forms`…), в `adev/` — сайт. Это видно в зависимостях сайта:

```json adev/package.json
"@angular/core": "workspace:*",
"@angular/router": "workspace:*",
"@angular/cdk": "22.2.0",
"@angular/material": "22.2.0",
"@webcontainer/api": "1.6.4",
"algoliasearch": "5.57.0",
```

`workspace:*` значит: пакет берётся не из npm, а из папки того же репозитория. angular.dev всегда собран с Angular **того же коммита** — сайт первым пробует каждое изменение фреймворка. CDK, Material и CLI — отдельные репозитории, они приходят из npm с точной версией, как в нашем `package.json` после `--save-exact` (шаг 20.2).

Остальные зависимости подсказывают, что внутри: CodeMirror, `@webcontainer/api`, `@xterm/xterm` и `@typescript/vfs` — встроенный редактор (шаг 5), `algoliasearch` — поиск (шаг 3), `marked`, `shiki`, `mermaid` — превращение Markdown в HTML при сборке.

Ещё одна библиотека живёт прямо в `adev/`: папка [`shared-docs/`](https://github.com/angular/angular/tree/fb7711f/adev/shared-docs) — пакет **`@angular/docs`** (так он назван в её `package.json`). В npm его нет: это общие компоненты и сервисы сайтов документации — просмотр статьи, поиск, навигация. Приложение импортирует их как обычный пакет: `import {DocViewer} from '@angular/docs'`.

## Сборка: Bazel и знакомый angular.json

В `README.md` сайт запускают командой `pnpm adev`. За ней — `ibazel run //adev:build.serve`: весь репозиторий собирает **Bazel**, система сборки Google для больших монорепозиториев. Но загляните в [`adev/BUILD.bazel`](https://github.com/angular/angular/blob/fb7711f/adev/BUILD.bazel#L138-L162): правило `ng_application` собирает проект `angular-dev` из [`angular.json`](https://github.com/angular/angular/blob/fb7711f/adev/angular.json) тем же сборщиком, что ваш `ng build`:

```json adev/angular.json
"prefix": "adev",
"architect": {
  "build": {
    "builder": "@angular/build:application",
    "options": {
      "outputMode": "static",
      "browser": "src/main.ts",
      "server": "src/main.server.ts",
      "polyfills": [],
      "inlineStyleLanguage": "scss",
      …
```

Всё это вы видели в главе 20. `outputMode: "static"` — статический сайт, как в практикуме 20.10: каждая страница — готовый HTML, сервер на Node.js не нужен (шаг 4). `polyfills: []` — zone.js нет, сайт зонлесс. `inlineStyleLanguage: "scss"` — стили компонентов на SCSS. В цели `serve` — заголовки `Cross-Origin-Opener-Policy` и `Cross-Origin-Embedder-Policy`: без них не работает встроенный редактор (шаг 5). Тесты — `@angular/build:unit-test` с `"runner": "karma"`: команда не перевела сайт на Vitest, который `ng new` ставит по умолчанию (шаг 16.9).

Bazel — забота команды фреймворка, а не приложения. Внутри всё тот же Angular CLI.

## Точка входа

[`src/main.ts`](https://github.com/angular/angular/blob/fb7711f/adev/src/main.ts) — строка в строку как наш `main.ts`:

```ts adev/src/main.ts
bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
```

[`src/main.server.ts`](https://github.com/angular/angular/blob/fb7711f/adev/src/main.server.ts) и [`app.config.server.ts`](https://github.com/angular/angular/blob/fb7711f/adev/src/app/app.config.server.ts) — те же файлы, что создал `ng add @angular/ssr` в шаге 20.7, с одним маршрутом сервера на весь сайт:

```ts adev/src/app/app.config.server.ts
provideServerRendering(
  {maxResponseBodySize: 4 * 1024 * 1024},
  withRoutes([{path: '**', renderMode: RenderMode.Prerender}]),
),
```

Пререндерить — всё. А это много: в [`sitemap.xml`](https://angular.dev/sitemap.xml) живого сайта 1 626 адресов, из них 1 143 — страницы справочника API. Как сборка узнаёт их все без `getPrerenderParams` (шаг 20.10) — в шаге 4. Первый аргумент — настройка `maxResponseBodySize`: предел размера ответа для `HttpClient` на сервере (в `@angular/platform-server` она становится токеном `HTTP_FETCH_MAX_RESPONSE_SIZE` для бэкенда на Fetch API), по умолчанию 1 МБ. Ответ больше — ошибка «Fetch response body exceeded the configured buffer limit». При пререндере сайт загружает статьи через `HttpClient` (шаг 4), и предел поднят до 4 МБ.

Теперь главный файл — [`app.config.ts`](https://github.com/angular/angular/blob/fb7711f/adev/src/app/app.config.ts#L37-L59). Наш открыт в редакторе — сравните:

```ts adev/src/app/app.config.ts
providers: [
  routerProviders,
  provideClientHydration(),
  provideEnvironmentInitializer(() => inject(AnalyticsService)),
  provideAlgoliaSearchClient(environment),
  {provide: ENVIRONMENT, useValue: environment},
  {provide: ErrorHandler, useClass: CustomErrorHandler},
  {provide: PREVIEWS_COMPONENTS, useValue: PREVIEWS_COMPONENTS_MAP},
  {provide: DOCS_CONTENT_LOADER, useClass: ContentLoader},
  {provide: EXAMPLE_VIEWER_CONTENT_LOADER, useClass: ExampleContentLoader},
  {provide: WINDOW, useFactory: (document: Document) => windowProvider(document), deps: [DOCUMENT]},
  TYPESCRIPT_VFS_WORKER_PROVIDER,
  {provide: UrlSerializer, useClass: AdevUrlSerializer},
],
```

Что здесь знакомо и что нового:

- **`routerProviders`** — роутер вынесен в свой файл `routing/router_providers.ts`: пять возможностей роутера, две свои стратегии и две функции инициализации (шаг 2). Наш `app.config.ts` тоже вырос — такой вынос ему не повредил бы.
- **`provideClientHydration()`** — гидратация, как в нашем проекте CLI (шаг 20.8).
- **`provideEnvironmentInitializer(() => inject(AnalyticsService))`** — функция, которая выполняется при создании инжектора приложения. Здесь она просто создаёт сервис аналитики при запуске: в конструкторе сервис подключает Google Analytics и перехватывает ошибки окна. Без инициализатора сервис создался бы только при первом `inject` — например, когда обработчик ошибок поймает первую ошибку. В отличие от `provideAppInitializer` (шаг 14.3) функция ничего не возвращает: ждать нечего, первая страница не задерживается.
- **`{provide: ErrorHandler, useClass: CustomErrorHandler}`** — свой обработчик ошибок (шаг 8.4). Что он ловит — в шаге 6.
- **Токены из `@angular/docs` с классами приложения.** Библиотека объявляет, что ей нужно: токен `DOCS_CONTENT_LOADER` и интерфейс «дай содержимое страницы по пути». Приложение даёт реализацию — `ContentLoader`, который знает, где лежат статьи. Библиотека не зависит от приложения, приложение подставляет своё — внедрение зависимостей в масштабе пакетов (шаг 8.5).
- **`provideHttpClient()` нет.** `HttpClient` — `providedIn: 'root'` (шаг 11.2), а интерцепторы сайту не нужны: статьи — обычные `GET` к своим же файлам.
- **`environment`** импортирован напрямую, без `fileReplacements` (шаг 20.9): у сайта одно окружение. В нём ключи Algolia с честным комментарием: «эти значения видны в заголовках запросов поиска — это ключи только для поиска». Секретов на клиенте нет — ровно правило шага 20.9.

## Скелет

| Папка | Что внутри | У нас |
|---|---|---|
| `src/app/core/` | Каркас: навигация, подвал, полоса загрузки; сервисы аналитики, загрузки статей, заголовка, темы, версий | `core/`, `layout/` |
| `src/app/features/` | Страницы: статья, главная, туториал, песочница, справочник API, руководство по обновлению, 404 | `catalog/`, `game/`, `cart/`, `account/`… |
| `src/app/editor/` | Встроенный редактор: CodeMirror, WebContainers, терминал (шаг 5) | платформа курса |
| `src/app/routing/` | Маршруты, настройки роутера, данные навигации, переадресации старых адресов | `app.routes.ts` |
| `shared-docs/` | Пакет `@angular/docs`: просмотр статьи, поиск, меню, токены | `shared/` |
| `shared-docs/pipeline/` | Скрипты сборки на Node.js: Markdown → HTML, справочник API из исходников фреймворка | — |
| `src/content/` | 390 статей и туториалов в Markdown | `content/` этого курса |

Размеры (без тестов): в `src/app` — 123 файла TypeScript и 15 312 строк, в `shared-docs` без сборочных скриптов — 60 файлов и 3 792 строки; скрипты `pipeline/` — ещё 140 файлов и 12 052 строки. У «Хода конём» — 75 файлов TypeScript и 4 208 строк. Разница — в числе возможностей, а не приёмов: дальше вы увидите, что приёмы почти все знакомы.

## Что за Angular внутри

Мы посчитали поиском по `src/app` и `shared-docs` — без тестов, сборочных скриптов и примеров кода, которые сайт показывает в строках:

| Современное | Раз | Старое | Раз |
|---|---|---|---|
| `inject()` | 186 | DI через конструктор | 0 |
| `input()` / `output()` / `model()` | 49 / 4 / 6 | `@Input()` / `@Output()` | 1 / 0 |
| `signal` / `computed` / `effect` / `linkedSignal` | 92 / 33 / 11 / 8 | `NgZone` | 0 |
| `@if` / `@for` / `@defer` / `@let` | 105 / 31 / 7 / 7 | `*ngIf` / `*ngFor` | 0 / 0 |
| `@Service()` | 29 | `@Injectable()` | 0 |
| компоненты без `changeDetection` | 47 из 47 | `@NgModule` | 0 |

Код написан так, как учил курс: все компоненты — OnPush по умолчанию, приложение зонлесс, зависимости через `inject()`, состояние на сигналах. Два исключения стоит запомнить.

**Единственный `@Input()`** — в директиве [`SearchItem`](https://github.com/angular/angular/blob/fb7711f/adev/shared-docs/directives/search-item/search-item.directive.ts#L19-L22), с комментарием: «эти входы требует интерфейс `Highlightable`, перевести их на сигналы пока нельзя». `Highlightable` — интерфейс CDK для навигации по списку стрелками: CDK читает `item.disabled` как обычное свойство, а сигнальный вход — функция. Старый API остаётся там, где его требует контракт чужой библиотеки.

**`*ngComponentOutlet`** — три раза. Это структурная директива `NgComponentOutlet` со звёздочкой: она рисует компонент, класс которого известен только во время работы (`*ngComponentOutlet="embeddedEditorComponent(); inputs: {…}"`). Для неё нет блока вроде `@if`, поэтому синтаксис со звёздочкой здесь — не наследие, а единственный способ.

## Имена файлов и классов

В `src/app` и `shared-docs` 39 файлов вида `home.component.ts` — так называл файлы стиль до 2025 года. `ng generate` в Angular 22 создаёт `home.ts` (шаг 20.5), и новые файлы сайта уже такие: `not-found.ts`, `home/components/signals-demo/signals-demo.ts`. А классы переименованы почти везде: из 47 компонентов суффикс `Component` остался у десяти (`AppComponent`, `DocsComponent`…), а в `home.component.ts` лежит `export default class Home`, в `tutorial.component.ts` — `Tutorial`. Переименовать класс дёшево, а файл — это все импорты и история изменений в git. Большой проект переходит на новый стиль постепенно, и середину перехода видно.

Префиксы селекторов — два: `adev-` у компонентов приложения (`adev-root`, `adev-home`; тот самый `"prefix": "adev"` в `angular.json`) и `docs-` у пакета `@angular/docs` (`docs-viewer`, `docs-search-dialog`).

## Сценарий: открыть статью о сигналах

Проследим, что происходит при переходе на [angular.dev/guide/signals](https://angular.dev/guide/signals):

1. [`routing/navigation-entries/index.ts`](https://github.com/angular/angular/blob/fb7711f/adev/src/app/routing/navigation-entries/index.ts#L97-L101) — пункт меню `{label: 'Overview', path: 'guide/signals', contentPath: 'guide/signals/overview'}`. 1 839 строк таких пунктов — всё меню сайта.
2. [`routing/routes.ts`](https://github.com/angular/angular/blob/fb7711f/adev/src/app/routing/routes.ts#L19-L29) — из пунктов меню строятся маршруты: адрес `guide/signals`, ленивый `DocsComponent` и резолвер `docContent`.
3. [`shared-docs/utils/navigation.utils.ts`](https://github.com/angular/angular/blob/fb7711f/adev/shared-docs/utils/navigation.utils.ts#L114-L119) — резолвер зовёт загрузчик из токена `DOCS_CONTENT_LOADER`.
4. [`core/services/content-loader.service.ts`](https://github.com/angular/angular/blob/fb7711f/adev/src/app/core/services/content-loader.service.ts) — `HttpClient` запрашивает `assets/content/guide/signals/overview.md.html`: статью, которую сборка уже превратила из Markdown в HTML.
5. [`features/docs/docs.component.ts`](https://github.com/angular/angular/blob/fb7711f/adev/src/app/features/docs/docs.component.ts) — результат резолвера приходит во вход `docContent` (`withComponentInputBinding`), шаблон передаёт HTML в `<main docsViewer>`.
6. [`shared-docs/components/viewers/docs-viewer/docs-viewer.component.ts`](https://github.com/angular/angular/blob/fb7711f/adev/shared-docs/components/viewers/docs-viewer/docs-viewer.component.ts) — вставляет HTML и создаёт внутри него компоненты: примеры кода, оглавление, кнопки «Копировать».

У нас тот же путь для `/games/4`: `app.routes.ts` → `gameTitleResolver` → `HttpClient` → вход `id` у `GamePage` → `httpResource`. Части те же: карта маршрутов, резолвер, сервис с `HttpClient`, вход из роутера. Шаги 2–4 пройдут этот путь подробно.

## Проверьте себя

::: task
Найдите ответы в коде angular.dev по ссылкам выше.

1. С какой версией `@angular/router` собран angular.dev и откуда он её берёт?
2. Откройте [`app.component.ts`](https://github.com/angular/angular/blob/fb7711f/adev/src/app/app.component.ts). Какой у него селектор и откуда в нём префикс?
3. В `routes.ts` страницы загружаются как `loadComponent: () => import('../features/docs/docs.component')` — без `.then((m) => m.DocsComponent)`, как у нас. Почему так можно?
4. Сколько возможностей (`with…`) передано в `provideRouter` в [`router_providers.ts`](https://github.com/angular/angular/blob/fb7711f/adev/src/app/routing/router_providers.ts#L37-L66)? А у нас?
:::

::: hint Ответы
1. Ни с какой из npm: `"@angular/router": "workspace:*"` — из папки `packages/router` того же коммита репозитория.
2. `adev-root`. Префикс `adev` задан в `angular.json` (`"prefix": "adev"`): его подставляет `ng generate`.
3. Класс страницы экспортирован по умолчанию: `export default class DocsComponent`. Роутер сам достаёт `default` из модуля — подробнее в шаге 2.
4. Пять: `withInMemoryScrolling`, `withRouterConfig`, `withNavigationErrorHandler`, `withViewTransitions`, `withComponentInputBinding`. У нас три: `withComponentInputBinding`, `withViewTransitions`, `withInMemoryScrolling`.
:::
