---
title: 'Под капотом: как роутер находит страницу'
startFrom: custom
files: [main.ts, router-log.ts, app.routes.ts, app.config.ts, app.ts, app.html, app.css, layout/header/header.ts, layout/header/header.html, layout/header/header.css, layout/breadcrumbs/breadcrumbs.ts, layout/breadcrumbs/breadcrumbs.html, layout/breadcrumbs/breadcrumbs.css, layout/shop-title-strategy.ts, home/home.ts, home/home.html, home/home.css, catalog/catalog.ts, catalog/catalog.html, catalog/catalog.css, game/game-page.ts, game/game-page.html, game/game-page.css, game/game-title.ts, cart/cart-page/cart-page.ts, cart/cart-page/cart-page.html, cart/cart-page/cart-page.css, checkout/checkout.ts, checkout/checkout.html, checkout/checkout.css, checkout/checkout-guards.ts, account/account.routes.ts, account/account.ts, account/account.html, account/account.css, account/favorites-page/favorites-page.ts, account/favorites-page/favorites-page.html, account/orders-page/orders-page.ts, account/orders-page/orders-page.html, not-found/not-found.ts, not-found/not-found.html, core/cart-store.ts, core/favorites-store.ts, core/promo-codes.ts, core/analytics.ts, core/shop-config.ts, shared/game-card/game-card.ts, shared/game-card/game-card.html, shared/game-card/game-card.css, shared/tabs/tabs.ts, shared/tabs/tabs.html, shared/tabs/tabs.css, shared/tabs/tab.ts, shared/tabs/tab.html, shared/countdown/countdown.ts, shared/countdown/countdown.html, shared/countdown/countdown.css, shared/now.ts, shared/price-pipe.ts, shared/players-pipe.ts, shared/duration-pipe.ts, shared/plural.ts, shared/tooltip.ts, shared/in-view.ts, shared/lazy-image.ts, shared/load-more/load-more.ts, shared/load-more/load-more.html, shared/load-more/load-more.css, shared/rating/rating.ts, shared/rating/rating.html, shared/rating/rating.css, shared/quantity/quantity.ts, shared/quantity/quantity.html, shared/quantity/quantity.css, core/models.ts, core/games-data.ts, styles.css]
noSolution: true
focus: router-log.ts
api: [UrlTree, распознавание маршрута, ActivatedRouteSnapshot, 'Router.events', NavigationStart, NavigationEnd, NavigationCancel, RouteReuseStrategy]
---

Всю главу мы говорили «роутер выбирает маршрут» и «роутер показывает страницу». В этом шаге посмотрим, что именно происходит между щелчком по ссылке и появлением страницы. Шаг необязательный, кода в нём писать не нужно.

## Журнал навигации

В коде шага — помощник `router-log.ts`. Он подписывается на `router.events` — поток событий роутера (`Observable`, о потоках — глава 12) — и печатает каждое событие, а после завершения навигации — дерево выбранных маршрутов. `main.ts` подключает его провайдером `provideAppInitializer`: функция выполнится при запуске приложения, раньше первой навигации, и журнал застанет её. Готовый встроенный вариант для отладки — `withDebugTracing()`: он пишет в консоль те же события, но целыми объектами.

Откройте каталог по ссылке в меню. В консоли (мы сократили строки):

```
────────────
NavigationStart(id: 2, url: '/catalog')
RoutesRecognized(id: 2, url: '/catalog', urlAfterRedirects: '/catalog', state: …)
GuardsCheckStart(…)
ChildActivationStart(path: '')
ActivationStart(path: 'catalog')
GuardsCheckEnd(…, shouldActivate: true)
ResolveStart(…)
ResolveEnd(…)
ActivationEnd(path: 'catalog')
ChildActivationEnd(path: '')
NavigationEnd(id: 2, url: '/catalog', urlAfterRedirects: '/catalog')
Дерево активных маршрутов:
  корень → App
    'catalog' → Catalog
Scroll(anchor: 'null', position: 'null')
```

Каждая навигация получает номер (`id`; у вас он зависит от того, сколько переходов вы уже сделали) и проходит одни и те же этапы.

```
адрес → UrlTree
  │ распознавание: переадресации,
  │ подбор маршрутов, ленивые дети
  ▼ RoutesRecognized
гарды: canDeactivate, canActivate
  ▼ GuardsCheckEnd
резолверы, loadComponent
  ▼ ResolveEnd
активация: старые страницы
уничтожить, новые создать
  ▼ NavigationEnd
заголовок, прокрутка
```

## 1. Адрес → UrlTree

Строку адреса роутер сначала разбирает в дерево **`UrlTree`**: сегменты пути (`catalog`, `games` + `4`), query-параметры, фрагмент после `#`. Дерево — потому что в адресе могут быть ветки для нескольких `router-outlet` с именами (у нас их нет). С `UrlTree` вы уже работали: его возвращает `router.createUrlTree()` в гарде, а `routerLink` строит его из команд `['/games', 4]`.

## 2. Распознавание

Затем роутер подбирает маршруты к сегментам — это **распознавание** (recognition). Алгоритм перебора простой:

- для текущего списка сегментов маршруты карты пробуются **по порядку**;
- маршрут подходит, если его путь совпал с началом оставшихся сегментов (`'games/:id'` съедает `games` и `4` и запоминает `id`);
- если после него сегменты остались — их должны разобрать его `children`; не смогли — маршрут **не подошёл**, и роутер пробует **следующий** в карте;
- маршрут без детей подходит, только если сегментов не осталось. Вот почему `''` не перехватил `/catalog` в шаге 1: пустой путь совпал с началом, но `catalog` остался неразобранным — откат, следующий маршрут;
- `canMatch` вызывается здесь же: `false` — маршрут считается неподошедшим;
- `redirectTo` переписывает адрес и запускает подбор заново. Абсолютных переадресаций (на адрес с `/`) за одну навигацию может быть не больше 31 — так роутер защищается от зацикленных переадресаций;
- `loadChildren` загружается прямо во время распознавания: детей кабинета нужно знать, чтобы разобрать `/account/orders`.

Откройте кабинет:

```
NavigationStart(id: 4, url: '/account')
RouteConfigLoadStart(path: account)
Кабинет: модуль загружен
RouteConfigLoadEnd(path: account)
RoutesRecognized(id: 4, url: '/account', urlAfterRedirects: '/account/favorites', …)
```

Модуль кабинета загрузился **до** `RoutesRecognized`, а `urlAfterRedirects` уже `/account/favorites` — переадресация случилась на этапе распознавания. Если ничего не подошло — навигация заканчивается ошибкой NG04002 из шага 1.

Результат распознавания — дерево снимков **`ActivatedRouteSnapshot`**: по узлу на каждый выбранный маршрут, с параметрами, `data` и `title`. Его и печатает журнал после навигации:

```
Дерево активных маршрутов:
  корень → App
    'account'
      '' → Account
        'favorites' → FavoritesPage
```

У `'account'` нет компонента — только `loadChildren`, поэтому для него нет и своего `router-outlet`: `Account` встаёт в `<router-outlet>` каркаса. Это же дерево обходят ваши хлебные крошки.

## 3. Гарды

Теперь роутер сравнивает новое дерево с текущим: какие маршруты уходят — у них спрашивает `canDeactivate`, какие приходят — `canActivate` (события `ChildActivationStart` / `ActivationStart` отмечают уровни, которые проверяются). Если гард вернул `UrlTree`, текущая навигация отменяется и начинается новая. Очистите корзину и введите `/checkout` в адресной строке (приложение перезапустится, поэтому это навигация номер 1):

```
NavigationStart(id: 1, url: '/checkout')
RoutesRecognized(…)
GuardsCheckStart(…)
ChildActivationStart(path: '')
ActivationStart(path: 'checkout')
NavigationCancel(id: 1, url: '/checkout')
────────────
NavigationStart(id: 2, url: '/cart')
…
NavigationEnd(id: 2, url: '/cart', urlAfterRedirects: '/cart')
```

Навигация 1 отменена (`NavigationCancel`), навигация 2 — на `/cart`, адрес которой вернул гард.

## 4. Резолверы и ленивые компоненты

После гардов выполняются резолверы (`ResolveStart` / `ResolveEnd`) — для страницы игры это `gameTitleResolver` из `title` и `resolve`. А `loadComponent` загружается **после** них. Откройте игру:

```
ResolveStart(id: 5, url: '/games/3', …)
ResolveEnd(id: 5, url: '/games/3', …)
RouteConfigLoadStart(path: games/:id)
RouteConfigLoadEnd(path: games/:id)
ActivationEnd(path: 'games/:id')
```

Логика простая: компонент нужен только для показа, а показывать, может быть, и не придётся — если гард не пустит.

## 5. Активация

Наконец роутер приводит экран в соответствие с новым деревом. Он идёт по старому и новому дереву параллельно и для каждого уровня спрашивает **`RouteReuseStrategy`**: можно ли оставить то, что уже показано? Стратегия по умолчанию отвечает «да», если это тот же объект маршрута из карты (`future.routeConfig === curr.routeConfig`). Поэтому `/games/1` → `/games/3` оставляет тот же `GamePage` и меняет только вход (шаг 3), а `/catalog` → `/games/3` уничтожает `Catalog` и создаёт `GamePage` в том же `router-outlet`.

`ActivationEnd` идут снизу вверх — от самой глубокой страницы к корню. Затем `NavigationEnd`: адрес в браузере обновлён, `lastSuccessfulNavigation` изменился, `TitleStrategy` ставит заголовок. Последним — событие `Scroll`, по которому `withInMemoryScrolling` прокручивает страницу.

## Что ещё попробовать

- Откройте игру со страницы другой игры через адресную строку и через историю (← →) — посмотрите, какие события повторяются.
- Посмотрите, какие события роутер шлёт при `/game/3`: переадресация видна в `urlAfterRedirects` у `RoutesRecognized`.

::: tip События роутера в приложении
В приложении на события подписываются редко. Для индикатора «идёт переход» удобнее сигнал `router.currentNavigation()` — текущая навигация или `null`; для реакции на завершённый переход — `lastSuccessfulNavigation`, как в хлебных крошках. Поток `router.events` разберём в главе 12 «RxJS».
:::
