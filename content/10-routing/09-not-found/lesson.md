---
title: 404, переадресации и переходы
startFrom: custom
files: [main.ts, app.routes.ts, app.config.ts, not-found/not-found.ts, not-found/not-found.html, app.ts, app.html, app.css, layout/header/header.ts, layout/header/header.html, layout/header/header.css, layout/shop-title-strategy.ts, home/home.ts, home/home.html, home/home.css, catalog/catalog.ts, catalog/catalog.html, catalog/catalog.css, game/game-page.ts, game/game-page.html, game/game-page.css, game/game-title.ts, cart/cart-page/cart-page.ts, cart/cart-page/cart-page.html, cart/cart-page/cart-page.css, checkout/checkout.ts, checkout/checkout.html, checkout/checkout.css, checkout/checkout-guards.ts, account/account.routes.ts, account/account.ts, account/account.html, account/account.css, account/favorites-page/favorites-page.ts, account/favorites-page/favorites-page.html, account/orders-page/orders-page.ts, account/orders-page/orders-page.html, core/cart-store.ts, core/favorites-store.ts, core/promo-codes.ts, core/analytics.ts, core/shop-config.ts, shared/game-card/game-card.ts, shared/game-card/game-card.html, shared/game-card/game-card.css, shared/tabs/tabs.ts, shared/tabs/tabs.html, shared/tabs/tabs.css, shared/tabs/tab.ts, shared/tabs/tab.html, shared/countdown/countdown.ts, shared/countdown/countdown.html, shared/countdown/countdown.css, shared/now.ts, shared/price-pipe.ts, shared/players-pipe.ts, shared/duration-pipe.ts, shared/plural.ts, shared/tooltip.ts, shared/in-view.ts, shared/lazy-image.ts, shared/load-more/load-more.ts, shared/load-more/load-more.html, shared/load-more/load-more.css, shared/rating/rating.ts, shared/rating/rating.html, shared/rating/rating.css, shared/quantity/quantity.ts, shared/quantity/quantity.html, shared/quantity/quantity.css, core/models.ts, core/games-data.ts, styles.css]
focus: app.routes.ts
api: ["'**'", redirectTo, RedirectFunction, 'withViewTransitions()', 'withInMemoryScrolling()', scrollPositionRestoration]
---

Три вещи, которые отличают аккуратный сайт от небрежного:

- на несуществующий адрес — понятная страница «Нет такой страницы», а не пустой экран и ошибка в консоли;
- старые и неполные адреса ведут куда нужно;
- переход между страницами ведёт себя как в браузере: новая страница открывается сверху, «Назад» возвращает туда, где вы были.

В коде шага — готовый компонент `not-found/` и комментарии `TODO` в `app.routes.ts` и `app.config.ts`.

## Маршрут '**'

Путь `'**'` подходит к **любому** адресу. Поэтому он стоит последним: роутер перебирает маршруты по порядку, и `'**'` срабатывает, только если ничего раньше не подошло.

```ts app.routes.ts
// Всё, что не подошло ни одному маршруту выше. Этот маршрут — всегда последний
{ path: '**', component: NotFound, title: 'Страница не найдена' },
```

Поставьте его первым — и любой адрес, даже `/`, покажет «Нет такой страницы».

Сервер на такой адрес всё равно отвечает приложением (шаг 1), а «404» видит только покупатель. Для поисковиков и проверок ссылок это обычная страница с кодом 200 — правильный код ответа отдаёт серверный рендеринг (глава 20).

## Переадресации

`redirectTo` вы видели в кабинете. Ещё два случая:

```ts app.routes.ts
// Без id игры показывать нечего — ведём в каталог
{ path: 'games', redirectTo: 'catalog', pathMatch: 'full' },
// Старые ссылки вида /game/3 из рассылок: переадресация с тем же id
{ path: 'game/:id', redirectTo: ({ params }) => `/games/${params['id']}` },
```

Первый — неполный адрес: кто-то стёр id в `/games/4`. Второй — **функция переадресации**: когда новый адрес зависит от старого, `redirectTo` принимает функцию. Она получает параметры, query-параметры и данные маршрута и возвращает строку или `UrlTree`. Функция выполняется в контексте внедрения — внутри можно вызвать `inject()`. Строка, начинающаяся с `/`, — абсолютный адрес.

Переадресация происходит **до** выбора страницы и не оставляет записи в истории: адрес сразу становится новым.

## Плавная смена страниц

Браузеры умеют анимировать смену содержимого страницы — View Transitions API: `document.startViewTransition(callback)` делает снимок до, выполняет изменения и плавно переходит к новому виду. Роутер может оборачивать в это каждую навигацию:

```ts app.config.ts
provideRouter(
  routes,
  withComponentInputBinding(),
  withViewTransitions(),
  withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
),
```

По умолчанию это плавное растворение одной страницы в другой (около четверти секунды). Анимацию настраивают в CSS через псевдоэлементы `::view-transition-old(root)` и `::view-transition-new(root)`. Если браузер API не поддерживает, роутер просто меняет страницу без анимации.

`withViewTransitions()` в Angular 22 — **developer preview**: работает, но его форма ещё может поменяться.

## Прокрутка

`withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })` делает с прокруткой то, что браузер делает для обычных сайтов: при переходе на новую страницу — наверх, а по «Назад» и «Вперёд» — туда, где страница была. Роутер запоминает позицию прокрутки для каждой записи истории. Без этой функции роутер прокрутку не трогает вовсе.

::: task
1. В `app.routes.ts` в конце карты: переадресация `'games'` → `'catalog'`, функция переадресации для `'game/:id'` и маршрут `'**'` → `NotFound` с заголовком «Страница не найдена».
2. В `app.config.ts` добавьте роутеру `withViewTransitions()` и `withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })`.
:::

## Что получилось

- `/nope` — «Нет такой страницы» с кнопкой «На главную», во вкладке «Страница не найдена — Ход конём», ошибок в консоли нет.
- `/games` — адрес сразу `/catalog`. `/game/3` — адрес `/games/3`, «Зельевары».
- Переходы между страницами плавные: старая страница растворяется, новая проявляется.
- На главной прокрутите вниз до «Хитов» и нажмите «Все по рейтингу →»: каталог открылся с самого верха. Прокрутите каталог вниз, откройте игру, нажмите ← в адресной строке превью — каталог на той же высоте, где вы его оставили.

## Эксперимент: без withInMemoryScrolling

Уберите `withInMemoryScrolling(…)` и повторите. Мы измерили: главная прокручена на 493 px, после «Все по рейтингу →» каталог открывается прокрученным на те же 493 px — роутер заменил страницу, а прокрутка документа осталась. А «Назад» со страницы игры приводит к каталогу в самом верху. Верните.

## Эксперимент: canMatch и 404

Вспомните эксперимент с `canMatch` из шага 7: с пустой корзиной адреса `/checkout` для роутера не существовало, и была ошибка NG04002. Повторите его теперь: вместо ошибки — «Нет такой страницы». Маршрут `checkout` пропущен, и адрес достался `'**'`.

::: deep Под капотом: что делает withViewTransitions
Роутер вызывает `document.startViewTransition()` на каждой навигации и выполняет внутри неё активацию маршрутов — уничтожение старой страницы и создание новой. Браузер ждёт, пока колбэк завершится, и только потом анимирует. Мы проверили, подменив `document.startViewTransition` счётчиком: три перехода — три вызова. У функции есть параметры: `skipInitialTransition` (не анимировать первую навигацию при запуске) и `onViewTransitionCreated` (получить объект перехода, например чтобы отменить анимацию для некоторых страниц).
:::
