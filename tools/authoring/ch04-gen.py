# Генератор кода шагов главы 4: общие куски — константы, шаги — их комбинации.
# Запуск: python3 tools/authoring/ch04-gen.py — ПЕРЕЗАПИСЫВАЕТ start/ и solution/ всех шагов главы 4.
# Старт главы — решение практикума главы 3 (08-practice) + стили главы в app.css.
# В конце прогоняет Prettier по коду шагов. После запуска: npm run validate.
# Тексты уроков (lesson.md) пишутся отдельно, руками; генератор их не трогает.
import os, subprocess

PROJECT = '/Users/mr/Desktop/Experimental/angular-learn'
ROOT = f'{PROJECT}/content/04-control-flow'
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from steps import step_dir
CH03 = step_dir(f'{PROJECT}/content/03-signals/08-practice/solution')

def read(path):
    with open(path) as f:
        return f.read()

MAIN = read(f'{CH03}/main.ts')
CONFIG = read(f'{CH03}/app.config.ts')
STYLES_CSS = read(f'{CH03}/styles.css')
GAMES_DATA = read(f'{CH03}/core/games-data.ts')
MODELS = read(f'{CH03}/core/models.ts')
APP_03 = read(f'{CH03}/app.ts')
HTML_03 = read(f'{CH03}/app.html')

def rep(text, old, new):
    assert old in text, old
    return text.replace(old, new, 1)

# ---------- app.css: стили всей главы появляются в первом шаге ----------

APP_CSS = rep(read(f'{CH03}/app.css'), """.sold-out .cover {""", """.sold-out .cover,
.sold-out .tile-cover {""") + """
/* Наличие */
.stock {
  margin: 0;
  font-size: 13px;
}

.stock-out {
  color: var(--brand);
}

.stock-few {
  color: #b25e00;
}

.stock-ok {
  color: #1d7f3a;
}

/* Каталог: плитки в сетке .grid из styles.css */
.tile {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 8px;
  border-radius: var(--radius);
  background: var(--surface);
}

.tile-cover {
  width: 100%;
  aspect-ratio: 3 / 4;
  border-radius: 6px;
}

.tile-title {
  margin: 0;
  font-size: 15px;
}

.tile .price {
  font-size: 16px;
}

.tile .button {
  margin-top: auto;
}

.category {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 2px 6px;
  border-radius: 6px;
  background: rgb(255 255 255 / 90%);
  font-size: 11px;
  font-weight: 600;
}

.empty {
  grid-column: 1 / -1;
  margin: 24px 0;
  text-align: center;
}

/* Строки корзины */
.mini-cart {
  margin-bottom: 12px;
}

.cart-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  border-radius: 6px;
}

.cart-row.even {
  background: var(--surface);
}

.cart-row .icon-button {
  width: 26px;
  height: 26px;
  font-size: 15px;
}

.cart-row-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cart-row-sum {
  min-width: 64px;
  text-align: right;
  white-space: nowrap;
}

/* Фильтры каталога */
.filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  font-size: 14px;
}

.filters select {
  padding: 4px 8px;
  border: 1px solid #d2d2d7;
  border-radius: 8px;
  font: inherit;
}
"""

# ---------- шаг 1: @if на карточке главы 3 ----------

FEW_CONST = """
// При каком остатке на складе писать «Осталось N шт.»
const FEW_LEFT = 5;
"""
APP_41 = rep(APP_03, "const FREE_DELIVERY_FROM = 5000;\n", "const FREE_DELIVERY_FROM = 5000;\n" + FEW_CONST)
APP_41 = rep(APP_41, "  protected readonly gamesCount = GAMES.length;\n",
             "  protected readonly gamesCount = GAMES.length;\n  protected readonly fewLeft = FEW_LEFT;\n")

H = HTML_03
H = rep(H, """        <span [hidden]="!game().oldPrice">
          <s class="old-price">{{ game().oldPrice }} ₽</s>
          <span class="badge">−{{ discount() }} %</span>
        </span>
      </p>
""", """        @if (game().oldPrice; as oldPrice) {
          <s class="old-price">{{ oldPrice }} ₽</s>
          <span class="badge">−{{ discount() }} %</span>
        }
      </p>
      @if (game().inStock === 0) {
        <p class="stock stock-out">Нет в наличии</p>
      } @else if (game().inStock <= fewLeft) {
        <p class="stock stock-few">Осталось {{ game().inStock }} шт.</p>
      } @else {
        <p class="stock stock-ok">В наличии</p>
      }
""")
H = rep(H, """        <button class="button" [disabled]="available() === 0" (click)="addToCart()">
          {{ soldOut() ? 'Нет в наличии' : 'В корзину' }}
        </button>""", """        <button class="button" [disabled]="available() === 0" (click)="addToCart()">В корзину</button>""")
H = rep(H, """      <p class="in-cart muted" [hidden]="inCart() === 0">
        Уже в корзине: {{ inCart() }} шт.
        <button class="link-button" (click)="removeFromCart()">Убрать</button>
      </p>
""", """      @if (inCart() > 0) {
        <p class="in-cart muted">
          Уже в корзине: {{ inCart() }} шт.
          <button class="link-button" (click)="removeFromCart()">Убрать</button>
        </p>
      }
""")
MINI_03 = H[H.index('  <section class="mini-cart"'):H.index('  </section>\n') + len('  </section>\n')]
MINI_41 = """  @if (cart().length > 0) {
    <section class="mini-cart">
      <h2>Корзина</h2>
      <p>{{ cartSummary() }}</p>
      <p><b>Итого: {{ cartTotal() }} ₽</b></p>
      @if (deliveryLeft() > 0) {
        <p class="muted">До бесплатной доставки: {{ deliveryLeft() }} ₽</p>
      } @else {
        <p class="muted">Доставка бесплатная</p>
      }
      <button class="link-button" (click)="clearCart()">Очистить корзину</button>
    </section>
  }
"""
H = rep(H, MINI_03, MINI_41)
HTML_41 = H

# ---------- шаг 2: каталог через @for ----------

HEADER = """<header class="header">
  <span class="logo">♞ Ход конём</span>
  <span class="cart">В корзине: {{ cartCount() }} · {{ cartTotal() }} ₽</span>
</header>
"""
SEARCH_ENTER = """  <input #searchBox class="search" type="search" placeholder="Найти игру" (keydown.enter)="search(searchBox.value)" />
  <p class="muted" [hidden]="!searchBox.value">Ищем: «{{ searchBox.value }}»</p>
"""
SEARCH_LIVE = """  <input #searchBox class="search" type="search" placeholder="Найти игру" (input)="query.set(searchBox.value)" />
"""
SEARCH_RESET = """  <input
    #searchBox
    class="search"
    type="search"
    placeholder="Найти игру"
    [value]="query()"
    (input)="query.set(searchBox.value)"
  />
"""

def page(search, middle):
    return HEADER + '<main class="page">\n  <h1>Магазин настольных игр</h1>\n' + search + '\n' + middle + '</main>\n'

def mini_cart(rows):
    return """  @if (cart().length > 0) {
    <section class="mini-cart">
      <h2>Корзина</h2>
""" + rows + """      <p><b>Итого: {{ cartTotal() }} ₽</b></p>
      @if (deliveryLeft() > 0) {
        <p class="muted">До бесплатной доставки: {{ deliveryLeft() }} ₽</p>
      } @else {
        <p class="muted">Доставка бесплатная</p>
      }
      <button class="link-button" (click)="clearCart()">Очистить корзину</button>
    </section>
  }
"""

ROWS_SUMMARY = "      <p>{{ cartSummary() }}</p>\n"
ROWS_FOR = """      @for (item of cart(); track item.game.id) {
        <div class="cart-row" [class.even]="$even">
          <span class="cart-row-title">{{ $index + 1 }}. {{ item.game.title }}</span>
          <button class="icon-button" aria-label="Убрать одну" [disabled]="item.quantity === 1" (click)="changeQuantity(item, -1)">−</button>
          <span>{{ item.quantity }}</span>
          <button class="icon-button" aria-label="Добавить ещё" [disabled]="item.quantity >= item.game.inStock" (click)="changeQuantity(item, 1)">+</button>
          <span class="cart-row-sum">{{ item.game.price * item.quantity }} ₽</span>
          <button class="icon-button" aria-label="Убрать из корзины" (click)="removeFromCart(item)">×</button>
        </div>
      }
"""

CATEGORY = """      <span class="category">
        @switch (game.category) {
          @case ('family') { Семейная }
          @case ('strategy') { Стратегия }
          @case ('party') { Для компании }
          @case ('cooperative') { Кооперативная }
          @case ('kids') { Детская }
          @default never;
        }
      </span>
"""

def catalog(source, empty='', category=''):
    return """  <div class="grid">
    @for (game of """ + source + """; track game.id) {
      @let inCartCount = inCart().get(game.id) ?? 0;
      <article class="tile" [class.sold-out]="game.inStock === 0">
        <img class="tile-cover" [src]="game.cover" [alt]="game.title" />
""" + category.replace('\n      ', '\n        ').replace('      <span class="category">', '        <span class="category">', 1) + """        <h2 class="tile-title">{{ game.title }}</h2>
        <p class="price">
          {{ game.price }} ₽
          @if (game.oldPrice; as oldPrice) {
            <s class="old-price">{{ oldPrice }} ₽</s>
          }
        </p>
        @if (game.inStock === 0) {
          <p class="stock stock-out">Нет в наличии</p>
        } @else if (game.inStock <= fewLeft) {
          <p class="stock stock-few">Осталось {{ game.inStock }} шт.</p>
        } @else {
          <p class="stock stock-ok">В наличии</p>
        }
        <button class="button" [disabled]="inCartCount >= game.inStock" (click)="addToCart(game)">В корзину</button>
        @if (inCartCount > 0) {
          <p class="in-cart muted">В корзине: {{ inCartCount }} шт.</p>
        }
      </article>
    }""" + empty + """
  </div>
"""

EMPTY_44 = """ @empty {
      <p class="empty muted">Ничего не найдено по запросу «{{ query() }}»</p>
    }"""
EMPTY_47_START = """ @empty {
      <p class="empty muted">Ничего не найдено по запросу «{{ query() }}»</p>
      <!-- TODO: другой текст (фильтр «Только в наличии» тоже может всё скрыть) и кнопка «Сбросить фильтры» -->
    }"""
EMPTY_47 = """ @empty {
      <div class="empty">
        <p class="muted">Ничего не найдено</p>
        <button class="link-button" (click)="resetFilters()">Сбросить фильтры</button>
      </div>
    }"""

FILTERS = """  <div class="filters">
    <label>
      <input #inStock type="checkbox" [checked]="inStockOnly()" (change)="inStockOnly.set(inStock.checked)" />
      Только в наличии
    </label>
    <select #sort aria-label="Сортировка" [value]="sortBy()" (change)="changeSort(sort.value)">
      <option value="default">По умолчанию</option>
      <option value="cheap">Сначала дешёвые</option>
      <option value="expensive">Сначала дорогие</option>
      <option value="rating">По рейтингу</option>
    </select>
  </div>

"""

HTML_42_START = page(SEARCH_ENTER, mini_cart(ROWS_SUMMARY) + "\n  <!-- TODO: каталог — плитка на каждую игру из games -->\n")
HTML_42 = page(SEARCH_ENTER, mini_cart(ROWS_SUMMARY) + '\n' + catalog('games'))
HTML_43 = page(SEARCH_ENTER, mini_cart(ROWS_FOR) + '\n' + catalog('games'))
HTML_44 = page(SEARCH_LIVE, mini_cart(ROWS_FOR) + '\n' + catalog('visibleGames()', EMPTY_44))
HTML_45 = page(SEARCH_LIVE, mini_cart(ROWS_FOR) + '\n' + catalog('visibleGames()', EMPTY_44, CATEGORY))
HTML_47_START = page(SEARCH_LIVE, mini_cart(ROWS_FOR) + "\n  <!-- TODO: фильтры — «Только в наличии» и сортировка -->\n" + catalog('visibleGames()', EMPTY_47_START, CATEGORY))
HTML_47 = page(SEARCH_RESET, mini_cart(ROWS_FOR) + '\n' + FILTERS + catalog('visibleGames()', EMPTY_47, CATEGORY))

# ---------- app.ts начиная с шага 2 ----------

def app_ts(imports, consts, body):
    return f"""{imports}import {{ CartItem, Game }} from './core/models';
import {{ GAMES }} from './core/games-data';

// С какой суммы заказа доставка бесплатная, ₽
const FREE_DELIVERY_FROM = 5000;

// При каком остатке на складе писать «Осталось N шт.»
const FEW_LEFT = 5;
{consts}
@Component({{
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
}})
export class App {{
{body}}}
"""

IMP = "import { Component, computed, effect, signal } from '@angular/core';\n"

GAMES_FIELD = "  protected readonly games = GAMES;\n"
FEW_FIELD = "  protected readonly fewLeft = FEW_LEFT;\n"
QUERY = """  // Строка поиска и игры, которые ей подходят
  protected readonly query = signal('');
  protected readonly visibleGames = computed(() => {
    const query = this.query().trim().toLowerCase();
    return GAMES.filter((game) => game.title.toLowerCase().includes(query) || game.tags.some((tag) => tag.includes(query)));
  });
"""
FILTER_SIGNALS = """  // Строка поиска, фильтр и сортировка каталога
  protected readonly query = signal('');
  protected readonly inStockOnly = signal(false);
  protected readonly sortBy = signal<SortKey>('default');

  // Игры, которые видит покупатель: найденные, отфильтрованные и отсортированные
  protected readonly visibleGames = computed(() => {
    const query = this.query().trim().toLowerCase();
    const games = GAMES.filter(
      (game) =>
        (game.title.toLowerCase().includes(query) || game.tags.some((tag) => tag.includes(query))) &&
        (!this.inStockOnly() || game.inStock > 0),
    );
    // filter вернул новый массив, поэтому сортировка не испортит GAMES
    switch (this.sortBy()) {
      case 'cheap':
        return games.sort((a, b) => a.price - b.price);
      case 'expensive':
        return games.sort((a, b) => b.price - a.price);
      case 'rating':
        return games.sort((a, b) => b.rating - a.rating);
      default:
        return games;
    }
  });
"""
SORT_TYPE = """
// Варианты сортировки каталога
type SortKey = 'default' | 'cheap' | 'expensive' | 'rating';
"""
CART = """
  // Корзина — массив позиций. Его не меняем, а заменяем новым
  protected readonly cart = signal<CartItem[]>([]);
  protected readonly cartCount = computed(() => this.cart().reduce((sum, item) => sum + item.quantity, 0));
  protected readonly cartTotal = computed(() =>
    this.cart().reduce((sum, item) => sum + item.game.price * item.quantity, 0),
  );
  protected readonly cartSummary = computed(() =>
    this.cart()
      .map((item) => `${item.game.title} × ${item.quantity}`)
      .join(', '),
  );
  protected readonly deliveryLeft = computed(() => Math.max(FREE_DELIVERY_FROM - this.cartTotal(), 0));

  // Сколько штук каждой игры в корзине: id игры → количество
  protected readonly inCart = computed(() => new Map(this.cart().map((item) => [item.game.id, item.quantity])));

  constructor() {
    // Побочный эффект: сообщение в консоли при каждом изменении корзины
    effect(() => {
      console.log('Корзина:', this.cartSummary() || 'пусто');
    });
  }

  protected addToCart(game: Game) {
    this.cart.update((items) => {
      const existing = items.find((item) => item.game.id === game.id);
      if (!existing) {
        return [...items, { game, quantity: 1 }];
      }
      return items.map((item) => (item === existing ? { ...item, quantity: item.quantity + 1 } : item));
    });
  }
"""
ROW_METHODS = """
  protected changeQuantity(item: CartItem, delta: number) {
    this.cart.update((items) =>
      items.map((i) => (i.game.id === item.game.id ? { ...i, quantity: i.quantity + delta } : i)),
    );
  }

  protected removeFromCart(item: CartItem) {
    this.cart.update((items) => items.filter((i) => i.game.id !== item.game.id));
  }
"""
CLEAR = """
  protected clearCart() {
    this.cart.set([]);
  }
"""
SEARCH_METHOD = """
  protected search(query: string) {
    console.log('Ищем:', query);
  }
"""
FILTER_METHODS = """
  protected changeSort(value: string) {
    this.sortBy.set(value as SortKey);
  }

  protected resetFilters() {
    this.query.set('');
    this.inStockOnly.set(false);
    this.sortBy.set('default');
  }
"""

APP_42 = app_ts(IMP, '', GAMES_FIELD + FEW_FIELD + CART + CLEAR + SEARCH_METHOD)
APP_43 = app_ts(IMP, '', GAMES_FIELD + FEW_FIELD + CART + ROW_METHODS + CLEAR + SEARCH_METHOD)
APP_44 = app_ts(IMP, '', QUERY + FEW_FIELD + CART + ROW_METHODS + CLEAR)
APP_47_START = app_ts(IMP, '', QUERY + """  // TODO: фильтр «Только в наличии» (inStockOnly) и сортировка (sortBy) — учтите их в visibleGames
""" + FEW_FIELD + CART + ROW_METHODS + CLEAR + """
  // TODO: changeSort(value) и resetFilters()
""")
APP_47 = app_ts(IMP, SORT_TYPE, FILTER_SIGNALS + FEW_FIELD + CART + ROW_METHODS + CLEAR + FILTER_METHODS)

# ---------- шаг «Под капотом»: наблюдатель за DOM каталога ----------

DOM_WATCH = """// Следит за плитками каталога и после каждого изменения пишет в консоль, что стало с DOM:
// сколько плиток создано заново, сколько перемещено, сколько удалено и сколько текстов переписано.
// Только для изучения — в приложении такое не нужно.

export function watchCatalog() {
  const grid = document.querySelector('.grid');
  if (!grid) return;
  const seen = new WeakSet<Node>(grid.querySelectorAll('.tile'));

  new MutationObserver((records) => {
    const added = new Set<Node>();
    const removed = new Set<Node>();
    let texts = 0;
    for (const record of records) {
      if (record.type === 'characterData') texts++;
      if (record.target !== grid) continue;
      record.addedNodes.forEach((node) => node instanceof HTMLElement && node.matches('.tile') && added.add(node));
      record.removedNodes.forEach((node) => node instanceof HTMLElement && node.matches('.tile') && removed.add(node));
    }
    // Плитка, которую убрали и тут же вставили, — перемещённая, а не новая
    const moved = [...added].filter((node) => seen.has(node)).length;
    const created = added.size - moved;
    const deleted = [...removed].filter((node) => !added.has(node)).length;
    added.forEach((node) => seen.add(node));
    console.log(`Плитки: создано ${created}, перемещено ${moved}, удалено ${deleted}; текстов переписано: ${texts}`);
  }).observe(grid, { childList: true, characterData: true, subtree: true });
}
"""

# ---------- шаги ----------

def base(app, html):
    return {
        'main.ts': MAIN, 'app.ts': app, 'app.html': html, 'app.css': APP_CSS,
        'core/models.ts': MODELS, 'core/games-data.ts': GAMES_DATA,
        'app.config.ts': CONFIG, 'styles.css': STYLES_CSS,
    }

S41 = base(APP_41, HTML_41)
S42 = base(APP_42, HTML_42)
S43 = base(APP_43, HTML_43)
S44 = base(APP_44, HTML_44)
S45 = base(APP_44, HTML_45)
S47 = base(APP_47, HTML_47)

steps = {
    '01-if': {'start': base(APP_03, HTML_03), 'solution': S41},
    '02-for': {'start': base(APP_42, HTML_42_START), 'solution': S42},
    '03-for-variables': {'start': S42, 'solution': S43},
    '04-empty': {'start': S43, 'solution': S44},
    '05-switch': {'start': S44, 'solution': S45},
    '06-ng-template': {'start': S45},
    '07-practice': {'start': base(APP_47_START, HTML_47_START), 'solution': S47},
    '08-track': {'start': {**S47, 'dom-watch.ts': DOM_WATCH}},
}

# Запись на диск: start/, совпадающий с результатом предыдущего шага, не записывается (см. steps.py)
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from steps import write_steps

write_steps(ROOT, steps)
# Код шагов — в том виде, какой даёт форматирование в редакторе платформы
opts = ['--print-width', '120', '--single-quote', '--trailing-comma', 'all', '--log-level', 'warn', '--write']
subprocess.run(['npx', 'prettier', *opts, f'{ROOT}/**/*.ts'], cwd=PROJECT, check=True)
subprocess.run(['npx', 'prettier', *opts, '--parser', 'angular', f'{ROOT}/**/*.html'], cwd=PROJECT, check=True)
print('ok')
