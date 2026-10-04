# Генератор кода шагов главы 3: общие куски — константы, шаги — их комбинации.
# Запуск: python3 tools/authoring/ch03-gen.py — ПЕРЕЗАПИСЫВАЕТ start/ и solution/ всех шагов главы 3.
# Старт главы — решение практикума главы 2 (08-practice) + стили главы в app.css.
# После запуска: npm run validate, проверка Prettier (см. docs/authoring-process.md).
# В конце прогоняет Prettier по коду шагов.
# Тексты уроков (lesson.md) пишутся отдельно, руками; генератор их не трогает.
import os, shutil

PROJECT = '/Users/mr/Desktop/Experimental/angular-learn'
ROOT = f'{PROJECT}/content/03-signals'
CH02 = f'{PROJECT}/content/02-templates/08-practice/solution'

def read(path):
    with open(path) as f:
        return f.read()

MAIN = read(f'{CH02}/main.ts')
CONFIG = read(f'{CH02}/app.config.ts')
STYLES_CSS = read(f'{CH02}/styles.css')
GAMES_DATA = read(f'{CH02}/core/games-data.ts')
MODELS_02 = read(f'{CH02}/core/models.ts')

MODELS_04 = MODELS_02 + """
// Позиция корзины: какая игра и сколько штук
export interface CartItem {
  game: Game;
  quantity: number;
}
"""

# ---------- app.css: стили всей главы появляются в первом шаге ----------

CSS_02 = read(f'{CH02}/app.css')
HEADER_OLD = """.header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
"""
HEADER_NEW = """.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
"""
assert HEADER_OLD in CSS_02
APP_CSS = CSS_02.replace(HEADER_OLD, HEADER_NEW).replace(""".logo {
  font-size: 20px;
  font-weight: 700;
}
""", """.logo {
  font-size: 20px;
  font-weight: 700;
}

.cart {
  font-size: 14px;
  white-space: nowrap;
}
""") + """
/* Переключатель игр и выбор количества */
.pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.icon-button {
  width: 32px;
  height: 32px;
  border: 1px solid #d2d2d7;
  border-radius: 8px;
  background: #fff;
  font: inherit;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}

.icon-button:disabled {
  color: #bbb;
  cursor: default;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.quantity {
  display: flex;
  align-items: center;
  gap: 8px;
}

.in-cart {
  margin: 0;
  font-size: 13px;
}

.link-button {
  padding: 0;
  border: 0;
  background: none;
  color: var(--brand);
  font: inherit;
  text-decoration: underline;
  cursor: pointer;
}

/* Мини-корзина */
.mini-cart {
  margin-top: 12px;
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
"""
assert '.cart {' in APP_CSS

# ---------- app.ts ----------

def app_ts(imports, body, consts=''):
    return f"""{imports}import {{ GAMES }} from './core/games-data';
{consts}
@Component({{
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
}})
export class App {{
{body}}}
"""

IMP_C = "import { Component } from '@angular/core';\n"
IMP_S = "import { Component, signal } from '@angular/core';\n"
IMP_SC = "import { Component, computed, signal } from '@angular/core';\n"
IMP_SCE = "import { Component, computed, effect, signal } from '@angular/core';\n"
IMP_SCEU = "import { Component, computed, effect, signal, untracked } from '@angular/core';\n"
IMP_ALL = "import { Component, computed, effect, linkedSignal, signal, untracked } from '@angular/core';\n"
IMP_MODEL = "import { CartItem } from './core/models';\n"

DELAY = """
// Через сколько миллисекунд «сервер» подтверждает добавление в корзину
const SERVER_DELAY = 500;
"""
FREE = """
// С какой суммы заказа доставка бесплатная, ₽
const FREE_DELIVERY_FROM = 5000;
"""

GAME_PLAIN = """  // Игра для карточки. Попробуйте GAMES[6]: её нет в наличии, и у неё нет старой цены
  protected readonly game = GAMES[0];
"""
SEARCH = """
  protected search(query: string) {
    console.log('Ищем:', query);
  }
"""

APP_01_START = app_ts(IMP_C, GAME_PLAIN + """
  // TODO: добавьте поле cartCount и увеличивайте его в addToCart
  protected addToCart() {
    console.log('Добавлено в корзину:', this.game.title);
  }
""" + SEARCH)

APP_01 = app_ts(IMP_C, GAME_PLAIN + """  protected cartCount = 0;

  protected addToCart() {
    // Как будто ждём ответа сервера: счётчик меняется не сразу
    setTimeout(() => {
      this.cartCount++;
      console.log('В корзине:', this.cartCount);
    }, SERVER_DELAY);
  }
""" + SEARCH, DELAY)

APP_02 = app_ts(IMP_S, GAME_PLAIN + """  protected readonly cartCount = signal(0);

  protected addToCart() {
    this.cartCount.update((count) => count + 1);
  }
""" + SEARCH)

# Шаг 3: игра выбирается переключателем, производные значения — computed
GAME_COMPUTED = """  // Номер игры в каталоге — единственное, что меняет переключатель
  protected readonly gameIndex = signal(0);
  protected readonly gamesCount = GAMES.length;

  // Всё остальное о карточке вычисляется из gameIndex
  protected readonly game = computed(() => GAMES[this.gameIndex()]);
  protected readonly soldOut = computed(() => this.game().inStock === 0);
  protected readonly discount = computed(() => {
    const { price, oldPrice } = this.game();
    return oldPrice ? Math.round((1 - price / oldPrice) * 100) : 0;
  });
"""
PAGER = """
  protected showPrevious() {
    this.gameIndex.update((index) => (index - 1 + GAMES.length) % GAMES.length);
  }

  protected showNext() {
    this.gameIndex.update((index) => (index + 1) % GAMES.length);
  }
"""

APP_03 = app_ts(IMP_SC, GAME_COMPUTED + """
  protected readonly cartCount = signal(0);
""" + PAGER + """
  protected addToCart() {
    this.cartCount.update((count) => count + 1);
  }
""" + SEARCH)

# Шаг 4: корзина — массив позиций; количество, сумма и список вычисляются
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
"""

def add_to_cart(qty_expr, extra=''):
    qty_field = 'quantity' if qty_expr == 'quantity' else f'quantity: {qty_expr}'
    return f"""
  protected addToCart() {{
    const game = this.game();{extra}
    this.cart.update((items) => {{
      const existing = items.find((item) => item.game.id === game.id);
      if (!existing) {{
        return [...items, {{ game, {qty_field} }}];
      }}
      return items.map((item) => (item === existing ? {{ ...item, quantity: item.quantity + {qty_expr} }} : item));
    }});
  }}
"""

ADD_1 = add_to_cart('1')
ADD_Q = add_to_cart('quantity', '\n    const quantity = this.quantity();')

APP_04 = app_ts(IMP_SC + IMP_MODEL, GAME_COMPUTED + CART + PAGER + ADD_1 + SEARCH)

# Шаг 5: эффект пишет в консоль каждое изменение корзины
EFFECT_05 = """
  constructor() {
    // Побочный эффект: сообщение в консоли при каждом изменении корзины
    effect(() => {
      console.log('Корзина:', this.cartSummary() || 'пусто');
    });
  }
"""
EFFECT_06 = """
  constructor() {
    // Побочный эффект: сообщение в консоли при каждом изменении корзины
    effect(() => {
      const summary = this.cartSummary() || 'пусто';
      // Открытая игра нужна для сообщения, но её смена — не повод его повторять
      const title = untracked(() => this.game().title);
      console.log(`Корзина: ${summary} (на экране — ${title})`);
    });
  }
"""

APP_05 = app_ts(IMP_SCE + IMP_MODEL, GAME_COMPUTED + CART + EFFECT_05 + PAGER + ADD_1 + SEARCH)
APP_06 = app_ts(IMP_SCEU + IMP_MODEL, GAME_COMPUTED + CART + EFFECT_06 + PAGER + ADD_1 + SEARCH)

# Шаг 7: количество для добавления сбрасывается при смене игры
QTY_07 = """
  // Сколько штук добавить. При смене игры сбрасывается: 1, а если игры нет в наличии — 0
  protected readonly quantity = linkedSignal<number>(() => (this.game().inStock > 0 ? 1 : 0));
"""
QTY_METHODS_07 = """
  protected decreaseQuantity() {
    this.quantity.update((quantity) => Math.max(quantity - 1, 1));
  }

  protected increaseQuantity() {
    this.quantity.update((quantity) => Math.min(quantity + 1, this.game().inStock));
  }
"""
APP_07 = app_ts(IMP_ALL + IMP_MODEL, GAME_COMPUTED + QTY_07 + CART + EFFECT_06 + PAGER + QTY_METHODS_07 + ADD_Q + SEARCH)

# Практикум: мини-корзина
APP_08_START = app_ts(IMP_ALL + IMP_MODEL, GAME_COMPUTED + QTY_07 + CART + """
  // TODO: сколько штук открытой игры уже в корзине (inCart) и сколько ещё можно добавить (available)
  // TODO: сколько осталось до бесплатной доставки (deliveryLeft), см. FREE_DELIVERY_FROM
""" + EFFECT_06 + PAGER + QTY_METHODS_07 + ADD_Q + """
  // TODO: removeFromCart() — убрать открытую игру из корзины; clearCart() — очистить корзину
""" + SEARCH, FREE)

GAME_08 = GAME_COMPUTED
QTY_08 = """
  // Сколько штук добавить. Сбрасывается при смене игры и после изменений корзины
  protected readonly quantity = linkedSignal<number>(() => (this.game().inStock > this.inCart() ? 1 : 0));
"""
CART_08 = CART + """
  // Сколько штук открытой игры уже в корзине и сколько ещё можно добавить
  protected readonly inCart = computed(() => this.cart().find((item) => item.game.id === this.game().id)?.quantity ?? 0);
  protected readonly available = computed(() => this.game().inStock - this.inCart());
  protected readonly deliveryLeft = computed(() => Math.max(FREE_DELIVERY_FROM - this.cartTotal(), 0));
"""
QTY_METHODS_08 = QTY_METHODS_07.replace('this.game().inStock', 'this.available()')
REMOVE = """
  protected removeFromCart() {
    const id = this.game().id;
    this.cart.update((items) => items.filter((item) => item.game.id !== id));
  }

  protected clearCart() {
    this.cart.set([]);
  }
"""
APP_08 = app_ts(IMP_ALL + IMP_MODEL, GAME_08 + QTY_08 + CART_08 + EFFECT_06 + PAGER + QTY_METHODS_08 + ADD_Q + REMOVE + SEARCH, FREE)

# ---------- app.html ----------

SEARCH_HTML = """  <input #searchBox class="search" type="search" placeholder="Найти игру" (keydown.enter)="search(searchBox.value)" />
  <p class="muted" [hidden]="!searchBox.value">Ищем: «{{ searchBox.value }}»</p>
"""

def page(cart_text, inner):
    return f"""<header class="header">
  <span class="logo">♞ Ход конём</span>
  <span class="cart">{cart_text}</span>
</header>
<main class="page">
  <h1>Магазин настольных игр</h1>
{SEARCH_HTML}
{inner}</main>
"""

# Карточка главы 2 — без изменений
CARD_PLAIN = """  @let soldOut = game.inStock === 0;
  @let discount = game.oldPrice ? ((1 - game.price / game.oldPrice) * 100).toFixed(0) : 0;

  <article class="card" [class.sold-out]="soldOut">
    <img class="cover" [src]="game.cover" [alt]="game.title" />
    <div class="body">
      <h2 class="title">{{ game.title }}</h2>
      <span class="rating" role="img" [attr.aria-label]="'Рейтинг: ' + game.rating + ' из 5'">
        <span class="stars" [style.width.%]="(game.rating / 5) * 100"></span>
      </span>
      <p class="meta muted">
        Игроков: {{ game.players.min }}–{{ game.players.max }} · {{ game.playTime }} мин · {{ game.age }}+
      </p>
      <p class="price">
        {{ game.price }} ₽
        <span [hidden]="!game.oldPrice">
          <s class="old-price">{{ game.oldPrice }} ₽</s>
          <span class="badge">−{{ discount }} %</span>
        </span>
      </p>
      <p class="description" [innerHTML]="game.description"></p>
      <button class="button" [disabled]="soldOut" (click)="addToCart()">
        {{ soldOut ? 'Нет в наличии' : 'В корзину' }}
      </button>
    </div>
  </article>
"""

PAGER_HTML = """  <div class="pager">
    <button class="icon-button" aria-label="Предыдущая игра" (click)="showPrevious()">‹</button>
    <span class="muted">{{ gameIndex() + 1 }} из {{ gamesCount }}</span>
    <button class="icon-button" aria-label="Следующая игра" (click)="showNext()">›</button>
  </div>

"""

def card_signals(actions):
    return PAGER_HTML + """  <article class="card" [class.sold-out]="soldOut()">
    <img class="cover" [src]="game().cover" [alt]="game().title" />
    <div class="body">
      <h2 class="title">{{ game().title }}</h2>
      <span class="rating" role="img" [attr.aria-label]="'Рейтинг: ' + game().rating + ' из 5'">
        <span class="stars" [style.width.%]="(game().rating / 5) * 100"></span>
      </span>
      <p class="meta muted">
        Игроков: {{ game().players.min }}–{{ game().players.max }} · {{ game().playTime }} мин · {{ game().age }}+
      </p>
      <p class="price">
        {{ game().price }} ₽
        <span [hidden]="!game().oldPrice">
          <s class="old-price">{{ game().oldPrice }} ₽</s>
          <span class="badge">−{{ discount() }} %</span>
        </span>
      </p>
      <p class="description" [innerHTML]="game().description"></p>
""" + actions + """    </div>
  </article>
"""

BUTTON = """      <button class="button" [disabled]="soldOut()" (click)="addToCart()">
        {{ soldOut() ? 'Нет в наличии' : 'В корзину' }}
      </button>
"""

def actions(minus_disabled, plus_disabled, add_disabled):
    return f"""      <div class="actions">
        <div class="quantity">
          <button class="icon-button" aria-label="Меньше" [disabled]="{minus_disabled}" (click)="decreaseQuantity()">−</button>
          <span>{{{{ quantity() }}}}</span>
          <button class="icon-button" aria-label="Больше" [disabled]="{plus_disabled}" (click)="increaseQuantity()">+</button>
        </div>
        <button class="button" [disabled]="{add_disabled}" (click)="addToCart()">
          {{{{ soldOut() ? 'Нет в наличии' : 'В корзину' }}}}
        </button>
      </div>
"""

ACTIONS_07 = actions('quantity() <= 1', 'quantity() >= game().inStock', 'soldOut()')
ACTIONS_08 = actions('quantity() <= 1', 'quantity() >= available()', 'available() === 0') + """      <p class="in-cart muted" [hidden]="inCart() === 0">
        Уже в корзине: {{ inCart() }} шт.
        <button class="link-button" (click)="removeFromCart()">Убрать</button>
      </p>
"""

MINI_CART_04 = """
  <section class="mini-cart" [hidden]="cart().length === 0">
    <h2>Корзина</h2>
    <p>{{ cartSummary() }}</p>
  </section>
"""
MINI_CART_08_START = """
  <section class="mini-cart" [hidden]="cart().length === 0">
    <h2>Корзина</h2>
    <p>{{ cartSummary() }}</p>
    <!-- TODO: итог, сколько осталось до бесплатной доставки (или «Доставка бесплатная»), кнопка «Очистить» -->
  </section>
"""
MINI_CART_08 = """
  <section class="mini-cart" [hidden]="cart().length === 0">
    <h2>Корзина</h2>
    <p>{{ cartSummary() }}</p>
    <p><b>Итого: {{ cartTotal() }} ₽</b></p>
    <p class="muted" [hidden]="deliveryLeft() === 0">До бесплатной доставки: {{ deliveryLeft() }} ₽</p>
    <p class="muted" [hidden]="deliveryLeft() > 0">Доставка бесплатная</p>
    <button class="link-button" (click)="clearCart()">Очистить корзину</button>
  </section>
"""

CART_TEXT_04 = 'В корзине: {{ cartCount() }} · {{ cartTotal() }} ₽'

HTML_01_START = page('В корзине: 0', CARD_PLAIN)
HTML_01 = page('В корзине: {{ cartCount }}', CARD_PLAIN)
HTML_02 = page('В корзине: {{ cartCount() }}', CARD_PLAIN)
HTML_03 = page('В корзине: {{ cartCount() }}', card_signals(BUTTON))
HTML_04 = page(CART_TEXT_04, card_signals(BUTTON) + MINI_CART_04)
HTML_07 = page(CART_TEXT_04, card_signals(ACTIONS_07) + MINI_CART_04)
HTML_08_START = page(CART_TEXT_04, card_signals(
    ACTIONS_07 + '      <!-- TODO: «Уже в корзине: N шт.» и кнопка «Убрать», если открытая игра есть в корзине -->\n'
) + MINI_CART_08_START)
HTML_08 = page(CART_TEXT_04, card_signals(ACTIONS_08) + MINI_CART_08)

# ---------- signal-graph.ts (шаг «Под капотом») ----------

SIGNAL_GRAPH = '''// Печатает граф сигналов компонента: что читает каждый сигнал и кто читает его.
// Опирается на внутреннее устройство Angular (узлы за символом SIGNAL) — только для изучения, не для приложения.

// Узел графа: у сигнала-функции он лежит в свойстве с символом SIGNAL
function nodeOf(value: unknown): any {
  if (typeof value !== 'function') return null;
  const symbol = Object.getOwnPropertySymbols(value).find((s) => s.description === 'SIGNAL');
  return symbol ? (value as any)[symbol] : null;
}

// Связи узла хранятся списками: producers → nextProducer, consumers → nextConsumer
function linked(first: any, end: 'producer' | 'consumer'): Set<any> {
  const nodes = new Set();
  for (let link = first; link; link = end === 'producer' ? link.nextProducer : link.nextConsumer) {
    nodes.add(link[end]);
  }
  return nodes;
}

export function printSignalGraph(component: object) {
  // Имена узлов — имена полей компонента; у шаблона и эффектов полей нет
  const names = new Map<any, string>();
  for (const [name, value] of Object.entries(component)) {
    const node = nodeOf(value);
    if (node) names.set(node, name);
  }
  const nameOf = (node: any) => names.get(node) ?? (node.kind === 'template' ? 'шаблон' : 'эффект');
  const list = (nodes: Set<any>) => [...nodes].map(nameOf).join(', ') || '—';

  for (const [node, name] of names) {
    const reads = list(linked(node.producers, 'producer'));
    const readBy = list(linked(node.consumers, 'consumer'));
    console.log(`${name} (${node.kind}): читает ${reads}; его читают ${readBy}`);
  }
}
'''

# ---------- шаги ----------

def base(app, html, models=MODELS_02):
    return {
        'main.ts': MAIN, 'app.ts': app, 'app.html': html, 'app.css': APP_CSS,
        'core/models.ts': models, 'core/games-data.ts': GAMES_DATA,
        'app.config.ts': CONFIG, 'styles.css': STYLES_CSS,
    }

S01 = base(APP_01, HTML_01)
S02 = base(APP_02, HTML_02)
S03 = base(APP_03, HTML_03)
S04 = base(APP_04, HTML_04, MODELS_04)
S05 = base(APP_05, HTML_04, MODELS_04)
S06 = base(APP_06, HTML_04, MODELS_04)
S07 = base(APP_07, HTML_07, MODELS_04)
S08 = base(APP_08, HTML_08, MODELS_04)

steps = {
    '01-problem': {'start': base(APP_01_START, HTML_01_START), 'solution': S01},
    '02-signal': {'start': S01, 'solution': S02},
    '03-computed': {'start': S02, 'solution': S03},
    '04-immutability': {'start': S03, 'solution': S04},
    '05-effect': {'start': S04, 'solution': S05},
    '06-untracked': {'start': S05, 'solution': S06},
    '07-linked-signal': {'start': S06, 'solution': S07},
    '08-practice': {'start': base(APP_08_START, HTML_08_START, MODELS_04), 'solution': S08},
    '09-signal-graph': {'start': {**S08, 'signal-graph.ts': SIGNAL_GRAPH}},
}

for step, spec in steps.items():
    stepdir = os.path.join(ROOT, step)
    os.makedirs(stepdir, exist_ok=True)
    for kind in ('start', 'solution'):
        path = os.path.join(stepdir, kind)
        if os.path.isdir(path):
            shutil.rmtree(path)
        if kind not in spec:
            continue
        for name, code in spec[kind].items():
            full = os.path.join(path, name)
            os.makedirs(os.path.dirname(full), exist_ok=True)
            with open(full, 'w') as f:
                f.write(code)
# Код шагов — в том виде, какой даёт форматирование в редакторе платформы
import subprocess
opts = ['--print-width', '120', '--single-quote', '--trailing-comma', 'all', '--log-level', 'warn', '--write']
subprocess.run(['npx', 'prettier', *opts, f'{ROOT}/**/*.ts'], cwd=PROJECT, check=True)
subprocess.run(['npx', 'prettier', *opts, '--parser', 'angular', f'{ROOT}/**/*.html'], cwd=PROJECT, check=True)
print('ok')
