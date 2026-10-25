---
title: Рендеринг на сервере
focus: core/browser-storage.ts
api: [ng add @angular/ssr, RenderMode, ServerRoute, isPlatformBrowser, PLATFORM_ID, allowedHosts, NG02961]
---

Откройте магазин в `ng serve` и посмотрите исходный код страницы (Ctrl+U, а не инструменты разработчика). Вместо каталога там:

```html
<body>
  <app-root></app-root>
  <script src="main.js" type="module"></script>
</body>
```

Пустой `<app-root>`. Всё, что видит покупатель, построит JavaScript — после того как скачает 430 kB и сходит к API. Это **рендеринг на клиенте** (client-side rendering, CSR). Пока скрипты грузятся, на экране пусто; поисковик или превью ссылки в мессенджере, которые не выполняют JavaScript, не увидят ни одной игры.

**Рендеринг на сервере** (server-side rendering, SSR) решает это так: тот же код Angular выполняется на сервере Node.js, строит страницу и присылает готовый HTML. Браузер сразу показывает его, а потом загружает приложение и «оживляет» разметку — это гидратация, следующий шаг. Есть и третий вариант — **пререндеринг** (prerendering, SSG): HTML страниц строится один раз, при сборке, и отдаётся как обычный файл.

## `ng add @angular/ssr`

```bash
ng add @angular/ssr
```

```text
The package @angular/ssr@^22.2.4 will be installed and executed.
Would you like to proceed? (Y/n)
```

```text
CREATE src/main.server.ts (292 bytes)
CREATE src/app/app.config.server.ts (426 bytes)
CREATE src/app/app.routes.server.ts (166 bytes)
CREATE src/server.ts (1609 bytes)
UPDATE angular.json (2222 bytes)
UPDATE tsconfig.app.json (416 bytes)
UPDATE package.json (1139 bytes)
UPDATE src/app/app.config.ts (3864 bytes)
```

Что появилось:

```text
src/main.server.ts           — запуск приложения на сервере
src/server.ts                — сервер Express
src/app/app.config.server.ts — провайдеры сервера
src/app/app.routes.server.ts — как рендерить маршруты
```

`main.server.ts` запускает то же приложение — `bootstrapApplication(App, config, context)`, — но с другой конфигурацией. Её собирает `app.config.server.ts`:

```ts src/app/app.config.server.ts
const serverConfig: ApplicationConfig = {
  providers: [provideServerRendering(withRoutes(serverRoutes))],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
```

`mergeApplicationConfig` склеивает наши провайдеры из `app.config.ts` с серверными. Здесь же можно **заменить** провайдер только для сервера — это обычный DI из главы 8: последний провайдер токена побеждает.

`server.ts` — сервер на **Express**: раздаёт файлы сборки из `dist/…/browser`, а остальные запросы отдаёт `AngularNodeAppEngine` — он рендерит страницу. В `angular.json` у цели `build` появились `"server": "src/main.server.ts"`, `"outputMode": "server"`, `"ssr": { "entry": "src/server.ts" }` и `"security": { "allowedHosts": [] }`, в `package.json` — пакеты `@angular/ssr`, `@angular/platform-server`, `express` и скрипт `serve:ssr:hod-konem`. А в `app.config.ts` схема добавила `provideClientHydration()` — к ней вернёмся в следующем шаге.

## Первая сборка: `localStorage is not defined`

```bash
ng build
```

```text
ERROR ReferenceError: localStorage is not defined
    at o.restore (file:///…/.angular/prerender-root/…/chunk-QGEWRFJW.mjs:2:1145)
    at …/main.server.mjs:22:3602
    at e.runInitializers (…)

✘ [ERROR] An error occurred while extracting routes.
```

Чтобы узнать маршруты приложения, сборка **запустила его на сервере** — и оно упало в первом же инициализаторе: `AuthStore.restore()` читает токен из `localStorage` (глава 14). В Node.js нет `localStorage`, `window`, `document` браузера, `matchMedia`. Код, который выполняется при создании приложения, компонентов и сервисов, теперь выполняется и на сервере.

Где магазин трогает API браузера? Мы поискали `localStorage`, `window.`, `document.`, `matchMedia`, `IntersectionObserver`:

| Место | Когда выполняется | На сервере |
|---|---|---|
| `AuthStore` — токены | инициализатор приложения | **падает** |
| `withStorage` — корзина, «Вы смотрели» | создание хранилища | **падает** |
| `restoreFavorites` — избранное | запуск эффектов NgRx | **падает** |
| `Checkout` — черновик комментария | создание страницы | **падает** |
| `InView`, `ConfirmDialog` | `afterNextRender` | не выполняется |
| `Tooltip`, `FlyToCart`, анимация корзины | обработчики событий | не выполняется |

Нижние строки — заслуга главы 6: работу с DOM мы с самого начала ставили в `afterNextRender` или в обработчики событий. `afterNextRender` на сервере не вызывается вовсе — отрисовки там нет, — а событий на сервере не бывает. Проблема только в `localStorage`, и её удобно решить в одном месте.

## `BROWSER_STORAGE`

```ts core/browser-storage.ts
import {
  InjectionToken,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

// localStorage браузера. На сервере (SSR, пререндеринг) хранилища нет — null
export const BROWSER_STORAGE = new InjectionToken<Storage | null>(
  'BROWSER_STORAGE',
  {
    providedIn: 'root',
    factory: () =>
      isPlatformBrowser(inject(PLATFORM_ID)) ? localStorage : null,
  },
);
```

- **`PLATFORM_ID`** — токен, по которому приложение узнаёт, где работает: в браузере или на сервере. **`isPlatformBrowser`** из `@angular/common` проверяет его (есть и `isPlatformServer`).
- Фабрика токена вызывается один раз на приложение. В браузере `BROWSER_STORAGE` — это `localStorage`, на сервере — `null`, и TypeScript заставит каждого, кто его использует, это учесть.
- Корзина, избранное и вход на сервере — пустые: сервер отрисует страницу для гостя с пустой корзиной, а браузер достроит своё (следующий шаг).

Использование — везде одинаковое: вместо глобального `localStorage` — `inject(BROWSER_STORAGE)` и `?.`:

```ts core/auth-store.ts
// На сервере — null: токенов там нет, покупатель — гость
private readonly storage = inject(BROWSER_STORAGE);

async restore() {
  const token = this.storage?.getItem(TOKEN_KEY);
  if (!token) {
    return;
  }
  …
}
```

В `withStorage` без хранилища нечего восстанавливать и некуда сохранять — расширение просто выходит:

```ts core/with-storage.ts {3-6}
onInit(store) {
  // На сервере хранилища нет: состояние остаётся начальным
  const storage = inject(BROWSER_STORAGE);
  if (!storage) {
    return;
  }
  …
```

Почему токен, а не проверка `typeof localStorage !== 'undefined'` в каждом месте? Тот же довод, что в главе 8: зависимость, которую получают через DI, можно подменить — в тесте, на сервере, в другом окружении. Например, можно не проверять платформу в фабрике, а дать в `app.config.server.ts` провайдер `{ provide: BROWSER_STORAGE, useValue: null }`: серверная конфигурация перекроет фабрику.

## Режимы рендеринга

Следующая сборка падает уже иначе:

```text
✘ [ERROR] The 'games/:id' route uses prerendering and includes parameters,
but 'getPrerenderParams' is missing. Please define 'getPrerenderParams'
function for this route in your server routing configuration or specify
a different 'renderMode'.
```

(То же — для `admin/games/:id` и `game/:id`.) `ng add` записал в `app.routes.server.ts` один маршрут: `'**'` — всё — пререндерить. Сборка не знает, какие `:id` бывают. Решим, как рендерить каждую страницу:

```ts src/app/app.routes.server.ts
import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Главная одинакова для всех: HTML собирается один раз, при сборке
  { path: '', renderMode: RenderMode.Prerender },
  // Каталог и страница игры — на сервере при каждом запросе: цены и остатки свежие
  { path: 'catalog', renderMode: RenderMode.Server },
  { path: 'games/:id', renderMode: RenderMode.Server },
  // Остальное — корзина, оформление, вход, кабинет, админка — только в браузере
  { path: '**', renderMode: RenderMode.Client },
];
```

| `RenderMode` | Когда строится HTML | Подходит для |
|---|---|---|
| `Prerender` | один раз, при `ng build` | одинаковых для всех страниц |
| `Server` | на каждый запрос | страниц с изменчивыми данными |
| `Client` | в браузере, как раньше | личных страниц: сервер их не знает |

Маршруты сопоставляются по порядку, `'**'` — последним. Корзине и кабинету SSR бесполезен: их содержимое — в `localStorage` и токене покупателя, которых сервер не видит.

```text
Prerendered 1 static route.
Application bundle generation complete.
```

Сборка прошла — но только пока работает бэкенд. Чтобы пререндерить главную, сборка выполнила её код: компонент `Home` запросил хиты и игры со скидкой, и в терминале бэкенда появились `GET /api/games?sort=rating&size=4` и `GET /api/games?onSale=true`. Относительный адрес `/api/games` на сервере не к чему отсчитывать — Angular превращает его в полный по адресу текущего запроса (это делает интерцептор из `@angular/platform-server`).

## Продакшен-сервер

```bash
npm run serve:ssr:hod-konem
```

```text
Node Express server listening on http://localhost:4000
```

Откройте `http://localhost:4000/` — и вместо магазина:

```text
Header "host" with value "localhost:4000" is not allowed.
```

Это защита от **SSRF** (подделки запросов на стороне сервера). Сервер строит адреса запросов из заголовка `Host`, и злоумышленник с поддельным заголовком мог бы заставить его ходить куда не надо. Поэтому `AngularNodeAppEngine` принимает только хосты из списка: `security.allowedHosts` в `angular.json`, переменная окружения `NG_ALLOWED_HOSTS` или опция в `server.ts`. `ng add` оставил список пустым. Для проверки на своей машине:

```json angular.json
"security": {
  "allowedHosts": ["localhost"]
}
```

В продакшене здесь — домен магазина. Есть и `"*"` — любой хост, но тогда Angular предупредит, что проверять заголовки должен кто-то другой (балансировщик, обратный прокси).

Ещё одно: продакшен-серверу некуда отправлять `/api/…` — прокси из шага 2 живёт только в `ng serve`. Пусть `server.ts` пересылает такие запросы бэкенду сам:

```ts src/server.ts
// Учебный бэкенд — отдельный сервер (server/api.mjs). Запросы /api/… и /uploads/… пересылаем ему
const apiUrl = process.env['API_URL'] ?? 'http://localhost:3000';
app.use(['/api', '/uploads'], (req, res, next) => {
  const request = createWebRequestFromNodeRequest(req);
  fetch(new Request(new URL(req.originalUrl, apiUrl), request))
    .then((response) => writeResponseToNodeResponse(response, res))
    .catch(next);
});
```

Поставьте его перед раздачей файлов (`express.static`) и добавьте `createWebRequestFromNodeRequest` в импорт из `@angular/ssr/node`. Это те же `Request`/`Response`, что у бэкенда: `createWebRequestFromNodeRequest` превращает запрос Express в `Request`, `writeResponseToNodeResponse` пишет `Response` обратно. Обе функции экспортирует `@angular/ssr/node`, и сам `server.ts` уже пользуется второй.

## Что увидел сервер

Соберите и запустите снова. Отключите JavaScript в браузере (или посмотрите исходный код страницы):

- `/` — главная целиком: хиты, скидки. Это файл `dist/hod-konem/browser/index.html`, собранный при сборке;
- `/catalog` и `/games/4` — с играми, ценами, описанием: их построил сервер на этот запрос;
- `/cart` — пусто: режим `Client`. Сервер отдал заготовку `index.csr.html` с пустым `<app-root>`, добавив лишь `<link rel="modulepreload">` для чанков страницы корзины, чтобы браузер начал их грузить сразу.

А в терминале сервера — журналы магазина. Код приложения на сервере пишет в консоль сервера:

```text
Корзина: пусто
Аналитика: модуль загружен
Аналитика: экземпляр создан
Аналитика: Просмотр страницы — /catalog
GET /api/games?q=&inStock=false&rating=0&sort=&page=1&size=6 → 200, 323 мс
```

«Просмотр страницы» на сервере — ошибка в данных: сервер посчитал просмотр, а покупатель, может, ещё и не дождался страницы. Браузер посчитает его ещё раз. Просмотры — дело браузера:

```ts app.ts
constructor() {
  // Страницу смотрит покупатель в браузере. Сервер (SSR, пререндеринг) просмотров не считает
  if (!isPlatformBrowser(inject(PLATFORM_ID))) {
    return;
  }
  …
```

После этой правки в журнале сервера останется одна строка аналитики — «модуль загружен», один раз за жизнь сервера. Это `onIdle` в `CartStore` (глава 12) заранее загружает модуль, экземпляр не создаётся и ничего не отправляет.

## `ng serve` тоже рендерит на сервере

После `ng add` сервер разработки тоже строит страницы на сервере — с журналом в том же терминале. Откройте `/catalog`, и в терминале `ng serve` появится:

```text
NG02961: The `NgOptimizedImage` directive has detected that more than 5 images
were marked as priority. This might negatively affect an overall performance
of the page. To fix this, remove the "priority" attribute from images with
less priority.
```

В главе 15 мы отдали `priority` первым шести обложкам каталога (`priorityCovers: 6`). На сервере `priority` даёт ещё и `<link rel="preload">` в `<head>` — браузер начнёт грузить картинку раньше, чем дойдёт до неё. Предзагрузка шести картинок с высоким приоритетом конкурирует сама с собой, и Angular предупреждает после пятой. Предупреждение — только на сервере и только в режиме разработки: в превью вы его не видели.

::: task
1. Создайте `core/browser-storage.ts` с токеном `BROWSER_STORAGE`.
2. Замените `localStorage` на `inject(BROWSER_STORAGE)` в `core/auth-store.ts` (поле `storage`), `core/with-storage.ts`, `core/favorites-effects.ts` (третий параметр эффектов и параметр `readIds`) и `checkout/checkout.ts`. Глобального `localStorage` в коде магазина остаться не должно — кроме самой фабрики токена.
3. В `app.ts` не считайте просмотры на сервере.
4. В `core/shop-config.ts` уменьшите `priorityCovers` до 5.
5. В проекте CLI: `ng add @angular/ssr`, `app.routes.server.ts`, `allowedHosts`, пересылка `/api` в `server.ts`. Соберите и запустите продакшен-сервер.
:::

::: hint Подсказка: эффекты NgRx
Функциональные эффекты получают зависимости параметрами по умолчанию — добавьте третий: `storage = inject(BROWSER_STORAGE)`. В `readIds` передайте его аргументом и читайте `storage?.getItem(…)`.
:::

## Что получилось

В превью всё по-прежнему: это браузер, `BROWSER_STORAGE` — настоящий `localStorage`, корзина и вход сохраняются. А в проекте:

```text
Initial total  | 455.19 kB
Prerendered 1 static route.
```

Начальные файлы выросли примерно на 27 kB — в основном это код гидратации, — но в бюджет укладываются. Сервер присылает готовые страницы каталога и игр, главную — готовым файлом, а личные страницы остаются за браузером.

::: deep Под капотом: как сервер узнаёт, что страница готова
На сервере нет экрана и нет «потом»: HTML нужно отдать один раз, когда всё загружено. Angular ждёт, пока приложение станет **стабильным** — завершатся отложенные задачи (`PendingTasks`), в том числе запросы `HttpClient` и `httpResource`, — и тогда сериализует DOM в строку. Поэтому на сервере в HTML попадают данные из API: рендер ждал ответов. А таймер `interval` в `Countdown` стабильности не мешает: зонлесс-Angular не считает таймеры отложенными задачами.
:::

::: legacy Вы встретите в старом коде: Angular Universal и CommonEngine
До Angular 17 SSR подключали пакетами Angular Universal: последняя версия `@nguniversal/express-engine` — 16.2.0, дальше их место занял `@angular/ssr`. В старых `server.ts` страницы рендерит движок из этих пакетов, а в `@angular/ssr/node` 22 для таких проектов есть `CommonEngine`. Новые проекты используют `AngularNodeAppEngine` и `app.routes.server.ts` с режимами рендеринга.
:::
