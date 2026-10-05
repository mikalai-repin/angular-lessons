# Генератор кода шагов главы 8: общие куски — константы, шаги — их комбинации.
# Запуск: python3 tools/authoring/ch08-gen.py — ПЕРЕЗАПИСЫВАЕТ start/ и solution/ всех шагов главы 8.
# Старт главы — решение практикума главы 7 (07-practice) + шапка, вынесенная в компонент Header (layout/header/,
# пока со входами count и total) + стили главы: кнопка «В избранное» и ряд кнопок карточки (.actions) в game-card.css.
# Код форматирует write_steps (как кнопка «Формат» в редакторе). После запуска: npm run validate.
# Тексты уроков (lesson.md) пишутся отдельно, руками; генератор их не трогает.
import os, subprocess, sys

PROJECT = '/Users/mr/Desktop/Experimental/angular-learn'
ROOT = f'{PROJECT}/content/08-services-di'
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from steps import legacy_dir, write_steps

CH07 = legacy_dir(f'{PROJECT}/content/07-directives-pipes/07-practice/solution')

def read(path):
    with open(path) as f:
        return f.read()

def rep(text, old, new):
    assert old in text, old
    return text.replace(old, new, 1)

BASE = {}
for dirpath, _, names in os.walk(CH07):
    for name in names:
        full = os.path.join(dirpath, name)
        BASE[os.path.relpath(full, CH07)] = read(full)

# ---------- шапка: компонент Header (готовый в старте главы) ----------

HEADER_CSS = """/* Шапка магазина */
.header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--brand);
  color: #fff;
}

.logo {
  margin-right: auto;
  font-size: 20px;
  font-weight: 700;
}

.cart,
.favorites {
  font-size: 14px;
  white-space: nowrap;
}
"""

HEADER_HTML_INPUTS = """<header class="header">
  <span class="logo">♞ Ход конём</span>
  <span class="cart">В корзине: {{ count() }} · {{ total() | price }}</span>
</header>
"""

HEADER_TS_INPUTS = """import { Component, input } from '@angular/core';
import { PricePipe } from '../../shared/price-pipe';

// Шапка магазина: логотип и сводка корзины
@Component({
  selector: 'app-header',
  imports: [PricePipe],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  // Сколько штук в корзине и на какую сумму. Корзина живёт в App — оттуда и приходят числа
  readonly count = input(0);
  readonly total = input(0);
}
"""

HEADER_HTML_CART = """<header class="header">
  <span class="logo">♞ Ход конём</span>
  <span class="cart">В корзине: {{ cart.count() }} · {{ cart.total() | price }}</span>
</header>
"""

HEADER_HTML_FAV_START = """<header class="header">
  <span class="logo">♞ Ход конём</span>
  <!-- TODO: сколько игр в избранном: «♥ 2» -->
  <span class="cart">В корзине: {{ cart.count() }} · {{ cart.total() | price }}</span>
</header>
"""

HEADER_HTML_FAV = """<header class="header">
  <span class="logo">♞ Ход конём</span>
  <span class="favorites" title="Избранное">♥ {{ favorites.count() }}</span>
  <span class="cart">В корзине: {{ cart.count() }} · {{ cart.total() | price }}</span>
</header>
"""

def header_ts(step, start=False):
    if step == 0 or (step == 1 and start):
        ts = HEADER_TS_INPUTS
        if start:
            ts = rep(ts, "  // Сколько штук в корзине и на какую сумму. Корзина живёт в App — оттуда и приходят числа\n",
                     "  // TODO: брать корзину из cartStore, а не из входов\n"
                     "  // Сколько штук в корзине и на какую сумму. Корзина живёт в App — оттуда и приходят числа\n")
        return ts
    if step == 1:
        return """import { Component } from '@angular/core';
import { cartStore } from '../../core/cart-store';
import { PricePipe } from '../../shared/price-pipe';

// Шапка магазина: логотип и сводка корзины
@Component({
  selector: 'app-header',
  imports: [PricePipe],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  // Та же корзина, что у App: единственный экземпляр из core/cart-store.ts
  protected readonly cart = cartStore;
}
"""
    ts = """import { Component, inject } from '@angular/core';
import { CartStore } from '../../core/cart-store';
import { PricePipe } from '../../shared/price-pipe';

// Шапка магазина: логотип и сводка корзины
@Component({
  selector: 'app-header',
  imports: [PricePipe],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  // Корзину создаёт и выдаёт Angular — та же, что у всех остальных
  protected readonly cart = inject(CartStore);
}
"""
    if step >= 8 and not start:
        ts = rep(ts, "import { CartStore } from '../../core/cart-store';\n",
                 "import { CartStore } from '../../core/cart-store';\nimport { FavoritesStore } from '../../core/favorites-store';\n")
        ts = rep(ts, "// Шапка магазина: логотип и сводка корзины\n", "// Шапка магазина: логотип, избранное и сводка корзины\n")
        ts = rep(ts, "  protected readonly cart = inject(CartStore);\n",
                 "  protected readonly cart = inject(CartStore);\n  protected readonly favorites = inject(FavoritesStore);\n")
    return ts

def header_html(step, start=False):
    if step == 0 or (step == 1 and start):
        return HEADER_HTML_INPUTS
    if step == 8:
        return HEADER_HTML_FAV_START if start else HEADER_HTML_FAV
    if step > 8:
        return HEADER_HTML_FAV
    return HEADER_HTML_CART

# ---------- стили главы ----------

APP_CSS = rep(BASE['app.css'], """/* Стили компонента App: действуют только внутри его шаблона */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  background: var(--brand);
  color: #fff;
}

.logo {
  font-size: 20px;
  font-weight: 700;
}

.cart {
  font-size: 14px;
  white-space: nowrap;
}

""", "/* Стили компонента App: действуют только внутри его шаблона */\n")

CARD_CSS = rep(BASE['shared/game-card/game-card.css'], """/* Кнопка прижата к низу карточки: кнопки соседних карточек стоят на одной линии */
.button {
  margin-top: auto;
}
""", """/* Кнопка прижата к низу карточки: кнопки соседних карточек стоят на одной линии */
.button {
  margin-top: auto;
}

/* Ряд кнопок внизу карточки: «В корзину» и «В избранное» */
.actions {
  display: flex;
  align-self: stretch;
  gap: 6px;
  margin-top: auto;
}

.actions .button {
  flex: 1;
  min-width: 0;
  margin-top: 0;
  padding-inline: 6px;
  white-space: nowrap;
}

.favorite {
  flex: none;
  width: 34px;
  border: 1px solid #d2d2d7;
  border-radius: 8px;
  background: #fff;
  color: var(--brand);
  font: inherit;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}

.favorite.active {
  border-color: var(--brand);
}
""")

# ---------- корзина: core/cart-store.ts ----------

CART_STORE_START = """import { computed, signal } from '@angular/core';
import { CartItem, Game } from './models';

// С какой суммы заказа доставка бесплатная, ₽
const FREE_DELIVERY_FROM = 5000;

// TODO: класс CartStore — корзина магазина: позиции, количество, сумма и действия с ними. Перенесите её сюда из App
// TODO: единственный экземпляр корзины на всё приложение — cartStore
"""

CART_BODY = """  // Позиции корзины. Массив не меняем, а заменяем новым
  readonly items = signal<CartItem[]>([]);

  readonly count = computed(() => this.items().reduce((sum, item) => sum + item.quantity, 0));
  readonly total = computed(() => this.items().reduce((sum, item) => sum + item.game.price * item.quantity, 0));
  readonly summary = computed(() =>
    this.items()
      .map((item) => `${item.game.title} × ${item.quantity}`)
      .join(', '),
  );
  readonly deliveryLeft = computed(() => Math.max(FREE_DELIVERY_FROM - this.total(), 0));

  // Сколько штук каждой игры в корзине: id игры → количество
  private readonly quantities = computed(() => new Map(this.items().map((item) => [item.game.id, item.quantity])));

  // Метод читает сигнал, поэтому шаблон или computed, которые его вызвали, тоже зависят от корзины
  quantityOf(game: Game): number {
    return this.quantities().get(game.id) ?? 0;
  }

  add(game: Game) {
    this.items.update((items) => {
      const existing = items.find((item) => item.game.id === game.id);
      if (!existing) {
        return [...items, { game, quantity: 1 }];
      }
      return items.map((item) => (item === existing ? { ...item, quantity: item.quantity + 1 } : item));
    });
  }

  setQuantity(game: Game, quantity: number) {
    this.items.update((items) => items.map((item) => (item.game.id === game.id ? { ...item, quantity } : item)));
  }

  remove(game: Game) {
    this.items.update((items) => items.filter((item) => item.game.id !== game.id));
  }

  clear() {
    this.items.set([]);
  }
"""

def cart_store(step, start=False):
    if step == 1:
        return CART_STORE_START if start else """import { computed, signal } from '@angular/core';
import { CartItem, Game } from './models';

// С какой суммы заказа доставка бесплатная, ₽
const FREE_DELIVERY_FROM = 5000;

// Корзина магазина: позиции, количество, сумма и действия с ними
export class CartStore {
""" + CART_BODY + """}

// Единственный экземпляр корзины на всё приложение: его импортируют все, кому нужна корзина
export const cartStore = new CartStore();
"""
    config_on = step >= 5 and not (step == 5 and start)
    lazy_on = step >= 7 and not (step == 7 and start)
    imports = ['Service', 'computed', 'effect'] + (['inject'] if config_on else []) + \
        (['injectAsync', 'onIdle'] if lazy_on else []) + ['signal']
    head = ''
    body = CART_BODY
    ctor_extra = ''
    fields_extra = ''
    if config_on:
        head = "import { SHOP_CONFIG } from './shop-config';\n"
        body = rep(body, "  readonly deliveryLeft = computed(() => Math.max(FREE_DELIVERY_FROM - this.total(), 0));\n",
                   "  readonly deliveryLeft = computed(() => Math.max(this.config.freeDeliveryFrom - this.total(), 0));\n")
        fields_extra = "  // Настройки магазина: порог бесплатной доставки\n  private readonly config = inject(SHOP_CONFIG);\n\n"
    if step == 7 and start:
        body = rep(body, "  add(game: Game) {\n", "  // TODO: сообщить аналитике «В корзину» — сервис Analytics загружается лениво\n  add(game: Game) {\n")
    if lazy_on:
        fields_extra += ("  // Аналитика не нужна для первой отрисовки. Её модуль загрузится, когда браузер освободится,\n"
                         "  // а экземпляр Angular создаст при первом вызове\n"
                         "  private readonly analytics = injectAsync(() => import('./analytics').then((m) => m.Analytics), {\n"
                         "    prefetch: onIdle,\n"
                         "  });\n\n")
        body = rep(body, """      return items.map((item) => (item === existing ? { ...item, quantity: item.quantity + 1 } : item));
    });
  }
""", """      return items.map((item) => (item === existing ? { ...item, quantity: item.quantity + 1 } : item));
    });
    this.analytics().then((analytics) => analytics.track('В корзину', game.title));
  }
""")
    const = '' if config_on else "\n// С какой суммы заказа доставка бесплатная, ₽\nconst FREE_DELIVERY_FROM = 5000;\n"
    if step == 5 and start:
        const = "\n// TODO: порог бесплатной доставки — из настроек магазина (SHOP_CONFIG)\n// С какой суммы заказа доставка бесплатная, ₽\nconst FREE_DELIVERY_FROM = 5000;\n"
    return f"""import {{ {', '.join(imports)} }} from '@angular/core';
import {{ CartItem, Game }} from './models';
{head}{const}
// Корзина магазина: позиции, количество, сумма и действия с ними.
// @Service() — Angular сам создаст единственный экземпляр, когда он впервые кому-то понадобится
@Service()
export class CartStore {{
{fields_extra}{body}
  constructor() {{
    // Побочный эффект: сообщение в консоли при каждом изменении корзины
    effect(() => {{
      console.log('Корзина:', this.summary() || 'пусто');
    }});
  }}
}}
"""

# ---------- App ----------

APP_TS_07 = BASE['app.ts']
APP_HTML_07 = BASE['app.html']

APP_CART_07 = """  // Корзина — массив позиций. Его не меняем, а заменяем новым
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

  protected setQuantity(item: CartItem, quantity: number) {
    this.cart.update((items) => items.map((i) => (i.game.id === item.game.id ? { ...i, quantity } : i)));
  }

  protected removeFromCart(item: CartItem) {
    this.cart.update((items) => items.filter((i) => i.game.id !== item.game.id));
  }

"""
APP_CLEAR_07 = """  protected clearCart() {
    this.cart.set([]);
  }

"""

def app_ts(step, start=False):
    ts = APP_TS_07
    ts = rep(ts, "import { GameCard } from './shared/game-card/game-card';\n",
             "import { Header } from './layout/header/header';\nimport { GameCard } from './shared/game-card/game-card';\n")
    ts = rep(ts, "imports: [DecimalPipe, PercentPipe, GameCard, GameDetails, LoadMore, PricePipe, Rating, Quantity, Tooltip],",
             "imports: [DecimalPipe, PercentPipe, GameCard, GameDetails, Header, LoadMore, PricePipe, Rating, Quantity, Tooltip],")
    if step == 0 or (step == 1 and start):
        if start:
            ts = rep(ts, "  // Корзина — массив позиций. Его не меняем, а заменяем новым\n",
                     "  // TODO: корзину — в core/cart-store.ts, а здесь взять готовый экземпляр cartStore\n"
                     "  // Корзина — массив позиций. Его не меняем, а заменяем новым\n")
        return ts
    # корзина уходит из App
    ts = rep(ts, APP_CART_07, """  // Корзина: позиции, сумма, действия. Её же показывают шапка и карточки
  protected readonly cart = CART_SOURCE;

""")
    ts = rep(ts, APP_CLEAR_07, '')
    ts = rep(ts, """// С какой суммы заказа доставка бесплатная, ₽
const FREE_DELIVERY_FROM = 5000;

""", '')
    ts = rep(ts, "import { CartItem, Game } from './core/models';\n", "import { Game } from './core/models';\n")
    if step == 1:
        ts = rep(ts, "CART_SOURCE", "cartStore")
        ts = rep(ts, "import { Game } from './core/models';\n", "import { cartStore } from './core/cart-store';\nimport { Game } from './core/models';\n")
        # эффект-лог пока остаётся в App
        ts = rep(ts, """  protected readonly cart = cartStore;

""", """  protected readonly cart = cartStore;

  constructor() {
    // Побочный эффект: сообщение в консоли при каждом изменении корзины
    effect(() => {
      console.log('Корзина:', this.cart.summary() || 'пусто');
    });
  }

""")
        return ts
    ts = rep(ts, "CART_SOURCE", "inject(CartStore)")
    ts = rep(ts, "import { Component, ElementRef, computed, effect, linkedSignal, signal, viewChild } from '@angular/core';\n",
             "import { Component, ElementRef, computed, inject, linkedSignal, signal, viewChild } from '@angular/core';\n")
    ts = rep(ts, "import { Game } from './core/models';\n", "import { CartStore } from './core/cart-store';\nimport { Game } from './core/models';\n")
    if step == 5 and start:
        ts = rep(ts, "// С какого рейтинга игра получает стикер «Хит»\n",
                 "// TODO: HIT_RATING и PAGE_SIZE — из настроек магазина (SHOP_CONFIG)\n// С какого рейтинга игра получает стикер «Хит»\n")
    if step >= 5 and not (step == 5 and start):
        ts = rep(ts, """// С какого рейтинга игра получает стикер «Хит»
const HIT_RATING = 4.8;

// Сколько игр показывать сразу и добавлять по «Показать ещё»
const PAGE_SIZE = 6;

""", '')
        ts = rep(ts, "import { Game } from './core/models';\n", "import { Game } from './core/models';\nimport { SHOP_CONFIG } from './core/shop-config';\n")
        ts = rep(ts, """export class App {
""", """export class App {
  // Настройки магазина: рейтинг «Хита» и размер порции каталога
  private readonly config = inject(SHOP_CONFIG);

""")
        ts = rep(ts, "    computation: () => PAGE_SIZE,\n", "    computation: () => this.config.pageSize,\n")
        ts = rep(ts, "  protected readonly hitRating = HIT_RATING;\n", "  protected readonly hitRating = this.config.hitRating;\n")
        ts = rep(ts, "    this.shownCount.update((count) => count + PAGE_SIZE);\n", "    this.shownCount.update((count) => count + this.config.pageSize);\n")
    return ts

APP_HEADER_07 = """<header class="header">
  <span class="logo">♞ Ход конём</span>
  <span class="cart">В корзине: {{ cartCount() }} · {{ cartTotal() | price }}</span>
</header>
"""
APP_CARD_07 = """      <app-game-card
        [game]="game"
        [inCart]="inCart().get(game.id) ?? 0"
        (add)="addToCart(game)"
        (open)="selectedGame.set(game)"
      >
"""
APP_DETAILS_07 = """    <app-game-details
      [game]="game"
      [inCart]="inCart().get(game.id) ?? 0"
      (add)="addToCart(game)"
      (closed)="selectedGame.set(null)"
    />
"""

def app_html(step, start=False):
    html = APP_HTML_07
    if step == 0 or (step == 1 and start):
        return rep(html, APP_HEADER_07, '<app-header [count]="cartCount()" [total]="cartTotal()" />\n')
    html = rep(html, APP_HEADER_07, '<app-header />\n')
    html = rep(html, "  @if (cart().length > 0) {", "  @if (cart.items().length > 0) {")
    html = rep(html, "      @for (item of cart(); track item.game.id) {", "      @for (item of cart.items(); track item.game.id) {")
    html = rep(html, '(valueChange)="setQuantity(item, $event)"', '(valueChange)="cart.setQuantity(item.game, $event)"')
    html = rep(html, '(click)="removeFromCart(item)"', '(click)="cart.remove(item.game)"')
    html = rep(html, "<b>Итого: {{ cartTotal() | price }}</b>", "<b>Итого: {{ cart.total() | price }}</b>")
    html = rep(html, "      @if (deliveryLeft() > 0) {\n        <p class=\"muted\">До бесплатной доставки: {{ deliveryLeft() | price }}</p>",
               "      @if (cart.deliveryLeft() > 0) {\n        <p class=\"muted\">До бесплатной доставки: {{ cart.deliveryLeft() | price }}</p>")
    html = rep(html, '(click)="clearCart()"', '(click)="cart.clear()"')
    if step == 1:
        html = rep(html, APP_CARD_07, """      <app-game-card
        [game]="game"
        [inCart]="cart.quantityOf(game)"
        (add)="cart.add(game)"
        (open)="selectedGame.set(game)"
      >
""")
        html = rep(html, APP_DETAILS_07, """    <app-game-details
      [game]="game"
      [inCart]="cart.quantityOf(game)"
      (add)="cart.add(game)"
      (closed)="selectedGame.set(null)"
    />
""")
        return html
    html = rep(html, APP_CARD_07, '      <app-game-card [game]="game" (open)="selectedGame.set(game)">\n')
    html = rep(html, APP_DETAILS_07, '    <app-game-details [game]="game" (closed)="selectedGame.set(null)" />\n')
    return html

# ---------- GameCard ----------

CARD_TS_07 = BASE['shared/game-card/game-card.ts']
CARD_HTML_07 = BASE['shared/game-card/game-card.html']
CARD_BUY_07 = """<button class="button" [disabled]="inCart() >= game().inStock" (click)="add.emit()">В корзину</button>
"""

def card_ts(step, start=False):
    ts = CARD_TS_07
    if step < 2:
        return ts
    ts = rep(ts, "import { Component, input, output } from '@angular/core';\n",
             "import { Component, computed, inject, input, output } from '@angular/core';\n")
    ts = rep(ts, "import { Game } from '../../core/models';\n",
             "import { CartStore } from '../../core/cart-store';\nimport { Game } from '../../core/models';\n")
    ts = rep(ts, """  // Сколько штук этой игры уже в корзине
  readonly inCart = input(0);
  // Покупатель нажал «В корзину». Что с этим делать, решает родитель
  readonly add = output();
""", "")
    ts = rep(ts, """  protected readonly fewLeft = FEW_LEFT;
""", """  // Корзина — общая для всего магазина: карточка сама кладёт в неё игру
  protected readonly cart = inject(CartStore);
  // Сколько штук этой игры уже в корзине
  protected readonly inCart = computed(() => this.cart.quantityOf(this.game()));

  protected readonly fewLeft = FEW_LEFT;
""")
    if step == 5 and start:
        ts = rep(ts, "// При каком остатке на складе писать «Осталось N шт.»\n",
                 "// TODO: FEW_LEFT — из настроек магазина (SHOP_CONFIG)\n// При каком остатке на складе писать «Осталось N шт.»\n")
    if step >= 5 and not (step == 5 and start):
        ts = rep(ts, """// При каком остатке на складе писать «Осталось N шт.»
const FEW_LEFT = 5;

""", "")
        ts = rep(ts, "import { Game } from '../../core/models';\n", "import { Game } from '../../core/models';\nimport { SHOP_CONFIG } from '../../core/shop-config';\n")
        ts = rep(ts, "  protected readonly fewLeft = FEW_LEFT;\n",
                 "  // При каком остатке на складе писать «Осталось N шт.»\n  protected readonly fewLeft = inject(SHOP_CONFIG).fewLeft;\n")
    if step >= 8 and not (step == 8 and start):
        ts = rep(ts, "import { CartStore } from '../../core/cart-store';\n",
                 "import { CartStore } from '../../core/cart-store';\nimport { FavoritesStore } from '../../core/favorites-store';\n")
        ts = rep(ts, "  protected readonly inCart = computed(() => this.cart.quantityOf(this.game()));\n",
                 "  protected readonly inCart = computed(() => this.cart.quantityOf(this.game()));\n\n"
                 "  // Избранное — тоже общее: сердечко в карточке и счётчик в шапке\n"
                 "  protected readonly favorites = inject(FavoritesStore);\n"
                 "  protected readonly isFavorite = computed(() => this.favorites.has(this.game()));\n")
    return ts

def card_html(step, start=False):
    html = CARD_HTML_07
    if step < 2:
        return html
    buy = '<button class="button" [disabled]="inCart() >= game().inStock" (click)="cart.add(game())">В корзину</button>\n'
    if step == 8 and start:
        buy = '<!-- TODO: рядом с «В корзину» — кнопка «В избранное» (♡ / ♥) -->\n' + buy
    elif step >= 8:
        buy = """<div class="actions">
  <button class="button" [disabled]="inCart() >= game().inStock" (click)="cart.add(game())">В корзину</button>
  <button
    class="favorite"
    [class.active]="isFavorite()"
    [attr.aria-label]="isFavorite() ? 'Убрать из избранного' : 'В избранное'"
    [attr.aria-pressed]="isFavorite()"
    (click)="favorites.toggle(game())"
  >
    {{ isFavorite() ? '♥' : '♡' }}
  </button>
</div>
"""
    return rep(html, CARD_BUY_07, buy)

# ---------- GameDetails ----------

DET_TS_07 = BASE['shared/game-details/game-details.ts']
DET_HTML_07 = BASE['shared/game-details/game-details.html']

def details_ts(step):
    ts = DET_TS_07
    if step < 2:
        return ts
    ts = rep(ts, "import { Component, ElementRef, afterNextRender, input, output, viewChild } from '@angular/core';\n",
             "import { Component, ElementRef, afterNextRender, computed, inject, input, output, viewChild } from '@angular/core';\n")
    ts = rep(ts, "import { Game } from '../../core/models';\n",
             "import { CartStore } from '../../core/cart-store';\nimport { Game } from '../../core/models';\n")
    ts = rep(ts, """  readonly game = input.required<Game>();
  readonly inCart = input(0);
  readonly add = output();
""", """  readonly game = input.required<Game>();
""")
    ts = rep(ts, """  // Элемент <dialog> из шаблона: #dialog
""", """  protected readonly cart = inject(CartStore);
  protected readonly inCart = computed(() => this.cart.quantityOf(this.game()));

  // Элемент <dialog> из шаблона: #dialog
""")
    return ts

def details_html(step):
    html = DET_HTML_07
    if step < 2:
        return html
    return rep(html, '(click)="add.emit()"', '(click)="cart.add(game())"')

# ---------- inject-функция injectNow и Countdown ----------

NOW_START = """import { Signal } from '@angular/core';

// Текущее время сигналом, который обновляется каждые periodMs миллисекунд.
// Таймер останавливается сам, когда уничтожается тот, кто вызвал функцию
// TODO: функция injectNow(periodMs = 1000): Signal<number>
"""
NOW = """import { DestroyRef, Signal, assertInInjectionContext, inject, signal } from '@angular/core';

// Текущее время сигналом, который обновляется каждые periodMs миллисекунд.
// Таймер останавливается сам, когда уничтожается тот, кто вызвал функцию
export function injectNow(periodMs = 1000): Signal<number> {
  // Понятная ошибка, если функцию вызвали вне контекста внедрения
  assertInInjectionContext(injectNow);
  const now = signal(Date.now());
  const timer = setInterval(() => now.set(Date.now()), periodMs);
  // DestroyRef того, кто вызвал: компонента, директивы или сервиса
  inject(DestroyRef).onDestroy(() => clearInterval(timer));
  return now.asReadonly();
}
"""

CD_TS_07 = BASE['shared/countdown/countdown.ts']
CD_NOW_07 = """  // Текущее время. Это сигнал: шаблон обновится, когда таймер запишет новое значение
  private readonly now = signal(Date.now());
"""
CD_CTOR_07 = """
  constructor() {
    const timer = setInterval(() => this.now.set(Date.now()), 1000);
    // Компонент уничтожен (окно закрыли) — таймер больше не нужен
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }
"""

def countdown_ts(step, start=False):
    ts = CD_TS_07
    if step < 3 or (step == 3 and start):
        if start:
            ts = rep(ts, CD_NOW_07, "  // TODO: текущее время — из injectNow(), а таймер и DestroyRef здесь больше не нужны\n" + CD_NOW_07)
        return ts
    ts = rep(ts, "import { Component, DestroyRef, computed, inject, signal } from '@angular/core';\n",
             "import { Component, computed } from '@angular/core';\n")
    ts = rep(ts, "import { DatePipe } from '@angular/common';\n", "import { DatePipe } from '@angular/common';\nimport { injectNow } from '../now';\n")
    ts = rep(ts, CD_NOW_07, """  // Текущее время, раз в секунду. Таймер остановится сам, когда компонент уничтожат
  private readonly now = injectNow();
""")
    ts = rep(ts, CD_CTOR_07, "")
    return ts

# ---------- демо-корзина: провайдер useClass ----------

DEMO_START = """import { CartStore } from './cart-store';
import { GAMES } from './games-data';

// Корзина для показа магазина: при запуске в ней уже лежат игры
// TODO: класс DemoCartStore — наследник CartStore, который в конструкторе кладёт в корзину две игры
"""
DEMO = """import { Service } from '@angular/core';
import { CartStore } from './cart-store';
import { GAMES } from './games-data';

// Корзина для показа магазина: при запуске в ней уже лежат игры.
// autoProvided: false — сама по себе в DI не попадает, её подставляет провайдер в app.config.ts
@Service({ autoProvided: false })
export class DemoCartStore extends CartStore {
  constructor() {
    super();
    this.items.set([
      { game: GAMES[0], quantity: 2 },
      { game: GAMES[4], quantity: 1 },
    ]);
  }
}
"""

CONFIG_07 = BASE['app.config.ts']

def config(step, start=False):
    cfg = CONFIG_07
    if step < 4:
        return cfg
    if step == 4 and start:
        return rep(cfg, "    { provide: LOCALE_ID, useValue: 'ru' },\n",
                   "    { provide: LOCALE_ID, useValue: 'ru' },\n    // TODO: вместо CartStore — DemoCartStore (провайдер useClass)\n")
    cfg = rep(cfg, "import localeRu from '@angular/common/locales/ru';\n",
              "import localeRu from '@angular/common/locales/ru';\nimport { CartStore } from './core/cart-store';\nimport { DemoCartStore } from './core/demo-cart-store';\n")
    cfg = rep(cfg, "    { provide: LOCALE_ID, useValue: 'ru' },\n",
              "    { provide: LOCALE_ID, useValue: 'ru' },\n"
              "    // Кто попросит CartStore, получит DemoCartStore — корзину с играми для показа магазина\n"
              "    { provide: CartStore, useClass: DemoCartStore },\n")
    if step == 5 and start:
        cfg = rep(cfg, "    { provide: LOCALE_ID, useValue: 'ru' },\n",
                  "    { provide: LOCALE_ID, useValue: 'ru' },\n    // TODO: валюта по умолчанию — рубли (DEFAULT_CURRENCY_CODE)\n")
    if step >= 5 and not (step == 5 and start):
        cfg = rep(cfg, "import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';\n",
                  "import { ApplicationConfig, DEFAULT_CURRENCY_CODE, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';\n")
        cfg = rep(cfg, "    { provide: LOCALE_ID, useValue: 'ru' },\n",
                  "    { provide: LOCALE_ID, useValue: 'ru' },\n"
                  "    // Валюта по умолчанию: по ней работают встроенный пайп currency и наш price\n"
                  "    { provide: DEFAULT_CURRENCY_CODE, useValue: 'RUB' },\n")
    return cfg

# ---------- токен настроек и валюта ----------

SHOP_CONFIG_START = """import { InjectionToken } from '@angular/core';

// Настройки магазина: числа, которые раньше были константами в разных файлах
export interface ShopConfig {
  freeDeliveryFrom: number; // с какой суммы заказа доставка бесплатная, ₽
  fewLeft: number; // при каком остатке на складе писать «Осталось N шт.»
  hitRating: number; // с какого рейтинга игра получает стикер «Хит»
  pageSize: number; // сколько игр показывать сразу и добавлять по «Показать ещё»
}

// TODO: токен SHOP_CONFIG со значением по умолчанию: 5000, 5, 4.8, 6
"""
SHOP_CONFIG = """import { InjectionToken } from '@angular/core';

// Настройки магазина: числа, которые раньше были константами в разных файлах
export interface ShopConfig {
  freeDeliveryFrom: number; // с какой суммы заказа доставка бесплатная, ₽
  fewLeft: number; // при каком остатке на складе писать «Осталось N шт.»
  hitRating: number; // с какого рейтинга игра получает стикер «Хит»
  pageSize: number; // сколько игр показывать сразу и добавлять по «Показать ещё»
}

// Токен — ключ, по которому настройки выдаёт DI. factory — значение, если в провайдерах токена нет
export const SHOP_CONFIG = new InjectionToken<ShopConfig>('SHOP_CONFIG', {
  factory: () => ({ freeDeliveryFrom: 5000, fewLeft: 5, hitRating: 4.8, pageSize: 6 }),
});
"""

PRICE_PIPE_07 = BASE['shared/price-pipe.ts']

def price_pipe(step, start=False):
    if step < 5:
        return PRICE_PIPE_07
    if step == 5 and start:
        return rep(PRICE_PIPE_07, "  transform(value: number): string {\n",
                   "  // TODO: валюта — из DEFAULT_CURRENCY_CODE, символ — getCurrencySymbol\n  transform(value: number): string {\n")
    return """import { DEFAULT_CURRENCY_CODE, LOCALE_ID, Pipe, PipeTransform, inject } from '@angular/core';
import { formatCurrency, getCurrencySymbol } from '@angular/common';

// Цена без копеек в валюте магазина: 1990 → «1 990 ₽»
@Pipe({ name: 'price' })
export class PricePipe implements PipeTransform {
  // Локаль и валюта приложения — те же, по которым работают встроенные пайпы
  private readonly locale = inject(LOCALE_ID);
  private readonly currency = inject(DEFAULT_CURRENCY_CODE);

  transform(value: number): string {
    const symbol = getCurrencySymbol(this.currency, 'narrow', this.locale);
    return formatCurrency(value, this.locale, symbol, this.currency, '1.0-0');
  }
}
"""

# ---------- вкладки: Tab находит Tabs через DI ----------

TABS_TS_07 = BASE['shared/tabs/tabs.ts']
TAB_TS_07 = BASE['shared/tabs/tab.ts']

def tabs_ts(step):
    if step < 6:
        return TABS_TS_07
    ts = rep(TABS_TS_07, "import { Component, ElementRef, afterRenderEffect, contentChildren, effect, signal, viewChildren } from '@angular/core';\n",
             "import { Component, ElementRef, afterRenderEffect, computed, contentChildren, signal, viewChildren } from '@angular/core';\n")
    ts = rep(ts, "import { Tab } from './tab';\n", "import { TABS, Tab, TabsParent } from './tab';\n")
    ts = rep(ts, """  styleUrl: './tabs.css',
})
export class Tabs {
""", """  styleUrl: './tabs.css',
  // Кто внутри <app-tabs> попросит TABS, получит этот же экземпляр Tabs
  providers: [{ provide: TABS, useExisting: Tabs }],
})
export class Tabs implements TabsParent {
""")
    ts = rep(ts, """  // Номер выбранной вкладки
  protected readonly selected = signal(0);
""", """  // Номер выбранной вкладки
  protected readonly selected = signal(0);
  // Выбранная вкладка. Каждая Tab сама сравнивает её с собой
  readonly selectedTab = computed(() => this.tabs()[this.selected()]);
""")
    ts = rep(ts, """    // Выбранную вкладку показать, остальные спрятать
    effect(() => {
      const selected = this.selected();
      this.tabs().forEach((tab, index) => tab.active.set(index === selected));
    });

""", "")
    return ts

def tab_ts(step):
    if step < 6:
        return TAB_TS_07
    return """import { Component, InjectionToken, Signal, computed, inject, input } from '@angular/core';

// Что вкладке нужно от компонента Tabs, внутри которого она стоит
export interface TabsParent {
  readonly selectedTab: Signal<Tab | undefined>;
}

// Ключ, по которому вкладка находит свой Tabs. Импортировать класс Tabs сюда нельзя:
// tabs.ts уже импортирует tab.ts, и файлы импортировали бы друг друга
export const TABS = new InjectionToken<TabsParent>('TABS');

// Одна вкладка: название для кнопки и содержимое, которое передал родитель
@Component({
  selector: 'app-tab',
  templateUrl: './tab.html',
  host: {
    role: 'tabpanel',
    '[hidden]': '!active()',
  },
})
export class Tab {
  readonly label = input.required<string>();

  // Tabs, внутри которого стоит вкладка: DI ищет TABS вверх по элементам
  private readonly tabs = inject(TABS);
  // Видна ли вкладка: выбрана ли в Tabs именно она
  protected readonly active = computed(() => this.tabs.selectedTab() === this);
}
"""

# ---------- ленивая аналитика ----------

ANALYTICS = """import { Service } from '@angular/core';

// Только для урока: строка появится в консоли, когда браузер загрузит и выполнит этот модуль
console.log('Аналитика: модуль загружен');

// Аналитика магазина. Настоящая отправляла бы события на сервер, учебная пишет их в консоль
@Service()
export class Analytics {
  constructor() {
    console.log('Аналитика: экземпляр создан');
  }

  track(event: string, details: string) {
    console.log(`Аналитика: ${event} — ${details}`);
  }
}
"""

# ---------- избранное (практикум) ----------

FAV_START = """import { Service } from '@angular/core';
import { Game } from './models';

// Избранное: игры, которые покупатель отметил сердечком
// TODO: сервис FavoritesStore — count, has(game), toggle(game)
"""
FAV = """import { Service, computed, signal } from '@angular/core';
import { Game } from './models';

// Избранное: игры, которые покупатель отметил сердечком
@Service()
export class FavoritesStore {
  // id игр в избранном. Массив не меняем, а заменяем новым
  private readonly ids = signal<number[]>([]);

  readonly count = computed(() => this.ids().length);

  has(game: Game): boolean {
    return this.ids().includes(game.id);
  }

  toggle(game: Game) {
    this.ids.update((ids) => (ids.includes(game.id) ? ids.filter((id) => id !== game.id) : [...ids, game.id]));
  }
}
"""

# ---------- журнал поиска зависимостей (шаг «под капотом») ----------

DI_LOG = """// Alt + щелчок по элементу превью: в консоли — путь, по которому Angular ищет зависимости ближайшего компонента,
// и где компонент нашёл каждую свою зависимость. Щелчок с Alt только пишет журнал: кнопка под курсором не сработает.
// Пользуется отладочными функциями Angular (ɵ) из глобального ng — они есть только в режиме разработки. Только для изучения.

// Эти токены есть у инжектора любого элемента — в журнале их не показываем
const EVERY_ELEMENT = ['Injector', 'DestroyRef', 'ElementRef', 'Renderer2', 'ViewContainerRef', 'ChangeDetectorRef'];

export function logInjectorsOnAltClick() {
  const ng = (window as any).ng;

  const tokenName = (token: any): string => token?.name ?? String(token);
  const describe = (injector: any): string => {
    const meta = ng.ɵgetInjectorMetadata(injector);
    if (meta?.type === 'element') {
      const el: Element = meta.source;
      const directives = [ng.getComponent(el), ...ng.getDirectives(el)].filter(Boolean).map((d) => d.constructor.name);
      const provided = ng
        .ɵgetInjectorProviders(injector)
        .map((p: any) => tokenName(p.token))
        .filter((name: string) => !EVERY_ELEMENT.includes(name));
      return (
        `<${el.tagName.toLowerCase()}> — ${directives.join(', ')}` +
        (provided.length > 0 ? `; провайдеры: ${provided.join(', ')}` : '')
      );
    }
    if (meta?.type === 'environment') {
      const scope = injector.scopes?.has('root') ? 'root' : injector.scopes?.has('platform') ? 'platform' : '';
      const count = ng.ɵgetInjectorProviders(injector).length;
      return `инжектор окружения ${scope} — провайдеров в списке: ${count}`;
    }
    return 'NullInjector — дальше искать негде: ошибка NG0201';
  };

  window.addEventListener(
    'click',
    (event) => {
      if (!event.altKey) return;
      event.preventDefault();
      event.stopPropagation();
      // Ближайший к месту щелчка хост компонента
      let el = event.target as Element | null;
      while (el && !ng.getComponent(el)) el = el.parentElement;
      if (!el) return;
      const component = ng.getComponent(el);
      const injector = ng.getInjector(el);

      console.log(`Путь поиска для ${component.constructor.name}:`);
      ng.ɵgetInjectorResolutionPath(injector).forEach((step: any, index: number) =>
        console.log(`  ${index + 1}. ${describe(step)}`),
      );
      const deps = ng.ɵgetDependenciesFromInjectable(injector, component.constructor)?.dependencies ?? [];
      console.log(
        deps.length > 0
          ? `${component.constructor.name} получил: ` +
              deps.map((d: any) => `${tokenName(d.token)} ← ${describe(d.providedIn).split(' — ')[0]}`).join('; ')
          : `${component.constructor.name} ничего не внедряет`,
      );
    },
    // Фаза перехвата: журнал срабатывает раньше обработчиков Angular и останавливает событие
    true,
  );
}
"""

MAIN_DI = """import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app';
import { appConfig } from './app.config';
import { logInjectorsOnAltClick } from './di-log';

bootstrapApplication(App, appConfig)
  .then(() => logInjectorsOnAltClick())
  .catch((err) => console.error(err));
"""

# ---------- шаги ----------

def solution(step):
    """Полный код решения шага (шаг 0 — старт главы без заготовок)."""
    out = dict(BASE)
    out['app.css'] = APP_CSS
    out['shared/game-card/game-card.css'] = CARD_CSS
    out['layout/header/header.css'] = HEADER_CSS
    out['layout/header/header.ts'] = header_ts(step)
    out['layout/header/header.html'] = header_html(step)
    out['app.ts'] = app_ts(step)
    out['app.html'] = app_html(step)
    if step >= 1:
        out['core/cart-store.ts'] = cart_store(step)
    out['shared/game-card/game-card.ts'] = card_ts(step)
    out['shared/game-card/game-card.html'] = card_html(step)
    out['shared/game-details/game-details.ts'] = details_ts(step)
    out['shared/game-details/game-details.html'] = details_html(step)
    if step >= 3:
        out['shared/now.ts'] = NOW
    out['shared/countdown/countdown.ts'] = countdown_ts(step)
    out['app.config.ts'] = config(step)
    if step >= 4:
        out['core/demo-cart-store.ts'] = DEMO
    if step >= 5:
        out['core/shop-config.ts'] = SHOP_CONFIG
    out['shared/price-pipe.ts'] = price_pipe(step)
    out['shared/tabs/tabs.ts'] = tabs_ts(step)
    out['shared/tabs/tab.ts'] = tab_ts(step)
    if step >= 7:
        out['core/analytics.ts'] = ANALYTICS
    if step >= 8:
        out['core/favorites-store.ts'] = FAV
    return out

S81_START = {**solution(0),
             'core/cart-store.ts': cart_store(1, start=True),
             'layout/header/header.ts': header_ts(1, start=True),
             'app.ts': app_ts(1, start=True)}
S83_START = {**solution(2),
             'shared/now.ts': NOW_START,
             'shared/countdown/countdown.ts': countdown_ts(3, start=True)}
S84_START = {**solution(3),
             'core/demo-cart-store.ts': DEMO_START,
             'app.config.ts': config(4, start=True)}
S85_START = {**solution(4),
             'core/shop-config.ts': SHOP_CONFIG_START,
             'core/cart-store.ts': cart_store(5, start=True),
             'app.ts': app_ts(5, start=True),
             'shared/game-card/game-card.ts': card_ts(5, start=True),
             'shared/price-pipe.ts': price_pipe(5, start=True),
             'app.config.ts': config(5, start=True)}
S87_START = {**solution(6),
             'core/analytics.ts': ANALYTICS,
             'core/cart-store.ts': cart_store(7, start=True)}
S88_START = {**solution(7),
             'core/favorites-store.ts': FAV_START,
             'layout/header/header.html': header_html(8, start=True),
             'shared/game-card/game-card.html': card_html(8, start=True)}

steps = {
    '01-why-di': {'start': S81_START, 'solution': solution(1)},
    '02-first-service': {'start': solution(1), 'solution': solution(2)},
    '03-injection-context': {'start': S83_START, 'solution': solution(3)},
    '04-providers': {'start': S84_START, 'solution': solution(4)},
    '05-tokens': {'start': S85_START, 'solution': solution(5)},
    '06-hierarchy': {'start': solution(5), 'solution': solution(6)},
    '07-lazy-services': {'start': S87_START, 'solution': solution(7)},
    '08-practice': {'start': S88_START, 'solution': solution(8)},
    '09-di-inside': {'start': {**solution(8), 'di-log.ts': DI_LOG, 'main.ts': MAIN_DI}},
}

if __name__ == '__main__':
    # Запись на диск: start/, совпадающий с результатом предыдущего шага, не записывается (см. steps.py)
    write_steps(ROOT, steps, base='07-directives-pipes/07-practice')
    print('ok')
