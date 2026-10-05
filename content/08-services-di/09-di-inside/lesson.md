---
title: 'Под капотом: как ищется зависимость'
startFrom: custom
files: [main.ts, di-log.ts, app.ts, app.html, app.css, layout/header/header.ts, layout/header/header.html, layout/header/header.css, core/cart-store.ts, core/favorites-store.ts, core/analytics.ts, core/shop-config.ts, core/demo-cart-store.ts, shared/game-card/game-card.ts, shared/game-card/game-card.html, shared/game-card/game-card.css, shared/game-details/game-details.ts, shared/game-details/game-details.html, shared/game-details/game-details.css, shared/tabs/tabs.ts, shared/tabs/tabs.html, shared/tabs/tabs.css, shared/tabs/tab.ts, shared/tabs/tab.html, shared/countdown/countdown.ts, shared/countdown/countdown.html, shared/countdown/countdown.css, shared/now.ts, shared/price-pipe.ts, shared/players-pipe.ts, shared/duration-pipe.ts, shared/plural.ts, shared/tooltip.ts, shared/in-view.ts, shared/lazy-image.ts, shared/load-more/load-more.ts, shared/load-more/load-more.html, shared/load-more/load-more.css, shared/rating/rating.ts, shared/rating/rating.html, shared/rating/rating.css, shared/quantity/quantity.ts, shared/quantity/quantity.html, shared/quantity/quantity.css, core/models.ts, core/games-data.ts, app.config.ts, styles.css]
focus: di-log.ts
api: ['ɵprov', 'ɵfac', 'ɵɵdefineService', NodeInjector, R3Injector, NullInjector, фильтр Блума, NG0200, NG0201]
noSolution: true
---

Всю главу мы говорили «DI ищет зависимость вверх по дереву». В этом шаге посмотрим, что именно Angular хранит в классах, как устроены оба вида инжекторов и откуда берутся ошибки NG0201 и NG0200. Шаг необязательный, кода в нём писать не нужно.

## Журнал поиска

В коде шага — помощник `di-log.ts`, его включает `main.ts` после запуска. Щёлкните по любому элементу превью **с зажатой клавишей Alt** (на Mac — Option): в консоли появится путь, по которому ищет зависимости ближайший компонент, и где он нашёл каждую свою зависимость. Щелчок с Alt только пишет журнал — кнопка под курсором не сработает. Помощник пользуется отладочными функциями Angular из глобального `ng` (`ɵgetInjectorResolutionPath`, `ɵgetDependenciesFromInjectable` — те же, что использует Angular DevTools). Они есть только в режиме разработки, а знак `ɵ` в имени значит «внутреннее, без гарантий».

Alt+щелчок по кнопке «В корзину» в карточке:

```
Путь поиска для GameCard:
  1. <app-game-card> — GameCard
  2. <app-root> — App
  3. инжектор окружения root — провайдеров в списке: 40
  4. инжектор окружения platform — провайдеров в списке: 6
  5. NullInjector — дальше искать негде: ошибка NG0201
GameCard получил: ErrorHandler ← инжектор окружения root; DestroyRef ← <app-game-card>; CartStore ← инжектор окружения root; FavoritesStore ← инжектор окружения root; InjectionToken SHOP_CONFIG ← инжектор окружения root
```

`CartStore`, `FavoritesStore` и `SHOP_CONFIG` — то, что карточка просит сама. А `ErrorHandler` и `DestroyRef` — зависимости выхода `open`: `output()` внутри вызывает `inject(DestroyRef)`, чтобы отписать слушателей при уничтожении карточки, и `inject(ErrorHandler, { optional: true })` для ошибок в них. Функции Angular пользуются тем же DI, что и ваш код.

Откройте «Подробнее» и щёлкните с Alt по тексту описания:

```
Путь поиска для Tab:
  1. <app-tab> — Tab
  2. <app-tabs> — Tabs; провайдеры: InjectionToken TABS
  3. <app-game-details> — GameDetails
  4. <app-root> — App
  5. инжектор окружения root — провайдеров в списке: 40
  6. инжектор окружения platform — провайдеров в списке: 6
  7. NullInjector — дальше искать негде: ошибка NG0201
Tab получил: InjectionToken TABS ← <app-tabs>
```

Путь — это дерево из шага 6, прочитанное снизу вверх. Попробуйте шапку, окно, кнопку «Показать ещё».

## Что компилятор записывает в класс

Декораторы DI компилятор превращает в статические поля класса. Вот что дал `ngc` (компилятор настоящего проекта) для двух сервисов главы:

```js
class FavoritesStore {
  static ɵfac = function FavoritesStore_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || FavoritesStore)();
  };
  static ɵprov = i0.ɵɵdefineService({ token: FavoritesStore, factory: FavoritesStore.ɵfac });
}

class DemoCartStore extends CartStore {
  static ɵprov = i0.ɵɵdefineService({ token: DemoCartStore, factory: DemoCartStore.ɵfac, autoProvided: false });
}
```

- **`ɵfac`** — фабрика: как создать экземпляр. Для класса с `inject()` в полях это просто `new`: зависимости класс возьмёт сам, в своих инициализаторах.
- **`ɵprov`** — определение провайдера. `ɵɵdefineService` превращает его в объект `{ token, providedIn: 'root', factory }`, а с `autoProvided: false` — в `providedIn: null`. Именно `providedIn` инжектор и проверит.

Старый стиль с конструктором меняет только фабрику: зависимости достаёт она.

```js
// constructor(protected readonly cart: CartStore) {}
static ɵfac = function Header_Factory(__ngFactoryType__) {
  return new (__ngFactoryType__ || Header)(i0.ɵɵdirectiveInject(i1.CartStore));
};
```

А `providers` компонента попадают в его определение как «особенность»: `features: [i0.ɵɵProvidersFeature([{ provide: TABS, useExisting: Tabs }])]`. В превью всё это делает JIT-компилятор при первом обращении к `ɵprov` или `ɵfac` — результат тот же.

## Инжектор окружения: R3Injector

Корневой инжектор и инжектор платформы — экземпляры класса `R3Injector`. Внутри у каждого — словарь `records`: токен → запись `{ factory, value }`. Записи из `appConfig.providers` Angular кладёт туда при создании инжектора. Метод `get(token)` делает так:

1. Ищет запись в `records`.
2. Не нашёл — смотрит на `ɵprov` токена. Если там `providedIn: 'root'`, а этот инжектор корневой, создаёт запись тут же. Поэтому `@Service()` не нужно перечислять в провайдерах — и поэтому `FavoritesStore`, `SHOP_CONFIG` и `Analytics` нет среди 40 провайдеров в журнале: в списке только то, что записано в конфигурации (ваше и самого Angular).
3. Запись есть, значения ещё нет — ставит пометку «создаю», вызывает фабрику, запоминает результат. Следующий `get` вернёт тот же объект: так получается «один экземпляр на приложение».
4. Записи нет совсем — передаёт запрос родителю: корневой — платформе, платформа — `NullInjector`.

`NullInjector` ничего не хранит. Его `get` бросает ошибку:

```
NG0201: No provider found for `CartStore`. Source: Environment Injector.
```

Пока ошибка поднимается обратно, каждый инжектор добавляет к ней свой токен — получается путь `Path: …`, который виден, когда недостающая зависимость нужна не компоненту, а другой зависимости.

Пометка «создаю» из пункта 3 ловит круговые зависимости: если фабрика `Ping` просит `Pong`, а фабрика `Pong` снова просит `Ping`, запись `Ping` ещё в состоянии «создаю». В превью циклический импорт между файлами не работает, поэтому мы проверили это двумя сервисами в одном файле:

```
NG0200: Circular dependency detected for `Ping`. Source: Environment Injector. Path: FavoritesStore -> Ping -> Pong -> Ping.
```

## Инжектор элемента: NodeInjector

У элементов отдельных объектов-инжекторов нет: данные хранятся в массивах представления (тех же `LView` и `TView`, что и шаблон), а `NodeInjector` — лёгкая обёртка «элемент + представление», которую Angular создаёт, только когда нужен сам объект-инжектор: `inject(Injector)`, `ng.getInjector()`. Обычный `inject()` в компоненте ищет прямо по этим массивам. Поиск по элементам (`lookupTokenUsingNodeInjector`) устроен в расчёте на скорость:

- **Фильтр Блума.** У каждого инжектора элемента есть 256 бит. Каждый компонент, директива и провайдер элемента получает номер (`__NG_ELEMENT_ID__`), и при первом создании шаблона на элементе выставляется бит `номер % 256`. Перед поиском Angular проверяет бит: если он не стоит, токена на этом элементе точно нет, и элемент пропускается без перебора. Бит может совпасть случайно — тогда элемент проверяется честно. Второй такой фильтр у элемента собирает биты всех его предков: если нужного бита нет и там, подниматься выше бессмысленно, и Angular сразу переходит к инжектору окружения.
- **Токены, которых нет ни на одном элементе.** `CartStore` никогда не встречался в провайдерах элементов, номера у него нет, и поиск по элементам не начинается вовсе — запрос сразу уходит в инжектор окружения. Пока в шаге 6 мы не добавили `providers: [CartStore]` в карточку.
- **Служебные токены** — `ElementRef`, `DestroyRef`, `ChangeDetectorRef`, `Injector` — не хранятся нигде. Вместо номера у них функция, и Angular создаёт значение для элемента на лету: `ElementRef` — обёртка над DOM-элементом текущего узла.
- **Флаги.** `self` останавливает подъём на первом элементе, `host` — на хосте компонента, и с обоими инжектор окружения не опрашивается: ошибка поэтому и звучит иначе — `No provider for … found in NodeInjector`. `optional` вместо ошибки возвращает `null`.

На каждом элементе Angular перебирает список токенов (`locateDirectiveOrProvider`): сначала провайдеры из `viewProviders` (если поиск пришёл из шаблона компонента), затем из `providers`, затем сами компоненты и директивы. Найденный объект создаётся при первом запросе и хранится в представлении рядом с элементом — поэтому у каждой карточки свой `CartStore` из шага 6 и свой `DestroyRef`.

## Весь путь

```
inject(X) в компоненте
  │
  ├─ X нумерованный? ─ нет ─┐
  │  да                     │
  ▼                         │
элементы снизу вверх:       │
  бит Блума → перебор       │
  нашли → готово            │
  не нашли ─────────────────┤
                            ▼
R3Injector root → platform
  запись или providedIn
  нашли → создать раз, отдать
  не нашли
  ▼
NullInjector → NG0201
```

Этот путь проходит каждый `inject()` в приложении — и ваш, и внутри Angular: `output()` в карточке, `HttpClient` и роутер в следующих главах.
