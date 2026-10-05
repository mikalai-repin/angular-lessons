---
title: Иерархия инжекторов
startFrom: previous
files: [main.ts, shared/tabs/tab.ts, shared/tabs/tabs.ts, shared/tabs/tabs.html, shared/game-details/game-details.html, app.ts, app.html, app.css, layout/header/header.ts, layout/header/header.html, layout/header/header.css, core/cart-store.ts, core/shop-config.ts, core/demo-cart-store.ts, shared/game-card/game-card.ts, shared/game-card/game-card.html, shared/game-card/game-card.css, shared/game-details/game-details.ts, shared/game-details/game-details.css, shared/tabs/tabs.css, shared/tabs/tab.html, shared/countdown/countdown.ts, shared/countdown/countdown.html, shared/countdown/countdown.css, shared/now.ts, shared/price-pipe.ts, shared/players-pipe.ts, shared/duration-pipe.ts, shared/plural.ts, shared/tooltip.ts, shared/in-view.ts, shared/lazy-image.ts, shared/load-more/load-more.ts, shared/load-more/load-more.html, shared/load-more/load-more.css, shared/rating/rating.ts, shared/rating/rating.html, shared/rating/rating.css, shared/quantity/quantity.ts, shared/quantity/quantity.html, shared/quantity/quantity.css, core/models.ts, core/games-data.ts, app.config.ts, styles.css]
focus: shared/tabs/tab.ts
api: [инжектор элемента, инжектор окружения, providers, viewProviders, optional, self, skipSelf, host]
---

До сих пор всё, что мы просили, выдавал один инжектор — корневой. Но инжекторов в приложении много, и они выстроены деревом вслед за деревом компонентов. Вы уже пользовались этим, не называя: в главе 7 `LoadMore` получил директиву `InView` с того же элемента через `inject(InView)`, а `inject(ElementRef)` в любой директиве выдаёт именно её элемент, а не какой-то общий. В этом шаге разберём это дерево и наведём порядок во вкладках.

## Два вида инжекторов

**Инжектор окружения** (environment injector) — инжектор уровня приложения. Корневой — главный из них: его Angular строит при запуске из `appConfig.providers`, в нём живут `CartStore`, `SHOP_CONFIG`, `LOCALE_ID`. Над ним есть ещё инжектор платформы — общий для всех приложений на странице, а дальше — `NullInjector`, который на любой запрос отвечает ошибкой.

**Инжектор элемента** (element injector) — свой у каждого элемента шаблона, на котором стоит компонент или директива. В нём:

- сами компонент и директивы этого элемента — поэтому `inject(InView)` в `LoadMore` нашёл директиву;
- провайдеры из поля `providers` компонента или директивы;
- служебные токены элемента: `ElementRef`, `DestroyRef`, `ChangeDetectorRef` и другие — поэтому каждая директива получает свой элемент и своё уничтожение.

Инжектор элемента создаётся вместе с элементом и уничтожается вместе с ним.

`inject()` в компоненте ищет так: сначала инжектор своего элемента, потом элементы-предки — по дереву шаблонов, — потом инжектор окружения, платформы и, наконец, `NullInjector` с ошибкой NG0201. Побеждает первый найденный. Вот путь для вкладки в окне «Подробнее»:

```
<app-tab>           Tab        ← начало
<app-tabs>          Tabs
<app-game-details>  GameDetails
<app-root>          App
инжектор окружения  CartStore, SHOP_CONFIG…
инжектор платформы
NullInjector        → NG0201
```

`<dialog>` между `<app-game-details>` и `<app-tabs>` в пути нет: на нём ни компонентов, ни директив, своего инжектора у него нет.

## Вкладки без эффекта-почтальона

В главе 6 `Tabs` сообщал вкладкам, какая видна, эффектом:

```ts shared/tabs/tabs.ts
effect(() => {
  const selected = this.selected();
  this.tabs().forEach((tab, index) => tab.active.set(index === selected));
});
```

Это ровно тот случай из главы 3, когда эффект не нужен: он только переносит значение из одного сигнала в другие. Лучше, если каждая вкладка сама вычислит `active` через `computed` — для этого ей нужен свой `Tabs`. Вкладка стоит внутри `<app-tabs>`, значит, `Tabs` — на её пути поиска, и его можно получить через `inject()`.

Напрашивается `inject(Tabs)`. Но `tabs.ts` уже импортирует `tab.ts` (`contentChildren(Tab)`), и импорт в обратную сторону замкнёт круг. Превью курса так и скажет:

```
Error: Циклический импорт: main.ts → app.ts → shared/game-details/game-details.ts → shared/tabs/tab.ts → shared/tabs/tabs.ts → shared/tabs/tab.ts. Превью курса не поддерживает циклические зависимости между файлами.
```

Сборщик настоящего проекта цикл бы пропустил, но такие циклы хрупкие: от порядка загрузки модулей зависит, успеет ли класс определиться. Библиотеки Angular решают эту задачу токеном — его объявляют в файле дочернего компонента, а родитель выдаёт по нему себя. Сделаем так же:

```ts shared/tabs/tab.ts
// Что вкладке нужно от компонента Tabs, внутри которого она стоит
export interface TabsParent {
  readonly selectedTab: Signal<Tab | undefined>;
}

// Ключ, по которому вкладка находит свой Tabs. Импортировать класс Tabs сюда нельзя:
// tabs.ts уже импортирует tab.ts, и файлы импортировали бы друг друга
export const TABS = new InjectionToken<TabsParent>('TABS');

export class Tab {
  readonly label = input.required<string>();

  // Tabs, внутри которого стоит вкладка: DI ищет TABS вверх по элементам
  private readonly tabs = inject(TABS);
  // Видна ли вкладка: выбрана ли в Tabs именно она
  protected readonly active = computed(() => this.tabs.selectedTab() === this);
}
```

```ts shared/tabs/tabs.ts {4-5,7,11-12}
@Component({
  selector: 'app-tabs',
  …
  // Кто внутри <app-tabs> попросит TABS, получит этот же экземпляр Tabs
  providers: [{ provide: TABS, useExisting: Tabs }],
})
export class Tabs implements TabsParent {
  protected readonly tabs = contentChildren(Tab);
  protected readonly selected = signal(0);
  // Выбранная вкладка. Каждая Tab сама сравнивает её с собой
  readonly selectedTab = computed(() => this.tabs()[this.selected()]);
  …
}
```

Здесь сошлось всё, что было в главе:

- `providers` в `@Component` кладёт провайдер в **инжектор элемента** `<app-tabs>`. Его увидят только те, кто ищет снизу через этот элемент, — вкладки внутри. Вкладки другого окна получат свой `Tabs`;
- `useExisting: Tabs` — «по токену `TABS` выдай то, что выдаёшь по `Tabs`», то есть сам компонент с этого элемента. Нового объекта не создаётся;
- `implements TabsParent` — проверка TypeScript, что `Tabs` действительно даёт вкладке то, что она ждёт. Сам `useExisting` типы не проверяет.

::: task
1. В `tab.ts` объявите интерфейс `TabsParent` и токен `TABS`. Вкладка получает `TABS` через `inject()`, а `active` становится `computed`: выбрана ли в `Tabs` эта вкладка. Сигнал `active` и его запись больше не нужны.
2. В `tabs.ts` добавьте `selectedTab` (`computed`), провайдер `{ provide: TABS, useExisting: Tabs }` и `implements TabsParent`. Эффект, который раздавал `active`, удалите.
:::

## Что получилось

Откройте «Подробнее»: вкладки переключаются, как раньше, полоска ездит. Но теперь `Tabs` не управляет вкладками, а каждая вкладка сама следит за выбором. Именно так устроен аккордеон в Angular CDK — библиотеке компонентов от команды Angular:

```js
// @angular/cdk/accordion
providers: [{ provide: CDK_ACCORDION, useExisting: CdkAccordion }],
…
class CdkAccordionItem {
  accordion = inject(CDK_ACCORDION, { optional: true, skipSelf: true });
```

Что значат `optional` и `skipSelf`, покажут эксперименты.

## Эксперимент: корзина на каждую карточку

Добавьте в `@Component` у `GameCard`:

```ts shared/game-card/game-card.ts
providers: [CartStore],
```

Теперь у каждой карточки свой `CartStore` в инжекторе её элемента — и поиск находит его раньше корневого. В консоли «Корзина: пусто» со счётчиком 6: создано шесть новых корзин. На «Острове сокровищ» пропала надпись «В корзине: 2 шт.» — его карточка смотрит в свою, пустую корзину. Нажмите дважды «В корзину» у «Драконьей почты»: карточка пишет «В корзине: 2 шт.», а шапка по-прежнему «3 · 4 870 ₽», и в мини-корзине «Драконьей почты» нет. Шапка и `App` получают корневую корзину, карточки — каждая свою.

Обратите внимание: в карточках пустая обычная `CartStore`, а не `DemoCartStore`. `providers: [CartStore]` — это `{ provide: CartStore, useClass: CartStore }`, подмена из `app.config.ts` сюда не дотягивается.

Для корзины это ошибка, а в других случаях — то, что нужно: например, у каждой формы своё состояние, а у каждого окна свой `Tabs`. Уберите `providers`.

## Флаги поиска

Вторым аргументом `inject()` можно изменить поиск:

| Флаг | Что меняет |
|---|---|
| `optional: true` | не нашёл — вернуть `null` вместо ошибки |
| `self: true` | искать только в инжекторе своего элемента |
| `skipSelf: true` | начать с родителя, свой элемент пропустить |
| `host: true` | не подниматься выше хоста компонента, в шаблоне которого стоит элемент |

## Эксперимент: вкладка без Tabs

Добавьте в `game-details.html` вкладку после `</app-tabs>`:

```html shared/game-details/game-details.html
<app-tab label="Отзывы">Отзывов пока нет</app-tab>
```

Окно «Подробнее» больше не открывается:

```
ERROR ɵNotFound: NG0201: No provider found for `InjectionToken TABS`. Source: Environment Injector.
```

На пути поиска этой вкладки нет `<app-tabs>`, поиск дошёл до инжектора окружения и не нашёл там ничего. Теперь сделайте зависимость необязательной:

```ts shared/tabs/tab.ts
private readonly tabs = inject(TABS, { optional: true });
protected readonly active = computed(() => !this.tabs || this.tabs.selectedTab() === this);
```

Тип поля стал `TabsParent | null`, и TypeScript заставил обработать `null`: вкладка без `Tabs` видна всегда. Окно открылось, «Отзывов пока нет» — под вкладками. Так `CdkAccordionItem` работает и внутри аккордеона, и сам по себе. Верните `inject(TABS)` и удалите лишнюю вкладку.

## Эксперимент: self и host

Попросите `TABS` с `{ self: true }`:

```
ERROR RuntimeError: NG0201: No provider for InjectionToken TABS found in NodeInjector.
```

`self` — только собственный элемент `<app-tab>`, а провайдер стоит на `<app-tabs>`. `NodeInjector` в сообщении — так в исходниках Angular называется инжектор элемента.

С `{ host: true }` вкладки работают: `<app-tabs>` стоит в том же шаблоне `GameDetails`, что и вкладка, — граница проходит по хосту `<app-game-details>`. А вот `inject(CartStore, { host: true })` в карточке даёт ту же ошибку «found in NodeInjector»: с `host` и `self` Angular не заглядывает в инжекторы окружения вовсе. Верните `inject(TABS)`.

`skipSelf` нужен, когда элемент сам выдаёт тот же токен, который ищет у предков. Аккордеон в CDK может быть вложен в другой аккордеон. Каждый элемент аккордеона ищет `CDK_ACCORDION` с `skipSelf`, а сам выдаёт по этому токену `undefined` — так вложенные элементы не видят чужой, внешний аккордеон.

## viewProviders

У компонента есть ещё поле `viewProviders`. Провайдеры оттуда видит только **шаблон** самого компонента. А содержимое, которое передал родитель через `<ng-content>`, — нет: оно написано в шаблоне родителя, и, по замыслу, ему не положено знать внутренности компонента. С `providers` видят оба.

```
<app-game-card>, кто видит провайдеры:
  providers     → шаблон карточки и стикеры
  viewProviders → только шаблон карточки
```

::: warning viewProviders и блоки @if
Мы проверили в Angular 22.2.1: стикер, который `App` передаёт в карточку внутри `@if`, видит `viewProviders` карточки, а стикер без `@if` — нет. Angular считает, что поиск «пришёл из шаблона компонента», когда переходит из одного представления в другое (`previousTView != currentTView` в исходниках), — а у блока `@if` своё представление. Если `viewProviders` прячут что-то важное, не полагайтесь на них для проецируемого содержимого внутри управляющих блоков.
:::
