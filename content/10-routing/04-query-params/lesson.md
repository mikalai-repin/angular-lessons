---
title: Query-параметры
startFrom: custom
files: [main.ts, catalog/catalog.ts, catalog/catalog.html, home/home.html, app.routes.ts, app.config.ts, app.ts, app.html, app.css, layout/header/header.ts, layout/header/header.html, layout/header/header.css, home/home.ts, home/home.css, catalog/catalog.css, game/game-page.ts, game/game-page.html, game/game-page.css, cart/cart-page/cart-page.ts, cart/cart-page/cart-page.html, cart/cart-page/cart-page.css, core/cart-store.ts, core/favorites-store.ts, core/promo-codes.ts, core/analytics.ts, core/shop-config.ts, shared/game-card/game-card.ts, shared/game-card/game-card.html, shared/game-card/game-card.css, shared/tabs/tabs.ts, shared/tabs/tabs.html, shared/tabs/tabs.css, shared/tabs/tab.ts, shared/tabs/tab.html, shared/countdown/countdown.ts, shared/countdown/countdown.html, shared/countdown/countdown.css, shared/now.ts, shared/price-pipe.ts, shared/players-pipe.ts, shared/duration-pipe.ts, shared/plural.ts, shared/tooltip.ts, shared/in-view.ts, shared/lazy-image.ts, shared/load-more/load-more.ts, shared/load-more/load-more.html, shared/load-more/load-more.css, shared/rating/rating.ts, shared/rating/rating.html, shared/rating/rating.css, shared/quantity/quantity.ts, shared/quantity/quantity.html, shared/quantity/quantity.css, core/models.ts, core/games-data.ts, styles.css]
url: /catalog
focus: catalog/catalog.ts
api: [query-параметр, 'Router.navigate()', relativeTo, queryParams, queryParamsHandling, replaceUrl, '[queryParams]', ActivatedRoute]
---

Найдите в каталоге «кот», отметьте «Только в наличии» и нажмите ⟳. Фильтры сбросились: они жили в сигналах компонента, а компонент создан заново. И ссылку «посмотри, какие кооперативы есть в наличии» другу не отправить — адрес всё тот же `/catalog`.

Строка поиска, фильтры и сортировка — тоже состояние интерфейса, но особое: оно описывает, **что** показано на странице. Такому состоянию место в адресе: `/catalog?q=кот&inStock=true&sort=cheap`. Тогда фильтры переживают перезагрузку, ими можно поделиться, а «Назад» возвращает прошлый набор фильтров.

В коде шага — комментарии `TODO` в `catalog.ts`, `catalog.html` и `home.html`.

## Query-параметры

Часть адреса после `?` — **query-параметры** (query parameters): пары `ключ=значение` через `&`. В отличие от параметров маршрута, они не участвуют в выборе маршрута: `/catalog` и `/catalog?q=кот` — один и тот же маршрут `catalog`.

`withComponentInputBinding()` из прошлого шага передаёт во входы и их. Заменим сигналы фильтров входами:

```ts catalog/catalog.ts
// Строка поиска, фильтры и сортировка живут в адресе: /catalog?q=кот&inStock=true&rating=4.5&sort=cheap.
// Роутер передаёт query-параметры во входы. Нет параметра — во вход приходит undefined
readonly q = input('', { transform: (value: string | undefined) => value ?? '' });
readonly inStock = input(false, { transform: booleanAttribute });
readonly rating = input(0, { transform: (value: string | undefined) => numberAttribute(value, 0) });
readonly sort = input('default', { transform: toSortKey });
```

Здесь важна вторая строка комментария. Значение по умолчанию у входа (`''`, `false`, `0`) действует, только пока роутер ничего не передал. А роутер передаёт **всегда**: если параметра в адресе нет, во вход приходит `undefined` — так роутер не даёт залежаться значению от прошлого адреса. Поэтому у каждого входа есть преобразование, которое превращает `undefined` и строку из адреса в нормальное значение:

- `q` — `undefined` → `''`;
- `inStock` — `booleanAttribute` из главы 5: `'true'` → `true`, `undefined` → `false`;
- `rating` — `numberAttribute(value, 0)`: второй аргумент — что вернуть, если числа не получилось (`undefined` или `?rating=abc`);
- `sort` — своя функция `toSortKey`: адрес может набрать кто угодно, и незнакомое значение `?sort=xyz` превращается в сортировку по умолчанию.

```ts catalog/catalog.ts
// Значение ?sort= из адреса. Адрес может набрать кто угодно: незнакомое значение — сортировка по умолчанию
function toSortKey(value: string | undefined): SortKey {
  return value === 'cheap' || value === 'expensive' || value === 'rating' ? value : 'default';
}
```

`visibleGames` читает теперь `this.q()`, `this.inStock()`, `this.rating()`, `this.sort()` — остальное в нём не меняется.

## Навигация из кода

Входы только для чтения. Чтобы поменять фильтр, нужно поменять **адрес** — а роутер передаст новое значение во вход. Переходить по адресу из кода умеет сервис `Router`:

```ts catalog/catalog.ts
private readonly router = inject(Router);
private readonly route = inject(ActivatedRoute);

// Новые фильтры — новый адрес. merge оставляет остальные параметры, null убирает параметр из адреса
protected setFilters(filters: Params, replaceUrl = false) {
  this.router.navigate([], {
    relativeTo: this.route,
    queryParams: filters,
    queryParamsHandling: 'merge',
    replaceUrl,
  });
}
```

Разберём вызов:

- `navigate([], { relativeTo: this.route })` — перейти по пустому пути **относительно текущего маршрута**, то есть остаться на той же странице. `ActivatedRoute` — сервис, который знает, к какому маршруту относится компонент;
- `queryParams` — новые параметры;
- `queryParamsHandling: 'merge'` — смешать их с теми, что уже в адресе. Без него остался бы только переданный параметр: смена сортировки стёрла бы поиск;
- значение `null` убирает параметр из адреса совсем — так снятый флажок не превращается в `?inStock=false`;
- `replaceUrl` — заменить текущую запись истории вместо новой. Об этом — в эксперименте ниже.

В шаблоне элементы управления читают входы и вызывают `setFilters`:

```html catalog/catalog.html
<input #searchBox … [value]="q()" (input)="setFilters({ q: searchBox.value || null }, true)" />
…
<input #inStockBox type="checkbox" [checked]="inStock()" (change)="setFilters({ inStock: inStockBox.checked || null })" />
…
<app-rating [value]="rating()" (valueChange)="setFilters({ rating: $event || null })" />
<select #sortSelect … [value]="sort()" (change)="setFilters({ sort: sortSelect.value === 'default' ? null : sortSelect.value })">
```

Ссылки `#inStock` и `#sort` в шаблоне переименованы в `#inStockBox` и `#sortSelect`: теперь так называются входы, а имя ссылки в шаблоне закрыло бы их. Двусторонняя привязка `[(value)]="minRating"` у звёзд превратилась в пару `[value]` + `(valueChange)`: записывать во вход нельзя. `changeSort` больше не нужен, а `resetFilters` переходит на тот же адрес без параметров:

```ts catalog/catalog.ts
protected resetFilters() {
  // Тот же адрес без query-параметров
  this.router.navigate([], { relativeTo: this.route });
  …
}
```

## Ссылка с query-параметрами

У `routerLink` параметры задаются отдельной привязкой. На главной у «Хитов» появится ссылка на каталог, отсортированный по рейтингу:

```html home/home.html
<a routerLink="/catalog" [queryParams]="{ sort: 'rating' }">Все по рейтингу →</a>
```

::: task
1. В `Catalog` замените сигналы `query`, `inStockOnly`, `minRating`, `sortBy` входами `q`, `inStock`, `rating`, `sort` с преобразованиями и функцией `toSortKey`. Напишите `setFilters(filters, replaceUrl)` на `Router.navigate`, а `resetFilters` переведите на навигацию без параметров. Удалите `changeSort`.
2. В шаблоне каталога: поле поиска, флажок, звёзды и сортировка читают входы и вызывают `setFilters`; при вводе в поиск — с `replaceUrl`.
3. На главной рядом с заголовком «Хиты» — ссылка «Все по рейтингу →» на `/catalog?sort=rating` (разметка — `<div class="section-head">` с заголовком и ссылкой внутри, стили готовы).
:::

## Что получилось

Шаг открывается на `/catalog`. Наберите «кот» — адрес `/catalog?q=кот` (в адресной строке превью русские буквы закодированы: `%D0%BA%D0%BE%D1%82`). Отметьте «Только в наличии», выберите «Сначала дешёвые» — `?q=кот&inStock=true&sort=cheap`. Нажмите ⟳: каталог запустился заново с теми же фильтрами. Сотрите поиск — `q` исчез из адреса. «Сбросить фильтры» в пустой выдаче очищает адрес целиком.

Перейдите на главную и нажмите «Все по рейтингу →»: каталог открылся отсортированным, а «Каталог» в меню подчёркнут — `routerLinkActive` по умолчанию не требует совпадения query-параметров.

## Эксперимент: история

Откройте главную, по ссылке «Все по рейтингу →» перейдите в каталог, наберите «кот», сотрите его, отметьте флажок и смените сортировку. Теперь нажимайте ← в адресной строке превью. Мы проверили:

```
/catalog?sort=cheap&inStock=true    ← сейчас
/catalog?sort=rating&inStock=true
/catalog?sort=rating
/                                   ← главная
```

Флажок и сортировка — каждый своя запись истории: это осознанные шаги, и «Назад» должен их отменять. А ввод в поиск не оставил ни одной записи: каждая буква заменяла текущую (`replaceUrl: true`). Уберите `true` во втором аргументе `setFilters` в поле поиска и повторите: теперь между `?sort=rating` и главной — по записи на каждое состояние строки поиска, и «Назад» отматывает слово по буквам.

## Эксперимент: undefined во входе

Замените вход `q` на `readonly q = input('');` — без преобразования — и откройте `/catalog` без параметров. В консоли:

```
ERROR TypeError: Cannot read properties of undefined (reading 'trim')
```

`visibleGames` вызвал `this.q().trim()`, а во входе — `undefined`, хотя значение по умолчанию `''` и тип `string`. TypeScript этого не заметил: с его точки зрения вход строковый. Верните преобразование.

::: tip unmatchedInputBehavior
Если входу страницы роутер не должен ставить `undefined` (например, его задаёт не адрес), `withComponentInputBinding({ unmatchedInputBehavior: 'undefinedIfStale' })` ставит `undefined`, только если раньше значение во входе было из адреса. Но для входов, которые читают адрес, преобразование — самый надёжный вариант: оно же обрабатывает и мусор вроде `?rating=abc`.
:::

## Как в настоящем проекте

Что класть в адрес, решает интерфейс: всё, что описывает **содержимое** страницы и чем имеет смысл поделиться, — фильтры, поиск, номер страницы, выбранная вкладка. Что описывает **состояние самого пользователя** — корзина, вход в аккаунт — в адрес не кладут. В главе 11 эти же параметры каталога уйдут в запрос к серверу: `GET /api/games?q=кот&inStock=true`.
