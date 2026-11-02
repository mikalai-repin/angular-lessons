# Генератор кода шагов главы 22 «Финальный проект».
# Запуск: python3 tools/authoring/ch22-gen.py — ПЕРЕЗАПИСЫВАЕТ start/ и solution/ всех шагов главы 22.
#         python3 tools/authoring/ch22-gen.py dump <папка> — полные снимки шагов в <папка>/<шаг>/<start|solution>
#         (для опытов: tools/e2e/run-dir.mjs и exp.mjs принимают такую папку).
# Глава — три самостоятельных проекта на выбор. Шаг 1 без кода, в превью — магазин главы 21 без изменений.
# Каждый вариант начинается с того же магазина (а не с решения предыдущего варианта): шаг custom,
# write_steps сам вычислит start/ и подскажет removedInStart. Решение варианта — образец, а не эталон.
# Код форматирует write_steps (как кнопка «Формат» в редакторе). После запуска: npm run validate.
# Тексты уроков (lesson.md) пишутся отдельно, руками; генератор их не трогает.
import os, shutil, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from steps import PROJECT, format_snapshots, read_dir, rep, step_dir, write_steps

ROOT = f'{PROJECT}/content/22-final-project'
BASE = read_dir(step_dir(f'{PROJECT}/content/21-reading-code/07-practice/solution'))


def edit(files, name, *pairs):
    """Копия снимка, в которой файл name изменён заменами (старое, новое)."""
    out = dict(files)
    text = out[name]
    for old, new in pairs:
        text = rep(text, old, new)
    out[name] = text
    return out


def put(files, **added):
    """Копия снимка с новыми или заменёнными файлами: put(снимок, **{'путь/файл.ts': код})."""
    return {**files, **added}


def drop(files, *names):
    """Копия снимка без файлов names."""
    return {name: code for name, code in files.items() if name not in names}


# ---------- 22.1 Выбор проекта: магазин главы 21 без изменений ----------

S1 = BASE

# ---------- 22.2 Вариант А: сравнение и список желаний ----------
# Старт — магазин главы 21 и заготовки новых файлов (в редакторе платформы файл не создать).
# Образец: CompareStore (сигнал в сервисе, граница в коде), кнопка «Сравнить» на карточке, ссылка в меню,
# страница /compare с таблицей и лучшими значениями (computed), ссылка «Поделиться списком» в избранном,
# страница /wishlist?ids=… (вход из адреса с transform, загрузка по списку id, как в FavoritesPage)

S2_START = put(
    S1,
    **{
        'core/compare-store.ts': """import { Service } from '@angular/core';

// Игры в сравнении: карточка добавляет и убирает, шапка показывает счётчик, страница /compare — таблицу
@Service()
export class CompareStore {
  // TODO: игры в сравнении — сигнал со списком; не больше трёх игр, граница — здесь, а не только в кнопке
}
""",
        'compare/compare-page.ts': """import { Component } from '@angular/core';

// Страница /compare: игры из сравнения рядом в таблице
@Component({
  selector: 'app-compare-page',
  templateUrl: './compare-page.html',
  styleUrl: './compare-page.css',
})
export class ComparePage {
  // TODO: игры из CompareStore; лучшие значения (самая низкая цена, самый высокий рейтинг)
}
""",
        'compare/compare-page.html': """<!-- TODO: таблица — по столбцу на игру; строки «Цена», «Игроки», «Время», «Возраст», «Рейтинг» -->
""",
        'compare/compare-page.css': """/* TODO: стили таблицы сравнения */
""",
        'wishlist/wishlist-page.ts': """import { Component } from '@angular/core';

// Страница /wishlist?ids=3,7,12: список желаний по ссылке. Открывается без входа
@Component({
  selector: 'app-wishlist-page',
  templateUrl: './wishlist-page.html',
})
export class WishlistPage {
  // TODO: id игр — из параметра адреса ?ids=; игры — загрузить по списку id
}
""",
        'wishlist/wishlist-page.html': """<!-- TODO: заголовок «Список желаний» и карточки игр из ссылки -->
""",
    },
)

S2 = put(
    S1,
    **{
        'core/compare-store.ts': """import { Service, computed, signal } from '@angular/core';
import { Game } from './models';

// Сколько игр можно сравнивать сразу: больше трёх столбцов не уместится на экране телефона
export const COMPARE_LIMIT = 3;

// Игры в сравнении: карточка добавляет и убирает, шапка показывает счётчик, страница /compare — таблицу.
// Живут до перезагрузки: сравнение — дело одного визита
@Service()
export class CompareStore {
  // Игры целиком, а не id: в таблице всё, что нужно, — без запросов к серверу
  private readonly list = signal<readonly Game[]>([]);

  readonly games = this.list.asReadonly();
  readonly count = computed(() => this.list().length);
  readonly isFull = computed(() => this.count() >= COMPARE_LIMIT);

  has(game: Game): boolean {
    return this.list().some((item) => item.id === game.id);
  }

  // Добавить или убрать. Граница — здесь: кнопку можно включить и в обход disabled
  toggle(game: Game) {
    if (this.has(game)) {
      this.remove(game);
    } else if (!this.isFull()) {
      this.list.update((games) => [...games, game]);
    }
  }

  remove(game: Game) {
    this.list.update((games) =>
      games.filter((item) => item.id !== game.id),
    );
  }
}
""",
        'compare/compare-page.ts': """import { Component, computed, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CompareStore } from '../core/compare-store';
import { DurationPipe } from '../shared/duration-pipe';
import { PlayersPipe } from '../shared/players-pipe';
import { PricePipe } from '../shared/price-pipe';

// Страница /compare: игры из сравнения рядом в таблице
@Component({
  selector: 'app-compare-page',
  imports: [
    DecimalPipe,
    DurationPipe,
    PlayersPipe,
    PricePipe,
    RouterLink,
  ],
  templateUrl: './compare-page.html',
  styleUrl: './compare-page.css',
})
export class ComparePage {
  protected readonly compare = inject(CompareStore);

  // Лучшие значения: самая низкая цена и самый высокий рейтинг.
  // Одну игру сравнивать не с чем — подсвечивать нечего
  protected readonly best = computed(() => {
    const games = this.compare.games();
    if (games.length < 2) {
      return null;
    }
    return {
      price: Math.min(...games.map((game) => game.price)),
      rating: Math.max(...games.map((game) => game.rating)),
    };
  });
}
""",
        'compare/compare-page.html': """<h1>Сравнение</h1>
@let games = compare.games();
@if (games.length === 0) {
  <p class="muted">
    Нечего сравнивать. Нажмите «Сравнить» на карточках игр в
    <a routerLink="/catalog">каталоге</a>.
  </p>
} @else {
  <!-- Таблица шире экрана — прокручивается сама, а не вся страница -->
  <div class="table-scroll">
    <table class="compare-table">
      <thead>
        <tr>
          <td></td>
          @for (game of games; track game.id) {
            <th scope="col">
              <a [routerLink]="['/games', game.id]">{{ game.title }}</a>
            </th>
          }
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row">Цена</th>
          @for (game of games; track game.id) {
            <td [class.best]="game.price === best()?.price">
              {{ game.price | price }}
            </td>
          }
        </tr>
        <tr>
          <th scope="row">Игроки</th>
          @for (game of games; track game.id) {
            <td>{{ game.players | players }}</td>
          }
        </tr>
        <tr>
          <th scope="row">Время</th>
          @for (game of games; track game.id) {
            <td>{{ game.playTime | duration }}</td>
          }
        </tr>
        <tr>
          <th scope="row">Возраст</th>
          @for (game of games; track game.id) {
            <td>{{ game.age }}+</td>
          }
        </tr>
        <tr>
          <th scope="row">Рейтинг</th>
          @for (game of games; track game.id) {
            <td [class.best]="game.rating === best()?.rating">
              {{ game.rating | number }}
            </td>
          }
        </tr>
        <tr>
          <td></td>
          @for (game of games; track game.id) {
            <td>
              <button class="link-button" (click)="compare.remove(game)">
                Убрать
              </button>
            </td>
          }
        </tr>
      </tbody>
    </table>
  </div>
}
""",
        'compare/compare-page.css': """.table-scroll {
  overflow-x: auto;
}

/* Столбцы игр одной ширины, подписи строк — слева */
.compare-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 14px;
}

.compare-table th,
.compare-table td {
  padding: 6px 4px;
  border-bottom: 1px solid #d2d2d7;
  text-align: left;
  vertical-align: top;
}

.compare-table th[scope='row'] {
  width: 72px;
  color: var(--muted);
  font-weight: 400;
}

/* Лучшее значение в строке */
.best {
  color: #1b7f3b;
  font-weight: 700;
}
""",
        'wishlist/wishlist-page.ts': """import { Component, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
  HttpClient,
  HttpErrorResponse,
} from '@angular/common/http';
import { RouterLink } from '@angular/router';
import {
  Observable,
  catchError,
  forkJoin,
  map,
  of,
  throwError,
} from 'rxjs';
import { Game } from '../core/models';
import { SHOP_CONFIG } from '../core/shop-config';
import { GameCard } from '../shared/game-card/game-card';

// Страница /wishlist?ids=3,7,12: список желаний по ссылке. Открывается без входа
// и не трогает избранное того, кто открыл: список — в адресе, а не в Store
@Component({
  selector: 'app-wishlist-page',
  imports: [GameCard, RouterLink],
  templateUrl: './wishlist-page.html',
})
export class WishlistPage {
  // Параметр ?ids= из адреса: withComponentInputBinding кладёт его во вход.
  // Ссылку может набрать кто угодно — оставляем только целые положительные id, без повторов
  readonly ids = input<number[], string | undefined>([], {
    transform: toIds,
  });
  private readonly http = inject(HttpClient);
  protected readonly priorityCovers =
    inject(SHOP_CONFIG).priorityCovers;

  // Игры по списку id — как в FavoritesPage: запрос на каждую, пропавшие из каталога (404) — пропускаем
  protected readonly games = rxResource({
    params: () => {
      const ids = this.ids();
      return ids.length > 0 ? ids : undefined;
    },
    stream: ({ params }) =>
      forkJoin(params.map((id) => this.loadGame(id))).pipe(
        map((games) => games.filter((game) => game !== null)),
      ),
  });

  private loadGame(id: number): Observable<Game | null> {
    return this.http
      .get<Game>(`/api/games/${id}`)
      .pipe(
        catchError((error: unknown) =>
          error instanceof HttpErrorResponse &&
          error.status === 404
            ? of(null)
            : throwError(() => error),
        ),
      );
  }
}

// '3,7,abc,3' → [3, 7]
function toIds(value: string | undefined): number[] {
  const ids = (value ?? '')
    .split(',')
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0);
  return [...new Set(ids)];
}
""",
        'wishlist/wishlist-page.html': """<h1>Список желаний</h1>
@if (ids().length === 0) {
  <p class="muted">
    Список пуст. Загляните в <a routerLink="/catalog">каталог</a>.
  </p>
} @else if (games.isLoading()) {
  <p class="muted">Загружаем…</p>
} @else if (games.error()) {
  <p class="error-message">
    Не удалось загрузить список.
    <button class="link-button" (click)="games.reload()">
      Повторить
    </button>
  </p>
} @else if (games.value(); as games) {
  <div class="grid">
    @for (game of games; track game.id) {
      <app-game-card
        [game]="game"
        [priority]="$index < priorityCovers"
      />
    } @empty {
      <p class="muted">
        Список пуст: этих игр больше нет в каталоге.
      </p>
    }
  </div>
}
""",
    },
)

S2 = edit(
    S2,
    'app.routes.ts',
    (
        """  {
    path: 'login',""",
        """  {
    path: 'compare',
    loadComponent: () =>
      import('./compare/compare-page').then((m) => m.ComparePage),
    title: 'Сравнение',
    data: { breadcrumb: 'Сравнение' },
  },
  {
    // Список желаний по ссылке: без гарда — его открывают друзья, у которых нет входа
    path: 'wishlist',
    loadComponent: () =>
      import('./wishlist/wishlist-page').then(
        (m) => m.WishlistPage,
      ),
    title: 'Список желаний',
    data: { breadcrumb: 'Список желаний' },
  },
  {
    path: 'login',""",
    ),
)

S2 = edit(
    S2,
    'shared/game-card/game-card.ts',
    (
        "import { CartStore } from '../../core/cart-store';\n",
        "import { CartStore } from '../../core/cart-store';\nimport { CompareStore } from '../../core/compare-store';\n",
    ),
    (
        """  // При каком остатке на складе писать""",
        """  // Сравнение: в нём ли эта игра и можно ли добавить ещё одну
  protected readonly compare = inject(CompareStore);
  protected readonly inCompare = computed(() =>
    this.compare.has(this.game()),
  );

  // При каком остатке на складе писать""",
    ),
)

S2 = edit(
    S2,
    'shared/game-card/game-card.html',
    (
        """@if (inCart() > 0) {""",
        """<button
  class="compare link-button"
  [attr.aria-pressed]="inCompare()"
  [disabled]="!inCompare() && compare.isFull()"
  (click)="compare.toggle(game())"
>
  {{ inCompare() ? '✓ В сравнении' : 'Сравнить' }}
</button>
@if (inCart() > 0) {""",
    ),
)

S2 = edit(
    S2,
    'shared/game-card/game-card.css',
    (
        """.favorite.active {""",
        """/* «Сравнить»: кнопка-ссылка под кнопками. Сравнение заполнено — серая */
.compare {
  align-self: flex-start;
  font-size: 13px;
}

.compare:disabled {
  color: var(--muted);
  text-decoration: none;
  cursor: default;
}

.favorite.active {""",
    ),
)

S2 = edit(
    S2,
    'layout/header/header.ts',
    (
        "import { CartStore } from '../../core/cart-store';\n",
        "import { CartStore } from '../../core/cart-store';\nimport { CompareStore } from '../../core/compare-store';\n",
    ),
    (
        """  protected readonly auth = inject(AuthStore);""",
        """  protected readonly compare = inject(CompareStore);
  protected readonly auth = inject(AuthStore);""",
    ),
)

S2 = edit(
    S2,
    'layout/header/header.html',
    (
        """      >Каталог</a
    >""",
        """      >Каталог</a
    >
    <a
      routerLink="/compare"
      routerLinkActive="active"
      ariaCurrentWhenActive="page"
      >Сравнение: {{ compare.count() }}</a
    >""",
    ),
)

S2 = edit(
    S2,
    'account/favorites-page/favorites-page.html',
    (
        """@if (ids().length === 0) {""",
        """<!-- Ссылка на этот же список для друзей: id — в адресе, вход не нужен -->
@if (ids().length > 0) {
  <p>
    <a
      class="share"
      routerLink="/wishlist"
      [queryParams]="{ ids: ids().join(',') }"
      >Поделиться списком</a
    >
  </p>
}
@if (ids().length === 0) {""",
    ),
)

steps = {
    '01-choose-project': {'start': S1},
    '02-compare-wishlist': {'start': S2_START, 'solution': S2},
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
        write_steps(ROOT, steps, base='21-reading-code/07-practice')
    print('ok')
