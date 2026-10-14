# Генератор кода шагов главы 11 «HTTP и данные».
# Запуск: python3 tools/authoring/ch11-gen.py — ПЕРЕЗАПИСЫВАЕТ start/ и solution/ всех шагов главы 11.
# Старт главы — решение практикума главы 10 (10-practice) плюс глобальные стили для заглушек загрузки и ошибок.
# Шаги — полные снимки: каждый строится правками (rep) поверх результата предыдущего шага.
# Код форматирует write_steps (как кнопка «Формат» в редакторе). После запуска: npm run validate.
# Тексты уроков (lesson.md) пишутся отдельно, руками; генератор их не трогает.
import os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from steps import PROJECT, read_dir, rep, step_dir, write_steps

ROOT = f'{PROJECT}/content/11-http'
BASE = read_dir(step_dir(f'{PROJECT}/content/10-routing/10-practice/solution'))


def edit(files, name, *pairs):
    """Копия снимка, в которой файл name изменён заменами (старое, новое)."""
    out = dict(files)
    text = out[name]
    for old, new in pairs:
        text = rep(text, old, new)
    out[name] = text
    return out


# ---------- 11.1 старт: стили для загрузки и ошибок ----------

S1 = edit(BASE, 'styles.css', ("""/* Кнопка-ссылка: «Сбросить фильтры», «Очистить корзину» */""", """/* Заглушка на время загрузки: серый блок размером с карточку */
.skeleton {
  aspect-ratio: 3 / 5;
  border-radius: var(--radius);
  background: var(--surface);
  animation: pulse 1.2s ease-in-out infinite;
}

@keyframes pulse {
  50% {
    opacity: 0.5;
  }
}

/* Сообщение об ошибке загрузки */
.error-message {
  color: var(--brand);
}

/* Кнопка-ссылка: «Сбросить фильтры», «Очистить корзину» */"""))

# ---------- 11.1 решение: хиты на главной — fetch ----------

GAMES_PAGE = """
// Страница каталога, которую присылает сервер: GET /api/games
export interface GamesPage {
  items: Game[]; // игры этой страницы
  total: number; // сколько игр нашлось всего
  page: number; // номер страницы, с 1
  size: number; // сколько игр на странице
}
"""

R1 = edit(S1, 'core/models.ts', ("""// Позиция корзины""", GAMES_PAGE.lstrip() + """
// Позиция корзины"""))
R1 = edit(R1, 'home/home.ts',
    ("import { Component, inject } from '@angular/core';", "import { Component, inject, signal } from '@angular/core';"),
    ("import { GAMES } from '../core/games-data';", "import { GAMES } from '../core/games-data';\nimport { Game, GamesPage } from '../core/models';"),
    ("""  // Хиты — игры с самым высоким рейтингом
  protected readonly hits = GAMES.filter(
    (game) => game.rating >= this.config.hitRating,
  );""", """  // Хиты — четыре игры с самым высоким рейтингом. Их присылает сервер, а пока ответа нет, список пуст
  protected readonly hits = signal<Game[]>([]);"""),
    ("""    (game) => game.oldPrice !== undefined,
  );
}""", """    (game) => game.oldPrice !== undefined,
  );

  constructor() {
    // Запрос к API магазина: первые 4 игры каталога, отсортированные по рейтингу
    fetch('/api/games?sort=rating&size=4')
      .then((response) => response.json())
      .then((page: GamesPage) => this.hits.set(page.items));
  }
}"""))
R1 = edit(R1, 'home/home.html', ("@for (game of hits; track game.id)", "@for (game of hits(); track game.id)"))

# ---------- 11.2 HttpClient ----------

R2 = edit(R1, 'app.config.ts',
    ("import { registerLocaleData } from '@angular/common';", "import { registerLocaleData } from '@angular/common';\nimport { provideHttpClient } from '@angular/common/http';"),
    ("""    // Роутер: карта маршрутов и его возможности""", """    // HttpClient — клиент HTTP: запросы к серверу через inject(HttpClient)
    provideHttpClient(),
    // Роутер: карта маршрутов и его возможности"""))
R2 = edit(R2, 'home/home.ts',
    ("import { RouterLink } from '@angular/router';", "import { HttpClient } from '@angular/common/http';\nimport { RouterLink } from '@angular/router';"),
    ("""  private readonly config = inject(SHOP_CONFIG);
""", """  private readonly config = inject(SHOP_CONFIG);
  private readonly http = inject(HttpClient);
"""),
    ("""    // Запрос к API магазина: первые 4 игры каталога, отсортированные по рейтингу
    fetch('/api/games?sort=rating&size=4')
      .then((response) => response.json())
      .then((page: GamesPage) => this.hits.set(page.items));""", """    // get только описывает запрос: он уйдёт на сервер при подписке (subscribe)
    this.http
      .get<GamesPage>('/api/games', {
        params: { sort: 'rating', size: 4 },
      })
      .subscribe((page) => this.hits.set(page.items));"""))

# ---------- 11.3 httpResource ----------

HOME_TS_3 = """import { Component, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { GamesPage } from '../core/models';
import { SHOP_CONFIG } from '../core/shop-config';
import { GameCard } from '../shared/game-card/game-card';
import { PricePipe } from '../shared/price-pipe';

// Главная страница: приветствие и две подборки
@Component({
  selector: 'app-home',
  imports: [GameCard, PricePipe, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  private readonly config = inject(SHOP_CONFIG);

  protected readonly freeDeliveryFrom =
    this.config.freeDeliveryFrom;
  // Хиты — четыре игры с самым высоким рейтингом. Запрос отправит сам ресурс, он же расскажет, как идут дела
  protected readonly hits = httpResource<GamesPage>(() => ({
    url: '/api/games',
    params: { sort: 'rating', size: 4 },
  }));
  // Игры со скидкой
  protected readonly sale = httpResource<GamesPage>(() => ({
    url: '/api/games',
    params: { onSale: true },
  }));
  // Сколько заглушек показывать, пока подборка загружается
  protected readonly skeletons = [1, 2, 3, 4];
}
"""


def section(name, what):
    return f"""@if ({name}.hasValue()) {{
  <div class="grid">
    @for (game of {name}.value().items; track game.id) {{
      <app-game-card [game]="game" />
    }}
  </div>
}} @else if ({name}.isLoading()) {{
  <div class="grid">
    @for (n of skeletons; track n) {{
      <div class="skeleton"></div>
    }}
  </div>
}} @else {{
  <p class="error-message">
    Не удалось загрузить {what}.
    <button class="link-button" (click)="{name}.reload()">
      Повторить
    </button>
  </p>
}}"""


R3 = dict(R2)
R3['home/home.ts'] = HOME_TS_3
R3 = edit(R3, 'home/home.html',
    ("""<div class="grid">
  @for (game of hits(); track game.id) {
    <app-game-card [game]="game" />
  }
</div>""", section('hits', 'хиты')),
    ("""<div class="grid">
  @for (game of sale; track game.id) {
    <app-game-card [game]="game" />
  }
</div>""", section('sale', 'игры со скидкой')))

# ---------- 11.4 каталог с сервера: параметры от сигналов ----------

R4 = edit(R3, 'catalog/catalog.ts',
    ("import { DecimalPipe, PercentPipe } from '@angular/common';", "import { DecimalPipe, PercentPipe } from '@angular/common';\nimport { httpResource } from '@angular/common/http';"),
    ("import { Game } from '../core/models';", "import { Game, GamesPage } from '../core/models';"),
    ("import { GAMES } from '../core/games-data';\n", ""),
    ("""// Каталог: поиск, фильтры, сортировка и сетка карточек""", """// Сортировка каталога → параметр sort в API: price — по цене, -price — по убыванию цены
const SORT_PARAMS: Record<SortKey, string> = {
  default: '',
  cheap: 'price',
  expensive: '-price',
  rating: 'rating',
};

// Каталог: поиск, фильтры, сортировка и сетка карточек"""),
    ("""  // Игры, которые видит покупатель: найденные, отфильтрованные и отсортированные
  protected readonly visibleGames = computed(() => {
    const query = this.q().trim().toLowerCase();
    const games = GAMES.filter(
      (game) =>
        (game.title.toLowerCase().includes(query) ||
          game.tags.some((tag) => tag.includes(query))) &&
        (!this.inStock() || game.inStock > 0) &&
        game.rating >= this.rating(),
    );
    // filter вернул новый массив, поэтому сортировка не испортит GAMES
    switch (this.sort()) {
      case 'cheap':
        return games.sort((a, b) => a.price - b.price);
      case 'expensive':
        return games.sort((a, b) => b.price - a.price);
      case 'rating':
        return games.sort((a, b) => b.rating - a.rating);
      default:
        return games;
    }
  });""", """  // Каталог с сервера: поиск, фильтры и сортировка — параметры запроса.
  // Изменился любой сигнал, прочитанный внутри, — ресурс отправит новый запрос
  protected readonly games = httpResource<GamesPage>(() => ({
    url: '/api/games',
    params: {
      q: this.q(),
      inStock: this.inStock(),
      rating: this.rating(),
      sort: SORT_PARAMS[this.sort()],
      // Пока все найденные игры сразу; порции с сервера — в практикуме
      size: 100,
    },
  }));

  // Найденные игры. value() ресурса с ошибкой бросает исключение, поэтому сначала спрашиваем hasValue()
  protected readonly visibleGames = computed(() =>
    this.games.hasValue() ? this.games.value().items : [],
  );
  // Сколько заглушек показывать, пока каталог загружается
  protected readonly skeletons = [1, 2, 3, 4, 5, 6];"""))

CATALOG_GRID_4 = """@if (games.hasValue()) {
  <p class="found muted">Найдено игр: {{ games.value().total }}</p>
  <div class="grid">"""

R4 = edit(R4, 'catalog/catalog.html',
    ("""<div class="grid">
  @for (game of shownGames(); track game.id) {""", CATALOG_GRID_4 + """
  @for (game of shownGames(); track game.id) {"""),
    ("""@if (shownCount() < visibleGames().length) {
  <app-load-more (more)="showMore()" />
}""", """@if (shownCount() < visibleGames().length) {
  <app-load-more (more)="showMore()" />
}
} @else if (games.isLoading()) {
  <div class="grid">
    @for (n of skeletons; track n) {
      <div class="skeleton"></div>
    }
  </div>
} @else {
  <p class="error-message">
    Не удалось загрузить каталог.
    <button class="link-button" (click)="games.reload()">
      Повторить
    </button>
  </p>
}"""))
R4 = edit(R4, 'catalog/catalog.css', ("""/* Фильтры каталога */""", """/* «Найдено игр: N» над сеткой */
.found {
  margin: 0 0 8px;
  font-size: 14px;
}

/* Фильтры каталога */"""))

# ---------- 11.5 страница игры с сервера и ошибки ----------

R5 = edit(R4, 'game/game-page.ts',
    ("import { RouterLink } from '@angular/router';", "import {\n  HttpErrorResponse,\n  httpResource,\n} from '@angular/common/http';\nimport { RouterLink } from '@angular/router';"),
    ("import { GAMES } from '../core/games-data';", "import { Game } from '../core/models';"),
    ("""  // Игра с этим id; undefined — такой игры нет
  protected readonly game = computed(() =>
    GAMES.find((game) => game.id === this.id()),
  );""", """  // Игра с сервера. Сменился id в адресе — новый запрос
  protected readonly game = httpResource<Game>(
    () => `/api/games/${this.id()}`,
  );
  // Сервер ответил 404 — такой игры нет. Остальные ошибки — «не удалось загрузить»
  protected readonly notFound = computed(() => {
    const error = this.game.error();
    return (
      error instanceof HttpErrorResponse && error.status === 404
    );
  });"""),
    ("""  protected readonly inCart = computed(() => {
    const game = this.game();
    return game ? this.cart.quantityOf(game) : 0;
  });""", """  protected readonly inCart = computed(() =>
    this.game.hasValue()
      ? this.cart.quantityOf(this.game.value())
      : 0,
  );"""))

GAME_HTML_5_TAIL_OLD = """} @else {
  <h1>Игра не найдена</h1>
  <p class="muted">
    Такой игры в каталоге нет.
    <a routerLink="/catalog">Перейти в каталог</a>
  </p>
}"""

R5 = edit(R5, 'game/game-page.html',
    ("""@if (game(); as game) {""", """@if (game.isLoading()) {
  <p class="muted">Загружаем…</p>
} @else if (notFound()) {
  <h1>Игра не найдена</h1>
  <p class="muted">
    Такой игры в каталоге нет.
    <a routerLink="/catalog">Перейти в каталог</a>
  </p>
} @else if (game.error()) {
  <p class="error-message">
    Не удалось загрузить игру.
    <button class="link-button" (click)="game.reload()">
      Повторить
    </button>
  </p>
} @else if (game.value(); as game) {"""),
    (GAME_HTML_5_TAIL_OLD, "}"))

GAME_TITLE_5 = """import { inject } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
} from '@angular/common/http';
import { ResolveFn } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Game } from '../core/models';

// Заголовок страницы игры — её название с сервера. Резолвер возвращает промис: роутер дождётся ответа
export const gameTitleResolver: ResolveFn<string> = async (
  route,
) => {
  // inject — до первого await: после него контекст внедрения уже закончился
  const http = inject(HttpClient);
  try {
    // firstValueFrom подписывается на Observable и возвращает промис первого значения
    const game = await firstValueFrom(
      http.get<Game>(`/api/games/${route.paramMap.get('id')}`),
    );
    return game.title;
  } catch (error) {
    return error instanceof HttpErrorResponse &&
      error.status === 404
      ? 'Игра не найдена'
      : 'Игра';
  }
};
"""
R5['game/game-title.ts'] = GAME_TITLE_5
R5 = edit(R5, 'app.routes.ts', ("""    // Заголовок — название игры: его находит резолвер по :id
    title: gameTitleResolver,
    // Крошка — тоже название игры: резолвер кладёт его в data.breadcrumb
    resolve: { breadcrumb: gameTitleResolver },""", """    // Крошка — название игры: резолвер загрузит его с сервера и положит в data.breadcrumb.
    // Заголовок вкладки ShopTitleStrategy возьмёт из крошки
    resolve: { breadcrumb: gameTitleResolver },"""))
R5 = edit(R5, 'layout/shop-title-strategy.ts', ("""    // title самого глубокого маршрута: строка из карты маршрутов или ответ резолвера
    const title = this.buildTitle(snapshot);""", """    // title самого глубокого маршрута: строка из карты маршрутов или ответ резолвера.
    // Нет title — подпись хлебной крошки самой глубокой страницы (у страницы игры — название игры)
    let route = snapshot.root;
    while (route.firstChild) {
      route = route.firstChild;
    }
    const title =
      this.buildTitle(snapshot) ?? route.data['breadcrumb'];"""))

# ---------- 11.6 resource: избранное; старт — корзина хранит снимок игры ----------

S6 = edit(R5, 'core/cart-store.ts',
    ("import { GAMES } from './games-data';\n", ""),
    ("""// Ключ корзины в localStorage. Версия в имени: поменяется формат — поменяем ключ, и старые данные не помешают
const STORAGE_KEY = 'hod-konem:cart:v1';

// Что сохраняем о позиции: только id игры и количество. Название, цену и остаток берём из каталога
interface SavedItem {
  id: number;
  quantity: number;
}""", """// Ключ корзины в localStorage. Формат поменялся (снимок игры вместо id) — поменяли и версию в ключе
const STORAGE_KEY = 'hod-konem:cart:v2';

// Что сохраняем о позиции: снимок игры и количество. Каталога в коде больше нет — искать игру по id негде
interface SavedItem {
  game: Game;
  quantity: number;
}"""),
    ("""      const saved: SavedItem[] = this.items().map((item) => ({
        id: item.game.id,
        quantity: item.quantity,
      }));""", """      const saved: SavedItem[] = this.items().map((item) => ({
        game: item.game,
        quantity: item.quantity,
      }));"""),
    ("""    return saved.flatMap(({ id, quantity }) => {
      const game = GAMES.find((g) => g.id === id);
      // Остаток на складе мог уменьшиться с прошлого раза
      return game &&
        game.inStock > 0 &&""", """    // Снимок мог устареть: цену и остаток сверит сервер, когда покупатель оформит заказ
    return saved.flatMap(({ game, quantity }) => {
      return game &&
        game.inStock > 0 &&"""))

FAV_STORE_6 = """import {
  Service,
  computed,
  effect,
  signal,
} from '@angular/core';
import { Game } from './models';

// Ключ избранного в localStorage
const STORAGE_KEY = 'hod-konem:favorites:v1';

// Избранное: игры, которые покупатель отметил сердечком
@Service()
export class FavoritesStore {
  // id игр в избранном. Массив не меняем, а заменяем новым
  private readonly state = signal<number[]>(loadFavorites());
  // Снаружи — только чтение: страница «Избранное» загрузит игры по этим id
  readonly ids = this.state.asReadonly();

  readonly count = computed(() => this.ids().length);

  has(game: Game): boolean {
    return this.ids().includes(game.id);
  }

  toggle(game: Game) {
    this.state.update((ids) =>
      ids.includes(game.id)
        ? ids.filter((id) => id !== game.id)
        : [...ids, game.id],
    );
  }

  constructor() {
    // Побочный эффект: при каждом изменении избранного записываем его в localStorage
    effect(() =>
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(this.ids()),
      ),
    );
  }
}

// Избранное из localStorage: только целые положительные id. Есть ли такие игры, скажет сервер
function loadFavorites(): number[] {
  try {
    const ids: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? '[]',
    );
    return Array.isArray(ids)
      ? ids.filter((id) => Number.isInteger(id) && id > 0)
      : [];
  } catch {
    return [];
  }
}
"""

FAV_PAGE_TS_6 = """import { Component, inject, resource } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FavoritesStore } from '../../core/favorites-store';
import { Game } from '../../core/models';
import { GameCard } from '../../shared/game-card/game-card';

// Раздел кабинета «Избранное»: игры, отмеченные сердечком
@Component({
  selector: 'app-favorites-page',
  imports: [GameCard, RouterLink],
  templateUrl: './favorites-page.html',
})
export class FavoritesPage {
  protected readonly favorites = inject(FavoritesStore);

  // Игры из избранного. Запроса «игры по списку id» в API нет — загрузчик делает свой запрос на каждую игру
  protected readonly games = resource({
    // Параметры загрузки. undefined — загружать нечего: ресурс в статусе idle
    params: () => {
      const ids = this.favorites.ids();
      return ids.length > 0 ? ids : undefined;
    },
    loader: ({ params, abortSignal }) =>
      loadGames(params, abortSignal),
  });
}

// Игры по списку id: запросы идут параллельно. abortSignal отменит их все, если список изменился раньше ответа
async function loadGames(
  ids: readonly number[],
  abortSignal: AbortSignal,
): Promise<Game[]> {
  const games = await Promise.all(
    ids.map(async (id) => {
      const response = await fetch(`/api/games/${id}`, {
        signal: abortSignal,
      });
      // Игры больше нет в каталоге — пропускаем её
      if (response.status === 404) {
        return null;
      }
      if (!response.ok) {
        throw new Error(`Игра ${id}: ответ ${response.status}`);
      }
      return (await response.json()) as Game;
    }),
  );
  return games.filter((game) => game !== null);
}
"""

FAV_PAGE_HTML_6 = """@if (favorites.count() === 0) {
  <p class="muted">
    В избранном пока пусто. Отмечайте игры сердечком в
    <a routerLink="/catalog">каталоге</a>.
  </p>
} @else if (games.isLoading()) {
  <p class="muted">Загружаем…</p>
} @else if (games.error()) {
  <p class="error-message">
    Не удалось загрузить избранное.
    <button class="link-button" (click)="games.reload()">
      Повторить
    </button>
  </p>
} @else if (games.value(); as games) {
  <div class="grid">
    @for (game of games; track game.id) {
      <app-game-card [game]="game" />
    }
  </div>
}
"""

R6 = dict(S6)
R6['core/favorites-store.ts'] = FAV_STORE_6
R6['account/favorites-page/favorites-page.ts'] = FAV_PAGE_TS_6
R6['account/favorites-page/favorites-page.html'] = FAV_PAGE_HTML_6

# ---------- 11.7 поиск с задержкой; старт — без core/games-data.ts ----------

S7 = dict(R6)
del S7['core/games-data.ts']

R7 = edit(S7, 'catalog/catalog.ts',
    ("""  computed,
  inject,
  input,
  linkedSignal,""", """  computed,
  debounced,
  inject,
  input,
  linkedSignal,"""),
    ("""  // Каталог с сервера: поиск, фильтры и сортировка — параметры запроса.""", """  // Строка поиска с задержкой: ресурс, значение которого догоняет q, когда q не менялся 300 мс
  private readonly query = debounced(() => this.q(), 300);

  // Каталог с сервера: поиск, фильтры и сортировка — параметры запроса."""),
    ("""      q: this.q(),""", """      q: this.query.value(),"""),
    ("""  // Найденные игры. value() ресурса с ошибкой бросает исключение, поэтому сначала спрашиваем hasValue()
  protected readonly visibleGames = computed(() =>
    this.games.hasValue() ? this.games.value().items : [],
  );""", """  // Последний полученный ответ. Пока грузится новый, у ресурса нет значения, — а мы показываем прежний.
  // value() ресурса с ошибкой бросает исключение, поэтому сначала спрашиваем hasValue()
  protected readonly found = linkedSignal<
    GamesPage | undefined,
    GamesPage | undefined
  >({
    source: () =>
      this.games.hasValue() ? this.games.value() : undefined,
    computation: (page, previous) => page ?? previous?.value,
  });
  // Найденные игры
  protected readonly visibleGames = computed(
    () => this.found()?.items ?? [],
  );"""))
R7 = edit(R7, 'catalog/catalog.html',
    ("""@if (games.hasValue()) {
  <p class="found muted">Найдено игр: {{ games.value().total }}</p>
  <div class="grid">""", """@if (games.status() === 'error') {
  <p class="error-message">
    Не удалось загрузить каталог.
    <button class="link-button" (click)="games.reload()">
      Повторить
    </button>
  </p>
} @else if (found(); as found) {
  <p class="found muted">Найдено игр: {{ found.total }}</p>
  <div class="grid" [class.loading]="games.isLoading()">"""),
    ("""} @else if (games.isLoading()) {
  <div class="grid">
    @for (n of skeletons; track n) {
      <div class="skeleton"></div>
    }
  </div>
} @else {
  <p class="error-message">
    Не удалось загрузить каталог.
    <button class="link-button" (click)="games.reload()">
      Повторить
    </button>
  </p>
}""", """} @else {
  <div class="grid">
    @for (n of skeletons; track n) {
      <div class="skeleton"></div>
    }
  </div>
}"""))
R7 = edit(R7, 'catalog/catalog.css', ("""/* Фильтры каталога */""", """/* Пока грузятся новые результаты, прежние приглушены */
.grid.loading {
  opacity: 0.5;
  transition: opacity 0.2s;
}

/* Фильтры каталога */"""))

# ---------- 11.8 изменение данных: отзывы ----------

REVIEW = """
// Отзыв об игре: GET /api/games/:id/reviews
export interface Review {
  id: number;
  gameId: number;
  author: string;
  rating: number; // от 1 до 5
  text: string;
  date: string; // '2026-09-01'
}
"""

R8 = edit(R7, 'core/models.ts', ("""// Позиция корзины""", REVIEW.lstrip() + """
// Позиция корзины"""))
R8 = edit(R8, 'game/game-page.ts',
    ("""  computed,
  inject,
  input,
  numberAttribute,
} from '@angular/core';""", """  computed,
  inject,
  input,
  numberAttribute,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';"""),
    ("""import {
  HttpErrorResponse,
  httpResource,
} from '@angular/common/http';""", """import {
  HttpClient,
  HttpErrorResponse,
  httpResource,
} from '@angular/common/http';"""),
    ("import { Game } from '../core/models';", "import { Game, Review } from '../core/models';"),
    ("""  imports: [
    Countdown,""", """  imports: [
    Countdown,
    DatePipe,"""),
    ("""  protected readonly cart = inject(CartStore);""", """  // Отзывы об игре. defaultValue — значение, пока ответа нет: пустой список вместо undefined
  protected readonly reviews = httpResource<Review[]>(
    () => `/api/games/${this.id()}/reviews`,
    { defaultValue: [] },
  );
  // Оценка нового отзыва и сообщение, если отправить не удалось
  protected readonly newRating = signal(5);
  protected readonly reviewError = signal('');
  // id черновиков отзывов: отрицательные, чтобы не совпасть с настоящими (их сервер выдаёт с 1)
  private nextDraftId = -1;

  private readonly http = inject(HttpClient);
  protected readonly cart = inject(CartStore);"""),
    ("""      : 0,
  );
}""", """      : 0,
  );

  protected addReview(textBox: HTMLTextAreaElement) {
    const text = textBox.value.trim();
    if (!text) {
      return;
    }
    // Черновик: так отзыв будет выглядеть, когда сервер его сохранит
    const draft: Review = {
      id: this.nextDraftId--,
      gameId: this.id(),
      author: 'Вы',
      rating: this.newRating(),
      text,
      date: new Date().toISOString().slice(0, 10),
    };
    // Оптимистичное обновление: отзыв появляется сразу, не дожидаясь ответа сервера
    this.reviews.update((reviews) => [...reviews, draft]);
    textBox.value = '';
    this.reviewError.set('');

    this.http
      .post<Review>(`/api/games/${this.id()}/reviews`, {
        rating: draft.rating,
        text,
      })
      .subscribe({
        // Сервер сохранил отзыв: заменяем черновик настоящим
        next: (saved) =>
          this.reviews.update((reviews) =>
            reviews.map((review) =>
              review === draft ? saved : review,
            ),
          ),
        // Не получилось: убираем черновик и возвращаем текст в поле
        error: () => {
          this.reviews.update((reviews) =>
            reviews.filter((review) => review !== draft),
          );
          textBox.value = text;
          this.reviewError.set(
            'Не удалось отправить отзыв. Попробуйте ещё раз.',
          );
        },
      });
  }
}"""))
R8 = edit(R8, 'game/game-page.html', ("""    </app-tab>
  </app-tabs>""", """    </app-tab>
    <app-tab label="Отзывы">
      @if (reviews.status() === 'error') {
        <p class="error-message">
          Не удалось загрузить отзывы.
          <button class="link-button" (click)="reviews.reload()">
            Повторить
          </button>
        </p>
      } @else if (reviews.isLoading()) {
        <p class="muted">Загружаем отзывы…</p>
      } @else {
        @for (review of reviews.value(); track review.id) {
          <article class="review">
            <app-rating [value]="review.rating" readonly />
            <b>{{ review.author }}</b>
            <span class="muted">
              @if (review.id < 0) {
                отправляем…
              } @else {
                {{ review.date | date }}
              }
            </span>
            <p>{{ review.text }}</p>
          </article>
        } @empty {
          <p class="muted">Отзывов пока нет. Будьте первым!</p>
        }
      }
      <div class="review-form">
        <app-rating
          [value]="newRating()"
          (valueChange)="newRating.set($event)"
        />
        <textarea
          #reviewText
          rows="3"
          placeholder="Ваш отзыв"
          aria-label="Текст отзыва"
        ></textarea>
        <button class="button" (click)="addReview(reviewText)">
          Отправить
        </button>
        @if (reviewError()) {
          <p class="error-message">{{ reviewError() }}</p>
        }
      </div>
    </app-tab>
  </app-tabs>"""))
R8 = edit(R8, 'game/game-page.css', ("""/* Характеристики: название слева, значение справа */""", """/* Отзыв: оценка, автор, дата и текст */
.review {
  padding: 8px 0;
  border-bottom: 1px solid var(--surface);
  font-size: 14px;
}

.review b {
  margin: 0 6px;
}

.review p {
  margin: 4px 0 0;
}

/* Новый отзыв */
.review-form {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  margin-top: 12px;
}

.review-form textarea {
  box-sizing: border-box;
  width: 100%;
  padding: 8px;
  border: 1px solid #d2d2d7;
  border-radius: 8px;
  font: inherit;
}

/* Характеристики: название слева, значение справа */"""))

# ---------- 11.9 практикум: каталог страницами с сервера ----------

R9 = edit(R8, 'catalog/catalog.ts',
    ("""  // Каталог с сервера: поиск, фильтры и сортировка — параметры запроса.
  // Изменился любой сигнал, прочитанный внутри, — ресурс отправит новый запрос
  protected readonly games = httpResource<GamesPage>(() => ({
    url: '/api/games',
    params: {
      q: this.query.value(),
      inStock: this.inStock(),
      rating: this.rating(),
      sort: SORT_PARAMS[this.sort()],
      // Пока все найденные игры сразу; порции с сервера — в практикуме
      size: 100,
    },
  }));""", """  // Поиск, фильтры и сортировка одним объектом. Изменилось что-то — новый поиск с первой страницы
  private readonly filters = computed(() => ({
    q: this.query.value(),
    inStock: this.inStock(),
    rating: this.rating(),
    sort: SORT_PARAMS[this.sort()],
  }));
  // Номер страницы каталога: «Показать ещё» — следующая, новые фильтры — снова первая
  protected readonly page = linkedSignal({
    source: this.filters,
    computation: () => 1,
  });

  // Одна страница каталога с сервера
  protected readonly games = httpResource<GamesPage>(() => ({
    url: '/api/games',
    params: {
      ...this.filters(),
      page: this.page(),
      size: this.config.pageSize,
    },
  }));"""),
    ("""  // Найденные игры
  protected readonly visibleGames = computed(
    () => this.found()?.items ?? [],
  );
""", ""),
    ("""  // Сколько игр каталога показано. Новый поиск, фильтр или сортировка — снова первая порция
  protected readonly shownCount = linkedSignal<Game[], number>({
    source: this.visibleGames,
    computation: () => this.config.pageSize,
  });
  protected readonly shownGames = computed(() =>
    this.visibleGames().slice(0, this.shownCount()),
  );""", """  // Показанные игры: первая страница заменяет список, следующие дописываются в конец.
  // Пока страница грузится (undefined), список прежний
  protected readonly shownGames = linkedSignal<
    GamesPage | undefined,
    Game[]
  >({
    source: () =>
      this.games.hasValue() ? this.games.value() : undefined,
    computation: (page, previous) => {
      const shown = previous?.value ?? [];
      if (!page) {
        return shown;
      }
      return page.page === 1
        ? page.items
        : [...shown, ...page.items];
    },
  });"""),
    ("""  protected showMore() {
    this.shownCount.update(
      (count) => count + this.config.pageSize,
    );
  }""", """  protected showMore() {
    this.page.update((page) => page + 1);
  }"""))
R9 = edit(R9, 'catalog/catalog.html',
    ("""@if (shownCount() < visibleGames().length) {
  <app-load-more (more)="showMore()" />
}""", """@if (
  !games.isLoading() && shownGames().length < found.total
) {
  <app-load-more (more)="showMore()" />
}"""))


# ---------- 11.10 под капотом: журнал статусов ресурсов ----------

RESOURCE_LOG = """import { Resource, effect } from '@angular/core';

// Журнал ресурса для шага «Под капотом»: печатает в консоль каждую смену статуса.
// Вызывать там, где можно создать эффект: в конструкторе или в инициализаторе поля
export function logResource(
  name: string,
  resource: Resource<unknown>,
) {
  let previous = '—';
  effect(() => {
    const status = resource.status();
    // value() ресурса с ошибкой бросает исключение — читаем значение, только если оно есть
    const details =
      status === 'error'
        ? `, ошибка: ${resource.error()?.message}`
        : resource.hasValue()
          ? ', значение есть'
          : '';
    console.log(`${name}: ${previous} → ${status}${details}`);
    previous = status;
  });
}
"""

S10 = dict(R9)
S10['resource-log.ts'] = RESOURCE_LOG
S10 = edit(S10, 'catalog/catalog.ts',
    ("import { Rating } from '../shared/rating/rating';", "import { logResource } from '../resource-log';\nimport { Rating } from '../shared/rating/rating';"),
    ("""  protected resetFilters() {""", """  constructor() {
    logResource('Каталог', this.games);
  }

  protected resetFilters() {"""))
S10 = edit(S10, 'game/game-page.ts',
    ("import { Rating } from '../shared/rating/rating';", "import { logResource } from '../resource-log';\nimport { Rating } from '../shared/rating/rating';"),
    ("""  protected readonly cart = inject(CartStore);""", """  protected readonly cart = inject(CartStore);

  constructor() {
    logResource('Игра', this.game);
    logResource('Отзывы', this.reviews);
  }"""))

steps = {
    '01-server': {'start': S1, 'solution': R1},
    '02-http-client': {'start': R1, 'solution': R2},
    '03-http-resource': {'start': R2, 'solution': R3},
    '04-params': {'start': R3, 'solution': R4},
    '05-errors': {'start': R4, 'solution': R5},
    '06-resource': {'start': S6, 'solution': R6},
    '07-debounced': {'start': S7, 'solution': R7},
    '08-mutations': {'start': R7, 'solution': R8},
    '09-practice': {'start': R8, 'solution': R9},
    '10-resource-inside': {'start': S10},
}

if __name__ == '__main__':
    write_steps(ROOT, steps, base='10-routing/10-practice')
    print('ok')
