---
title: Ленивая загрузка
startFrom: custom
files: [main.ts, app.routes.ts, account/account.routes.ts, app.config.ts, app.ts, app.html, app.css, layout/header/header.ts, layout/header/header.html, layout/header/header.css, home/home.ts, home/home.html, home/home.css, catalog/catalog.ts, catalog/catalog.html, catalog/catalog.css, game/game-page.ts, game/game-page.html, game/game-page.css, cart/cart-page/cart-page.ts, cart/cart-page/cart-page.html, cart/cart-page/cart-page.css, account/account.ts, account/account.html, account/account.css, account/favorites-page/favorites-page.ts, account/favorites-page/favorites-page.html, account/orders-page/orders-page.ts, account/orders-page/orders-page.html, core/cart-store.ts, core/favorites-store.ts, core/promo-codes.ts, core/analytics.ts, core/shop-config.ts, shared/game-card/game-card.ts, shared/game-card/game-card.html, shared/game-card/game-card.css, shared/tabs/tabs.ts, shared/tabs/tabs.html, shared/tabs/tabs.css, shared/tabs/tab.ts, shared/tabs/tab.html, shared/countdown/countdown.ts, shared/countdown/countdown.html, shared/countdown/countdown.css, shared/now.ts, shared/price-pipe.ts, shared/players-pipe.ts, shared/duration-pipe.ts, shared/plural.ts, shared/tooltip.ts, shared/in-view.ts, shared/lazy-image.ts, shared/load-more/load-more.ts, shared/load-more/load-more.html, shared/load-more/load-more.css, shared/rating/rating.ts, shared/rating/rating.html, shared/rating/rating.css, shared/quantity/quantity.ts, shared/quantity/quantity.html, shared/quantity/quantity.css, core/models.ts, core/games-data.ts, styles.css]
focus: app.routes.ts
api: [ленивая загрузка, 'loadComponent', 'loadChildren', 'import()', withPreloading, PreloadAllModules]
---

В кабинет заходит малая часть покупателей, а его код загружается у всех — вместе с главной, каталогом и корзиной. Страница игры нужна чаще, но тоже не всем и не сразу. В настоящем приложении такие разделы — это сотни килобайт кода, которые браузер скачивает и разбирает до того, как покажет первую страницу.

Роутер умеет загружать страницу **лениво**: только когда покупатель впервые на неё переходит. Вы уже видели этот приём в главе 8 — `injectAsync` загружал модуль аналитики через `import()`. Здесь то же самое, только для маршрутов.

В коде шага — новый файл `account/account.routes.ts` с заготовкой и комментарии `TODO` в `app.routes.ts`. Первой строкой в `account.routes.ts` — `console.log('Кабинет: модуль загружен')`, только для урока: по ней мы увидим, когда браузер загрузит модуль.

## loadChildren: раздел целиком

Перенесём маршруты кабинета в отдельный файл:

```ts account/account.routes.ts
import { Routes } from '@angular/router';
import { Account } from './account';
import { FavoritesPage } from './favorites-page/favorites-page';
import { OrdersPage } from './orders-page/orders-page';

// Только для урока: строка появится в консоли, когда браузер загрузит этот модуль
console.log('Кабинет: модуль загружен');

// Маршруты кабинета. Путь '' — относительно родителя: адрес /account уже совпал в app.routes.ts
export const accountRoutes: Routes = [
  {
    path: '',
    component: Account,
    children: [
      { path: '', redirectTo: 'favorites', pathMatch: 'full' },
      { path: 'favorites', component: FavoritesPage },
      { path: 'orders', component: OrdersPage },
    ],
  },
];
```

А в `app.routes.ts` от кабинета остаются путь и функция загрузки:

```ts app.routes.ts
{
  path: 'account',
  // Кабинет со всеми вложенными маршрутами — отдельный модуль: загрузится при первом переходе
  loadChildren: () => import('./account/account.routes').then((m) => m.accountRoutes),
},
```

**`loadChildren`** — функция, которая возвращает промис с дочерними маршрутами. Роутер вызовет её, когда адрес впервые начнётся с `/account`, дождётся загрузки модуля и продолжит подбирать маршрут уже по загруженным детям.

Самое важное здесь — **не импортировать** компоненты кабинета в `app.routes.ts` обычным `import`. Динамический `import()` — это точка, где сборщик разрезает приложение на части. Если хоть один файл основной части импортирует `Account` статически, его код окажется в основной части, и разрезать будет нечего. Поэтому строки `import { Account } …`, `import { FavoritesPage } …`, `import { OrdersPage } …` из `app.routes.ts` удалите.

## loadComponent: одна страница

Если лениво загружать нужно одну страницу, а не раздел, есть **`loadComponent`**:

```ts app.routes.ts
{
  path: 'games/:id',
  // Страница игры загружается отдельно — при первом переходе на неё
  loadComponent: () => import('./game/game-page').then((m) => m.GamePage),
},
```

Статический `import { GamePage } …` из `app.routes.ts` тоже удалите.

::: task
1. Перенесите маршрут кабинета в `account/account.routes.ts` (массив `accountRoutes`; путь родителя там — `''`), а в `app.routes.ts` замените его на `loadChildren`.
2. Страницу игры загружайте через `loadComponent`.
3. Уберите из `app.routes.ts` статические импорты `Account`, `FavoritesPage`, `OrdersPage` и `GamePage`.
:::

## Что получилось

Магазин работает как прежде. Разница — в консоли. При запуске на главной строки «Кабинет: модуль загружен» нет. Щёлкните сердечко в шапке — строка появилась, кабинет открылся. Уйдите на главную и вернитесь в кабинет — второй строки нет: модуль загружается один раз, дальше роутер берёт маршруты из памяти.

Если открыть превью сразу на `/account/orders` (введите адрес), строка появится при запуске: роутеру нужны маршруты кабинета, чтобы разобрать адрес.

## Эксперимент: предзагрузка

Ленивость экономит загрузку первой страницы, но первый переход в кабинет теперь ждёт сети. Компромисс — **предзагрузка**: загрузить ленивые части, когда первая страница уже показана. Добавьте в `app.config.ts`:

```ts app.config.ts
import { PreloadAllModules, provideRouter, withComponentInputBinding, withPreloading } from '@angular/router';
…
provideRouter(routes, withComponentInputBinding(), withPreloading(PreloadAllModules)),
```

Нажмите ⟳ на главной: строка «Кабинет: модуль загружен» появилась сразу после запуска, хотя в кабинет никто не заходил. Уберите предзагрузку.

`PreloadAllModules` грузит всё подряд. Можно написать свою стратегию — класс с методом `preload(route, load)`, который решает, что предзагружать (например, только маршруты с `data: { preload: true }`).

## Как в настоящем проекте

В превью все файлы и так в памяти: каждый файл шага — отдельный модуль, и «загрузка» — это выполнение модуля, а не сетевой запрос. Поэтому разницу мы видим по консоли, а не по вкладке «Сеть». В проекте Angular CLI сборщик положит кабинет в отдельный файл (чанк), и при первом переходе во вкладке Network инструментов разработчика появится запрос за ним. Отчёт `ng build` показывает ленивые части отдельно от основных — посмотрим на него в главе 20.

::: legacy Вы встретите в старом коде: loadChildren с модулем
Раньше лениво загружали модуль:

```ts
{ path: 'account', loadChildren: () => import('./account/account.module').then((m) => m.AccountModule) }
```

а маршруты раздела описывал `RouterModule.forChild(routes)` внутри этого модуля. Ещё раньше путь писали строкой: `loadChildren: './account/account.module#AccountModule'`.
:::
