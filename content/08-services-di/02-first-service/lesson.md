---
title: Первый сервис
startFrom: previous
files: [main.ts, core/cart-store.ts, app.ts, app.html, layout/header/header.ts, shared/game-card/game-card.ts, shared/game-card/game-card.html, shared/game-details/game-details.ts, shared/game-details/game-details.html, app.css, layout/header/header.html, layout/header/header.css, shared/game-card/game-card.css, shared/game-details/game-details.css, shared/tabs/tabs.ts, shared/tabs/tabs.html, shared/tabs/tabs.css, shared/tabs/tab.ts, shared/tabs/tab.html, shared/countdown/countdown.ts, shared/countdown/countdown.html, shared/countdown/countdown.css, shared/price-pipe.ts, shared/players-pipe.ts, shared/duration-pipe.ts, shared/plural.ts, shared/tooltip.ts, shared/in-view.ts, shared/lazy-image.ts, shared/load-more/load-more.ts, shared/load-more/load-more.html, shared/load-more/load-more.css, shared/rating/rating.ts, shared/rating/rating.html, shared/rating/rating.css, shared/quantity/quantity.ts, shared/quantity/quantity.html, shared/quantity/quantity.css, core/models.ts, core/games-data.ts, app.config.ts, styles.css]
focus: core/cart-store.ts
api: [сервис, '@Service()', 'inject()', "@Injectable({ providedIn: 'root' })", корневой инжектор, NG0201]
---

В прошлом шаге корзина стала одним объектом на всё приложение, но создавали его мы сами — и эффекту внутри не нашлось хозяина. Отдадим создание Angular: превратим `CartStore` в **сервис**.

## Сервис

**Сервис** (service) — класс, экземпляры которого создаёт и раздаёт DI. Обычно в сервисе живёт то, что нужно многим компонентам: общее состояние (корзина), работа с сервером, настройки. Чтобы класс стал сервисом, достаточно декоратора:

```ts core/cart-store.ts {1,5,10-15}
import { Service, computed, effect, signal } from '@angular/core';

// Корзина магазина: позиции, количество, сумма и действия с ними.
// @Service() — Angular сам создаст единственный экземпляр, когда он впервые кому-то понадобится
@Service()
export class CartStore {
  readonly items = signal<CartItem[]>([]);
  // … всё остальное без изменений

  constructor() {
    // Побочный эффект: сообщение в консоли при каждом изменении корзины
    effect(() => {
      console.log('Корзина:', this.summary() || 'пусто');
    });
  }
}
```

Строки `export const cartStore = new CartStore()` больше нет. Экземпляр создаст Angular, а компоненты попросят его функцией `inject()`:

```ts layout/header/header.ts {1,6}
import { Component, inject } from '@angular/core';
import { CartStore } from '../../core/cart-store';
…
export class Header {
  // Корзину создаёт и выдаёт Angular — та же, что у всех остальных
  protected readonly cart = inject(CartStore);
}
```

`inject(CartStore)` значит: «дай мне экземпляр `CartStore`». Сам класс здесь — ключ, по которому DI ищет зависимость. Такой ключ называют **токеном** (token). TypeScript выводит тип результата из токена: поле `cart` получает тип `CartStore` без аннотации.

`@Service()` говорит Angular две вещи:

- **как создать** экземпляр: вызвать конструктор класса;
- **где он доступен**: во всём приложении. Его выдаёт **корневой инжектор** (root injector) — инжектор, который Angular создаёт при запуске приложения из `appConfig`. Поэтому экземпляр один: шапка, `App` и все карточки получают один и тот же объект.

Создаётся экземпляр не при запуске, а при первом `inject()`. Сервис, который никто не попросил, не создаётся вовсе.

Эффект в конструкторе теперь работает. Конструктор сервиса вызывает Angular — в **контексте внедрения**, как и конструктор компонента. Эффект знает, что принадлежит сервису, и проживёт столько же, сколько сервис. Это корневой эффект (глава 3): он не привязан к проверке какого-то компонента.

::: tip @Service() — новое в Angular 22
`@Service()` появился в Angular 22. В большинстве проектов и статей вы увидите то же самое, записанное старым декоратором:

```ts
@Injectable({ providedIn: 'root' })
export class CartStore { … }
```

Для класса с `inject()` в полях эти записи равнозначны: оба декоратора делают класс доступным во всём приложении. `@Injectable` никуда не делся и не устарел. Курс пишет `@Service()`: короче и именно его создаёт `ng generate service` в Angular 22.
:::

## Карточка берёт корзину сама

Теперь не нужен и курьер. Карточке больше не надо, чтобы `App` сообщал ей количество и слушал её «В корзину», — она возьмёт корзину сама:

```ts shared/game-card/game-card.ts {5-8}
export class GameCard {
  readonly game = input.required<Game>();
  readonly open = output();

  // Корзина — общая для всего магазина: карточка сама кладёт в неё игру
  protected readonly cart = inject(CartStore);
  // Сколько штук этой игры уже в корзине
  protected readonly inCart = computed(() => this.cart.quantityOf(this.game()));
  …
}
```

```html shared/game-card/game-card.html
<button class="button" [disabled]="inCart() >= game().inStock" (click)="cart.add(game())">В корзину</button>
```

Вход `inCart` и выход `add` исчезли, а `inCart` стал `computed`: шаблон карточки его не заметил — он и раньше вызывал `inCart()`. В `App` привязки к карточке стали короче:

```html app.html
<app-game-card [game]="game" (open)="selectedGame.set(game)">
```

Выход `open` остался: какую игру открыть в окне, решает `App`, и это не общее состояние магазина.

::: task
1. Сделайте `CartStore` сервисом: декоратор `@Service()`, а строку с `cartStore` удалите. Перенесите эффект с журналом корзины из `App` в конструктор `CartStore`.
2. В `App` и `Header` получите корзину через `inject(CartStore)`.
3. В `GameCard` уберите вход `inCart` и выход `add`: карточка получает корзину через `inject()`, `inCart` — `computed`, «В корзину» вызывает `cart.add(game())`. То же в `GameDetails`. В `app.html` уберите `[inCart]` и `(add)` у карточек и у окна.
:::

## Что получилось

Магазин работает как прежде, но `App` больше не посредник. Откройте «Подробнее» у «Драконьей почты» и нажмите «В корзину» в окне: шапка — «В корзине: 1 · 1 290 ₽», в окне и в карточке под ним — «В корзине: 1 шт.», в мини-корзине появилась строка. Окно, карточка, шапка и мини-корзина ничего не знают друг о друге — они получили один и тот же `CartStore`.

## Эксперимент: сколько экземпляров

Добавьте первой строкой в конструктор `CartStore`:

```ts
console.log('CartStore: создан экземпляр');
```

Корзину просят `App`, шапка и шесть карточек, а строка в консоли одна — перед «Корзина: пусто». Откройте окно «Подробнее»: новых строк нет, окно получило уже готовый экземпляр. Уберите строку.

## Эксперимент: без декоратора

Удалите `@Service()`. Превью пустое, а в консоли:

```
ERROR ɵNotFound: NG0201: No provider found for `CartStore`. Source: Environment Injector.
```

**NG0201** — «нет провайдера»: инжектор не знает, как получить `CartStore`. Без декоратора это обычный класс, и Angular не станет создавать его сам. «Environment Injector» — так называется корневой инжектор, до которого дошёл поиск. Эту ошибку вы будете встречать часто; в последнем шаге главы разберём, как именно ищется зависимость. Верните декоратор.

## Компонент со своим знанием о магазине

Раньше `GameCard` получала всё входами и годилась для любого места, где есть игра. Теперь она знает про корзину магазина. Это осознанный выбор: карточка игры в магазине всегда кладёт игру в корзину, и посредник ей только мешал. А вот `Rating` и `Quantity` по-прежнему работают только через входы и выходы: звёзды и «− N +» ничего не знают о магазине и подойдут где угодно. Хорошее правило: общие маленькие компоненты (`shared/`) получают данные входами, а части конкретного экрана могут брать сервисы сами.

::: tip Как в настоящем проекте
`ng generate service core/cart-store` создаёт файл `core/cart-store.ts` с классом `CartStore` и декоратором `@Service()`, а рядом — тест `cart-store.spec.ts`. С флагом `--injectable` получится старая запись `@Injectable({ providedIn: 'root' })`. Суффикса `.service` в имени файла и `Service` в имени класса в Angular 22 нет: класс называют по смыслу — `CartStore`, `GamesApi`, `AuthStore`.
:::

::: legacy Вы встретите в старом коде: зависимости в конструкторе
До появления `inject()` зависимости объявляли параметрами конструктора:

```ts
export class Header {
  constructor(protected readonly cart: CartStore) {}
}
```

Angular смотрит на типы параметров и передаёт экземпляры. Это работает и в Angular 22, но руководство по стилю (angular.dev/style-guide) советует `inject()`: его легче читать, когда зависимостей много, к каждой проще написать комментарий, тип выводится лучше, а поле, которое читает зависимость, можно объявить и сразу инициализировать — с параметром конструктора в современном TypeScript (`useDefineForClassFields`) такое поле пришлось бы заполнять в теле конструктора.
:::
