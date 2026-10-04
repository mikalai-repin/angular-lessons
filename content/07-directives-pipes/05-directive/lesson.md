---
title: Директива атрибута
startFrom: custom
focus: shared/tooltip.ts
files: [main.ts, app.ts, app.html, app.css, shared/tooltip.ts, shared/price-pipe.ts, shared/players-pipe.ts, shared/duration-pipe.ts, shared/plural.ts, shared/game-details/game-details.ts, shared/game-details/game-details.html, shared/game-details/game-details.css, shared/game-card/game-card.ts, shared/game-card/game-card.html, shared/game-card/game-card.css, shared/rating/rating.ts, shared/rating/rating.html, shared/rating/rating.css, shared/quantity/quantity.ts, shared/quantity/quantity.html, shared/quantity/quantity.css, shared/tabs/tabs.ts, shared/tabs/tabs.html, shared/tabs/tabs.css, shared/tabs/tab.ts, shared/tabs/tab.html, shared/countdown/countdown.ts, shared/countdown/countdown.html, shared/countdown/countdown.css, shared/load-more/load-more.ts, shared/load-more/load-more.html, shared/load-more/load-more.css, core/models.ts, core/games-data.ts, app.config.ts, styles.css]
api: ['@Directive', селектор атрибута, host, 'input()', NG0303]
---

Стикер «Хит» на карточке ничего не объясняет: за что он? Звёзды рейтинга показывают оценку примерно — 4,6 или 4,7, по ним не понять. Хорошо бы при наведении мыши показывать подсказку: «Рейтинг 4,8 и выше», «Рейтинг 4,7».

Подсказка нужна разным элементам: стикеру `<span>`, компоненту `<app-rating>`. Обернуть каждый в компонент-подсказку — лишний элемент в разметке и лишняя вложенность. Нам нужно другое: **добавить поведение** элементу, который уже есть. Для этого в Angular есть директивы:

```html
<span sticker class="sticker" appTooltip="Рейтинг 4,8 и выше">Хит</span>
```

Атрибут `appTooltip` — и у стикера появилась подсказка.

## Директива — компонент без шаблона

**Директива атрибута** (attribute directive) — класс с декоратором `@Directive`. Её селектор — не имя элемента, а атрибут в квадратных скобках: `[appTooltip]`. Angular ищет в шаблонах элементы с таким атрибутом и на каждом создаёт экземпляр директивы.

Всё, что вы знаете о компонентах, у директивы есть: `selector`, входы и выходы, `host`, `inject()`, `DestroyRef`. Нет только шаблона и стилей: директива не рисует свой DOM, а работает с элементом, на котором стоит. Этот элемент — **хост** директивы, как у компонента.

## Подсказка

```ts shared/tooltip.ts
// Подсказка при наведении: <span appTooltip="Текст подсказки">
@Directive({
  selector: '[appTooltip]',
  host: {
    '(mouseenter)': 'show()',
    '(mouseleave)': 'hide()',
  },
})
export class Tooltip {
  // Текст подсказки. Вход называется так же, как селектор: текст пишется прямо в атрибуте appTooltip
  readonly appTooltip = input.required<string>();

  // Хост — элемент, на котором стоит директива
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  // Элемент подсказки, пока она на экране
  private tip: HTMLElement | null = null;

  constructor() {
    // Хост уничтожен, пока подсказка видна (карточку убрал фильтр), — убрать и подсказку
    inject(DestroyRef).onDestroy(() => this.hide());
  }

  protected show() {
    this.hide();
    this.tip = document.createElement('div');
    this.tip.className = 'tooltip';
    this.tip.textContent = this.appTooltip();
    document.body.append(this.tip);
    // Под хостом, но не за правым краем страницы
    const rect = this.host.getBoundingClientRect();
    const left = Math.min(rect.left, document.documentElement.clientWidth - this.tip.offsetWidth - 8);
    this.tip.style.left = `${left + window.scrollX}px`;
    this.tip.style.top = `${rect.bottom + window.scrollY + 6}px`;
  }

  protected hide() {
    this.tip?.remove();
    this.tip = null;
  }
}
```

Что здесь важно:

- **селектор `[appTooltip]` и вход `appTooltip` — одно имя.** Это обычный приём для директив с одним главным значением: атрибут и включает директиву, и передаёт ей текст. Можно и статически, `appTooltip="Текст"`, и привязкой, `[appTooltip]="выражение"` — в обоих случаях атрибут совпадает с селектором. Префикс `app` — как у селекторов компонентов: чтобы не столкнуться со стандартными атрибутами и чужими директивами;
- **`host`** — те же обработчики событий хоста, что у `Rating` в главе 5. Здесь — наведение мыши и уход с элемента;
- **`inject(ElementRef)`** даёт хост-элемент: стикер, звёзды — что угодно. Директива не знает, на чём стоит, и ей это не нужно;
- **элемент подсказки** создаётся в обход шаблонов — шаблона у директивы нет. Поэтому и убирать его надо самим: в `hide()` и в `DestroyRef.onDestroy` — правило «создал сам — убери сам» из главы 6. Подсказка добавляется в `document.body`, а не внутрь хоста: так её не обрежет `overflow` у родителей и не исказит вёрстку хоста;
- **стили** подсказки — класс `.tooltip` в глобальном `styles.css` (он там с начала главы). Своих стилей у директивы нет, а стили компонентов до элемента в `<body>` не дотянутся: эмулированная инкапсуляция привязывает их к элементам шаблона компонента.

## Где подсказки

Директиву, как компонент и пайп, добавляют в `imports` того компонента, в шаблоне которого она стоит. Стикеры живут в шаблоне `App` (вспомните проекцию содержимого из главы 5), а звёзды — в шаблоне `GameCard`:

```html app.html
<span sticker class="sticker" [appTooltip]="'Рейтинг ' + (hitRating | number) + ' и выше'">Хит</span>
…
<span sticker class="sticker sale" appTooltip="Цена действует до конца дня">
  −{{ 1 - game.price / oldPrice | percent }}
</span>
```

```html shared/game-card/game-card.html
<app-rating [value]="game().rating" readonly [appTooltip]="'Рейтинг ' + (game().rating | number)" />
```

Подсказка «Хит» не повторяет число 4,8 вручную, а берёт `hitRating` — ту же константу, по которой стикер и выдаётся, и форматирует пайпом `number`: «4,8», а не «4.8». Пайпы работают в любом выражении шаблона, и в привязке к входу директивы тоже. Скобки вокруг пайпа нужны — помните приоритет `|` из шага 1.

На `<app-rating>` директива стоит рядом с компонентом. На одном элементе может быть сколько угодно директив, но не больше одного компонента.

::: task
1. В `shared/tooltip.ts` напишите директиву `Tooltip` с селектором `[appTooltip]`: обязательный вход `appTooltip` с текстом, по `mouseenter` — показать подсказку под хостом, по `mouseleave` — убрать. Подсказку убирает и уничтожение директивы.
2. Добавьте подсказки: стикеру «Хит» — «Рейтинг 4,8 и выше» (из `hitRating` и пайпа `number`), стикеру скидки — «Цена действует до конца дня», звёздам в карточке — «Рейтинг 4,6».
3. В `imports`: `Tooltip` и `DecimalPipe` — у `App` и у `GameCard`.
:::

## Что получилось

Наведите мышь на стикер «−20 %» у «Острова сокровищ»: под ним появится тёмная подсказка «Цена действует до конца дня». Уведите мышь — подсказка исчезнет. Над звёздами — «Рейтинг 4,6», над стикером «Хит» у «Ночного экспресса» — «Рейтинг 4,8 и выше».

Наведите на звёзды карточки и, не уводя мышь, наберите в поиске то, чего нет: карточка исчезла, и подсказка вместе с ней — сработал `onDestroy`.

## Эксперимент: забытый импорт

Уберите `Tooltip` из `imports` у `GameCard`. Подсказок над звёздами нет, а в консоли — по ошибке на каждую карточку:

```
NG0303: Can't bind to 'appTooltip' since it isn't a known property of 'app-rating' (used in the 'GameCard' component template).
```

Angular не нашёл директиву для `[appTooltip]` и решил, что это привязка к свойству DOM, — а такого свойства у элемента нет. В настоящем проекте это ошибка сборки NG8002.

А теперь уберите `Tooltip` из `imports` у `App`. Для стикера «Хит» в консоли та же NG0303, только про `span` в шаблоне `App`, а для стикера скидки — ничего: статический атрибут `appTooltip="…"` без директивы — просто атрибут HTML, Angular не к чему придраться. Подсказки молча нет. Верните импорты.

## Чего не умеет наша подсказка

Подсказка показывается только мышью. С клавиатуры к стикеру не попасть, а на телефоне нет наведения. Поэтому в подсказку кладут только дополнительную информацию: всё важное должно быть видно и без неё. У звёзд, например, уже есть подпись для экранного диктора из шага 2.

::: tip Как в настоящем проекте
`ng generate directive shared/tooltip` создаёт `shared/tooltip.ts` с классом `Tooltip` и селектором `[appTooltip]` (префикс берётся из настроек проекта) и тест рядом. Готовую подсказку с позиционированием у краёв экрана, показом с клавиатуры и атрибутами доступности даёт библиотека Angular Material — `matTooltip`. Она построена так же: директива атрибута. Мы вернёмся к библиотекам, когда разберёмся, как устроено всё под ними.
:::

::: legacy Вы встретите в старом коде: @HostListener и ElementRef в конструкторе
```ts
@Directive({ selector: '[appTooltip]' })
export class TooltipDirective {
  @Input() appTooltip = '';

  constructor(private el: ElementRef) {}

  @HostListener('mouseenter') show() { … }
  @HostListener('mouseleave') hide() { … }
}
```
Декораторы `@HostListener` и `@Input`, зависимость через конструктор, суффикс `Directive` в имени класса и файл `tooltip.directive.ts` — так директивы писали годами, и так выглядит большая часть существующего кода. Работает и сейчас, но поле `host`, функции `input()`/`inject()` и имена без суффикса — то, что сегодня советует руководство по стилю Angular и создаёт `ng generate`.
:::
