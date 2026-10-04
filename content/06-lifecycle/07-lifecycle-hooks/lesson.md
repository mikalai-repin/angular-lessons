---
title: Классические хуки
noSolution: true
focus: shared/game-details/game-details.ts
files: [main.ts, app.ts, app.html, app.css, shared/game-details/game-details.ts, shared/game-details/game-details.html, shared/game-details/game-details.css, shared/tabs/tabs.ts, shared/tabs/tabs.html, shared/tabs/tabs.css, shared/tabs/tab.ts, shared/tabs/tab.html, shared/countdown/countdown.ts, shared/countdown/countdown.html, shared/countdown/countdown.css, shared/game-card/game-card.ts, shared/game-card/game-card.html, shared/game-card/game-card.css, shared/rating/rating.ts, shared/rating/rating.html, shared/rating/rating.css, shared/quantity/quantity.ts, shared/quantity/quantity.html, shared/quantity/quantity.css, core/models.ts, core/games-data.ts, app.config.ts, styles.css]
api: [ngOnInit, ngOnChanges, ngOnDestroy, ngAfterViewInit, SimpleChanges]
---

Всё, что нужно было магазину в этой главе, мы сделали функциями: `effect`, `afterNextRender`, `afterRenderEffect`, `DestroyRef`. Но откройте почти любой проект на Angular, и вы увидите методы с именами `ngOnInit`, `ngOnChanges`, `ngOnDestroy`. Это **хуки жизненного цикла** (lifecycle hooks) — способ, которым Angular с первой версии сообщал компоненту о моментах его жизни. Они не устарели, и в этом шаге разберём, когда что вызывается и где они ещё уместны. Задания нет — только эксперимент.

## Хуки — методы с особыми именами

Хук — это метод класса. Если у компонента есть метод `ngOnInit`, Angular вызовет его в нужный момент. Чтобы не ошибиться в имени и сигнатуре, класс объявляет, что реализует интерфейс с тем же именем без `ng`:

```ts
export class GameDetails implements OnInit, OnDestroy {
  ngOnInit() { … }
  ngOnDestroy() { … }
}
```

Интерфейс ничего не делает во время выполнения: Angular ищет сами методы. Но с ним опечатка `ngOnInt` превратится в ошибку TypeScript, а не в метод, который никто не вызовет.

| Хук | Когда |
|---|---|
| `ngOnChanges(changes)` | изменились входы (и первый раз — до `ngOnInit`) |
| `ngOnInit()` | один раз, когда входы получили первые значения |
| `ngDoCheck()` | при каждой проверке компонента |
| `ngAfterContentInit()` / `Checked()` | содержимое (проекция) готово / проверено |
| `ngAfterViewInit()` / `Checked()` | шаблон и дочерние компоненты готовы / проверены |
| `ngOnDestroy()` | перед уничтожением |

## Эксперимент: порядок

Добавьте в `GameDetails` вывод в консоль во все интересные моменты — и хуки, и знакомые функции:

```ts shared/game-details/game-details.ts
export class GameDetails implements OnChanges, OnInit, AfterViewInit, OnDestroy {
  // … входы, выходы, dialogRef

  constructor() {
    console.log('constructor');
    effect(() => console.log('effect: inCart =', this.inCart()));
    inject(DestroyRef).onDestroy(() => console.log('DestroyRef.onDestroy'));
    afterNextRender(() => console.log('afterNextRender'));
    afterNextRender(() => this.dialogRef().nativeElement.showModal());
  }

  ngOnChanges(changes: SimpleChanges<GameDetails>) {
    console.log('ngOnChanges:', Object.keys(changes).join(', '));
  }

  ngOnInit() {
    console.log('ngOnInit:', this.game().title);
  }

  ngAfterViewInit() {
    console.log('ngAfterViewInit');
  }

  ngOnDestroy() {
    console.log('ngOnDestroy');
  }
}
```

Интерфейсы `OnChanges`, `OnInit`, `AfterViewInit`, `OnDestroy`, тип `SimpleChanges`, а также `DestroyRef`, `effect` и `inject` импортируются из `@angular/core`. Откройте «Драконью почту», нажмите в окне «В корзину» и закройте окно:

```
constructor
ngOnChanges: game, inCart
ngOnInit: Драконья почта
effect: inCart = 0
ngAfterViewInit
afterNextRender
— «В корзину» —
Корзина: Драконья почта × 1
ngOnChanges: inCart
effect: inCart = 1
— закрыть —
ngOnDestroy
DestroyRef.onDestroy
```

Сравните со схемой из шага 1:

- `ngOnChanges` и `ngOnInit` — сразу после записи входов. В `ngOnInit` входы уже есть: `this.game()` не бросает NG0950. Поэтому в старом коде вся инициализация, зависящая от входов, — в `ngOnInit`, а не в конструкторе;
- эффект — после них, во время проверки компонента;
- `ngAfterViewInit` — когда создан шаблон и дочерние компоненты. Это ещё **внутри** проверки, а `afterNextRender` — после того, как отрисовка закончена во всём приложении;
- `ngOnChanges` вызывается при каждом изменении входа, в том числе сигнального. `changes` — объект, где для каждого изменившегося входа лежат `previousValue`, `currentValue` и `firstChange`. Тип `SimpleChanges<GameDetails>` знает имена и типы входов: `changes.inCart?.currentValue` — `number`;
- при уничтожении `ngOnDestroy` выполняется раньше функций `DestroyRef`.

Уберите эксперимент.

## Хуки или функции

Каждой задаче из таблицы теперь соответствует инструмент на сигналах:

| Задача | Хуки | Сейчас |
|---|---|---|
| посчитать из входа | `ngOnChanges` / `ngOnInit` + поле | `computed` |
| отреагировать на вход | `ngOnChanges` | `effect` |
| работа с DOM | `ngAfterViewInit` | `afterNextRender`, `afterRenderEffect` |
| уборка | `ngOnDestroy` | `DestroyRef` |

Сигнальный вариант обычно лучше: `computed` пересчитывается сам, когда меняется любой из входов, и не нужно разбирать `changes` по именам; `DestroyRef` записывается рядом с ресурсом; функции после отрисовки не выполняются на сервере.

Когда хуки уместны:

- **`ngOnInit`** — привычное место для однократного действия, которому нужны входы, например начальной загрузки данных по `id`. Работает и сейчас. Но если загрузка должна повториться при смене `id`, нужен не `ngOnInit`, а ресурс от сигнала (глава 11);
- **`ngOnDestroy`** — то же, что `DestroyRef`, но методом класса. Удобен, когда уборка затрагивает несколько полей;
- **`ngOnChanges`** — когда нужно знать **прошлое** значение входа (`previousValue`). Сигналы хранят только текущее; для «было → стало» в сигнальном мире есть `linkedSignal` с `previous` (глава 3);
- **`ngDoCheck`** и `…Checked` — почти никогда: они вызываются на каждой проверке, и тяжёлый код в них замедляет всё приложение.

Хуки — действующий API: у их интерфейсов в `@angular/core` нет пометки `@deprecated`, а документация к `OnChanges` прямо говорит, что `ngOnChanges` получает и изменения сигнальных входов. Встретив их в проекте, не спешите переписывать — просто знайте, что для нового кода есть функции на сигналах.

::: deep Под капотом: откуда Angular знает о хуках
Хуки ищет не компилятор, а сам Angular во время выполнения: когда компонент создаётся впервые, Angular смотрит на прототип класса. Если там есть `ngOnInit`, `ngOnChanges` или `ngDoCheck`, ссылки на них попадают в списки хуков представления **родителя** (`preOrderHooks`). Angular выполняет эти списки, когда обновляет шаблон родителя, — поэтому `ngOnInit` дочернего компонента вызывается во время проверки родителя, сразу после записи входов.

Если у прототипа есть `ngOnChanges`, Angular ещё и подменяет функцию записи входов этого компонента: новая не только записывает значение, но и складывает пару «было → стало» в служебное поле экземпляра `__ngSimpleChanges__`. Из него и собирается объект `changes`. У компонента без `ngOnChanges` прошлые значения входов никто не хранит.
:::
