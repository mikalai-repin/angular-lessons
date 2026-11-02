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

# ---------- 22.3 Вариант Б: подарочный набор ----------
# Старт — снова магазин главы 21 (решение А сюда не попадает) и заготовки файлов мастера.
# Образец: модель и форма набора — в сервисе GiftStore (шаги — разные страницы, набор один),
# правила — схема giftSchema (minLength/maxLength у массива игр, contactsSchema из оформления),
# шаги — дочерние маршруты /gift/games, /gift/design, /gift/confirm с гардами по валидности частей формы,
# «Далее» — markAsTouched части и переход, если она валидна; оформление — submit() всей формы и POST /api/orders

S3_START = put(
    S1,
    **{
        'gift/gift-schema.ts': """// Подарочный набор: типы данных и правила формы мастера
// TODO: модель набора — игры (шаг 1), упаковка и открытка (шаг 2), контакты покупателя (шаг 3)
// TODO: схема правил: от 2 до 4 игр, «Кому» обязательно, открытка — не длиннее 200 символов
""",
        'gift/gift-store.ts': """import { Service } from '@angular/core';

// Набор, который собирают в мастере. Шаги мастера — разные страницы, а набор один
@Service()
export class GiftStore {
  // TODO: модель набора и форма; сумма набора; положить и убрать игру; оформить набор
}
""",
        'gift/gift-guards.ts': """// Гарды шагов мастера: на шаг дальше — только когда готовы предыдущие
// TODO: /gift/design — только с выбранными играми, /gift/confirm — ещё и с заполненной упаковкой и открыткой
""",
        'gift/gift.routes.ts': """import { Routes } from '@angular/router';

// Маршруты мастера: /gift/games, /gift/design, /gift/confirm. Путь '' — относительно /gift
export const giftRoutes: Routes = [
  // TODO: страница-рамка мастера и три шага — дочерние маршруты; /gift ведёт на первый шаг
];
""",
        'gift/gift-layout.ts': """import { Component } from '@angular/core';

// Рамка мастера: заголовок, список шагов и место для страницы шага
@Component({
  selector: 'app-gift-layout',
  templateUrl: './gift-layout.html',
  styleUrl: './gift-layout.css',
})
export class GiftLayout {}
""",
        'gift/gift-layout.html': """<!-- TODO: заголовок «Подарочный набор», шаги мастера и <router-outlet /> -->
""",
        'gift/gift-layout.css': """/* TODO: стили списка шагов */
""",
        'gift/gift-games.ts': """import { Component } from '@angular/core';

// Шаг 1, /gift/games: игры для набора
@Component({
  selector: 'app-gift-games',
  templateUrl: './gift-games.html',
  styleUrl: './gift-games.css',
})
export class GiftGames {
  // TODO: игры каталога; «Далее» — на шаг 2, если в наборе от 2 до 4 игр
}
""",
        'gift/gift-games.html': """<!-- TODO: список игр с кнопками pick, ошибка количества, «Далее» -->
""",
        'gift/gift-games.css': """/* TODO: стили списка игр */
""",
        'gift/gift-design.ts': """import { Component } from '@angular/core';

// Шаг 2, /gift/design: упаковка и открытка
@Component({
  selector: 'app-gift-design',
  templateUrl: './gift-design.html',
})
export class GiftDesign {
  // TODO: поля упаковки и открытки; «Далее» — на шаг 3, если они заполнены верно
}
""",
        'gift/gift-design.html': """<!-- TODO: упаковка (три варианта), «Кому», «Текст открытки», «Назад» и «Далее» -->
""",
        'gift/gift-confirm.ts': """import { Component } from '@angular/core';

// Шаг 3, /gift/confirm: что в наборе, контакты покупателя и оформление
@Component({
  selector: 'app-gift-confirm',
  templateUrl: './gift-confirm.html',
})
export class GiftConfirm {
  // TODO: контакты; «Оформить набор» — заказ на сервер; номер заказа или ошибка сервера
}
""",
        'gift/gift-confirm.html': """<!-- TODO: состав набора, «Итого», контакты, «Назад», «Оформить набор»; после заказа — «Набор №… оформлен» -->
""",
    },
)

S3 = put(
    S1,
    **{
        'gift/gift-schema.ts': """import {
  apply,
  maxLength,
  minLength,
  required,
  schema,
} from '@angular/forms/signals';
import {
  Contacts,
  contactsSchema,
} from '../checkout/checkout-schema';
import { Game } from '../core/models';

// Сколько игр в наборе и сколько букв в открытке
export const MIN_GAMES = 2;
export const MAX_GAMES = 4;
export const MESSAGE_MAX = 200;

// Упаковка набора: цена в рублях
export const WRAPPINGS = [
  { id: 'kraft', title: 'Крафт', price: 0 },
  { id: 'festive', title: 'Праздничная', price: 290 },
  { id: 'wooden', title: 'Деревянный ящик', price: 990 },
] as const;

export type Wrapping = (typeof WRAPPINGS)[number];

// Подарочный набор. Каждому шагу мастера — своя часть модели
export interface GiftBox {
  // Шаг 1: игры
  games: Game[];
  // Шаг 2: упаковка и открытка
  design: {
    wrapping: Wrapping['id'];
    recipient: string; // кому подарок
    message: string; // текст открытки
  };
  // Шаг 3: контакты покупателя
  contacts: Contacts;
}

// Правила всего набора. Шаг проверяет свою часть: form.games, form.design, form.contacts
export const giftSchema = schema<GiftBox>((box) => {
  // minLength и maxLength работают и с массивами: считают элементы
  const count = `Выберите от ${MIN_GAMES} до ${MAX_GAMES} игр`;
  minLength(box.games, MIN_GAMES, { message: count });
  maxLength(box.games, MAX_GAMES, { message: count });
  required(box.design.recipient, { message: 'Кому подарок?' });
  maxLength(box.design.message, MESSAGE_MAX, {
    message: `Не больше ${MESSAGE_MAX} символов`,
  });
  // Контакты — те же правила, что в оформлении заказа
  apply(box.contacts, contactsSchema);
});
""",
        'gift/gift-store.ts': """import {
  Service,
  computed,
  inject,
  signal,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { form } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { Game } from '../core/models';
import { GiftBox, WRAPPINGS, giftSchema } from './gift-schema';

// Пустой набор: с него начинается мастер и к нему возвращается после заказа
function emptyBox(): GiftBox {
  return {
    games: [],
    design: { wrapping: 'kraft', recipient: '', message: '' },
    contacts: { name: '', phone: '', email: '' },
  };
}

// Набор, который собирают в мастере. Шаги мастера — разные страницы, а набор один:
// он живёт в сервисе, пока покупатель ходит между шагами и по магазину (до перезагрузки)
@Service()
export class GiftStore {
  private readonly http = inject(HttpClient);
  private readonly model = signal<GiftBox>(emptyBox());
  // Форма в сервисе: поле сервиса создаётся в контексте внедрения, как и поле компонента
  readonly form = form(this.model, giftSchema);

  readonly games = computed(() => this.model().games);
  readonly wrapping = computed(
    () =>
      WRAPPINGS.find(
        (wrapping) =>
          wrapping.id === this.model().design.wrapping,
      ) ?? WRAPPINGS[0],
  );
  readonly gamesTotal = computed(() =>
    this.games().reduce((sum, game) => sum + game.price, 0),
  );
  readonly total = computed(
    () => this.gamesTotal() + this.wrapping().price,
  );

  has(game: Game): boolean {
    return this.games().some((item) => item.id === game.id);
  }

  // Положить или убрать. Игру, которой нет на складе, не кладём: кнопку можно включить в обход disabled
  toggle(game: Game) {
    this.form
      .games()
      .value.update((games) =>
        this.has(game)
          ? games.filter((item) => item.id !== game.id)
          : game.inStock > 0
            ? [...games, game]
            : games,
      );
  }

  // Набор — обычный заказ: каждая игра по одной штуке, упаковка и открытка — в поле gift.
  // Ошибку сервера получит тот, кто вызвал
  async placeOrder(): Promise<number> {
    const { games, design, contacts } = this.model();
    const order = await firstValueFrom(
      this.http.post<{ id: number }>('/api/orders', {
        items: games.map((game) => ({
          gameId: game.id,
          quantity: 1,
        })),
        contacts,
        gift: design,
        total: this.total(),
      }),
    );
    this.model.set(emptyBox());
    // Новый набор — с чистого листа: без «тронутых» полей и показанных ошибок
    this.form().reset();
    return order.id;
  }
}
""",
        'gift/gift-guards.ts': """import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { GiftStore } from './gift-store';

// Шаги мастера — по порядку: по ссылке или из истории дальше готового шага не попасть.
// Гард читает ту же форму, что и шаги: готов ли шаг, решают правила схемы
export const gamesChosenGuard: CanActivateFn = () =>
  inject(GiftStore).form.games().valid() ||
  inject(Router).createUrlTree(['/gift/games']);

export const designDoneGuard: CanActivateFn = () =>
  inject(GiftStore).form.design().valid() ||
  inject(Router).createUrlTree(['/gift/design']);
""",
        'gift/gift.routes.ts': """import { Routes } from '@angular/router';
import { GiftConfirm } from './gift-confirm';
import { GiftDesign } from './gift-design';
import { GiftGames } from './gift-games';
import {
  designDoneGuard,
  gamesChosenGuard,
} from './gift-guards';
import { GiftLayout } from './gift-layout';

// Маршруты мастера: /gift/games, /gift/design, /gift/confirm. Путь '' — относительно /gift
export const giftRoutes: Routes = [
  {
    path: '',
    component: GiftLayout,
    children: [
      { path: '', redirectTo: 'games', pathMatch: 'full' },
      {
        path: 'games',
        component: GiftGames,
        title: 'Подарок: игры',
        data: { breadcrumb: 'Игры' },
      },
      {
        path: 'design',
        component: GiftDesign,
        title: 'Подарок: упаковка',
        data: { breadcrumb: 'Упаковка' },
        canActivate: [gamesChosenGuard],
      },
      {
        path: 'confirm',
        component: GiftConfirm,
        title: 'Подарок: оформление',
        data: { breadcrumb: 'Оформление' },
        canActivate: [gamesChosenGuard, designDoneGuard],
      },
    ],
  },
];
""",
        'gift/gift-layout.ts': """import { Component } from '@angular/core';
import {
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';

// Рамка мастера: заголовок, список шагов и место для страницы шага
@Component({
  selector: 'app-gift-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './gift-layout.html',
  styleUrl: './gift-layout.css',
})
export class GiftLayout {}
""",
        'gift/gift-layout.html': """<h1>Подарочный набор</h1>
<!-- Шаги — ссылки: на шаг дальше готового не пустит гард -->
<ol class="steps">
  <li>
    <a
      routerLink="games"
      routerLinkActive="active"
      ariaCurrentWhenActive="step"
      >Игры</a
    >
  </li>
  <li>
    <a
      routerLink="design"
      routerLinkActive="active"
      ariaCurrentWhenActive="step"
      >Упаковка</a
    >
  </li>
  <li>
    <a
      routerLink="confirm"
      routerLinkActive="active"
      ariaCurrentWhenActive="step"
      >Оформление</a
    >
  </li>
</ol>
<router-outlet />
""",
        'gift/gift-layout.css': """/* Шаги мастера в строку: «1. Игры  2. Упаковка  3. Оформление» */
.steps {
  display: flex;
  gap: 24px;
  margin: 0 0 12px;
  padding: 0 0 0 18px;
  border-bottom: 1px solid #d2d2d7;
  font-size: 14px;
}

.steps a {
  display: inline-block;
  padding: 6px 0;
  color: var(--muted);
  text-decoration: none;
}

/* Текущий шаг: класс active ставит routerLinkActive */
.steps a.active {
  border-bottom: 2px solid var(--brand);
  color: var(--text);
}
""",
        'gift/gift-games.ts': """import { Component, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { Router } from '@angular/router';
import { GamesPage } from '../core/models';
import { FieldErrors } from '../shared/field-errors/field-errors';
import { PricePipe } from '../shared/price-pipe';
import { GiftStore } from './gift-store';

// Сколько игр загрузить для выбора: весь каталог одной страницей — игр в нём меньше
const CHOICE_SIZE = 100;

// Шаг 1, /gift/games: игры для набора
@Component({
  selector: 'app-gift-games',
  imports: [FieldErrors, PricePipe],
  templateUrl: './gift-games.html',
  styleUrl: './gift-games.css',
})
export class GiftGames {
  protected readonly gift = inject(GiftStore);
  private readonly router = inject(Router);

  protected readonly catalog = httpResource<GamesPage>(() => ({
    url: '/api/games',
    params: { size: CHOICE_SIZE },
  }));

  // Дальше — только с верным набором. Ошибки поля видны, когда оно «тронуто»: трогаем сами
  protected next() {
    const games = this.gift.form.games();
    games.markAsTouched();
    if (games.valid()) {
      this.router.navigate(['/gift/design']);
    }
  }
}
""",
        'gift/gift-games.html': """<!-- Сводка и «Далее» — над списком: игр много, до конца списка листать долго -->
<div class="summary">
  <span>
    В наборе: {{ gift.games().length }} на
    {{ gift.gamesTotal() | price }}
  </span>
  <button class="button" (click)="next()">Далее</button>
</div>
<app-field-errors [field]="gift.form.games" />
@if (catalog.isLoading()) {
  <p class="muted">Загружаем игры…</p>
} @else if (catalog.error()) {
  <p class="error-message">
    Не удалось загрузить игры.
    <button class="link-button" (click)="catalog.reload()">
      Повторить
    </button>
  </p>
} @else if (catalog.value(); as page) {
  <ul class="choice-list">
    @for (game of page.items; track game.id) {
      <li [class.chosen]="gift.has(game)">
        <span class="title">{{ game.title }}</span>
        <span class="price">{{ game.price | price }}</span>
        <!-- Раскупленную игру, которая уже в наборе, можно убрать: выключена — только чужая -->
        <button
          class="pick link-button"
          [attr.aria-pressed]="gift.has(game)"
          [disabled]="game.inStock === 0 && !gift.has(game)"
          (click)="gift.toggle(game)"
        >
          @if (gift.has(game)) {
            ✓ В наборе
          } @else if (game.inStock === 0) {
            Нет в наличии
          } @else {
            В набор
          }
        </button>
      </li>
    }
  </ul>
}
""",
        'gift/gift-games.css': """/* Сводка набора и «Далее» в одну строку */
.summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  max-width: 480px;
  margin-bottom: 8px;
  font-size: 14px;
}

/* Игры для набора: название, цена и кнопка в одну строку */
.choice-list {
  max-width: 480px;
  margin: 0 0 12px;
  padding: 0;
  list-style: none;
  font-size: 14px;
}

.choice-list li {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid var(--surface);
}

.choice-list .title {
  flex: 1;
}

/* Игра в наборе */
.choice-list li.chosen .title {
  font-weight: 600;
}

.pick {
  width: 7.5em;
  text-align: right;
}

.pick:disabled {
  color: var(--muted);
  text-decoration: none;
  cursor: default;
}
""",
        'gift/gift-design.ts': """import { Component, inject } from '@angular/core';
import { FormField } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { FieldAria } from '../shared/field-aria';
import { FieldErrors } from '../shared/field-errors/field-errors';
import { PricePipe } from '../shared/price-pipe';
import { MESSAGE_MAX, WRAPPINGS } from './gift-schema';
import { GiftStore } from './gift-store';

// Шаг 2, /gift/design: упаковка и открытка
@Component({
  selector: 'app-gift-design',
  imports: [
    FieldAria,
    FieldErrors,
    FormField,
    PricePipe,
    RouterLink,
  ],
  templateUrl: './gift-design.html',
})
export class GiftDesign {
  protected readonly gift = inject(GiftStore);
  private readonly router = inject(Router);

  protected readonly wrappings = WRAPPINGS;
  protected readonly messageMax = MESSAGE_MAX;

  protected next() {
    const design = this.gift.form.design();
    design.markAsTouched();
    if (design.valid()) {
      this.router.navigate(['/gift/confirm']);
    }
  }
}
""",
        'gift/gift-design.html': """@let design = gift.form.design;
<a class="back-link" routerLink="/gift/games">← Назад</a>
<fieldset class="field">
  <legend>Упаковка</legend>
  @for (wrapping of wrappings; track wrapping.id) {
    <label>
      <input
        type="radio"
        [value]="wrapping.id"
        [formField]="design.wrapping"
      />
      {{ wrapping.title }} —
      {{ wrapping.price ? (wrapping.price | price) : 'бесплатно' }}
    </label>
  }
</fieldset>
<label class="field">
  Кому
  <input [formField]="design.recipient" />
  <app-field-errors [field]="design.recipient" />
</label>
<label class="field">
  Текст открытки
  <textarea rows="3" [formField]="design.message"></textarea>
  <span class="muted">
    {{ design.message().value().length }} / {{ messageMax }}
  </span>
  <app-field-errors [field]="design.message" />
</label>
<p>
  <button class="button" (click)="next()">Далее</button>
</p>
""",
        'gift/gift-confirm.ts': """import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  FormField,
  FormRoot,
  submit,
} from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { FieldAria } from '../shared/field-aria';
import { FieldErrors } from '../shared/field-errors/field-errors';
import { PricePipe } from '../shared/price-pipe';
import { GiftStore } from './gift-store';

// Шаг 3, /gift/confirm: что в наборе, контакты покупателя и оформление
@Component({
  selector: 'app-gift-confirm',
  imports: [
    FieldAria,
    FieldErrors,
    FormField,
    FormRoot,
    PricePipe,
    RouterLink,
  ],
  templateUrl: './gift-confirm.html',
})
export class GiftConfirm {
  protected readonly gift = inject(GiftStore);
  // Номер оформленного заказа. Пока заказа нет — null
  protected readonly orderId = signal<number | null>(null);

  // Отправляем всю форму: submit ещё раз проверит все шаги, а не только контакты.
  // Ошибку, которую вернёт функция, форма покажет у себя
  protected send() {
    submit(this.gift.form, async () => {
      try {
        this.orderId.set(await this.gift.placeOrder());
        return undefined;
      } catch (error) {
        // 409 — какой-то игры не хватило на складе: сервер пишет какой
        return {
          kind: 'server',
          message:
            error instanceof HttpErrorResponse &&
            error.status === 409
              ? error.error.message
              : 'Не удалось оформить набор. Попробуйте ещё раз',
        };
      }
    });
  }
}
""",
        'gift/gift-confirm.html': """@if (orderId(); as id) {
  <h2>Набор №{{ id }} оформлен</h2>
  <p>Спасибо! Соберём набор и свяжемся с вами.</p>
  <a routerLink="/gift">Собрать ещё один</a>
} @else {
  @let box = gift.form;
  <a class="back-link" routerLink="/gift/design">← Назад</a>
  <ul>
    @for (game of gift.games(); track game.id) {
      <li>{{ game.title }} — {{ game.price | price }}</li>
    }
  </ul>
  <p>
    Упаковка: {{ gift.wrapping().title }}<br />
    Кому: {{ box.design.recipient().value() }}
  </p>
  @if (box.design.message().value(); as message) {
    <blockquote class="muted">{{ message }}</blockquote>
  }
  <p>
    Итого: <b>{{ gift.total() | price }}</b>
  </p>
  <!-- FormRoot отменяет отправку браузером; отправляет send() -->
  <form [formRoot]="box" (submit)="send()">
    <label class="field">
      Имя
      <input
        autocomplete="name"
        [formField]="box.contacts.name"
      />
      <app-field-errors [field]="box.contacts.name" />
    </label>
    <label class="field">
      Телефон
      <input
        type="tel"
        autocomplete="tel"
        placeholder="+7 900 123-45-67"
        [formField]="box.contacts.phone"
      />
      <app-field-errors [field]="box.contacts.phone" />
    </label>
    <label class="field">
      E-mail
      <input
        type="email"
        autocomplete="email"
        [formField]="box.contacts.email"
      />
      <app-field-errors [field]="box.contacts.email" />
    </label>
    @for (error of box().errors(); track error.kind) {
      <p class="error-message">{{ error.message }}</p>
    }
    <button class="button" [disabled]="box().submitting()">
      {{ box().submitting() ? 'Оформляем…' : 'Оформить набор' }}
    </button>
  </form>
}
""",
    },
)

S3 = edit(
    S3,
    'app.routes.ts',
    (
        """  {
    path: 'login',""",
        """  {
    path: 'gift',
    // Мастер подарочного набора: шаги — дочерние маршруты, код загрузится при первом переходе
    loadChildren: () =>
      import('./gift/gift.routes').then((m) => m.giftRoutes),
    data: { breadcrumb: 'Подарочный набор' },
  },
  {
    path: 'login',""",
    ),
)

S3 = edit(
    S3,
    'layout/header/header.html',
    (
        """      >Каталог</a
    >""",
        """      >Каталог</a
    >
    <a
      routerLink="/gift"
      routerLinkActive="active"
      ariaCurrentWhenActive="page"
      >Подарок</a
    >""",
    ),
)

steps = {
    '01-choose-project': {'start': S1},
    '02-compare-wishlist': {'start': S2_START, 'solution': S2},
    '03-gift-box': {'start': S3_START, 'solution': S3},
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
