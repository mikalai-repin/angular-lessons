---
title: Вложенные маршруты
startFrom: custom
files: [main.ts, app.routes.ts, account/account.ts, account/account.html, account/account.css, account/favorites-page/favorites-page.ts, account/favorites-page/favorites-page.html, account/orders-page/orders-page.ts, account/orders-page/orders-page.html, layout/header/header.html, core/favorites-store.ts, app.config.ts, app.ts, app.html, app.css, layout/header/header.ts, layout/header/header.css, home/home.ts, home/home.html, home/home.css, catalog/catalog.ts, catalog/catalog.html, catalog/catalog.css, game/game-page.ts, game/game-page.html, game/game-page.css, cart/cart-page/cart-page.ts, cart/cart-page/cart-page.html, cart/cart-page/cart-page.css, core/cart-store.ts, core/promo-codes.ts, core/analytics.ts, core/shop-config.ts, shared/game-card/game-card.ts, shared/game-card/game-card.html, shared/game-card/game-card.css, shared/tabs/tabs.ts, shared/tabs/tabs.html, shared/tabs/tabs.css, shared/tabs/tab.ts, shared/tabs/tab.html, shared/countdown/countdown.ts, shared/countdown/countdown.html, shared/countdown/countdown.css, shared/now.ts, shared/price-pipe.ts, shared/players-pipe.ts, shared/duration-pipe.ts, shared/plural.ts, shared/tooltip.ts, shared/in-view.ts, shared/lazy-image.ts, shared/load-more/load-more.ts, shared/load-more/load-more.html, shared/load-more/load-more.css, shared/rating/rating.ts, shared/rating/rating.html, shared/rating/rating.css, shared/quantity/quantity.ts, shared/quantity/quantity.html, shared/quantity/quantity.css, core/models.ts, core/games-data.ts, styles.css]
url: /account
focus: app.routes.ts
api: [children, вложенный router-outlet, относительные ссылки, redirectTo, pathMatch, NG04014]
---

Сделаем личный кабинет: страницу `/account` с заголовком и меню разделов, а под меню — сам раздел: `/account/favorites` — избранное, `/account/orders` — заказы. Заголовок и меню общие для всех разделов, меняется только нижняя часть.

Можно было бы сделать две независимые страницы и повторить в каждой заголовок и меню. Но у роутера для этого есть **вложенные маршруты** (child routes): маршрут кабинета рисует общий каркас, а его дочерние маршруты — содержимое внутри каркаса.

В коде шага — новая папка `account/`:

- `account/` — компонент `Account`, каркас кабинета: в шаблоне пока только заголовок и `TODO`, стили меню разделов готовы;
- `account/favorites-page/` — раздел «Избранное»: сетка карточек из избранного или «В избранном пока пусто»;
- `account/orders-page/` — раздел «Заказы»: пока одна строка «Здесь появятся ваши заказы» — заказы появятся вместе с оформлением.

В `FavoritesStore` добавлен `computed` `games` — игры из избранного для страницы раздела.

## Дочерние маршруты

```ts app.routes.ts
{
  path: 'account',
  component: Account,
  // Вложенные маршруты: их страницы выводит <router-outlet> внутри Account
  children: [
    // /account → /account/favorites
    { path: '', redirectTo: 'favorites', pathMatch: 'full' },
    { path: 'favorites', component: FavoritesPage },
    { path: 'orders', component: OrdersPage },
  ],
},
```

Пути детей — продолжение пути родителя: `'favorites'` внутри `'account'` — это `/account/favorites`. Для адреса `/account/orders` роутер выбирает **два** маршрута сразу: `account` и его ребёнка `orders`. Компонент родителя он выводит в `<router-outlet>` каркаса `App`, а компонент ребёнка — в `<router-outlet>`, который должен быть в шаблоне самого `Account`:

```
App
└─ <router-outlet>
   └─ Account          /account
      └─ <router-outlet>
         └─ OrdersPage    /orders
```

```html account/account.html
<h1>Личный кабинет</h1>
<!-- Ссылки без «/» в начале — относительные: от адреса этой страницы, /account -->
<nav class="sections">
  <a routerLink="favorites" routerLinkActive="active" ariaCurrentWhenActive="page">Избранное</a>
  <a routerLink="orders" routerLinkActive="active" ariaCurrentWhenActive="page">Заказы</a>
</nav>
<!-- Сюда роутер выводит дочернюю страницу: FavoritesPage или OrdersPage -->
<router-outlet />
```

## Относительные ссылки

`routerLink="favorites"` — без косой черты в начале — **относительная** ссылка: она строится от маршрута компонента, в шаблоне которого стоит. Для `Account` это `/account`, и ссылка ведёт на `/account/favorites`. Если кабинет когда-нибудь переедет на `/profile`, ссылки меню менять не придётся. `routerLink="/favorites"` с косой чертой — абсолютная ссылка от корня сайта.

## Переадресация

У адреса `/account` без раздела своей страницы нет. Пустой дочерний путь с `redirectTo` отправляет покупателя в избранное:

```ts
{ path: '', redirectTo: 'favorites', pathMatch: 'full' },
```

**`pathMatch: 'full'`** здесь обязателен. По умолчанию маршрут сравнивается с **началом** оставшегося адреса (`'prefix'`), а пустой путь — начало любого адреса. Переадресация с `''` по префиксу сработала бы и для `/account/orders`. Поэтому Angular требует явно указать `pathMatch` у переадресации с пустого пути — проверим в эксперименте.

## Ссылка из шапки

Сердечко в шапке ведёт в избранное:

```html layout/header/header.html
<a class="favorites" routerLink="/account/favorites" routerLinkActive="active" ariaCurrentWhenActive="page" title="Избранное"
  >♥ {{ favorites.count() }}</a
>
```

::: task
1. В `app.routes.ts` добавьте маршрут `'account'` с компонентом `Account` и детьми: переадресация с `''` на `'favorites'`, `'favorites'` → `FavoritesPage`, `'orders'` → `OrdersPage`.
2. В шаблоне `Account` — меню разделов `<nav class="sections">` с относительными ссылками «Избранное» и «Заказы» (`routerLinkActive`, `ariaCurrentWhenActive`) и `<router-outlet />`. Импорты — `RouterLink`, `RouterLinkActive`, `RouterOutlet`.
3. В шапке «♥ N» — ссылка на `/account/favorites` с `routerLinkActive`.
:::

## Что получилось

Шаг открывается на `/account`, и адрес тут же становится `/account/favorites`: сработала переадресация. В меню разделов подчёркнуто «Избранное», в шапке — сердечко. Отметьте пару игр в каталоге и вернитесь по сердечку — они здесь, и с ними можно работать как в каталоге. «Заказы» — `/account/orders`: заголовок и меню остались, сменилась только нижняя часть. В инструментах разработчика у ссылок меню — `href="/app/account/favorites"` и `href="/app/account/orders"`.

## Эксперимент: без pathMatch

Уберите `pathMatch: 'full'` у переадресации. Превью пустое — магазин не запустился вовсе, а в консоли:

```
ERROR RuntimeError: NG04014: Invalid configuration of route '{path: "account/", redirectTo: "favorites"}': please provide 'pathMatch'. The default value of 'pathMatch' is 'prefix', but often the intent is to use 'full'.
```

Роутер проверяет карту маршрутов при запуске, и ошибка в карте — ошибка всего приложения. В сообщении путь склеен с родительским: `"account/"`. Верните `pathMatch`.

## Эксперимент: без второго outlet

Уберите `<router-outlet />` из шаблона `Account` и откройте «Заказы». Заголовок и меню на месте, «Заказы» подчёркнуты, а строки «Здесь появятся ваши заказы» нет — и ошибки тоже нет. Роутер выбрал оба маршрута, но для дочерней страницы не нашлось места. Тот же «тихий» случай, что в шаге 1. Верните.
