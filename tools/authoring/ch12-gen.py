# Генератор кода шагов главы 12 «RxJS в Angular».
# Запуск: python3 tools/authoring/ch12-gen.py — ПЕРЕЗАПИСЫВАЕТ start/ и solution/ всех шагов главы 12.
# Старт главы — решение практикума главы 11 (09-practice) с заготовкой в конструкторе App.
# Шаги — полные снимки: каждый строится правками (edit) поверх результата предыдущего шага.
# Код форматирует write_steps (как кнопка «Формат» в редакторе). После запуска: npm run validate.
# Тексты уроков (lesson.md) пишутся отдельно, руками; генератор их не трогает.
import os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from steps import PROJECT, read_dir, rep, step_dir, write_steps

ROOT = f'{PROJECT}/content/12-rxjs'
BASE = read_dir(step_dir(f'{PROJECT}/content/11-http/09-practice/solution'))


def edit(files, name, *pairs):
    """Копия снимка, в которой файл name изменён заменами (старое, новое)."""
    out = dict(files)
    text = out[name]
    for old, new in pairs:
        text = rep(text, old, new)
    out[name] = text
    return out


# ---------- 12.1 Observable: события роутера ----------

S1 = edit(BASE, 'app.ts', ("""export class App {}""", """export class App {
  constructor() {
    // TODO: подписаться на события роутера и выводить каждое в консоль
  }
}"""))

R1 = edit(S1, 'app.ts',
    ("import { Component } from '@angular/core';", "import { Component, inject } from '@angular/core';"),
    ("import { RouterOutlet } from '@angular/router';", "import { Router, RouterOutlet } from '@angular/router';"),
    ("""    // TODO: подписаться на события роутера и выводить каждое в консоль""",
     """    // События роутера — Observable: пока работает приложение, роутер присылает их одно за другим
    inject(Router).events.subscribe((event) =>
      console.log(String(event)),
    );"""))

# ---------- 12.2 Операторы: просмотры страниц ----------

R2 = edit(R1, 'app.ts',
    ("import { Component, inject } from '@angular/core';", "import { Component, inject, injectAsync } from '@angular/core';"),
    ("import { Router, RouterOutlet } from '@angular/router';", """import {
  NavigationEnd,
  Router,
  RouterOutlet,
} from '@angular/router';
import { filter, map } from 'rxjs';"""),
    ("""export class App {
  constructor() {""", """export class App {
  // Аналитика загружается отдельно, при первом вызове — как в корзине
  private readonly analytics = injectAsync(() =>
    import('./core/analytics').then((m) => m.Analytics),
  );

  constructor() {"""),
    ("""    // События роутера — Observable: пока работает приложение, роутер присылает их одно за другим
    inject(Router).events.subscribe((event) =>
      console.log(String(event)),
    );""", """    // Просмотр страницы — завершённая навигация. Из всех событий роутера берём NavigationEnd,
    // а из него — адрес, на котором покупатель оказался после всех переадресаций
    inject(Router)
      .events.pipe(
        filter((event) => event instanceof NavigationEnd),
        map((event) => event.urlAfterRedirects),
      )
      .subscribe((url) =>
        this.analytics().then((analytics) =>
          analytics.track('Просмотр страницы', url),
        ),
      );"""))

# ---------- 12.3 Поиск с отменой: быстрый поиск в шапке ----------

QS_HTML = """<input
  #box
  class="quick-search-input"
  type="search"
  placeholder="Быстрый поиск"
  aria-label="Быстрый поиск"
  (input)="search(box.value)"
  (keydown.escape)="open.set(false)"
/>
@if (open() && suggestions().length > 0) {
  <ul class="suggestions">
    @for (game of suggestions(); track game.id) {
      <li>
        <a [routerLink]="['/games', game.id]" (click)="choose(box)">
          {{ game.title }}
        </a>
      </li>
    }
  </ul>
}
"""

QS_CSS = """/* Быстрый поиск: справа в строке меню, подсказки — списком под полем */
:host {
  position: relative;
  margin-left: auto;
}

.quick-search-input {
  width: 150px;
  padding: 3px 8px;
  border: 0;
  border-radius: 6px;
  font: inherit;
}

.suggestions {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 10;
  width: 240px;
  margin: 0;
  padding: 4px 0;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 4px 16px rgb(0 0 0 / 0.2);
  list-style: none;
}

.suggestions a {
  display: block;
  padding: 6px 12px;
  color: var(--text);
  text-decoration: none;
}

.suggestions a:hover {
  background: var(--surface);
}
"""

QS_TS_START = """import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { Game, GamesPage } from '../../core/models';

// Быстрый поиск в шапке: пока покупатель печатает, под полем — до пяти подходящих игр
@Component({
  selector: 'app-quick-search',
  imports: [RouterLink],
  templateUrl: './quick-search.html',
  styleUrl: './quick-search.css',
})
export class QuickSearch {
  private readonly http = inject(HttpClient);

  // Подсказки под полем
  protected readonly suggestions = signal<Game[]>([]);
  // Открыт ли список подсказок: закрываем, когда покупатель выбрал игру или нажал Esc
  protected readonly open = signal(false);

  // Текст в поле изменился
  protected search(text: string) {
    this.open.set(true);
    // Запрос на каждую букву. TODO: поток текстов поиска — запрос, когда покупатель перестал печатать
    this.http
      .get<GamesPage>('/api/games', {
        params: { q: text, size: 5 },
      })
      .subscribe((page) => this.suggestions.set(page.items));
  }

  // Покупатель выбрал игру: закрываем подсказки и очищаем поле
  protected choose(box: HTMLInputElement) {
    this.open.set(false);
    box.value = '';
  }
}
"""

S3 = dict(R2)
S3['layout/quick-search/quick-search.ts'] = QS_TS_START
S3['layout/quick-search/quick-search.html'] = QS_HTML
S3['layout/quick-search/quick-search.css'] = QS_CSS
S3 = edit(S3, 'layout/header/header.ts',
    ("import { PricePipe } from '../../shared/price-pipe';", "import { PricePipe } from '../../shared/price-pipe';\nimport { QuickSearch } from '../quick-search/quick-search';"),
    ("imports: [PricePipe, RouterLink, RouterLinkActive],", "imports: [PricePipe, QuickSearch, RouterLink, RouterLinkActive],"))
S3 = edit(S3, 'layout/header/header.html',
    ("""      >Каталог</a
    >
  </nav>""", """      >Каталог</a
    >
    <app-quick-search />
  </nav>"""))
S3 = edit(S3, 'layout/header/header.css',
    ("""/* Меню: отдельный ряд на всю ширину */
.nav {
  display: flex;""", """/* Меню и быстрый поиск: отдельный ряд на всю ширину */
.nav {
  display: flex;
  align-items: center;"""))

QS_TS_3 = """import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import {
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  of,
  switchMap,
} from 'rxjs';
import { Game, GamesPage } from '../../core/models';

// Быстрый поиск в шапке: пока покупатель печатает, под полем — до пяти подходящих игр
@Component({
  selector: 'app-quick-search',
  imports: [RouterLink],
  templateUrl: './quick-search.html',
  styleUrl: './quick-search.css',
})
export class QuickSearch {
  private readonly http = inject(HttpClient);

  // Тексты поиска: каждое изменение поля — новое значение потока
  private readonly texts = new Subject<string>();

  // Подсказки под полем
  protected readonly suggestions = signal<Game[]>([]);
  // Открыт ли список подсказок: закрываем, когда покупатель выбрал игру или нажал Esc
  protected readonly open = signal(false);

  constructor() {
    this.texts
      .pipe(
        map((text) => text.trim()),
        // Ждём паузы в 300 мс: пока покупатель печатает, запросов нет
        debounceTime(300),
        // Текст не изменился («кот» → «ко» → «кот») — запрос не нужен
        distinctUntilChanged(),
        // Новый текст — новый запрос. Прежний, если ответ ещё не пришёл, отменяется
        switchMap((text) =>
          text.length < 2
            ? of([])
            : this.http
                .get<GamesPage>('/api/games', {
                  params: { q: text, size: 5 },
                })
                .pipe(
                  map((page) => page.items),
                  // Сервер не ответил — подсказок нет, но поток живёт дальше
                  catchError(() => of([])),
                ),
        ),
      )
      .subscribe((games) => this.suggestions.set(games));
  }

  // Текст в поле изменился
  protected search(text: string) {
    this.open.set(true);
    this.texts.next(text);
  }

  // Покупатель выбрал игру: закрываем подсказки и очищаем поле
  protected choose(box: HTMLInputElement) {
    this.open.set(false);
    box.value = '';
    this.texts.next('');
  }
}
"""

R3 = dict(S3)
R3['layout/quick-search/quick-search.ts'] = QS_TS_3

# ---------- 12.4 Мост к сигналам: toSignal и toObservable ----------

QS_TS_4 = """import { Component, inject, signal } from '@angular/core';
import {
  toObservable,
  toSignal,
} from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  of,
  switchMap,
} from 'rxjs';
import { Game, GamesPage } from '../../core/models';

// Быстрый поиск в шапке: пока покупатель печатает, под полем — до пяти подходящих игр
@Component({
  selector: 'app-quick-search',
  imports: [RouterLink],
  templateUrl: './quick-search.html',
  styleUrl: './quick-search.css',
})
export class QuickSearch {
  private readonly http = inject(HttpClient);

  // Текст в поле — сигнал: его читает шаблон, а из него строится поток подсказок
  protected readonly text = signal('');
  // Открыт ли список подсказок: закрываем, когда покупатель выбрал игру или нажал Esc
  protected readonly open = signal(false);

  // Подсказки: поток ответов сервера, превращённый в сигнал. До первого ответа — пустой список
  protected readonly suggestions = toSignal(
    toObservable(this.text).pipe(
      map((text) => text.trim()),
      // Ждём паузы в 300 мс: пока покупатель печатает, запросов нет
      debounceTime(300),
      // Текст не изменился («кот» → «ко» → «кот») — запрос не нужен
      distinctUntilChanged(),
      // Новый текст — новый запрос. Прежний, если ответ ещё не пришёл, отменяется
      switchMap((text) =>
        text.length < 2
          ? of([])
          : this.http
              .get<GamesPage>('/api/games', {
                params: { q: text, size: 5 },
              })
              .pipe(
                map((page) => page.items),
                // Сервер не ответил — подсказок нет, но поток живёт дальше
                catchError(() => of([])),
              ),
      ),
    ),
    { initialValue: [] },
  );

  // Текст в поле изменился
  protected search(text: string) {
    this.open.set(true);
    this.text.set(text);
  }

  // Покупатель выбрал игру: закрываем подсказки и очищаем поле
  protected choose() {
    this.open.set(false);
    this.text.set('');
  }
}
"""

R4 = dict(R3)
R4['layout/quick-search/quick-search.ts'] = QS_TS_4
R4 = edit(R4, 'layout/quick-search/quick-search.html',
    ("""  aria-label="Быстрый поиск"
  (input)""", """  aria-label="Быстрый поиск"
  [value]="text()"
  (input)"""),
    ("""(click)="choose(box)\"""", """(click)="choose()\""""))

# ---------- 12.5 rxResource: избранное через HttpClient ----------

FAV_TS_5 = """import { Component, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
  HttpClient,
  HttpErrorResponse,
} from '@angular/common/http';
import { RouterLink } from '@angular/router';
import {
  Observable,
  catchError,
  forkJoin,
  map,
  of,
  throwError,
} from 'rxjs';
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
  private readonly http = inject(HttpClient);

  // Игры из избранного. Запроса «игры по списку id» в API нет — запрос на каждую игру
  protected readonly games = rxResource({
    // Параметры загрузки. undefined — загружать нечего: ресурс в статусе idle
    params: () => {
      const ids = this.favorites.ids();
      return ids.length > 0 ? ids : undefined;
    },
    // Поток вместо промиса: все запросы сразу, ответ — когда придут все.
    // Изменился список — ресурс отпишется от прежнего потока, и незаконченные запросы отменятся
    stream: ({ params }) =>
      forkJoin(params.map((id) => this.loadGame(id))).pipe(
        map((games) => games.filter((game) => game !== null)),
      ),
  });

  // Игра по id. Игры больше нет в каталоге (404) — null, другие ошибки идут дальше по потоку
  private loadGame(id: number): Observable<Game | null> {
    return this.http.get<Game>(`/api/games/${id}`).pipe(
      catchError((error: unknown) =>
        error instanceof HttpErrorResponse && error.status === 404
          ? of(null)
          : throwError(() => error),
      ),
    );
  }
}
"""

R5 = dict(R4)
R5['account/favorites-page/favorites-page.ts'] = FAV_TS_5

# ---------- 12.6 Уборка: часы на RxJS ----------

NOW_TS_6 = """import { Signal, assertInInjectionContext } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { interval, map } from 'rxjs';

// Текущее время сигналом, который обновляется каждые periodMs миллисекунд.
// toSignal подписывается сразу и отписывается сам, когда уничтожается тот, кто вызвал функцию
export function injectNow(periodMs = 1000): Signal<number> {
  // Понятная ошибка, если функцию вызвали вне контекста внедрения
  assertInInjectionContext(injectNow);
  // interval присылает 0, 1, 2… раз в periodMs. Нам нужен не номер, а время
  return toSignal(
    interval(periodMs).pipe(map(() => Date.now())),
    { initialValue: Date.now() },
  );
}
"""

R6 = dict(R5)
R6['shared/now.ts'] = NOW_TS_6

# ---------- 12.7 Интерцепторы: лог и повтор при сбое ----------

LOG_INT = """import {
  HttpErrorResponse,
  HttpEventType,
  HttpInterceptorFn,
} from '@angular/common/http';
import { tap } from 'rxjs';

// Лог запросов: метод, адрес, ответ и сколько он шёл. Через интерцептор проходит каждый запрос HttpClient
export const loggingInterceptor: HttpInterceptorFn = (
  req,
  next,
) => {
  const started = performance.now();
  const took = () =>
    `${Math.round(performance.now() - started)} мс`;
  const request = `${req.method} ${req.urlWithParams}`;
  // next(req) — запрос дальше по цепочке. Ответ приходит потоком событий: смотрим на него через tap
  return next(req).pipe(
    tap({
      next: (event) => {
        if (event.type === HttpEventType.Response) {
          console.log(`${request} → ${event.status}, ${took()}`);
        }
      },
      error: (error: HttpErrorResponse) =>
        console.log(`${request} → ${error.status}, ${took()}`),
    }),
  );
};
"""

RETRY_INT = """import {
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { retry, throwError, timer } from 'rxjs';

// Сколько раз повторять запрос и через сколько миллисекунд
const RETRY_COUNT = 2;
const RETRY_DELAY = 500;

// Повтор при сбое сервера. Только GET: чтение можно повторить без вреда,
// а повтор POST мог бы, например, дважды отправить один отзыв
export const retryInterceptor: HttpInterceptorFn = (
  req,
  next,
) => {
  if (req.method !== 'GET') {
    return next(req);
  }
  return next(req).pipe(
    retry({
      count: RETRY_COUNT,
      // Повторяем только ответы 5xx — «сервер не смог». 404 при повторе останется 404
      delay: (error: unknown) =>
        error instanceof HttpErrorResponse && error.status >= 500
          ? timer(RETRY_DELAY)
          : throwError(() => error),
    }),
  );
};
"""

LOG_INT_START = """import { HttpInterceptorFn } from '@angular/common/http';

// Лог запросов: метод, адрес, ответ и сколько он шёл. Через интерцептор проходит каждый запрос HttpClient
export const loggingInterceptor: HttpInterceptorFn = (
  req,
  next,
) => {
  // TODO: вывести в консоль метод, адрес, статус ответа и сколько миллисекунд он шёл
  return next(req);
};
"""

RETRY_INT_START = """import { HttpInterceptorFn } from '@angular/common/http';

// Сколько раз повторять запрос и через сколько миллисекунд
const RETRY_COUNT = 2;
const RETRY_DELAY = 500;

// Повтор при сбое сервера
export const retryInterceptor: HttpInterceptorFn = (
  req,
  next,
) => {
  // TODO: повторить GET-запрос, если сервер ответил 5xx
  return next(req);
};
"""

S7 = dict(R6)
S7['core/logging-interceptor.ts'] = LOG_INT_START
S7['core/retry-interceptor.ts'] = RETRY_INT_START

R7 = dict(S7)
R7['core/logging-interceptor.ts'] = LOG_INT
R7['core/retry-interceptor.ts'] = RETRY_INT
R7 = edit(R7, 'app.config.ts',
    ("import { provideHttpClient } from '@angular/common/http';", """import {
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';"""),
    ("import { routes } from './app.routes';", """import { routes } from './app.routes';
import { loggingInterceptor } from './core/logging-interceptor';
import { retryInterceptor } from './core/retry-interceptor';"""),
    ("""    // HttpClient — клиент HTTP: запросы к серверу через inject(HttpClient)
    provideHttpClient(),""", """    // HttpClient — клиент HTTP: запросы к серверу через inject(HttpClient).
    // Интерцепторы — по порядку: запрос проходит их сверху вниз, ответ — снизу вверх
    provideHttpClient(
      withInterceptors([loggingInterceptor, retryInterceptor]),
    ),"""))

# ---------- 12.8 Кэш GET-запросов ----------

CACHE_INT = """import {
  HttpContextToken,
  HttpInterceptorFn,
  HttpResponse,
} from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { of, tap } from 'rxjs';

// Метка запроса «ответ можно взять из кэша». Значение по умолчанию — нельзя
export const CACHE = new HttpContextToken<boolean>(() => false);

// Сколько ответ живёт в кэше, мс
const MAX_AGE = 10_000;

// Сохранённые ответы: адрес с параметрами → ответ и когда он получен
@Service()
export class ResponseCache {
  private readonly entries = new Map<
    string,
    { response: HttpResponse<unknown>; time: number }
  >();

  get(url: string): HttpResponse<unknown> | undefined {
    const entry = this.entries.get(url);
    return entry && Date.now() - entry.time < MAX_AGE
      ? entry.response
      : undefined;
  }

  set(url: string, response: HttpResponse<unknown>) {
    this.entries.set(url, { response, time: Date.now() });
  }
}

// Кэш GET-запросов с меткой CACHE: свежий ответ из кэша — без запроса к серверу
export const cacheInterceptor: HttpInterceptorFn = (
  req,
  next,
) => {
  if (req.method !== 'GET' || !req.context.get(CACHE)) {
    return next(req);
  }
  // Интерцептор выполняется в контексте внедрения: inject работает
  const cache = inject(ResponseCache);
  const cached = cache.get(req.urlWithParams);
  if (cached) {
    // Поток из одного готового ответа — для того, кто подписан, это обычный ответ сервера
    return of(cached);
  }
  return next(req).pipe(
    tap((event) => {
      if (event instanceof HttpResponse) {
        cache.set(req.urlWithParams, event);
      }
    }),
  );
};
"""

CACHE_INT_START = CACHE_INT[: CACHE_INT.index('// Кэш GET-запросов')] + """// Кэш GET-запросов с меткой CACHE: свежий ответ из кэша — без запроса к серверу
export const cacheInterceptor: HttpInterceptorFn = (
  req,
  next,
) => {
  // TODO: GET с меткой CACHE — свежий ответ из ResponseCache, иначе запрос и сохранение ответа
  return next(req);
};
"""

S8 = dict(R7)
S8['core/cache-interceptor.ts'] = rep(rep(rep(CACHE_INT_START,
    "import { of, tap } from 'rxjs';\n", ''),
    "import { Service, inject } from '@angular/core';", "import { Service } from '@angular/core';"),
    "  HttpInterceptorFn,\n  HttpResponse,\n", "  HttpInterceptorFn,\n  HttpResponse,\n")

R8 = dict(S8)
R8['core/cache-interceptor.ts'] = CACHE_INT
R8 = edit(R8, 'app.config.ts',
    ("import { loggingInterceptor } from './core/logging-interceptor';", "import { cacheInterceptor } from './core/cache-interceptor';\nimport { loggingInterceptor } from './core/logging-interceptor';"),
    ("withInterceptors([loggingInterceptor, retryInterceptor]),", """withInterceptors([
        loggingInterceptor,
        cacheInterceptor,
        retryInterceptor,
      ]),"""))
R8 = edit(R8, 'game/game-title.ts',
    ("""import {
  HttpClient,
  HttpErrorResponse,
} from '@angular/common/http';""", """import {
  HttpClient,
  HttpContext,
  HttpErrorResponse,
} from '@angular/common/http';"""),
    ("import { Game } from '../core/models';", "import { CACHE } from '../core/cache-interceptor';\nimport { Game } from '../core/models';"),
    ("""      http.get<Game>(`/api/games/${route.paramMap.get('id')}`),""", """      http.get<Game>(`/api/games/${route.paramMap.get('id')}`, {
        // Ответ запомнит кэш: через мгновение ту же игру попросит страница
        context: new HttpContext().set(CACHE, true),
      }),"""))
R8 = edit(R8, 'game/game-page.ts',
    ("""import {
  HttpClient,
  HttpErrorResponse,
  httpResource,
} from '@angular/common/http';""", """import {
  HttpClient,
  HttpContext,
  HttpErrorResponse,
  httpResource,
} from '@angular/common/http';"""),
    ("import { CartStore } from '../core/cart-store';", "import { CACHE } from '../core/cache-interceptor';\nimport { CartStore } from '../core/cart-store';"),
    ("""  // Игра с сервера. Сменился id в адресе — новый запрос
  protected readonly game = httpResource<Game>(
    () => `/api/games/${this.id()}`,
  );""", """  // Игра с сервера. Сменился id в адресе — новый запрос.
  // Метка CACHE: только что эту игру загрузил резолвер крошки — ответ возьмём из кэша
  protected readonly game = httpResource<Game>(() => ({
    url: `/api/games/${this.id()}`,
    context: new HttpContext().set(CACHE, true),
  }));"""))

# ---------- 12.9 практикум: автосохранение комментария к заказу ----------

R9 = edit(R8, 'checkout/checkout.ts',
    ("import { Component, inject, signal } from '@angular/core';", """import {
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  takeUntilDestroyed,
  toObservable,
} from '@angular/core/rxjs-interop';"""),
    ("import { RouterLink } from '@angular/router';", "import { RouterLink } from '@angular/router';\nimport { debounceTime, distinctUntilChanged } from 'rxjs';"),
    ("""// Оформление заказа.""", """// Ключ черновика комментария в localStorage
const DRAFT_KEY = 'hod-konem:checkout-comment';
// Пауза в наборе, после которой черновик сохраняется, мс
const SAVE_DELAY = 500;

// Оформление заказа."""),
    ("""  // Комментарий к заказу — состояние интерфейса этой страницы
  protected readonly comment = signal('');

  // Есть ли что потерять, если уйти со страницы. Об этом спрашивает гард canDeactivate
  hasUnsavedChanges(): boolean {
    return this.comment().trim() !== '';
  }""", """  // Комментарий к заказу. Начинаем с черновика, если покупатель уже что-то писал
  protected readonly comment = signal(
    localStorage.getItem(DRAFT_KEY) ?? '',
  );
  // Последний сохранённый текст
  private readonly savedComment = signal(this.comment());
  // Всё ли сохранено: пока покупатель печатает — нет
  protected readonly saved = computed(
    () => this.comment() === this.savedComment(),
  );

  constructor() {
    // Каждое изменение комментария — значение потока. Сохраняем, когда покупатель сделал паузу
    toObservable(this.comment)
      .pipe(
        debounceTime(SAVE_DELAY),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((comment) => {
        localStorage.setItem(DRAFT_KEY, comment);
        this.savedComment.set(comment);
      });
  }"""))
R9 = edit(R9, 'checkout/checkout.html',
    ("""    (input)="comment.set(commentBox.value)"
  ></textarea>
</label>""", """    (input)="comment.set(commentBox.value)"
  ></textarea>
</label>
<p class="draft-status muted">
  @if (!saved()) {
    Сохраняем…
  } @else if (comment()) {
    Черновик сохранён
  }
</p>"""))
R9 = edit(R9, 'checkout/checkout.css', ("""/* Поле комментария */""", """/* Состояние черновика под полем: строка не прыгает, даже когда пустая */
.draft-status {
  min-height: 1.2em;
  margin: 4px 0 0;
  font-size: 13px;
}

/* Поле комментария */"""))
R9 = edit(R9, 'checkout/checkout-guards.ts',
    ("""import {
  CanActivateFn,
  CanDeactivateFn,
  Router,
} from '@angular/router';""", "import { CanActivateFn, Router } from '@angular/router';"),
    ("import { Checkout } from './checkout';\n", ""),
    ("""

// Уходят со страницы с недописанным комментарием — спросить. false отменяет переход
export const unsavedCommentGuard: CanDeactivateFn<Checkout> = (
  checkout,
) =>
  !checkout.hasUnsavedChanges() ||
  confirm(
    'Комментарий к заказу не сохранится. Уйти со страницы?',
  );""", ""))
R9 = edit(R9, 'app.routes.ts',
    ("""import {
  cartNotEmptyGuard,
  unsavedCommentGuard,
} from './checkout/checkout-guards';""", "import { cartNotEmptyGuard } from './checkout/checkout-guards';"),
    ("""    canActivate: [cartNotEmptyGuard],
    // Отпустить со страницы? Спрашивает гард перед уходом
    canDeactivate: [unsavedCommentGuard],""", """    canActivate: [cartNotEmptyGuard],"""))

# ---------- 12.10 под капотом: сигналы против RxJS ----------

DEMO = """import { computed, signal } from '@angular/core';
import { BehaviorSubject, combineLatest, map } from 'rxjs';

// Опыт для шага «Под капотом»: одна и та же производная величина на RxJS и на сигналах.
// Цена игры и цена со скидкой 10 % — обе зависят от одной цены, итог — от обеих («ромб»)
export function compareDiamond() {
  // RxJS: BehaviorSubject — поток, который помнит последнее значение и сразу отдаёт его подписчику
  const price$ = new BehaviorSubject(1000);
  const discounted$ = price$.pipe(map((price) => price * 0.9));
  combineLatest([price$, discounted$]).subscribe(
    ([price, discounted]) =>
      console.log(`RxJS: ${price} → ${discounted}`),
  );

  // Сигналы: то же самое
  const price = signal(1000);
  const discounted = computed(() => price() * 0.9);
  const line = computed(
    () => `Сигналы: ${price()} → ${discounted()}`,
  );
  console.log(line());

  // Цена изменилась
  price$.next(2000);
  price.set(2000);
  console.log(line());
}
"""

S10 = dict(R9)
S10['diamond.ts'] = DEMO
S10 = edit(S10, 'main.ts',
    ("import { appConfig } from './app.config';", "import { appConfig } from './app.config';\nimport { compareDiamond } from './diamond';\n\n// Опыт шага «Под капотом»: вывод — в консоли\ncompareDiamond();"))

steps = {
    '01-observable': {'start': S1, 'solution': R1},
    '02-operators': {'start': R1, 'solution': R2},
    '03-switch-map': {'start': S3, 'solution': R3},
    '04-signals-interop': {'start': R3, 'solution': R4},
    '05-rx-resource': {'start': R4, 'solution': R5},
    '06-cleanup': {'start': R5, 'solution': R6},
    '07-interceptors': {'start': S7, 'solution': R7},
    '08-cache': {'start': S8, 'solution': R8},
    '09-practice': {'start': R8, 'solution': R9},
    '10-signals-vs-rxjs': {'start': S10},
}

if __name__ == '__main__':
    write_steps(ROOT, steps, base='11-http/09-practice')
    print('ok')
