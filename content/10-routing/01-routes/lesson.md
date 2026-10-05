---
title: Маршруты
startFrom: custom
base: 09-app-state/05-practice
baseHash: 'c63888ee91e2'
removedInStart: [cart/mini-cart/mini-cart.css, cart/mini-cart/mini-cart.html, cart/mini-cart/mini-cart.ts]
files: [main.ts, app.routes.ts, app.config.ts, app.html, app.ts, home/home.ts, home/home.html, catalog/catalog.ts, catalog/catalog.html, cart/cart-page/cart-page.ts, cart/cart-page/cart-page.html, app.css, layout/header/header.ts, layout/header/header.html, layout/header/header.css, home/home.css, catalog/catalog.css, cart/cart-page/cart-page.css, core/cart-store.ts, core/favorites-store.ts, core/promo-codes.ts, core/analytics.ts, core/shop-config.ts, shared/game-card/game-card.ts, shared/game-card/game-card.html, shared/game-card/game-card.css, shared/game-details/game-details.ts, shared/game-details/game-details.html, shared/game-details/game-details.css, shared/tabs/tabs.ts, shared/tabs/tabs.html, shared/tabs/tabs.css, shared/tabs/tab.ts, shared/tabs/tab.html, shared/countdown/countdown.ts, shared/countdown/countdown.html, shared/countdown/countdown.css, shared/now.ts, shared/price-pipe.ts, shared/players-pipe.ts, shared/duration-pipe.ts, shared/plural.ts, shared/tooltip.ts, shared/in-view.ts, shared/lazy-image.ts, shared/load-more/load-more.ts, shared/load-more/load-more.html, shared/load-more/load-more.css, shared/rating/rating.ts, shared/rating/rating.html, shared/rating/rating.css, shared/quantity/quantity.ts, shared/quantity/quantity.html, shared/quantity/quantity.css, core/models.ts, core/games-data.ts, styles.css]
focus: app.routes.ts
api: [роутер, маршрут, 'Routes', 'provideRouter()', '<router-outlet>', NG04002]
---

У «Хода конём» до сих пор одна страница. Адрес в превью всегда `/`: каталог, корзина и окно «Подробнее» живут по одному адресу. Ссылку на игру другу не отправить, кнопка «Назад» браузера уведёт с сайта, а после перезагрузки покупатель снова окажется в начале.

Эта глава — о **роутере** (router): части Angular, которая связывает адрес в браузере с тем, что показано на экране. Адрес `/catalog` — каталог, `/games/3` — страница игры, `/cart` — корзина. Переходы между страницами при этом не перезагружают документ: роутер меняет адрес через History API браузера и заменяет компонент страницы. Такое приложение называют одностраничным (single-page application, SPA) — страница одна, а адресов много.

В этой главе у магазина появятся:

- главная, каталог, корзина и страница игры вместо окна «Подробнее»;
- меню в шапке, которое показывает, где вы находитесь;
- фильтры каталога в адресе: ими можно поделиться, и они переживают перезагрузку;
- личный кабинет с разделами «Избранное» и «Заказы», который загружается только когда нужен;
- страница оформления заказа, куда не пустят с пустой корзиной;
- заголовки вкладки, страница «Нет такой страницы», плавная смена страниц;
- хлебные крошки — в практикуме.

А в конце главы посмотрим, как роутер находит страницу по адресу.

## Что изменилось в коде

Код — решение практикума главы 9, разложенное по будущим страницам:

- **Каталог — компонент `Catalog`** в `catalog/`. Это бывшее содержимое `App`: поиск, фильтры, сетка карточек, «Показать ещё», окно «Подробнее». Заголовок теперь «Каталог», стили каталога переехали из `app.css` в `catalog.css`.
- **Корзина — страница `CartPage`** в `cart/cart-page/`. Это бывшая мини-корзина: тот же код, только с заголовком «Корзина» и строкой «Корзина пуста.», когда в ней ничего нет. Папки `cart/mini-cart/` больше нет. Пока корзину не видно — для неё нет места на странице.
- **Главная — готовый компонент `Home`** в `home/`: приветствие и две подборки, «Хиты» и «Со скидкой», на тех же карточках `GameCard`.
- **`App` — каркас**: шапка и `<app-catalog />` под ней.
- Цвет заголовков `h1` и стиль ссылок — в глобальном `styles.css`, а в `header.css` — стили меню для следующего шага.
- Заготовка `app.routes.ts` и комментарии `TODO` в `app.config.ts` и `app.html`.

## Маршрут

**Маршрут** (route) — запись «по такому адресу показывать такой компонент». Список маршрутов — карта приложения — это массив типа `Routes`:

```ts app.routes.ts
import { Routes } from '@angular/router';
import { CartPage } from './cart/cart-page/cart-page';
import { Catalog } from './catalog/catalog';
import { Home } from './home/home';

// Карта магазина: какой адрес какой странице соответствует
export const routes: Routes = [
  { path: '', component: Home },
  { path: 'catalog', component: Catalog },
  { path: 'cart', component: CartPage },
];
```

`path` пишется без косой черты в начале: `'catalog'` — это адрес `/catalog`. Пустой путь `''` — корень сайта, главная.

Карту получает роутер. Роутер — тоже набор сервисов, и подключается он провайдером в `app.config.ts`, как локаль в главе 7:

```ts app.config.ts {1,2,8}
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    …
    // Роутер: карта маршрутов из app.routes.ts
    provideRouter(routes),
  ],
};
```

Осталось сказать, **куда** выводить компонент страницы. Для этого есть элемент `<router-outlet>` — директива `RouterOutlet`. В каркасе он встаёт вместо каталога:

```html app.html {3}
<app-header />
<main class="page">
  <router-outlet />
</main>
```

```ts app.ts
import { RouterOutlet } from '@angular/router';
…
@Component({
  selector: 'app-root',
  imports: [Header, RouterOutlet],
  …
})
export class App {}
```

`Catalog` из `imports` каркаса уходит: его создаёт роутер, а не шаблон `App`.

## Как роутер выбирает страницу

```
адрес /catalog
   │
   ▼
роутер: маршруты по порядку
   ''        — не подходит
   'catalog' — подходит
   │
   ▼
<router-outlet> → <app-catalog>
```

При запуске роутер читает адрес, перебирает маршруты сверху вниз и берёт первый подходящий. Компонент этого маршрута он создаёт и вставляет в DOM **сразу после** `<router-outlet>` — соседом, а не внутрь. Когда адрес меняется, роутер уничтожает старую страницу и создаёт новую на том же месте.

Почему маршрут `''` не перехватывает `/catalog` — пустой путь ведь «подходит» к началу любого адреса? Потому что маршрут подходит, только если весь адрес разобран до конца. У `''` нет дочерних маршрутов, которые разобрали бы оставшееся `catalog`, и роутер идёт дальше. Подробно сопоставление разберём в последнем шаге главы.

::: task
1. В `app.routes.ts` опишите три маршрута: `''` — `Home`, `'catalog'` — `Catalog`, `'cart'` — `CartPage`.
2. В `app.config.ts` подключите роутер: `provideRouter(routes)`.
3. В `app.html` замените `<app-catalog />` на `<router-outlet />`, в `app.ts` — `Catalog` на `RouterOutlet` в `imports`.
:::

## Что получилось

В превью — главная: «Настольные игры для всей семьи» и две подборки. Введите в адресной строке превью `/catalog` и нажмите Enter — каталог. `/cart` — корзина (если в ней что-то осталось с главы 9, позиции на месте: хранилище то же).

Адресная строка превью ведёт себя как адресная строка браузера: ввод адреса — это загрузка страницы заново. Приложение запускается с нуля, поэтому в консоли каждый раз снова «Аналитика: модуль загружен». Ссылки, которые меняют страницу без перезапуска, — в следующем шаге.

Откройте инструменты разработчика и посмотрите на `<main>`: внутри `<router-outlet>`, а сразу за ним — `<app-home>` или `<app-catalog>`.

## Эксперимент: адрес, которого нет

Введите `/abc`. На странице только шапка, а в консоли:

```
ERROR RuntimeError: NG04002: Cannot match any routes. URL Segment: 'abc'
```

Ни один маршрут не подошёл, навигация закончилась ошибкой, а адрес вернулся к `/`. Страницу «Нет такой страницы» сделаем в шаге 9.

## Эксперимент: забытые части

Уберите `<router-outlet />` из `app.html`. Под шапкой пусто — и ни одной ошибки: роутер нашёл маршрут, но выводить страницу некуда. Верните. Теперь уберите `provideRouter(routes)` из `app.config.ts`. Снова пусто и снова тихо: `<router-outlet>` есть, а роутер не запущен, и навигации не происходит вовсе. Верните.

Запомните оба случая: «пустая страница без ошибок» почти всегда значит, что одна из трёх частей — карта, `provideRouter`, `<router-outlet>` — не на месте.

## Как в настоящем проекте

- `ng new` создаёт `app.routes.ts` с пустой картой и подключает `provideRouter(routes)` в `app.config.ts` сразу — роутинг включён по умолчанию.
- Превью курса держит приложение под адресом `/app/` (элемент `<base href="/app/">`), а показывает адреса без этой приставки. В проекте CLI база — `<base href="/">` в `index.html`.
- Сервер, который отдаёт приложение, должен на **любой** адрес (`/catalog`, `/games/3`) отвечать тем же `index.html`: иначе перезагрузка страницы на `/catalog` вернёт 404 от сервера раньше, чем запустится роутер. `ng serve` делает это сам, а настройку настоящего сервера разберём в главе 20.

::: legacy Вы встретите в старом коде: RouterModule.forRoot
До standalone-приложений роутер подключали модулем:

```ts
@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
```

Это делает то же, что `provideRouter(routes)`. Модуль `AppRoutingModule` в файле `app-routing.module.ts` — верный признак проекта, созданного до Angular 17.
:::
