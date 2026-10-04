---
title: Замер после отрисовки
focus: shared/tabs/tabs.ts
files: [main.ts, app.ts, app.html, app.css, shared/tabs/tabs.ts, shared/tabs/tabs.html, shared/tabs/tabs.css, shared/tabs/tab.ts, shared/tabs/tab.html, shared/game-details/game-details.ts, shared/game-details/game-details.html, shared/game-details/game-details.css, shared/countdown/countdown.ts, shared/countdown/countdown.html, shared/countdown/countdown.css, shared/game-card/game-card.ts, shared/game-card/game-card.html, shared/game-card/game-card.css, shared/rating/rating.ts, shared/rating/rating.html, shared/rating/rating.css, shared/quantity/quantity.ts, shared/quantity/quantity.html, shared/quantity/quantity.css, core/models.ts, core/games-data.ts, app.config.ts, styles.css]
api: ['afterRenderEffect()', earlyRead, write, read]
---

Выбранная вкладка пока выделена только цветом и жирным шрифтом. Во многих интерфейсах под ней ещё бежит цветная полоска: щёлкнули «Характеристики» — полоска плавно переехала под эту кнопку. Сделаем так же.

Полоска — один элемент `<span class="ink">` под рядом кнопок, его стили уже есть в `tabs.css`: позиция `absolute` и плавный переход `left` и `width`. Остаётся задать `left` и `width` — а они зависят от того, где на экране стоит кнопка выбранной вкладки и какой она ширины. Эти числа знает только браузер, и только после того, как кнопки отрисованы: ширина зависит от текста, шрифта и того, что выбранная кнопка жирная.

Значит, нужно **замерить** DOM после отрисовки. Но не один раз, как `afterNextRender` в шаге 3, а каждый раз, когда меняется выбранная вкладка. И не после каждой отрисовки приложения, как `afterEveryRender`: таймер скидки перерисовывает окно каждую секунду, а замерять при этом нечего.

## `afterRenderEffect()`

`afterRenderEffect` — эффект, который выполняется после отрисовки. Как обычный `effect`, он запоминает сигналы, которые прочитал, и выполняется снова, только когда какой-то из них изменился. Как `afterNextRender`, он выполняется, когда DOM уже готов, и только в браузере.

```ts shared/tabs/tabs.ts {1,5-8,14-23}
import { Component, ElementRef, afterRenderEffect, contentChildren, effect, signal, viewChildren } from '@angular/core';

export class Tabs {
  // … tabs, selected
  // Кнопки вкладок из шаблона Tabs: #tabButton
  private readonly buttons = viewChildren<ElementRef<HTMLElement>>('tabButton');
  // Где стоит и какой ширины полоска под выбранной вкладкой
  protected readonly ink = signal({ left: 0, width: 0 });

  constructor() {
    // … эффект, который переключает вкладки

    // После отрисовки замерить кнопку выбранной вкладки — полоска встанет под неё
    afterRenderEffect({
      read: () => {
        const button = this.buttons()[this.selected()]?.nativeElement;
        if (button) {
          this.ink.set({ left: button.offsetLeft, width: button.offsetWidth });
        }
      },
    });
  }
}
```

```html shared/tabs/tabs.html {3,6}
<div class="tab-list" role="tablist">
  @for (tab of tabs(); track tab; let index = $index) {
    <button #tabButton class="tab" role="tab" …>{{ tab.label() }}</button>
  }
  <span class="ink" [style.left.px]="ink().left" [style.width.px]="ink().width"></span>
</div>
<ng-content />
```

Как это работает:

- `viewChildren('tabButton')` находит все кнопки: ссылка внутри `@for` повторяется, и запрос собирает их массивом;
- функция в `afterRenderEffect` читает сигналы `buttons` и `selected` — от них и зависит. Выбрали другую вкладку → после отрисовки функция выполнится снова;
- замер — чтение DOM (`offsetLeft`, `offsetWidth`). Результат кладём в сигнал `ink`, а полоску двигают привязки стилей в шаблоне. DOM меняет Angular, как обычно;
- запись в `ink` попросит Angular перерисовать `Tabs` ещё раз — уже с новой позицией полоски. Сам `afterRenderEffect` `ink` не читает, поэтому снова не выполнится: цикла нет.

## Фазы

Функция стоит не просто так, а под ключом `read` — это **фаза**. Мы упоминали фазы в шаге 3: после отрисовки Angular выполняет функции всех компонентов по фазам в строгом порядке:

```
earlyRead → write → mixedReadWrite → read
```

- `earlyRead` — прочитать DOM до того, как кто-то начнёт в него писать;
- `write` — записать в DOM;
- `mixedReadWrite` — и читать, и писать; сюда попадают функции без фазы (как наш `showModal()` в `afterNextRender`);
- `read` — прочитать DOM, когда все записи закончены.

Смысл — не перемешивать чтения и записи. Каждое чтение размеров после записи заставляет браузер заново рассчитать раскладку страницы. Когда сначала все чтения, потом все записи, расчёт один. Angular не проверяет, что вы действительно только читаете в `read`, — это договорённость.

Функции фаз могут передавать результат дальше: что вернула `earlyRead`, получит `write` — в виде сигнала. Так пишут «замерил — сразу передвинул элемент» без лишней перерисовки Angular.

::: task
1. В шаблоне `Tabs` добавьте кнопкам ссылку `#tabButton`, а после `@for` — `<span class="ink">` с привязками `[style.left.px]` и `[style.width.px]`.
2. В классе добавьте запрос `buttons`, сигнал `ink` и `afterRenderEffect` с фазой `read`.
:::

## Что получилось

Откройте «Остров сокровищ»: под «Описанием» красная полоска во всю ширину слова. Щёлкните «Характеристики» — полоска переехала и стала шире. Мы проверили замером: у «Характеристик» `left: 83px` и `width: 116px` — ровно как у кнопки, уже жирной.

## Эксперимент: не та фаза

Поменяйте `read` на `earlyRead` и откройте окно. Полоски нет! Щёлкните «Характеристики» — появилась и дальше работает правильно.

Посмотрите, что происходит при открытии окна. После первой отрисовки выполняются функции после отрисовки всех компонентов — по фазам. `earlyRead` у `Tabs` идёт раньше всех, а окно открывает `afterNextRender` в `GameDetails` — в фазе `mixedReadWrite`, позже. В момент замера `<dialog>` ещё закрыт, у закрытого окна `display: none`, и ширина любой кнопки внутри — 0. Мы проверили: `width: 0px` при открытии.

С `read` замер идёт последним, когда окно уже открыто. Это и есть смысл фаз: они упорядочивают работу с DOM **разных** компонентов, которые друг о друге не знают. Верните `read`.

## Эксперимент: просто `effect`

Замените `afterRenderEffect({ read: () => { … } })` обычным `effect(() => { … })` с тем же телом. При открытии полоски снова нет. А при переключении она встаёт **почти** правильно: под «Характеристиками» — `left: 86px` и `width: 110px` вместо 83 и 116. Это размеры кнопки до того, как Angular обновил шаблон: «Характеристики» ещё не жирные, а «Описание» — ещё жирное и потому шире. Эффект выполняется до обновления шаблона (шаг 1), и замер опаздывает на одну отрисовку. Верните `afterRenderEffect`.

## Эксперимент: сколько раз

Добавьте `console.log('afterRenderEffect')` в начало функции `read`, а в конструктор — `afterEveryRender(() => console.log('afterEveryRender'))`. Откройте окно, переключите вкладку и подождите пару секунд. `afterRenderEffect` пишет по одной строке на открытие и на каждое переключение. `afterEveryRender` — после каждой отрисовки: на переключение вкладки дважды (вторая — из-за записи в `ink`) и ещё раз каждую секунду, когда таймер скидки обновляет своё время. Уберите эксперимент.

| Функция | Когда выполняется |
|---|---|
| `afterNextRender` | один раз, после ближайшей отрисовки |
| `afterEveryRender` | после каждой отрисовки приложения |
| `afterRenderEffect` | после отрисовки, если изменились прочитанные сигналы (и в первый раз) |

::: tip Когда замер не нужен
Прежде чем замерять, проверьте, не справится ли CSS. Выделить выбранную вкладку рамкой снизу можно одним правилом — но рамка не умеет плавно переезжать от кнопки к кнопке. Замер нужен, когда положение одного элемента зависит от размеров другого, а CSS эту связь выразить не может.
:::
