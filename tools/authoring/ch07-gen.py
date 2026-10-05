# Генератор кода шагов главы 7: общие куски — константы, шаги — их комбинации.
# Запуск: python3 tools/authoring/ch07-gen.py — ПЕРЕЗАПИСЫВАЕТ start/ и solution/ всех шагов главы 7.
# Старт главы — решение практикума главы 6 (08-practice) + стили главы: подсказка (.tooltip) и ленивая
# картинка (.lazy) в styles.css, строка характеристик (.meta) в game-card.css.
# В конце прогоняет Prettier по коду шагов. После запуска: npm run validate.
# Тексты уроков (lesson.md) пишутся отдельно, руками; генератор их не трогает.
import os, subprocess, sys

PROJECT = '/Users/mr/Desktop/Experimental/angular-learn'
ROOT = f'{PROJECT}/content/07-directives-pipes'
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from steps import step_dir, write_steps

CH06 = step_dir(f'{PROJECT}/content/06-lifecycle/08-practice/solution')

def read(path):
    with open(path) as f:
        return f.read()

def rep(text, old, new):
    assert old in text, old
    return text.replace(old, new, 1)

BASE = {}
for dirpath, _, names in os.walk(CH06):
    for name in names:
        full = os.path.join(dirpath, name)
        BASE[os.path.relpath(full, CH06)] = read(full)

# ---------- стили главы (готовые с первого шага) ----------

STYLES = BASE['styles.css'] + """
/* Подсказка при наведении (директива Tooltip). У директивы нет своих стилей — они глобальные */
.tooltip {
  position: absolute;
  z-index: 10;
  max-width: 200px;
  padding: 4px 8px;
  border-radius: 6px;
  background: var(--text);
  color: #fff;
  font-size: 12px;
  pointer-events: none;
}

/* Ленивая картинка (директива LazyImage): проявляется, когда загрузилась */
.lazy {
  opacity: 0;
  transition: opacity 0.4s;
}

.lazy.loaded {
  opacity: 1;
}
"""

CARD_CSS = rep(BASE['shared/game-card/game-card.css'], """.price {
  margin: 0;""", """/* Строка характеристик: игроки и время партии. Переносится только между частями */
.meta {
  display: flex;
  flex-wrap: wrap;
  column-gap: 4px;
  margin: 0;
  font-size: 12px;
  color: var(--muted);
}

.meta span {
  white-space: nowrap;
}

.meta span:not(:last-child)::after {
  content: ' ·';
}

.price {
  margin: 0;""")

# ---------- app.config.ts: локаль ----------

CONFIG_06 = BASE['app.config.ts']
CONFIG_START = rep(CONFIG_06, "  providers: [provideBrowserGlobalErrorListeners()],\n",
                   "  // TODO: локаль приложения — ru (LOCALE_ID) и данные локали (registerLocaleData)\n"
                   "  providers: [provideBrowserGlobalErrorListeners()],\n")
CONFIG = """import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeRu from '@angular/common/locales/ru';

// Правила форматирования для русского языка: разделители, названия месяцев, символ рубля
registerLocaleData(localeRu);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Локаль приложения: по ней форматируют встроенные пайпы
    { provide: LOCALE_ID, useValue: 'ru' },
  ],
};
"""

# ---------- Countdown: время пайпом date ----------

CD_TS_06 = BASE['shared/countdown/countdown.ts']
CD_HTML_06 = BASE['shared/countdown/countdown.html']
CD_HTML_START = '<!-- TODO: оставшееся время — пайпом date, а formatTime в countdown.ts больше не нужна -->\n' + CD_HTML_06
CD_HTML = "Скидка действует ещё {{ left() | date: 'HH:mm:ss' : 'UTC' }}\n"
CD_TS = rep(CD_TS_06, """// 3 ч 5 мин 9 с → «03:05:09»
function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map((n) => String(n).padStart(2, '0'))
    .join(':');
}

""", "")
CD_TS = rep(CD_TS, "import { Component, DestroyRef, computed, inject, signal } from '@angular/core';\n",
            "import { Component, DestroyRef, computed, inject, signal } from '@angular/core';\nimport { DatePipe } from '@angular/common';\n")
CD_TS = rep(CD_TS, "  selector: 'app-countdown',\n", "  selector: 'app-countdown',\n  imports: [DatePipe],\n")
CD_TS = rep(CD_TS, """  protected readonly left = computed(() => formatTime(untilMidnight(this.now())));""",
            """  // Сколько миллисекунд осталось. Строкой «07:16:10» его сделает пайп в шаблоне
  protected readonly left = computed(() => untilMidnight(this.now()));""")

# ---------- GameCard ----------

CARD_TS_06 = BASE['shared/game-card/game-card.ts']
CARD_HTML_06 = BASE['shared/game-card/game-card.html']

def card_ts(step):
    deps = ['Rating']
    extra_imports = ''
    if step == 1:
        deps = ['CurrencyPipe', 'Rating']
        extra_imports = "import { CurrencyPipe } from '@angular/common';\n"
    elif step >= 2:
        deps = ['PricePipe', 'Rating']
        if step >= 3:
            deps = ['DurationPipe', 'PlayersPipe', 'PricePipe', 'Rating']
        if step >= 5:
            deps.insert(0, 'DecimalPipe')
            deps.append('Tooltip')
            extra_imports = "import { DecimalPipe } from '@angular/common';\n"
        if step >= 7:
            deps.insert(deps.index('PlayersPipe'), 'LazyImage')
    ts = rep(CARD_TS_06, "  imports: [Rating],\n", f"  imports: [{', '.join(deps)}],\n")
    local = ''
    if step >= 3:
        local += "import { DurationPipe } from '../duration-pipe';\n"
    if step >= 7:
        local += "import { LazyImage } from '../lazy-image';\n"
    if step >= 3:
        local += "import { PlayersPipe } from '../players-pipe';\n"
    if step >= 2:
        local += "import { PricePipe } from '../price-pipe';\n"
    local += "import { Rating } from '../rating/rating';\n"
    if step >= 5:
        local += "import { Tooltip } from '../tooltip';\n"
    ts = rep(ts, "import { Game } from '../../core/models';\nimport { Rating } from '../rating/rating';\n",
             extra_imports + "import { Game } from '../../core/models';\n" + local)
    return ts

PRICE_06 = """<p class="price">
  {{ game().price }} ₽
  @if (game().oldPrice; as oldPrice) {
    <s class="old-price">{{ oldPrice }} ₽</s>
  }
</p>
"""
CURRENCY = "currency: 'RUB' : 'symbol' : '1.0-0'"
RATING_06 = '<app-rating [value]="game().rating" readonly />\n'
COVER_06 = '<img class="cover" [src]="game().cover" [alt]="game().title" />\n'

def card_html(step, start=False):
    html = CARD_HTML_06
    if step == 1 and start:
        return rep(html, PRICE_06, '<!-- TODO: цены — пайпом currency: в рублях, без копеек -->\n' + PRICE_06)
    fmt = CURRENCY if step == 1 else 'price'
    html = rep(html, PRICE_06, f"""<p class="price">
  {{{{ game().price | {fmt} }}}}
  @if (game().oldPrice; as oldPrice) {{
    <s class="old-price">{{{{ oldPrice | {fmt} }}}}</s>
  }}
</p>
""")
    if step == 3 and start:
        html = rep(html, RATING_06, RATING_06 + '<!-- TODO: строка характеристик: «2–5 игроков · 45 мин» -->\n')
    elif step >= 3:
        html = rep(html, RATING_06, RATING_06 + """<p class="meta">
  <span>{{ game().players | players }}</span>
  <span>{{ game().playTime | duration }}</span>
</p>
""")
    if step == 5 and start:
        html = rep(html, RATING_06, '<!-- TODO: подсказка «Рейтинг 4,6» при наведении на звёзды -->\n' + RATING_06)
    elif step >= 5:
        html = rep(html, RATING_06, """<app-rating [value]="game().rating" readonly [appTooltip]="'Рейтинг ' + (game().rating | number)" />
""")
    if step == 7 and start:
        html = rep(html, COVER_06, '<!-- TODO: обложка загружается, только когда карточка появилась на экране -->\n' + COVER_06)
    elif step >= 7:
        html = rep(html, COVER_06, '<img class="cover" [appLazy]="game().cover" [alt]="game().title" />\n')
    return html

# ---------- GameDetails ----------

DET_TS_06 = BASE['shared/game-details/game-details.ts']
DET_HTML_06 = BASE['shared/game-details/game-details.html']

def details_ts(step):
    deps = 'Countdown, Rating, Tab, Tabs'
    local = "import { Countdown } from '../countdown/countdown';\n"
    if step >= 3:
        deps = 'Countdown, DurationPipe, PlayersPipe, PricePipe, Rating, Tab, Tabs'
        local += "import { DurationPipe } from '../duration-pipe';\nimport { PlayersPipe } from '../players-pipe';\nimport { PricePipe } from '../price-pipe';\n"
    else:
        deps = 'Countdown, PricePipe, Rating, Tab, Tabs'
        local += "import { PricePipe } from '../price-pipe';\n"
    ts = rep(DET_TS_06, "  imports: [Countdown, Rating, Tab, Tabs],\n", f"  imports: [{deps}],\n")
    ts = rep(ts, "import { Countdown } from '../countdown/countdown';\n", local)
    return ts

DET_PRICE_06 = """      <p class="price">
        {{ game().price }} ₽
        @if (game().oldPrice; as oldPrice) {
          <s class="old-price">{{ oldPrice }} ₽</s>
        }
      </p>
"""
SPECS_06 = """      @let players = game().players;
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
"""

def details_html(step, start=False):
    html = rep(DET_HTML_06, DET_PRICE_06, """      <p class="price">
        {{ game().price | price }}
        @if (game().oldPrice; as oldPrice) {
          <s class="old-price">{{ oldPrice | price }}</s>
        }
      </p>
""")
    if step == 3 and start:
        html = rep(html, SPECS_06, '      <!-- TODO: игроки и время партии — пайпами players и duration (длинный формат) -->\n' + SPECS_06)
    elif step >= 3:
        html = rep(html, SPECS_06, """      <dl class="specs">
        <dt>Игроки</dt>
        <dd>{{ game().players | players }}</dd>
        <dt>Партия</dt>
        <dd>{{ game().playTime | duration: 'long' }}</dd>
""")
    return html

# ---------- Rating: число в aria-label по локали ----------

RATING_TS_06 = BASE['shared/rating/rating.ts']
RATING_LABEL_06 = """    '[attr.aria-label]': "'Рейтинг ' + value() + ' из 5'",\n"""
RATING_TS_START = rep(RATING_TS_06, RATING_LABEL_06,
                      "    // TODO: число в подписи — по правилам локали: «4,6», а не «4.6»\n" + RATING_LABEL_06)
RATING_TS = rep(RATING_TS_06, RATING_LABEL_06, "    '[attr.aria-label]': 'label()',\n")
RATING_TS = rep(RATING_TS, "import { Component, booleanAttribute, input, model } from '@angular/core';\n",
                "import { Component, LOCALE_ID, booleanAttribute, computed, inject, input, model } from '@angular/core';\n"
                "import { formatNumber } from '@angular/common';\n")
RATING_TS = rep(RATING_TS, """  protected readonly stars = [1, 2, 3, 4, 5];
""", """  protected readonly stars = [1, 2, 3, 4, 5];

  // Подпись для экранного диктора: «Рейтинг 4,6 из 5». В host пайпы нельзя — форматируем функцией
  private readonly locale = inject(LOCALE_ID);
  protected readonly label = computed(() => `Рейтинг ${formatNumber(this.value(), this.locale)} из 5`);
""")

# ---------- пайпы ----------

PRICE_PIPE_START = """import { Pipe } from '@angular/core';

// Цена в рублях без копеек: 1990 → «1 990 ₽»
// TODO: пайп с именем price
"""
PRICE_PIPE = """import { LOCALE_ID, Pipe, PipeTransform, inject } from '@angular/core';
import { formatCurrency } from '@angular/common';

// Цена в рублях без копеек: 1990 → «1 990 ₽»
@Pipe({ name: 'price' })
export class PricePipe implements PipeTransform {
  // Локаль приложения — та же, по которой форматируют встроенные пайпы
  private readonly locale = inject(LOCALE_ID);

  transform(value: number): string {
    return formatCurrency(value, this.locale, '₽', 'RUB', '1.0-0');
  }
}
"""

PLURAL = """// Форма слова после числа по правилам русского языка: 1 игрок, 2 игрока, 5 игроков.
// Intl.PluralRules — стандартный API JavaScript: для целых чисел в русском он отвечает 'one', 'few' или 'many'
const rules = new Intl.PluralRules('ru');

export interface WordForms {
  one: string; // 1, 21, 31 …
  few: string; // 2–4, 22–24 …
  many: string; // 0, 5–20, 25–30 …
}

export function plural(count: number, forms: WordForms): string {
  const category = rules.select(count);
  return category === 'one' ? forms.one : category === 'few' ? forms.few : forms.many;
}
"""

PLAYERS_PIPE_START = """import { Pipe } from '@angular/core';
import { Game } from '../core/models';
import { WordForms, plural } from './plural';

const PLAYER: WordForms = { one: 'игрок', few: 'игрока', many: 'игроков' };

// Число игроков: { min: 2, max: 4 } → «2–4 игрока», { min: 2, max: 2 } → «2 игрока»
// TODO: пайп с именем players
"""
PLAYERS_PIPE = """import { Pipe, PipeTransform } from '@angular/core';
import { Game } from '../core/models';
import { WordForms, plural } from './plural';

const PLAYER: WordForms = { one: 'игрок', few: 'игрока', many: 'игроков' };

// Число игроков: { min: 2, max: 4 } → «2–4 игрока», { min: 2, max: 2 } → «2 игрока»
@Pipe({ name: 'players' })
export class PlayersPipe implements PipeTransform {
  transform(players: Game['players']): string {
    const range = players.min === players.max ? `${players.min}` : `${players.min}–${players.max}`;
    // Слово согласуется с последним числом: «2–4 игрока», но «2–5 игроков»
    return `${range} ${plural(players.max, PLAYER)}`;
  }
}
"""

DURATION_PIPE_START = """import { Pipe } from '@angular/core';
import { WordForms, plural } from './plural';

const HOUR: WordForms = { one: 'час', few: 'часа', many: 'часов' };
const MINUTE: WordForms = { one: 'минута', few: 'минуты', many: 'минут' };

// Формат длительности: 'short' — «1 ч 30 мин», 'long' — «1 час 30 минут»
export type DurationFormat = 'short' | 'long';

// Длительность в минутах: 90 → «1 ч 30 мин», а с параметром 'long' — «1 час 30 минут»
// TODO: пайп с именем duration и параметром format (по умолчанию 'short')
"""
DURATION_PIPE = """import { Pipe, PipeTransform } from '@angular/core';
import { WordForms, plural } from './plural';

const HOUR: WordForms = { one: 'час', few: 'часа', many: 'часов' };
const MINUTE: WordForms = { one: 'минута', few: 'минуты', many: 'минут' };

// Формат длительности: 'short' — «1 ч 30 мин», 'long' — «1 час 30 минут»
export type DurationFormat = 'short' | 'long';

// Длительность в минутах: 90 → «1 ч 30 мин», а с параметром 'long' — «1 час 30 минут»
@Pipe({ name: 'duration' })
export class DurationPipe implements PipeTransform {
  transform(minutes: number, format: DurationFormat = 'short'): string {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    const parts: string[] = [];
    if (hours > 0) {
      parts.push(format === 'short' ? `${hours} ч` : `${hours} ${plural(hours, HOUR)}`);
    }
    if (rest > 0 || hours === 0) {
      parts.push(format === 'short' ? `${rest} мин` : `${rest} ${plural(rest, MINUTE)}`);
    }
    return parts.join(' ');
  }
}
"""

# ---------- директивы ----------

TOOLTIP_START = """import { Directive } from '@angular/core';

// Подсказка при наведении: <span appTooltip="Текст подсказки">
// TODO: директива с селектором [appTooltip]: вход с текстом, показать подсказку при наведении и убрать, когда мышь ушла
"""
TOOLTIP = """import { DestroyRef, Directive, ElementRef, inject, input } from '@angular/core';

// Подсказка при наведении: <span appTooltip="Текст подсказки">
@Directive({
  selector: '[appTooltip]',
  host: {
    '(mouseenter)': 'show()',
    '(mouseleave)': 'hide()',
  },
})
export class Tooltip {
  // Текст подсказки. Вход называется так же, как селектор: текст пишется прямо в атрибуте appTooltip
  readonly appTooltip = input.required<string>();

  // Хост — элемент, на котором стоит директива
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  // Элемент подсказки, пока она на экране
  private tip: HTMLElement | null = null;

  constructor() {
    // Хост уничтожен, пока подсказка видна (карточку убрал фильтр), — убрать и подсказку
    inject(DestroyRef).onDestroy(() => this.hide());
  }

  protected show() {
    this.hide();
    this.tip = document.createElement('div');
    this.tip.className = 'tooltip';
    this.tip.textContent = this.appTooltip();
    document.body.append(this.tip);
    // Под хостом, но не за правым краем страницы
    const rect = this.host.getBoundingClientRect();
    const left = Math.min(rect.left, document.documentElement.clientWidth - this.tip.offsetWidth - 8);
    this.tip.style.left = `${left + window.scrollX}px`;
    this.tip.style.top = `${rect.bottom + window.scrollY + 6}px`;
  }

  protected hide() {
    this.tip?.remove();
    this.tip = null;
  }
}
"""

IN_VIEW_START = """import { Directive } from '@angular/core';

// Сообщает, что хост-элемент появился на экране: <div (appInView)="…">
// TODO: директива с селектором [appInView] и выходом visible (в шаблоне — appInView).
// Наблюдатель — как в LoadMore
"""
IN_VIEW = """import { DestroyRef, Directive, ElementRef, afterNextRender, inject, output } from '@angular/core';

// Сообщает, что хост-элемент появился на экране: <div (appInView)="…">
@Directive({ selector: '[appInView]' })
export class InView {
  // В шаблоне выход называется как селектор: (appInView)="…"
  readonly visible = output({ alias: 'appInView' });

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);

    // IntersectionObserver — API браузера: создаём его после отрисовки, когда хост уже в документе
    afterNextRender(() => {
      const observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          this.visible.emit();
        }
      });
      observer.observe(host);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
"""

LOAD_MORE_06 = BASE['shared/load-more/load-more.ts']
LOAD_MORE_START = rep(LOAD_MORE_06, "  selector: 'app-load-more',\n",
                      "  selector: 'app-load-more',\n  // TODO: наблюдатель — директива InView на хосте (hostDirectives), а код ниже — убрать\n")
LOAD_MORE = """import { Component, inject, output } from '@angular/core';
import { InView } from '../in-view';

// «Показать ещё»: кнопка, которая срабатывает и сама, когда покупатель докрутил до неё
@Component({
  selector: 'app-load-more',
  // InView работает на хосте <app-load-more>, как если бы родитель написал там appInView
  hostDirectives: [InView],
  templateUrl: './load-more.html',
  styleUrl: './load-more.css',
})
export class LoadMore {
  readonly more = output();

  constructor() {
    // Директива на том же хосте — её экземпляр выдаёт inject
    inject(InView).visible.subscribe(() => this.more.emit());
  }
}
"""

LAZY_START = """import { Directive } from '@angular/core';

// Ленивая картинка: <img [appLazy]="адрес"> загружается, только когда появилась на экране
// TODO: директива для <img> с атрибутом appLazy
"""
LAZY = """import { Directive, computed, inject, input, signal } from '@angular/core';
import { InView } from './in-view';

// Ленивая картинка: <img [appLazy]="адрес"> загружается, только когда появилась на экране
@Directive({
  selector: 'img[appLazy]',
  hostDirectives: [InView],
  host: {
    class: 'lazy',
    '[attr.src]': 'src()',
    '[class.loaded]': 'loaded()',
    '(load)': 'loaded.set(true)',
  },
})
export class LazyImage {
  // Адрес картинки
  readonly appLazy = input.required<string>();

  // Была ли картинка на экране. Пока не была — атрибута src нет, и браузер её не загружает
  private readonly seen = signal(false);
  protected readonly src = computed(() => (this.seen() ? this.appLazy() : null));
  // Картинка загрузилась — можно проявить
  protected readonly loaded = signal(false);

  constructor() {
    inject(InView).visible.subscribe(() => this.seen.set(true));
  }
}
"""

# ---------- App ----------

APP_TS_06 = BASE['app.ts']
APP_HTML_06 = BASE['app.html']

def app_ts(step):
    deps = ['GameCard', 'GameDetails', 'LoadMore', 'Rating', 'Quantity']
    common = []
    local = ''
    if step >= 1:
        deps = ['PercentPipe'] + deps
        common = ['PercentPipe']
    if step >= 2:
        deps.insert(deps.index('Rating'), 'PricePipe')
        local += "import { PricePipe } from './shared/price-pipe';\n"
    if step >= 5:
        deps.insert(0, 'DecimalPipe')
        common = ['DecimalPipe', 'PercentPipe']
        deps.append('Tooltip')
        local += "import { Tooltip } from './shared/tooltip';\n"
    ts = rep(APP_TS_06, "  imports: [GameCard, GameDetails, LoadMore, Rating, Quantity],\n", f"  imports: [{', '.join(deps)}],\n")
    if common:
        ts = rep(ts, "import { CartItem, Game } from './core/models';\n",
                 f"import {{ {', '.join(common)} }} from '@angular/common';\nimport {{ CartItem, Game }} from './core/models';\n")
    ts = rep(ts, "import { Quantity } from './shared/quantity/quantity';\n",
             (local.split('\n')[0] + '\n' if step >= 2 else '') + "import { Quantity } from './shared/quantity/quantity';\n")
    if step >= 5:
        ts = rep(ts, "import { Rating } from './shared/rating/rating';\n",
                 "import { Rating } from './shared/rating/rating';\nimport { Tooltip } from './shared/tooltip';\n")
    return ts

SALE_06 = """        @if (game.oldPrice) {
          <span sticker class="sticker sale">Скидка</span>
        }
"""
HIT_06 = """          <span sticker class="sticker">Хит</span>
"""

def app_html(step, start=False):
    html = APP_HTML_06
    if step == 1 and start:
        return rep(html, SALE_06, '        <!-- TODO: на стикере — размер скидки в процентах: «−20 %» -->\n' + SALE_06)
    if step >= 5 and not start:
        sale = """        @if (game.oldPrice; as oldPrice) {
          <span sticker class="sticker sale" appTooltip="Цена действует до конца дня">
            −{{ 1 - game.price / oldPrice | percent }}
          </span>
        }
"""
    else:
        sale = """        @if (game.oldPrice; as oldPrice) {
          <span sticker class="sticker sale">−{{ 1 - game.price / oldPrice | percent }}</span>
        }
"""
    html = rep(html, SALE_06, sale)
    if step == 5 and start:
        html = rep(html, '      >\n        @if (game.rating >= hitRating) {',
                   '      >\n        <!-- TODO: подсказки у стикеров: «Рейтинг 4,8 и выше» и «Цена действует до конца дня» -->\n'
                   '        @if (game.rating >= hitRating) {')
    elif step >= 5:
        html = rep(html, HIT_06, """          <span sticker class="sticker" [appTooltip]="'Рейтинг ' + (hitRating | number) + ' и выше'">Хит</span>
""")
    if step >= 2:
        html = rep(html, '<span class="cart">В корзине: {{ cartCount() }} · {{ cartTotal() }} ₽</span>',
                   '<span class="cart">В корзине: {{ cartCount() }} · {{ cartTotal() | price }}</span>')
        html = rep(html, '<span class="cart-row-sum">{{ item.game.price * item.quantity }} ₽</span>',
                   '<span class="cart-row-sum">{{ item.game.price * item.quantity | price }}</span>')
        html = rep(html, '<b>Итого: {{ cartTotal() }} ₽</b>', '<b>Итого: {{ cartTotal() | price }}</b>')
        html = rep(html, 'До бесплатной доставки: {{ deliveryLeft() }} ₽', 'До бесплатной доставки: {{ deliveryLeft() | price }}')
    return html

# ---------- шаги ----------

def solution(step):
    """Полный код решения шага (шаг 0 — старт главы без заготовок)."""
    out = dict(BASE)
    out['styles.css'] = STYLES
    out['shared/game-card/game-card.css'] = CARD_CSS
    if step == 0:
        return out
    out['app.config.ts'] = CONFIG
    out['shared/countdown/countdown.ts'] = CD_TS
    out['shared/countdown/countdown.html'] = CD_HTML
    out['app.ts'] = app_ts(step)
    out['app.html'] = app_html(step)
    out['shared/game-card/game-card.ts'] = card_ts(step)
    out['shared/game-card/game-card.html'] = card_html(step)
    if step >= 2:
        out['shared/price-pipe.ts'] = PRICE_PIPE
        out['shared/rating/rating.ts'] = RATING_TS
        out['shared/game-details/game-details.ts'] = details_ts(step)
        out['shared/game-details/game-details.html'] = details_html(step)
    if step >= 3:
        out['shared/plural.ts'] = PLURAL
        out['shared/players-pipe.ts'] = PLAYERS_PIPE
        out['shared/duration-pipe.ts'] = DURATION_PIPE
    if step >= 5:
        out['shared/tooltip.ts'] = TOOLTIP
    if step >= 6:
        out['shared/in-view.ts'] = IN_VIEW
        out['shared/load-more/load-more.ts'] = LOAD_MORE
    if step >= 7:
        out['shared/lazy-image.ts'] = LAZY
    return out

S71_START = {**solution(0),
             'app.config.ts': CONFIG_START,
             'shared/countdown/countdown.html': CD_HTML_START,
             'shared/game-card/game-card.html': card_html(1, start=True),
             'app.html': app_html(1, start=True)}
S72_START = {**solution(1),
             'shared/price-pipe.ts': PRICE_PIPE_START,
             'shared/rating/rating.ts': RATING_TS_START}
S73_START = {**solution(2),
             'shared/plural.ts': PLURAL,
             'shared/players-pipe.ts': PLAYERS_PIPE_START,
             'shared/duration-pipe.ts': DURATION_PIPE_START,
             'shared/game-card/game-card.html': card_html(3, start=True),
             'shared/game-details/game-details.html': details_html(3, start=True)}
S75_START = {**solution(3),
             'shared/tooltip.ts': TOOLTIP_START,
             'shared/game-card/game-card.html': card_html(5, start=True),
             'app.html': app_html(5, start=True)}
S76_START = {**solution(5),
             'shared/in-view.ts': IN_VIEW_START,
             'shared/load-more/load-more.ts': LOAD_MORE_START}
S77_START = {**solution(6),
             'shared/lazy-image.ts': LAZY_START,
             'shared/game-card/game-card.html': card_html(7, start=True)}

steps = {
    '01-builtin-pipes': {'start': S71_START, 'solution': solution(1)},
    '02-custom-pipe': {'start': S72_START, 'solution': solution(2)},
    '03-pipe-params': {'start': S73_START, 'solution': solution(3)},
    '04-pure-pipes': {'start': solution(3)},
    '05-directive': {'start': S75_START, 'solution': solution(5)},
    '06-host-directives': {'start': S76_START, 'solution': solution(6)},
    '07-practice': {'start': S77_START, 'solution': solution(7)},
    '08-directives-inside': {'start': solution(7)},
}

# Запись на диск: start/, совпадающий с результатом предыдущего шага, не записывается (см. steps.py)
write_steps(ROOT, steps, base='06-lifecycle/08-practice')
# Код шагов — в том виде, какой даёт форматирование в редакторе платформы
opts = ['--print-width', '120', '--single-quote', '--trailing-comma', 'all', '--log-level', 'warn', '--write']
subprocess.run(['npx', 'prettier', *opts, f'{ROOT}/**/*.ts'], cwd=PROJECT, check=True)
subprocess.run(['npx', 'prettier', *opts, '--parser', 'angular', f'{ROOT}/**/*.html'], cwd=PROJECT, check=True)
subprocess.run(['npx', 'prettier', *opts, f'{ROOT}/**/*.css'], cwd=PROJECT, check=True)
print('ok')
