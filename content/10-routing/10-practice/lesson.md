---
title: 'Практикум: хлебные крошки'
startFrom: custom
files: [main.ts, layout/breadcrumbs/breadcrumbs.ts, layout/breadcrumbs/breadcrumbs.html, layout/breadcrumbs/breadcrumbs.css, app.routes.ts, account/account.routes.ts, app.html, app.ts, app.config.ts, app.css, layout/header/header.ts, layout/header/header.html, layout/header/header.css, layout/shop-title-strategy.ts, home/home.ts, home/home.html, home/home.css, catalog/catalog.ts, catalog/catalog.html, catalog/catalog.css, game/game-page.ts, game/game-page.html, game/game-page.css, game/game-title.ts, cart/cart-page/cart-page.ts, cart/cart-page/cart-page.html, cart/cart-page/cart-page.css, checkout/checkout.ts, checkout/checkout.html, checkout/checkout.css, checkout/checkout-guards.ts, account/account.ts, account/account.html, account/account.css, account/favorites-page/favorites-page.ts, account/favorites-page/favorites-page.html, account/orders-page/orders-page.ts, account/orders-page/orders-page.html, not-found/not-found.ts, not-found/not-found.html, core/cart-store.ts, core/favorites-store.ts, core/promo-codes.ts, core/analytics.ts, core/shop-config.ts, shared/game-card/game-card.ts, shared/game-card/game-card.html, shared/game-card/game-card.css, shared/tabs/tabs.ts, shared/tabs/tabs.html, shared/tabs/tabs.css, shared/tabs/tab.ts, shared/tabs/tab.html, shared/countdown/countdown.ts, shared/countdown/countdown.html, shared/countdown/countdown.css, shared/now.ts, shared/price-pipe.ts, shared/players-pipe.ts, shared/duration-pipe.ts, shared/plural.ts, shared/tooltip.ts, shared/in-view.ts, shared/lazy-image.ts, shared/load-more/load-more.ts, shared/load-more/load-more.html, shared/load-more/load-more.css, shared/rating/rating.ts, shared/rating/rating.html, shared/rating/rating.css, shared/quantity/quantity.ts, shared/quantity/quantity.html, shared/quantity/quantity.css, core/models.ts, core/games-data.ts, styles.css]
url: /account/favorites
focus: layout/breadcrumbs/breadcrumbs.ts
api: [data, resolve, ActivatedRouteSnapshot, routerState, lastSuccessfulNavigation]
---

**Хлебные крошки** — строка над заголовком страницы, которая показывает путь до неё: «Главная › Кабинет › Избранное». Каждая часть, кроме последней, — ссылка. Крошки помогают понять, где вы, и подняться на уровень выше одним щелчком.

Подписи крошек — свойство маршрута, как `title`. Но у `Route` нет поля `breadcrumb`. Для своих данных у маршрута есть поле **`data`** — объект с чем угодно, который роутер передаёт в снимок маршрута.

В коде шага — компонент `layout/breadcrumbs/` с заготовкой (`Crumb`, `inject(Router)`, готовые стили) и `TODO` в `app.html`.

::: task
1. **Подписи в маршрутах**: `data: { breadcrumb: '…' }` у каталога («Каталог»), корзины («Корзина»), оформления («Оформление заказа»), кабинета («Кабинет») и его разделов («Избранное», «Заказы» — в `account.routes.ts`). У главной и у `'**'` крошки нет.
2. **Крошка страницы игры** — её название. Оно уже есть: резолвер `gameTitleResolver`. Положите его ответ в `data.breadcrumb` через `resolve`.
3. **`crumbs`** в `Breadcrumbs` — `computed` со списком крошек: первой всегда «Главная» (`/`), дальше — по одной на каждый активный маршрут с `data.breadcrumb`, от корня к текущей странице. Адрес крошки — адрес страницы этого уровня.
4. **Шаблон**: крошки через «›» (разделитель — в стилях, после каждой ссылки), последняя — `<span aria-current="page">`, остальные — ссылки. На главной (одна крошка) ничего не показывать.
5. **Каркас**: `<app-breadcrumbs />` над `<router-outlet />` в `app.html`.
:::

::: hint Подсказка 1: где взять дерево маршрутов
Выбранные маршруты роутер хранит деревом снимков: `router.routerState.snapshot.root` — корень, у каждого снимка `firstChild` — следующий уровень (у нас нет боковых `router-outlet`, поэтому ребёнок всегда один), `url` — его кусок адреса (массив сегментов, у сегмента — `path`), `data` — данные маршрута вместе с результатами резолверов.

Спуск от корня к странице:

```ts
let route = this.router.routerState.snapshot.root;
while (route.firstChild) {
  route = route.firstChild;
  // …
}
```
:::

::: hint Подсказка 2: когда пересчитывать
`routerState` — не сигнал: `computed` не узнает, что он изменился. Зато у роутера есть сигнал **`lastSuccessfulNavigation`** — последняя завершившаяся навигация. Прочитайте его в начале `computed`, и тот будет пересчитываться после каждого перехода:

```ts
protected readonly crumbs = computed(() => {
  // lastSuccessfulNavigation — сигнал: после каждого перехода crumbs пересчитается
  this.router.lastSuccessfulNavigation();
  // … обход дерева
});
```
:::

::: hint Подсказка 3: крошка «Кабинет» дважды
У кабинета два уровня маршрутов: `'account'` из `app.routes.ts` и `''` с компонентом `Account` из `account.routes.ts`. Маршрут с пустым путём **наследует** `data` родителя — у него тоже `breadcrumb: 'Кабинет'`. Своего куска адреса у него нет (`route.url.length === 0`) — такие уровни пропускайте.
:::

::: hint Подсказка 4: адрес крошки
Копите адрес по дороге вниз: `url += '/' + route.url.map((segment) => segment.path).join('/')`. У `games/:id` два сегмента — `games` и `4`, отсюда `join('/')`.
:::

::: hint Подсказка 5: data из резолвера
```ts app.routes.ts
title: gameTitleResolver,
// Крошка — тоже название игры: резолвер кладёт его в data.breadcrumb
resolve: { breadcrumb: gameTitleResolver },
```

`resolve` кладёт ответ резолвера в `data` под указанным ключом, рядом со статическими данными маршрута.
:::

::: hint Подсказка 6: шаблон
```html
@if (crumbs().length > 1) {
  <nav class="breadcrumbs" aria-label="Хлебные крошки">
    @for (crumb of crumbs(); track crumb.url; let last = $last) {
      @if (last) {
        <span aria-current="page">{{ crumb.label }}</span>
      } @else {
        <a [routerLink]="crumb.url">{{ crumb.label }}</a>
      }
    }
  </nav>
}
```
:::

## Проверьте себя

Шаг открывается в кабинете.

- `/account/favorites` — «Главная › Кабинет › Избранное». «Кабинет» — ссылка на `/account`, и она снова приводит в избранное (переадресация). Перейдите в «Заказы» — «Главная › Кабинет › Заказы».
- Каталог — «Главная › Каталог», корзина — «Главная › Корзина».
- Страница «Ночного экспресса» — «Главная › Ночной экспресс». Каталога в крошках нет, и это честно: адрес игры `/games/4` не вложен в `/catalog`. Крошки повторяют иерархию адресов, а не путь, которым покупатель пришёл.
- На главной крошек нет, на `/nope` — тоже (только «Главная», а одну крошку мы не показываем).
- В оформлении заказа — «Главная › Оформление заказа».

## Итоги главы

| Что | Зачем |
|---|---|
| `Routes`, `provideRouter(routes)`, `<router-outlet>` | карта адресов, роутер и место для страницы |
| `routerLink`, `routerLinkActive`, `ariaCurrentWhenActive` | переходы без перезагрузки, подсветка текущей страницы |
| `':id'` + `withComponentInputBinding()` + `input()` | параметры адреса — во входы страницы |
| `Router.navigate([], { relativeTo, queryParams, queryParamsHandling, replaceUrl })` | навигация из кода, query-параметры |
| `children` + вложенный `<router-outlet>` | каркас раздела и страницы внутри него |
| `loadComponent`, `loadChildren` | загружать страницу или раздел, когда они понадобились |
| `canActivate`, `canDeactivate`, `canMatch` | пускать на страницу, отпускать с неё, пропускать маршрут |
| `title`, `ResolveFn`, `TitleStrategy` | заголовок вкладки, данные для маршрута |
| `redirectTo`, `'**'` | переадресации и «Нет такой страницы» |
| `withViewTransitions()`, `withInMemoryScrolling()` | плавная смена страниц и прокрутка как в браузере |
| `data`, `resolve`, `routerState`, `lastSuccessfulNavigation` | свои данные маршрута и дерево активных маршрутов |

И главные идеи:

- адрес — часть состояния: то, что описывает содержимое страницы (какая игра, какие фильтры), живёт в адресе;
- роутер выбирает маршруты по порядку, и маршрут подходит, только если весь адрес разобран до конца; `'**'` — последний;
- страница получает параметры входами — и должна быть готова к тому, что они меняются без пересоздания компонента;
- «пустая страница без ошибок» в роутинге — почти всегда забытый `<router-outlet>`, `provideRouter` или функция роутера.

«Ход конём» стал настоящим многостраничным магазином — но все данные всё ещё лежат в файле `games-data.ts`. В главе 11 «HTTP и данные» каталог и страница игры начнут загружать данные с сервера: загрузка, ошибки, отмена запросов и фильтры из адреса прямо в запрос. А перед этим — необязательный шаг «под капотом»: что делает роутер между щелчком по ссылке и появлением страницы.
