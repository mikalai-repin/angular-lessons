---
title: Ленивые сервисы
startFrom: custom
files: [main.ts, core/cart-store.ts, core/analytics.ts, app.ts, app.html, app.css, layout/header/header.ts, layout/header/header.html, layout/header/header.css, core/shop-config.ts, core/demo-cart-store.ts, shared/game-card/game-card.ts, shared/game-card/game-card.html, shared/game-card/game-card.css, shared/game-details/game-details.ts, shared/game-details/game-details.html, shared/game-details/game-details.css, shared/tabs/tabs.ts, shared/tabs/tabs.html, shared/tabs/tabs.css, shared/tabs/tab.ts, shared/tabs/tab.html, shared/countdown/countdown.ts, shared/countdown/countdown.html, shared/countdown/countdown.css, shared/now.ts, shared/price-pipe.ts, shared/players-pipe.ts, shared/duration-pipe.ts, shared/plural.ts, shared/tooltip.ts, shared/in-view.ts, shared/lazy-image.ts, shared/load-more/load-more.ts, shared/load-more/load-more.html, shared/load-more/load-more.css, shared/rating/rating.ts, shared/rating/rating.html, shared/rating/rating.css, shared/quantity/quantity.ts, shared/quantity/quantity.html, shared/quantity/quantity.css, core/models.ts, core/games-data.ts, app.config.ts, styles.css]
focus: core/cart-store.ts
api: [injectAsync, onIdle, 'import()', ленивая загрузка, prefetch]
---

Магазину нужна аналитика: что кладут в корзину, что смотрят. В настоящих проектах это чужая библиотека, и часто тяжёлая. А для первой отрисовки каталога она не нужна совсем: событие «положили в корзину» случится не раньше первого щелчка. Загружать её вместе со всем приложением — значит заставить покупателя ждать кода, который пока ничего не делает.

Angular 22 умеет внедрять сервис **лениво**: модуль с ним загружается, только когда он понадобился или когда браузер освободился.

## Аналитика

Сервис уже лежит в `core/analytics.ts`. Учебная аналитика ничего не отправляет на сервер, а пишет события в консоль:

```ts core/analytics.ts
import { Service } from '@angular/core';

// Только для урока: строка появится в консоли, когда браузер загрузит и выполнит этот модуль
console.log('Аналитика: модуль загружен');

// Аналитика магазина. Настоящая отправляла бы события на сервер, учебная пишет их в консоль
@Service()
export class Analytics {
  constructor() {
    console.log('Аналитика: экземпляр создан');
  }

  track(event: string, details: string) {
    console.log(`Аналитика: ${event} — ${details}`);
  }
}
```

Две строки «только для урока» покажут, **когда** загружается модуль и **когда** создаётся экземпляр. Это разные моменты.

## injectAsync

Если написать `inject(Analytics)`, модуль `analytics.ts` придётся импортировать обычным `import` — и он загрузится вместе с корзиной. Ленивый вариант:

```ts core/cart-store.ts {3-5,9}
// Аналитика не нужна для первой отрисовки. Её модуль загрузится, когда браузер освободится,
// а экземпляр Angular создаст при первом вызове
private readonly analytics = injectAsync(() => import('./analytics').then((m) => m.Analytics), {
  prefetch: onIdle,
});

add(game: Game) {
  this.items.update(/* … как раньше */);
  this.analytics().then((analytics) => analytics.track('В корзину', game.title));
}
```

Разберём:

- **`import('./analytics')`** — динамический импорт JavaScript: загрузить модуль, когда до этой строки дойдёт дело, и вернуть промис. Сборщик настоящего проекта выносит такой модуль в отдельный файл. Обычного `import { Analytics }` в `cart-store.ts` нет — иначе модуль загрузился бы сразу;
- **`injectAsync(загрузчик)`** возвращает не сервис, а функцию. Вызов `this.analytics()` загружает модуль (один раз — дальше берёт уже загруженный), просит у инжектора экземпляр и возвращает промис с ним. `.then((m) => m.Analytics)` достаёт из модуля класс — это и есть токен;
- **`prefetch: onIdle`** — когда загрузить модуль заранее, ещё до первого вызова. `onIdle` ждёт, пока браузер освободится (`requestIdleCallback`). Без `prefetch` модуль загрузится при первом вызове `this.analytics()`.

`injectAsync` вызывает `inject(Injector)`, а `onIdle` — свою зависимость, поэтому оба работают только в контексте внедрения: в поле, как здесь. Сервис для `injectAsync` должен быть доступен сам — `@Service()` или `@Injectable({ providedIn: 'root' })`: провайдер в `appConfig` пришлось бы импортировать, и ленивость пропала бы.

::: task
В `CartStore` получите `Analytics` лениво: `injectAsync` с динамическим импортом `./analytics` и предварительной загрузкой `onIdle`. В `add` после изменения корзины сообщите аналитике событие `'В корзину'` с названием игры.
:::

## Что получилось

Сразу после запуска в консоли:

```
Корзина: Остров сокровищ × 2, Тихая охота × 1
Angular is running in development mode.
Аналитика: модуль загружен
```

Модуль загрузился, как только приложение отрисовалось и браузеру стало нечем заняться. Экземпляра пока нет. Нажмите «В корзину» у «Драконьей почты»:

```
Аналитика: экземпляр создан
Аналитика: В корзину — Драконья почта
Корзина: Остров сокровищ × 2, Тихая охота × 1, Драконья почта × 1
```

Экземпляр создан при первом вызове. Событие аналитики оказалось раньше журнала корзины: модуль уже загружен, и цепочка промисов выполнилась сразу после обработчика щелчка, а эффект корзины Angular запускает позже, когда обрабатывает изменения. При следующих щелчках — только строка события.

## Эксперимент: без prefetch

Уберите второй аргумент `injectAsync` (и `onIdle` из импорта). После запуска строки «модуль загружен» нет. Нажмите «В корзину»:

```
Корзина: Остров сокровищ × 2, Тихая охота × 1, Драконья почта × 1
Аналитика: модуль загружен
Аналитика: экземпляр создан
Аналитика: В корзину — Драконья почта
```

Теперь модуль загружается по первому щелчку, и событие ждёт загрузки — в превью это мгновенно, а в настоящем приложении это запрос к серверу. `prefetch` убирает задержку: к первому щелчку модуль обычно уже на месте. Верните `prefetch: onIdle`.

## Эксперимент: сервис, которого нет в DI

Поставьте в `Analytics` декоратор `@Service({ autoProvided: false })` и нажмите «В корзину»:

```
ERROR ɵNotFound: NG0201: No provider found for `Analytics`. Source: Environment Injector.
```

Модуль загрузился, но выдать экземпляр инжектору не из чего. Корзина при этом работает: ошибка случилась в промисе, после того как игра уже легла в корзину. Верните `@Service()`.

::: tip Как в настоящем проекте
Ленивая загрузка в Angular бывает трёх видов: маршруты (`loadComponent`, глава 10), части шаблона (`@defer`, глава 15) и сервисы (`injectAsync`). Во всех трёх сборщик видит динамический `import()` и выносит код в отдельный файл — его видно во вкладке «Сеть» браузера. `injectAsync` и `onIdle` появились в Angular 22.
:::
