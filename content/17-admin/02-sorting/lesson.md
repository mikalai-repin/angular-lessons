---
title: Сортировка
startFrom: custom
focus: admin/games-table/games-table.ts
url: /admin/games
api: [aria-sort, 'input({ transform })', queryParamsHandling, шаблонный тип]
---

Таблица показывает игры в том порядке, в каком они лежат на сервере. Администратору так неудобно: он хочет видеть, чего не осталось на складе, что самое дорогое, где найти игру по алфавиту. Сделаем, чтобы щелчок по заголовку колонки сортировал таблицу, а второй щелчок — разворачивал порядок.

## Что изменилось в коде

В `games-table.css` добавлены стили: кнопка в заголовке колонки выглядит как обычный текст, а стрелку ↑ или ↓ рисует CSS — по атрибуту `aria-sort`, о нём ниже.

## Где хранить сортировку

Как и у каталога в главе 10, — в адресе: `/admin/games?sort=-price`. Тогда порядок переживёт перезагрузку, а ссылку «самые дорогие игры» можно отправить коллеге. Сервер сортирует сам, параметром `sort`. Для админки учебный бэкенд умеет такие значения:

| `sort` | Порядок |
|---|---|
| `title` / `-title` | по названию: А→Я / Я→А |
| `price` / `-price` | по цене: дешёвые / дорогие сначала |
| `inStock` / `-inStock` | по остатку: меньше / больше сначала |

Минус — «наоборот». Так записывают сортировку многие API, и в TypeScript это удобно описать **шаблонным типом**:

```ts admin/games-table/games-table.ts
type SortColumn = 'title' | 'price' | 'inStock';
type Sort = SortColumn | `-${SortColumn}`;
```

`Sort` — это шесть строк: три колонки и три колонки с минусом. Опечатку вроде `'-prise'` TypeScript не пропустит.

## Сортировка — вход компонента

Query-параметр `sort` роутер кладёт во вход с тем же именем (`withComponentInputBinding`, глава 10). Адрес может набрать кто угодно, поэтому значение проходит через `transform`: незнакомое или пустое превращается в сортировку по названию.

```ts admin/games-table/games-table.ts {1-3,7}
function toSort(value: string | undefined): Sort {
  return value && SORTS.includes(value) ? (value as Sort) : 'title';
}

readonly sort = input('title', { transform: toSort });

protected readonly games = httpResource<GamesPage>(() => ({
  url: '/api/games',
  params: { sort: this.sort(), size: PAGE_SIZE },
}));
```

Ресурс читает `sort()` — сменился адрес, сменился вход, ушёл новый запрос.

## Заголовки колонок

Щелчок по заголовку меняет адрес. Та же колонка — обратный порядок, другая — по возрастанию:

```ts admin/games-table/games-table.ts
protected sortBy(column: SortColumn) {
  const sort: Sort =
    this.sort() === column ? `-${column}` : column;
  this.router.navigate([], {
    relativeTo: this.route,
    queryParams: { sort },
    queryParamsHandling: 'merge',
  });
}
```

`navigate([], { relativeTo })` — «тот же адрес», `merge` — оставить остальные параметры. Сейчас других нет, но в следующем шаге появятся поиск и страница.

В шаблоне заголовок — кнопка внутри `<th>`. Кнопка, а не щелчок по самой ячейке: до кнопки можно дойти клавишей Tab и нажать Enter.

```html admin/games-table/games-table.html {2}
<th scope="col" [attr.aria-sort]="sortOf('title')">
  <button class="sort" (click)="sortBy('title')">Игра</button>
</th>
```

**`aria-sort`** сообщает экранному диктору, как отсортирована колонка: `ascending` — по возрастанию, `descending` — по убыванию. У несортированных колонок атрибута не должно быть вовсе — поэтому `sortOf` возвращает `null`, а привязка атрибута с `null` атрибут убирает:

```ts admin/games-table/games-table.ts
protected sortOf(column: SortColumn) {
  const sort = this.sort();
  if (sort === column) {
    return 'ascending';
  }
  return sort === `-${column}` ? 'descending' : null;
}
```

А стрелку рисует CSS по тому же атрибуту: `[aria-sort='ascending'] .sort::after { content: ' ↑'; }`. Один источник правды для глаз и для диктора: стрелка не может показать одно, а атрибут — другое.

::: task
1. В `games-table.ts` объявите типы `SortColumn` и `Sort`, список `SORTS` и функцию `toSort`.
2. Добавьте вход `sort` с `transform: toSort`, передайте его в параметры ресурса.
3. Напишите `sortOf(column)` и `sortBy(column)` (для `sortBy` понадобятся `Router` и `ActivatedRoute`).
4. В шаблоне сделайте заголовки «Игра», «Цена» и «Склад» кнопками `.sort`, а у `<th>` — `[attr.aria-sort]`.
:::

## Что получилось

Таблица теперь сразу по алфавиту: «Весёлая ферма», «Гильдия алхимиков»… Щёлкните «Цена»: адрес `/admin/games?sort=price`, наверху «Домино» за 590 ₽, у заголовка стрелка ↑. Ещё раз — `sort=-price`, наверху «Механический город» за 4 490 ₽, стрелка ↓. Щёлкните «Склад»: наверху три игры, которых нет в наличии, — «Маяк», «Тайна старой башни» и «Ярмарка».

Каждый щелчок — новая запись в истории: кнопка «Назад» превью возвращает прежний порядок.

## Эксперименты

**Адрес от руки.** Наберите `/admin/games?sort=abc`: таблица по названию, в «Сети» — `GET /api/games?sort=title&size=10`. `toSort` не пропустил незнакомое значение на сервер.

**Без `null`.** Пусть `sortOf` для несортированной колонки возвращает `'none'` (это тоже допустимое значение `aria-sort`). Стрелки не изменились, а в DOM атрибут появился у каждого заголовка. Спецификация ARIA советует ставить `aria-sort` только одной колонке за раз — той, по которой отсортировано. Верните `null`.
