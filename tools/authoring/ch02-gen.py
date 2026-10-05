# Генератор кода шагов главы 2: общие куски — константы, шаги — их комбинации.
# Запуск: python3 tools/authoring/ch02-gen.py — ПЕРЕЗАПИСЫВАЕТ start/ и solution/ всех шагов главы 2.
# Старт главы — решение главы 1 (07-compiler) с main.ts из ng new.
# После запуска: npm run validate, проверка Prettier (см. docs/authoring-process.md).
# Тексты уроков (lesson.md) пишутся отдельно, руками; генератор их не трогает.
import json, os

PROJECT = '/Users/mr/Desktop/Experimental/angular-learn'
ROOT = f'{PROJECT}/content/02-templates'
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from steps import step_dir

CH01 = step_dir(f'{PROJECT}/content/01-first-app/07-compiler/start')

def read(path):
    with open(path) as f:
        return f.read()

MAIN = """import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app';
import { appConfig } from './app.config';

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
"""

CONFIG = read(f'{CH01}/app.config.ts')
STYLES_CSS = read(f'{CH01}/styles.css')

APP_CSS = read(f'{CH01}/app.css') + """
.search {
  box-sizing: border-box;
  width: 100%;
  margin-bottom: 12px;
  padding: 8px 12px;
  border: 1px solid #d2d2d7;
  border-radius: 8px;
  font: inherit;
}

/* Карточка игры */
.card {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-radius: var(--radius);
  background: var(--surface);
}

.cover {
  flex: none;
  align-self: flex-start;
  width: 120px;
  aspect-ratio: 3 / 4;
  border-radius: 6px;
}

.body {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  min-width: 0;
}

.title {
  margin: 0;
  font-size: 18px;
}

.meta,
.description {
  margin: 0;
  font-size: 13px;
}

.price {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}

.old-price {
  margin-left: 4px;
  font-size: 14px;
  font-weight: 400;
  color: var(--muted);
}

.badge {
  margin-left: 4px;
  padding: 2px 6px;
  border-radius: 6px;
  background: var(--brand);
  color: #fff;
  font-size: 12px;
}

/* Рейтинг: пять серых звёзд, поверх — золотые, обрезанные по ширине */
.rating {
  position: relative;
  font-size: 16px;
  line-height: 1;
  color: #d2d2d7;
}

.rating::before,
.stars::before {
  content: '★★★★★';
}

.stars {
  position: absolute;
  top: 0;
  left: 0;
  overflow: hidden;
  white-space: nowrap;
  color: #f5a623;
}

/* Нет в наличии */
.sold-out .cover {
  filter: grayscale(1);
  opacity: 0.6;
}

.sold-out .price {
  color: var(--muted);
}
"""

# ---------- app.ts ----------

def app_ts(body, imports="import { Component } from '@angular/core';\n"):
    return f"""{imports}
@Component({{
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
}})
export class App {{
{body}}}
"""

F_TITLE_PRICE = """  protected readonly title = 'Остров сокровищ';
  protected readonly price = 1990;
"""
F_COVER_STOCK = """  protected readonly cover = '/assets/covers/treasure-island.svg';
  protected readonly inStock: number = 12;
"""
F_RATING = """  protected readonly rating = 4.6;
"""
F_OLD_PRICE = """  protected readonly oldPrice = 2490;
"""
F_DESCRIPTION = """  protected readonly description =
    'Команды пиратов ищут клад на острове, который <b>меняется каждую партию</b>: карта собирается из квадратных тайлов.';
"""
M_ADD = """
  protected addToCart() {
    console.log('Добавлено в корзину:', this.title);
  }
"""
M_SEARCH_EVENT = """
  protected search(event: Event) {
    const input = event.target as HTMLInputElement;
    console.log('Ищем:', input.value);
  }
"""
M_SEARCH_QUERY = """
  protected search(query: string) {
    console.log('Ищем:', query);
  }
"""

APP_01_START = app_ts("  // TODO: добавьте поля title («Остров сокровищ») и price (1990) и выведите их в шаблоне\n")
APP_01 = app_ts(F_TITLE_PRICE)
APP_02 = app_ts(F_TITLE_PRICE + F_COVER_STOCK)
APP_03 = app_ts(F_TITLE_PRICE + F_COVER_STOCK + F_RATING)
APP_04 = app_ts(F_TITLE_PRICE + F_COVER_STOCK + F_RATING + M_ADD + M_SEARCH_EVENT)
APP_05 = app_ts(F_TITLE_PRICE + F_COVER_STOCK + F_RATING + M_ADD + M_SEARCH_QUERY)
APP_06 = app_ts(F_TITLE_PRICE + F_OLD_PRICE + F_COVER_STOCK + F_RATING + M_ADD + M_SEARCH_QUERY)
APP_07 = app_ts(F_TITLE_PRICE + F_OLD_PRICE + F_COVER_STOCK + F_RATING + F_DESCRIPTION + M_ADD + M_SEARCH_QUERY)

APP_08_START = app_ts(
    "  // TODO: замените поля ниже одним полем game = GAMES[0] и выведите его данные в шаблоне\n"
    + F_TITLE_PRICE + F_OLD_PRICE + F_COVER_STOCK + F_RATING + F_DESCRIPTION + M_ADD + M_SEARCH_QUERY,
    "import { Component } from '@angular/core';\nimport { GAMES } from './core/games-data';\n",
)
APP_08 = app_ts(
    """  // Игра для карточки. Попробуйте GAMES[6]: её нет в наличии, и у неё нет старой цены
  protected readonly game = GAMES[0];

  protected addToCart() {
    console.log('Добавлено в корзину:', this.game.title);
  }
"""
    + M_SEARCH_QUERY,
    "import { Component } from '@angular/core';\nimport { GAMES } from './core/games-data';\n",
)

# ---------- app.html ----------

HEADER = """<header class="header">
  <span class="logo">♞ Ход конём</span>
</header>
"""

def page(inner):
    return HEADER + '<main class="page">\n  <h1>Магазин настольных игр</h1>\n' + inner + '</main>\n'

SEARCH_04 = """  <input class="search" type="search" placeholder="Найти игру" (keydown.enter)="search($event)" />
"""
SEARCH_05 = """  <input #searchBox class="search" type="search" placeholder="Найти игру" (keydown.enter)="search(searchBox.value)" />
  <p class="muted" [hidden]="!searchBox.value">Ищем: «{{ searchBox.value }}»</p>
"""

def card(cls, img, title, extra, price, button, lets=''):
    return f"""{lets}  <article class="card"{cls}>
    {img}
    <div class="body">
      <h2 class="title">{title}</h2>
{extra}{price}      {button}
    </div>
  </article>
"""

IMG_STATIC = '<img class="cover" src="/assets/covers/treasure-island.svg" alt="Остров сокровищ" />'
IMG_BOUND = '<img class="cover" [src]="cover" [alt]="title" />'
PRICE_STATIC = '      <p class="price">1990 ₽</p>\n'
PRICE_BOUND = '      <p class="price">{{ price }} ₽</p>\n'
PRICE_DISCOUNT = """      <p class="price">
        {{ price }} ₽
        <s class="old-price">{{ oldPrice }} ₽</s>
        <span class="badge">−{{ discount }} %</span>
      </p>
"""
RATING = """      <span class="rating" role="img" [attr.aria-label]="'Рейтинг: ' + rating + ' из 5'">
        <span class="stars" [style.width.%]="(rating / 5) * 100"></span>
      </span>
"""
DESCRIPTION = '      <p class="description" [innerHTML]="description"></p>\n'
BTN_STATIC = '<button class="button">В корзину</button>'
BTN_DISABLED = '<button class="button" [disabled]="inStock === 0">В корзину</button>'
BTN_CLICK = '<button class="button" [disabled]="inStock === 0" (click)="addToCart()">В корзину</button>'
BTN_LET = '<button class="button" [disabled]="soldOut" (click)="addToCart()">В корзину</button>'
LETS = """  @let soldOut = inStock === 0;
  @let discount = ((1 - price / oldPrice) * 100).toFixed(0);

"""

HTML_01_START = page(card(
    '', IMG_STATIC,
    'Остров сокровищ',
    '', PRICE_STATIC, BTN_STATIC,
    lets='  <!-- TODO: выведите название и цену игры из полей класса App -->\n',
))
HTML_01 = page(card('', IMG_STATIC, '{{ title }}', '', PRICE_BOUND, BTN_STATIC))
HTML_02 = page(card('', IMG_BOUND, '{{ title }}', '', PRICE_BOUND, BTN_DISABLED))
HTML_03 = page(card(' [class.sold-out]="inStock === 0"', IMG_BOUND, '{{ title }}', RATING, PRICE_BOUND, BTN_DISABLED))
HTML_04 = page(SEARCH_04 + card(' [class.sold-out]="inStock === 0"', IMG_BOUND, '{{ title }}', RATING, PRICE_BOUND, BTN_CLICK))
HTML_05 = page(SEARCH_05 + card(' [class.sold-out]="inStock === 0"', IMG_BOUND, '{{ title }}', RATING, PRICE_BOUND, BTN_CLICK))
HTML_06 = page(SEARCH_05 + '\n' + card(' [class.sold-out]="soldOut"', IMG_BOUND, '{{ title }}', RATING, PRICE_DISCOUNT, BTN_LET, lets=LETS))
HTML_07 = page(SEARCH_05 + '\n' + card(' [class.sold-out]="soldOut"', IMG_BOUND, '{{ title }}', RATING, PRICE_DISCOUNT + DESCRIPTION, BTN_LET, lets=LETS))

HTML_08 = page(SEARCH_05 + """
  @let soldOut = game.inStock === 0;
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
""")

# ---------- core/ (практикум) ----------

MODELS = """// Типы данных магазина
export interface Game {
  id: number;
  slug: string;
  title: string;
  cover: string;
  price: number; // в рублях
  oldPrice?: number; // цена до скидки, если скидка есть
  category: 'family' | 'strategy' | 'party' | 'cooperative' | 'kids';
  players: { min: number; max: number };
  playTime: number; // минуты
  age: number; // с какого возраста
  rating: number; // от 0 до 5
  inStock: number; // остаток на складе
  description: string; // может содержать разметку: <b>, <i>
  tags: string[];
}
"""

def games_data():
    games = json.load(open(f'{PROJECT}/public/backend/data/games.json'))
    # Разметка в описаниях — для [innerHTML] (шаг про безопасность)
    marked = {1: ('меняется каждую партию', '<b>меняется каждую партию</b>')}
    out = ["import { Game } from './models';", '',
           '// Игры магазина. Позже они будут приходить с сервера, а пока лежат прямо в коде', 'export const GAMES: Game[] = [']
    keys = ['id', 'slug', 'title', 'cover', 'price', 'oldPrice', 'category', 'players', 'playTime', 'age', 'rating', 'inStock', 'description', 'tags']
    for g in games:
        g = dict(g)
        if g['id'] in marked:
            a, b = marked[g['id']]
            assert a in g['description'], g['description']
            g['description'] = g['description'].replace(a, b)
        out.append('  {')
        for k in keys:
            if k not in g:
                continue
            v = g[k]
            if isinstance(v, str):
                s = "'" + v.replace("\\", "\\\\").replace("'", "\\'") + "'"
            elif isinstance(v, dict):
                s = '{ min: %d, max: %d }' % (v['min'], v['max'])
            elif isinstance(v, list):
                s = '[' + ', '.join("'" + x + "'" for x in v) + ']'
            else:
                s = json.dumps(v)
            line = f'    {k}: {s},'
            if len(line) > 120 and isinstance(v, str):
                out.append(f'    {k}:')
                out.append(f'      {s},')
            else:
                out.append(line)
        out.append('  },')
    out.append('];')
    return '\n'.join(out) + '\n'

GAMES_DATA = games_data()

# ---------- шаги ----------

def base(app, html):
    return {'main.ts': MAIN, 'app.ts': app, 'app.html': html, 'app.css': APP_CSS, 'app.config.ts': CONFIG, 'styles.css': STYLES_CSS}

S01 = base(APP_01, HTML_01)
S02 = base(APP_02, HTML_02)
S03 = base(APP_03, HTML_03)
S04 = base(APP_04, HTML_04)
S05 = base(APP_05, HTML_05)
S06 = base(APP_06, HTML_06)
S07 = base(APP_07, HTML_07)
CORE = {'core/models.ts': MODELS, 'core/games-data.ts': GAMES_DATA}
S08 = {**base(APP_08, HTML_08), **CORE}

steps = {
    '01-interpolation': {'start': base(APP_01_START, HTML_01_START), 'solution': S01},
    '02-property-binding': {'start': S01, 'solution': S02},
    '03-attr-class-style': {'start': S02, 'solution': S03},
    '04-events': {'start': S03, 'solution': S04},
    '05-template-refs': {'start': S04, 'solution': S05},
    '06-let': {'start': S05, 'solution': S06},
    '07-security': {'start': S06, 'solution': S07},
    '08-practice': {'start': {**base(APP_08_START, HTML_07), **CORE}, 'solution': S08},
    '09-template-context': {'start': S08},
}

# Запись на диск: start/, совпадающий с результатом предыдущего шага, не записывается (см. steps.py)
from steps import write_steps

write_steps(ROOT, steps, base='01-first-app/07-compiler')
print('ok')
