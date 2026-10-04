---
title: Дочерние из проекции
startFrom: custom
focus: shared/tabs/tabs.ts
files: [main.ts, app.ts, app.html, app.css, shared/tabs/tabs.ts, shared/tabs/tabs.html, shared/tabs/tabs.css, shared/tabs/tab.ts, shared/tabs/tab.html, shared/game-details/game-details.ts, shared/game-details/game-details.html, shared/game-details/game-details.css, shared/countdown/countdown.ts, shared/countdown/countdown.html, shared/countdown/countdown.css, shared/game-card/game-card.ts, shared/game-card/game-card.html, shared/game-card/game-card.css, shared/rating/rating.ts, shared/rating/rating.html, shared/rating/rating.css, shared/quantity/quantity.ts, shared/quantity/quantity.html, shared/quantity/quantity.css, core/models.ts, core/games-data.ts, app.config.ts, styles.css]
api: ['contentChildren()', 'contentChild()', descendants]
---

В окне «Подробнее» есть только описание. А покупателю важно и другое: на сколько игроков игра, сколько длится партия, с какого возраста. Всё вместе в окно 500 × 600 не поместится, поэтому разложим по вкладкам: «Описание» и «Характеристики».

Вкладки пригодятся и дальше — на странице игры, в личном кабинете. Сделаем их компонентами, которыми удобно пользоваться:

```html
<app-tabs>
  <app-tab label="Описание">…</app-tab>
  <app-tab label="Характеристики">…</app-tab>
</app-tabs>
```

Родитель просто перечисляет вкладки и их содержимое, а `Tabs` сам рисует ряд кнопок и показывает выбранную. Для этого `Tabs` нужно узнать, какие вкладки ему передали и как они называются. Вкладки — это **содержимое** `<app-tabs>`: разметка, которую родитель вложил между открывающим и закрывающим тегом. Из главы 5 мы знаем, как это содержимое показать — `<ng-content>`. Но `Tabs` нужно не только показать вкладки, но и **добраться** до них из класса.

## Что изменилось в коде

Появилась папка `shared/tabs`: заготовки `tabs.ts`, `tabs.html` и `tab.ts` с `TODO`, готовые `tabs.css` и `tab.html`. В `game-details.css` добавлены стили характеристик `.specs`, в шаблоне `GameDetails` — `TODO` на месте вкладок.

## Вкладка

`Tab` — простой компонент. Название — обязательный вход, содержимое показывается через `<ng-content />` (это весь `tab.html`):

```ts shared/tabs/tab.ts
// Одна вкладка: название для кнопки и содержимое, которое передал родитель
@Component({
  selector: 'app-tab',
  templateUrl: './tab.html',
  host: {
    role: 'tabpanel',
    '[hidden]': '!active()',
  },
})
export class Tab {
  readonly label = input.required<string>();
  // Видна ли вкладка. Это решает Tabs, поэтому здесь не вход, а сигнал, который Tabs меняет сам
  readonly active = signal(false);
}
```

Видна ли вкладка, решает не она сама и не родитель, а `Tabs`. Обычный вход тут не подойдёт: входы задаёт тот, в чьём шаблоне стоит `<app-tab>`, — это `GameDetails`. Поэтому `active` — публичный сигнал, который `Tabs` будет переключать. Привязка `[hidden]` у хоста прячет невыбранные вкладки.

## `contentChildren()`

Как `viewChildren()` находит компоненты в своём шаблоне, так `contentChildren()` находит их в **содержимом** — в том, что родитель вложил в компонент. Это **запрос к содержимому** (content query):

```ts shared/tabs/tabs.ts {4,6}
export class Tabs {
  // Вкладки, которые родитель вложил между <app-tabs> и </app-tabs>
  protected readonly tabs = contentChildren(Tab);
  // Номер выбранной вкладки
  protected readonly selected = signal(0);

  constructor() {
    // Выбранную вкладку показать, остальные спрятать
    effect(() => {
      const selected = this.selected();
      this.tabs().forEach((tab, index) => tab.active.set(index === selected));
    });
  }
}
```

Результат — сигнал с массивом экземпляров `Tab` в порядке разметки. Эффект читает и `selected`, и `tabs`, поэтому срабатывает и при выборе вкладки, и при изменении набора вкладок.

Шаблон `Tabs` — ряд кнопок по массиву вкладок и само содержимое:

```html shared/tabs/tabs.html {2,8-9,11,14}
<div class="tab-list" role="tablist">
  @for (tab of tabs(); track tab; let index = $index) {
    <button
      class="tab"
      role="tab"
      [class.active]="index === selected()"
      [attr.aria-selected]="index === selected()"
      (click)="selected.set(index)"
    >
      {{ tab.label() }}
    </button>
  }
</div>
<ng-content />
```

Каждая кнопка читает `label()` своей вкладки — входа другого компонента. Это обычный сигнал: если родитель поменяет название, кнопка обновится. `track tab` — вкладки отслеживаются по самому объекту: другого ключа у них нет, а объекты не пересоздаются.

Роли `tablist`, `tab`, `tabpanel` и `aria-selected` говорят программам чтения с экрана, что это вкладки и какая выбрана.

Осталось использовать вкладки в окне. На вкладке «Характеристики» — список `<dl>`:

```html shared/game-details/game-details.html
<app-tabs>
  <app-tab label="Описание">
    <p class="description" [innerHTML]="game().description"></p>
  </app-tab>
  <app-tab label="Характеристики">
    @let players = game().players;
    <dl class="specs">
      <dt>Игроков</dt>
      <dd>
        @if (players.min === players.max) {
          {{ players.min }}
        } @else {
          {{ players.min }}–{{ players.max }}
        }
      </dd>
      <dt>Партия</dt>
      <dd>{{ game().playTime }} мин</dd>
      <dt>Возраст</dt>
      <dd>от {{ game().age }} лет</dd>
      <dt>Теги</dt>
      <dd>{{ game().tags.join(', ') }}</dd>
    </dl>
  </app-tab>
</app-tabs>
```

::: task
1. Напишите `Tab` (селектор `app-tab`) с входом `label` и сигналом `active`; хост скрыт, когда вкладка не выбрана.
2. Напишите `Tabs` (селектор `app-tabs`): запрос `contentChildren(Tab)`, сигнал `selected`, эффект, который переключает `active` у вкладок, и шаблон с кнопками и `<ng-content />`.
3. В `GameDetails` замените описание вкладками «Описание» и «Характеристики». Добавьте `Tabs` и `Tab` в `imports` окна: в его шаблоне используются оба.
:::

## Что получилось

Откройте «Остров сокровищ»: под ценой две вкладки, «Описание» выделена, под ней — описание. «Характеристики» — игроков 2–5, партия 45 мин, от 8 лет, теги «пираты, карты». У «Шахмат» игроков просто «2».

## Эксперимент: вкладка в `@if`

Вкладка «Акция» нужна только играм со скидкой. Добавьте её между двумя другими:

```html
@if (game().oldPrice) {
  <app-tab label="Акция"><p>Скидка до конца дня</p></app-tab>
}
```

У «Острова сокровищ» три кнопки: «Описание», «Акция», «Характеристики», у «Драконьей почты» — две. Запрос к содержимому видит вкладки внутри управляющих блоков и обновляется, когда блок их создаёт или удаляет. Уберите «Акцию».

## Эксперимент: вкладка поглубже

Оберните вкладку «Характеристики» в `<div>`: `<div><app-tab label="Характеристики">…</app-tab></div>`. Кнопка «Характеристики» исчезла, а содержимое вкладки не видно никогда.

По умолчанию `contentChildren()` ищет только среди **прямых** детей содержимого — элементов, которые лежат непосредственно между `<app-tabs>` и `</app-tabs>`. Обёрнутая в `<div>` вкладка не нашлась, поэтому `Tabs` не сделал ей кнопку и не поменял её `active`, а начальное `false` прячет её навсегда. Опция `descendants: true` ищет на любой глубине: с `contentChildren(Tab, { descendants: true })` вкладка снова на месте. Для вкладок прямые дети — правильное поведение: вложенный в вкладку другой `<app-tabs>` со своими вкладками не должен смешаться с внешними. Уберите `<div>`.

## `contentChild()` и запрос не туда

Для одного совпадения есть `contentChild()` — пара `viewChild()`. Например, `contentChild(Tab)` вернёт первую вкладку. У него `descendants` по умолчанию `true`.

И частая ошибка — перепутать запросы. Если в `Tabs` написать `viewChildren(Tab)`, получится пустой массив: в собственном шаблоне `Tabs` никаких `<app-tab>` нет, там только кнопки и `<ng-content>`. Мы проверили: `contentChild(Tab)` — вкладка «Описание», `viewChildren(Tab)` — 0.

```
GameDetails (шаблон)
└─ <app-tabs>              ← хост Tabs
   ├─ шаблон Tabs:         viewChildren
   │  кнопки, ng-content
   └─ содержимое:          contentChildren
      <app-tab>, <app-tab>
```

Вкладки объявлены в шаблоне `GameDetails`, создаёт их `GameDetails`, и входы им задаёт тоже он. `Tabs` получает их как содержимое и через запрос может прочитать или поменять их сигналы.

::: legacy Вы встретите в старом коде: @ContentChildren
```ts
@ContentChildren(Tab) tabs!: QueryList<Tab>;

ngAfterContentInit() {
  this.tabs.changes.subscribe(() => this.updateTabs());
}
```
Декоратор `@ContentChildren` заполнял поле `QueryList` к хуку `ngAfterContentInit`, а за изменениями набора следили подпиской на поток `changes`. Сигнальный запрос делает и то и другое сам: читайте его в `computed` или `effect`.
:::
