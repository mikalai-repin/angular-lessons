---
title: Заголовки и резолверы
startFrom: custom
files: [main.ts, app.routes.ts, game/game-title.ts, layout/shop-title-strategy.ts, app.config.ts, account/account.routes.ts, app.ts, app.html, app.css, layout/header/header.ts, layout/header/header.html, layout/header/header.css, home/home.ts, home/home.html, home/home.css, catalog/catalog.ts, catalog/catalog.html, catalog/catalog.css, game/game-page.ts, game/game-page.html, game/game-page.css, cart/cart-page/cart-page.ts, cart/cart-page/cart-page.html, cart/cart-page/cart-page.css, checkout/checkout.ts, checkout/checkout.html, checkout/checkout.css, checkout/checkout-guards.ts, account/account.ts, account/account.html, account/account.css, account/favorites-page/favorites-page.ts, account/favorites-page/favorites-page.html, account/orders-page/orders-page.ts, account/orders-page/orders-page.html, core/cart-store.ts, core/favorites-store.ts, core/promo-codes.ts, core/analytics.ts, core/shop-config.ts, shared/game-card/game-card.ts, shared/game-card/game-card.html, shared/game-card/game-card.css, shared/tabs/tabs.ts, shared/tabs/tabs.html, shared/tabs/tabs.css, shared/tabs/tab.ts, shared/tabs/tab.html, shared/countdown/countdown.ts, shared/countdown/countdown.html, shared/countdown/countdown.css, shared/now.ts, shared/price-pipe.ts, shared/players-pipe.ts, shared/duration-pipe.ts, shared/plural.ts, shared/tooltip.ts, shared/in-view.ts, shared/lazy-image.ts, shared/load-more/load-more.ts, shared/load-more/load-more.html, shared/load-more/load-more.css, shared/rating/rating.ts, shared/rating/rating.html, shared/rating/rating.css, shared/quantity/quantity.ts, shared/quantity/quantity.html, shared/quantity/quantity.css, core/models.ts, core/games-data.ts, styles.css]
focus: app.routes.ts
api: [title, ResolveFn, резолвер, TitleStrategy, 'buildTitle()', Title]
---

Посмотрите на строку над адресной строкой превью — это **заголовок вкладки**, `document.title` приложения. Сейчас там «Превью» на любой странице: так назван документ превью, а приложение заголовок не меняет. В настоящем браузере у всех вкладок магазина было бы одинаковое название, а в истории и закладках — десять одинаковых строк.

Сделаем, чтобы вкладка называлась по странице: «Каталог — Ход конём», «Остров сокровищ — Ход конём».

В коде шага — заготовки `game/game-title.ts` и `layout/shop-title-strategy.ts`, комментарии `TODO` в `app.routes.ts` и `app.config.ts`.

## title у маршрута

Заголовок страницы — свойство маршрута:

```ts app.routes.ts
{ path: '', component: Home, title: 'Настольные игры' },
{ path: 'catalog', component: Catalog, title: 'Каталог' },
{ path: 'cart', component: CartPage, title: 'Корзина' },
{ path: 'checkout', component: Checkout, title: 'Оформление заказа', … },
```

После каждого успешного перехода роутер берёт `title` самого глубокого из выбранных маршрутов и пишет его в `document.title`. Для кабинета это значит: заголовки — у дочерних маршрутов в `account.routes.ts`:

```ts account/account.routes.ts
{ path: 'favorites', component: FavoritesPage, title: 'Избранное' },
{ path: 'orders', component: OrdersPage, title: 'Мои заказы' },
```

## Резолвер: заголовок из данных

У страницы игры заголовок — название игры, а его роутер не знает: в адресе только `/games/4`. Чтобы получить значение, которое зависит от адреса, у маршрута есть **резолвер** (resolver) — функция `ResolveFn<T>`, которую роутер вызывает во время навигации и ждёт её результата:

```ts game/game-title.ts
// Заголовок страницы игры — её название. Роутер вызывает резолвер до того, как показать страницу
export const gameTitleResolver: ResolveFn<string> = (route) => {
  const id = Number(route.paramMap.get('id'));
  return GAMES.find((game) => game.id === id)?.title ?? 'Игра не найдена';
};
```

Резолвер получает снимок маршрута (`ActivatedRouteSnapshot`): его параметры уже известны. `paramMap.get('id')` — тот самый `:id`, строкой. `title` маршрута принимает и строку, и резолвер:

```ts app.routes.ts
{
  path: 'games/:id',
  loadComponent: () => import('./game/game-page').then((m) => m.GamePage),
  // Заголовок — название игры: его находит резолвер по :id
  title: gameTitleResolver,
},
```

Резолверы — общий механизм: `resolve: { game: gameResolver }` у маршрута положит результат в данные маршрута под ключом `game`, а с `withComponentInputBinding()` — и во вход `game` компонента. Порядок навигации такой: сначала все гарды, потом резолверы, потом страница. Если резолвер возвращает промис, страница появится, только когда он выполнится. Для данных с сервера это значит «пустой экран, пока грузится», поэтому в главе 11 данные страницы игры будем загружать ресурсом внутри неё, а резолверы оставим для того, без чего страницу нельзя показать вовсе.

## Свои правила заголовка

Хочется, чтобы к каждому заголовку добавлялось название магазина. Писать «— Ход конём» в каждом маршруте — повторение. Правила составления заголовка задаёт класс **`TitleStrategy`** роутера; по умолчанию он просто ставит `title` маршрута. Заменим его своим:

```ts layout/shop-title-strategy.ts
// Заголовок вкладки по правилам магазина: «Каталог — Ход конём».
// autoProvided: false — сама в DI не попадает, её подставляет провайдер TitleStrategy в app.config.ts
@Service({ autoProvided: false })
export class ShopTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);

  // Роутер вызывает метод после каждого успешного перехода
  override updateTitle(snapshot: RouterStateSnapshot) {
    // title самого глубокого маршрута: строка из карты маршрутов или ответ резолвера
    const title = this.buildTitle(snapshot);
    this.title.setTitle(title ? `${title} — Ход конём` : 'Ход конём');
  }
}
```

- `buildTitle(snapshot)` — метод базового класса: находит `title` самого глубокого маршрута, уже с ответом резолвера;
- `Title` из `@angular/platform-browser` — сервис, который меняет `document.title`. Можно написать `document.title = …` напрямую, но сервис — обычный для Angular способ, который не привязывает код к глобальному `document` (это пригодится при серверном рендеринге в главе 20).

Подменить реализацию по умолчанию своей — задача из главы 8, провайдер с `useClass`:

```ts app.config.ts
// Заголовок вкладки по нашим правилам: «Каталог — Ход конём»
{ provide: TitleStrategy, useClass: ShopTitleStrategy },
```

::: task
1. Добавьте `title` маршрутам: главная — «Настольные игры», «Каталог», «Корзина», «Оформление заказа»; в `account.routes.ts` — «Избранное» и «Мои заказы».
2. В `game/game-title.ts` напишите резолвер `gameTitleResolver` и укажите его как `title` страницы игры.
3. В `layout/shop-title-strategy.ts` — класс `ShopTitleStrategy`; подставьте его провайдером `TitleStrategy` в `app.config.ts`.
:::

## Что получилось

Заголовок вкладки над адресной строкой: «Настольные игры — Ход конём». Каталог — «Каталог — Ход конём», «Остров сокровищ» — «Остров сокровищ — Ход конём», `/games/99` — «Игра не найдена — Ход конём», «Избранное» в кабинете — «Избранное — Ход конём». Мы проверили все страницы по `document.title`.

## Эксперимент: забытый заголовок

Уберите провайдер `ShopTitleStrategy` из `app.config.ts` — заголовки станут короткими: «Каталог», «Остров сокровищ». Теперь уберите ещё и `title: 'Корзина'`. Откройте страницу игры, а потом корзину: во вкладке по-прежнему название игры. Стратегия по умолчанию не трогает `document.title`, если у страницы нет заголовка, — и в нём остаётся заголовок прошлой страницы. Своя стратегия от этого защищает: без `title` она ставит просто «Ход конём». Верните оба.

::: tip Заголовок в превью и в проекте
Строку с заголовком над адресной строкой показывает платформа курса — в браузере это была бы вкладка. «Превью» до первого перехода — `<title>` документа превью; в проекте CLI на его месте `<title>` из `src/index.html`.
:::
