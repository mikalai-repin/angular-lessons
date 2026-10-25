---
title: Строгие шаблоны
noSolution: true
focus: shared/game-card/game-card.html
api: [strictTemplates, NG8001, NG8002, extendedDiagnostics, NG8109, NG8117]
---

В превью шаблон проверял только JIT-компилятор при разборе и рантайм во время работы. Многие ошибки там выглядели как пустое место на странице, а то и вовсе никак. В главе 19 мы видели причину: AOT-компилятор переводит шаблон в TypeScript (блок проверки типов) и проверяет его вместе с остальным кодом. В проекте CLI эта проверка работает при каждой сборке — и в `ng serve` тоже. Посмотрим, насколько она строгая и что ловит.

## Строгий режим по умолчанию

Как мы выяснили в шаге 1, `strictTemplates` в Angular 22 включён, хотя в `tsconfig.json` его нет. Строгий режим — это набор проверок. Главные из них:

- **типы входов**: значение привязки `[value]="…"` должно подходить к типу входа;
- **`$event`**: у `(input)` на `<input>` это событие, а `$event.target` — `HTMLInputElement`; у выходов компонентов — тип из `output<T>()`;
- **`null` и `undefined`**: шаблон проверяется как код со `strict` — необязательное поле нельзя использовать, не проверив;
- **схема DOM**: неизвестный элемент или свойство — ошибка сборки, а не предупреждение в консоли;
- **контекст `@if`, `@for`, `@let`**: тип переменной из `@if (x; as y)`, `@for`, `@let` выводится и проверяется.

## Эксперименты

Мы сломали шаблоны магазина четырьмя способами и посмотрели, что скажут превью и `ng build`.

**1. Необязательное поле в арифметике.** В `game-card.html` цену заменили разницей цен:

```html shared/game-card/game-card.html
{{ game().price - game().oldPrice | price }}
```

`oldPrice` у игры необязательный (`oldPrice?: number`). Превью молча показывает у игр без скидки «не число ₽» — это `NaN` после пайпа. Сборка:

```text
✘ [ERROR] TS2532: Object is possibly 'undefined'.

    src/app/shared/game-card/game-card.html:62:5:
      62 │   {{ game().price - game().oldPrice | price }}
         ╵      ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  Error occurs in the template of component GameCard.
```

**2. Значение не того типа во входе.** Рейтингу передали строку:

```html shared/game-card/game-card.html
<app-rating [value]="'5'" readonly />
```

Превью рисует пять звёзд: сравнения `'5' >= star` в JavaScript работают и со строкой. Сборка:

```text
✘ [ERROR] TS2322: Type 'string' is not assignable to type 'number'.

      53 │   [value]="'5'"
         ╵    ~~~~~
```

**3. Неизвестный элемент и опечатка в свойстве.**

```html shared/game-card/game-card.html
<app-badge />
<img [scr]="game().cover" />
```

Здесь превью кое-что замечает, но только во время работы: `NG0304: 'app-badge' is not a known element` и `NG0303: Can't bind to 'scr'…` в консоли. Сборка не начнётся:

```text
✘ [ERROR] NG8001: 'app-badge' is not a known element:
1. If 'app-badge' is an Angular component, then verify that it is included
   in the '@Component.imports' of this component.
2. If 'app-badge' is a Web Component then add 'CUSTOM_ELEMENTS_SCHEMA' to the
   '@Component.schemas' of this component to suppress this message.

✘ [ERROR] NG8002: Can't bind to 'scr' since it isn't a known property of 'img'.
```

Коды разные, а ошибки те же: `NG0304`/`NG0303` — их «рантаймовые» версии, `NG8001`/`NG8002` — проверка компилятора.

**4. Сигнал без вызова.** В шапке забыли скобки:

```html layout/header/header.html
В корзине: {{ cart.count }} ·
```

Превью показывает «В корзине: [Computed: 0]» — так выглядит сигнал, превращённый в строку. Сборка проходит, но с двумя предупреждениями:

```text
▲ [WARNING] NG8109: count is a function and should be invoked: count()
▲ [WARNING] NG8117: Function in text interpolation should be invoked: count()
```

| Ошибка | Превью (JIT) | `ng build` (AOT) |
|---|---|---|
| `undefined` в арифметике | «не число ₽» | `TS2532`, сборка не удалась |
| строка во входе-числе | работает как будто верно | `TS2322` |
| неизвестный элемент, свойство | `NG0304`, `NG0303` в консоли | `NG8001`, `NG8002` |
| сигнал без `()` | «[Computed: 0]» | предупреждения `NG8109`, `NG8117` |

::: task
Повторите хотя бы один эксперимент в проекте CLI: сломайте шаблон, посмотрите на ошибку в терминале `ng serve` (он пересобирает при сохранении и печатает те же ошибки) — и верните как было. Если у вас стоит Angular Language Service, такие ошибки подчёркиваются прямо в редакторе.
:::

## Расширенная диагностика

Предупреждения в четвёртом опыте — не проверка типов: `cart.count` — допустимое выражение, функция в интерполяции. Это **расширенная диагностика** (extended diagnostics) — набор проверок на подозрительный, хотя и корректный код. Их коды — `NG81xx`. В главе 19 мы уже встречали одну из них — `NG8113` «All imports are unused» про пустые `imports`.

Расширенная диагностика работает только в строгом режиме. По умолчанию её находки — предупреждения. Строгость настраивается в `tsconfig.json`:

```json tsconfig.json
"angularCompilerOptions": {
  "extendedDiagnostics": {
    "defaultCategory": "error",
    "checks": {
      "interpolatedSignalNotInvoked": "error",
      "nullishCoalescingNotNullable": "suppress"
    }
  }
}
```

`defaultCategory` — для всех проверок сразу, `checks` — для отдельных: `error`, `warning` или `suppress` (выключить). С такой настройкой четвёртый опыт уже не собирается: `NG8109` и `NG8117` — две ошибки (`✘ [ERROR]`), сборка не удалась. Имена проверок и их коды — в документации angular.dev, раздел Extended diagnostics. Команды часто делают все предупреждения ошибками: предупреждения в длинном выводе сборки никто не читает.

## Как в настоящем проекте

Строгие шаблоны меняют способ работы. В превью проверить шаблон можно было только запуском и щелчками. В проекте CLI вы узнаёте об ошибке при сохранении файла, ещё до браузера, с точным местом в шаблоне. Это и есть главная причина держать `strictTemplates` включённым: шаблон становится таким же кодом, как TypeScript.

Код курса проверялся так же: каждое решение каждого шага собрано `ngc` со строгими шаблонами — без ошибок и предупреждений.

::: legacy Вы встретите в старом коде: fullTemplateTypeCheck и $any
В старых `tsconfig.json` встречается `"fullTemplateTypeCheck": true`. В компиляторе Angular 22 такой опции уже нет — строгость шаблонов задаёт только `strictTemplates`. А в шаблонах — `$any(…)`: функция компилятора, которая отключает проверку типа выражения (`$any($event.target).value`). В строгом коде `$any` — признак того, что тип можно было описать честно.
:::
