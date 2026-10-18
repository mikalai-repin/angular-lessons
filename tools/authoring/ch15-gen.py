# Генератор кода шагов главы 15 «Анимации, @defer и производительность».
# Запуск: python3 tools/authoring/ch15-gen.py — ПЕРЕЗАПИСЫВАЕТ start/ и solution/ всех шагов главы 15.
#         python3 tools/authoring/ch15-gen.py dump <папка> — полные снимки шагов в <папка>/<шаг>/<start|solution>
#         (для опытов: tools/e2e/run-dir.mjs и exp.mjs принимают такую папку).
# Старт главы — решение практикума главы 14 (09-practice) + готовые стили анимации строк корзины.
# Шаги — полные снимки: каждый строится правками (edit) поверх результата предыдущего шага.
# Код форматирует write_steps (как кнопка «Формат» в редакторе). После запуска: npm run validate.
# Тексты уроков (lesson.md) пишутся отдельно, руками; генератор их не трогает.
import os, shutil, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from steps import PROJECT, format_snapshots, read_dir, rep, step_dir, write_steps

ROOT = f'{PROJECT}/content/15-performance'
BASE = read_dir(step_dir(f'{PROJECT}/content/14-auth/09-practice/solution'))


def edit(files, name, *pairs):
    """Копия снимка, в которой файл name изменён заменами (старое, новое)."""
    out = dict(files)
    text = out[name]
    for old, new in pairs:
        text = rep(text, old, new)
    out[name] = text
    return out


def put(files, **named):
    """Копия снимка с новыми или заменёнными файлами: put(S, **{'core/fly-to-cart.ts': '…'})."""
    out = dict(files)
    out.update(named)
    return out


def drop(files, *names):
    """Копия снимка без файлов names."""
    out = dict(files)
    for name in names:
        del out[name]
    return out


# ---------- Старт главы: стили анимации строк корзины ----------

ROW_ANIMATION_CSS = """
/* Строка появляется: въезжает слева и проявляется. Класс ставит и снимает animate.enter */
.row-enter {
  animation: row-in 0.3s ease-out;
}

@keyframes row-in {
  from {
    opacity: 0;
    transform: translateX(-24px);
  }
}

/* Строка уходит: уезжает вправо и тает. Класс ставит animate.leave, потом строку удаляют */
.row-leave {
  animation: row-out 0.3s ease-in forwards;
}

@keyframes row-out {
  to {
    opacity: 0;
    transform: translateX(24px);
  }
}

/* Покупатель попросил систему поменьше двигать интерфейс — обходимся без анимации */
@media (prefers-reduced-motion: reduce) {
  .row-enter,
  .row-leave {
    animation: none;
  }
}
"""

S0 = edit(BASE, 'cart/cart-page/cart-page.css', ("""  border-radius: 6px;
}

.cart-row.even {
  background: var(--surface);
}
""", """  border-radius: 6px;
}

.cart-row.even {
  background: var(--surface);
}
""" + ROW_ANIMATION_CSS))

# ---------- 15.1 Анимация появления и исчезновения ----------

S1 = edit(S0, 'cart/cart-page/cart-page.html', ("""      <div class="cart-row" [class.even]="$even">""", """      <!-- Строка въезжает, когда появилась, и уезжает, прежде чем исчезнуть -->
      <div
        class="cart-row"
        [class.even]="$even"
        animate.enter="row-enter"
        animate.leave="row-leave"
      >"""))

# ---------- 15.2 Анимация из кода ----------

S2 = edit(S1, 'cart/cart-page/cart-page.html', ("""        animate.enter="row-enter"
        animate.leave="row-leave"
      >""", """        animate.enter="row-enter"
        (animate.leave)="collapse($event)"
      >"""))
S2 = edit(S2, 'cart/cart-page/cart-page.css', ("""
/* Строка уходит: уезжает вправо и тает. Класс ставит animate.leave, потом строку удаляют */
.row-leave {
  animation: row-out 0.3s ease-in forwards;
}

@keyframes row-out {
  to {
    opacity: 0;
    transform: translateX(24px);
  }
}
""", ""), ("""  .row-enter,
  .row-leave {
    animation: none;
  }""", """  .row-enter {
    animation: none;
  }"""), (""".cart-row {
  display: flex;""", """.cart-row {
  overflow: hidden;
  display: flex;"""))
S2 = edit(S2, 'cart/cart-page/cart-page.ts', ("""import { Component, inject, signal } from '@angular/core';""", """import {
  AnimationCallbackEvent,
  Component,
  inject,
  signal,
} from '@angular/core';"""), ("""  private async applyPromo() {""", """  // Строка уходит из корзины: уезжает, тает и схлопывается — строки ниже поднимаются плавно.
  // Angular удалит строку, когда мы вызовем animationComplete()
  protected collapse(event: AnimationCallbackEvent) {
    const row = event.target as HTMLElement;
    // Покупатель попросил поменьше движения — удаляем сразу
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      event.animationComplete();
      return;
    }
    // Высоту строки знает только браузер: замеряем её прямо сейчас (без полей — их уберёт paddingBlock)
    const { height } = getComputedStyle(row);
    const animation = row.animate(
      [
        { height, opacity: 1 },
        {
          height: '0px',
          paddingBlock: '0px',
          opacity: 0,
          transform: 'translateX(24px)',
        },
      ],
      { duration: 300, easing: 'ease-in' },
    );
    animation.onfinish = () => event.animationComplete();
  }

  private async applyPromo() {"""))

# ---------- 15.3 Отложенная отрисовка: отзывы — отдельным компонентом ----------

GAME_REVIEWS_TS = """import { Component, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import {
  FormField,
  FormRoot,
  form,
  min,
  required,
} from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { AuthStore } from '../../core/auth-store';
import { Review } from '../../core/models';
import { FieldAria } from '../../shared/field-aria';
import { FieldErrors } from '../../shared/field-errors/field-errors';
import { Rating } from '../../shared/rating/rating';

// Отзывы об игре: список с сервера и форма нового отзыва
@Component({
  selector: 'app-game-reviews',
  imports: [
    DatePipe,
    FieldAria,
    FieldErrors,
    FormField,
    FormRoot,
    Rating,
  ],
  templateUrl: './game-reviews.html',
  styleUrl: './game-reviews.css',
})
export class GameReviews {
  // Игра, отзывы о которой показываем
  readonly gameId = input.required<number>();

  // Отзывы об игре. defaultValue — значение, пока ответа нет: пустой список вместо undefined
  protected readonly reviews = httpResource<Review[]>(
    () => `/api/games/${this.gameId()}/reviews`,
    { defaultValue: [] },
  );
  // Новый отзыв — форма: оценка звёздами и текст. Компонент Rating — тоже поле формы
  private readonly reviewModel = signal({
    rating: 5,
    text: '',
  });
  protected readonly reviewForm = form(
    this.reviewModel,
    (review) => {
      min(review.rating, 1, {
        message: 'Поставьте оценку — хотя бы одну звезду',
      });
      required(review.text, {
        message: 'Напишите пару слов об игре',
      });
    },
    { submission: { action: () => this.addReview() } },
  );
  // id черновиков отзывов: отрицательные, чтобы не совпасть с настоящими (их сервер выдаёт с 1)
  private nextDraftId = -1;

  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthStore);

  // Отправка формы отзыва. Ошибку, которую вернёт функция, форма покажет у себя
  private async addReview() {
    const { rating, text } = this.reviewModel();
    // Черновик: так отзыв будет выглядеть, когда сервер его сохранит
    const draft: Review = {
      id: this.nextDraftId--,
      gameId: this.gameId(),
      // Подпись — как у сервера: имя вошедшего или «Гость»
      author: this.auth.user()?.name ?? 'Гость',
      rating,
      text,
      date: new Date().toISOString().slice(0, 10),
    };
    // Оптимистичное обновление: отзыв появляется сразу, а форма снова пустая
    this.reviews.update((reviews) => [...reviews, draft]);
    this.reviewForm().reset({ rating: 5, text: '' });

    try {
      const saved = await firstValueFrom(
        this.http.post<Review>(
          `/api/games/${this.gameId()}/reviews`,
          {
            rating,
            text,
          },
        ),
      );
      // Сервер сохранил отзыв: заменяем черновик настоящим
      this.reviews.update((reviews) =>
        reviews.map((review) =>
          review === draft ? saved : review,
        ),
      );
      return undefined;
    } catch {
      // Не получилось: убираем черновик и возвращаем отзыв в форму
      this.reviews.update((reviews) =>
        reviews.filter((review) => review !== draft),
      );
      this.reviewModel.set({ rating, text });
      return {
        kind: 'server',
        message:
          'Не удалось отправить отзыв. Попробуйте ещё раз.',
      };
    }
  }
}
"""

GAME_PAGE_HTML_2 = S2['game/game-page.html']
REVIEWS_START = GAME_PAGE_HTML_2.index('      @if (reviews.status() === \'error\') {')
REVIEWS_END = GAME_PAGE_HTML_2.index('    </app-tab>\n  </app-tabs>')
REVIEWS_BLOCK = GAME_PAGE_HTML_2[REVIEWS_START:REVIEWS_END]
# отступ блока отзывов — на три уровня меньше: в своём шаблоне он верхний
GAME_REVIEWS_HTML = '\n'.join(line[6:] if line.startswith('      ') else line for line in REVIEWS_BLOCK.split('\n'))

GAME_PAGE_CSS_2 = S2['game/game-page.css']
REVIEW_CSS_START = GAME_PAGE_CSS_2.index('/* Отзыв: оценка, автор, дата и текст */')
REVIEW_CSS_END = GAME_PAGE_CSS_2.index('/* Характеристики: название слева, значение справа */')
GAME_REVIEWS_CSS = GAME_PAGE_CSS_2[REVIEW_CSS_START:REVIEW_CSS_END].rstrip() + '\n'
GAME_REVIEWS_CSS = GAME_REVIEWS_CSS.replace('/* Отзыв: оценка, автор, дата и текст */', '/* Отзывы об игре. Отзыв: оценка, автор, дата и текст */')

S3_START = put(S2, **{
    'game/game-reviews/game-reviews.ts': GAME_REVIEWS_TS,
    'game/game-reviews/game-reviews.html': GAME_REVIEWS_HTML,
    'game/game-reviews/game-reviews.css': GAME_REVIEWS_CSS,
    'game/game-page.html': GAME_PAGE_HTML_2[:REVIEWS_START] + """      <app-game-reviews [gameId]="game.id" />
""" + GAME_PAGE_HTML_2[REVIEWS_END:],
    'game/game-page.css': GAME_PAGE_CSS_2[:REVIEW_CSS_START] + GAME_PAGE_CSS_2[REVIEW_CSS_END:],
})
S3_START = edit(S3_START, 'game/game-page.ts',
    ("""import {
  Component,
  computed,
  inject,
  input,
  numberAttribute,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  HttpClient,
  HttpContext,
  HttpErrorResponse,
  httpResource,
} from '@angular/common/http';
import {
  FormField,
  FormRoot,
  form,
  min,
  required,
} from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthStore } from '../core/auth-store';
import { CACHE } from '../core/cache-interceptor';
import { CartStore } from '../core/cart-store';
import { Game, Review } from '../core/models';
import { Countdown } from '../shared/countdown/countdown';
import { DurationPipe } from '../shared/duration-pipe';
import { FieldAria } from '../shared/field-aria';
import { FieldErrors } from '../shared/field-errors/field-errors';
import { PlayersPipe } from '../shared/players-pipe';""", """import {
  Component,
  computed,
  inject,
  input,
  numberAttribute,
} from '@angular/core';
import {
  HttpContext,
  HttpErrorResponse,
  httpResource,
} from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { CACHE } from '../core/cache-interceptor';
import { CartStore } from '../core/cart-store';
import { Game } from '../core/models';
import { Countdown } from '../shared/countdown/countdown';
import { DurationPipe } from '../shared/duration-pipe';
import { PlayersPipe } from '../shared/players-pipe';"""),
    ("""import { Tabs } from '../shared/tabs/tabs';
""", """import { Tabs } from '../shared/tabs/tabs';
import { GameReviews } from './game-reviews/game-reviews';
"""),
    ("""// Страница игры: обложка, цена, «В корзину», описание и характеристики""", """// Страница игры: обложка, цена, «В корзину», описание, характеристики и отзывы"""),
    ("""  imports: [
    Countdown,
    DatePipe,
    DurationPipe,
    FieldAria,
    FieldErrors,
    FormField,
    FormRoot,
    PlayersPipe,""", """  imports: [
    Countdown,
    DurationPipe,
    GameReviews,
    PlayersPipe,"""),
)
GAME_PAGE_TS = S3_START['game/game-page.ts']
GP_REVIEWS_START = GAME_PAGE_TS.index('  // Отзывы об игре. defaultValue')
GP_REVIEWS_END = GAME_PAGE_TS.index('  protected readonly cart = inject(CartStore);')
GP_ADD_START = GAME_PAGE_TS.index('  // Отправка формы отзыва.')
GAME_PAGE_TS = GAME_PAGE_TS[:GP_REVIEWS_START] + GAME_PAGE_TS[GP_REVIEWS_END:GP_ADD_START].rstrip() + '\n}\n'
GAME_PAGE_TS = rep(GAME_PAGE_TS, """  private readonly auth = inject(AuthStore);
""", '')
S3_START = put(S3_START, **{'game/game-page.ts': GAME_PAGE_TS})

S3 = edit(S3_START, 'game/game-page.html', ("""      <app-game-reviews [gameId]="game.id" />
""", """      <!-- Отзывы — не главное на странице: отрисуем их, когда браузер освободится -->
      @defer {
        <app-game-reviews [gameId]="game.id" />
      } @placeholder {
        <p class="muted">Отзывы появятся через мгновение</p>
      } @loading (after 100ms; minimum 500ms) {
        <p class="muted">Загружаем отзывы…</p>
      }
"""))

# ---------- 15.4 Триггеры: отзывы — когда покупатель открыл вкладку ----------

S4 = edit(S3, 'game/game-page.html', ("""      <!-- Отзывы — не главное на странице: отрисуем их, когда браузер освободится -->
      @defer {
        <app-game-reviews [gameId]="game.id" />
      } @placeholder {
        <p class="muted">Отзывы появятся через мгновение</p>
      } @loading (after 100ms; minimum 500ms) {
        <p class="muted">Загружаем отзывы…</p>
      }
""", """      <!-- Отзывы — когда покупатель их увидел: открыл вкладку «Отзывы» -->
      @defer (on viewport) {
        <app-game-reviews [gameId]="game.id" />
      } @placeholder {
        <p class="muted">Загружаем отзывы…</p>
      } @loading (after 100ms; minimum 500ms) {
        <p class="muted">Загружаем отзывы…</p>
      } @error {
        <p class="error-message">
          Не удалось загрузить отзывы. Обновите страницу.
        </p>
      }
"""))

# ---------- 15.5 Предзагрузка ----------

S5 = edit(S4, 'game/game-page.html', ("""      <!-- Отзывы — когда покупатель их увидел: открыл вкладку «Отзывы» -->
      @defer (on viewport) {""", """      <!-- Отзывы — когда покупатель их увидел: открыл вкладку «Отзывы».
           Код блока загрузим заранее, когда браузер освободится -->
      @defer (on viewport; prefetch on idle) {"""))


# ---------- 15.6 Картинки: NgOptimizedImage ----------

CARD_IMAGES = """<!-- priority читается один раз, когда картинка создана. Карточка стала первой (или перестала) —
     создаём картинку заново: иначе NG02953 -->
@if (priority()) {
  <img
    #cover
    class="cover"
    [ngSrc]="game().cover"
    width="300"
    height="400"
    priority
    [alt]="game().title"
  />
} @else {
  <img
    #cover
    class="cover"
    [ngSrc]="game().cover"
    width="300"
    height="400"
    [alt]="game().title"
  />
}
"""

# Старт шага: в настройках магазина — сколько первых обложек списка грузить в первую очередь
S6_START = edit(S5, 'core/shop-config.ts',
    ("""  pageSize: number; // сколько игр показывать сразу и добавлять по «Показать ещё»
}""", """  pageSize: number; // сколько игр показывать сразу и добавлять по «Показать ещё»
  priorityCovers: number; // сколько первых обложек списка грузить в первую очередь: столько умещается в первый ряд
}"""),
    ("""      pageSize: 6,
    }),""", """      pageSize: 6,
      priorityCovers: 6,
    }),"""))

S6 = edit(S6_START, 'shared/game-card/game-card.html', ("""<img
  class="cover"
  [appLazy]="game().cover"
  [alt]="game().title"
/>
""", CARD_IMAGES.replace('    #cover\n', '')))
S6 = edit(S6, 'shared/game-card/game-card.ts',
    ("""import {
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';""", """import {
  Component,
  booleanAttribute,
  computed,
  inject,
  input,
} from '@angular/core';
import { DecimalPipe, NgOptimizedImage } from '@angular/common';"""),
    ("""import { LazyImage } from '../lazy-image';
""", ""),
    ("""    DurationPipe,
    LazyImage,
    PlayersPipe,""", """    DurationPipe,
    NgOptimizedImage,
    PlayersPipe,"""),
    ("""  readonly game = input.required<Game>();
""", """  readonly game = input.required<Game>();
  // Обложку грузить в первую очередь: карточка — первое, что видно на странице
  readonly priority = input(false, { transform: booleanAttribute });
"""))
S6 = edit(S6, 'shared/game-card/game-card.css', (""".cover {
  width: 100%;
  aspect-ratio: 3 / 4;""", """.cover {
  width: 100%;
  height: auto;
  aspect-ratio: 3 / 4;"""))
S6 = edit(S6, 'game/game-page.html', ("""    <img class="cover" [src]="game.cover" [alt]="game.title" />""", """    <!-- Обложка — самая большая картинка первого экрана: грузим её в первую очередь -->
    <img
      class="cover"
      [ngSrc]="game.cover"
      width="300"
      height="400"
      priority
      [alt]="game.title"
    />"""))
S6 = edit(S6, 'game/game-page.ts',
    ("""import {
  HttpContext,""", """import { NgOptimizedImage } from '@angular/common';
import {
  HttpContext,"""),
    ("""    GameReviews,
    PlayersPipe,""", """    GameReviews,
    NgOptimizedImage,
    PlayersPipe,"""))
S6 = edit(S6, 'game/game-page.css', (""".cover {
  width: 160px;
  aspect-ratio: 3 / 4;""", """.cover {
  width: 160px;
  height: auto;
  aspect-ratio: 3 / 4;"""))
PRIORITY_BINDING = '[priority]="$index < priorityCovers"'
S6 = edit(S6, 'catalog/catalog.html', ("""      <app-game-card [game]="game">""", f"""      <app-game-card [game]="game" {PRIORITY_BINDING}>"""))
S6 = edit(S6, 'catalog/catalog.ts', ("""  protected readonly hitRating = this.config.hitRating;
""", """  protected readonly hitRating = this.config.hitRating;
  // Первые обложки — на первом экране: их грузим в первую очередь
  protected readonly priorityCovers = this.config.priorityCovers;
"""))
S6 = edit(S6, 'home/home.html', ("""    @for (game of hits.value().items; track game.id) {
      <app-game-card [game]="game" />""", f"""    @for (game of hits.value().items; track game.id) {{
      <app-game-card [game]="game" {PRIORITY_BINDING} />"""))
S6 = edit(S6, 'home/home.ts', ("""  protected readonly freeDeliveryFrom =
    this.config.freeDeliveryFrom;
""", """  protected readonly freeDeliveryFrom =
    this.config.freeDeliveryFrom;
  // Первые обложки — на первом экране: их грузим в первую очередь
  protected readonly priorityCovers = this.config.priorityCovers;
"""))
S6 = edit(S6, 'account/favorites-page/favorites-page.html', ("""      <app-game-card [game]="game" />""", f"""      <app-game-card [game]="game" {PRIORITY_BINDING} />"""))
S6 = edit(S6, 'account/favorites-page/favorites-page.ts',
    ("""import { Game } from '../../core/models';
""", """import { Game } from '../../core/models';
import { SHOP_CONFIG } from '../../core/shop-config';
"""),
    ("""  protected readonly favorites = inject(FavoritesStore);
  private readonly http = inject(HttpClient);
""", """  protected readonly favorites = inject(FavoritesStore);
  private readonly http = inject(HttpClient);
  // Первые обложки — на первом экране: их грузим в первую очередь
  protected readonly priorityCovers =
    inject(SHOP_CONFIG).priorityCovers;
"""))
S6 = edit(S6, 'styles.css', ("""/* Ленивая картинка (директива LazyImage): проявляется, когда загрузилась */
.lazy {
  opacity: 0;
  transition: opacity 0.4s;
}

.lazy.loaded {
  opacity: 1;
}

""", ""))
S6 = drop(S6, 'shared/lazy-image.ts')

# ---------- 15.8 Практикум: летящая обложка ----------

FLY_TO_CART_START = """import { Service } from '@angular/core';

// Полёт обложки в корзину: карточка запускает, FlyingCovers в шапке показывает
@Service()
export class FlyToCart {
  // TODO: обложки в полёте — сигнал со списком; launch(cover, from) и land(flight)
}
"""

FLY_TO_CART = """import { Service, signal } from '@angular/core';

// Обложка в полёте: что летит и откуда
export interface Flight {
  id: number;
  cover: string;
  // Где была обложка в карточке, когда нажали «В корзину»
  from: DOMRect;
}

// Полёт обложки в корзину: карточка запускает, FlyingCovers в шапке показывает
@Service()
export class FlyToCart {
  private nextId = 1;
  private readonly flightsState = signal<readonly Flight[]>([]);
  // Обложки, которые летят прямо сейчас
  readonly flights = this.flightsState.asReadonly();

  // Запустить обложку из картинки карточки
  launch(cover: string, from: HTMLElement) {
    // Покупатель попросил систему поменьше двигать интерфейс — не летим
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    const flight: Flight = {
      id: this.nextId++,
      cover,
      // Замеряем сейчас: потом карточка может уехать или исчезнуть
      from: from.getBoundingClientRect(),
    };
    this.flightsState.update((flights) => [...flights, flight]);
  }

  // Обложка долетела — убрать её
  land(flight: Flight) {
    this.flightsState.update((flights) =>
      flights.filter((f) => f !== flight),
    );
  }
}
"""

FLYING_COVERS_CSS = """/* Обложка в полёте: поверх страницы, щелчки проходят сквозь неё */
.flying-cover {
  position: fixed;
  z-index: 100;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgb(0 0 0 / 30%);
  pointer-events: none;
}
"""

FLYING_COVERS_START_TS = """import { Component } from '@angular/core';

// Обложки, которые летят в корзину. Стоят в шапке рядом со ссылкой на корзину
@Component({
  selector: 'app-flying-covers',
  templateUrl: './flying-covers.html',
  styleUrl: './flying-covers.css',
})
export class FlyingCovers {
  // TODO: куда лететь — элемент ссылки на корзину (вход)
  // TODO: обложки в полёте — из FlyToCart; полёт — анимация из кода при появлении обложки
}
"""

FLYING_COVERS_START_HTML = """<!-- TODO: обложка для каждого полёта: <img class="flying-cover"> на месте картинки карточки -->
"""

FLYING_COVERS_TS = """import {
  AnimationCallbackEvent,
  Component,
  inject,
  input,
} from '@angular/core';
import { Flight, FlyToCart } from '../../core/fly-to-cart';

// Обложки, которые летят в корзину. Стоят в шапке рядом со ссылкой на корзину
@Component({
  selector: 'app-flying-covers',
  templateUrl: './flying-covers.html',
  styleUrl: './flying-covers.css',
})
export class FlyingCovers {
  // Куда лететь: ссылка на корзину в шапке
  readonly target = input.required<HTMLElement>();
  protected readonly flyToCart = inject(FlyToCart);

  // Обложка появилась на месте картинки карточки — летим к корзине
  protected takeOff(
    event: AnimationCallbackEvent,
    flight: Flight,
  ) {
    const cover = event.target as HTMLElement;
    const from = flight.from;
    const to = this.target().getBoundingClientRect();
    // На сколько сдвинуть центр обложки, чтобы он попал в центр ссылки
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    const animation = cover.animate(
      [
        { transform: 'none', opacity: 1 },
        {
          transform: `translate(${dx}px, ${dy}px) scale(0.1)`,
          opacity: 0.6,
        },
      ],
      // forwards: долетевшая обложка не прыгнет назад, пока её не убрали
      { duration: 700, easing: 'ease-in', fill: 'forwards' },
    );
    animation.onfinish = () => {
      this.flyToCart.land(flight);
      // Ссылка на корзину «ловит» обложку
      this.target().animate(
        [
          { transform: 'scale(1)' },
          { transform: 'scale(1.2)' },
          { transform: 'scale(1)' },
        ],
        { duration: 250 },
      );
    };
  }
}
"""

FLYING_COVERS_HTML = """@for (flight of flyToCart.flights(); track flight.id) {
  <img
    class="flying-cover"
    alt=""
    [src]="flight.cover"
    [style.left.px]="flight.from.left"
    [style.top.px]="flight.from.top"
    [style.width.px]="flight.from.width"
    [style.height.px]="flight.from.height"
    (animate.enter)="takeOff($event, flight)"
  />
}
"""

S8_START = put(S6, **{
    'core/fly-to-cart.ts': FLY_TO_CART_START,
    'layout/flying-covers/flying-covers.ts': FLYING_COVERS_START_TS,
    'layout/flying-covers/flying-covers.html': FLYING_COVERS_START_HTML,
    'layout/flying-covers/flying-covers.css': FLYING_COVERS_CSS,
})
S8 = put(S8_START, **{
    'core/fly-to-cart.ts': FLY_TO_CART,
    'layout/flying-covers/flying-covers.ts': FLYING_COVERS_TS,
    'layout/flying-covers/flying-covers.html': FLYING_COVERS_HTML,
})
S8 = edit(S8, 'layout/header/header.html', ("""  <a
    class="cart"
    routerLink="/cart\"""", """  <a
    #cartLink
    class="cart"
    routerLink="/cart\""""), ("""    {{ cart.subtotal() | price }}</a
  >
""", """    {{ cart.subtotal() | price }}</a
  >
  <!-- Обложки, которые летят в корзину: цель — ссылка на корзину -->
  <app-flying-covers [target]="cartLink" />
"""))
S8 = edit(S8, 'layout/header/header.ts', ("""import { PricePipe } from '../../shared/price-pipe';""", """import { PricePipe } from '../../shared/price-pipe';
import { FlyingCovers } from '../flying-covers/flying-covers';"""))
HEADER_TS = S8['layout/header/header.ts']
HEADER_IMPORTS_START = HEADER_TS.index('  imports: [')
HEADER_IMPORTS_END = HEADER_TS.index(']', HEADER_IMPORTS_START)
S8 = put(S8, **{'layout/header/header.ts': HEADER_TS[:HEADER_IMPORTS_START] + HEADER_TS[HEADER_IMPORTS_START:HEADER_IMPORTS_END].replace('imports: [', 'imports: [\n    FlyingCovers,') + HEADER_TS[HEADER_IMPORTS_END:]})
S8 = edit(S8, 'shared/game-card/game-card.html',
    ("""  <img
    class="cover"
    [ngSrc]="game().cover"
    width="300"
    height="400"
    priority""", """  <img
    #cover
    class="cover"
    [ngSrc]="game().cover"
    width="300"
    height="400"
    priority"""),
    ("""} @else {
  <img
    class="cover\"""", """} @else {
  <img
    #cover
    class="cover\""""),
    ("""    (click)="cart.add(game())\"""", """    (click)="addToCart()\""""))
S8 = edit(S8, 'shared/game-card/game-card.ts',
    ("""import {
  Component,
  booleanAttribute,
  computed,
  inject,
  input,
} from '@angular/core';""", """import {
  Component,
  ElementRef,
  booleanAttribute,
  computed,
  inject,
  input,
  viewChild,
} from '@angular/core';"""),
    ("""import { FavoritesStore } from '../../core/favorites-store';""", """import { FavoritesStore } from '../../core/favorites-store';
import { FlyToCart } from '../../core/fly-to-cart';"""),
    ("""  // При каком остатке на складе писать «Осталось N шт.»
  protected readonly fewLeft = inject(SHOP_CONFIG).fewLeft;
}""", """  // При каком остатке на складе писать «Осталось N шт.»
  protected readonly fewLeft = inject(SHOP_CONFIG).fewLeft;

  // Картинка обложки: из неё вылетит копия в корзину
  private readonly cover =
    viewChild.required<ElementRef<HTMLImageElement>>('cover');
  private readonly flyToCart = inject(FlyToCart);

  // «В корзину»: игра — в корзину, обложка — в полёт
  protected addToCart() {
    this.cart.add(this.game());
    this.flyToCart.launch(
      this.game().cover,
      this.cover().nativeElement,
    );
  }
}"""))


steps = {
    '01-enter-leave': {'start': S0, 'solution': S1},
    '02-animation-functions': {'start': S1, 'solution': S2},
    '03-defer': {'start': S3_START, 'solution': S3},
    '04-triggers': {'start': S3, 'solution': S4},
    '05-prefetch': {'start': S4, 'solution': S5},
    '06-images': {'start': S6_START, 'solution': S6},
    # 15.7 Большие списки: теория и опыты, без решения
    '07-big-lists': {'start': S6},
    '08-practice': {'start': S8_START, 'solution': S8},
    # 15.9 Под капотом: @defer в JIT и в AOT — без решения
    '09-defer-inside': {'start': S8},
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
        write_steps(ROOT, steps, base='14-auth/09-practice')
    print('ok')
