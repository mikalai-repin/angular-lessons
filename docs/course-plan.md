# Программа курса

> **Состояние:** у написанных глав (1–10) в таблицах — **фактический** состав шагов: папка шага, что он вводит, с чего начинается (`custom` — своя заготовка поверх результата прошлого шага, `noSolution` — шаг без задания). У остальных — план: он уточняется при написании главы, а после неё таблица заменяется фактической.

Курс состоит из **трёх частей**:

1. **Основы** (главы 1–8). Компоненты, шаблоны, сигналы, DI. На выходе — витрина магазина на одной странице: карточки, корзина в шапке.
2. **Приложение** (главы 9–18). Состояние, роутинг, HTTP, RxJS, формы, авторизация, анимации, `@defer`, тесты, админка, NgRx. На выходе — полноценный «Ход конём».
3. **Глубже** (главы 19–22). Как Angular устроен внутри, настоящий проект на Angular CLI (AOT, SSR, деплой), разбор кода angular.dev, финальный проект.

Каждая глава — 5–10 **шагов**. Шаг — одна идея и одно небольшое изменение кода с видимым результатом. В конце главы — **практикум**: самостоятельное задание, решение показывается только по кнопке.

Врезки **«Под капотом»** — необязательные блоки о внутреннем устройстве. Врезки **«Вы встретите в старом коде»** — как то же самое писали до Angular 17–20 (`*ngIf`, `@Input()`, NgModule, zone.js). Ученику придётся читать старый код, но писать его он не должен.

Обозначения в плане ненаписанных глав:
- **API** — что впервые вводится в шаге.
- **Результат** — что ученик видит в превью после шага.

---

## Часть 1. Основы

### Глава 1. Первое приложение

Цель: понять, что такое Angular, чем он отличается от библиотек вроде React, и запустить первое приложение.

| Шаг | Что вводит | Старт |
|---|---|---|
| 01-what-is-angular | Что такое Angular, AOT/JIT, интерфейс курса (`noSolution`) | Демо-магазин (роутинг, бэкенд, поиск; ведётся руками, на нём работают `checks/platform.mjs` и `checks/preview.mjs`) |
| 02-first-component | `@Component`, `selector`, `template`, NG0906, селектор по умолчанию `ng-component` | `main.ts` + `app.ts` без декоратора (custom) |
| 03-bootstrap | `bootstrapApplication`, `ApplicationRef`, NG05104 (выводится дважды: `ErrorHandler` и `.catch`), `ng-version` | решение 02 |
| 04-template-files | `templateUrl`, `styleUrl`, глобальный `styles.css`, инкапсуляция (`_ngcontent-ng-c…`) | custom: `app.html` с TODO, `app.css` и `styles.css` готовые |
| 05-app-config | `ApplicationConfig`, `providers`, `provideBrowserGlobalErrorListeners` | custom: `app.config.ts` с TODO |
| 06-debugging | Метки ошибок TS / Сборка / выполнение, чтение ошибки JIT (`@4:28` — с нуля), коды NG, `ng.getComponent($0)` | custom, **`brokenStart: true`**: `styleUrl: './app.scss'`, `</h2>`, `appRef.component` |
| 07-compiler | `ɵcmp.template`, инструкции, `consts`, `rf & 1` / `rf & 2`, сравнение с AOT (`ngc`) | решение 06 (`noSolution`) |

### Глава 2. Шаблоны и привязки

Цель: связать данные класса с разметкой и обработать действия пользователя.

| Шаг | Что вводит | Старт |
|---|---|---|
| 01-interpolation | Вводный шаг главы, `{{ }}`, выражения шаблона и их ограничения, `protected readonly` | custom: решение 1.7, `main.ts` как в `ng new`, карточка в `app.html` статичной разметкой, `app.css` со стилями всей главы |
| 02-property-binding | `[src]`, `[alt]`, `[disabled]`, свойство DOM и атрибут HTML, NG0303 / NG8002, `inStock: number` | решение 01 |
| 03-attr-class-style | `[attr.aria-label]` (рейтинг `role="img"`), `[class.sold-out]`, `[style.width.%]`, групповые `[class]`/`[style]`, legacy `ngClass` | решение 02 |
| 04-events | `(click)`, `(keydown.enter)`, `$event`, именование обработчиков | решение 03 |
| 05-template-refs | `#searchBox`, `[hidden]`, загадка «шаблон обновляется только после событий» | решение 04 |
| 06-let | `@let soldOut`, `@let discount`, `toFixed` вместо `Math`, ошибки AOT NG8015–8017 | решение 05 |
| 07-security | экранирование интерполяции, `[innerHTML]`, санитизация, `unsafe:`, `DomSanitizer` (упоминание) | решение 06 |
| 08-practice | практикум: один объект `game = GAMES[0]`, характеристики, текст кнопки, `[hidden]` для скидки; «Итоги главы» | custom: + `core/models.ts`, `core/games-data.ts`, TODO в `app.ts` |
| 09-template-context | `ɵcmp.template`: блок обновления, `ctx.`, `textInterpolateN`, `domProperty` + санитайзер, `@let` → `const`, обработчики и `markViewDirty` | решение 08 (`noSolution`) |

### Глава 3. Сигналы

Цель: понять реактивность Angular — главное изменение последних лет.

| Шаг | Что вводит | Старт |
|---|---|---|
| 01-problem | Вводный шаг главы; поле в `(click)` обновляет экран, в `setTimeout` — нет (отставание на одно нажатие); зонлесс; OnPush и эксперимент с `Eager`; legacy zone.js | custom: решение 2.8 + «В корзине: 0» в шапке, `app.css` со стилями всей главы, TODO в `app.ts` |
| 02-signal | `signal`, чтение вызовом, `set`/`update`, `readonly`; `{{ cartCount }}` → `[Signal: 0]`, AOT NG8109; TS2540; `signal(1)` в консоли превью; в конце задержка убирается | решение 01 |
| 03-computed | переключатель игр (`gameIndex` + `computed` `game`/`soldOut`/`discount`), «храните минимум», ленивость и кэш (эксперимент с `console.log`), `@let` → `computed`, TS2339, NG0600 | решение 02 |
| 04-immutability | `CartItem`, `cart = signal<CartItem[]>`, `cartCount`/`cartTotal`/`cartSummary`; эксперимент с `push` (мини-корзина без списка, шапка `0 · 0 ₽`), `Object.is`, `readonly CartItem[]`, `equal` | решение 03 |
| 05-effect | `effect` в конструкторе (лог корзины), контекст внедрения, NG0203, время запуска и объединение изменений, «когда эффект не нужен», `onCleanup`, эффекты компонента и корневые | решение 04 |
| 06-untracked | название открытой игры в логе через `untracked`, реактивный контекст, чужой код в эффектах | решение 05 |
| 07-linked-signal | выбор количества `linkedSignal<number>(() => (this.game().inStock > 0 ? 1 : 0))`, литеральный тип `0 \| 1`, ловушка с `soldOut()`, полная форма `source`/`computation`/`previous` | решение 06 |
| 08-practice | практикум: `inCart`, `available`, `deliveryLeft`, «Убрать», «Очистить», склад, бесплатная доставка от `FREE_DELIVERY_FROM = 5000`; «Итоги главы» | custom: TODO в `app.ts`/`app.html`, константа `FREE_DELIVERY_FROM` |
| 09-signal-graph | граф сигналов магазина (`signal-graph.ts` — помощник по внутренним полям узлов), производители и потребители, активный потребитель, динамические зависимости, push-pull, отсечение по равенству, живые потребители, `markAncestorsForTraversal`, планировщик, `debugName` в AOT | custom: решение 08 + `signal-graph.ts` (`noSolution`) |

### Глава 4. Управляющие блоки

| Шаг | Что вводит | Старт |
|---|---|---|
| 01-if | вводный шаг главы; `@if`, `as` (сужение типа в AOT, ловушка с `0`), `@else if` / `@else` — строка наличия (`FEW_LEFT = 5`), все `[hidden]` → `@if` (кроме «Ищем»), `@if` против `[hidden]`; legacy `*ngIf`, миграция `control-flow` | custom: решение 3.8, `app.css` со стилями всей главы |
| 02-for | каталог-сетка `@for (game of games; track game.id)`, зачем `track`, `@let` и `@if` внутри `@for`; legacy `*ngFor` + `trackBy` | custom: из `app.ts` убраны сигналы открытой игры и `linkedSignal`, `games = GAMES`, `addToCart(game)`, `inCart` — `Map`; в `app.html` TODO на месте каталога, мини-корзина наверху |
| 03-for-variables | строки корзины `@for (item of cart(); track item.game.id)`, `$index` (номер), `$even` («зебра»), таблица переменных, `let i = $index`; `changeQuantity`, `removeFromCart` | решение 02 |
| 04-empty | `query` + `visibleGames` (название и теги), `(input)="query.set(…)"`, `@empty`; «Ищем» и `search()` удалены | решение 03 |
| 05-switch | бейдж категории `@switch` с пятью `@case` и `@default never;`, объединение `@case`, словарь `Record` как альтернатива; legacy `ngSwitch` | решение 04 |
| 06-ng-template | обзор (`noSolution`): `<ng-container>`, `<ng-template>` + `NgTemplateOutlet` (`priceTpl`, `let-game`, `$implicit`), `let-` — `any`; блоки — тоже шаблоны | решение 05 |
| 07-practice | практикум: «Только в наличии», сортировка (`SortKey`, `changeSort`), «Сбросить фильтры» с `[value]`/`[checked]`; «Итоги главы» | custom: TODO в `app.ts` и `app.html` |
| 08-track | наблюдатель `dom-watch.ts` (`MutationObserver`: создано / перемещено / удалено / тексты), `track game.id` / `$index` / копии + `track game` (NG0956) / `game.category` (NG0955), `ɵɵrepeaterCreate`, алгоритм `reconcile` | custom: решение 07 + `dom-watch.ts` (`noSolution`) |

### Глава 5. Компоненты и их связь

Цель: разбить интерфейс на компоненты и связать их.

| Шаг | Что вводит | Старт |
|---|---|---|
| 01-component | вводный шаг главы, дерево компонентов; `GameCard` (`shared/game-card/`), `selector`, `imports`, NG0304 / NG8001, короткие классы в стилях компонента; 12 одинаковых карточек (`game = GAMES[0]`); эксперимент «`.tile` в `app.css` не действует»; legacy `NgModule` | custom: решение 4.7, `app.css` очищен от большой карточки главы 3, стили плитки — блоком в конце (ученик удаляет), стили главы; заготовки `game-card.ts`/`.html`, готовый `game-card.css` |
| 02-inputs | `input.required<Game>()`, `input(0)` (`inCart`), `[game]`, TS2339 на `set`, `@let category` для `@default never;` (AOT TS2322), NG0950 / NG8008 / NG0303 / NG8002 / TS2322; эксперимент с начальной корзиной; legacy `@Input()` | решение 01 |
| 03-outputs | `output()`, `emit()`, `(add)`, `$event` и `output<T>()`, TS2345, «данные вниз — события вверх», не всплывает, синхронно; эксперимент с выходом `click`; legacy `EventEmitter` | решение 02 |
| 04-model | `Rating` (`shared/rating/`), `model(0)`, `valueChange`, `[(value)]="minRating"` (без вызова; `Unsupported expression in a two-way binding`), фильтр «Рейтинг от» с половинками, `@if` в звёздах; эксперимент «односторонняя привязка к модели»; `input` + `linkedSignal` как черновик; `ɵɵtwoWayBindingSet` | custom: решение 03 + заготовки `rating.ts`/`.html`, готовый `rating.css` |
| 05-input-transforms | `readonly` с `booleanAttribute` (без него `''` → ложь, AOT TS2322), `numberAttribute`, свои преобразования, `alias`; legacy сеттеры и `coerceBooleanProperty` | решение 04 |
| 06-content-projection | стикеры «Хит» (`HIT_RATING = 4.8`) и «Скидка», `<ng-content select="[sticker]">`, слот по умолчанию, `@if` с одним корнем, NG8011, стили содержимого — у родителя, запасное содержимое | решение 05 |
| 07-host | `host` у `Rating`: `role` img/slider, `aria-*`, `tabindex`, `[class.readonly]`, `(keydown.arrowright/left)` → `step(±0.5)`; `:host`, `:host(:focus-visible)`, `:host(.readonly)`; `hostBindings`; legacy `@HostBinding`/`@HostListener` | решение 06 |
| 08-styles | карточка без `<article>`: `host: { role: 'article', '[class.sold-out]' }`, `:host`, `:host(.sold-out)`; таблица «что куда достаёт»; эксперименты `ViewEncapsulation.None` и `ShadowDom`; legacy `::ng-deep` | решение 07 |
| 09-practice | практикум: `Quantity` (`shared/quantity/`, `model.required`, `min`/`max` с `numberAttribute`), `[value]` + `(valueChange)` вместо `[(value)]="item.quantity"` (мутация — шапка не обновляется), `setQuantity`; «Итоги главы» | custom: заготовки `quantity.ts`/`.html`, готовый `quantity.css`, TODO в `app.ts`/`app.html` |
| 10-encapsulation | `_nghost`/`_ngcontent`, идентификатор компонента, переписанные селекторы, специфичность, `<style>` появляется/удаляется (5 → 6 → 5 с `Quantity`), компонент без стилей → `None`, `%COMP%` и `%NS%` (`provideCssVarNamespacing`) в AOT, теневой DOM | решение 09 (`noSolution`) |

### Глава 6. Жизненный цикл и DOM

| Шаг | Что вводит | Старт |
|---|---|---|
| 01-lifecycle | вводный шаг главы; окно «Подробнее» (`@if` создаёт/уничтожает `GameDetails`), выход `open` у карточки, схема жизни компонента; эксперименты: NG0950 в конструкторе, `inject(ElementRef)` — хост пуст и не в документе, эффект — до обновления шаблона, NG0203; legacy — DI через конструктор | custom: решение 5.9 + готовый `GameDetails` (`<dialog open>` + `.backdrop`), стили `.title-button`, TODO в карточке и `App` |
| 02-view-child | `viewChild.required<ElementRef<HTMLInputElement>>('searchBox')`, фокус после «Сбросить фильтры» (без него — `BODY`); `viewChildren` — сигнал, видит только свой шаблон (1 `Rating` из 13), `read: ElementRef`, NG0951; legacy `@ViewChild`/`QueryList` | решение 01 |
| 03-after-next-render | `<dialog>` + `showModal()` в `afterNextRender`, `(close)`, `::backdrop`; эксперименты: конструктор (NG0951), `effect` (работает, но заголовок пуст), `afterEveryRender`; SSR; фазы — `deep` | решение 02 |
| 04-destroy-ref | `Countdown` (`shared/countdown/`): сигнал `now` + `setInterval` + `DestroyRef.onDestroy`; эксперимент «три открытия — три таймера»; что убирать самим, `host`-слушатели снимаются; `onCleanup` против `DestroyRef`; legacy `ngOnDestroy` | custom: заготовка `countdown.ts` с готовыми `untilMidnight`/`formatTime`, готовые `.html`/`.css`, TODO в окне |
| 05-content-children | `Tabs`/`Tab` (`shared/tabs/`): `contentChildren(Tab)`, `Tab.active` — сигнал, который меняет эффект `Tabs`, `[hidden]` у хоста; вкладка «Характеристики» (`<dl class="specs">`); эксперименты: вкладка в `@if`, в `<div>` (`descendants`), `contentChild`, `viewChildren(Tab)` = 0; legacy `@ContentChildren` | custom: заготовки `tabs.ts`, `tabs.html`, `tab.ts`, готовые `tabs.css` (с `.ink`), `tab.html`; `.specs` в `game-details.css` |
| 06-after-render-effect | полоска под вкладкой: `viewChildren('tabButton')`, сигнал `ink`, `afterRenderEffect({ read })`; фазы; эксперименты: `earlyRead` (0 при открытии), `effect` (отставание на отрисовку: 86/110 вместо 83/116), счёт запусков против `afterEveryRender` | решение 05 |
| 07-lifecycle-hooks | `ngOnChanges` (`SimpleChanges<T>`), `ngOnInit`, `ngAfterViewInit`, `ngOnDestroy` — порядок по логу вместе с `effect`/`afterNextRender`/`DestroyRef`; хуки против функций (`noSolution`) | решение 06 |
| 08-practice | практикум: `LoadMore` (`shared/load-more/`, `inject(ElementRef)`, `IntersectionObserver` в `afterNextRender`, `DestroyRef`), `PAGE_SIZE = 6`, `shownCount = linkedSignal<Game[], number>`, `shownGames`, `showMore`; «Итоги главы» | custom: заготовки `load-more.ts`/`.html`, готовый `.css`, TODO в `app.ts`/`app.html` |
| 09-change-detection | что такое проверка, дерево представлений, журнал `cd-log.ts` (`ng.ɵsetProfiler`): «В корзину», «+», тик таймера, вкладка, `Eager`; планировщик; legacy `Default`/zone.js/`markForCheck` (`noSolution`) | custom: решение 08 + `cd-log.ts`, `main.ts` вызывает `logChangeDetection()` |

### Глава 7. Директивы и пайпы

| Шаг | Что вводит | Старт |
|---|---|---|
| 01-builtin-pipes | вводный шаг главы; пайп, параметры через `:`, встроенные пайпы (таблица), `LOCALE_ID` + `registerLocaleData` (провайдер — коротко, подробно в гл. 8), `currency: 'RUB' : 'symbol' : '1.0-0'` в карточке, `percent` на стикере («−20 %», приоритет `\|`), `date: 'HH:mm:ss' : 'UTC'` в `Countdown` (`formatTime` удалена); эксперименты: без `LOCALE_ID`, без данных (NG02100/NG0701), скобки (`−NaN`), `json` | custom: решение 6.8 + `.tooltip`/`.lazy` в `styles.css`, `.meta` в `game-card.css`, TODO в `app.config.ts`, `app.html`, `game-card.html`, `countdown.html` |
| 02-custom-pipe | `@Pipe`, `transform`, `PipeTransform`, `inject(LOCALE_ID)`, `formatCurrency`; `price` во всех восьми местах (`App`, `GameCard`, `GameDetails`); `formatNumber` в `Rating` (`label` — пайпы в `host` нельзя); NG0302 / NG8004, TS2345 (`∞ ₽` в JIT) | custom: заготовка `price-pipe.ts`, TODO в `rating.ts` |
| 03-pipe-params | `players` (`Game['players']`), `duration` с параметром `format: 'short' \| 'long'`, готовый `plural.ts` (`Intl.PluralRules`); строка `.meta` в карточке, характеристики в окне; цепочка `\| uppercase`; TS2345 для `'lng'`; `deep` «пайп или метод» | custom: `plural.ts`, заготовки `players-pipe.ts`/`duration-pipe.ts`, TODO в `game-card.html`/`game-details.html` |
| 04-pure-pipes | `pure`, счётчики вызовов (`PlayersPipe` чистый/нечистый, нечистый `price` в `App`), экземпляр на каждое место, изменение на месте, нечистые встроенные, таблица «метод / пайп / `computed`»; `deep` про `ɵɵpipeBind1` (`noSolution`) | решение 03 |
| 05-directive | `@Directive`, селектор `[appTooltip]` = имя входа, `host` (`mouseenter`/`mouseleave`), `inject(ElementRef)`, элемент в `body` + `DestroyRef`, глобальные стили; подсказки у стикеров (`hitRating \| number`) и звёзд; NG0303 / NG8002, статический атрибут молча; ограничения (только мышь); legacy `@HostListener` | custom: заготовка `tooltip.ts`, TODO в `app.html`/`game-card.html` |
| 06-host-directives | `InView` из `LoadMore` (`output({ alias: 'appInView' })`, совпадение по имени привязки), `hostDirectives: [InView]`, `inject(InView).visible.subscribe`; эксперименты: порядок конструкторов, закрытые выходы и `outputs: ['appInView']`, дубль по селектору, NG0310 | custom: заготовка `in-view.ts`, TODO в `load-more.ts` |
| 07-practice | практикум: `LazyImage` (`img[appLazy]`, `hostDirectives: [InView]`, `seen`/`src` (`computed`)/`loaded`, `class: 'lazy'`, `[attr.src]`, `(load)`); «Итоги главы»; `NgOptimizedImage` и `loading="lazy"` | custom: заготовка `lazy-image.ts`, TODO в `game-card.html` |
| 08-directives-inside | `ɵdir`/`ɵcmp`/`ɵpipe` (вывод `ngc`), сравнение полей, селектор-массив, `consts` с маркером `3`, сопоставление при первом создании шаблона (`directiveRegistry`), порядок на элементе и `ng.getDirectives`, NG0300, `ɵɵpipe`/`ɵɵpipeBind1` (`noSolution`) | решение 07 |

### Глава 8. Сервисы и внедрение зависимостей

Цель: понять DI — то, что отличает Angular от большинства фронтенд-библиотек.

| Шаг | Что вводит | Старт |
|---|---|---|
| 01-why-di | вводный шаг главы; курьер `App`, корзина — класс `CartStore` + глобальный `cartStore = new CartStore()`, методы по игре (`quantityOf`, `add`, `setQuantity`, `remove`), эксперимент «эффект в конструкторе» (NG0203 при загрузке модуля), чем плоха глобальная переменная, понятия зависимость/инжектор/провайдер | custom: решение 7.7 + `Header` (`layout/header/`, входы `count`/`total`, стили из `app.css`), `.actions`/`.favorite` в `game-card.css`, заготовка `core/cart-store.ts`, TODO в `app.ts`/`header.ts` |
| 02-first-service | `@Service()`, `inject(CartStore)`, класс-токен, корневой инжектор, ленивое создание, эффект в сервисе; `GameCard`/`GameDetails` без `inCart`/`add`; эксперименты: один экземпляр, без декоратора — NG0201; `@Injectable({ providedIn: 'root' })`; legacy — конструктор | решение 01 |
| 03-injection-context | контекст внедрения, NG0203 в методе, inject-функция `injectNow()` (`shared/now.ts`, `assertInInjectionContext`, `DestroyRef` вызвавшего) в `Countdown`; эксперименты: `setTimeout` (с проверкой и без — висящий таймер), `await`, `runInInjectionContext` + `Injector` | custom: заготовка `now.ts`, TODO в `countdown.ts` |
| 04-providers | провайдер, `useClass`/`useValue`/`useFactory`/`useExisting`, `DemoCartStore` (`@Service({ autoProvided: false })`) в `app.config.ts`; эксперименты: `useFactory` + `isDevMode`, `useValue: new …` (NG0203), `inject(DemoCartStore)` (NG0201), два экземпляра против `useExisting`, DEPRECATED без декоратора | custom: заготовка `demo-cart-store.ts`, TODO в `app.config.ts` |
| 05-tokens | `InjectionToken<ShopConfig>` `SHOP_CONFIG` с `factory` вместо `FREE_DELIVERY_FROM`/`FEW_LEFT`/`HIT_RATING`/`PAGE_SIZE`, порядок полей (TS2729), `DEFAULT_CURRENCY_CODE` + `getCurrencySymbol` в `price`; эксперименты: акция 3000, новый токен с тем же описанием, токен без фабрики (NG0201), `'EUR'`; legacy `@Inject` и строки | custom: заготовка `shop-config.ts`, TODO в `cart-store.ts`, `app.ts`, `game-card.ts`, `price-pipe.ts`, `app.config.ts` |
| 06-hierarchy | инжекторы окружения и элементов, путь поиска; `Tab` через токен `TABS` + `useExisting` у `Tabs` (`implements TabsParent`), эффект-почтальон удалён; CDK-аккордеон; эксперименты: `providers: [CartStore]` в карточке, вкладка вне `Tabs` + `optional`, `self`/`host`; `skipSelf` (CDK), `viewProviders` и `@if` | решение 05 |
| 07-lazy-services | `injectAsync(() => import('./analytics').then((m) => m.Analytics), { prefetch: onIdle })` в `CartStore`, событие в `add`; эксперименты: без `prefetch`, `autoProvided: false` | custom: готовый `core/analytics.ts`, TODO в `cart-store.ts` |
| 08-practice | практикум: `FavoritesStore`, сердечко в `.actions` (`aria-pressed`), «♥ N» в шапке; «Итоги главы» | custom: заготовка `favorites-store.ts`, TODO в `game-card.html`/`header.html` |
| 09-di-inside | журнал `di-log.ts` (Alt+щелчок: `ɵgetInjectorResolutionPath`, `ɵgetDependenciesFromInjectable`), `ɵfac`/`ɵprov`/`ɵɵdefineService`/`ɵɵProvidersFeature`, `R3Injector.get`, NG0201/NG0200, `NodeInjector`, фильтр Блума (`noSolution`) | custom: решение 08 + `di-log.ts`, `main.ts` вызывает `logInjectorsOnAltClick()` |

---

## Часть 2. Приложение

### Глава 9. Состояние приложения

| Шаг | Что вводит | Старт |
|---|---|---|
| 01-store | вводный шаг главы; состояние приложения и интерфейса, хранилище (состояние / чтение / действия), закрытый `state` + `asReadonly()`, `readonly CartItem[]` и `readonly`-поля `CartItem`; эксперимент «Хочу 99» (до: 99 шт. при остатке 12; после: TS2339 + `TypeError … update is not a function`), TS2339 `push`, TS2540; `deep` — `asReadonly` = тот же узел | custom: решение 8.8 без `DemoCartStore` (и провайдера), мини-корзина — компонент `MiniCart` (`cart/mini-cart/`, стили итогов и промокода готовы), `.link-button` в `styles.css`, TODO в `cart-store.ts` |
| 02-persistence | `localStorage`: что сохранять (`{ id, quantity }`, ключ с версией), запись эффектом (цитата документации), чтение — начальное значение `signal(loadCart())`, проверка внешних данных; эксперименты: «Сохранено:» при запуске, `'{oops'` с `try`/`catch` и без (магазин не открывается), негодные позиции; `deep` — корневой эффект; SSR, вкладки | решение 01 |
| 03-derived-state | производное состояние: `subtotal` (бывший `total`), `savings`, `delivery` (`deliveryPrice: 390` в `SHOP_CONFIG`), `total` к оплате; итоги `<dl>` в мини-корзине, шапка — `subtotal`; эксперимент: `subtotal` — одно вычисление на изменение при пяти читателях; совет «один объект или несколько сигналов» | custom: TODO в `mini-cart.html` |
| 04-promo-code | `core/promo-codes.ts` (`Promo`, `PromoResult`, `findPromo`), `promoState = linkedSignal<number, Promo \| null>({ source: subtotal, computation(subtotal, previous) })` — ниже порога снимается и не возвращается, `promoDiscount`, `applyPromo` → `PromoResult`, `removePromo`, сброс в `clear()`; `promoError` — состояние интерфейса в `MiniCart`; эксперимент-ловушка `source: isEmpty`; `deep` — узел `linkedSignal`, опция `set` | custom: готовый `promo-codes.ts`, TODO в `cart-store.ts`, `mini-cart.ts`/`.html` |
| 05-practice | практикум: `available(game)`, `add` не кладёт сверх склада, `setQuantity` в пределах 1..`inStock`, `loadCart` урезает и отбрасывает, «Все N шт. в корзине» в карточке, кнопка окна; избранное в `localStorage` (`hod-konem:favorites:v1`); «Итоги главы» | custom: TODO в `cart-store.ts`, `favorites-store.ts`, `game-card.html` |
| 06-libraries | обзор (`noSolution`): части хранилища, три вида состояния (приложения / данные сервера / URL), NgRx Signal Store (фрагмент корзины проверен типами `@ngrx/signals` 22.0.1: `protectedState` по умолчанию, `patchState` снаружи — TS2345) и классический Store, когда библиотека оправдана, `ng add @ngrx/signals` | решение 05 |

### Глава 10. Роутинг

| Шаг | Что вводит | Старт |
|---|---|---|
| 01-routes | вводный шаг главы; SPA, маршрут, `Routes`, `provideRouter`, `<router-outlet>` (страница — сосед после него), порядок и полное совпадение; NG04002 и сброс адреса; «тихие» пропуски outlet/`provideRouter`; `ng new`, `<base href>`, fallback сервера; legacy `RouterModule.forRoot` | custom: решение 9.5, каталог → `Catalog` (`catalog/`), мини-корзина → страница `CartPage` (`cart/cart-page/`), готовая `Home` (`home/`), `App` — каркас, глобальные `h1`/`a`/`.back-link`/`a.button`, `header.css` с меню; заготовка `app.routes.ts`, TODO в `app.config.ts`/`app.html` |
| 02-links | `routerLink`, `routerLinkActive` + `exact`, `ariaCurrentWhenActive`, ссылки на главной и в пустой корзине; ← → превью; `href="/app/"`; `deep` — щелчок `RouterLink` | custom: TODO в шапке, главной, корзине |
| 03-params | `games/:id`, `withComponentInputBinding()`, `input.required({ transform: numberAttribute })`, `[routerLink]` с командами, «Игра не найдена»; окно `GameDetails` удалено; NG0950; `deep` — переиспользование компонента; legacy `paramMap` | custom: готовые `game-page.html`/`.css`, заготовка `game-page.ts`, TODO в карточке |
| 04-query-params | фильтры каталога — входы `q`/`inStock`/`rating`/`sort` с преобразованиями (`undefined`!), `toSortKey`, `Router.navigate([], { relativeTo, queryParams, queryParamsHandling: 'merge', replaceUrl })`, `null`, `[queryParams]` («Все по рейтингу →»); эксперименты: история с `replaceUrl` и без, `TypeError … 'trim'` | custom: TODO в `catalog.ts`/`.html`, `home.html`; `url: /catalog` |
| 05-child-routes | кабинет: `children`, второй `<router-outlet>`, относительные ссылки, `redirectTo` + `pathMatch: 'full'` (NG04014), «♥ N» → `/account/favorites` | custom: готовые `FavoritesPage`/`OrdersPage`, `account.css`, `FavoritesStore.games`, заготовка `Account`; `url: /account` |
| 06-lazy-loading | `loadChildren` (`account.routes.ts`, `accountRoutes`), `loadComponent` (страница игры), без статических импортов; лог «Кабинет: модуль загружен»; эксперимент `withPreloading(PreloadAllModules)`; legacy `loadChildren` с модулем | custom: заготовка `account.routes.ts`, TODO в `app.routes.ts` |
| 07-guards | `/checkout` (`Checkout`, комментарий, `hasUnsavedChanges()`), `CanActivateFn` → `UrlTree`, `CanDeactivateFn` + `confirm()`; эксперимент `canMatch` с `false` (NG04002); legacy классы-гарды / `DeprecatedGuard` | custom: готовая страница `checkout/`, заготовка `checkout-guards.ts`, TODO в маршрутах и корзине; `url: /cart` |
| 08-titles | `title` маршрутов, `ResolveFn<string>` (`gameTitleResolver`), `ShopTitleStrategy extends TitleStrategy` (`buildTitle`, `Title`); заголовок вкладки в превью; эксперимент: маршрут без `title` — старый заголовок | custom: заготовки `game-title.ts`, `layout/shop-title-strategy.ts` |
| 09-not-found | `'**'` + `NotFound`, `redirectTo` (`games` → `catalog`), функция переадресации (`game/:id`), `withViewTransitions()` (developer preview), `withInMemoryScrolling`; эксперименты: без прокрутки (493 px), `canMatch` + `'**'` | custom: готовый `not-found/`, TODO в маршрутах и `app.config.ts` |
| 10-practice | практикум: `Breadcrumbs` (`layout/breadcrumbs/`) — `data: { breadcrumb }`, `resolve: { breadcrumb: gameTitleResolver }`, обход `routerState.snapshot`, пропуск уровней без `url`, `lastSuccessfulNavigation` в `computed`; «Итоги главы» | custom: заготовка `breadcrumbs.ts`/`.html`, готовый `.css`, TODO в `app.html`; `url: /account/favorites` |
| 11-router-inside | журнал навигации `router-log.ts` (`provideAppInitializer` + `router.events`, дерево снимков): `UrlTree`, распознавание с откатом, `loadChildren` до `RoutesRecognized`, гарды и `NavigationCancel`, резолверы и `loadComponent`, активация и `RouteReuseStrategy` (`noSolution`) | custom: решение 10 + `router-log.ts`, `main.ts` подключает журнал |

### Глава 11. HTTP и данные

| Шаг | Что вводит | Старт |
|---|---|---|
| 01-server | вводный шаг главы; API сервера, JSON, `GamesPage` (`items`/`total`/`page`/`size`), учебный бэкенд (задержка, «Ошибка 500»), хиты главной через `fetch` + сигнал; эксперименты: 3000 мс без индикатора, обычное поле не обновляет экран (при 0 мс — может), 500 у `fetch` — «успех» и пустая подборка | custom: решение 10.10 + `.skeleton`/`.error-message` в `styles.css`; бэкенд — 40 игр |
| 02-http-client | `provideHttpClient()` (сам `HttpClient` — `providedIn: 'root'`, функция — для настроек), `get<T>(url, { params })`, Observable минимум (описание, `subscribe`, `unsubscribe`), `HttpErrorResponse`; эксперименты: без `provideHttpClient` работает, без `subscribe` нет запроса, `ERROR HttpErrorResponse {…}`, уход со страницы — запрос не отменён (`DestroyRef` + `unsubscribe` — отменён); `deep` — `FetchBackend`, `withXhr`; legacy `HttpClientModule`, `withFetch` | previous |
| 03-http-resource | `httpResource` (функция запроса), `value`/`hasValue`/`isLoading`/`error`/`reload`, три состояния в шаблоне (порядок: значение → `isLoading` → ошибка — `error()` помнит прошлую ошибку при повторе), заглушки; «Со скидкой» — `onSale=true`; эксперименты: 500 и «Повторить», отмена при уходе; `deep` — `httpResource` поверх `HttpClient`, `.text`/`.blob`; чтение против изменения | previous |
| 04-params | каталог с сервера: сигналы в функции запроса (`q`, `inStock`, `rating`, `sort` → `SORT_PARAMS`), `size: 100`, `visibleGames` через `hasValue()`, «Найдено игр»; эксперименты: «кот» — 4 запроса, 2 отменены, мигание (значение сбрасывается при новых параметрах), `@if (games.value())` при 500 — `ResourceValueError`, пусто; корзина теряет новые игры после ⟳ | previous; `url: /catalog` |
| 05-errors | страница игры — `httpResource` по `id`, 404 (`HttpErrorResponse.status`) против 500, порядок веток; резолвер — `async` + `firstValueFrom`, `inject` до `await` (NG0203); резолвер только в `resolve.breadcrumb`, `ShopTitleStrategy` берёт заголовок из крошки; эксперименты: 500, медленный сервер (резолвер, потом страница — два запроса) | previous; `url: /games/4` |
| 06-resource | `resource({ params, loader })`, `undefined` → `idle`, `abortSignal` (`AbortController`), загрузчик на `fetch` с пропуском 404; `FavoritesStore.ids` (`asReadonly`), без `games`; эксперименты: перезагрузка всего списка, отмена при уходе, пропавшая игра 999; `deep` — когда `resource`, когда `httpResource` | custom: корзина хранит снимок игры (`hod-konem:cart:v2`), без `GAMES`; `url: /account/favorites` |
| 07-debounced | `debounced(() => q(), 300)` (экспериментальная), `found` — `linkedSignal` «последний ответ», приглушённая сетка, `status() === 'error'`; эксперименты: медленный набор, ошибка поверх результатов, `computed` вместо `linkedSignal` | custom: `core/games-data.ts` удалён (`removedInStart`); `url: /catalog` |
| 08-mutations | отзывы: `httpResource` с `defaultValue: []`, `post<T>`, оптимистичное обновление (`update`, черновики с отрицательным `id`), откат при ошибке, статус `local`; эксперименты: 500 — откат, уход — `POST` доходит, без `error` — черновик навсегда | previous; `url: /games/4` |
| 09-practice | практикум: каталог страницами — `filters` (`computed`), `page` (`linkedSignal` со сбросом), `shownGames` (`linkedSignal`, копит страницы), «Показать ещё» не во время загрузки; `check.ts`; «Итоги главы» | previous; `url: /catalog` |
| 10-resource-inside | журнал статусов `resource-log.ts`; шесть статусов и `value()` в каждом; устройство `ResourceImpl`: `extRequest` и `state` (`linkedSignal`), `loadEffect` (`effect`, `AbortController`, отбрасывание устаревших ответов), `ResourceValueError`, `DestroyRef`, `set` → `local`; `HttpResourceImpl`; `PendingTasks` (SSR, тесты) (`noSolution`) | custom: решение 9 + `resource-log.ts`, вызовы в `Catalog` и `GamePage` |

### Глава 12. RxJS в Angular

Цель: необходимый минимум RxJS, чтобы читать существующий код и решать задачи, где потоки удобнее сигналов.

| Шаг | Что вводит | Старт |
|---|---|---|
| 01-observable | вводный шаг главы; Observable — значения во времени (`next`/`error`/`complete`), диаграммы потока, `subscribe` на `Router.events` (12 событий на переход, `toString`), `new Observable` с функцией уборки, `Subscription`/`unsubscribe`, холодный (`HttpClient.get` — два запроса на две подписки) против горячего (`router.events` — опоздавший подписчик пропускает); эксперименты: без уборки таймер работает после отписки, подписка через 1 с, `complete` у запроса; `deep` — почему в Angular RxJS (`rxjs` — обязательная peer-зависимость `@angular/core`) | custom: решение 11.9 + `// TODO` в конструкторе `App` |
| 02-operators | `pipe`, `filter` (сужение типа `instanceof NavigationEnd`), `map` (`urlAfterRedirects`), `tap`; журнал «Просмотр страницы» через `Analytics` (`injectAsync`); эксперименты: без `filter` — TS2339 и `undefined`, `/account` → `/account/favorites`, `/checkout` с пустой корзиной — только `/cart` (`NavigationCancel`); `legacy` — `rxjs/operators` (до RxJS 7.2), операторы-методы RxJS 5 | previous |
| 03-switch-map | быстрый поиск в шапке (`QuickSearch`): `Subject`, `debounceTime`, `distinctUntilChanged`, `switchMap` (отмена прежнего запроса), `of([])` для текста короче 2 букв, `catchError` внутри `switchMap`; таблица `switchMap`/`mergeMap`/`concatMap`/`exhaustMap`; эксперименты: без паузы — «ко» отменён, `mergeMap` — без отмены, без `catchError` 500 убивает поток, `distinctUntilChanged` и тот же текст (в т. ч. после ошибки) | custom: `layout/quick-search/` (шаблон и стили готовы, `search` — запрос на каждую букву), подключён в шапку |
| 04-signals-interop | `toSignal` (`initialValue`, `requireSync`, ошибка при чтении, контекст внедрения), `toObservable` (текущее значение сразу, эффект — значения позже, два `set` → одно значение, завершение с компонентом); `text` — сигнал, `[value]`; эксперименты: `tap` (`""` при подписке), два `set` подряд, NG0203; `deep` — устройство мостов | previous |
| 05-rx-resource | `rxResource({ params, stream })`, `forkJoin` (ждёт всех, ошибка одного — ошибка всех; `forkJoin([])` без значения), `catchError` + `of(null)` для 404 и `throwError` для остального; «Избранное» через `HttpClient`, `loadGames` на `fetch` удалён; эксперименты: `[3, 34, 999]`, без `catchError` — «Не удалось загрузить избранное», уход — запросы отменены; `deep` — `rxResource` поверх `resource` | previous; `url: /account/favorites` |
| 06-cleanup | `interval`, утечка подписки (тики после ухода, два таймера после возврата), `takeUntilDestroyed()` (последним, `DestroyRef` явно вне контекста), `toSignal` — итог `injectNow`; пайп `async` (`left$`, `null` до первого значения); таблица «когда отписка не нужна»; `legacy` — `destroy$` + `takeUntil` | previous; `url: /games/4` |
| 07-interceptors | `HttpInterceptorFn`, `next(req)`, цепочка `withInterceptors([…])` (запрос сверху вниз, ответ снизу вверх), `req.clone`, `HttpEvent` (`Sent`, `Response`), `HttpEventType`, `tap({ next, error })`; `loggingInterceptor` (метод, адрес, статус, мс), `retryInterceptor` (`retry({ count, delay })`, `timer`, только GET и 5xx); эксперименты: 500 — три попытки и одна строка лога (~1900 мс), порядок `[retry, logging]` — время копится (функция один раз, `retry` переподписывается), 404 и `POST` не повторяются; `legacy` — классы и `withInterceptorsFromDi` | custom: заготовки `core/logging-interceptor.ts`, `core/retry-interceptor.ts` (`ng generate interceptor`) |
| 08-cache | `HttpContextToken` (`CACHE`), `HttpContext().set`, `req.context.get`, `cacheInterceptor` (`of(cached)` без `next`, `tap` + `HttpResponse`), `inject` в интерцепторе, `ResponseCache` (10 с); метка в резолвере и в `httpResource` (объект запроса с `context`); порядок `[logging, cache, retry]`; игра — один запрос, при задержке 1500 мс 1,56 с вместо 3,1 с; эксперименты: срок жизни, без метки, кэш выше лога; `warning` — устаревание; `tip` — `Cache-Control`, `withHttpTransferCacheOptions` | custom: `core/cache-interceptor.ts` с `CACHE` и `ResponseCache`, интерцептор — заготовка; `url: /games/4` |
| 09-practice | практикум: черновик комментария к заказу — восстановление из `hod-konem:checkout-comment`, `toObservable` + `debounceTime(500)` + `distinctUntilChanged` + `takeUntilDestroyed`, «Сохраняем…»/«Черновик сохранён» (`savedComment`, `saved`), гард выхода убран (последние буквы сохраняются: `toObservable` завершается, `debounceTime` выдаёт ждущее значение); `check.ts`; «Итоги главы» | previous; `url: /checkout` |
| 10-signals-vs-rxjs | `diamond.ts`: «ромб» на `BehaviorSubject` + `combineLatest` (промежуточная строка `2000 → 900`) и на `computed`; push против push-pull; значения против событий; время; таблица «как выбирать»; цена мостов; `deep` — синхронность (`noSolution`) | custom: решение 9 + `diamond.ts`, вызов в `main.ts` |

### Глава 13. Формы

| # | Шаг | API / понятия | Результат |
|---|---|---|---|
| 13.1 | Модель формы | `form(signal)`, `[formField]` | Форма входа |
| 13.2 | Валидация | `required`, `email`, `minLength`, `pattern`; `errors()`, `touched()` | Сообщения об ошибках |
| 13.3 | Отправка | `submit`, блокировка кнопки, ошибки сервера | Вход работает |
| 13.4 | Своя проверка | `validate`, перекрёстная проверка полей | Повтор пароля |
| 13.5 | Асинхронная проверка | `validateAsync`, `validateHttp` | Промокод проверяется сервером |
| 13.6 | Условные поля | `disabled`, `hidden`, `applyWhen` | Адрес только при доставке курьером |
| 13.7 | Списки полей | `applyEach`, добавление и удаление | Несколько получателей подарка |
| 13.8 | Схемы | `schema`, переиспользование правил, `validateStandardSchema` | |
| 13.9 | Реактивные формы | `FormGroup`, `FormControl`, `Validators` — как читать старый код | Та же форма входа |
| **Практикум** | Оформление заказа | Контакты, доставка, оплата, гард «несохранённые изменения» | |
| **Под капотом** | Дерево полей | Как `form()` строит дерево состояний из одного сигнала | |

### Глава 14. Авторизация

Цель: собрать вход, сессию, токены, гарды и роли в один сквозной сценарий — так, как это устроено в рабочих проектах.

| # | Шаг | API / понятия | Результат |
|---|---|---|---|
| 14.1 | Как устроен вход | Схема «логин → токен → запросы с токеном → 401»; что умеет учебный бэкенд; `AuthStore` на сигналах: `user`, `token`, `isLoggedIn` и роль через `computed` | В шапке «Войти» |
| 14.2 | Вход и выход | Форма входа из главы 13 → `POST /api/login` → `AuthStore`; `logout()`; ошибка 401 при неверном пароле | Имя пользователя в шапке |
| 14.3 | Сессия после перезагрузки | Где хранить токен; `provideAppInitializer` + `GET /api/me`; первый маршрут ждёт проверки сессии | Вход переживает перезагрузку |
| 14.4 | Токен в запросах | `HttpInterceptorFn` + `inject(AuthStore)`, заголовок `Authorization`, только для своих адресов `/api/…` | Отзыв от имени пользователя |
| 14.5 | Ответ 401 | Интерцептор с `catchError`: выход и переход на `/login`; протухший токен | Разлогин при недействительном токене |
| 14.6 | Гард входа и возврат | `CanActivateFn` / `CanMatchFn`, `UrlTree` с `returnUrl`, возврат после входа, защита от открытого редиректа (только свои адреса) | «Мои заказы» → вход → обратно |
| 14.7 | Роли в интерфейсе | Роль из `AuthStore`, `@if` в шапке; почему скрытая кнопка — не защита (проверяет сервер) | «Админка» видна только admin |
| **Практикум** | Личный кабинет | `/account/orders` только после входа, выход с любой страницы, возврат на исходную | |
| **Как в настоящем проекте** | Безопасность сессии | `localStorage` против httpOnly-cookie (XSS и CSRF); XSRF в `HttpClient`: `withXsrfConfiguration`, `withNoXsrfProtection`, cookie `XSRF-TOKEN` → заголовок; refresh-токен: пара access/refresh, повтор запроса после обновления, одно обновление на несколько параллельных 401; OAuth/OIDC и готовые библиотеки (обзор) | |

### Глава 15. Анимации, `@defer` и производительность

| # | Шаг | API / понятия | Результат |
|---|---|---|---|
| 15.1 | Анимация появления | `animate.enter`, `animate.leave`, CSS-переходы | Позиции корзины въезжают |
| 15.2 | Отложенная отрисовка | `@defer`, `@placeholder`, `@loading`, `@error` | Отзывы |
| 15.3 | Триггеры | `on viewport`, `on idle`, `on interaction`, `on hover`, `on timer`, `when` | |
| 15.4 | Предзагрузка | `prefetch on …` | |
| 15.5 | Картинки | `NgOptimizedImage`, `ngSrc`, `priority`, размеры | |
| 15.6 | Большие списки | `track`, чистые пайпы, `computed`, когда нужна виртуализация (CDK) | |
| **Практикум** | Летящая обложка | Анимация «в корзину» | |
| **Под капотом** | `@defer` в JIT и в AOT | Чанки, почему в превью всё грузится сразу | |

### Глава 16. Тестирование

| # | Шаг | API / понятия | Результат |
|---|---|---|---|
| 16.1 | Зачем и что тестировать | Пирамида тестов; вкладка «Тесты» | |
| 16.2 | Тест функции и пайпа | `describe`, `it`, `expect` | Тесты пайпа цены |
| 16.3 | Тест сервиса | `TestBed.inject`, сигналы в тестах | Тесты `CartStore` |
| 16.4 | Тест компонента | `TestBed.createComponent`, `fixture.componentRef.setInput`, `whenStable` | Тест `GameCard` |
| 16.5 | Подмена зависимостей | `providers` в `TestBed`, заглушки | |
| 16.6 | Тест HTTP | `provideHttpClientTesting`, `HttpTestingController` | |
| 16.7 | Тест маршрутов | `RouterTestingHarness` | |
| **Практикум** | Тесты оформления заказа | Валидация и отправка | |

### Глава 17. Админка (сборка всего вместе)

| # | Шаг | Понятия | Результат |
|---|---|---|---|
| 17.1 | Ленивый раздел | `loadChildren`, свои провайдеры раздела | |
| 17.2 | Гард роли | `CanMatchFn`, роль из `AuthStore` | Только admin |
| 17.3 | Таблица товаров | Сортировка, фильтр, страницы | |
| 17.4 | Редактирование | Signal Forms + `httpResource` + `PUT` | |
| 17.5 | Подтверждение удаления | Диалог: компонент через `createComponent` или CDK Dialog (обзор) | |
| **Практикум** | Новая игра | Форма создания с загрузкой обложки | |

---

### Глава 18. NgRx

Цель: познакомиться с самой распространённой библиотекой состояния в мире Angular — после того как ученик умеет делать то же самое сервисами на сигналах (глава 9) и понимает, что именно библиотека добавляет.

Пакеты NgRx 22.0.1 (поддерживают Angular 22): `@ngrx/signals` (Signal Store, `entities`, `rxjs-interop`, `events`), `@ngrx/store`, `@ngrx/effects`, `@ngrx/entity`, `@ngrx/operators`, `@ngrx/store-devtools`. Для превью нужно подключить пакеты в import map (`scripts/copy-vendor.mjs`) — задача платформы перед главой.

| # | Шаг | API / понятия | Результат |
|---|---|---|---|
| 18.1 | Зачем библиотека | Чего не хватает самописным хранилищам в большой команде: единые правила, расширения, инструменты; Signal Store против классического Store | — |
| 18.2 | Signal Store | `signalStore`, `withState`, `withComputed`, `withMethods`, `patchState`, `{ providedIn: 'root' }` | `CartStore` на Signal Store |
| 18.3 | Хуки и свойства | `withHooks` (`onInit` — восстановление из `localStorage`), `withProps`, `watchState`, `getState` | Корзина переживает перезапуск |
| 18.4 | Свои расширения | `signalStoreFeature`, `withFeature` — общая «фича» сохранения для корзины и избранного | |
| 18.5 | Коллекции | `withEntities`, `addEntity`, `updateEntity`, `removeEntity`, `setAllEntities` (`@ngrx/signals/entities`) | Позиции корзины как сущности |
| 18.6 | Асинхронность | `rxMethod` (`@ngrx/signals/rxjs-interop`), `signalMethod`, `tapResponse` (`@ngrx/operators`) | Каталог через стор |
| 18.7 | События в Signal Store | `@ngrx/signals/events`: `eventGroup`, `withReducer`, `withEventHandlers`, `injectDispatch` — Flux-подход без классического Store (проверить стабильность) | |
| 18.8 | Классический Store | `createActionGroup`, `props`, `createReducer`, `on`, `createFeature`, `createSelector`, `provideStore`, `provideState`, `Store.dispatch`, `Store.selectSignal` | Та же корзина — для чтения существующих проектов |
| 18.9 | Эффекты и DevTools | `createEffect`, `Actions`, `ofType`, `provideEffects`; `provideStoreDevtools` и Redux DevTools (в превью — обзорно) | |
| **Практикум** | Фильтры каталога в сторе | Состояние фильтров, синхронизация с URL, загрузка через `rxMethod` | |
| **Под капотом** | Что такое `signalStore` | Сервис с сигналами внутри: `patchState` и неизменяемость, сравнение с `CartStore` из главы 9; когда библиотека не нужна | |

## Часть 3. Глубже

### Глава 19. Под капотом Angular

| # | Шаг | О чём |
|---|---|---|
| 19.1 | Компилятор | Шаблон → инструкции Ivy (вкладка «Шаблон»): создание и обновление, `ɵɵelementStart`, `ɵɵtextInterpolate` |
| 19.2 | Представления | `LView`, `TView`, почему компоненты дешёвые |
| 19.3 | Обнаружение изменений | Планировщик зонлесс, «грязные» представления, OnPush/`Eager`, `markForCheck` |
| 19.4 | zone.js | Как было раньше, `provideZoneChangeDetection`, почему от него отказались |
| 19.5 | Сигналы изнутри | `@angular/core/primitives/signals`: реактивные узлы, версии, эпохи |
| 19.6 | DI изнутри | `R3Injector`, `NodeInjector`, bloom-фильтр |
| 19.7 | JIT против AOT | Что делает `ngtsc`, проверка типов шаблонов, tree-shaking |

### Глава 20. Настоящий проект (на машине ученика)

Шаги этой главы выполняются в терминале, не в превью. Текст урока даёт команды и ожидаемый вывод; автор проверяет каждую команду сам.

| # | Шаг | О чём |
|---|---|---|
| 20.1 | Angular CLI | `npm i -g @angular/cli`, `ng new`, структура проекта, `angular.json` |
| 20.2 | Перенос магазина | Файлы из курса → `src/app`, учебный бэкенд → `public/` + интерцептор-заглушка или JSON-сервер |
| 20.3 | Сборка | `ng serve`, `ng build`, esbuild/Vite, бюджеты, размер бандла |
| 20.4 | Строгие шаблоны | `strictTemplates`: ошибки, которые JIT показывал только во время выполнения |
| 20.5 | Генераторы и инструменты | `ng generate`, `ng add`, `ng update`, линтер |
| 20.6 | Тесты | `ng test`, тесты из главы 16 без изменений |
| 20.7 | SSR и гидратация | `@angular/ssr`, пререндеринг, гидратация, инкрементальная гидратация с `@defer` |
| 20.8 | Окружения и деплой | Конфигурации, статический хостинг |
| 20.9 | Angular DevTools | Расширение браузера: дерево компонентов, профилировщик, граф сигналов |

### Глава 21. Разбор настоящего кода

Цель: прочитать код большого приложения и понять, почему он написан так. Кандидат — angular.dev (см. `project-app.md`).

| # | Шаг | О чём |
|---|---|---|
| 21.1 | Карта проекта | Структура, что где лежит |
| 21.2 | Роутинг и ленивые разделы | |
| 21.3 | Состояние и сервисы | |
| 21.4 | Пререндеринг и `@defer` | |
| 21.5 | Встроенный редактор | Как angular.dev запускает код (WebContainers) — сравнение с нашим превью |
| 21.6 | Что бы мы сделали иначе | |

### Глава 22. Финальный проект (самостоятельный)

Варианты на выбор, с подсказками, но без пошагового решения:

- сравнение игр и список желаний с публичной ссылкой;
- конструктор подарочного набора (многошаговая форма);
- своё приложение на 80% пройденного API.

---

## Карта покрытия API

| Область | API | Главы |
|---|---|---|
| Приложение | `bootstrapApplication`, `ApplicationConfig`, `provide*`, `ErrorHandler`, `provideAppInitializer` | 1, 8, 14 |
| Шаблоны | интерполяция, привязки, события, `#ref`, `@let`, `@if`, `@for`, `@switch`, `@defer`, `ng-content`, `ng-template`, `ng-container` | 2, 4, 5, 15 |
| Компоненты | `@Component`, `input`, `output`, `model`, `host`, стили и инкапсуляция | 5 |
| Сигналы | `signal`, `computed`, `effect`, `untracked`, `linkedSignal`, `resource`, `httpResource`, `rxResource`, `debounced` | 3, 9, 11, 12 |
| DOM и жизненный цикл | `viewChild`, `contentChild(ren)`, `afterNextRender`, `afterRenderEffect`, `DestroyRef`, хуки | 6 |
| Директивы и пайпы | `@Directive`, `hostDirectives`, `@Pipe`, встроенные пайпы, локали | 7 |
| DI | `inject`, `@Service`, `@Injectable`, провайдеры, `InjectionToken`, иерархия, `injectAsync` | 8 |
| Роутер | `provideRouter`, `routerLink`, параметры, `loadComponent`, гарды, резолверы, `withViewTransitions` | 10, 14, 17 |
| HTTP | `provideHttpClient`, `HttpClient`, `httpResource`, интерцепторы, `withXsrfConfiguration` | 11, 12, 14 |
| RxJS | `Observable`, операторы, `toSignal`, `toObservable`, `takeUntilDestroyed` | 12 |
| Формы | Signal Forms (`form`, `FormField`, валидаторы, `submit`, `schema`); реактивные формы обзорно | 13 |
| Авторизация | `AuthStore`, токен, сессия (`/api/me`), интерцептор `Authorization` и 401, гард входа, `returnUrl`, роли; refresh-токен, cookie, XSRF — обзорно | 14, 17 |
| Анимации и производительность | `animate.enter/leave`, `@defer`, `NgOptimizedImage` | 15 |
| Тесты | `TestBed`, `ComponentFixture`, `HttpTestingController`, `RouterTestingHarness` | 16 |
| NgRx | Signal Store (`signalStore`, `withState`, `withComputed`, `withMethods`, `withHooks`, `withEntities`, `rxMethod`, `signalStoreFeature`, события), классический Store (`createActionGroup`, `createReducer`, `createSelector`, `createEffect`), DevTools | 18 |
| Внутреннее устройство | Ivy, `LView`, планировщик, zone.js, примитивы сигналов, инжекторы | 19 |
| Инструменты | CLI, `ng build`, `strictTemplates`, SSR, гидратация, DevTools | 20 |

Не входит в курс (упоминаем ссылкой): Angular Material и CDK (кроме обзора в 15.6 и 17.5), i18n (`@angular/localize`), Service Worker / PWA, Angular Elements, микрофронтенды, `upgrade` с AngularJS.

## Объём

22 главы, примерно 160–175 шагов. Ориентир для ученика — 40–50 часов.
