# Генератор кода шагов главы 9: общие куски — константы, шаги — их комбинации.
# Запуск: python3 tools/authoring/ch09-gen.py — ПЕРЕЗАПИСЫВАЕТ start/ и solution/ всех шагов главы 9.
# Старт главы — решение практикума главы 8 (08-practice) без демо-корзины DemoCartStore, с мини-корзиной, вынесенной
# в компонент MiniCart (cart/mini-cart/), и стилями главы (итоги и промокод — в mini-cart.css, .link-button — в styles.css).
# Код форматирует write_steps (как кнопка «Формат» в редакторе). После запуска: npm run validate.
# Тексты уроков (lesson.md) пишутся отдельно, руками; генератор их не трогает.
import os, sys

PROJECT = '/Users/mr/Desktop/Experimental/angular-learn'
ROOT = f'{PROJECT}/content/09-app-state'
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from steps import read_dir, step_dir, write_steps

CH08 = step_dir(f'{PROJECT}/content/08-services-di/08-practice/solution')
BASE = read_dir(CH08)


def rep(text, old, new):
    assert old in text, old
    return text.replace(old, new, 1)


def cut(text, start, end):
    """Вырезать кусок от строки start (включительно) до строки end (не включая)."""
    i = text.index(start)
    j = text.index(end, i)
    return text[:i] + text[j:]


# ---------- старт главы: без демо-корзины, мини-корзина — компонент ----------

CONFIG = rep(BASE['app.config.ts'], "import { DemoCartStore } from './core/demo-cart-store';\n", '')
CONFIG = rep(CONFIG, "import { CartStore } from './core/cart-store';\n", '')
CONFIG = rep(CONFIG, """    // Кто попросит CartStore, получит DemoCartStore — корзину с играми для показа магазина
    {
      provide: CartStore,
      useClass: DemoCartStore,
    },
""" if "    {\n      provide: CartStore," in CONFIG else """    // Кто попросит CartStore, получит DemoCartStore — корзину с играми для показа магазина
    { provide: CartStore, useClass: DemoCartStore },
""", '')

APP_TS = BASE['app.ts']
APP_TS = rep(APP_TS, "import { CartStore } from './core/cart-store';\n", "import { MiniCart } from './cart/mini-cart/mini-cart';\n")
APP_TS = rep(APP_TS, "    LoadMore,\n    PricePipe,\n    Rating,\n    Quantity,\n    Tooltip,\n",
             "    LoadMore,\n    MiniCart,\n    Rating,\n    Tooltip,\n")
APP_TS = rep(APP_TS, "import { PricePipe } from './shared/price-pipe';\n", '')
APP_TS = rep(APP_TS, "import { Quantity } from './shared/quantity/quantity';\n", '')
APP_TS = rep(APP_TS, """  // Корзина: позиции, сумма, действия. Её же показывают шапка и карточки
  protected readonly cart = inject(CartStore);

""", '')

APP_HTML = BASE['app.html']
_i = APP_HTML.index('  @if (cart.items().length > 0) {')
_j = APP_HTML.index('    </section>\n  }\n', _i) + len('    </section>\n  }\n')
MINI_CART_BLOCK = APP_HTML[_i:_j]
APP_HTML = APP_HTML[:_i] + '  <app-mini-cart />\n' + APP_HTML[_j:]

APP_CSS = cut(BASE['app.css'], '.icon-button {', '/* Фильтры каталога */')

STYLES = BASE['styles.css'] + """
/* Кнопка-ссылка: «Сбросить фильтры», «Очистить корзину» */
.link-button {
  padding: 0;
  border: 0;
  background: none;
  color: var(--brand);
  font: inherit;
  text-decoration: underline;
  cursor: pointer;
}
"""

# Разметка мини-корзины из app.html главы 8 — без отступа в два пробела
MINI_HTML_0 = '\n'.join(l[2:] if l.startswith('  ') else l for l in MINI_CART_BLOCK.split('\n'))

MINI_TS_0 = """import { Component, inject } from '@angular/core';
import { CartStore } from '../../core/cart-store';
import { PricePipe } from '../../shared/price-pipe';
import { Quantity } from '../../shared/quantity/quantity';

// Мини-корзина над каталогом: позиции, итог, доставка
@Component({
  selector: 'app-mini-cart',
  imports: [PricePipe, Quantity],
  templateUrl: './mini-cart.html',
  styleUrl: './mini-cart.css',
})
export class MiniCart {
  protected readonly cart = inject(CartStore);
}
"""

MINI_CSS = """/* Мини-корзина над каталогом */
:host {
  display: block;
}

.mini-cart {
  margin-bottom: 12px;
  padding: 12px;
  border: 1px solid #d2d2d7;
  border-radius: var(--radius);
  font-size: 14px;
}

.mini-cart h2 {
  margin: 0 0 8px;
  font-size: 16px;
}

.mini-cart p {
  margin: 0 0 6px;
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

.icon-button {
  width: 26px;
  height: 26px;
  border: 1px solid #d2d2d7;
  border-radius: 8px;
  background: #fff;
  font: inherit;
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
}

/* Итоги: название слева, сумма справа */
.summary {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 4px 12px;
  margin: 8px 6px;
}

.summary dt,
.summary dd {
  margin: 0;
}

.summary dd {
  text-align: right;
  white-space: nowrap;
}

.summary .total {
  font-weight: 700;
}

.summary .icon-button {
  width: 20px;
  height: 20px;
  margin-left: 4px;
  font-size: 13px;
}

/* Промокод */
.promo {
  display: flex;
  gap: 8px;
  margin: 8px 0;
}

.promo-input {
  flex: 1;
  min-width: 0;
  padding: 4px 8px;
  border: 1px solid #d2d2d7;
  border-radius: 8px;
  font: inherit;
}

.mini-cart .promo-error {
  color: var(--brand);
}
"""

# ---------- модели ----------

MODELS_0 = BASE['core/models.ts']
MODELS_1 = rep(MODELS_0, """// Позиция корзины: какая игра и сколько штук
export interface CartItem {
  game: Game;
  quantity: number;
}""", """// Позиция корзины: какая игра и сколько штук. Позицию не меняют, а заменяют новой
export interface CartItem {
  readonly game: Game;
  readonly quantity: number;
}""")

# ---------- настройки магазина ----------

SHOP_CONFIG_0 = BASE['core/shop-config.ts']
SHOP_CONFIG_3 = rep(SHOP_CONFIG_0, "  freeDeliveryFrom: number; // с какой суммы заказа доставка бесплатная, ₽\n",
                    "  freeDeliveryFrom: number; // с какой суммы заказа доставка бесплатная, ₽\n"
                    "  deliveryPrice: number; // сколько стоит доставка до этой суммы, ₽\n")
SHOP_CONFIG_3 = rep(SHOP_CONFIG_3, "      freeDeliveryFrom: 5000,\n", "      freeDeliveryFrom: 5000,\n      deliveryPrice: 390,\n")

# ---------- промокоды (готовый файл шага 4) ----------

PROMO_CODES = """// Промокоды магазина. В главе 13 их будет проверять сервер (GET /api/promo/:code), пока список — в коде
export type Promo =
  | { code: string; percent: number } // скидка в процентах от суммы товаров
  | { code: string; amount: number; minTotal: number }; // скидка в рублях при сумме товаров от minTotal

export const PROMO_CODES: readonly Promo[] = [
  { code: 'KNIGHT10', percent: 10 },
  { code: 'CHESS500', amount: 500, minTotal: 3000 },
];

// Чем закончилась попытка применить промокод: применён, нет такого, мала сумма товаров
export type PromoResult = 'applied' | 'unknown' | 'min-total';

// Промокод по тексту, который ввёл покупатель: регистр и пробелы по краям не важны
export function findPromo(text: string): Promo | undefined {
  const code = text.trim().toUpperCase();
  return PROMO_CODES.find((promo) => promo.code === code);
}
"""

# ---------- корзина ----------

def cart_store(step, start=False):
    """CartStore: 0 — как в главе 8; 1 — закрытое состояние; 2 — localStorage; 3 — итоги; 4 — промокод; 5 — склад."""
    closed = step >= 1 and not (step == 1 and start)
    saved = step >= 2
    derived = step >= 3
    promo = step >= 4 and not (step == 4 and start)
    stock = step >= 5 and not (step == 5 and start)

    imports = ['Service', 'computed', 'effect', 'inject', 'injectAsync'] + (['linkedSignal'] if promo else []) + \
        ['onIdle', 'signal']
    out = 'import { ' + ', '.join(imports) + " } from '@angular/core';\n"
    if saved:
        out += "import { GAMES } from './games-data';\n"
    out += "import { CartItem, Game } from './models';\n"
    if promo:
        out += "import { Promo, PromoResult, findPromo } from './promo-codes';\n"
    out += "import { SHOP_CONFIG } from './shop-config';\n\n"
    if saved:
        out += """// Ключ корзины в localStorage. Версия в имени: поменяется формат — поменяем ключ, и старые данные не помешают
const STORAGE_KEY = 'hod-konem:cart:v1';

// Что сохраняем о позиции: только id игры и количество. Название, цену и остаток берём из каталога
interface SavedItem {
  id: number;
  quantity: number;
}

"""
    out += """// Корзина магазина: позиции, количество, сумма и действия с ними.
// @Service() — Angular сам создаст единственный экземпляр, когда он впервые кому-то понадобится
@Service()
export class CartStore {
  // Настройки магазина: порог бесплатной доставки
  private readonly config = inject(SHOP_CONFIG);

  // Аналитика не нужна для первой отрисовки. Её модуль загрузится, когда браузер освободится,
  // а экземпляр Angular создаст при первом вызове
  private readonly analytics = injectAsync(() => import('./analytics').then((m) => m.Analytics), {
    prefetch: onIdle,
  });

"""
    if closed:
        init = 'loadCart()' if saved else '[]'
        out += f"""  // Состояние корзины — позиции. Менять его может только сам сервис: поле закрытое
  private readonly state = signal<readonly CartItem[]>({init});

  // Снаружи — только чтение: у Signal нет set и update
  readonly items = this.state.asReadonly();
"""
    else:
        if step == 1:
            out += "  // TODO: закрыть состояние — менять позиции может только сам сервис, снаружи их можно только читать\n"
        out += """  // Позиции корзины. Массив не меняем, а заменяем новым
  readonly items = signal<CartItem[]>([]);
"""
    out += "\n  readonly count = computed(() => this.items().reduce((sum, item) => sum + item.quantity, 0));\n"
    if derived:
        out += """  // Сумма по ценам игр — её показывает шапка
  readonly subtotal = computed(() => this.items().reduce((sum, item) => sum + item.game.price * item.quantity, 0));
  // Сколько покупатель экономит на играх со скидкой: разница со старой ценой
  readonly savings = computed(() =>
    this.items().reduce((sum, item) => sum + ((item.game.oldPrice ?? item.game.price) - item.game.price) * item.quantity, 0),
  );
  // Доставка: бесплатно от порога, иначе по тарифу. У пустой корзины доставки нет
  readonly delivery = computed(() =>
    this.items().length === 0 || this.subtotal() >= this.config.freeDeliveryFrom ? 0 : this.config.deliveryPrice,
  );
"""
        if step == 4 and start:
            out += "  // TODO: промокод (promo) и скидка по нему (promoDiscount)\n"
        if promo:
            out += """
  // Применённый промокод. Сумма товаров стала меньше порога промокода — он снимается и сам не вернётся
  private readonly promoState = linkedSignal<number, Promo | null>({
    source: this.subtotal,
    computation: (subtotal, previous) => {
      const promo = previous?.value ?? null;
      return promo && 'minTotal' in promo && subtotal < promo.minTotal ? null : promo;
    },
  });
  readonly promo = this.promoState.asReadonly();

  // Скидка по промокоду, ₽
  readonly promoDiscount = computed(() => {
    const promo = this.promo();
    if (!promo) {
      return 0;
    }
    return 'percent' in promo ? Math.round((this.subtotal() * promo.percent) / 100) : promo.amount;
  });
  // К оплате: товары минус промокод плюс доставка
  readonly total = computed(() => this.subtotal() - this.promoDiscount() + this.delivery());
"""
        else:
            out += """  // К оплате: товары плюс доставка
  readonly total = computed(() => this.subtotal() + this.delivery());
"""
    else:
        out += "  readonly total = computed(() => this.items().reduce((sum, item) => sum + item.game.price * item.quantity, 0));\n"
    out += "  readonly summary = computed(() => this.items().map((item) => `${item.game.title} × ${item.quantity}`).join(', '));\n"
    sub = 'subtotal' if derived else 'total'
    out += f"  readonly deliveryLeft = computed(() => Math.max(this.config.freeDeliveryFrom - this.{sub}(), 0));\n"
    out += """
  // Сколько штук каждой игры в корзине: id игры → количество
  private readonly quantities = computed(() => new Map(this.items().map((item) => [item.game.id, item.quantity])));

  // Метод читает сигнал, поэтому шаблон или computed, которые его вызвали, тоже зависят от корзины
  quantityOf(game: Game): number {
    return this.quantities().get(game.id) ?? 0;
  }
"""
    if step == 5 and start:
        out += "\n  // TODO: available(game) — сколько ещё штук игры можно положить в корзину\n"
    if stock:
        out += """
  // Сколько ещё штук игры можно положить в корзину: остаток на складе минус то, что уже в корзине
  available(game: Game): number {
    return game.inStock - this.quantityOf(game);
  }
"""
    w = 'state' if closed else 'items'
    out += "\n"
    if step == 5 and start:
        out += "  // TODO: не класть больше, чем есть на складе\n"
    out += "  add(game: Game) {\n"
    if stock:
        out += """    // Склад пуст или всё, что есть, уже в корзине
    if (this.available(game) <= 0) {
      return;
    }
"""
    out += f"""    this.{w}.update((items) => {{
      const existing = items.find((item) => item.game.id === game.id);
      if (!existing) {{
        return [...items, {{ game, quantity: 1 }}];
      }}
      return items.map((item) => (item === existing ? {{ ...item, quantity: item.quantity + 1 }} : item));
    }});
    this.analytics().then((analytics) => analytics.track('В корзину', game.title));
  }}

"""
    if step == 5 and start:
        out += "  // TODO: количество — от 1 до остатка на складе\n"
    out += "  setQuantity(game: Game, quantity: number) {\n"
    if stock:
        out += """    // От одной штуки до остатка на складе — что бы ни пришло снаружи
    const allowed = Math.min(Math.max(quantity, 1), game.inStock);
    this.state.update((items) => items.map((item) => (item.game.id === game.id ? { ...item, quantity: allowed } : item)));
  }
"""
    else:
        out += f"    this.{w}.update((items) => items.map((item) => (item.game.id === game.id ? {{ ...item, quantity }} : item)));\n  }}\n"
    out += f"""
  remove(game: Game) {{
    this.{w}.update((items) => items.filter((item) => item.game.id !== game.id));
  }}

  clear() {{
    this.{w}.set([]);
""" + ("""    // Очистили корзину — начинаем заново: промокод тоже снимаем
    this.promoState.set(null);
""" if promo else '') + """  }
"""
    if promo:
        out += """
  // Применить промокод. Ответ — получилось ли, а если нет, то почему
  applyPromo(text: string): PromoResult {
    const promo = findPromo(text);
    if (!promo) {
      return 'unknown';
    }
    if ('minTotal' in promo && this.subtotal() < promo.minTotal) {
      return 'min-total';
    }
    this.promoState.set(promo);
    return 'applied';
  }

  removePromo() {
    this.promoState.set(null);
  }
"""
    out += """
  constructor() {
    // Побочный эффект: сообщение в консоли при каждом изменении корзины
    effect(() => {
      console.log('Корзина:', this.summary() || 'пусто');
    });
"""
    if saved:
        out += """    // Побочный эффект: при каждом изменении корзины записываем её в localStorage
    effect(() => {
      const saved: SavedItem[] = this.items().map((item) => ({ id: item.game.id, quantity: item.quantity }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    });
"""
    out += "  }\n}\n"
    if saved:
        if step == 5 and start:
            cond = "game && Number.isInteger(quantity) && quantity > 0"
            body = "      // TODO: остаток на складе мог уменьшиться — количество не больше остатка\n" \
                   f"      return {cond} ? [{{ game, quantity }}] : [];\n"
        elif stock:
            body = """      // Остаток на складе мог уменьшиться с прошлого раза
      return game && game.inStock > 0 && Number.isInteger(quantity) && quantity > 0
        ? [{ game, quantity: Math.min(quantity, game.inStock) }]
        : [];
"""
        else:
            body = "      return game && Number.isInteger(quantity) && quantity > 0 ? [{ game, quantity }] : [];\n"
        out += """
// Корзина из localStorage. Данные могли испортиться или устареть — ничего не берём на веру
function loadCart(): CartItem[] {
  try {
    const saved: SavedItem[] = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return saved.flatMap(({ id, quantity }) => {
      const game = GAMES.find((g) => g.id === id);
""" + body + """    });
  } catch {
    // Не JSON или не массив — начинаем с пустой корзины
    return [];
  }
}
"""
    return out


# ---------- избранное (практикум: сохранение) ----------

FAV_0 = BASE['core/favorites-store.ts']
FAV_START = rep(FAV_0, "// Избранное: игры, которые покупатель отметил сердечком\n",
                "// Избранное: игры, которые покупатель отметил сердечком\n"
                "// TODO: сохранять избранное в localStorage и восстанавливать при запуске\n")
FAV_5 = """import { Service, computed, effect, signal } from '@angular/core';
import { GAMES } from './games-data';
import { Game } from './models';

// Ключ избранного в localStorage
const STORAGE_KEY = 'hod-konem:favorites:v1';

// Избранное: игры, которые покупатель отметил сердечком
@Service()
export class FavoritesStore {
  // id игр в избранном. Массив не меняем, а заменяем новым
  private readonly ids = signal<number[]>(loadFavorites());

  readonly count = computed(() => this.ids().length);

  has(game: Game): boolean {
    return this.ids().includes(game.id);
  }

  toggle(game: Game) {
    this.ids.update((ids) => (ids.includes(game.id) ? ids.filter((id) => id !== game.id) : [...ids, game.id]));
  }

  constructor() {
    // Побочный эффект: при каждом изменении избранного записываем его в localStorage
    effect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(this.ids())));
  }
}

// Избранное из localStorage: только id игр, которые есть в каталоге
function loadFavorites(): number[] {
  try {
    const ids: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(ids) ? ids.filter((id) => GAMES.some((game) => game.id === id)) : [];
  } catch {
    return [];
  }
}
"""

# ---------- мини-корзина ----------

def mini_html(step, start=False):
    html = MINI_HTML_0
    if step >= 3 and not (step == 3 and start):
        summary = """<dl class="summary">
  <dt>Товары, {{ cart.count() }} шт.</dt>
  <dd>{{ cart.subtotal() | price }}</dd>
"""
        if step == 4 and start:
            summary += "  <!-- TODO: строка промокода: код, кнопка «×» и скидка -->\n"
        if step >= 4 and not (step == 4 and start):
            summary += """  @if (cart.promo(); as promo) {
    <dt>
      Промокод {{ promo.code }}
      <button class="icon-button" aria-label="Убрать промокод" (click)="cart.removePromo()">×</button>
    </dt>
    <dd>−{{ cart.promoDiscount() | price }}</dd>
  }
"""
        summary += """  <dt>Доставка</dt>
  <dd>
    @if (cart.delivery() > 0) {
      {{ cart.delivery() | price }}
    } @else {
      бесплатно
    }
  </dd>
  <dt class="total">Итого</dt>
  <dd class="total">{{ cart.total() | price }}</dd>
</dl>
"""
        if step == 4 and start:
            summary += "<!-- TODO: поле промокода, кнопка «Применить» и сообщение об ошибке -->\n"
        if step >= 4 and not (step == 4 and start):
            summary += """@if (!cart.promo()) {
  <div class="promo">
    <input
      #promoInput
      class="promo-input"
      placeholder="Промокод"
      aria-label="Промокод"
      (input)="promoError.set('')"
      (keydown.enter)="applyPromo(promoInput.value)"
    />
    <button class="link-button" (click)="applyPromo(promoInput.value)">Применить</button>
  </div>
  @if (promoError()) {
    <p class="promo-error">{{ promoError() }}</p>
  }
}
"""
        summary += """@if (cart.savings() > 0) {
  <p class="muted">Скидки по акциям: вы экономите {{ cart.savings() | price }}</p>
}
"""
        summary = ''.join('    ' + l if l else l for l in summary.splitlines(True))
        i = html.index('    <p>\n      <b>Итого')
        j = html.index('    <button class="link-button" (click)="cart.clear()">', i) if '    <button class="link-button" (click)="cart.clear()">' in html else html.index('    <button class="link-button"', i)
        delivery_left = """    @if (cart.deliveryLeft() > 0) {
      <p class="muted">До бесплатной доставки: {{ cart.deliveryLeft() | price }}</p>
    }
"""
        html = html[:i] + summary + delivery_left + html[j:]
    elif step == 3 and start:
        html = rep(html, '    <p>\n      <b>Итого', '    <!-- TODO: итоги — товары, доставка, к оплате, выгода по акциям -->\n    <p>\n      <b>Итого')
    return html


def mini_ts(step, start=False):
    if step < 4 or (step == 4 and start):
        ts = MINI_TS_0
        if step == 4:
            ts = rep(ts, "  protected readonly cart = inject(CartStore);\n",
                     "  protected readonly cart = inject(CartStore);\n\n  // TODO: сообщение об ошибке промокода и метод applyPromo(text)\n")
        return ts
    return """import { Component, inject, signal } from '@angular/core';
import { CartStore } from '../../core/cart-store';
import { PricePipe } from '../../shared/price-pipe';
import { Quantity } from '../../shared/quantity/quantity';

// Мини-корзина над каталогом: позиции, итоги, промокод
@Component({
  selector: 'app-mini-cart',
  imports: [PricePipe, Quantity],
  templateUrl: './mini-cart.html',
  styleUrl: './mini-cart.css',
})
export class MiniCart {
  protected readonly cart = inject(CartStore);

  // Состояние интерфейса: почему не применился промокод. Оно нужно только этому компоненту
  protected readonly promoError = signal('');

  protected applyPromo(text: string) {
    const result = this.cart.applyPromo(text);
    this.promoError.set(
      result === 'unknown'
        ? 'Нет такого промокода'
        : result === 'min-total'
          ? 'Сумма товаров меньше, чем нужно для этого промокода'
          : '',
    );
  }
}
"""


# ---------- шапка, карточка, окно ----------

def header_html(step):
    html = BASE['layout/header/header.html']
    if step >= 3:
        html = rep(html, 'cart.total()', 'cart.subtotal()')
    return html


CARD_TS_0 = BASE['shared/game-card/game-card.ts']
CARD_HTML_0 = BASE['shared/game-card/game-card.html']
DETAILS_HTML_0 = BASE['shared/game-details/game-details.html']


def card_ts(step, start=False):
    if step < 5 or start:
        return CARD_TS_0
    return rep(CARD_TS_0, """  // Сколько штук этой игры уже в корзине
  protected readonly inCart = computed(() =>
    this.cart.quantityOf(this.game()),
  );
""", """  // Сколько штук этой игры уже в корзине и сколько ещё можно добавить
  protected readonly inCart = computed(() =>
    this.cart.quantityOf(this.game()),
  );
  protected readonly available = computed(() =>
    this.cart.available(this.game()),
  );
""")


def card_html(step, start=False):
    html = CARD_HTML_0
    if step < 5:
        return html
    if start:
        html = rep(html, '<div class="actions">\n', '<!-- TODO: кнопка — по available, «Все N шт. в корзине» -->\n<div class="actions">\n')
        return html
    html = rep(html, '[disabled]="inCart() >= game().inStock"', '[disabled]="available() === 0"')
    html = rep(html, """} @else if (game().inStock <= fewLeft) {""", """} @else if (available() === 0) {
  <p class="stock stock-few">Все {{ game().inStock }} шт. в корзине</p>
} @else if (game().inStock <= fewLeft) {""")
    return html


def details_html(step, start=False):
    if step < 5 or start:
        return DETAILS_HTML_0
    return rep(DETAILS_HTML_0, '[disabled]="inCart() >= game().inStock"', '[disabled]="cart.available(game()) === 0"')


# ---------- шаги ----------

def solution(step):
    """Полный код решения шага (шаг 0 — старт главы без заготовок)."""
    out = dict(BASE)
    del out['core/demo-cart-store.ts']
    out['app.config.ts'] = CONFIG
    out['app.ts'] = APP_TS
    out['app.html'] = APP_HTML
    out['app.css'] = APP_CSS
    out['styles.css'] = STYLES
    out['cart/mini-cart/mini-cart.ts'] = mini_ts(step)
    out['cart/mini-cart/mini-cart.html'] = mini_html(step)
    out['cart/mini-cart/mini-cart.css'] = MINI_CSS
    out['core/cart-store.ts'] = cart_store(step)
    out['core/models.ts'] = MODELS_1 if step >= 1 else MODELS_0
    out['core/shop-config.ts'] = SHOP_CONFIG_3 if step >= 3 else SHOP_CONFIG_0
    out['layout/header/header.html'] = header_html(step)
    if step >= 4:
        out['core/promo-codes.ts'] = PROMO_CODES
    if step >= 5:
        out['core/favorites-store.ts'] = FAV_5
    out['shared/game-card/game-card.ts'] = card_ts(step)
    out['shared/game-card/game-card.html'] = card_html(step)
    out['shared/game-details/game-details.html'] = details_html(step)
    return out


S91_START = {**solution(0), 'core/cart-store.ts': cart_store(1, start=True)}
S93_START = {**solution(2), 'cart/mini-cart/mini-cart.html': mini_html(3, start=True)}
S94_START = {**solution(3),
             'core/promo-codes.ts': PROMO_CODES,
             'core/cart-store.ts': cart_store(4, start=True),
             'cart/mini-cart/mini-cart.ts': mini_ts(4, start=True),
             'cart/mini-cart/mini-cart.html': mini_html(4, start=True)}
S95_START = {**solution(4),
             'core/cart-store.ts': cart_store(5, start=True),
             'core/favorites-store.ts': FAV_START,
             'shared/game-card/game-card.html': card_html(5, start=True)}

steps = {
    '01-store': {'start': S91_START, 'solution': solution(1)},
    '02-persistence': {'start': solution(1), 'solution': solution(2)},
    '03-derived-state': {'start': S93_START, 'solution': solution(3)},
    '04-promo-code': {'start': S94_START, 'solution': solution(4)},
    '05-practice': {'start': S95_START, 'solution': solution(5)},
    '06-libraries': {'start': solution(5)},
}

if __name__ == '__main__':
    # Запись на диск: start/, совпадающий с результатом предыдущего шага, не записывается (см. steps.py)
    write_steps(ROOT, steps, base='08-services-di/08-practice')
    print('ok')
