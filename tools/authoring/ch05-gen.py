# Генератор кода шагов главы 5: общие куски — константы, шаги — их комбинации.
# Запуск: python3 tools/authoring/ch05-gen.py — ПЕРЕЗАПИСЫВАЕТ start/ и solution/ всех шагов главы 5.
# Старт главы — решение практикума главы 4 (07-practice): app.css очищен от стилей большой карточки главы 3,
# стили плитки собраны в конце (в шаге 1 они переезжают в game-card.css), добавлены стили главы.
# В конце прогоняет Prettier по коду шагов. После запуска: npm run validate.
# Тексты уроков (lesson.md) пишутся отдельно, руками; генератор их не трогает.
import os, subprocess

PROJECT = '/Users/mr/Desktop/Experimental/angular-learn'
ROOT = f'{PROJECT}/content/05-components'
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from steps import step_dir
CH04 = step_dir(f'{PROJECT}/content/04-control-flow/07-practice/solution')

def read(path):
    with open(path) as f:
        return f.read()

MAIN = read(f'{CH04}/main.ts')
CONFIG = read(f'{CH04}/app.config.ts')
STYLES_CSS = read(f'{CH04}/styles.css')
GAMES_DATA = read(f'{CH04}/core/games-data.ts')
MODELS = read(f'{CH04}/core/models.ts')
APP_04 = read(f'{CH04}/app.ts')
HTML_04 = read(f'{CH04}/app.html')

def rep(text, old, new):
    assert old in text, old
    return text.replace(old, new, 1)

# ---------- app.css: без большой карточки главы 3, со стилями главы ----------

APP_CSS = """/* Стили компонента App: действуют только внутри его шаблона */
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

.page {
  padding: 16px;
}

h1 {
  color: var(--brand);
}

.search {
  box-sizing: border-box;
  width: 100%;
  margin-bottom: 12px;
  padding: 8px 12px;
  border: 1px solid #d2d2d7;
  border-radius: 8px;
  font: inherit;
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

.icon-button:disabled {
  color: #bbb;
  cursor: default;
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

.rating-filter {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.empty {
  grid-column: 1 / -1;
  margin: 24px 0;
  text-align: center;
}

/* Стикеры на карточках каталога: их разметку пишет App, поэтому и стили здесь */
.sticker {
  padding: 2px 6px;
  border-radius: 6px;
  background: var(--text);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
}

.sticker.sale {
  background: var(--brand);
}
"""

# Стили плитки в старте шага 1 — ещё в app.css, в решении — уже нет
TILE_CSS = """
/* Плитка каталога */
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

.price {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}

.old-price {
  margin-left: 4px;
  font-size: 14px;
  font-weight: 400;
  color: var(--muted);
}

.stock,
.in-cart {
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

.tile .button {
  margin-top: auto;
}

.sold-out .tile-cover {
  filter: grayscale(1);
  opacity: 0.6;
}

.sold-out .price {
  color: var(--muted);
}
"""

# ---------- GameCard: стили ----------

CARD_CSS_TOP = """/* Плитка игры. Классы можно называть коротко: стили компонента действуют только на его шаблон */
"""
CARD_TILE = """.tile {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  box-sizing: border-box;
  height: 100%;
  padding: 8px;
  border-radius: var(--radius);
  background: var(--surface);
}
"""
CARD_HOST = """:host {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 8px;
  border-radius: var(--radius);
  background: var(--surface);
}
"""
CARD_REST = """
.cover {
  width: 100%;
  aspect-ratio: 3 / 4;
  border-radius: 6px;
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

/* Место для стикеров, которые передаёт родитель */
.stickers {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.title {
  margin: 0;
  font-size: 15px;
}

.price {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}

.old-price {
  margin-left: 4px;
  font-size: 14px;
  font-weight: 400;
  color: var(--muted);
}

.stock,
.in-cart {
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

/* Кнопка прижата к низу карточки: кнопки соседних карточек стоят на одной линии */
.button {
  margin-top: auto;
}
"""
CARD_SOLD = """
.sold-out .cover {
  filter: grayscale(1);
  opacity: 0.6;
}

.sold-out .price {
  color: var(--muted);
}
"""
CARD_SOLD_HOST = """
:host(.sold-out) .cover {
  filter: grayscale(1);
  opacity: 0.6;
}

:host(.sold-out) .price {
  color: var(--muted);
}
"""
CARD_CSS = CARD_CSS_TOP + CARD_TILE + CARD_REST + CARD_SOLD
CARD_CSS_HOST = CARD_CSS_TOP + CARD_HOST + CARD_REST + CARD_SOLD_HOST

# ---------- GameCard: шаблон ----------

CATEGORY = """<span class="category">
  @switch (G.category) {
    @case ('family') { Семейная }
    @case ('strategy') { Стратегия }
    @case ('party') { Для компании }
    @case ('cooperative') { Кооперативная }
    @case ('kids') { Детская }
    @default never;
  }
</span>
"""
STICKERS = """<div class="stickers">
  <ng-content select="[sticker]" />
</div>
"""
PRICE = """<p class="price">
  {{ G.price }} ₽
  @if (G.oldPrice; as oldPrice) {
    <s class="old-price">{{ oldPrice }} ₽</s>
  }
</p>
@if (G.inStock === 0) {
  <p class="stock stock-out">Нет в наличии</p>
} @else if (G.inStock <= fewLeft) {
  <p class="stock stock-few">Осталось {{ G.inStock }} шт.</p>
} @else {
  <p class="stock stock-ok">В наличии</p>
}
"""
IN_CART = """@if (inCart() > 0) {
  <p class="in-cart muted">В корзине: {{ inCart() }} шт.</p>
}
"""
BUTTON = """<button class="button" [disabled]="inCart() >= game().inStock" (click)="add.emit()">В корзину</button>
"""

def card_html(signal=True, in_cart=False, button=False, rating=None, stickers=False, wrapper=True):
    g = 'game()' if signal else 'game'
    category = CATEGORY
    if signal:
        # Сужение типа для @default never; работает с переменной, но не с повторным вызовом game()
        category = '@let category = game().category;\n' + CATEGORY.replace('@switch (G.category)', '@switch (category)')
    body = '<img class="cover" [src]="G.cover" [alt]="G.title" />\n' + category
    if stickers:
        body += STICKERS
    body += '<h2 class="title">{{ G.title }}</h2>\n'
    if rating == 'plain':
        body += '<app-rating [value]="game().rating" />\n'
    elif rating == 'readonly':
        body += '<app-rating [value]="game().rating" readonly />\n'
    body += PRICE
    if button:
        body += BUTTON
    if in_cart:
        body += IN_CART
    body = body.replace('G.', g + '.')
    if not wrapper:
        return body
    inner = ''.join('  ' + line if line.strip() else line for line in body.splitlines(True))
    return f'<article class="tile" [class.sold-out]="{g}.inStock === 0">\n' + inner + '</article>\n'

CARD_HTML_STUB = "<!-- TODO: разметка плитки — перенесите её сюда из app.html -->\n"

# ---------- GameCard: класс ----------

CARD_TS_STUB = """import { Component } from '@angular/core';
import { GAMES } from '../../core/games-data';

// При каком остатке на складе писать «Осталось N шт.»
const FEW_LEFT = 5;

// TODO: декоратор @Component с селектором app-game-card и класс GameCard
"""

def card_ts(step):
    imports = ['Component']
    if step >= 2:
        imports.append('input')
    if step >= 3:
        imports.append('output')
    lines = [f"import {{ {', '.join(imports)} }} from '@angular/core';\n"]
    if step == 1:
        lines.append("import { GAMES } from '../../core/games-data';\n")
    else:
        lines.append("import { Game } from '../../core/models';\n")
    if step >= 4:
        lines.append("import { Rating } from '../rating/rating';\n")
    lines.append("""
// При каком остатке на складе писать «Осталось N шт.»
const FEW_LEFT = 5;

// Карточка игры в каталоге
@Component({
  selector: 'app-game-card',
""")
    if step >= 4:
        lines.append("  imports: [Rating],\n")
    lines.append("  templateUrl: './game-card.html',\n  styleUrl: './game-card.css',\n")
    if step >= 8:
        lines.append("""  host: {
    role: 'article',
    '[class.sold-out]': 'game().inStock === 0',
  },
""")
    lines.append("})\nexport class GameCard {\n")
    if step == 1:
        lines.append("  // Пока карточка всегда показывает первую игру каталога\n  protected readonly game = GAMES[0];\n")
    else:
        lines.append("""  // Игра, которую показывает карточка. Без неё карточка не имеет смысла — вход обязательный
  readonly game = input.required<Game>();
  // Сколько штук этой игры уже в корзине
  readonly inCart = input(0);
""")
    if step >= 3:
        lines.append("  // Покупатель нажал «В корзину». Что с этим делать, решает родитель\n  readonly add = output();\n")
    lines.append("\n  protected readonly fewLeft = FEW_LEFT;\n}\n")
    return ''.join(lines)

def card(step):
    html = card_html(
        signal=step >= 2, in_cart=step >= 2, button=step >= 3,
        rating=None if step < 4 else ('plain' if step == 4 else 'readonly'),
        stickers=step >= 6, wrapper=step < 8)
    return {
        'shared/game-card/game-card.ts': card_ts(step),
        'shared/game-card/game-card.html': html,
        'shared/game-card/game-card.css': CARD_CSS_HOST if step >= 8 else CARD_CSS,
    }

# ---------- Rating ----------

RATING_CSS = """/* Звёзды рейтинга: серые, закрашенные — золотые */
.star::before {
  content: '★';
}

.star {
  padding: 0 1px;
  color: #d2d2d7;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}

.full {
  color: #f5a623;
}

/* Половина звезды: левая половина золотая, правая серая */
.half::before {
  background: linear-gradient(90deg, #f5a623 50%, #d2d2d7 50%);
  background-clip: text;
  color: transparent;
}
"""
RATING_CSS_HOST = RATING_CSS + """
/* :host — сам элемент <app-rating> */
:host {
  display: inline-flex;
  border-radius: 4px;
}

:host(:focus-visible) {
  outline: 2px solid var(--brand);
  outline-offset: 2px;
}

:host(.readonly) .star {
  cursor: default;
}
"""
RATING_TS_STUB = """import { Component } from '@angular/core';

// TODO: компонент Rating (селектор app-rating) — пять звёзд, оценка value от 0 до 5 с шагом 0.5 через model()
"""
RATING_HTML_STUB = "<!-- TODO: пять звёзд — блок @for по stars, звезда — <span class=\"star\"> -->\n"
RATING_HTML = """@for (star of stars; track star) {
  <span class="star" [class.full]="star <= value()" [class.half]="star - 0.5 <= value() && value() < star" (click)="select(star, $event)"></span>
}
"""

def rating_ts(step):
    imports = ['Component', 'model']
    if step >= 5:
        imports[1:1] = ['booleanAttribute', 'input']
    out = f"import {{ {', '.join(imports)} }} from '@angular/core';\n\n"
    about = 'показывает оценку и, если не readonly, даёт её выбрать' if step >= 5 else 'показывает оценку и даёт её выбрать'
    out += f"// Рейтинг звёздами: {about}\n@Component({{\n  selector: 'app-rating',\n  templateUrl: './rating.html',\n  styleUrl: './rating.css',\n"
    if step >= 7:
        out += """  host: {
    '[attr.role]': "readonly() ? 'img' : 'slider'",
    '[attr.aria-label]': "'Рейтинг ' + value() + ' из 5'",
    '[attr.aria-valuenow]': 'readonly() ? null : value()',
    '[attr.aria-valuemax]': 'readonly() ? null : 5',
    '[attr.tabindex]': 'readonly() ? null : 0',
    '[class.readonly]': 'readonly()',
    '(keydown.arrowright)': 'step(0.5)',
    '(keydown.arrowleft)': 'step(-0.5)',
  },
"""
    out += "})\nexport class Rating {\n"
    out += "  // Оценка от 0 до 5. Родитель может и задать её, и узнать, что её изменили\n  readonly value = model(0);\n"
    if step >= 5:
        out += "  // Только показывать, не давать менять. <app-rating readonly> — то же, что [readonly]=\"true\"\n  readonly readonly = input(false, { transform: booleanAttribute });\n"
    out += "\n  protected readonly stars = [1, 2, 3, 4, 5];\n\n  protected select(star: number, event: MouseEvent) {\n"
    if step >= 5:
        out += "    if (this.readonly()) return;\n"
    out += """    // Щелчок по левой половине звезды — половина звезды
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const selected = event.clientX - rect.left < rect.width / 2 ? star - 0.5 : star;
    // Повторный щелчок по той же оценке сбрасывает её
    this.value.update((value) => (value === selected ? 0 : selected));
  }
"""
    if step >= 7:
        out += """
  // Стрелки на клавиатуре: на ползвезды больше или меньше
  protected step(delta: number) {
    if (this.readonly()) return;
    this.value.update((value) => Math.min(Math.max(Math.round(value * 2) / 2 + delta, 0), 5));
  }
"""
    out += "}\n"
    return out

def rating(step):
    return {
        'shared/rating/rating.ts': rating_ts(step),
        'shared/rating/rating.html': RATING_HTML,
        'shared/rating/rating.css': RATING_CSS_HOST if step >= 7 else RATING_CSS,
    }

RATING_START = {
    'shared/rating/rating.ts': RATING_TS_STUB,
    'shared/rating/rating.html': RATING_HTML_STUB,
    'shared/rating/rating.css': RATING_CSS,
}

# ---------- Quantity (практикум) ----------

QUANTITY_CSS = """/* Кнопки «−» и «+» и число между ними. Стили .icon-button из app.css сюда не достают — нужны свои */
:host {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

button {
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

button:disabled {
  color: #bbb;
  cursor: default;
}

.value {
  min-width: 16px;
  text-align: center;
}
"""
QUANTITY_TS_STUB = """import { Component } from '@angular/core';

// TODO: компонент Quantity (селектор app-quantity): «− N +»
// value — количество (model), min и max — границы (входы, можно задать атрибутом: min="1")
"""
QUANTITY_HTML_STUB = "<!-- TODO: кнопка «−», число, кнопка «+» -->\n"
QUANTITY_TS = """import { Component, input, model, numberAttribute } from '@angular/core';

// Выбор количества: «− N +» в пределах от min до max
@Component({
  selector: 'app-quantity',
  templateUrl: './quantity.html',
  styleUrl: './quantity.css',
})
export class Quantity {
  readonly value = model.required<number>();
  // Границы можно задать и привязкой, и атрибутом: min="1" — строка, numberAttribute сделает из неё число
  readonly min = input(0, { transform: numberAttribute });
  readonly max = input(Infinity, { transform: numberAttribute });

  protected change(delta: number) {
    this.value.update((value) => Math.min(Math.max(value + delta, this.min()), this.max()));
  }
}
"""
QUANTITY_HTML = """<button aria-label="Меньше" [disabled]="value() <= min()" (click)="change(-1)">−</button>
<span class="value">{{ value() }}</span>
<button aria-label="Больше" [disabled]="value() >= max()" (click)="change(1)">+</button>
"""
QUANTITY = {
    'shared/quantity/quantity.ts': QUANTITY_TS,
    'shared/quantity/quantity.html': QUANTITY_HTML,
    'shared/quantity/quantity.css': QUANTITY_CSS,
}
QUANTITY_START = {
    'shared/quantity/quantity.ts': QUANTITY_TS_STUB,
    'shared/quantity/quantity.html': QUANTITY_HTML_STUB,
    'shared/quantity/quantity.css': QUANTITY_CSS,
}

# ---------- app.html ----------

HEADER_SEARCH = HTML_04[:HTML_04.index('  @if (cart().length > 0) {')]
MINI_04 = HTML_04[HTML_04.index('  @if (cart().length > 0) {'):HTML_04.index('  <div class="filters">')]
FILTERS_04 = HTML_04[HTML_04.index('  <div class="filters">'):HTML_04.index('  <div class="grid">')]
CATALOG_04 = HTML_04[HTML_04.index('  <div class="grid">'):HTML_04.index('</main>')]
assert HEADER_SEARCH + MINI_04 + FILTERS_04 + CATALOG_04 + '</main>\n' == HTML_04

ROW_BUTTONS = MINI_04[MINI_04.index('          <button\n            class="icon-button"\n            aria-label="Убрать одну"'):MINI_04.index('          <span class="cart-row-sum">')]
MINI_59_START = rep(MINI_04, ROW_BUTTONS, ROW_BUTTONS.replace('          <button\n            class="icon-button"\n            aria-label="Убрать одну"', '          <!-- TODO: вместо кнопок и числа — <app-quantity> -->\n          <button\n            class="icon-button"\n            aria-label="Убрать одну"', 1))
MINI_59 = rep(MINI_04, ROW_BUTTONS, """          <app-quantity min="1" [max]="item.game.inStock" [value]="item.quantity" (valueChange)="setQuantity(item, $event)" />
""")

FILTERS_54 = rep(FILTERS_04, """      Только в наличии
    </label>
""", """      Только в наличии
    </label>
    <span class="rating-filter">
      Рейтинг от
      <app-rating [(value)]="minRating" />
    </span>
""")

EMPTY = CATALOG_04[CATALOG_04.index('    } @empty {'):]
TILE_04 = CATALOG_04[CATALOG_04.index('    @for'):CATALOG_04.index('    } @empty {')]

def catalog(step):
    if step == 1:
        item = '      <app-game-card />\n'
    else:
        attrs = '[game]="game" [inCart]="inCart().get(game.id) ?? 0"'
        if step >= 3:
            attrs += ' (add)="addToCart(game)"'
        if step >= 6:
            item = f"""      <app-game-card {attrs}>
        @if (game.rating >= hitRating) {{
          <span sticker class="sticker">Хит</span>
        }}
        @if (game.oldPrice) {{
          <span sticker class="sticker sale">Скидка</span>
        }}
      </app-game-card>
"""
        else:
            item = f'      <app-game-card {attrs} />\n'
    return '  <div class="grid">\n    @for (game of visibleGames(); track game.id) {\n' + item + EMPTY

def app_html(step, start=False):
    mini = MINI_04
    if step == 9:
        mini = MINI_59_START if start else MINI_59
    filters = FILTERS_54 if step >= 4 else FILTERS_04
    return HEADER_SEARCH + mini + filters + catalog(step) + '</main>\n'

# ---------- app.ts ----------

APP_51 = APP_04
APP_51 = rep(APP_51, "import { GAMES } from './core/games-data';\n", "import { GAMES } from './core/games-data';\nimport { GameCard } from './shared/game-card/game-card';\n")
APP_51 = rep(APP_51, """
// При каком остатке на складе писать «Осталось N шт.»
const FEW_LEFT = 5;
""", "")
APP_51 = rep(APP_51, "  selector: 'app-root',\n", "  selector: 'app-root',\n  imports: [GameCard],\n")
APP_51 = rep(APP_51, "  protected readonly fewLeft = FEW_LEFT;\n", "")

APP_54 = APP_51
APP_54 = rep(APP_54, "import { GameCard } from './shared/game-card/game-card';\n", "import { GameCard } from './shared/game-card/game-card';\nimport { Rating } from './shared/rating/rating';\n")
APP_54 = rep(APP_54, "  imports: [GameCard],\n", "  imports: [GameCard, Rating],\n")
APP_54 = rep(APP_54, """  // Строка поиска, фильтр и сортировка каталога
  protected readonly query = signal('');
  protected readonly inStockOnly = signal(false);
""", """  // Строка поиска, фильтры и сортировка каталога
  protected readonly query = signal('');
  protected readonly inStockOnly = signal(false);
  protected readonly minRating = signal(0);
""")
APP_54 = rep(APP_54, """        (!this.inStockOnly() || game.inStock > 0),
""", """        (!this.inStockOnly() || game.inStock > 0) &&
        game.rating >= this.minRating(),
""")
APP_54 = rep(APP_54, """    this.inStockOnly.set(false);
    this.sortBy""", """    this.inStockOnly.set(false);
    this.minRating.set(0);
    this.sortBy""")

APP_56 = APP_54
APP_56 = rep(APP_56, """const FREE_DELIVERY_FROM = 5000;
""", """const FREE_DELIVERY_FROM = 5000;

// С какого рейтинга игра получает стикер «Хит»
const HIT_RATING = 4.8;
""")
APP_56 = rep(APP_56, """  });

  // Корзина""", """  });
  protected readonly hitRating = HIT_RATING;

  // Корзина""")

CHANGE_QUANTITY = """  protected changeQuantity(item: CartItem, delta: number) {
    this.cart.update((items) =>
      items.map((i) => (i.game.id === item.game.id ? { ...i, quantity: i.quantity + delta } : i)),
    );
  }
"""
APP_59_START = rep(APP_56, CHANGE_QUANTITY, "  // TODO: setQuantity(item, quantity) вместо changeQuantity\n" + CHANGE_QUANTITY)
APP_59 = rep(APP_56, CHANGE_QUANTITY, """  protected setQuantity(item: CartItem, quantity: number) {
    this.cart.update((items) => items.map((i) => (i.game.id === item.game.id ? { ...i, quantity } : i)));
  }
""")
APP_59 = rep(APP_59, "import { GameCard } from './shared/game-card/game-card';\n", "import { GameCard } from './shared/game-card/game-card';\nimport { Quantity } from './shared/quantity/quantity';\n")
APP_59 = rep(APP_59, "  imports: [GameCard, Rating],\n", "  imports: [GameCard, Rating, Quantity],\n")

# ---------- шаги ----------

def base(app, html, css=APP_CSS):
    return {
        'main.ts': MAIN, 'app.ts': app, 'app.html': html, 'app.css': css,
        'core/models.ts': MODELS, 'core/games-data.ts': GAMES_DATA,
        'app.config.ts': CONFIG, 'styles.css': STYLES_CSS,
    }

def step_files(step, app):
    files = base(app, app_html(step))
    files.update(card(step))
    if step >= 4:
        files.update(rating(step))
    if step >= 9:
        files.update(QUANTITY)
    return files

S51_START = base(APP_04, HTML_04, APP_CSS + TILE_CSS)
S51_START.update({
    'shared/game-card/game-card.ts': CARD_TS_STUB,
    'shared/game-card/game-card.html': CARD_HTML_STUB,
    'shared/game-card/game-card.css': CARD_CSS,
})
S51 = step_files(1, APP_51)
S52 = step_files(2, APP_51)
S53 = step_files(3, APP_51)
S54_START = {**S53, **RATING_START}
S54 = step_files(4, APP_54)
S55 = step_files(5, APP_54)
S56 = step_files(6, APP_56)
S57 = step_files(7, APP_56)
S58 = step_files(8, APP_56)
S59_START = {**S58, 'app.ts': APP_59_START, 'app.html': app_html(9, start=True), **QUANTITY_START}
S59 = step_files(9, APP_59)

steps = {
    '01-component': {'start': S51_START, 'solution': S51},
    '02-inputs': {'start': S51, 'solution': S52},
    '03-outputs': {'start': S52, 'solution': S53},
    '04-model': {'start': S54_START, 'solution': S54},
    '05-input-transforms': {'start': S54, 'solution': S55},
    '06-content-projection': {'start': S55, 'solution': S56},
    '07-host': {'start': S56, 'solution': S57},
    '08-styles': {'start': S57, 'solution': S58},
    '09-practice': {'start': S59_START, 'solution': S59},
    '10-encapsulation': {'start': S59},
}

# Запись на диск: start/, совпадающий с результатом предыдущего шага, не записывается (см. steps.py)
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from steps import write_steps

write_steps(ROOT, steps, base='04-control-flow/07-practice')
# Код шагов — в том виде, какой даёт форматирование в редакторе платформы
opts = ['--print-width', '120', '--single-quote', '--trailing-comma', 'all', '--log-level', 'warn', '--write']
subprocess.run(['npx', 'prettier', *opts, f'{ROOT}/**/*.ts'], cwd=PROJECT, check=True)
subprocess.run(['npx', 'prettier', *opts, '--parser', 'angular', f'{ROOT}/**/*.html'], cwd=PROJECT, check=True)
subprocess.run(['npx', 'prettier', *opts, f'{ROOT}/**/*.css'], cwd=PROJECT, check=True)
print('ok')
