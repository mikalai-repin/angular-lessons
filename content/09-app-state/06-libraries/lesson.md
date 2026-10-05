---
title: Когда нужна библиотека
startFrom: previous
files: [main.ts, core/cart-store.ts, core/favorites-store.ts, core/promo-codes.ts, app.ts, app.html, app.css, cart/mini-cart/mini-cart.ts, cart/mini-cart/mini-cart.html, cart/mini-cart/mini-cart.css, layout/header/header.ts, layout/header/header.html, layout/header/header.css, core/analytics.ts, core/shop-config.ts, shared/game-card/game-card.ts, shared/game-card/game-card.html, shared/game-card/game-card.css, shared/game-details/game-details.ts, shared/game-details/game-details.html, shared/game-details/game-details.css, shared/tabs/tabs.ts, shared/tabs/tabs.html, shared/tabs/tabs.css, shared/tabs/tab.ts, shared/tabs/tab.html, shared/countdown/countdown.ts, shared/countdown/countdown.html, shared/countdown/countdown.css, shared/now.ts, shared/price-pipe.ts, shared/players-pipe.ts, shared/duration-pipe.ts, shared/plural.ts, shared/tooltip.ts, shared/in-view.ts, shared/lazy-image.ts, shared/load-more/load-more.ts, shared/load-more/load-more.html, shared/load-more/load-more.css, shared/rating/rating.ts, shared/rating/rating.html, shared/rating/rating.css, shared/quantity/quantity.ts, shared/quantity/quantity.html, shared/quantity/quantity.css, core/models.ts, core/games-data.ts, app.config.ts, styles.css]
noSolution: true
focus: core/cart-store.ts
api: [управление состоянием, NgRx, Signal Store, 'signalStore()', 'patchState()', серверное состояние]
---

В Angular-проектах часто встречается фраза «для состояния возьмём NgRx». В этой главе мы обошлись без библиотеки: сервис, сигналы, `computed`, `effect` и `linkedSignal`. Шаг без задания — поговорим о том, где проходит граница и что именно библиотека добавляет. Подробно NgRx — в главе 18.

## Что у нас получилось

Посмотрите на `core/cart-store.ts` целиком. В нём есть всё, из чего состоит любое хранилище состояния:

| Часть | В `CartStore` |
|---|---|
| состояние | закрытые `state` и `promoState` |
| чтение | `items`, `promo` (`asReadonly()`), `count`, `subtotal`, `total`… (`computed`) |
| действия | `add`, `setQuantity`, `remove`, `clear`, `applyPromo`, `removePromo` |
| правила | склад в `add`/`setQuantity`/`loadCart`, порог промокода в `linkedSignal` |
| побочные эффекты | журнал, `localStorage`, аналитика |
| доступ | один экземпляр на приложение через DI (`@Service()`) |

Всё это — средства самого Angular, без единой зависимости. Для многих приложений такого хранилища хватает, и в «Ходе конём» мы останемся на нём до главы 18.

## Состояние бывает разное

Прежде чем выбирать библиотеку, полезно понять, о каком состоянии речь. Часто «нам нужно управление состоянием» на самом деле значит одно из трёх:

- **Состояние приложения** — то, что создаёт сам покупатель: корзина, избранное, черновик формы. Ему место в хранилище. Эта глава — о нём.
- **Данные сервера** — каталог, страница игры, отзывы, заказы. Их хозяин — сервер, а приложение держит копию: загружает, показывает загрузку и ошибки, отменяет устаревшие запросы, обновляет. Это задача `httpResource` и `resource` (глава 11), а не хранилища. Если складывать ответы сервера в хранилище руками, оно быстро превращается в самодельный кэш.
- **Состояние в адресе** — строка поиска, фильтры, номер страницы каталога. Если оно в URL, ссылкой можно поделиться, а кнопка «Назад» работает. Это роутер (главы 10–11).

Когда каждое лежит на своём месте, состояния приложения обычно остаётся немного — и сервисов на сигналах для него достаточно.

## Что добавляет библиотека

Самая известная библиотека состояния в мире Angular — **NgRx**. В ней два основных пакета.

**Signal Store** (`@ngrx/signals`) — хранилище на тех же сигналах Angular, собранное из готовых частей. Вот наша корзина (без промокода и склада) в его записи — для сравнения, писать её не нужно:

```ts
import { computed, effect } from '@angular/core';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';

export const CartStore = signalStore(
  { providedIn: 'root' },
  // Состояние: снаружи только чтение
  withState({ items: [] as readonly CartItem[] }),
  // Производное состояние
  withComputed(({ items }) => ({
    count: computed(() => items().reduce((sum, item) => sum + item.quantity, 0)),
    subtotal: computed(() => items().reduce((sum, item) => sum + item.game.price * item.quantity, 0)),
  })),
  // Действия: менять состояние можно только здесь
  withMethods((store) => ({
    add(game: Game) {
      patchState(store, ({ items }) => ({
        items: items.some((item) => item.game.id === game.id)
          ? items.map((item) => (item.game.id === game.id ? { ...item, quantity: item.quantity + 1 } : item))
          : [...items, { game, quantity: 1 }],
      }));
    },
    clear() {
      patchState(store, { items: [] });
    },
  })),
  // Побочные эффекты при создании хранилища
  withHooks({
    onInit(store) {
      effect(() => console.log('Корзина:', store.count()));
    },
  }),
);
```

Узнаёте? `withState` — наш закрытый `signal`, `withComputed` — `computed`, `withMethods` — действия, `patchState` — `state.update`. Компонент получает это хранилище так же: `inject(CartStore)`, `cart.items()`, `cart.add(game)`. А `patchState(cart, …)` снаружи хранилища TypeScript не пропустит — состояние по умолчанию закрыто (`protectedState`), ровно как мы сделали в шаге 1. Сверх этого Signal Store даёт готовые расширения: коллекции сущностей (`withEntities`), асинхронные действия на RxJS (`rxMethod`), события (`@ngrx/signals/events`), свои расширения (`signalStoreFeature`), которые подключаются к любому хранилищу.

**Классический Store** (`@ngrx/store`) устроен иначе — по образцу Redux. Компоненты не вызывают методы, а **отправляют действия** — объекты-сообщения «добавлена игра». Новое состояние по действию вычисляют чистые функции-редьюсеры, читают его через селекторы, а работу с сервером ведут эффекты NgRx (не путать с `effect()` Angular). Кода больше, зато каждое изменение — запись в журнале: Redux DevTools показывает, какое действие что изменило, и позволяет «отмотать» состояние назад.

## Когда библиотека оправдана

Сервисов на сигналах хватает, пока:

- хранилищ немного, и каждое отвечает за своё;
- правила помещаются в методы, а асинхронность — в `httpResource` и пару `async`-функций;
- в команде договорились, как пишутся хранилища, и следуют договорённости.

О библиотеке стоит подумать, когда:

- **команда большая**, и нужен один обязательный способ писать хранилища — библиотека задаёт его за вас, вместе с документацией и привычками новых разработчиков;
- **нужен журнал изменений**: отладка «кто и почему поменял состояние» в большом приложении, воспроизведение ошибок — сильная сторона классического Store;
- **много коллекций сущностей** с добавлением, обновлением, удалением по id — `withEntities` избавляет от однообразного кода;
- **сложные асинхронные потоки**: отмена, гонки запросов, повторы, объединение нескольких источников — это территория RxJS (глава 12), и у NgRx для неё готовые средства;
- **части приложения общаются событиями**: «заказ оформлен» должен очистить корзину, обновить «Мои заказы» и отправить аналитику, а отправитель не должен знать всех получателей.

И наоборот: библиотека не исправит путаницу из шага «Состояние бывает разное». Данные сервера в хранилище, фильтры не в URL — это проблемы проектирования, а не нехватка инструмента.

## Как в настоящем проекте

NgRx — отдельные пакеты со своими версиями (сейчас 22.0.1, они требуют `@angular/core` 22). Ставят их в проект Angular CLI: `ng add @ngrx/signals`. В превью курса NgRx нет, поэтому фрагмент выше здесь не запустить. Его типы мы проверили по пакету `@ngrx/signals` 22.0.1, а в главе 18 вы перепишете на Signal Store корзину и фильтры каталога и сделаете ту же корзину на классическом Store — тогда разница будет видна на своём коде.

::: tip Если вы знаете React или Vue
Классический NgRx Store — родственник Redux (и Redux Toolkit), Signal Store ближе к Pinia во Vue или Zustand в React: хранилище с состоянием, вычисляемыми значениями и методами, без отдельных действий и редьюсеров.
:::
