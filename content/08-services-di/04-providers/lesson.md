---
title: Провайдеры
startFrom: custom
files: [main.ts, core/demo-cart-store.ts, app.config.ts, core/cart-store.ts, app.ts, app.html, app.css, layout/header/header.ts, layout/header/header.html, layout/header/header.css, shared/game-card/game-card.ts, shared/game-card/game-card.html, shared/game-card/game-card.css, shared/game-details/game-details.ts, shared/game-details/game-details.html, shared/game-details/game-details.css, shared/tabs/tabs.ts, shared/tabs/tabs.html, shared/tabs/tabs.css, shared/tabs/tab.ts, shared/tabs/tab.html, shared/countdown/countdown.ts, shared/countdown/countdown.html, shared/countdown/countdown.css, shared/now.ts, shared/price-pipe.ts, shared/players-pipe.ts, shared/duration-pipe.ts, shared/plural.ts, shared/tooltip.ts, shared/in-view.ts, shared/lazy-image.ts, shared/load-more/load-more.ts, shared/load-more/load-more.html, shared/load-more/load-more.css, shared/rating/rating.ts, shared/rating/rating.html, shared/rating/rating.css, shared/quantity/quantity.ts, shared/quantity/quantity.html, shared/quantity/quantity.css, core/models.ts, core/games-data.ts, styles.css]
focus: core/demo-cart-store.ts
api: [провайдер, useClass, useValue, useFactory, useExisting, 'autoProvided: false', isDevMode]
---

Магазин нужно показать заказчику, и пустая корзина в шапке выглядит скучно. Хочется, чтобы при запуске в корзине уже лежали игры. Будь корзина глобальной переменной, пришлось бы править каждый `import`. С DI достаточно одной строки в конфигурации приложения: сказать инжектору «кто попросит `CartStore`, выдавай другую корзину».

## Провайдер

Как получить зависимость, инжектор узнаёт из **провайдера** (provider). Полная запись провайдера — объект с двумя частями: **что** просят (`provide` — токен) и **как** это получить:

```ts
{ provide: LOCALE_ID, useValue: 'ru' }        // выдать готовое значение
{ provide: CartStore, useClass: DemoCartStore } // создать экземпляр другого класса
```

Провайдеры приложения перечислены в `appConfig.providers`: из них Angular строит корневой инжектор. `@Service()` — тоже провайдер, только записанный на самом классе: «по умолчанию выдавай экземпляр этого класса во всём приложении». Провайдер в `appConfig` важнее значения по умолчанию: если для токена есть запись в конфигурации, инжектор возьмёт её.

Способов «как» четыре:

| Запись | Что выдаёт инжектор |
|---|---|
| `useClass: X` | экземпляр класса `X`, созданный в контексте внедрения |
| `useValue: v` | готовое значение `v` как есть |
| `useFactory: () => …` | то, что вернула функция; она выполняется в контексте внедрения |
| `useExisting: Y` | то же, что выдают по токену `Y`, — второе имя для существующей зависимости |

В любом случае значение создаётся один раз — при первом запросе — и дальше выдаётся тот же объект.

## Демо-корзина

Демо-корзина умеет всё то же, что обычная, только начинает не с пустого массива. Проще всего — наследник:

```ts core/demo-cart-store.ts
import { Service } from '@angular/core';
import { CartStore } from './cart-store';
import { GAMES } from './games-data';

// Корзина для показа магазина: при запуске в ней уже лежат игры.
// autoProvided: false — сама по себе в DI не попадает, её подставляет провайдер в app.config.ts
@Service({ autoProvided: false })
export class DemoCartStore extends CartStore {
  constructor() {
    super();
    this.items.set([
      { game: GAMES[0], quantity: 2 },
      { game: GAMES[4], quantity: 1 },
    ]);
  }
}
```

```ts app.config.ts {4-5}
providers: [
  provideBrowserGlobalErrorListeners(),
  { provide: LOCALE_ID, useValue: 'ru' },
  // Кто попросит CartStore, получит DemoCartStore — корзину с играми для показа магазина
  { provide: CartStore, useClass: DemoCartStore },
],
```

Декоратор у `DemoCartStore` нужен, чтобы Angular умел создавать этот класс. Но выдавать его всем, кто попросит `DemoCartStore`, не нужно: демо-корзина — только замена для `CartStore`. Это и значит `autoProvided: false`: класс — сервис, но в DI он попадает, только если его явно указать в провайдерах.

Компоненты не изменились ни на строку: они по-прежнему просят `CartStore` и не знают, что получают наследника.

::: task
1. В `core/demo-cart-store.ts` напишите `DemoCartStore` — наследника `CartStore` с декоратором `@Service({ autoProvided: false })`. В конструкторе положите в корзину две «Острова сокровищ» (`GAMES[0]`) и одну «Тихую охоту» (`GAMES[4]`).
2. В `app.config.ts` добавьте провайдер: по токену `CartStore` — класс `DemoCartStore`.
:::

## Что получилось

Сразу после запуска в шапке «В корзине: 3 · 4 870 ₽», в мини-корзине две строки и «До бесплатной доставки: 130 ₽», на карточках «Острова сокровищ» и «Тихой охоты» — «В корзине: 2 шт.» и «1 шт.». В консоли первой строкой — «Корзина: Остров сокровищ × 2, Тихая охота × 1»: эффект унаследован от `CartStore` и работает. Демо-корзина останется до конца главы — с ней нагляднее. Чтобы начать с пустой корзины, достаточно убрать строку провайдера.

## Эксперимент: useFactory

Выдавать демо-корзину стоит только во время разработки, а покупателям — обычную. Решение «какую корзину создать» — работа для фабрики:

```ts app.config.ts
{ provide: CartStore, useFactory: () => (isDevMode() ? new DemoCartStore() : new CartStore()) },
```

`isDevMode()` (добавьте его в импорт из `@angular/core`) возвращает `true` в режиме разработки — а превью всегда работает в нём, поэтому в корзине снова две игры. Обратите внимание на `new` внутри фабрики. В шаге 1 `new CartStore()` ломал эффект, а здесь — нет: фабрику вызывает инжектор, в контексте внедрения, и эффект в конструкторе находит хозяина.

## Эксперимент: useValue

А если создать корзину прямо в конфигурации?

```ts app.config.ts
{ provide: CartStore, useValue: new DemoCartStore() },
```

```
Error: NG0203: effect() can only be used within an injection context …
```

Та же ошибка, что в шаге 1. `useValue` получает объект, созданный ещё при загрузке `app.config.ts`, — снова вне Angular. `useValue` хорош для простых значений: строк, чисел, объектов настроек (следующий шаг). Верните `useClass`.

## Эксперимент: autoProvided: false

Попросите демо-корзину по её собственному имени — добавьте в `Header` поле:

```ts layout/header/header.ts
private readonly demo = inject(DemoCartStore);
```

```
ERROR ɵNotFound: NG0201: No provider found for `DemoCartStore`. Source: Environment Injector.
```

Провайдер в `app.config.ts` знает только токен `CartStore`. Сам `DemoCartStore` в DI не попал — ровно этого мы и хотели от `autoProvided: false`.

## Эксперимент: useClass или useExisting

Добавьте `DemoCartStore` в провайдеры отдельной строкой — теперь его можно получить и по своему имени:

```ts app.config.ts
DemoCartStore,
{ provide: CartStore, useClass: DemoCartStore },
```

Класс без объекта в списке — короткая запись для `{ provide: DemoCartStore, useClass: DemoCartStore }`. А в конструктор `Header` добавьте проверку:

```ts layout/header/header.ts
constructor() {
  console.log('один и тот же?', this.cart === inject(DemoCartStore));
}
```

В консоли `один и тот же? false`, а журнал «Корзина: …» напечатан дважды: две записи с `useClass` — два разных экземпляра. Положите игру в корзину — шапка обновится, а экземпляр, полученный по имени `DemoCartStore`, о ней не узнает.

Замените `useClass` на `useExisting`:

```ts app.config.ts
DemoCartStore,
{ provide: CartStore, useExisting: DemoCartStore },
```

Теперь `один и тот же? true` и один журнал. `useExisting` ничего не создаёт: «по токену `CartStore` выдай то, что выдаёшь по `DemoCartStore`». Так дают зависимости второе имя. Уберите эксперимент: верните одну строку `{ provide: CartStore, useClass: DemoCartStore }`.

::: warning Наследник без декоратора
Если убрать `@Service({ autoProvided: false })` у `DemoCartStore`, корзина работает, но в консоли предупреждение:

```
DEPRECATED: DI is instantiating a token "DemoCartStore" that inherits its @Injectable decorator but does not provide one itself.
This will become an error in a future version of Angular.
```

Angular пока умеет создать класс по декоратору родителя, но в будущих версиях это станет ошибкой. Класс, который создаёт DI, должен иметь свой декоратор.
:::

::: tip Как в настоящем проекте
Подменяют не только свои сервисы, но и сервисы Angular: например, `{ provide: ErrorHandler, useClass: ShopErrorHandler }` — свой обработчик ошибок, который отправляет их на сервер. А функции вида `provideBrowserGlobalErrorListeners()`, `provideRouter()`, `provideHttpClient()` (главы 10 и 11) возвращают готовые наборы провайдеров: так библиотека одной строкой регистрирует всё, что ей нужно.
:::
