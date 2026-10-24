# Генератор кода шагов главы 17 «Админка».
# Запуск: python3 tools/authoring/ch17-gen.py — ПЕРЕЗАПИСЫВАЕТ start/ и solution/ всех шагов главы 17.
#         python3 tools/authoring/ch17-gen.py dump <папка> — полные снимки шагов в <папка>/<шаг>/<start|solution>
#         (для опытов: tools/e2e/run-dir.mjs и exp.mjs принимают такую папку).
# Старт главы — решение практикума главы 16 (08-practice). Глава строит раздел admin/: макет с меню, таблицу игр
# (сортировка, поиск, страницы — в адресе), форму редактирования, сервис раздела AdminGames (провайдер маршрута),
# очистку кэша после изменений, окно подтверждения (createComponent) и создание игры с загрузкой обложки.
# Шаги — полные снимки: каждый строится правками (edit) поверх результата предыдущего шага.
# Код форматирует write_steps (как кнопка «Формат» в редакторе). После запуска: npm run validate.
# Тексты уроков (lesson.md) пишутся отдельно, руками; генератор их не трогает.
import os, shutil, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from steps import PROJECT, format_snapshots, read_dir, rep, step_dir, write_steps

ROOT = f'{PROJECT}/content/17-admin'
BASE = read_dir(step_dir(f'{PROJECT}/content/16-testing/08-practice/solution'))


def edit(files, name, *pairs):
    """Копия снимка, в которой файл name изменён заменами (старое, новое)."""
    out = dict(files)
    text = out[name]
    for old, new in pairs:
        text = rep(text, old, new)
    out[name] = text
    return out


def put(files, **named):
    """Копия снимка с новыми или заменёнными файлами: put(S, **{'admin/x.ts': '…'})."""
    out = dict(files)
    out.update(named)
    return out


# ---------- 17.1 Раздел админки: макет и вложенные маршруты ----------

# Сводка теперь — страница внутри макета: заголовок «Админка» и меню рисует макет
S1_START = edit(BASE, 'admin/admin-home/admin-home.html',
    ('<h1>Админка</h1>\n', ''),
    ("""  <p class="muted">
    Разделы «Игры» и «Заказы» появятся в главе 17.
  </p>
""", ''),
)

LAYOUT_TS_START = """import { Component } from '@angular/core';

// Макет админки: заголовок, меню разделов и место для страницы раздела
@Component({
  selector: 'app-admin-layout',
  // TODO: подключите RouterLink, RouterLinkActive и RouterOutlet
  imports: [],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css',
})
export class AdminLayout {}
"""

LAYOUT_TS = """import { Component } from '@angular/core';
import {
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';

// Макет админки: заголовок, меню разделов и место для страницы раздела
@Component({
  selector: 'app-admin-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css',
})
export class AdminLayout {}
"""

LAYOUT_HTML_START = """<h1>Админка</h1>
<!-- TODO: меню разделов «Сводка» (/admin) и «Игры» (/admin/games), под ним — место для страницы раздела -->
"""

LAYOUT_HTML = """<h1>Админка</h1>
<!-- Ссылки относительные: от адреса макета, /admin. «.» — сам /admin -->
<nav class="sections">
  <a
    routerLink="."
    routerLinkActive="active"
    [routerLinkActiveOptions]="{ exact: true }"
    ariaCurrentWhenActive="page"
    >Сводка</a
  >
  <a
    routerLink="games"
    routerLinkActive="active"
    ariaCurrentWhenActive="page"
    >Игры</a
  >
</nav>
<!-- Сюда роутер выводит страницу раздела: сводку или таблицу игр -->
<router-outlet />
"""

LAYOUT_CSS = """/* Меню разделов админки — как в кабинете */
.sections {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
  border-bottom: 1px solid #d2d2d7;
}

.sections a {
  padding: 6px 0;
  color: var(--muted);
  text-decoration: none;
}

/* Текущий раздел: класс active ставит routerLinkActive */
.sections a.active {
  border-bottom: 2px solid var(--brand);
  color: var(--text);
}
"""

TABLE_TS_1 = """import { Component } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { GamesPage } from '../../core/models';
import { PricePipe } from '../../shared/price-pipe';

// Сколько игр в таблице на одной странице
const PAGE_SIZE = 10;

// Таблица игр в админке: название, цена и остаток на складе
@Component({
  selector: 'app-games-table',
  imports: [PricePipe],
  templateUrl: './games-table.html',
  styleUrl: './games-table.css',
})
export class GamesTable {
  // Первая страница каталога — тот же GET /api/games, что у покупателя
  protected readonly games = httpResource<GamesPage>(() => ({
    url: '/api/games',
    params: { size: PAGE_SIZE },
  }));
}
"""

TABLE_HTML_1 = """@if (games.hasValue()) {
  @let page = games.value();
  <p class="muted">Игр в каталоге: {{ page.total }}</p>
  <table class="table">
    <thead>
      <tr>
        <!-- scope="col" — заголовок колонки: экранный диктор прочитает его у каждой ячейки -->
        <th scope="col">Игра</th>
        <th scope="col" class="num">Цена</th>
        <th scope="col" class="num">Склад</th>
      </tr>
    </thead>
    <tbody>
      @for (game of page.items; track game.id) {
        <tr>
          <td>{{ game.title }}</td>
          <td class="num">{{ game.price | price }}</td>
          <td class="num" [class.out]="game.inStock === 0">
            {{ game.inStock }}
          </td>
        </tr>
      }
    </tbody>
  </table>
} @else if (games.isLoading()) {
  <p class="muted">Загружаем игры…</p>
} @else if (games.error()) {
  <p class="error-message">
    Не удалось загрузить игры.
    <button class="link-button" (click)="games.reload()">
      Повторить
    </button>
  </p>
}
"""

TABLE_CSS_1 = """/* Таблица игр: во всю ширину, строки разделены линией */
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.table th,
.table td {
  padding: 6px 4px;
  border-bottom: 1px solid #d2d2d7;
  text-align: left;
}

.table th {
  color: var(--muted);
  font-weight: 500;
}

/* Числа — по правому краю: так разряды стоят друг под другом */
.table .num {
  text-align: right;
  white-space: nowrap;
}

/* Игры нет на складе */
.table .out {
  color: var(--brand);
  font-weight: 600;
}
"""

S1_START = put(S1_START, **{
    'admin/admin-layout/admin-layout.ts': LAYOUT_TS_START,
    'admin/admin-layout/admin-layout.html': LAYOUT_HTML_START,
    'admin/admin-layout/admin-layout.css': LAYOUT_CSS,
    'admin/games-table/games-table.ts': TABLE_TS_1,
    'admin/games-table/games-table.html': TABLE_HTML_1,
    'admin/games-table/games-table.css': TABLE_CSS_1,
})

ROUTES_1 = """import { Routes } from '@angular/router';
import { AdminHome } from './admin-home/admin-home';
import { AdminLayout } from './admin-layout/admin-layout';
import { GamesTable } from './games-table/games-table';

// Только для урока: строка появится в консоли, когда браузер загрузит этот модуль
console.log('Админка: модуль загружен');

// Маршруты админки. Гард adminGuard стоит выше, на маршруте admin в app.routes.ts:
// пока он не пустил, роутер не дойдёт ни до одного маршрута этого файла
export const adminRoutes: Routes = [
  {
    path: '',
    component: AdminLayout,
    children: [
      { path: '', component: AdminHome, title: 'Админка' },
      {
        path: 'games',
        component: GamesTable,
        title: 'Игры',
        data: { breadcrumb: 'Игры' },
      },
    ],
  },
];
"""

S1 = put(S1_START, **{
    'admin/admin.routes.ts': ROUTES_1,
    'admin/admin-layout/admin-layout.ts': LAYOUT_TS,
    'admin/admin-layout/admin-layout.html': LAYOUT_HTML,
})

# ---------- 17.2 Сортировка ----------

TABLE_TS_2 = """import { Component, inject, input } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { GamesPage } from '../../core/models';
import { PricePipe } from '../../shared/price-pipe';

// Сколько игр в таблице на одной странице
const PAGE_SIZE = 10;

// Колонки, по которым сортирует таблица. Порядок — в параметре sort API:
// 'price' — по возрастанию, '-price' — по убыванию
type SortColumn = 'title' | 'price' | 'inStock';
type Sort = SortColumn | `-${SortColumn}`;
const SORTS: readonly string[] = [
  'title',
  '-title',
  'price',
  '-price',
  'inStock',
  '-inStock',
];

// Значение ?sort= из адреса. Незнакомое или пустое — по названию
function toSort(value: string | undefined): Sort {
  return value && SORTS.includes(value) ? (value as Sort) : 'title';
}

// Таблица игр в админке: название, цена и остаток на складе
@Component({
  selector: 'app-games-table',
  imports: [PricePipe],
  templateUrl: './games-table.html',
  styleUrl: './games-table.css',
})
export class GamesTable {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // Сортировка живёт в адресе: /admin/games?sort=-price. Во вход её кладёт роутер
  readonly sort = input('title', { transform: toSort });

  protected readonly games = httpResource<GamesPage>(() => ({
    url: '/api/games',
    params: { sort: this.sort(), size: PAGE_SIZE },
  }));

  // Как отсортирована колонка — для атрибута aria-sort. У несортированной атрибута нет
  protected sortOf(column: SortColumn) {
    const sort = this.sort();
    if (sort === column) {
      return 'ascending';
    }
    return sort === `-${column}` ? 'descending' : null;
  }

  // Щелчок по заголовку: та же колонка — обратный порядок, другая — по возрастанию
  protected sortBy(column: SortColumn) {
    const sort: Sort =
      this.sort() === column ? `-${column}` : column;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { sort },
      queryParamsHandling: 'merge',
    });
  }
}
"""

TABLE_HEAD_1 = """        <th scope="col">Игра</th>
        <th scope="col" class="num">Цена</th>
        <th scope="col" class="num">Склад</th>
"""

TABLE_HEAD_2 = """        <!-- aria-sort — как отсортирована колонка. По нему же CSS рисует стрелку -->
        <th scope="col" [attr.aria-sort]="sortOf('title')">
          <button class="sort" (click)="sortBy('title')">
            Игра
          </button>
        </th>
        <th
          scope="col"
          class="num"
          [attr.aria-sort]="sortOf('price')"
        >
          <button class="sort" (click)="sortBy('price')">
            Цена
          </button>
        </th>
        <th
          scope="col"
          class="num"
          [attr.aria-sort]="sortOf('inStock')"
        >
          <button class="sort" (click)="sortBy('inStock')">
            Склад
          </button>
        </th>
"""

TABLE_CSS_SORT = """
/* Заголовок колонки — кнопка сортировки */
.sort {
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

/* Стрелка — по aria-sort: тот же атрибут, что слышит экранный диктор */
[aria-sort='ascending'] .sort::after {
  content: ' ↑';
}

[aria-sort='descending'] .sort::after {
  content: ' ↓';
}
"""

S2_START = edit(S1, 'admin/games-table/games-table.css', ('  font-weight: 600;\n}\n', '  font-weight: 600;\n}\n' + TABLE_CSS_SORT))
S2 = put(S2_START, **{'admin/games-table/games-table.ts': TABLE_TS_2})
S2 = edit(S2, 'admin/games-table/games-table.html', (TABLE_HEAD_1, TABLE_HEAD_2))

# ---------- 17.3 Поиск и страницы ----------

TABLE_TS_3 = """import {
  Component,
  computed,
  debounced,
  inject,
  input,
  linkedSignal,
  numberAttribute,
} from '@angular/core';
import { httpResource } from '@angular/common/http';
import {
  ActivatedRoute,
  Params,
  Router,
} from '@angular/router';
import { GamesPage } from '../../core/models';
import { PricePipe } from '../../shared/price-pipe';

// Сколько игр в таблице на одной странице
const PAGE_SIZE = 10;

// Колонки, по которым сортирует таблица. Порядок — в параметре sort API:
// 'price' — по возрастанию, '-price' — по убыванию
type SortColumn = 'title' | 'price' | 'inStock';
type Sort = SortColumn | `-${SortColumn}`;
const SORTS: readonly string[] = [
  'title',
  '-title',
  'price',
  '-price',
  'inStock',
  '-inStock',
];

// Значение ?sort= из адреса. Незнакомое или пустое — по названию
function toSort(value: string | undefined): Sort {
  return value && SORTS.includes(value) ? (value as Sort) : 'title';
}

// Таблица игр в админке: поиск, сортировка, страницы
@Component({
  selector: 'app-games-table',
  imports: [PricePipe],
  templateUrl: './games-table.html',
  styleUrl: './games-table.css',
})
export class GamesTable {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // Поиск, сортировка и страница живут в адресе: /admin/games?q=кот&sort=-price&page=2
  readonly q = input('', {
    transform: (value: string | undefined) => value ?? '',
  });
  readonly sort = input('title', { transform: toSort });
  readonly page = input(1, {
    transform: (value: string | undefined) =>
      Math.max(numberAttribute(value, 1), 1),
  });

  // Строка поиска с задержкой: запрос — когда админ сделал паузу в наборе
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

  // Последний полученный ответ: пока грузится следующий, таблица показывает прежние строки
  protected readonly shown = linkedSignal<
    GamesPage | undefined,
    GamesPage | undefined
  >({
    source: () =>
      this.games.hasValue() ? this.games.value() : undefined,
    computation: (page, previous) => page ?? previous?.value,
  });

  // Номера страниц: 1, 2, 3… — сколько их, считаем по total и size из ответа
  protected readonly pages = computed(() => {
    const shown = this.shown();
    const count = shown ? Math.ceil(shown.total / shown.size) : 0;
    return Array.from({ length: count }, (_, i) => i + 1);
  });

  // Как отсортирована колонка — для атрибута aria-sort. У несортированной атрибута нет
  protected sortOf(column: SortColumn) {
    const sort = this.sort();
    if (sort === column) {
      return 'ascending';
    }
    return sort === `-${column}` ? 'descending' : null;
  }

  // Щелчок по заголовку: та же колонка — обратный порядок, другая — по возрастанию.
  // Новый порядок — снова с первой страницы
  protected sortBy(column: SortColumn) {
    const sort: Sort =
      this.sort() === column ? `-${column}` : column;
    this.setParams({ sort, page: null });
  }

  // Новый текст поиска — первая страница. replaceUrl: каждая буква — не новая запись в истории
  protected search(q: string) {
    this.setParams({ q: q || null, page: null }, true);
  }

  protected goTo(page: number) {
    this.setParams({ page: page === 1 ? null : page });
  }

  // Новые параметры — новый адрес. merge оставляет остальные, null убирает параметр
  private setParams(params: Params, replaceUrl = false) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
      replaceUrl,
    });
  }
}
"""

TABLE_HTML_3 = """<input
  #searchBox
  class="search"
  type="search"
  placeholder="Найти игру"
  aria-label="Поиск по названию"
  [value]="q()"
  (input)="search(searchBox.value)"
/>
@if (shown(); as shown) {
  <p class="muted">Найдено игр: {{ shown.total }}</p>
  <!-- Пока грузится новая страница, видна прежняя — бледнее -->
  <table class="table" [class.loading]="games.isLoading()">
    <thead>
      <tr>
""" + TABLE_HEAD_2 + """      </tr>
    </thead>
    <tbody>
      @for (game of shown.items; track game.id) {
        <tr>
          <td>{{ game.title }}</td>
          <td class="num">{{ game.price | price }}</td>
          <td class="num" [class.out]="game.inStock === 0">
            {{ game.inStock }}
          </td>
        </tr>
      } @empty {
        <tr>
          <td colspan="3" class="muted">Ничего не найдено</td>
        </tr>
      }
    </tbody>
  </table>
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
} @else if (games.isLoading()) {
  <p class="muted">Загружаем игры…</p>
}
@if (games.status() === 'error') {
  <p class="error-message">
    Не удалось загрузить игры.
    <button class="link-button" (click)="games.reload()">
      Повторить
    </button>
  </p>
}
"""

TABLE_CSS_3 = """/* Поиск над таблицей */
.search {
  box-sizing: border-box;
  width: 100%;
  max-width: 320px;
  padding: 8px;
  border: 1px solid #d2d2d7;
  border-radius: 8px;
  font: inherit;
}

"""

TABLE_CSS_PAGES = """
/* Пока грузится новая страница — прежняя бледнее */
.table.loading {
  opacity: 0.5;
}

/* Номера страниц под таблицей */
.pages {
  display: flex;
  gap: 6px;
  margin-top: 12px;
}

.pages button {
  min-width: 32px;
  padding: 4px 8px;
  border: 1px solid #d2d2d7;
  border-radius: 6px;
  background: #fff;
  font: inherit;
  cursor: pointer;
}

/* Текущая страница: aria-current сообщает о ней экранному диктору, а цвет — глазам */
.pages button[aria-current='page'] {
  border-color: var(--brand);
  background: var(--brand);
  color: #fff;
}
"""

S3 = put(S2, **{
    'admin/games-table/games-table.ts': TABLE_TS_3,
    'admin/games-table/games-table.html': TABLE_HTML_3,
})
S3 = edit(S3, 'admin/games-table/games-table.css',
    ('/* Таблица игр: во всю ширину', TABLE_CSS_3 + '/* Таблица игр: во всю ширину'),
    ("  content: ' ↓';\n}\n", "  content: ' ↓';\n}\n" + TABLE_CSS_PAGES),
)

# ---------- 17.4 Форма редактирования ----------

SCHEMA_TS = """import {
  min,
  required,
  schema,
  validate,
} from '@angular/forms/signals';
import { Game } from '../core/models';

// Категории игр: значение поля и подпись в списке
export const CATEGORIES: { id: Game['category']; title: string }[] =
  [
    { id: 'family', title: 'Семейные' },
    { id: 'strategy', title: 'Стратегии' },
    { id: 'party', title: 'Для вечеринок' },
    { id: 'cooperative', title: 'Кооперативные' },
    { id: 'kids', title: 'Детские' },
  ];

// Игра в форме админки: поля, которые меняет администратор.
// Числа — number | null: пустое числовое поле формы даёт null. Цена до скидки null — скидки нет
export interface GameDraft {
  title: string;
  category: Game['category'];
  cover: string;
  price: number | null;
  oldPrice: number | null;
  inStock: number | null;
  players: { min: number | null; max: number | null };
  playTime: number | null;
  age: number | null;
  description: string;
}

// Игра с сервера → черновик для формы
export function toDraft(game: Game): GameDraft {
  return {
    title: game.title,
    category: game.category,
    cover: game.cover,
    price: game.price,
    oldPrice: game.oldPrice ?? null,
    inStock: game.inStock,
    players: { ...game.players },
    playTime: game.playTime,
    age: game.age,
    description: game.description,
  };
}

"""

SCHEMA_RULES_HEAD = """// Правила игры. Те же проверяет сервер: форма лишь сообщает об ошибке раньше
export const gameSchema = schema<GameDraft>((game) => {
  required(game.title, { message: 'Нужно название' });
  required(game.price, { message: 'Нужна цена' });
  min(game.price, 1, { message: 'Цена — больше нуля' });
"""

SCHEMA_RULES_OLD_PRICE = """  // Цена до скидки, если она есть, — больше цены. Правило поля oldPrice читает и соседнее поле
  validate(game.oldPrice, ({ value, valueOf }) => {
    const oldPrice = value();
    const price = valueOf(game.price);
    return oldPrice !== null && price !== null && oldPrice <= price
      ? {
          kind: 'old-price',
          message: 'Цена до скидки — больше цены',
        }
      : undefined;
  });
"""

SCHEMA_RULES_TAIL = """  required(game.inStock, { message: 'Сколько на складе?' });
  min(game.inStock, 0, { message: 'Не меньше нуля' });
  required(game.players.min, { message: 'Нужно число' });
  min(game.players.min, 1, { message: 'Хотя бы один' });
  validate(game.players.max, ({ value, valueOf }) => {
    const max = value();
    const from = valueOf(game.players.min);
    return max === null || (from !== null && max < from)
      ? { kind: 'players', message: 'Не меньше, чем «от»' }
      : undefined;
  });
  required(game.playTime, { message: 'Нужно число' });
  min(game.playTime, 1, { message: 'Хотя бы минута' });
  required(game.age, { message: 'Нужно число' });
  min(game.age, 0, { message: 'Не меньше нуля' });
});
"""

SCHEMA_TS_START = SCHEMA_TS + SCHEMA_RULES_HEAD + """  // TODO: цена до скидки, если она есть, — больше цены
""" + SCHEMA_RULES_TAIL
SCHEMA_TS_FULL = SCHEMA_TS + SCHEMA_RULES_HEAD + SCHEMA_RULES_OLD_PRICE + SCHEMA_RULES_TAIL

SCHEMA_SPEC_HEAD = """import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form } from '@angular/forms/signals';
import { fakeGame } from '../testing/fake-game';
import { GameDraft, gameSchema, toDraft } from './game-schema';

// Форма по схеме игры — без компонента, как схема заказа в главе 16
function gameForm(draft: GameDraft) {
  return TestBed.runInInjectionContext(() =>
    form(signal(draft), gameSchema),
  );
}

describe('gameSchema', () => {
  it('игра с сервера проходит проверку', () => {
    const game = gameForm(toDraft(fakeGame({ price: 1990 })));
    expect(game().valid()).toBe(true);
  });

  it('цена 0 — ошибка у цены', () => {
    const game = gameForm({
      ...toDraft(fakeGame()),
      price: 0,
    });
    expect(game.price().errors()).toMatchObject([
      { kind: 'min', message: 'Цена — больше нуля' },
    ]);
  });
"""

SCHEMA_SPEC_START = SCHEMA_SPEC_HEAD + """
  // TODO: цена до скидки не больше цены — ошибка у oldPrice; без скидки (null) — ошибки нет
});
"""

SCHEMA_SPEC = SCHEMA_SPEC_HEAD + """
  it('цена до скидки не больше цены — ошибка у oldPrice', () => {
    const game = gameForm({
      ...toDraft(fakeGame({ price: 1990 })),
      oldPrice: 1990,
    });
    expect(game.oldPrice().errors()).toMatchObject([
      { kind: 'old-price' },
    ]);
  });

  it('без скидки (null) — ошибки нет', () => {
    const game = gameForm({
      ...toDraft(fakeGame()),
      oldPrice: null,
    });
    expect(game.oldPrice().errors()).toEqual([]);
  });
});
"""

FIELDS_TS = """import { Component, input } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { FieldAria } from '../../shared/field-aria';
import { FieldErrors } from '../../shared/field-errors/field-errors';
import { CATEGORIES, GameDraft } from '../game-schema';

// Поля игры: название, категория, цены, склад, характеристики, описание.
// Сама форма — у страницы, которая её создала; сюда приходит её дерево полей
@Component({
  selector: 'app-game-fields',
  imports: [FieldAria, FieldErrors, FormField],
  templateUrl: './game-fields.html',
  styleUrl: './game-fields.css',
})
export class GameFields {
  readonly fields = input.required<FieldTree<GameDraft>>();

  protected readonly categories = CATEGORIES;
}
"""

FIELDS_HTML = """@let game = fields();
<label class="field">
  Название
  <input [formField]="game.title" />
  <app-field-errors [field]="game.title" />
</label>
<label class="field">
  Категория
  <select [formField]="game.category">
    @for (category of categories; track category.id) {
      <option [value]="category.id">{{ category.title }}</option>
    }
  </select>
</label>
<div class="row">
  <label class="field">
    Цена, ₽
    <input type="number" [formField]="game.price" />
    <app-field-errors [field]="game.price" />
  </label>
  <label class="field">
    До скидки, ₽
    <input type="number" [formField]="game.oldPrice" />
    <app-field-errors [field]="game.oldPrice" />
  </label>
  <label class="field">
    На складе, шт.
    <input type="number" [formField]="game.inStock" />
    <app-field-errors [field]="game.inStock" />
  </label>
</div>
<div class="row">
  <label class="field">
    Игроков от
    <input type="number" [formField]="game.players.min" />
    <app-field-errors [field]="game.players.min" />
  </label>
  <label class="field">
    Игроков до
    <input type="number" [formField]="game.players.max" />
    <app-field-errors [field]="game.players.max" />
  </label>
  <label class="field">
    Партия, мин
    <input type="number" [formField]="game.playTime" />
    <app-field-errors [field]="game.playTime" />
  </label>
  <label class="field">
    Возраст от
    <input type="number" [formField]="game.age" />
    <app-field-errors [field]="game.age" />
  </label>
</div>
<label class="field">
  Описание
  <textarea rows="4" [formField]="game.description"></textarea>
</label>
"""

FIELDS_CSS = """/* Короткие числовые поля — по несколько в ряд */
.row {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 0 12px;
  max-width: 480px;
}
"""

EDIT_TS_HEAD = """import {
  Component,
  inject,
  input,
  linkedSignal,
  numberAttribute,
} from '@angular/core';
import {
  HttpClient,
  HttpContext,
  HttpErrorResponse,
  httpResource,
} from '@angular/common/http';
import { FormRoot, form } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CACHE } from '../../core/cache-interceptor';
import { Game } from '../../core/models';
import { GameFields } from '../game-fields/game-fields';
import { GameDraft, gameSchema, toDraft } from '../game-schema';

// Пустой черновик: пока игра не пришла с сервера, форму не показываем, но модель у неё уже есть
const EMPTY: GameDraft = {
  title: '',
  category: 'family',
  cover: '',
  price: null,
  oldPrice: null,
  inStock: null,
  players: { min: null, max: null },
  playTime: null,
  age: null,
  description: '',
};

// Страница редактирования игры: форма с данными с сервера, «Сохранить» — PUT /api/games/:id
@Component({
  selector: 'app-game-edit',
  imports: [FormRoot, GameFields, RouterLink],
  templateUrl: './game-edit.html',
  styleUrl: './game-edit.css',
})
export class GameEdit {
  // Параметр маршрута :id — во вход его кладёт роутер
  readonly id = input.required({ transform: numberAttribute });

  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // Игра с сервера. Метка CACHE: только что эту игру загрузил резолвер крошки — ответ возьмём из кэша
  protected readonly game = httpResource<Game>(() => ({
    url: `/api/games/${this.id()}`,
    context: new HttpContext().set(CACHE, true),
  }));
"""

EDIT_TS_START = EDIT_TS_HEAD + """
  // TODO: черновик — модель формы: пришла игра с сервера — черновик начинается с неё (linkedSignal)
  private readonly draft = linkedSignal<GameDraft>(() => EMPTY);

  // TODO: форма поверх черновика со схемой gameSchema; отправка — save()
}
"""

EDIT_TS_MODEL = """
  // Черновик — модель формы. Пришла игра с сервера — черновик начинается с неё
  private readonly draft = linkedSignal<GameDraft>(() =>
    this.game.hasValue() ? toDraft(this.game.value()) : EMPTY,
  );
  protected readonly gameForm = form(this.draft, gameSchema, {
    submission: { action: () => this.save() },
  });
"""

EDIT_SAVE_4 = """
  // Сохранение: черновик — на сервер, затем — обратно в таблицу.
  // Ошибку, которую вернёт функция, форма покажет у себя
  private async save() {
    try {
      await firstValueFrom(
        this.http.put<Game>(
          `/api/games/${this.id()}`,
          this.draft(),
        ),
      );
      this.router.navigate(['..'], { relativeTo: this.route });
      return undefined;
    } catch (error) {
      return {
        kind: 'server',
        // 400 — сервер не принял данные и пишет почему
        message:
          error instanceof HttpErrorResponse &&
          error.status === 400
            ? error.error.message
            : 'Не удалось сохранить. Попробуйте ещё раз',
      };
    }
  }
}
"""

EDIT_TS_4 = EDIT_TS_HEAD + EDIT_TS_MODEL + EDIT_SAVE_4

EDIT_HTML_START = """<a class="back-link" routerLink="..">← Игры</a>
@if (game.hasValue()) {
  <h2>{{ game.value().title }}</h2>
  <!-- TODO: форма [formRoot]: поля игры (app-game-fields), ошибки всей формы и кнопка «Сохранить» -->
} @else if (game.isLoading()) {
  <p class="muted">Загружаем игру…</p>
} @else if (game.error()) {
  <p class="error-message">
    Не удалось загрузить игру.
    <button class="link-button" (click)="game.reload()">
      Повторить
    </button>
  </p>
}
"""

EDIT_HTML = """<a class="back-link" routerLink="..">← Игры</a>
@if (game.hasValue()) {
  <h2>{{ game.value().title }}</h2>
  <form [formRoot]="gameForm">
    <app-game-fields [fields]="gameForm" />
    <!-- Ошибки всей формы: их вернуло сохранение -->
    @for (error of gameForm().errors(); track error.kind) {
      <p class="error-message">{{ error.message }}</p>
    }
    <button class="button" [disabled]="gameForm().submitting()">
      {{ gameForm().submitting() ? 'Сохраняем…' : 'Сохранить' }}
    </button>
  </form>
} @else if (game.isLoading()) {
  <p class="muted">Загружаем игру…</p>
} @else if (game.error()) {
  <p class="error-message">
    Не удалось загрузить игру.
    <button class="link-button" (click)="game.reload()">
      Повторить
    </button>
  </p>
}
"""

EDIT_CSS = """h2 {
  margin: 0 0 12px;
  font-size: 18px;
}
"""

ROUTES_4_IMPORTS = """import { Routes } from '@angular/router';
import { gameTitleResolver } from '../game/game-title';
import { AdminHome } from './admin-home/admin-home';
import { AdminLayout } from './admin-layout/admin-layout';
import { GameEdit } from './game-edit/game-edit';
import { GamesTable } from './games-table/games-table';
"""

ROUTES_4_GAMES = """      {
        // Крошка «Игры» — у родителя: она будет и у таблицы, и у страницы игры
        path: 'games',
        data: { breadcrumb: 'Игры' },
        children: [
          { path: '', component: GamesTable, title: 'Игры' },
          {
            path: ':id',
            component: GameEdit,
            // Крошка и заголовок вкладки — название игры, как у страницы игры в магазине
            resolve: { breadcrumb: gameTitleResolver },
          },
        ],
      },
"""

ROUTES_1_GAMES = """      {
        path: 'games',
        component: GamesTable,
        title: 'Игры',
        data: { breadcrumb: 'Игры' },
      },
"""

S4_START = put(S3, **{
    'admin/game-schema.ts': SCHEMA_TS_START,
    'admin/game-schema.spec.ts': SCHEMA_SPEC_START,
    'admin/game-fields/game-fields.ts': FIELDS_TS,
    'admin/game-fields/game-fields.html': FIELDS_HTML,
    'admin/game-fields/game-fields.css': FIELDS_CSS,
    'admin/game-edit/game-edit.ts': EDIT_TS_START,
    'admin/game-edit/game-edit.html': EDIT_HTML_START,
    'admin/game-edit/game-edit.css': EDIT_CSS,
})
# Название игры в таблице — ссылка на её страницу редактирования
TITLE_CELL_3 = """          <td>{{ game.title }}</td>
"""
TITLE_CELL_4 = """          <td>
            <!-- Ссылка относительная: /admin/games + /4 -->
            <a [routerLink]="[game.id]">{{ game.title }}</a>
          </td>
"""
S4_START = edit(S4_START, 'admin/games-table/games-table.html', (TITLE_CELL_3, TITLE_CELL_4))
S4_START = edit(S4_START, 'admin/games-table/games-table.ts',
    ("""import {
  ActivatedRoute,
  Params,
  Router,
} from '@angular/router';""", """import {
  ActivatedRoute,
  Params,
  Router,
  RouterLink,
} from '@angular/router';"""),
    ('  imports: [PricePipe],', '  imports: [PricePipe, RouterLink],'),
)
S4 = put(S4_START, **{
    'admin/game-schema.ts': SCHEMA_TS_FULL,
    'admin/game-schema.spec.ts': SCHEMA_SPEC,
    'admin/game-edit/game-edit.ts': EDIT_TS_4,
    'admin/game-edit/game-edit.html': EDIT_HTML,
})
S4 = edit(S4, 'admin/admin.routes.ts',
    ("""import { Routes } from '@angular/router';
import { AdminHome } from './admin-home/admin-home';
import { AdminLayout } from './admin-layout/admin-layout';
import { GamesTable } from './games-table/games-table';
""", ROUTES_4_IMPORTS),
    (ROUTES_1_GAMES, ROUTES_4_GAMES),
)

# ---------- 17.5 Сервис раздела ----------

ADMIN_GAMES_HEAD = """import { Service, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Game } from '../core/models';
import { GameDraft } from './game-schema';

// Запись журнала: что сделано и когда
export interface Change {
  text: string;
  time: Date;
}

// Изменения каталога из админки: запросы к серверу и журнал того, что сделано за сеанс.
// autoProvided: false — сам в DI не попадает: его выдаёт провайдер маршрута админки
@Service({ autoProvided: false })
export class AdminGames {
  private readonly http = inject(HttpClient);

  private readonly changesState = signal<Change[]>([]);
  // Журнал: новые записи — сверху
  readonly changes = this.changesState.asReadonly();

  // Сохранить игру: PUT /api/games/:id. Ответ сервера — игра, какой она стала
  async save(id: number, draft: GameDraft) {
    const game = await firstValueFrom(
      this.http.put<Game>(`/api/games/${id}`, draft),
    );
    this.log(`Изменена игра «${game.title}»`);
    return game;
  }
"""

ADMIN_GAMES_TAIL = """
  private log(text: string) {
    this.changesState.update((changes) => [
      { text, time: new Date() },
      ...changes,
    ]);
  }
}
"""

ADMIN_GAMES_5 = ADMIN_GAMES_HEAD + ADMIN_GAMES_TAIL

ADMIN_GAMES_5_START = """import { Service, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Game } from '../core/models';
import { GameDraft } from './game-schema';

// Запись журнала: что сделано и когда
export interface Change {
  text: string;
  time: Date;
}

// Изменения каталога из админки: запросы к серверу и журнал того, что сделано за сеанс.
// TODO: декоратор сервиса, который сам в DI не попадает (его выдаст провайдер маршрута админки)
export class AdminGames {
  private readonly http = inject(HttpClient);

  private readonly changesState = signal<Change[]>([]);
  // Журнал: новые записи — сверху
  readonly changes = this.changesState.asReadonly();

  // Сохранить игру: PUT /api/games/:id. Ответ сервера — игра, какой она стала
  async save(id: number, draft: GameDraft) {
    const game = await firstValueFrom(
      this.http.put<Game>(`/api/games/${id}`, draft),
    );
    this.log(`Изменена игра «${game.title}»`);
    return game;
  }
""" + ADMIN_GAMES_TAIL

EDIT_SAVE_5 = """
  // Сохранение: черновик — на сервер через сервис раздела, затем — обратно в таблицу.
  // Ошибку, которую вернёт функция, форма покажет у себя
  private async save() {
    try {
      await this.admin.save(this.id(), this.draft());
      this.router.navigate(['..'], { relativeTo: this.route });
      return undefined;
    } catch (error) {
      return {
        kind: 'server',
        // 400 — сервер не принял данные и пишет почему
        message:
          error instanceof HttpErrorResponse &&
          error.status === 400
            ? error.error.message
            : 'Не удалось сохранить. Попробуйте ещё раз',
      };
    }
  }
}
"""

S5_START = put(S4, **{'admin/admin-games.ts': ADMIN_GAMES_5_START})
S5 = put(S5_START, **{'admin/admin-games.ts': ADMIN_GAMES_5})
S5 = edit(S5, 'admin/game-edit/game-edit.ts',
    ("""import {
  HttpClient,
  HttpContext,""", """import {
  HttpContext,"""),
    ("""import { firstValueFrom } from 'rxjs';
""", ''),
    ("""import { Game } from '../../core/models';
""", """import { Game } from '../../core/models';
import { AdminGames } from '../admin-games';
"""),
    ("""  private readonly http = inject(HttpClient);
""", """  private readonly admin = inject(AdminGames);
"""),
    (EDIT_SAVE_4, EDIT_SAVE_5),
)
S5 = edit(S5, 'admin/admin.routes.ts',
    ("""import { gameTitleResolver } from '../game/game-title';
""", """import { gameTitleResolver } from '../game/game-title';
import { AdminGames } from './admin-games';
"""),
    ("""    path: '',
    component: AdminLayout,
""", """    path: '',
    component: AdminLayout,
    // Провайдеры раздела: роутер создаст для них свой инжектор — его видят только маршруты админки
    providers: [AdminGames],
"""),
)
S5 = edit(S5, 'admin/admin-home/admin-home.ts',
    ("import { Component } from '@angular/core';", "import { Component, inject } from '@angular/core';\nimport { DatePipe } from '@angular/common';"),
    ("""} from '@angular/common/http';
""", """} from '@angular/common/http';
import { AdminGames } from '../admin-games';
"""),
    ("""  templateUrl: './admin-home.html',
})""", """  imports: [DatePipe],
  templateUrl: './admin-home.html',
})"""),
    ("""export class AdminHome {
""", """export class AdminHome {
  // Журнал изменений — тот же экземпляр сервиса, что у страницы редактирования
  protected readonly admin = inject(AdminGames);

"""),
)
S5['admin/admin-home/admin-home.html'] += """<h2>Изменения за сеанс</h2>
<ul class="changes">
  @for (change of admin.changes(); track change) {
    <li>
      <span class="muted">{{ change.time | date: 'HH:mm:ss' }}</span>
      {{ change.text }}
    </li>
  } @empty {
    <li class="muted">Пока ничего не меняли.</li>
  }
</ul>
"""
S5 = put(S5, **{'admin/admin-home/admin-home.css': """h2 {
  margin: 16px 0 8px;
  font-size: 18px;
}

/* Журнал изменений: без маркеров списка */
.changes {
  margin: 0;
  padding: 0;
  list-style: none;
}
"""})
S5 = edit(S5, 'admin/admin-home/admin-home.ts', ("""  templateUrl: './admin-home.html',
})""", """  templateUrl: './admin-home.html',
  styleUrl: './admin-home.css',
})"""))

# ---------- 17.6 Изменения и кэш ----------

CACHE_CLASS_SET = """  set(url: string, response: HttpResponse<unknown>) {
    this.entries.set(url, { response, time: Date.now() });
  }
}
"""
CACHE_CLASS_CLEAR = """  set(url: string, response: HttpResponse<unknown>) {
    this.entries.set(url, { response, time: Date.now() });
  }

  // Забыть все ответы: данные на сервере изменились
  clear() {
    this.entries.clear();
  }
}
"""

CACHE_FN_5 = """// Кэш GET-запросов с меткой CACHE: свежий ответ из кэша — без запроса к серверу
export const cacheInterceptor: HttpInterceptorFn = (
  req,
  next,
) => {
  if (req.method !== 'GET' || !req.context.get(CACHE)) {
    return next(req);
  }
  // Интерцептор выполняется в контексте внедрения: inject работает
  const cache = inject(ResponseCache);
"""

CACHE_FN_6_START = """// Кэш GET-запросов с меткой CACHE: свежий ответ из кэша — без запроса к серверу
export const cacheInterceptor: HttpInterceptorFn = (
  req,
  next,
) => {
  // Интерцептор выполняется в контексте внедрения: inject работает
  const cache = inject(ResponseCache);
  // TODO: запрос, который меняет данные (не GET), — после успешного ответа забыть все сохранённые ответы
  if (req.method !== 'GET' || !req.context.get(CACHE)) {
    return next(req);
  }
"""

CACHE_FN_6 = """// Кэш GET-запросов с меткой CACHE: свежий ответ из кэша — без запроса к серверу
export const cacheInterceptor: HttpInterceptorFn = (
  req,
  next,
) => {
  // Интерцептор выполняется в контексте внедрения: inject работает
  const cache = inject(ResponseCache);
  // Запрос меняет данные (POST, PUT, DELETE): сохранённые ответы могли устареть.
  // Сервер ответил успехом — забываем все: какие из них устарели, интерцептор не знает
  if (req.method !== 'GET') {
    return next(req).pipe(
      tap((event) => {
        if (event instanceof HttpResponse) {
          cache.clear();
        }
      }),
    );
  }
  if (!req.context.get(CACHE)) {
    return next(req);
  }
"""

S6_START = edit(S5, 'core/cache-interceptor.ts', (CACHE_CLASS_SET, CACHE_CLASS_CLEAR), (CACHE_FN_5, CACHE_FN_6_START))
S6 = edit(S5, 'core/cache-interceptor.ts', (CACHE_CLASS_SET, CACHE_CLASS_CLEAR), (CACHE_FN_5, CACHE_FN_6))

# ---------- 17.7 Подтверждение удаления: окно из кода ----------

DIALOG_TS = """import {
  Component,
  ElementRef,
  afterNextRender,
  input,
  output,
  viewChild,
} from '@angular/core';

// Окно «Вы уверены?»: вопрос и две кнопки. Ответ — в выход answer: true — «да», false — отмена или Esc
@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.css',
})
export class ConfirmDialog {
  readonly question = input.required<string>();
  // Подпись кнопки «да»: «Удалить», «Уйти»
  readonly action = input('Да');
  readonly answer = output<boolean>();

  private readonly dialog =
    viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    // Модальным <dialog> делает только showModal(), а вызвать его можно, когда элемент уже в документе
    afterNextRender(() => this.dialog().nativeElement.showModal());
  }
}
"""

DIALOG_HTML = """<!-- Окно закрывается само: кнопкой формы method="dialog" (returnValue — value кнопки) или по Esc ('') -->
<dialog
  #dialog
  class="confirm"
  (close)="answer.emit(dialog.returnValue === 'yes')"
>
  <p>{{ question() }}</p>
  <form method="dialog" class="actions">
    <button class="link-button" value="no">Отмена</button>
    <button class="button" value="yes">{{ action() }}</button>
  </form>
</dialog>
"""

DIALOG_CSS = """.confirm {
  max-width: 320px;
  border: 0;
  border-radius: var(--radius);
  box-shadow: 0 8px 32px rgb(0 0 0 / 0.25);
}

.confirm::backdrop {
  background: rgb(0 0 0 / 0.4);
}

.confirm p {
  margin: 0 0 16px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 16px;
}
"""

CONFIRMATION_HEAD = """import {
  ApplicationRef,
  EnvironmentInjector,
  Service,
  createComponent,
  inject,
  inputBinding,
  outputBinding,
} from '@angular/core';
import { ConfirmDialog } from '../shared/confirm-dialog/confirm-dialog';

// Вопрос «Вы уверены?» в модальном окне. Окно создаётся из кода, когда нужно, и исчезает после ответа
@Service()
export class Confirmation {
  private readonly appRef = inject(ApplicationRef);
  private readonly injector = inject(EnvironmentInjector);

  // Задать вопрос. Промис ответа: true — «да», false — отмена
  ask(question: string, action = 'Да'): Promise<boolean> {
    return new Promise((resolve) => {
"""

CONFIRMATION_BODY = """      // Компонент без шаблона-родителя: входы и выход привязываем здесь же, при создании
      const dialog = createComponent(ConfirmDialog, {
        environmentInjector: this.injector,
        bindings: [
          inputBinding('question', () => question),
          inputBinding('action', () => action),
          outputBinding<boolean>('answer', (yes) => {
            resolve(yes);
            // Ответ получен — окно больше не нужно: убрать из DOM и из обнаружения изменений
            dialog.destroy();
          }),
        ],
      });
      // Хост-элемент <app-confirm-dialog> создан, но его нет на странице — добавляем сами
      document.body.append(dialog.location.nativeElement);
      // Представление окна — в обнаружение изменений приложения: иначе его никто не проверит
      this.appRef.attachView(dialog.hostView);
"""

CONFIRMATION_START = CONFIRMATION_HEAD + """      // TODO: создать ConfirmDialog (createComponent) с вопросом, подписью кнопки и ответом;
      // добавить его на страницу и в обнаружение изменений, после ответа — уничтожить
    });
  }
}
"""

CONFIRMATION = CONFIRMATION_HEAD + CONFIRMATION_BODY + """    });
  }
}
"""

ADMIN_GAMES_REMOVE = """
  // Удалить игру: DELETE /api/games/:id
  async remove(game: Game) {
    await firstValueFrom(
      this.http.delete(`/api/games/${game.id}`),
    );
    this.log(`Удалена игра «${game.title}»`);
  }
"""

ADMIN_GAMES_7 = ADMIN_GAMES_HEAD + ADMIN_GAMES_REMOVE + ADMIN_GAMES_TAIL

TABLE_TS_7 = rep(TABLE_TS_3, """import { GamesPage } from '../../core/models';
import { PricePipe } from '../../shared/price-pipe';
""", """import { Confirmation } from '../../core/confirmation';
import { Game, GamesPage } from '../../core/models';
import { PricePipe } from '../../shared/price-pipe';
import { AdminGames } from '../admin-games';
""")
TABLE_TS_7 = rep(TABLE_TS_7, "  imports: [PricePipe],", "  imports: [PricePipe, RouterLink],")
TABLE_TS_7 = rep(TABLE_TS_7, """  Router,
} from '@angular/router';""", """  Router,
  RouterLink,
} from '@angular/router';""")
TABLE_TS_7 = rep(TABLE_TS_7, """  private readonly route = inject(ActivatedRoute);
""", """  private readonly route = inject(ActivatedRoute);
  private readonly admin = inject(AdminGames);
  private readonly confirmation = inject(Confirmation);
""")
TABLE_TS_7 = rep(TABLE_TS_7, """  // Новые параметры — новый адрес.""", """  // Удалить — только после «да». Затем — перезагрузить страницу таблицы
  protected async remove(game: Game) {
    const yes = await this.confirmation.ask(
      `Удалить «${game.title}» из каталога?`,
      'Удалить',
    );
    if (yes) {
      await this.admin.remove(game);
      this.games.reload();
    }
  }

  // Новые параметры — новый адрес.""")

STOCK_CELL = """          <td class="num" [class.out]="game.inStock === 0">
            {{ game.inStock }}
          </td>
        </tr>
      } @empty {"""
STOCK_CELL_7 = """          <td class="num" [class.out]="game.inStock === 0">
            {{ game.inStock }}
          </td>
          <td class="num">
            <button
              class="link-button"
              [attr.aria-label]="'Удалить ' + game.title"
              (click)="remove(game)"
            >
              Удалить
            </button>
          </td>
        </tr>
      } @empty {"""

HEAD_LAST = """            Склад
          </button>
        </th>
"""
HEAD_LAST_7 = """            Склад
          </button>
        </th>
        <th scope="col"><span class="visually-hidden">Действия</span></th>
"""

GUARD_TS = """import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { Confirmation } from '../core/confirmation';

// Страница с формой, которую можно не дописать
export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

// Уходят со страницы с несохранённой формой — спросить в окне. Гард ждёт промис ответа: false отменяет переход
export const unsavedChangesGuard: CanDeactivateFn<
  HasUnsavedChanges
> = (page) =>
  !page.hasUnsavedChanges() ||
  inject(Confirmation).ask(
    'Изменения не сохранятся. Уйти со страницы?',
    'Уйти',
  );
"""

EDIT_SAVE_7 = """
  // Есть ли что потерять: админ менял форму и не сохранил
  hasUnsavedChanges() {
    return this.gameForm().dirty();
  }

  // Сохранение: черновик — на сервер через сервис раздела, затем — обратно в таблицу.
  // Ошибку, которую вернёт функция, форма покажет у себя
  private async save() {
    try {
      await this.admin.save(this.id(), this.draft());
      // Сохранено — терять больше нечего: форма снова «нетронутая», гард не спросит
      this.gameForm().reset();
      this.router.navigate(['..'], { relativeTo: this.route });
      return undefined;
    } catch (error) {
      return {
        kind: 'server',
        // 400 — сервер не принял данные и пишет почему
        message:
          error instanceof HttpErrorResponse &&
          error.status === 400
            ? error.error.message
            : 'Не удалось сохранить. Попробуйте ещё раз',
      };
    }
  }
}
"""

VISUALLY_HIDDEN = """
/* Текст только для экранного диктора: на экране его нет, а в дереве доступности есть */
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
"""

S7_START = put(S6, **{
    'shared/confirm-dialog/confirm-dialog.ts': DIALOG_TS,
    'shared/confirm-dialog/confirm-dialog.html': DIALOG_HTML,
    'shared/confirm-dialog/confirm-dialog.css': DIALOG_CSS,
    'core/confirmation.ts': CONFIRMATION_START,
})
S7_START = edit(S7_START, 'styles.css', ('  font-size: 13px;\n}\n', '  font-size: 13px;\n}\n' + VISUALLY_HIDDEN))
S7 = put(S7_START, **{
    'core/confirmation.ts': CONFIRMATION,
    'admin/admin-games.ts': ADMIN_GAMES_7,
    'admin/games-table/games-table.ts': TABLE_TS_7,
    'admin/admin-guards.ts': GUARD_TS,
})
S7 = edit(S7, 'admin/games-table/games-table.html', (STOCK_CELL, STOCK_CELL_7), (HEAD_LAST, HEAD_LAST_7), ('<td colspan="3"', '<td colspan="4"'))
S7 = edit(S7, 'admin/game-edit/game-edit.ts', (EDIT_SAVE_5, EDIT_SAVE_7))
S7 = edit(S7, 'admin/admin.routes.ts',
    ("""import { AdminGames } from './admin-games';
""", """import { AdminGames } from './admin-games';
import { unsavedChangesGuard } from './admin-guards';
"""),
    ("""            resolve: { breadcrumb: gameTitleResolver },
""", """            resolve: { breadcrumb: gameTitleResolver },
            canDeactivate: [unsavedChangesGuard],
"""),
)
# В шаге 7.5 ссылку на игру в таблице добавили в старте шага 4; RouterLink в таблице уже есть
assert 'RouterLink' in S7['admin/games-table/games-table.ts']

# ---------- 17.8 Практикум: новая игра ----------

ADMIN_GAMES_CREATE = """
  // Добавить игру: POST /api/games. Ответ — игра с id, который выдал сервер
  async create(draft: GameDraft) {
    const game = await firstValueFrom(
      this.http.post<Game>('/api/games', draft),
    );
    this.log(`Добавлена игра «${game.title}»`);
    return game;
  }

  // Загрузить обложку: файл — в теле FormData (multipart/form-data). Ответ — адрес картинки
  async uploadCover(file: File) {
    const body = new FormData();
    body.append('file', file);
    const { url } = await firstValueFrom(
      this.http.post<{ url: string }>('/api/covers', body),
    );
    return url;
  }
"""

ADMIN_GAMES_CREATE_START = """
  // Добавить игру: POST /api/games. Ответ — игра с id, который выдал сервер
  async create(draft: GameDraft): Promise<Game> {
    // TODO: POST /api/games с черновиком, запись в журнал «Добавлена игра «…»», вернуть игру из ответа
    throw new Error('Не написано');
  }

  // Загрузить обложку: файл — в теле FormData (multipart/form-data). Ответ — адрес картинки
  async uploadCover(file: File): Promise<string> {
    // TODO: FormData с файлом в поле file → POST /api/covers, вернуть url из ответа
    throw new Error('Не написано');
  }
"""

ADMIN_GAMES_8 = ADMIN_GAMES_HEAD + ADMIN_GAMES_REMOVE + ADMIN_GAMES_CREATE + ADMIN_GAMES_TAIL
ADMIN_GAMES_8_START = ADMIN_GAMES_HEAD + ADMIN_GAMES_REMOVE + ADMIN_GAMES_CREATE_START + ADMIN_GAMES_TAIL

UPLOAD_TS_HEAD = """import {
  Component,
  inject,
  model,
  output,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormValueControl } from '@angular/forms/signals';
import { AdminGames } from '../admin-games';

// Обложка игры — поле формы: значение — адрес картинки, а выбрать её можно файлом.
// Файл сразу уходит на сервер, в форму попадает адрес, который сервер вернул
@Component({
  selector: 'app-cover-upload',
  templateUrl: './cover-upload.html',
  styleUrl: './cover-upload.css',
})
export class CoverUpload implements FormValueControl<string> {
  // Адрес обложки: его читает и пишет форма через [formField]
  readonly value = model('');
  // Админ закончил с полем — форма отметит его тронутым
  readonly touch = output();

  private readonly admin = inject(AdminGames);
  protected readonly uploading = signal(false);
  protected readonly error = signal<string | null>(null);
"""

UPLOAD_TS_START = UPLOAD_TS_HEAD + """
  // Выбрали файл: загрузить его и положить адрес в value
  protected async upload(input: HTMLInputElement) {
    // TODO: файл из input.files → admin.uploadCover; пока грузится — uploading;
    // ошибка — в error (сообщение сервера); в конце — touch и очистить input.value
  }
}
"""

UPLOAD_TS = UPLOAD_TS_HEAD + """
  // Выбрали файл: загрузить его и положить адрес в value
  protected async upload(input: HTMLInputElement) {
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    this.uploading.set(true);
    this.error.set(null);
    try {
      this.value.set(await this.admin.uploadCover(file));
    } catch (error) {
      // 413 — файл больше 1 МБ, 415 — не картинка: сервер пишет, что не так
      this.error.set(
        error instanceof HttpErrorResponse && error.error?.message
          ? error.error.message
          : 'Не удалось загрузить обложку',
      );
    } finally {
      this.uploading.set(false);
      this.touch.emit();
      // Тот же файл можно будет выбрать ещё раз
      input.value = '';
    }
  }
}
"""

UPLOAD_HTML = """@if (value()) {
  <img
    class="preview"
    [src]="value()"
    alt="Обложка"
    width="75"
    height="100"
  />
}
<input
  #file
  type="file"
  accept="image/*"
  [disabled]="uploading()"
  (change)="upload(file)"
/>
@if (uploading()) {
  <span class="muted">Загружаем…</span>
}
@if (error(); as error) {
  <span class="error-message">{{ error }}</span>
}
"""

UPLOAD_CSS = """:host {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.preview {
  border-radius: 6px;
  object-fit: cover;
}
"""

NEW_TS_HEAD = """import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormRoot, form } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminGames } from '../admin-games';
import { GameFields } from '../game-fields/game-fields';
import { GameDraft, gameSchema } from '../game-schema';

// Новая игра: черновик с разумными значениями, которые админ поправит
const NEW_GAME: GameDraft = {
  title: '',
  category: 'family',
  cover: '',
  price: null,
  oldPrice: null,
  inStock: 0,
  players: { min: 2, max: 4 },
  playTime: 30,
  age: 8,
  description: '',
};

// Страница «Новая игра»: те же поля, что у редактирования, «Добавить» — POST /api/games
@Component({
  selector: 'app-game-new',
  imports: [FormRoot, GameFields, RouterLink],
  templateUrl: './game-new.html',
})
export class GameNew {
  private readonly admin = inject(AdminGames);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
"""

NEW_TS_START = NEW_TS_HEAD + """
  // TODO: черновик NEW_GAME — модель формы; форма со схемой gameSchema, отправка — create()

  // TODO: hasUnsavedChanges() — для гарда несохранённой формы

  // TODO: create(): admin.create(черновик), сбросить форму, перейти в таблицу с поиском по названию новой игры;
  // ошибка 400 — сообщение сервера у формы
}
"""

NEW_TS = NEW_TS_HEAD + """
  private readonly draft = signal<GameDraft>(NEW_GAME);
  protected readonly gameForm = form(this.draft, gameSchema, {
    submission: { action: () => this.create() },
  });

  // Есть ли что потерять: админ начал заполнять форму и не добавил игру
  hasUnsavedChanges() {
    return this.gameForm().dirty();
  }

  // Добавить игру и вернуться в таблицу — с поиском по её названию, чтобы её было видно сразу
  private async create() {
    try {
      const game = await this.admin.create(this.draft());
      this.gameForm().reset();
      this.router.navigate(['..'], {
        relativeTo: this.route,
        queryParams: { q: game.title },
      });
      return undefined;
    } catch (error) {
      return {
        kind: 'server',
        message:
          error instanceof HttpErrorResponse &&
          error.status === 400
            ? error.error.message
            : 'Не удалось добавить игру. Попробуйте ещё раз',
      };
    }
  }
}
"""

NEW_HTML_START = """<a class="back-link" routerLink="..">← Игры</a>
<h2>Новая игра</h2>
<!-- TODO: форма [formRoot]: поля игры, ошибки всей формы и кнопка «Добавить» («Добавляем…» во время отправки) -->
"""

NEW_HTML = """<a class="back-link" routerLink="..">← Игры</a>
<h2>Новая игра</h2>
<form [formRoot]="gameForm">
  <app-game-fields [fields]="gameForm" />
  @for (error of gameForm().errors(); track error.kind) {
    <p class="error-message">{{ error.message }}</p>
  }
  <button class="button" [disabled]="gameForm().submitting()">
    {{ gameForm().submitting() ? 'Добавляем…' : 'Добавить' }}
  </button>
</form>
"""

FIELDS_COVER = """<div class="field">
  Обложка
  <app-cover-upload [formField]="game.cover" />
  <app-field-errors [field]="game.cover" />
</div>
"""

S8_START = put(S7, **{
    'admin/admin-games.ts': ADMIN_GAMES_8_START,
    'admin/cover-upload/cover-upload.ts': UPLOAD_TS_START,
    'admin/cover-upload/cover-upload.html': UPLOAD_HTML,
    'admin/cover-upload/cover-upload.css': UPLOAD_CSS,
    'admin/game-new/game-new.ts': NEW_TS_START,
    'admin/game-new/game-new.html': NEW_HTML_START,
})
# Стили панели над таблицей — готовые, в старте (курс не про CSS)
S8_START = edit(S8_START, 'admin/games-table/games-table.css', ("""/* Поиск над таблицей */
.search {""", """/* Над таблицей: поиск и «Новая игра» */
.toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search {"""))
S8 = put(S8_START, **{
    'admin/admin-games.ts': ADMIN_GAMES_8,
    'admin/cover-upload/cover-upload.ts': UPLOAD_TS,
    'admin/game-new/game-new.ts': NEW_TS,
    'admin/game-new/game-new.html': NEW_HTML,
})
S8 = edit(S8, 'admin/game-fields/game-fields.ts',
    ("import { CATEGORIES, GameDraft } from '../game-schema';", "import { CoverUpload } from '../cover-upload/cover-upload';\nimport { CATEGORIES, GameDraft } from '../game-schema';"),
    ('  imports: [FieldAria, FieldErrors, FormField],', '  imports: [CoverUpload, FieldAria, FieldErrors, FormField],'),
)
S8 = edit(S8, 'admin/game-fields/game-fields.html', ("""<label class="field">
  Категория""", FIELDS_COVER + """<label class="field">
  Категория"""))
S8 = edit(S8, 'admin/game-schema.ts', ("""  required(game.title, { message: 'Нужно название' });
""", """  required(game.title, { message: 'Нужно название' });
  required(game.cover, { message: 'Загрузите обложку' });
"""))
S8 = edit(S8, 'admin/admin.routes.ts',
    ("""import { GameEdit } from './game-edit/game-edit';
""", """import { GameEdit } from './game-edit/game-edit';
import { GameNew } from './game-new/game-new';
"""),
    ("""          { path: '', component: GamesTable, title: 'Игры' },
""", """          { path: '', component: GamesTable, title: 'Игры' },
          // new — раньше :id: иначе :id совпал бы со словом «new»
          {
            path: 'new',
            component: GameNew,
            title: 'Новая игра',
            data: { breadcrumb: 'Новая игра' },
            canDeactivate: [unsavedChangesGuard],
          },
"""),
)
S8 = edit(S8, 'admin/games-table/games-table.html', ("""<input
  #searchBox""", """<div class="toolbar">
  <input
  #searchBox"""), ("""  (input)="search(searchBox.value)"
/>
""", """  (input)="search(searchBox.value)"
/>
  <a class="button" routerLink="new">+ Новая игра</a>
</div>
"""))


steps = {
    '01-admin-section': {'start': S1_START, 'solution': S1},
    '02-sorting': {'start': S2_START, 'solution': S2},
    '03-search-pages': {'start': S2, 'solution': S3},
    '04-edit-form': {'start': S4_START, 'solution': S4},
    '05-section-service': {'start': S5_START, 'solution': S5},
    '06-cache': {'start': S6_START, 'solution': S6},
    '07-confirm-dialog': {'start': S7_START, 'solution': S7},
    '08-practice': {'start': S8_START, 'solution': S8},
}


def dump(target):
    """Полные снимки шагов (отформатированные) — в target/<шаг>/<start|solution>/ для опытов."""
    kinds = [(step, kind, spec[kind]) for step, spec in steps.items() for kind in ('start', 'solution') if spec.get(kind) is not None]
    for (step, kind, _), files in zip(kinds, format_snapshots([files for _, _, files in kinds])):
        path = os.path.join(target, step, kind)
        shutil.rmtree(path, ignore_errors=True)
        for name, code in files.items():
            full = os.path.join(path, name)
            os.makedirs(os.path.dirname(full), exist_ok=True)
            with open(full, 'w') as f:
                f.write(code)


if __name__ == '__main__':
    if len(sys.argv) > 2 and sys.argv[1] == 'dump':
        dump(sys.argv[2])
    else:
        write_steps(ROOT, steps, base='16-testing/08-practice')
    print('ok')
