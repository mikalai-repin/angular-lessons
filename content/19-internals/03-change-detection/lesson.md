---
title: Обнаружение изменений изнутри
startFrom: custom
focus: main.ts
api: [LViewFlags, markViewDirty, markAncestorsForTraversal, планировщик, ApplicationRef.tick, Global и Targeted, NG0100, provideCheckNoChangesConfig]
---

В главе 6 мы вывели правила OnPush по журналу: компонент обновляется после события в своём шаблоне, при новом входе и при изменении сигнала, который читает шаблон. Теперь мы знаем, что представление — массив с ячейкой `FLAGS`. В этом шаге посмотрим, какие биты в ней ставят событие, вход и сигнал, кто запускает проверку и как она читает эти биты. Правила из главы 6 окажутся несколькими строками кода Angular.

## Журнал с причинами

В `debug/` появился `cd-log.ts` — журнал главы 6, который теперь знает больше:

- кто разбудил **планировщик** проверок: помощник оборачивает его метод `notify` (внутренний класс `ɵChangeDetectionScheduler`);
- почему обновлён каждый шаблон. В начале проверки помощник обходит дерево представлений и запоминает флаги каждого компонента: Angular сбрасывает их по ходу проверки. Обход — по ячейкам `CHILD_HEAD` и `NEXT` заголовка `LView`: первое дочернее представление или `LContainer` и следующее за ним.

::: task
В `main.ts` после запуска вызовите `logChangeDetectionReasons(appRef)` — рядом с журналом представлений.
:::

```ts main.ts {6,10-11}
bootstrapApplication(App, appConfig)
  .then((appRef) => {
    // Alt + щелчок по элементу — его представление в консоли
    logViewOnAltClick();
    // Каждая проверка приложения: что её запросило и почему обновлён каждый шаблон
    logChangeDetectionReasons(appRef);
  })
  .catch((err) => console.error(err));
```

`appRef` — `ApplicationRef`, которым разрешается `bootstrapApplication` (глава 1). Через его инжектор помощник находит планировщик.

## «В корзину»

Нажмите «В корзину» у первой карточки на главной:

```
Проверка [событие, корневой эффект, сигнал, новое представление, afterRender]: App (RefreshView), Home (RefreshView), GameCard (RefreshView), Header (сигнал), FlyingCovers (сигнал)
Проверка [сигнал, удалено представление]: FlyingCovers (сигнал)
```

В квадратных скобках — кто сообщил планировщику, после двоеточия — чьи шаблоны обновлены и почему. Источников много, а проверка одна: планировщик собирает сообщения и запускает её один раз. `событие` — щелчок, `сигнал` — изменились корзина и список летящих обложек, `новое представление` — обложка в `FlyingCovers`, `корневой эффект` — эффект сохранения корзины в `localStorage`, `afterRender` — Angular запланировал работу после отрисовки: так устроен `(animate.enter)` летящей обложки (глава 15). Мы проверили: без этой привязки источника `afterRender` в строке нет. Вторая строка — обложка долетела, `FlyingCovers` её убрал.

В скобках после имён — два разных механизма: `RefreshView` у цепочки от карточки до корня и `сигнал` у шапки. Разберём оба.

## Флаги представления

Ячейка `FLAGS` — набор битов (`LViewFlags` в исходниках). Для обнаружения изменений важны четыре:

| Флаг | Бит | Кто ставит |
|---|---|---|
| `Dirty` | 64 | событие, `markForCheck()`, новый вход OnPush-компонента |
| `RefreshView` | 1024 | событие и `markForCheck()` вне проверки, новое представление |
| `HasChildViewsToRefresh` | 8192 | сигнал в шаблоне потомка |
| `CheckAlways` | 16 | `ChangeDetectionStrategy.Eager` |

Есть и пятый признак, не бит: **потребитель-шаблон**, `REACTIVE_TEMPLATE_CONSUMER` (ячейка 24). Это узел графа сигналов с `kind: 'template'` из главы 3. Пока выполняется блок обновления, он — активный потребитель, и все прочитанные сигналы связываются с ним. Изменился сигнал — потребитель помечен «грязным».

**Событие.** Обёртка обработчика из главы 2 (`wrapListenerIn_markDirtyAndPreventDefault`) вызывает функцию `markViewDirty`. Её код в Angular 22.2 (здесь и дальше — с именами флагов вместо чисел):

```js
function markViewDirty(lView, source) {
  const bits = isRefreshingViews() ? DIRTY : REFRESH_VIEW | DIRTY;
  lView[ENVIRONMENT].changeDetectionScheduler?.notify(source);
  while (lView) {
    lView[FLAGS] |= bits;
    // … подняться к родителю, у корня — выйти
  }
}
```

Она будит планировщик и ставит `RefreshView` и `Dirty` представлению и **всем предкам** до корня. `ChangeDetectorRef.markForCheck()` — та же функция, только источник другой (`markForCheck` в журнале).

::: warning
В главе 6 мы сказали, что `markViewDirty` видели «в главе 3». Точнее: в главе 2 мы видели обёртку обработчика, а `markViewDirty` — функция, которую она вызывает. В главе 3 разбирали вторую функцию, для сигналов.
:::

**Сигнал.** Потребитель-шаблон, когда его помечают грязным, вызывает `markAncestorsForTraversal`:

```js
function markAncestorsForTraversal(lView) {
  lView[ENVIRONMENT].changeDetectionScheduler?.notify(MARK_ANCESTORS_FOR_TRAVERSAL);
  let parent = getLViewParent(lView);
  while (parent !== null) {
    if (parent[FLAGS] & HAS_CHILD_VIEWS_TO_REFRESH) break;
    parent[FLAGS] |= HAS_CHILD_VIEWS_TO_REFRESH;
    // … отсоединённое представление (detach) — тоже конец пути
    parent = getLViewParent(parent);
  }
}
```

Своему представлению она флагов не ставит — грязный уже потребитель. Предкам достаётся только «внутри есть кого обновить». Если у предка флаг уже стоит, подъём останавливается: дальше вверх путь уже размечен.

## Проверка: два режима

Планировщик откладывает проверку до кадра (глава 3) и вызывает `ApplicationRef.tick()`. Тот обходит корневые представления и для каждого вызывает `detectChangesInView`. Вот её суть (сокращено, без режима разработки):

```js
function detectChangesInView(lView, mode) {
  const flags = lView[FLAGS];
  const consumer = lView[REACTIVE_TEMPLATE_CONSUMER];
  let refresh = mode === GLOBAL && (flags & CHECK_ALWAYS || flags & DIRTY);
  refresh ||= flags & REFRESH_VIEW;
  refresh ||= consumer?.dirty && consumerPollProducersForChange(consumer);
  lView[FLAGS] &= ~(HAS_CHILD_VIEWS_TO_REFRESH | REFRESH_VIEW);
  if (refresh) {
    refreshView(lView); // блок обновления, затем дети — в режиме GLOBAL
  } else if (flags & HAS_CHILD_VIEWS_TO_REFRESH) {
    // только спуск: встроенные представления и дочерние компоненты — в режиме TARGETED
  }
}
```

**Режимов** обхода два:

- **`Targeted`** (точечный) — так начинается проверка в зонлесс-приложении. Обновляются только представления с `RefreshView` и с изменившимися сигналами. В остальные Angular заходит, только если у них стоит `HasChildViewsToRefresh`, и не обновляет их шаблон.
- **`Global`** (общий) — так проверяются дети представления, которое только что обновилось. Здесь в счёт идут ещё `Dirty` и `CheckAlways`.

Теперь правила главы 6 читаются по коду:

```
событие      RefreshView + Dirty: путь
             от компонента до корня
новый вход   Dirty ребёнку, пока родитель
             обновляется → он в Global
сигнал       грязный потребитель + флаг
             «спуститься» у предков
Eager        CheckAlways → только в Global,
             то есть когда родитель обновлён
```

В журнале «В корзину» это видно. `App`, `Home` и карточка — `RefreshView` от события. Шапка — `сигнал`: её шаблон читает `cart.count()`. Остальные одиннадцать карточек тоже читают корзину — в `inCart` и `available`. Их потребители перед проверкой были грязными: изменения в графе сигналов рассылаются без вычислений (push, глава 3). Но `consumerPollProducersForChange` пересчитал `available` и `inCart`, увидел те же числа с прежними версиями и ответил «не изменилось» (pull). Шаблоны не обновлялись. Как устроены эти версии — в шаге 5.

**Эксперимент.** Поставьте карточке `changeDetection: ChangeDetectionStrategy.Eager` (глава 6) и нажмите сердечко:

```
Проверка [событие, сигнал]: App (RefreshView), Home (RefreshView), GameCard (RefreshView), GameCard (Eager), GameCard (Eager), … (ещё 9), Header (сигнал)
```

`Home` обновлён — его дети проверяются в режиме `Global`, а там `CheckAlways` заставляет обновиться всех. Звёзды `Rating` внутри при этом не обновлены: они OnPush, а входы у них прежние. Уберите `Eager`.

## Сколько проходов

`tick()` не ограничивается одним обходом. Если во время проверки что-то снова пометило представление — эффект или `afterRenderEffect` записал сигнал, — Angular обходит дерево ещё раз. Так в главе 6 появилось `Tabs ×2`. Обходов внутри одного дерева — не больше 100, всего цикла приложения — не больше 10. Дальше Angular сдаётся с ошибкой `NG0103` «Infinite change detection…»: значит, компоненты помечают друг друга бесконечно.

## Повторная проверка в режиме разработки

После каждого `tick()` в режиме разработки Angular проверяет ещё раз — ничего не меняя, только сравнивая. Если привязка за это время изменилась, это ошибка `NG0100` (ExpressionChangedAfterItHasBeenChecked): шаблон зависит от чего-то, о чём Angular не знает.

**Эксперимент.** Добавьте в `Header` метод `protected stamp() { return Math.random(); }` и в начало `header.html` — `<span>{{ stamp() }}</span>`. Покликайте: ошибок нет. В зонлесс-приложении повторная проверка по умолчанию смотрит только представления, которые после проверки снова «грязные», а таких нет. Теперь добавьте в провайдеры `app.config.ts` `provideCheckNoChangesConfig({ exhaustive: true })` (импорт — из `@angular/core`):

```
ERROR RuntimeError: NG0100: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: '0.8954758006237175'. Current value: '0.17662374671805703'. Expression location: Header component.
```

В режиме `exhaustive` повторная проверка обходит все представления, как с `Eager`. `provideCheckNoChangesConfig` — `@developerPreview 20.0`. Опция `interval` запускает такую проверку ещё и по таймеру. Это ловит обычные поля, которые меняются, а Angular об этом не сообщают. Уберите метод и провайдер.

::: tip
Числа во флагах и источниках — из исходников 22.2. Сам журнал при обновлении Angular может сломаться, но идея останется: событие помечает путь до корня, сигнал — себя и путь для спуска, проверка решает по флагам.
:::

Что запомнить:

- событие и `markForCheck()` ставят `RefreshView` и `Dirty` всему пути до корня; сигнал помечает потребителя-шаблон и ставит предкам `HasChildViewsToRefresh`;
- зонлесс-проверка начинается в режиме `Targeted`: обновляет помеченное, остальное только проходит; дети обновлённого представления проверяются в режиме `Global`, где действуют `Dirty` (новый вход) и `CheckAlways` (`Eager`);
- грязный потребитель — ещё не обновление: Angular сверяет версии сигналов и пропускает шаблон, если значения прежние.

В приложениях на zone.js проверку запускает не планировщик, а сама зона — после каждой задачи, и в режиме `Global` от самого корня. В следующем шаге включим zone.js в магазине и сравним.
