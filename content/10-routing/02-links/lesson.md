---
title: Ссылки
startFrom: custom
files: [main.ts, layout/header/header.html, layout/header/header.ts, layout/header/header.css, home/home.html, home/home.ts, cart/cart-page/cart-page.html, cart/cart-page/cart-page.ts, app.routes.ts, app.config.ts, app.ts, app.html, app.css, home/home.css, catalog/catalog.ts, catalog/catalog.html, catalog/catalog.css, cart/cart-page/cart-page.css, core/cart-store.ts, core/favorites-store.ts, core/promo-codes.ts, core/analytics.ts, core/shop-config.ts, shared/game-card/game-card.ts, shared/game-card/game-card.html, shared/game-card/game-card.css, shared/game-details/game-details.ts, shared/game-details/game-details.html, shared/game-details/game-details.css, shared/tabs/tabs.ts, shared/tabs/tabs.html, shared/tabs/tabs.css, shared/tabs/tab.ts, shared/tabs/tab.html, shared/countdown/countdown.ts, shared/countdown/countdown.html, shared/countdown/countdown.css, shared/now.ts, shared/price-pipe.ts, shared/players-pipe.ts, shared/duration-pipe.ts, shared/plural.ts, shared/tooltip.ts, shared/in-view.ts, shared/lazy-image.ts, shared/load-more/load-more.ts, shared/load-more/load-more.html, shared/load-more/load-more.css, shared/rating/rating.ts, shared/rating/rating.html, shared/rating/rating.css, shared/quantity/quantity.ts, shared/quantity/quantity.html, shared/quantity/quantity.css, core/models.ts, core/games-data.ts, styles.css]
focus: layout/header/header.html
api: [routerLink, routerLinkActive, routerLinkActiveOptions, ariaCurrentWhenActive, aria-current]
---

Страницы есть, но попасть на них можно только набрав адрес. А набранный адрес — это перезапуск приложения. Покупатель ходит по ссылкам: логотип ведёт на главную, меню — в каталог, сводка корзины в шапке — в корзину. Сделаем эти ссылки.

В коде шага — комментарии `TODO` в `header.html`, `home.html` и `cart-page.html`. Стили меню уже лежат в `header.css`.

## Почему не href

Обычная ссылка `<a href="/catalog">` заставит браузер загрузить документ заново: запрос к серверу, новый запуск приложения, потерянное состояние интерфейса — набранная строка поиска, открытая вкладка. Нам нужна ссылка, которая меняет адрес и страницу, но не документ.

Это директива **`RouterLink`**:

```html
<a routerLink="/catalog">Каталог</a>
```

Она делает две вещи. Во-первых, вычисляет и ставит `href` — у ссылки есть настоящий адрес: его видно при наведении, его можно скопировать или открыть в новой вкладке. Во-вторых, перехватывает обычный щелчок и вместо загрузки документа просит роутер перейти: роутер меняет адрес через History API и подменяет страницу в `<router-outlet>`.

## Где я сейчас

В меню хорошо бы подсвечивать текущую страницу. Это делает директива **`RouterLinkActive`**: пока адрес совпадает с адресом ссылки, она ставит элементу указанный класс:

```html layout/header/header.html
<header class="header">
  <a class="logo" routerLink="/">♞ Ход конём</a>
  <nav class="nav">
    <a
      routerLink="/"
      routerLinkActive="active"
      [routerLinkActiveOptions]="{ exact: true }"
      ariaCurrentWhenActive="page"
      >Главная</a
    >
    <a routerLink="/catalog" routerLinkActive="active" ariaCurrentWhenActive="page">Каталог</a>
  </nav>
  <span class="favorites" title="Избранное">♥ {{ favorites.count() }}</span>
  <a class="cart" routerLink="/cart" routerLinkActive="active" ariaCurrentWhenActive="page"
    >В корзине: {{ cart.count() }} · {{ cart.subtotal() | price }}</a
  >
</header>
```

- `routerLinkActive="active"` — какой класс ставить. Стиль `.active` уже в `header.css`: подчёркивание и полная яркость.
- `[routerLinkActiveOptions]="{ exact: true }"` — для ссылки на главную. По умолчанию ссылка активна, если адрес **начинается** с её адреса: так «Каталог» остаётся подсвеченным и на `/catalog?sort=cheap`. Но с `/` начинается любой адрес, и без `exact` «Главная» горела бы всегда.
- `ariaCurrentWhenActive="page"` — у активной ссылки появится атрибут `aria-current="page"`. Экранный диктор прочитает «текущая страница»: класс `active` видят только глаза.

Обе директивы надо добавить в `imports` шапки:

```ts layout/header/header.ts
import { RouterLink, RouterLinkActive } from '@angular/router';
…
  imports: [PricePipe, RouterLink, RouterLinkActive],
```

Ссылки на главной и в пустой корзине устроены так же — без подсветки, им хватает `RouterLink`:

```html home/home.html
<a class="button" routerLink="/catalog">Весь каталог</a>
```

```html cart/cart-page/cart-page.html
<p class="muted">Корзина пуста. <a routerLink="/catalog">Перейти в каталог</a></p>
```

Класс `.button` у ссылки — тот же, что у кнопок: в `styles.css` для `a.button` добавлено только `display: inline-block` и отмена подчёркивания.

::: task
1. В шапке: логотип — ссылка на главную, меню `<nav class="nav">` со ссылками «Главная» и «Каталог», сводка корзины — ссылка на `/cart` (`<a class="cart">`). У ссылок меню и корзины — `routerLinkActive="active"` и `ariaCurrentWhenActive="page"`, у «Главной» ещё и `exact`.
2. На главной в приветствии — ссылка-кнопка «Весь каталог» (`<a class="button">`).
3. В пустой корзине — ссылка «Перейти в каталог».
4. Не забудьте `RouterLink` (и в шапке `RouterLinkActive`) в `imports` трёх компонентов.
:::

## Что получилось

Под логотипом — меню, «Главная» подчёркнута. Нажмите «Весь каталог»: адрес `/catalog`, подчёркнут «Каталог». Щёлкните сводку корзины — она подчёркнута, адрес `/cart`. Теперь кнопки ← и → в адресной строке превью работают как в браузере: ходят по истории переходов.

Посмотрите на консоль: при переходах по ссылкам строки «Аналитика: модуль загружен» больше не появляются. Приложение не перезапускается — роутер только меняет страницу.

В инструментах разработчика у логотипа `href="/app/"`: `RouterLink` строит адрес с учётом `<base href>`, а в превью приложение живёт под `/app/` (шаг 1). В проекте CLI будет `href="/"`.

## Эксперимент: без exact

Уберите `[routerLinkActiveOptions]="{ exact: true }"` у «Главной» и перейдите в каталог. Подчёркнуты обе ссылки, и у обеих `aria-current="page"`. Верните.

::: deep Под капотом: щелчок по routerLink
У `RouterLink` на `<a>` есть слушатель `click` на хосте. Он смотрит на кнопку мыши и клавиши: средняя кнопка, Ctrl, Shift, Alt или Cmd, а также `target="_blank"` — и директива ничего не делает, браузер поступает со ссылкой как обычно (например, открывает новую вкладку по `href`). Обычный щелчок директива превращает в `router.navigateByUrl(…)` и возвращает из обработчика `false` — Angular отменяет действие браузера по умолчанию, документ не загружается.

`routerLink` можно поставить и не на ссылку, например на `<button>`. Тогда `href` не будет, директива сделает элемент доступным с клавиатуры (`tabindex="0"`), но для навигации лучше всё же `<a>`: только у ссылки есть адрес, который можно открыть в новой вкладке.
:::

::: tip Если вы знаете React или Vue
`routerLink` — то же, что `<Link to>` в React Router или `<RouterLink to>` во Vue Router, а `routerLinkActive` — как `NavLink` с классом активной ссылки. Разница в форме: в Angular это директивы на обычном `<a>`, а не отдельные компоненты.
:::
