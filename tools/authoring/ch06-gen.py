# Генератор кода шагов главы 6: общие куски — константы, шаги — их комбинации.
# Запуск: python3 tools/authoring/ch06-gen.py — ПЕРЕЗАПИСЫВАЕТ start/ и solution/ всех шагов главы 6.
# Старт главы — решение практикума главы 5 (09-practice) + готовый компонент GameDetails (окно «Подробнее»)
# и стили кнопки-названия в game-card.css.
# В конце прогоняет Prettier по коду шагов. После запуска: npm run validate.
# Тексты уроков (lesson.md) пишутся отдельно, руками; генератор их не трогает.
import os, subprocess, sys

PROJECT = '/Users/mr/Desktop/Experimental/angular-learn'
ROOT = f'{PROJECT}/content/06-lifecycle'
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from steps import step_dir, write_steps

CH05 = step_dir(f'{PROJECT}/content/05-components/09-practice/solution')

def read(path):
    with open(path) as f:
        return f.read()

def rep(text, old, new):
    assert old in text, old
    return text.replace(old, new, 1)

# Файлы, которые в главе не меняются
SAME = {name: read(f'{CH05}/{name}') for name in [
    'main.ts', 'app.config.ts', 'styles.css', 'app.css', 'core/models.ts', 'core/games-data.ts',
    'shared/rating/rating.ts', 'shared/rating/rating.html', 'shared/rating/rating.css',
    'shared/quantity/quantity.ts', 'shared/quantity/quantity.html', 'shared/quantity/quantity.css',
]}
APP_05 = read(f'{CH05}/app.ts')
HTML_05 = read(f'{CH05}/app.html')
CARD_TS_05 = read(f'{CH05}/shared/game-card/game-card.ts')
CARD_HTML_05 = read(f'{CH05}/shared/game-card/game-card.html')
CARD_CSS_05 = read(f'{CH05}/shared/game-card/game-card.css')

# ---------- GameCard: название — кнопка, выход open ----------

CARD_CSS = rep(CARD_CSS_05, """.title {
  margin: 0;
  font-size: 15px;
}
""", """.title {
  margin: 0;
  font-size: 15px;
}

/* Название — кнопка: щелчок открывает окно «Подробнее» */
.title-button {
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.title-button:hover {
  text-decoration: underline;
}
""")

CARD_TS_START = rep(CARD_TS_05, """  readonly add = output();
""", """  readonly add = output();
  // TODO: выход open — покупатель хочет посмотреть подробности об игре
""")
CARD_TS = rep(CARD_TS_05, """  readonly add = output();
""", """  readonly add = output();
  // Покупатель хочет посмотреть подробности об игре
  readonly open = output();
""")
TITLE_05 = '<h2 class="title">{{ game().title }}</h2>\n'
CARD_HTML_START = rep(CARD_HTML_05, TITLE_05, '<!-- TODO: название — кнопка, щелчок по которой сообщает родителю (выход open) -->\n' + TITLE_05)
CARD_HTML = rep(CARD_HTML_05, TITLE_05, """<h2 class="title">
  <button class="title-button" (click)="open.emit()">{{ game().title }}</button>
</h2>
""")

# ---------- GameDetails: окно «Подробнее» ----------

def details_ts(step):
    imports = ['Component']
    if step >= 3:
        imports += ['ElementRef', 'afterNextRender']
    imports += ['input', 'output']
    if step >= 3:
        imports.append('viewChild')
    out = f"import {{ {', '.join(imports)} }} from '@angular/core';\n"
    out += "import { Game } from '../../core/models';\n"
    if step >= 4:
        out += "import { Countdown } from '../countdown/countdown';\n"
    out += "import { Rating } from '../rating/rating';\n"
    if step >= 5:
        out += "import { Tab } from '../tabs/tab';\nimport { Tabs } from '../tabs/tabs';\n"
    deps = ['Rating']
    if step >= 4:
        deps = ['Countdown', 'Rating']
    if step >= 5:
        deps += ['Tab', 'Tabs']
    out += f"""
// Окно «Подробнее»: обложка, описание, цена и кнопка «В корзину»
@Component({{
  selector: 'app-game-details',
  imports: [{', '.join(deps)}],
  templateUrl: './game-details.html',
  styleUrl: './game-details.css',
}})
export class GameDetails {{
  readonly game = input.required<Game>();
  readonly inCart = input(0);
  readonly add = output();
  // Покупатель закрыл окно
  readonly closed = output();
"""
    if step >= 3:
        out += """
  // Элемент <dialog> из шаблона: #dialog
  private readonly dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    // Модальным <dialog> делает только метод showModal(), а вызвать его можно, когда элемент уже в документе
    afterNextRender(() => this.dialogRef().nativeElement.showModal());
  }
"""
    out += "}\n"
    return out


DESCRIPTION = '<p class="description" [innerHTML]="game().description"></p>\n'
TABS_BLOCK = """<app-tabs>
  <app-tab label="Описание">
    <p class="description" [innerHTML]="game().description"></p>
  </app-tab>
  <app-tab label="Характеристики">
    @let players = game().players;
    <dl class="specs">
      <dt>Игроков</dt>
      <dd>
        @if (players.min === players.max) {
          {{ players.min }}
        } @else {
          {{ players.min }}–{{ players.max }}
        }
      </dd>
      <dt>Партия</dt>
      <dd>{{ game().playTime }} мин</dd>
      <dt>Возраст</dt>
      <dd>от {{ game().age }} лет</dd>
      <dt>Теги</dt>
      <dd>{{ game().tags.join(', ') }}</dd>
    </dl>
  </app-tab>
</app-tabs>
"""
COUNTDOWN_TAG = """@if (game().oldPrice) {
  <app-countdown />
}
"""

def details_html(step, todo=None):
    """todo: 'countdown' или 'tabs' — заготовка с TODO на месте нового блока."""
    if step >= 3:
        top = """<dialog #dialog class="details" (close)="closed.emit()">
  <button class="close" aria-label="Закрыть" (click)="dialog.close()">×</button>
"""
    else:
        top = """<!-- Затемнение под окном: щелчок по нему закрывает окно -->
<div class="backdrop" (click)="closed.emit()"></div>
<dialog class="details" open>
  <button class="close" aria-label="Закрыть" (click)="closed.emit()">×</button>
"""
    summary = """<h2 class="title">{{ game().title }}</h2>
<app-rating [value]="game().rating" readonly />
<p class="price">
  {{ game().price }} ₽
  @if (game().oldPrice; as oldPrice) {
    <s class="old-price">{{ oldPrice }} ₽</s>
  }
</p>
"""
    if todo == 'countdown':
        summary += '<!-- TODO: для игры со скидкой — сколько ещё действует скидка (app-countdown) -->\n'
    elif step >= 4:
        summary += COUNTDOWN_TAG
    summary += """<button class="button" [disabled]="inCart() >= game().inStock" (click)="add.emit()">В корзину</button>
@if (inCart() > 0) {
  <p class="in-cart muted">В корзине: {{ inCart() }} шт.</p>
}
"""
    if todo == 'tabs':
        bottom = '<!-- TODO: вкладки «Описание» и «Характеристики» (app-tabs, app-tab) -->\n' + DESCRIPTION
    elif step >= 5:
        bottom = TABS_BLOCK
    else:
        bottom = DESCRIPTION
    indent = lambda text, n: ''.join(' ' * n + line if line.strip() else line for line in text.splitlines(True))
    return (top + '  <div class="head">\n    <img class="cover" [src]="game().cover" [alt]="game().title" />\n'
            + '    <div class="summary">\n' + indent(summary, 6) + '    </div>\n  </div>\n'
            + indent(bottom, 2) + '</dialog>\n')

DETAILS_CSS_TOP = """/* Окно «Подробнее» поверх страницы */
.details {
  position: fixed;
  inset: 0;
  box-sizing: border-box;
  width: min(440px, calc(100% - 32px));
  height: fit-content;
  max-height: calc(100% - 32px);
  margin: auto;
  padding: 16px;
  border: 0;
  border-radius: var(--radius);
  box-shadow: 0 8px 32px rgb(0 0 0 / 25%);
  overflow: auto;
}
"""
DETAILS_BACKDROP_DIV = """
/* Затемнение под окном */
.backdrop {
  position: fixed;
  inset: 0;
  background: rgb(0 0 0 / 40%);
}
"""
DETAILS_BACKDROP_PSEUDO = """
/* Затемнение под модальным окном браузер рисует сам: это псевдоэлемент ::backdrop */
.details::backdrop {
  background: rgb(0 0 0 / 40%);
}
"""
DETAILS_CSS_REST = """
.close {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 50%;
  background: var(--surface);
  font: inherit;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}

.head {
  display: flex;
  gap: 12px;
}

.cover {
  width: 120px;
  aspect-ratio: 3 / 4;
  border-radius: 6px;
}

.summary {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.title {
  margin: 0;
  padding-right: 24px;
  font-size: 18px;
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

.in-cart {
  margin: 0;
  font-size: 13px;
}

.description {
  margin: 12px 0 0;
  font-size: 14px;
  line-height: 1.5;
}
"""
DETAILS_CSS_SPECS = """
/* Характеристики: название слева, значение справа */
.specs {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 12px;
  margin: 0;
  font-size: 14px;
}

.specs dt {
  color: var(--muted);
}

.specs dd {
  margin: 0;
}
"""

def details_css(step):
    css = DETAILS_CSS_TOP + (DETAILS_BACKDROP_PSEUDO if step >= 3 else DETAILS_BACKDROP_DIV) + DETAILS_CSS_REST
    if step >= 5:
        css += DETAILS_CSS_SPECS
    return css

def details(step, todo=None):
    return {
        'shared/game-details/game-details.ts': details_ts(step),
        'shared/game-details/game-details.html': details_html(step, todo),
        'shared/game-details/game-details.css': details_css(step),
    }

# ---------- Countdown: сколько ещё действует скидка ----------

COUNTDOWN_HELPERS = """// Сколько миллисекунд осталось до полуночи: скидки «Хода конём» действуют до конца дня
function untilMidnight(now: number): number {
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - now;
}

// 3 ч 5 мин 9 с → «03:05:09»
function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map((n) => String(n).padStart(2, '0'))
    .join(':');
}
"""
COUNTDOWN_TS_STUB = "import { Component } from '@angular/core';\n\n" + COUNTDOWN_HELPERS + """
// TODO: компонент Countdown (селектор app-countdown): сколько ещё действует скидка.
// Текущее время — сигнал, который таймер обновляет раз в секунду. Таймер остановить, когда компонент уничтожен
"""
COUNTDOWN_TS = "import { Component, DestroyRef, computed, inject, signal } from '@angular/core';\n\n" + COUNTDOWN_HELPERS + """
// Сколько ещё действует скидка: обратный отсчёт до полуночи
@Component({
  selector: 'app-countdown',
  templateUrl: './countdown.html',
  styleUrl: './countdown.css',
})
export class Countdown {
  // Текущее время. Это сигнал: шаблон обновится, когда таймер запишет новое значение
  private readonly now = signal(Date.now());
  protected readonly left = computed(() => formatTime(untilMidnight(this.now())));

  constructor() {
    const timer = setInterval(() => this.now.set(Date.now()), 1000);
    // Компонент уничтожен (окно закрыли) — таймер больше не нужен
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }
}
"""
COUNTDOWN_HTML = 'Скидка действует ещё {{ left() }}\n'
COUNTDOWN_CSS = """/* Строка под ценой: цвет акции, цифры одинаковой ширины — время не «прыгает» */
:host {
  font-size: 13px;
  color: var(--brand);
  font-variant-numeric: tabular-nums;
}
"""
COUNTDOWN = {
    'shared/countdown/countdown.ts': COUNTDOWN_TS,
    'shared/countdown/countdown.html': COUNTDOWN_HTML,
    'shared/countdown/countdown.css': COUNTDOWN_CSS,
}
COUNTDOWN_START = {**COUNTDOWN, 'shared/countdown/countdown.ts': COUNTDOWN_TS_STUB}

# ---------- Tabs и Tab: вкладки ----------

TAB_TS_STUB = """import { Component } from '@angular/core';

// TODO: компонент Tab (селектор app-tab): одна вкладка.
// label — название на кнопке (обязательный вход), active — видна ли вкладка (сигнал, который меняет Tabs)
"""
TAB_TS = """import { Component, input, signal } from '@angular/core';

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
  // Видна ли вкладка. Это решает Tabs, поэтому здесь не вход, а сигнал, который Tabs меняет сам
  readonly active = signal(false);
}
"""
TAB_HTML = '<ng-content />\n'

TABS_TS_STUB = """import { Component } from '@angular/core';

// TODO: компонент Tabs (селектор app-tabs): кнопки с названиями вложенных вкладок, видна только выбранная.
// Вкладки — компоненты Tab, которые родитель вложил между <app-tabs> и </app-tabs>
"""

def tabs_ts(step):
    imports = ['Component']
    if step >= 6:
        imports.append('ElementRef')
        imports.append('afterRenderEffect')
    imports += ['contentChildren', 'effect', 'signal']
    if step >= 6:
        imports.append('viewChildren')
    out = f"import {{ {', '.join(imports)} }} from '@angular/core';\nimport {{ Tab }} from './tab';\n"
    out += """
// Вкладки: кнопки с названиями и содержимое выбранной вкладки
@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.html',
  styleUrl: './tabs.css',
})
export class Tabs {
  // Вкладки, которые родитель вложил между <app-tabs> и </app-tabs>
  protected readonly tabs = contentChildren(Tab);
  // Номер выбранной вкладки
  protected readonly selected = signal(0);
"""
    if step >= 6:
        out += """
  // Кнопки вкладок из шаблона Tabs: #tabButton
  private readonly buttons = viewChildren<ElementRef<HTMLElement>>('tabButton');
  // Где стоит и какой ширины полоска под выбранной вкладкой
  protected readonly ink = signal({ left: 0, width: 0 });
"""
    out += """
  constructor() {
    // Выбранную вкладку показать, остальные спрятать
    effect(() => {
      const selected = this.selected();
      this.tabs().forEach((tab, index) => tab.active.set(index === selected));
    });
"""
    if step >= 6:
        out += """
    // После отрисовки замерить кнопку выбранной вкладки — полоска встанет под неё
    afterRenderEffect({
      read: () => {
        const button = this.buttons()[this.selected()]?.nativeElement;
        if (button) {
          this.ink.set({ left: button.offsetLeft, width: button.offsetWidth });
        }
      },
    });
"""
    out += "  }\n}\n"
    return out

TABS_HTML_STUB = """<!-- TODO: ряд кнопок — по одной на каждую вкладку (role="tablist", у кнопок role="tab"), затем само содержимое вкладок -->
"""

def tabs_html(step):
    ref = ' #tabButton' if step >= 6 else ''
    ink = '\n  <span class="ink" [style.left.px]="ink().left" [style.width.px]="ink().width"></span>' if step >= 6 else ''
    return f"""<div class="tab-list" role="tablist">
  @for (tab of tabs(); track tab; let index = $index) {{
    <button{ref}
      class="tab"
      role="tab"
      [class.active]="index === selected()"
      [attr.aria-selected]="index === selected()"
      (click)="selected.set(index)"
    >
      {{{{ tab.label() }}}}
    </button>
  }}{ink}
</div>
<ng-content />
"""

TABS_CSS = """/* Ряд кнопок-вкладок */
.tab-list {
  position: relative;
  display: flex;
  gap: 16px;
  margin: 12px 0 8px;
  border-bottom: 1px solid #d2d2d7;
}

.tab {
  padding: 6px 0;
  border: 0;
  background: none;
  color: var(--muted);
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}

.tab.active {
  color: var(--text);
  font-weight: 600;
}

/* Полоска под выбранной вкладкой. Где она стоит, вычисляет класс Tabs */
.ink {
  position: absolute;
  bottom: -1px;
  height: 2px;
  background: var(--brand);
  transition:
    left 0.2s,
    width 0.2s;
}
"""

def tabs(step):
    return {
        'shared/tabs/tabs.ts': tabs_ts(step),
        'shared/tabs/tabs.html': tabs_html(step),
        'shared/tabs/tabs.css': TABS_CSS,
        'shared/tabs/tab.ts': TAB_TS,
        'shared/tabs/tab.html': TAB_HTML,
    }

TABS_START = {
    'shared/tabs/tabs.ts': TABS_TS_STUB,
    'shared/tabs/tabs.html': TABS_HTML_STUB,
    'shared/tabs/tabs.css': TABS_CSS,
    'shared/tabs/tab.ts': TAB_TS_STUB,
    'shared/tabs/tab.html': TAB_HTML,
}

# ---------- LoadMore (практикум) ----------

LOAD_MORE_TS_STUB = """import { Component } from '@angular/core';

// TODO: компонент LoadMore (селектор app-load-more): кнопка «Показать ещё» и выход more.
// Когда покупатель докрутил страницу до компонента, more срабатывает сам — без щелчка
"""
LOAD_MORE_TS = """import { Component, DestroyRef, ElementRef, afterNextRender, inject, output } from '@angular/core';

// «Показать ещё»: кнопка, которая срабатывает и сама, когда покупатель докрутил до неё
@Component({
  selector: 'app-load-more',
  templateUrl: './load-more.html',
  styleUrl: './load-more.css',
})
export class LoadMore {
  readonly more = output();

  constructor() {
    // inject работает только здесь, в контексте внедрения, — не внутри afterNextRender
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);

    // IntersectionObserver — API браузера: создаём его после отрисовки, когда хост уже в документе
    afterNextRender(() => {
      const observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          this.more.emit();
        }
      });
      observer.observe(host);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
"""
LOAD_MORE_HTML = '<button class="button" (click)="more.emit()">Показать ещё</button>\n'
LOAD_MORE_CSS = """/* Кнопка по центру под сеткой каталога */
:host {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}
"""
LOAD_MORE = {
    'shared/load-more/load-more.ts': LOAD_MORE_TS,
    'shared/load-more/load-more.html': LOAD_MORE_HTML,
    'shared/load-more/load-more.css': LOAD_MORE_CSS,
}
LOAD_MORE_START = {**LOAD_MORE, 'shared/load-more/load-more.ts': LOAD_MORE_TS_STUB,
                   'shared/load-more/load-more.html': '<!-- TODO: кнопка «Показать ещё» -->\n'}

# ---------- App ----------

APP_61_START = rep(APP_05, """  protected readonly hitRating = HIT_RATING;
""", """  protected readonly hitRating = HIT_RATING;
  // TODO: сигнал selectedGame — игра, открытая в окне «Подробнее» (null — окно закрыто)
""")
APP_61 = rep(APP_05, """  protected readonly hitRating = HIT_RATING;
""", """  protected readonly hitRating = HIT_RATING;

  // Игра, открытая в окне «Подробнее»; null — окно закрыто
  protected readonly selectedGame = signal<Game | null>(null);
""")
APP_61 = rep(APP_61, "import { GameCard } from './shared/game-card/game-card';\n",
             "import { GameCard } from './shared/game-card/game-card';\nimport { GameDetails } from './shared/game-details/game-details';\n")
APP_61 = rep(APP_61, "  imports: [GameCard, Rating, Quantity],\n", "  imports: [GameCard, GameDetails, Rating, Quantity],\n")

APP_62 = rep(APP_61, "import { Component, computed, effect, signal } from '@angular/core';\n",
             "import { Component, ElementRef, computed, effect, signal, viewChild } from '@angular/core';\n")
APP_62 = rep(APP_62, """  protected readonly sortBy = signal<SortKey>('default');
""", """  protected readonly sortBy = signal<SortKey>('default');

  // Поле поиска из шаблона: #searchBox
  private readonly searchBox = viewChild.required<ElementRef<HTMLInputElement>>('searchBox');
""")
APP_62 = rep(APP_62, """    this.sortBy.set('default');
  }
""", """    this.sortBy.set('default');
    // Кнопка «Сбросить фильтры» сейчас исчезнет вместе с фокусом — вернём фокус в поиск
    this.searchBox().nativeElement.focus();
  }
""")

# Практикум: «Показать ещё»
APP_68_START = rep(APP_62, """// Варианты сортировки каталога""", """// Сколько игр показывать сразу и добавлять по «Показать ещё»
const PAGE_SIZE = 6;

// Варианты сортировки каталога""")
APP_68_START = rep(APP_68_START, """  protected readonly hitRating = HIT_RATING;
""", """  // TODO: сколько игр показано (новый поиск или фильтр — снова первые PAGE_SIZE) и сами показанные игры
  protected readonly hitRating = HIT_RATING;
""")
APP_68 = rep(APP_68_START, """  // TODO: сколько игр показано (новый поиск или фильтр — снова первые PAGE_SIZE) и сами показанные игры
  protected readonly hitRating = HIT_RATING;
""", """
  // Сколько игр каталога показано. Новый поиск, фильтр или сортировка — снова первая порция
  protected readonly shownCount = linkedSignal<Game[], number>({
    source: this.visibleGames,
    computation: () => PAGE_SIZE,
  });
  protected readonly shownGames = computed(() => this.visibleGames().slice(0, this.shownCount()));
  protected readonly hitRating = HIT_RATING;
""")
APP_68 = rep(APP_68, "import { Component, ElementRef, computed, effect, signal, viewChild } from '@angular/core';\n",
             "import { Component, ElementRef, computed, effect, linkedSignal, signal, viewChild } from '@angular/core';\n")
APP_68 = rep(APP_68, "import { GameDetails } from './shared/game-details/game-details';\n",
             "import { GameDetails } from './shared/game-details/game-details';\nimport { LoadMore } from './shared/load-more/load-more';\n")
APP_68 = rep(APP_68, "  imports: [GameCard, GameDetails, Rating, Quantity],\n", "  imports: [GameCard, GameDetails, LoadMore, Rating, Quantity],\n")
APP_68 = rep(APP_68, """  protected clearCart() {""", """  protected showMore() {
    this.shownCount.update((count) => count + PAGE_SIZE);
  }

  protected clearCart() {""")
APP_68_START = rep(APP_68_START, """  protected clearCart() {""", """  // TODO: showMore() — показать ещё PAGE_SIZE игр

  protected clearCart() {""")

CARD_TAG_05 = '<app-game-card [game]="game" [inCart]="inCart().get(game.id) ?? 0" (add)="addToCart(game)">'
assert CARD_TAG_05 in HTML_05
DETAILS_BLOCK = """
  @if (selectedGame(); as game) {
    <app-game-details
      [game]="game"
      [inCart]="inCart().get(game.id) ?? 0"
      (add)="addToCart(game)"
      (closed)="selectedGame.set(null)"
    />
  }
</main>
"""

def app_html(step, start=False):
    html = HTML_05
    if step == 1 and start:
        return rep(html, '</main>\n', '\n  <!-- TODO: окно «Подробнее» для выбранной игры (app-game-details) -->\n</main>\n')
    html = rep(html, CARD_TAG_05, CARD_TAG_05[:-1] + ' (open)="selectedGame.set(game)">')
    html = rep(html, '</main>\n', DETAILS_BLOCK)
    if step == 8:
        if start:
            html = rep(html, '    @for (game of visibleGames(); track game.id) {',
                       '    <!-- TODO: только показанные игры -->\n    @for (game of visibleGames(); track game.id) {')
            html = rep(html, """    }
  </div>
""", """    }
  </div>
  <!-- TODO: «Показать ещё» (app-load-more), пока показаны не все игры -->
""")
        else:
            html = rep(html, '@for (game of visibleGames(); track game.id)', '@for (game of shownGames(); track game.id)')
            html = rep(html, """    }
  </div>
""", """    }
  </div>
  @if (shownCount() < visibleGames().length) {
    <app-load-more (more)="showMore()" />
  }
""")
    return html

# ---------- Под капотом: журнал проверок ----------

CD_LOG = """// Пишет в консоль, шаблоны каких компонентов Angular обновил за одну проверку приложения
// и какие из них при этом созданы впервые.
// Подключается к профайлеру Angular — тому же, которым пользуется Angular DevTools.
// Профайлер — внутренний API (ɵ) и есть только в режиме разработки. Только для изучения.

// Номера событий профайлера Angular 22 (ProfilerEvent в исходниках @angular/core)
const TEMPLATE_CREATE_START = 0;
const TEMPLATE_UPDATE_START = 2;
const CHANGE_DETECTION_END = 13;

export function logChangeDetection() {
  const ng = (window as any).ng;
  let checked: string[] = [];
  let created: string[] = [];

  ng.ɵsetProfiler((event: number, context: any) => {
    // context — экземпляр компонента; у блоков @if и @for он свой, их пропускаем
    const name = context?.constructor?.ɵcmp ? context.constructor.name : null;
    if (event === TEMPLATE_CREATE_START && name) created.push(name);
    if (event === TEMPLATE_UPDATE_START && name) checked.push(name);
    if (event === CHANGE_DETECTION_END && checked.length > 0) {
      console.log(`Проверены: ${summary(checked)}` + (created.length > 0 ? ` (из них созданы: ${summary(created)})` : ''));
      checked = [];
      created = [];
    }
  });
}

// ['App', 'GameCard', 'GameCard'] → «App, GameCard ×2»
function summary(names: string[]): string {
  const counts = new Map<string, number>();
  for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1);
  return [...counts].map(([name, count]) => (count > 1 ? `${name} ×${count}` : name)).join(', ');
}
"""
MAIN_69 = """import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app';
import { appConfig } from './app.config';
import { logChangeDetection } from './cd-log';

bootstrapApplication(App, appConfig)
  .then(() => logChangeDetection())
  .catch((err) => console.error(err));
"""

# ---------- шаги ----------

def files(step, app, html, details_files, card=True, extra=()):
    out = dict(SAME)
    out.update({'app.ts': app, 'app.html': html})
    out.update({
        'shared/game-card/game-card.ts': CARD_TS if card else CARD_TS_START,
        'shared/game-card/game-card.html': CARD_HTML if card else CARD_HTML_START,
        'shared/game-card/game-card.css': CARD_CSS,
    })
    out.update(details_files)
    for e in extra:
        out.update(e)
    return out

S61_START = files(1, APP_61_START, app_html(1, start=True), details(1), card=False)
S61 = files(1, APP_61, app_html(1), details(1))
S62 = files(2, APP_62, app_html(2), details(1))
S63 = files(3, APP_62, app_html(3), details(3))
S64_START = files(4, APP_62, app_html(4), details(3, todo='countdown'), extra=[COUNTDOWN_START])
S64 = files(4, APP_62, app_html(4), details(4), extra=[COUNTDOWN])
S65_START = files(5, APP_62, app_html(5), {**details(4), 'shared/game-details/game-details.html': details_html(5, todo='tabs'),
                                         'shared/game-details/game-details.css': details_css(5)}, extra=[COUNTDOWN, TABS_START])
S65 = files(5, APP_62, app_html(5), details(5), extra=[COUNTDOWN, tabs(5)])
S66 = files(6, APP_62, app_html(6), details(5), extra=[COUNTDOWN, tabs(6)])
S68_START = files(8, APP_68_START, app_html(8, start=True), details(5), extra=[COUNTDOWN, tabs(6), LOAD_MORE_START])
S68 = files(8, APP_68, app_html(8), details(5), extra=[COUNTDOWN, tabs(6), LOAD_MORE])
S69_START = {**S68, 'main.ts': MAIN_69, 'cd-log.ts': CD_LOG}

steps = {
    '01-lifecycle': {'start': S61_START, 'solution': S61},
    '02-view-child': {'start': S61, 'solution': S62},
    '03-after-next-render': {'start': S62, 'solution': S63},
    '04-destroy-ref': {'start': S64_START, 'solution': S64},
    '05-content-children': {'start': S65_START, 'solution': S65},
    '06-after-render-effect': {'start': S65, 'solution': S66},
    '07-lifecycle-hooks': {'start': S66},
    '08-practice': {'start': S68_START, 'solution': S68},
    '09-change-detection': {'start': S69_START},
}

# Запись на диск: start/, совпадающий с результатом предыдущего шага, не записывается (см. steps.py)
write_steps(ROOT, steps)
# Код шагов — в том виде, какой даёт форматирование в редакторе платформы
opts = ['--print-width', '120', '--single-quote', '--trailing-comma', 'all', '--log-level', 'warn', '--write']
subprocess.run(['npx', 'prettier', *opts, f'{ROOT}/**/*.ts'], cwd=PROJECT, check=True)
subprocess.run(['npx', 'prettier', *opts, '--parser', 'angular', f'{ROOT}/**/*.html'], cwd=PROJECT, check=True)
subprocess.run(['npx', 'prettier', *opts, f'{ROOT}/**/*.css'], cwd=PROJECT, check=True)
print('ok')
