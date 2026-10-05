---
title: Гарды
startFrom: custom
files: [main.ts, checkout/checkout-guards.ts, app.routes.ts, checkout/checkout.ts, checkout/checkout.html, cart/cart-page/cart-page.html, app.config.ts, app.ts, app.html, app.css, layout/header/header.ts, layout/header/header.html, layout/header/header.css, home/home.ts, home/home.html, home/home.css, catalog/catalog.ts, catalog/catalog.html, catalog/catalog.css, game/game-page.ts, game/game-page.html, game/game-page.css, cart/cart-page/cart-page.ts, cart/cart-page/cart-page.css, checkout/checkout.css, account/account.routes.ts, account/account.ts, account/account.html, account/account.css, account/favorites-page/favorites-page.ts, account/favorites-page/favorites-page.html, account/orders-page/orders-page.ts, account/orders-page/orders-page.html, core/cart-store.ts, core/favorites-store.ts, core/promo-codes.ts, core/analytics.ts, core/shop-config.ts, shared/game-card/game-card.ts, shared/game-card/game-card.html, shared/game-card/game-card.css, shared/tabs/tabs.ts, shared/tabs/tabs.html, shared/tabs/tabs.css, shared/tabs/tab.ts, shared/tabs/tab.html, shared/countdown/countdown.ts, shared/countdown/countdown.html, shared/countdown/countdown.css, shared/now.ts, shared/price-pipe.ts, shared/players-pipe.ts, shared/duration-pipe.ts, shared/plural.ts, shared/tooltip.ts, shared/in-view.ts, shared/lazy-image.ts, shared/load-more/load-more.ts, shared/load-more/load-more.html, shared/load-more/load-more.css, shared/rating/rating.ts, shared/rating/rating.html, shared/rating/rating.css, shared/quantity/quantity.ts, shared/quantity/quantity.html, shared/quantity/quantity.css, core/models.ts, core/games-data.ts, styles.css]
url: /cart
focus: checkout/checkout-guards.ts
api: [гард, CanActivateFn, CanDeactivateFn, CanMatchFn, UrlTree, 'Router.createUrlTree()', 'confirm()']
---

У корзины появится кнопка «Оформить заказ», а у магазина — страница `/checkout`. Сама форма заказа — в главе 13, а пока на странице сводка и поле «Комментарий к заказу». Но уже сейчас у страницы два правила:

- оформлять нечего, если корзина пуста. Кто откроет `/checkout` с пустой корзиной (по старой ссылке или набрав адрес), должен попасть в корзину;
- покупатель начал писать комментарий и ушёл со страницы — комментарий пропадёт. Надо спросить, точно ли он хочет уйти.

Оба правила — про **переход**: пускать ли на страницу и отпускать ли с неё. Такие проверки в роутере называются **гардами** (guards).

В коде шага — готовая страница `checkout/` (компонент `Checkout`), заготовка `checkout/checkout-guards.ts` и комментарии `TODO` в `app.routes.ts` и `cart-page.html`. У `Checkout` есть открытый метод `hasUnsavedChanges()`: есть ли в поле комментарий.

## Гард входа

Гард — функция, которую роутер вызывает во время навигации. Гард входа имеет тип **`CanActivateFn`**:

```ts checkout/checkout-guards.ts
// Оформлять нечего, если корзина пуста: вместо оформления — страница корзины
export const cartNotEmptyGuard: CanActivateFn = () => {
  const cart = inject(CartStore);
  const router = inject(Router);
  return cart.items().length > 0 || router.createUrlTree(['/cart']);
};
```

Что может вернуть гард:

- `true` — переход разрешён;
- `false` — переход отменён, покупатель остаётся там, где был;
- **`UrlTree`** — разобранный адрес, который строит `router.createUrlTree([…])` (те же команды, что у `routerLink`). Роутер отменяет текущий переход и начинает новый — туда. Это переадресация;
- промис или `Observable` с одним из этих значений — если для ответа нужно подождать, например спросить сервер.

Гард выполняется в контексте внедрения (глава 8), поэтому внутри работает `inject()`: корзина, роутер — что угодно из DI.

## Гард выхода

Гард выхода — **`CanDeactivateFn<T>`**, где `T` — компонент страницы, которую покидают. Роутер передаёт сам экземпляр компонента первым аргументом:

```ts checkout/checkout-guards.ts
// Уходят со страницы с недописанным комментарием — спросить. false отменяет переход
export const unsavedCommentGuard: CanDeactivateFn<Checkout> = (checkout) =>
  !checkout.hasUnsavedChanges() || confirm('Комментарий к заказу не сохранится. Уйти со страницы?');
```

`confirm()` — встроенное окно браузера с кнопками «ОК» и «Отмена»: оно возвращает `true` или `false`, ровно то, что нужно гарду. Для учебного магазина этого достаточно; в настоящем — вместо `confirm()` показывают своё окно и возвращают промис с ответом.

## Гарды в маршруте

```ts app.routes.ts
{
  path: 'checkout',
  component: Checkout,
  // Пустить на страницу? Спрашивает гард перед переходом
  canActivate: [cartNotEmptyGuard],
  // Отпустить со страницы? Спрашивает гард перед уходом
  canDeactivate: [unsavedCommentGuard],
},
```

Гарды — массивы: их может быть несколько, и переход состоится, только если все согласны.

В корзине — ссылка на оформление, перед «Очистить корзину»:

```html cart/cart-page/cart-page.html
<a class="button" routerLink="/checkout">Оформить заказ</a>
```

::: task
1. В `checkout/checkout-guards.ts` напишите `cartNotEmptyGuard` (`CanActivateFn`: пустая корзина — `UrlTree` на `/cart`) и `unsavedCommentGuard` (`CanDeactivateFn<Checkout>`: есть несохранённое — спросить через `confirm()`).
2. В `app.routes.ts` добавьте маршрут `'checkout'` → `Checkout` с обоими гардами.
3. В корзине — ссылка-кнопка «Оформить заказ».
:::

## Что получилось

Шаг открывается на `/cart`. Если корзина пуста, введите в адресной строке `/checkout` — адрес сразу станет `/cart`: гард не пустил и переадресовал. Положите игру в корзину и нажмите «Оформить заказ» — страница оформления: «Товаров: 1 шт. на 1 990 ₽, к оплате 2 380 ₽.» (если это «Остров сокровищ»).

Напишите в комментарии «Позвонить заранее» и щёлкните «Каталог» в меню. Браузер спрашивает: «Комментарий к заказу не сохранится. Уйти со страницы?». «Отмена» — вы остались на `/checkout`, комментарий на месте. Щёлкните ещё раз и нажмите «ОК» — каталог. Со стёртым комментарием гард отпускает без вопросов.

Гард выхода срабатывает только при навигации **внутри приложения**. Закрытие вкладки или перезагрузка — дело браузера, а не роутера: для них есть событие `beforeunload`.

## Эксперимент: canMatch

Есть ещё один гард — **`CanMatchFn`**. Он срабатывает раньше всех: когда роутер только **подбирает** маршрут. Если он ответил `false`, маршрут пропускается, будто его нет в карте, и роутер пробует следующие. Замените в маршруте `checkout` гард входа простым `canMatch`:

```ts app.routes.ts
canMatch: [() => inject(CartStore).items().length > 0],
```

(добавьте импорты `inject` из `@angular/core` и `CartStore`). Очистите корзину и введите `/checkout`:

```
ERROR RuntimeError: NG04002: Cannot match any routes. URL Segment: 'checkout'
```

Маршрут `checkout` пропущен, а других подходящих нет — та же ошибка, что для `/abc` в шаге 1. С пустой корзиной адреса `/checkout` для роутера просто не существует. Если вернуть из `canMatch` не `false`, а `UrlTree`, — будет такая же переадресация на `/cart`, как у `canActivate`.

`canMatch` полезен, когда у одного адреса несколько вариантов: например, `/admin` для администратора — панель, а для остальных — следующий маршрут с той же страницей «Нет доступа». Верните `canActivate`.

::: legacy Вы встретите в старом коде: классы-гарды
Раньше гарды были классами с интерфейсами `CanActivate`, `CanDeactivate<T>`:

```ts
@Injectable({ providedIn: 'root' })
export class CartNotEmptyGuard implements CanActivate {
  constructor(private cart: CartService, private router: Router) {}
  canActivate(): boolean | UrlTree {
    return this.cart.items.length > 0 || this.router.createUrlTree(['/cart']);
  }
}
```

и в маршруте писали `canActivate: [CartNotEmptyGuard]`. Передавать в маршрут класс или токен вместо функции в Angular 22 — устаревший способ (тип `DeprecatedGuard`). Старый класс-гард можно вызвать из функции: `canActivate: [() => inject(CartNotEmptyGuard).canActivate()]`. Устарел и гард `canLoad` для ленивых маршрутов — вместо него `canMatch`.
:::
