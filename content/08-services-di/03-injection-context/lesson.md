---
title: Контекст внедрения
startFrom: custom
files: [main.ts, shared/now.ts, shared/countdown/countdown.ts, core/cart-store.ts, app.ts, app.html, app.css, layout/header/header.ts, layout/header/header.html, layout/header/header.css, shared/game-card/game-card.ts, shared/game-card/game-card.html, shared/game-card/game-card.css, shared/game-details/game-details.ts, shared/game-details/game-details.html, shared/game-details/game-details.css, shared/tabs/tabs.ts, shared/tabs/tabs.html, shared/tabs/tabs.css, shared/tabs/tab.ts, shared/tabs/tab.html, shared/countdown/countdown.html, shared/countdown/countdown.css, shared/price-pipe.ts, shared/players-pipe.ts, shared/duration-pipe.ts, shared/plural.ts, shared/tooltip.ts, shared/in-view.ts, shared/lazy-image.ts, shared/load-more/load-more.ts, shared/load-more/load-more.html, shared/load-more/load-more.css, shared/rating/rating.ts, shared/rating/rating.html, shared/rating/rating.css, shared/quantity/quantity.ts, shared/quantity/quantity.html, shared/quantity/quantity.css, core/models.ts, core/games-data.ts, app.config.ts, styles.css]
focus: shared/now.ts
api: [контекст внедрения, inject-функция, assertInInjectionContext, runInInjectionContext, Injector, DestroyRef, NG0203]
---

`inject()` работает не везде. Вызов в обработчике щелчка или в `setTimeout` заканчивается ошибкой NG0203, а в инициализаторе поля и в конструкторе — нет. В этом шаге разберёмся, где проходит граница, и воспользуемся ею: напишем свою функцию, которая сама внедряет зависимости, — **inject-функцию**.

## Контекст внедрения

`inject()` не принимает инжектор: она берёт его из **контекста внедрения** (injection context). Это промежуток времени, пока Angular создаёт объект: на время вызова конструктора он запоминает «текущий инжектор», а после — забывает. Всё, что выполняется **синхронно** внутри этого промежутка, может вызывать `inject()`:

- инициализаторы полей и конструктор компонента, директивы, пайпа, сервиса;
- фабрики провайдеров — `useFactory` и `factory` у токена (шаги 4 и 5);
- функции, которые вызваны оттуда, — сколько угодно уровней вложенности;
- функция, переданная в `runInInjectionContext` (о ней ниже).

А вот обработчик события, колбэк `setTimeout`, `then` у промиса и код после `await` выполняются позже, когда создание объекта давно закончилось. Текущего инжектора к этому моменту нет:

```ts
protected buy() {
  inject(CartStore).add(this.game()); // щелчок «В корзину»
}
```

```
ERROR RuntimeError: NG0203: The `CartStore` token injection failed. `inject()` function must be called from an injection context such as a constructor, a factory function, a field initializer, or a function used with `runInInjectionContext`.
```

Поэтому зависимости получают в полях, а пользуются ими в методах: `protected readonly cart = inject(CartStore)`, а в обработчике — `this.cart.add(…)`. Так мы и делали.

## Своя inject-функция

Раз `inject()` работает во вложенных функциях, можно вынести в функцию целый кусок поведения вместе с его зависимостями. Возьмём `Countdown` из главы 6. Половина его кода — механика «текущее время раз в секунду»: сигнал, `setInterval` и уборка в `DestroyRef`. Такое понадобится не только таймеру скидки. Вынесем механику в функцию:

```ts shared/now.ts
import { DestroyRef, Signal, assertInInjectionContext, inject, signal } from '@angular/core';

// Текущее время сигналом, который обновляется каждые periodMs миллисекунд.
// Таймер останавливается сам, когда уничтожается тот, кто вызвал функцию
export function injectNow(periodMs = 1000): Signal<number> {
  // Понятная ошибка, если функцию вызвали вне контекста внедрения
  assertInInjectionContext(injectNow);
  const now = signal(Date.now());
  const timer = setInterval(() => now.set(Date.now()), periodMs);
  // DestroyRef того, кто вызвал: компонента, директивы или сервиса
  inject(DestroyRef).onDestroy(() => clearInterval(timer));
  return now.asReadonly();
}
```

```ts shared/countdown/countdown.ts {3}
export class Countdown {
  // Текущее время, раз в секунду. Таймер остановится сам, когда компонент уничтожат
  private readonly now = injectNow();
  // Сколько миллисекунд осталось. Строкой «07:16:10» его сделает пайп в шаблоне
  protected readonly left = computed(() => untilMidnight(this.now()));
}
```

Конструктор `Countdown` больше не нужен.

Разберём функцию:

- **`inject(DestroyRef)` внутри функции.** `injectNow()` вызвана из инициализатора поля `Countdown`, значит, и `inject()` внутри неё выполняется в контексте внедрения `Countdown`. Она получит `DestroyRef` компонента, и таймер остановится, когда окно «Подробнее» закроют. Вызовите ту же функцию в поле сервиса — получите `DestroyRef` сервиса, и таймер проживёт, пока живёт приложение. Функция не знает, кто её вызвал: это решает контекст;
- **`asReadonly()`** — сигнал только для чтения (глава 3): записывать время может только сама функция;
- **`assertInInjectionContext(injectNow)`** — проверка «я в контексте внедрения?». Без контекста она бросает NG0203 с именем нашей функции. Зачем она, если `inject()` и так бросит ошибку, — покажет эксперимент;
- **имя `injectNow`.** Функции, которые внутри вызывают `inject()`, принято называть с `inject…`: имя предупреждает, что вызывать её можно только там же, где `inject()`.

::: task
1. В `shared/now.ts` напишите функцию `injectNow(periodMs = 1000)`: она возвращает сигнал только для чтения с текущим временем, обновляет его каждые `periodMs` миллисекунд и останавливает таймер через `DestroyRef` вызвавшего. Первой строкой — `assertInInjectionContext`.
2. В `Countdown` получите время из `injectNow()`, а сигнал `now`, `setInterval` и конструктор удалите.
:::

## Что получилось

Откройте «Подробнее» у «Острова сокровищ»: «Скидка действует ещё …» отсчитывает секунды, как раньше. `Countdown` стал короче на конструктор, а механика времени — отдельной функцией, которую можно вызвать в любом компоненте.

## Эксперимент: вызов вне контекста

Пусть таймер запускается не сразу, а чуть позже. Добавьте в `Countdown`:

```ts
constructor() {
  setTimeout(() => injectNow());
}
```

Откройте «Подробнее» у «Острова сокровищ»:

```
ERROR RuntimeError: NG0203: injectNow() can only be used within an injection context such as a constructor, a factory function, a field initializer, or a function used with `runInInjectionContext`.
```

Сам `setTimeout` вызван в конструкторе, но колбэк выполнился позже, когда конструктор уже закончился.

Теперь уберите из `injectNow` строку с `assertInInjectionContext` и повторите. Ошибка другая:

```
ERROR RuntimeError: NG0203: The `DestroyRef` token injection failed. `inject()` function must be called from an injection context …
```

Сообщение говорит о `DestroyRef`, хотя вы его нигде не просили. Хуже другое: до `inject(DestroyRef)` функция уже успела запустить `setInterval`, и этот таймер теперь тикает вечно — остановить его некому. `assertInInjectionContext` в первой строке проверяет контекст **до** побочных эффектов и называет функцию, которую вызвали не там. Верните проверку.

То же будет и после `await`: в `async`-методе, вызванном из конструктора, `inject()` до первого `await` работает, а после — NG0203.

## runInInjectionContext

Если зависимость всё же нужна позже, можно восстановить контекст вручную. Для этого запоминают инжектор — он тоже зависимость, его выдаёт `inject(Injector)`:

```ts
private readonly injector = inject(Injector);

constructor() {
  setTimeout(() => runInInjectionContext(this.injector, () => injectNow()));
}
```

`runInInjectionContext(injector, fn)` выполняет `fn` так, будто она вызвана при создании объекта этим инжектором. Ошибки нет, а таймер принадлежит компоненту. Проверьте: добавьте в `injectNow` в `onDestroy` строку `console.log('таймер остановлен')`, откройте и закройте окно. В консоли — две строки: остановлены оба таймера, из поля и из `setTimeout`. Уберите эксперимент.

В коде приложения `runInInjectionContext` нужен редко: почти всегда зависимость проще получить в поле. Встречается он в библиотеках и в тестах (глава 16).

::: deep Под капотом: «текущий инжектор»
`inject()` — функция без магии. Перед вызовом конструктора Angular записывает инжектор в переменную модуля `@angular/core` (её ставит `setCurrentInjector` или, для компонентов, `setInjectImplementation`), после — возвращает прежнее значение. `inject()` читает эту переменную; если там пусто — NG0203. Поэтому контекст не переживает ни `setTimeout`, ни `await`: к моменту их выполнения переменная уже восстановлена. Тот же приём применяет `runInInjectionContext`: записать инжектор, вызвать функцию, вернуть как было. Именно поэтому контекст внедрения есть только у синхронного кода.
:::

::: tip Как в настоящем проекте
inject-функции — удобный способ переиспользовать поведение между компонентами без общих базовых классов: каждый компонент берёт только те функции, которые ему нужны. Сам Angular устроен так же: `input()`, `output()`, `viewChild()`, `effect()` проверяют контекст внедрения (поэтому их пишут в полях), а `toSignal()` и `takeUntilDestroyed()` из `@angular/core/rxjs-interop` (глава 12) внутри берут `DestroyRef`.
:::
