---
title: Параметры маршрута
startFrom: custom
removedInSolution: [shared/game-details/game-details.css, shared/game-details/game-details.html, shared/game-details/game-details.ts]
files: [main.ts, game/game-page.ts, game/game-page.html, game/game-page.css, app.routes.ts, app.config.ts, shared/game-card/game-card.html, shared/game-card/game-card.ts, catalog/catalog.ts, catalog/catalog.html, app.ts, app.html, app.css, layout/header/header.ts, layout/header/header.html, layout/header/header.css, home/home.ts, home/home.html, home/home.css, catalog/catalog.css, cart/cart-page/cart-page.ts, cart/cart-page/cart-page.html, cart/cart-page/cart-page.css, core/cart-store.ts, core/favorites-store.ts, core/promo-codes.ts, core/analytics.ts, core/shop-config.ts, shared/game-card/game-card.css, shared/game-details/game-details.ts, shared/game-details/game-details.html, shared/game-details/game-details.css, shared/tabs/tabs.ts, shared/tabs/tabs.html, shared/tabs/tabs.css, shared/tabs/tab.ts, shared/tabs/tab.html, shared/countdown/countdown.ts, shared/countdown/countdown.html, shared/countdown/countdown.css, shared/now.ts, shared/price-pipe.ts, shared/players-pipe.ts, shared/duration-pipe.ts, shared/plural.ts, shared/tooltip.ts, shared/in-view.ts, shared/lazy-image.ts, shared/load-more/load-more.ts, shared/load-more/load-more.html, shared/load-more/load-more.css, shared/rating/rating.ts, shared/rating/rating.html, shared/rating/rating.css, shared/quantity/quantity.ts, shared/quantity/quantity.html, shared/quantity/quantity.css, core/models.ts, core/games-data.ts, styles.css]
focus: game/game-page.ts
api: [параметр маршрута, ':id', 'withComponentInputBinding()', 'input.required()', numberAttribute, '[routerLink]', NG0950]
---

Окно «Подробнее» из главы 6 закрывает свою задачу, но у него нет адреса: им не поделиться, его не найдёт поисковик, а «Назад» закроет не окно, а весь каталог. Пора дать каждой игре свою страницу: `/games/1` — «Остров сокровищ», `/games/4` — «Ночной экспресс».

Страниц двенадцать, а маршрут нужен один: адрес с изменяемой частью.

В коде шага — новая папка `game/`: разметка `game-page.html` и стили `game-page.css` страницы игры готовы. Это содержимое окна «Подробнее» без `<dialog>` и кнопки «×», со ссылкой «← Каталог» сверху и запасным текстом «Игра не найдена». В `game-page.ts` — заготовка с `TODO`, в `game-card.html` — тоже.

## Параметр маршрута

```ts app.routes.ts {3}
export const routes: Routes = [
  …
  { path: 'games/:id', component: GamePage },
  …
];
```

`:id` — **параметр маршрута** (route parameter): на его месте может стоять что угодно. Адрес `/games/4` подходит к маршруту, и роутер запоминает `id = '4'`. Обратите внимание на кавычки: параметр из адреса — всегда строка.

Как странице узнать свой `id`? Самый удобный способ — **вход компонента**. Включите функцию роутера `withComponentInputBinding()`:

```ts app.config.ts
provideRouter(routes, withComponentInputBinding()),
```

Теперь роутер передаёт параметры маршрута во входы компонента страницы с тем же именем — так, будто кто-то написал `<app-game-page [id]="'4'" />`:

```ts game/game-page.ts {1-3,5-6}
// Параметр маршрута :id — во вход его кладёт роутер (withComponentInputBinding).
// Из адреса приходит строка: numberAttribute превращает её в число
readonly id = input.required({ transform: numberAttribute });

// Игра с этим id; undefined — такой игры нет
protected readonly game = computed(() => GAMES.find((game) => game.id === this.id()));
```

`numberAttribute` — то же преобразование входа, что у `Quantity` в главе 5: строка `'4'` становится числом `4`. А `/games/abc` даст `NaN`, игра не найдётся, и шаблон покажет «Игра не найдена»:

```html game/game-page.html
@if (game(); as game) {
  <a class="back-link" routerLink="/catalog">← Каталог</a>
  <div class="head">…</div>
  <app-tabs>…</app-tabs>
} @else {
  <h1>Игра не найдена</h1>
  …
}
```

Внутри `@if (game(); as game)` локальная переменная `game` — уже сама игра, без скобок: `game.title`, `cart.add(game)`. Вход обязательный (`input.required`): без `id` страница игры не имеет смысла.

## Ссылка с параметром

Название в карточке было кнопкой, которая открывала окно. Теперь это ссылка на страницу игры:

```html shared/game-card/game-card.html
<h2 class="title">
  <a class="title-link" [routerLink]="['/games', game().id]">
    {{ game().title }}
  </a>
</h2>
```

`routerLink` можно привязать к массиву — **командам**: роутер склеит части в адрес `/games/4` и сам закодирует то, что нужно закодировать. Строкой `'/games/' + game().id` тоже сработает, но массив удобнее, когда частей несколько.

Выход `open` у карточки больше не нужен, а с ним и `selectedGame`, блок `@if (selectedGame())` и `GameDetails` в каталоге. Папку `shared/game-details/` удалите целиком.

::: task
1. В `app.routes.ts` добавьте маршрут `'games/:id'` → `GamePage`, а в `app.config.ts` — `withComponentInputBinding()`.
2. В `game-page.ts`: вход `id` с `numberAttribute` и `game` — игра с этим id из `GAMES`.
3. В карточке название — ссылка `[routerLink]="['/games', game().id]"` (класс `title-link`, стили уже есть). Удалите выход `open` и добавьте `RouterLink` в `imports`.
4. В каталоге удалите всё, что относится к окну: `(open)`, `selectedGame`, блок с `<app-game-details>`, `GameDetails` в `imports`. Удалите папку `shared/game-details/`.
:::

## Что получилось

Щёлкните по названию «Ночной экспресс» в каталоге или на главной: адрес `/games/4`, большая обложка, цена, таймер скидки, «В корзину» и вкладки «Описание» / «Характеристики». «← Каталог» или кнопка ← превью возвращают назад. Введите `/games/99` — «Игра не найдена».

Корзина на странице игры та же, что везде: положите игру — шапка обновится. Страница не знает о шапке, а шапка о странице: их связывает хранилище из главы 9.

## Эксперимент: без привязки входов

Уберите `withComponentInputBinding()` и откройте `/games/4`. Страница пустая, а в консоли:

```
ERROR RuntimeError: NG0950: Input is required but no value is available yet.
```

Ошибка из главы 5: у обязательного входа нет значения. Роутер создал `GamePage`, но без этой функции он не трогает входы компонента — параметр остался внутри роутера. Верните.

::: deep Один компонент на много адресов
Перейдите с `/games/1` на `/games/3`, не уходя со страницы игры (так бывает, например, по ссылке «Похожие игры»). Маршрут тот же — `games/:id`, — поэтому роутер **не пересоздаёт** `GamePage`: он оставляет тот же экземпляр и просто кладёт во вход `id` новое значение. Мы проверили: `console.log` в конструкторе `GamePage` при таком переходе срабатывает один раз. Поэтому всё, что зависит от `id`, должно быть реактивным — `computed`, а не значение, вычисленное один раз в конструкторе. С входом-сигналом это получается само.
:::

::: legacy Вы встретите в старом коде: ActivatedRoute и paramMap
До появления `withComponentInputBinding()` параметры читали из сервиса `ActivatedRoute`, подписываясь на поток:

```ts
private readonly route = inject(ActivatedRoute);

ngOnInit() {
  this.route.paramMap.subscribe((params) => {
    this.id = Number(params.get('id'));
  });
}
```

Подписка нужна как раз из-за переиспользования компонента: `id` может смениться без пересоздания. `ActivatedRoute` никуда не делся — он пригодится в следующем шаге для навигации из кода, — но для параметров страницы вход удобнее.
:::
