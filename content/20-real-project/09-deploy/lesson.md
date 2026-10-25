---
title: Окружения и деплой
focus: app.config.ts
api: [ng generate environments, fileReplacements, isDevMode, outputMode, NG_ALLOWED_HOSTS, ng deploy]
---

Магазин собирается, проверяется и рендерится на сервере. Осталось выпустить его к покупателям. Для этого нужно ответить на два вопроса: чем сборка для покупателей отличается от сборки для разработки — и куда её положить.

## Разработка и продакшен в коде

Откройте продакшен-сервер из шага 7 (`npm run serve:ssr:hod-konem`) и консоль браузера на любой странице. Журнала действий Store там нет — в главе 18 мы включали его только при разработке:

```ts core/action-log.ts
export const metaReducers: MetaReducer[] = isDevMode()
  ? [logActions]
  : [];
```

**`isDevMode()`** возвращает `true` в режиме разработки (`ng serve`, превью курса) и `false` в продакшен-сборке. А вот журнал запросов интерцептора (глава 12) в продакшене пишет в консоль покупателя каждый запрос: `GET /api/games/4 → 200, 1 мс`. Покупателю он не нужен, а адреса API в консоли — лишние подробности о сервере.

::: task
В `app.config.ts` подключайте `loggingInterceptor` только в режиме разработки — так же, как журнал действий:

```ts app.config.ts
withInterceptors([
  // Журнал запросов — только при разработке, как журнал действий Store
  ...(isDevMode() ? [loggingInterceptor] : []),
  authInterceptor,
  cacheInterceptor,
  retryInterceptor,
]),
```
:::

В превью ничего не изменится: оно всегда в режиме разработки, журнал на месте. После `ng build` и запуска продакшен-сервера в консоли браузера остаются только «Корзина: …» и строки нашей учебной аналитики — запросов в журнале нет.

## Окружения

`isDevMode()` отвечает на один вопрос: разработка или продакшен. Но бывает, что у сборок разные **значения**: адрес API, ключ сервиса аналитики, адрес сервера ошибок. Для этого у CLI есть **окружения**:

```bash
ng generate environments
```

```text
CREATE src/environments/environment.ts (31 bytes)
CREATE src/environments/environment.development.ts (31 bytes)
UPDATE angular.json (2660 bytes)
```

Оба файла — `export const environment = {};`. Заполните их одинаковыми полями с разными значениями:

```ts src/environments/environment.ts
export const environment = {
  analyticsKey: 'prod-key-123',
};
```

```ts src/environments/environment.development.ts
export const environment = {
  analyticsKey: 'dev-key-456',
};
```

В коде импортируют всегда `environment.ts`: `import { environment } from '../environments/environment'`. Подмену делает сборка — схема добавила в конфигурацию `development` в `angular.json`:

```json angular.json
"fileReplacements": [
  {
    "replace": "src/environments/environment.ts",
    "with": "src/environments/environment.development.ts"
  }
]
```

Мы проверили: в файлах `ng build` есть только `prod-key-123`, в файлах `ng build --configuration development` — только `dev-key-456`. Подмена происходит при сборке, а не во время работы.

::: warning
Всё, что попало в `environment.ts`, попадает в JavaScript, который скачивает каждый покупатель. Секретов — паролей, закрытых ключей API — там быть не может. Только то, что не жалко показать: публичные ключи, адреса.
:::

Окружения — инструмент CLI, превью их не знает. Поэтому в магазине курса настройки живут в DI — токен `SHOP_CONFIG` (глава 8). Это тоже рабочий вариант: значения можно подменить провайдером, в тесте или в `app.config.server.ts`.

## Куда положить сборку

Магазин в режиме `outputMode: "server"` собирается в две папки:

```text
dist/hod-konem/
  browser/   — файлы для браузера и пререндеренный index.html
  server/    — server.mjs и код рендеринга
```

**Вариант 1: сервер Node.js.** На любой машине или в контейнере с Node.js 22+ достаточно папки `dist/`: Express и всё остальное сборка уложила в `server.mjs` и соседние файлы. Мы проверили — копия `dist/` в пустой папке, без `node_modules`, запустилась и отдала каталог:

```bash
PORT=8080 NG_ALLOWED_HOSTS=hod-konem.example API_URL=http://api:3000 \
  node dist/hod-konem/server/server.mjs
```

- `PORT` — порт (по умолчанию 4000, так написано в `server.ts`);
- `NG_ALLOWED_HOSTS` — разрешённые хосты, если не хотите вписывать домен в `angular.json` при сборке (шаг 7);
- `API_URL` — адрес бэкенда для нашей пересылки `/api` в `server.ts`.

Перед таким сервером обычно стоит обратный прокси (nginx, балансировщик облака): он принимает HTTPS и отдаёт запросы Node.js. А `server.ts` уже готов к менеджеру процессов PM2: условие `isMainModule(import.meta.url) || process.env['pm_id']`.

**Вариант 2: статический хостинг.** Если на сервере ничего не рендерить, а только раздавать файлы — подойдёт любой статический хостинг или CDN. Для этого у сборки есть `outputMode: "static"`. Но с нашими маршрутами она откажется:

```text
✘ [ERROR] Route '/catalog' is configured with server render mode, but the build
'outputMode' is set to 'static'.
```

Без сервера маршрут `Server` невозможен: каждую страницу нужно либо пререндерить, либо отдать браузеру. Как это сделать для каталога и 40 страниц игр — практикум этой главы.

**Вариант 3: `ng deploy`.** Цель `deploy` в `angular.json` добавляют пакеты под конкретные хостинги. Без такого пакета команда подскажет:

```text
Cannot find "deploy" target for the specified project.
You can add a package that implements these capabilities.

For example:
  Amazon S3: ng add @jefiozie/ngx-aws-deploy
  Firebase: ng add @angular/fire
  Netlify: ng add @netlify-builder/deploy
  GitHub Pages: ng add angular-cli-ghpages
```

Это пакеты не из Angular: прежде чем подключать, посмотрите их версии и совместимость с Angular 22.

## Перед выпуском

Соберём то, что проверяли в этой главе, в один список:

```bash
ng lint                    # шаг 5: замечаний нет
ng test --watch=false      # шаг 6: 46 тестов
ng build                   # шаги 3, 4, 7: бюджет, строгие шаблоны, пререндеринг
```

И при запуске: `allowedHosts` или `NG_ALLOWED_HOSTS` с настоящим доменом, бэкенд доступен серверу (пререндер ходит к нему ещё при сборке), отладочных журналов в консоли нет.

::: deep Под капотом: как isDevMode узнаёт режим
`isDevMode()` читает глобальный флаг `ngDevMode`. В сборке для разработки Angular сам превращает его в объект для отладки. В продакшен-сборке сборщик `@angular/build` подставляет вместо него `false` на этапе сборки (в его коде — `'ngDevMode': 'false'`, когда включена оптимизация скриптов). Код вида `if (ngDevMode) { … }` внутри Angular превращается в `if (false) { … }`, и минификатор выбрасывает его целиком. Поэтому в продакшен-сборке нет ни текстов ошибок, ни отладочного API `ng`. Наш `isDevMode() ? [loggingInterceptor] : []` выбрасывается не так полно — это вызов функции, — но интерцептор в продакшене не подключается.
:::
