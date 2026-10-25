---
title: Сборка
focus: app.routes.ts
api: [ng build, budgets, outputHashing, '--stats-json', loadComponent, NG0751]
---

`ng serve` собирает приложение для разработки: без сжатия, с картами исходников и отладочными проверками. Покупателю нужно другое — маленькие файлы, которые браузер может кэшировать. Их делает `ng build`. В главе 19 мы уже видели его отчёт со стороны компилятора. Теперь посмотрим со стороны проекта: что получилось, сколько весит и почему сборка недовольна магазином.

## `ng build`

```bash
ng build
```

```text
Initial chunk files | Names          |  Raw size | Estimated transfer size
main-YLA5UQDM.js    | main           | 258.55 kB |                65.51 kB
chunk--BgRTWOV.js   | -              | 201.06 kB |                59.33 kB
chunk-hP8R0X1N.js   | -              |  54.74 kB |                16.67 kB
styles-TTM4BREF.css | styles         |   1.63 kB |               602 bytes

                    | Initial total  | 515.97 kB |               142.12 kB

Lazy chunk files    | Names          |  Raw size | Estimated transfer size
chunk-I2Eni5el.js   | admin-routes   |  21.55 kB |                 6.32 kB
chunk-DCf5dutd.js   | game-page      |   8.07 kB |                 3.09 kB
chunk-BXCEnoiN.js   | account-routes |   4.95 kB |                 1.88 kB
chunk-BgG1jO9a.js   | game-reviews   |   4.13 kB |                 1.75 kB
chunk-DcN4Iekk.js   | analytics      | 412 bytes |               412 bytes

▲ [WARNING] bundle initial exceeded maximum budget. Budget 500.00 kB
  was not met by 15.97 kB with a total of 515.97 kB.
```

Цифры — с Angular 22.2.3. С вашей версией они могут отличаться на килобайт-другой, а имена файлов — точно другие.

Таблицы две:

- **Initial chunk files** — файлы, которые браузер загружает при открытии любой страницы: `main` (наш код запуска и всё, что он импортирует сразу), общие куски (`chunk-…` без имени — код, который esbuild вынес, потому что он нужен и `main`, и ленивым частям) и глобальные стили. Их сумма — **Initial total**: столько нужно скачать, прежде чем покупатель увидит магазин.
- **Lazy chunk files** — ленивые части. Каждая — результат одного из приёмов курса: `admin-routes` и `account-routes` — `loadChildren` (глава 10), `game-page` — `loadComponent`, `game-reviews` — блок `@defer` (глава 15), `analytics` — `import()` в `injectAsync` (глава 12). В превью ленивую загрузку можно было только представлять: здесь это настоящие отдельные файлы.

**Raw size** — размер файла на диске, **Estimated transfer size** — оценка того, сколько он займёт при передаче со сжатием. Реальный размер передачи зависит от сервера, но порядок тот.

## Что в `dist/`

```text
dist/hod-konem/
  3rdpartylicenses.txt  — лицензии библиотек в сборке
  browser/
    index.html          — со ссылками на main-….js
    main-YLA5UQDM.js
    chunk-….js
    styles-TTM4BREF.css
    favicon.ico
    assets/covers/…     — из public/
```

Это и есть сайт: папку `browser/` можно положить на любой статический хостинг (с одной настройкой — шаг 9). Обратите внимание на имена: `main-YLA5UQDM.js`. Это **хеш содержимого** — его добавляет `outputHashing: "all"` из конфигурации `production`. Поменяется код — поменяется имя. Поэтому сервер может разрешить браузеру кэшировать такие файлы навсегда: новая версия придёт под новым именем, а `index.html` (без хеша) укажет на неё.

## Бюджет

Сборка закончилась предупреждением: начальные файлы весят 515,97 kB, а бюджет — 500 kB. Бюджеты записаны в `angular.json`, в конфигурации `production`:

```json
"budgets": [
  { "type": "initial", "maximumWarning": "500kB", "maximumError": "1MB" },
  { "type": "anyComponentStyle", "maximumWarning": "4kB", "maximumError": "8kB" }
]
```

`initial` — сумма начальных файлов, `anyComponentStyle` — стили любого одного компонента. Перешли `maximumWarning` — предупреждение, `maximumError` — сборка не удалась (в главе 19 JIT-сборка магазина упала именно так: 1,33 MB). Бюджет — договорённость команды: «приложение не растёт незаметно». Можно поднять цифру в `angular.json`, но сначала стоит понять, что занимает место.

## Что внутри начальных файлов

```bash
ng build --stats-json
```

Рядом с `browser/` появится `browser-stats.json` — подробный отчёт esbuild: из каких модулей собран каждый файл. Его удобно смотреть в анализаторе esbuild ([esbuild.github.io/analyze](https://esbuild.github.io/analyze/)): перетащите файл на страницу, и анализатор покажет карту модулей. Мы разобрали этот отчёт скриптом. В начальных файлах больше всего занимают по порядку: `@angular/core`, `@angular/router`, `@angular/forms`, код магазина, `@angular/common`, дальше RxJS и NgRx.

Ядро и роутер нужны любой странице. А вот формы на главной не нужны — они попали в начальные файлы, потому что три страницы с формами подключены в `app.routes.ts` напрямую, через `component`: корзина (промокод), оформление заказа и вход. Импорт класса страницы вверху `app.routes.ts` тянет в `main` и саму страницу, и всё, что она импортирует.

::: task
Сделайте страницы корзины (`/cart`), оформления (`/checkout`) и входа (`/login`) ленивыми: замените `component` на `loadComponent` и уберите их импорты вверху `app.routes.ts`. Если у вас открыт проект CLI — сделайте то же в нём и соберите снова.
:::

::: hint Подсказка: как выглядит ленивая страница
Так же, как страница игры:

```ts
loadComponent: () =>
  import('./cart/cart-page/cart-page').then((m) => m.CartPage),
```
:::

## Что получилось

В превью ничего не изменилось внешне: страницы открываются как раньше. А сборка стала другой:

```text
Initial chunk files | Names          |  Raw size | Estimated transfer size
chunk-BhwRGhkO.js   | -              | 201.06 kB |                59.40 kB
main-RDPA5TTL.js    | main           | 171.05 kB |                45.52 kB
chunk-iyPW4TU1.js   | -              |  54.74 kB |                16.68 kB
styles-TTM4BREF.css | styles         |   1.63 kB |               602 bytes

                    | Initial total  | 428.48 kB |               122.20 kB

Lazy chunk files    | Names          |  Raw size | Estimated transfer size
chunk-CnPyfN2F.js   | -              |  63.41 kB |                15.70 kB
chunk-DmpDSs49.js   | admin-routes   |  21.61 kB |                 6.35 kB
chunk-Bre9MM5w.js   | checkout       |   9.87 kB |                 3.48 kB
chunk-Ciog_6Df.js   | cart-page      |   9.63 kB |                 3.22 kB
…
chunk-DwyT83rC.js   | login          |   3.60 kB |                 1.40 kB
```

Минус 87 kB в начальных файлах, бюджет соблюдён, предупреждения нет. Появились ленивые `checkout`, `cart-page`, `login` — и безымянный ленивый чанк на 63,41 kB. Это общий код трёх страниц — в основном формы. Он загрузится один раз, при первом переходе на любую из них, и останется в кэше.

Гард `unsavedCheckoutGuard` по-прежнему импортирует класс `Checkout`, но только как тип (`CanDeactivateFn<Checkout>`). Типы при сборке стираются, поэтому страница всё равно уехала в свой чанк.

## Сборка для разработки

```bash
ng build --configuration development
```

```text
                    | Initial total  |   1.74 MB
```

Тот же код без сжатия и оптимизаций — вчетверо больше, чем 428,48 kB продакшен-сборки. В этой же конфигурации собирает и `ng serve` (а пакеты из `node_modules` он ещё и раздаёт отдельно — его таблица размеров совсем другая). Поэтому размеры смотрят только в `ng build`.

У сервера разработки есть ещё одна особенность. Откройте в `ng serve` страницу игры и загляните в консоль:

```text
NG0751: Angular has detected that this application contains `@defer` blocks
and the hot module replacement (HMR) mode is enabled. All `@defer` block
dependencies will be loaded eagerly.
```

**HMR** (hot module replacement) — замена кода без перезагрузки страницы: поменяли шаблон, сохранили — `ng serve` подменяет его на открытой странице. Ради этого зависимости `@defer` грузятся сразу, и в отчёте `ng serve` нет чанка `game-reviews`. Хотите увидеть `@defer` как в сборке — `ng serve --no-hmr`: в Network появится отдельный запрос за чанком отзывов (у нас он приходит ещё до открытия вкладки — это `prefetch on idle`).

::: deep Под капотом: почему у сборки есть «общие» чанки
esbuild собирает граф модулей от точек входа: `main.ts` и каждого динамического `import()` (ленивые маршруты, `@defer`, `injectAsync`). Если модуль нужен нескольким точкам, его нельзя положить внутрь одной — его выносят в общий файл, который загрузят все, кому он нужен. Так появляются `chunk-…` без имени: в начальных — общее для `main` и ленивых частей, в ленивых — общее для нескольких ленивых (у нас — формы трёх страниц). Имя в отчёте есть только у файла, который соответствует одной точке входа.
:::
