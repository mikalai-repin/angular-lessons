---
title: Поиск и страницы
focus: admin/games-table/games-table.ts
url: /admin/games
api: [debounced, linkedSignal, numberAttribute, aria-current, replaceUrl]
---

Таблица показывает десять игр из сорока, и до остальных не добраться. Добавим номера страниц под таблицей и поиск над ней. Всё это вы уже делали в каталоге — здесь соберём вместе и посмотрим, где поиск и страницы мешают друг другу.

## Три параметра в адресе

Состояние таблицы — три query-параметра: `/admin/games?q=ка&sort=-price&page=2`. Каждый — вход компонента:

```ts admin/games-table/games-table.ts {1-3,5-8}
readonly q = input('', {
  transform: (value: string | undefined) => value ?? '',
});
readonly sort = input('title', { transform: toSort });
readonly page = input(1, {
  transform: (value: string | undefined) =>
    Math.max(numberAttribute(value, 1), 1),
});
```

`numberAttribute(value, 1)` превращает строку из адреса в число, а нечисло — в 1. `Math.max` не пустит нулевую и отрицательную страницу: адрес `?page=-3` откроет первую.

## Запрос

```ts admin/games-table/games-table.ts {1,6-7}
private readonly query = debounced(() => this.q(), 300);

protected readonly games = httpResource<GamesPage>(() => ({
  url: '/api/games',
  params: {
    q: this.query.value(),
    sort: this.sort(),
    page: this.page(),
    size: PAGE_SIZE,
  },
}));
```

Как в каталоге главы 11: адрес меняется на каждую букву, а запрос уходит, когда админ сделал паузу в 300 мс. Страница и сортировка — без задержки: щелчок есть щелчок.

## Прежние строки на время загрузки

Пока грузится следующая страница, у ресурса нет значения. Если показывать `games.value()`, таблица на каждом щелчке будет исчезать и появляться — а с ней и номера страниц, по которым щёлкают. Поэтому таблица показывает **последний полученный ответ**, а пока грузится новый — делает его бледнее:

```ts admin/games-table/games-table.ts
protected readonly shown = linkedSignal<
  GamesPage | undefined,
  GamesPage | undefined
>({
  source: () =>
    this.games.hasValue() ? this.games.value() : undefined,
  computation: (page, previous) => page ?? previous?.value,
});
```

Пришёл ответ — `shown` равен ему. Ресурс загружается (`undefined`) — `shown` помнит прошлое значение. Это тот же приём, что у счётчика «Найдено игр» в каталоге.

Номера страниц считаются из ответа: сколько всего игр нашлось и сколько на странице.

```ts admin/games-table/games-table.ts
protected readonly pages = computed(() => {
  const shown = this.shown();
  const count = shown ? Math.ceil(shown.total / shown.size) : 0;
  return Array.from({ length: count }, (_, i) => i + 1);
});
```

## Кто сбрасывает страницу

Админ на третьей странице набирает «ка». Нашлось 12 игр — две страницы. Третьей нет: таблица была бы пустой. Новый поиск должен начинаться с первой страницы, новая сортировка — тоже. Поэтому `search` и `sortBy` убирают `page` из адреса, а все переходы идут через один помощник:

```ts admin/games-table/games-table.ts {2,7}
protected search(q: string) {
  this.setParams({ q: q || null, page: null }, true);
}

protected sortBy(column: SortColumn) {
  const sort: Sort = this.sort() === column ? `-${column}` : column;
  this.setParams({ sort, page: null });
}

protected goTo(page: number) {
  this.setParams({ page: page === 1 ? null : page });
}

private setParams(params: Params, replaceUrl = false) {
  this.router.navigate([], {
    relativeTo: this.route,
    queryParams: params,
    queryParamsHandling: 'merge',
    replaceUrl,
  });
}
```

`null` убирает параметр из адреса, `merge` оставляет остальные. У поиска `replaceUrl`: каждая буква заменяет запись в истории, а не добавляет новую — «Назад» не будет стирать по букве.

## Шаблон

Над таблицей — поле поиска, как в каталоге. Таблица читает `shown()`, под ней — номера страниц:

```html admin/games-table/games-table.html
@if (pages().length > 1) {
  <nav class="pages" aria-label="Страницы">
    @for (n of pages(); track n) {
      <button
        [attr.aria-current]="n === page() ? 'page' : null"
        (click)="goTo(n)"
      >
        {{ n }}
      </button>
    }
  </nav>
}
```

`aria-current="page"` — текущая страница: диктор скажет «текущая», а CSS закрасит кнопку. Ошибку загрузки показываем по `games.status() === 'error'`, а не `error()`: после «Повторить» `error()` помнит прошлую ошибку, пока не придёт ответ (ловушка главы 11).

::: task
1. Добавьте входы `q` и `page` (со своими `transform`), строку поиска с задержкой `query` и передайте все три параметра в ресурс.
2. Добавьте `shown` и `pages`.
3. Напишите `search`, `goTo` и `setParams`; `sortBy` переведите на `setParams` со сбросом страницы.
4. В шаблоне: поле поиска `.search` (`[value]="q()"`, `(input)` → `search`), таблица по `shown()` с классом `loading` во время загрузки, строка «Ничего не найдено» в `@empty`, номера страниц `.pages`, ошибка по `status()`.
:::

## Что получилось

Под таблицей — кнопки 1, 2, 3, 4, первая закрашена. Щёлкните «3»: адрес `?page=3`, таблица начинается с «Моста через реку» — по алфавиту дальше, чем первые двадцать. Наберите в поиске «ка»: «Найдено игр: 12», страниц две, адрес `?q=ка` — страница из него пропала. Сервер ищет и по тегам, поэтому среди найденных есть и игры без «ка» в названии.

Нажмите «Назад» в превью: первая страница без поиска. Не третья — потому что `replaceUrl` заменяет **текущую** запись истории, а текущей, когда вы начали печатать, была `?page=3`. Буквы «к» и «а» заменили её, и в истории их тоже нет.

Поставьте во вкладке «Сеть» задержку 1500 мс и пощёлкайте по страницам: таблица на месте, только бледнеет, пока не придёт ответ.

Посмотрите в «Сети», что ушло, когда вы начали печатать на третьей странице. Два запроса: `page=1` с пустым `q` и только потом `q=ка`. Первая буква сразу убрала `page` из адреса, а текст поиска дошёл до запроса через 300 мс. Цена простоты: страница и поиск меняются в разное время. Лишний запрос безвреден — его ответ тут же заменяет следующий, а если он не успел, `httpResource` его отменяет.

## Эксперимент

**Без `shown`.** Поменяйте `@if (shown(); as shown)` на `@if (games.hasValue() ? games.value() : undefined; as shown)` и пощёлкайте по страницам с задержкой 1500 мс. На каждом щелчке таблица и номера страниц исчезают, на их месте — «Загружаем игры…». Верните `shown`.

::: tip
Номера всех страниц подряд годятся, пока их немного. Когда страниц сотни, показывают первую, последнюю и несколько вокруг текущей: «1 … 7 8 9 … 120». Это та же `computed`, только с другой арифметикой.
:::
