---
title: После отрисовки
focus: shared/game-details/game-details.ts
files: [main.ts, app.ts, app.html, app.css, shared/game-details/game-details.ts, shared/game-details/game-details.html, shared/game-details/game-details.css, shared/game-card/game-card.ts, shared/game-card/game-card.html, shared/game-card/game-card.css, shared/rating/rating.ts, shared/rating/rating.html, shared/rating/rating.css, shared/quantity/quantity.ts, shared/quantity/quantity.html, shared/quantity/quantity.css, core/models.ts, core/games-data.ts, app.config.ts, styles.css]
api: ['afterNextRender()', 'afterEveryRender()', '<dialog>', 'showModal()']
---

Окно «Подробнее» пока только выглядит как модальное. Esc его не закрывает, Tab уводит фокус на карточки под затемнением, а программа чтения с экрана не знает, что остальная страница сейчас недоступна. Делать всё это вручную — ловить Esc, удерживать фокус внутри окна, прятать страницу от программ чтения с экрана — долго и легко ошибиться.

Браузер умеет всё это сам. Элемент `<dialog>`, открытый методом `showModal()`, становится **модальным окном**: он показывается поверх всей страницы, рисует под собой затемнение (псевдоэлемент `::backdrop`), переносит фокус внутрь и закрывается по Esc. Страница под ним становится инертной: на неё нельзя щёлкнуть, и Tab до неё не доходит. А после закрытия браузер возвращает фокус туда, где он был до открытия.

Сейчас окно открыто атрибутом `open` — так `<dialog>` показывается, но **не** модальным. Модальным его делает только вызов метода. Привязки шаблона вызывать методы DOM не умеют, значит, нужен `viewChild` из прошлого шага. Остаётся вопрос: **когда** вызвать `showModal()`?

## Когда DOM готов

В прошлых шагах мы увидели, что ни конструктор, ни эффект для этого не годятся. В конструкторе шаблона ещё нет — обязательный запрос бросит NG0951. Эффект выполняется до того, как Angular обновит шаблон компонента.

Для работы с готовым DOM в Angular есть функции **после отрисовки** (after render). `afterNextRender(fn)` вызовет `fn` один раз — когда Angular в следующий раз закончит отрисовку всего приложения. К этому моменту все шаблоны обновлены, элементы вставлены в документ, а запросы к представлению заполнены:

```ts shared/game-details/game-details.ts {1,6-7,9-12}
import { Component, ElementRef, afterNextRender, input, output, viewChild } from '@angular/core';

export class GameDetails {
  // … входы и выходы

  // Элемент <dialog> из шаблона: #dialog
  private readonly dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    // Модальным <dialog> делает только метод showModal(), а вызвать его можно, когда элемент уже в документе
    afterNextRender(() => this.dialogRef().nativeElement.showModal());
  }
}
```

`afterNextRender` вызывают в контексте внедрения — обычно в конструкторе, как `effect`. Сама функция выполнится позже.

Шаблон тоже меняется:

```html shared/game-details/game-details.html {1-2}
<dialog #dialog class="details" (close)="closed.emit()">
  <button class="close" aria-label="Закрыть" (click)="dialog.close()">×</button>
  <!-- … без изменений … -->
</dialog>
```

- `<div class="backdrop">` больше не нужен: затемнение нарисует браузер;
- атрибута `open` нет: окно откроет `showModal()`;
- `(close)` — событие DOM, которое `<dialog>` генерирует при закрытии: по Esc или по методу `close()`. В ответ сообщаем родителю: окно закрыто, можно убирать компонент;
- «×» вызывает `dialog.close()` через ссылку из шаблона. Закрытие любым способом идёт одним путём: `close()` → событие `close` → выход `closed` → `App` убирает компонент.

В стилях правило `.backdrop` заменяется псевдоэлементом:

```css shared/game-details/game-details.css
/* Затемнение под модальным окном браузер рисует сам: это псевдоэлемент ::backdrop */
.details::backdrop {
  background: rgb(0 0 0 / 40%);
}
```

::: task
1. В шаблоне `GameDetails` удалите `<div class="backdrop">`, у `<dialog>` уберите `open` и добавьте ссылку `#dialog` и обработчик `(close)`. «×» пусть вызывает `dialog.close()`.
2. В `game-details.css` замените правило `.backdrop` правилом `.details::backdrop`.
3. В классе добавьте запрос `dialogRef` и откройте окно в `afterNextRender`.
:::

## Что получилось

Окно выглядит так же, но ведёт себя иначе. Откройте «Остров сокровищ»: фокус сразу на «×» — первой кнопке окна. Tab ходит по кнопкам окна, а до карточек под затемнением больше не доходит. Esc закрывает окно, и фокус возвращается на название «Остров сокровищ» — туда, где был до открытия. Мы проверили это щелчком мыши и клавишами в превью.

## Эксперимент: а если раньше?

Перенесите вызов из `afterNextRender` прямо в конструктор:

```ts
constructor() {
  this.dialogRef().nativeElement.showModal();
}
```

Окно не откроется, в консоли — уже знакомая `NG0951: Child query result is required but no value is available.` Шаблона ещё нет.

Теперь попробуйте эффект и заодно посмотрите, что в этот момент в DOM:

```ts
constructor() {
  effect(() => {
    const dialog = this.dialogRef().nativeElement;
    console.log('effect: заголовок', JSON.stringify(dialog.querySelector('h2')?.textContent));
    dialog.showModal();
  });
  afterNextRender(() => {
    console.log('afterNextRender: заголовок', JSON.stringify(this.dialogRef().nativeElement.querySelector('h2')?.textContent));
  });
}
```

```
effect: заголовок ""
afterNextRender: заголовок "Остров сокровищ"
```

Окно открылось — элемент `<dialog>` к моменту эффекта уже создан и вставлен в документ. Но заголовок в нём ещё пустой: тексты и привязки Angular обновит после эффекта. С `showModal()` повезло, а замер высоты, прокрутка к элементу или фокус на поле внутри `@if` в эффекте дали бы неверный результат. Эффект — для сигналов. Для DOM — функции после отрисовки. Верните `afterNextRender`.

## `afterEveryRender`

У `afterNextRender` есть пара — `afterEveryRender`: её функция выполняется после **каждой** отрисовки приложения, пока компонент жив. Замените `afterNextRender` на `afterEveryRender` и добавьте вывод в консоль:

```ts
afterEveryRender(() => {
  console.log('afterEveryRender');
  this.dialogRef().nativeElement.showModal();
});
```

Откройте окно — `afterEveryRender` в консоли. Нажмите «В корзину» в окне — ещё раз: обработчик события изменил корзину, Angular перерисовал приложение. Отрисовка любого компонента, даже не связанного с окном, вызовет эту функцию снова. Повторный `showModal()` у уже открытого модального окна браузер просто игнорирует, но в общем случае «после каждой отрисовки» — дорогое и редко нужное место. Верните `afterNextRender`.

## Как в настоящем проекте

Функции после отрисовки выполняются **только в браузере**. При серверной отрисовке (SSR, глава 20) Angular строит HTML на сервере, где нет настоящего DOM, и `afterNextRender` там просто не вызывается. Поэтому всё, что трогает DOM или API браузера (`showModal`, `focus`, `IntersectionObserver`, `localStorage`), принято делать в функциях после отрисовки, а не в конструкторе. Тогда тот же компонент без изменений работает и на сервере.

::: deep Под капотом: фазы отрисовки
`afterNextRender` и `afterEveryRender` принимают и объект с функциями по **фазам**: `earlyRead`, `write`, `mixedReadWrite`, `read`. Angular выполняет сначала все `earlyRead` всех компонентов, потом все `write` и так далее. Так чтения и записи DOM не перемешиваются, и браузер не пересчитывает раскладку страницы после каждой записи. Функция без фаз, как у нас, выполняется в фазе `mixedReadWrite`. Фазы понадобятся в шаге 6, где они окажутся важны.
:::
