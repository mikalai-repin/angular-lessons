# Генератор кода шагов главы 20 «Настоящий проект».
# Запуск: python3 tools/authoring/ch20-gen.py — ПЕРЕЗАПИСЫВАЕТ start/ и solution/ всех шагов главы 20.
#         python3 tools/authoring/ch20-gen.py dump <папка> — полные снимки шагов в <папка>/<шаг>/<start|solution>
#         (для опытов: tools/e2e/run-dir.mjs, exp.mjs и cli-overlay.mjs принимают такую папку).
# Старт главы — решение практикума главы 19 без помощников debug/ (они держатся на отладочном API `ng`
# и внутренностях Angular, в настоящий проект их не переносим) и с main.ts как у `ng new`.
# Глава работает на машине ученика: код в превью — тот же магазин, а проект Angular CLI, команды и файлы,
# которых в превью нет (server.ts, app.config.server.ts, proxy.conf.json), — в тексте уроков.
# Шаги — полные снимки: каждый строится правками (edit) поверх результата предыдущего шага.
# Код форматирует write_steps (как кнопка «Формат» в редакторе). После запуска: npm run validate.
# Тексты уроков (lesson.md) пишутся отдельно, руками; генератор их не трогает.
import os, shutil, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from steps import PROJECT, format_snapshots, read_dir, rep, step_dir, write_steps

ROOT = f'{PROJECT}/content/20-real-project'
BASE = read_dir(step_dir(f'{PROJECT}/content/19-internals/07-practice/solution'))


def edit(files, name, *pairs):
    """Копия снимка, в которой файл name изменён заменами (старое, новое)."""
    out = dict(files)
    text = out[name]
    for old, new in pairs:
        text = rep(text, old, new)
    out[name] = text
    return out


def put(files, **named):
    """Копия снимка с новыми или заменёнными файлами: put(S, **{'core/x.ts': '…'})."""
    out = dict(files)
    out.update(named)
    return out


def drop(files, *names):
    """Копия снимка без файлов names."""
    out = dict(files)
    for name in names:
        del out[name]
    return out


# ---------- 20.1 Angular CLI: магазин без помощников debug/ ----------

S1 = put(
    drop(BASE, 'debug/view-log.ts', 'debug/cd-log.ts', 'debug/signal-lab.ts'),
    **{
        'main.ts': """import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app';
import { appConfig } from './app.config';

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
""",
    },
)


# ---------- 20.3 Сборка: корзина, оформление и вход — ленивые, магазин укладывается в бюджет ----------

S3 = edit(
    S1,
    'app.routes.ts',
    ("import { CartPage } from './cart/cart-page/cart-page';\n", ''),
    ("import { Checkout } from './checkout/checkout';\n", ''),
    ("import { Login } from './login/login';\n", ''),
    (
        """    path: 'cart',
    component: CartPage,""",
        """    path: 'cart',
    // Корзина, оформление и вход — с формами: их код загрузится при первом переходе
    loadComponent: () =>
      import('./cart/cart-page/cart-page').then((m) => m.CartPage),""",
    ),
    (
        """    path: 'checkout',
    component: Checkout,""",
        """    path: 'checkout',
    loadComponent: () =>
      import('./checkout/checkout').then((m) => m.Checkout),""",
    ),
    (
        "  { path: 'login', component: Login, title: 'Вход' },",
        """  {
    path: 'login',
    loadComponent: () =>
      import('./login/login').then((m) => m.Login),
    title: 'Вход',
  },""",
    ),
)

# ---------- 20.5 Генераторы и линтер: замечания ng lint ----------

S5 = edit(
    S3,
    'app.ts',
    (
        """          // Аналитика не важнее магазина — как в CartStore
          .catch(() => {}),""",
        """          // Аналитика не важнее магазина: ошибку — в консоль, дальше она не идёт
          .catch((error) =>
            console.warn('Аналитика недоступна:', error),
          ),""",
    ),
)
S5 = edit(
    S5,
    'core/cart-store.ts',
    (
        """    // Событие — в аналитику. Аналитика не важнее покупки: ошибка не уходит дальше
    const track = (event: string, details: string) =>
      store
        ._analytics()
        .then((analytics) => analytics.track(event, details))
        .catch(() => {});""",
        """    // Событие — в аналитику. Аналитика не важнее покупки: ошибка — в консоль, дальше не уходит
    const track = (event: string, details: string) =>
      store
        ._analytics()
        .then((analytics) => analytics.track(event, details))
        .catch((error) =>
          console.warn('Аналитика недоступна:', error),
        );""",
    ),
)
S5 = edit(
    S5,
    'core/auth-store.ts',
    (
        """        .subscribe({ error: () => {} });""",
        """        .subscribe({
          error: (error) =>
            console.warn('Выход: сервер не ответил', error),
        });""",
    ),
)
S5 = edit(
    S5,
    'layout/quick-search/quick-search.ts',
    ("import { Game, GamesPage } from '../../core/models';", "import { GamesPage } from '../../core/models';"),
)
S5 = edit(
    S5,
    'shared/field-aria.ts',
    (
        """@Directive({
  selector: '[formField]',""",
        """@Directive({
  // eslint-disable-next-line @angular-eslint/directive-selector -- селектор чужой директивы FormField: дополняем её
  selector: '[formField]',""",
    ),
)
S5 = edit(
    S5,
    'shared/rating/rating.html',
    (
        """@for (star of stars; track star) {
  <span""",
        """@for (star of stars; track star) {
  <!-- Клавиатура — у хоста (role="slider", стрелки), мышь — у звёзд -->
  <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
  <span""",
    ),
)

# ---------- 20.7 Рендеринг на сервере: localStorage только в браузере ----------

BROWSER_STORAGE = """import {
  InjectionToken,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

// localStorage браузера. На сервере (SSR, пререндеринг) хранилища нет — null:
// корзина, избранное и вход живут только в браузере покупателя
export const BROWSER_STORAGE = new InjectionToken<Storage | null>(
  'BROWSER_STORAGE',
  {
    providedIn: 'root',
    factory: () =>
      isPlatformBrowser(inject(PLATFORM_ID)) ? localStorage : null,
  },
);
"""

S7 = put(S5, **{'core/browser-storage.ts': BROWSER_STORAGE})
S7 = edit(
    S7,
    'core/with-storage.ts',
    ("import { effect } from '@angular/core';", "import { effect, inject } from '@angular/core';"),
    (
        """      onInit(store) {
        try {
          const saved: unknown = JSON.parse(
            localStorage.getItem(key) ?? 'null',
          );""",
        """      onInit(store) {
        // На сервере хранилища нет: состояние остаётся начальным
        const storage = inject(BROWSER_STORAGE);
        if (!storage) {
          return;
        }
        try {
          const saved: unknown = JSON.parse(
            storage.getItem(key) ?? 'null',
          );""",
    ),
    (
        """          localStorage.setItem(
            key,""",
        """          storage.setItem(
            key,""",
    ),
    ("} from '@ngrx/signals';\n", "} from '@ngrx/signals';\nimport { BROWSER_STORAGE } from './browser-storage';\n"),
)
S7 = edit(
    S7,
    'core/auth-store.ts',
    ("import { User } from './models';", "import { BROWSER_STORAGE } from './browser-storage';\nimport { User } from './models';"),
    ("const refreshToken = localStorage.getItem(REFRESH_KEY);\n    if (refreshToken) {", "const refreshToken = this.storage?.getItem(REFRESH_KEY);\n    if (refreshToken) {"),
    ("""    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  }""", """    this.storage?.removeItem(TOKEN_KEY);
    this.storage?.removeItem(REFRESH_KEY);
  }"""),
    ("const refreshToken = localStorage.getItem(REFRESH_KEY);\n    if (!refreshToken) {", "const refreshToken = this.storage?.getItem(REFRESH_KEY);\n    if (!refreshToken) {"),
    ("const token = localStorage.getItem(TOKEN_KEY);", "const token = this.storage?.getItem(TOKEN_KEY);"),
    (
        "  private readonly http = inject(HttpClient);\n",
        "  private readonly http = inject(HttpClient);\n  // На сервере — null: токенов там нет, покупатель — гость\n  private readonly storage = inject(BROWSER_STORAGE);\n",
    ),
    ("""        localStorage.removeItem(TOKEN_KEY);
      }""", """        this.storage?.removeItem(TOKEN_KEY);
      }"""),
    ("""    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(REFRESH_KEY, refreshToken);""", """    this.storage?.setItem(TOKEN_KEY, token);
    this.storage?.setItem(REFRESH_KEY, refreshToken);"""),
)
S7 = edit(
    S7,
    'core/favorites-effects.ts',
    ("import { favoritesFeature } from './favorites-feature';", "import { BROWSER_STORAGE } from './browser-storage';\nimport { favoritesFeature } from './favorites-feature';"),
    ("""  (actions$ = inject(Actions)) =>
    actions$.pipe(
      ofType(ROOT_EFFECTS_INIT),
      map(() =>
        FavoritesStorageActions.restored({ ids: readIds() }),
      ),""", """  (actions$ = inject(Actions), storage = inject(BROWSER_STORAGE)) =>
    actions$.pipe(
      ofType(ROOT_EFFECTS_INIT),
      map(() =>
        FavoritesStorageActions.restored({ ids: readIds(storage) }),
      ),"""),
    ("""  (actions$ = inject(Actions), store = inject(Store)) =>""", """  (
    actions$ = inject(Actions),
    store = inject(Store),
    storage = inject(BROWSER_STORAGE),
  ) =>"""),
    ("""        localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)),""", """        storage?.setItem(STORAGE_KEY, JSON.stringify(ids)),"""),
    ("""function readIds(): number[] {
  try {
    const saved: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? '[]',""", """function readIds(storage: Storage | null): number[] {
  try {
    const saved: unknown = JSON.parse(
      storage?.getItem(STORAGE_KEY) ?? '[]',"""),
)
S7 = edit(
    S7,
    'checkout/checkout.ts',
    ("import { CartStore } from '../core/cart-store';", "import { BROWSER_STORAGE } from '../core/browser-storage';\nimport { CartStore } from '../core/cart-store';"),
    (
        "  private readonly http = inject(HttpClient);\n",
        "  private readonly http = inject(HttpClient);\n  private readonly storage = inject(BROWSER_STORAGE);\n",
    ),
    ("comment: localStorage.getItem(DRAFT_KEY) ?? '',", "comment: this.storage?.getItem(DRAFT_KEY) ?? '',"),
    ("localStorage.removeItem(DRAFT_KEY);", "this.storage?.removeItem(DRAFT_KEY);"),
    ("localStorage.setItem(DRAFT_KEY, comment);", "this.storage?.setItem(DRAFT_KEY, comment);"),
)

S7 = edit(
    S7,
    'app.ts',
    ("import { Component, inject, injectAsync } from '@angular/core';", """import {
  Component,
  PLATFORM_ID,
  inject,
  injectAsync,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';"""),
    (
        """  constructor() {
    // Просмотр страницы""",
        """  constructor() {
    // Страницу смотрит покупатель в браузере. Сервер (SSR, пререндеринг) просмотров не считает
    if (!isPlatformBrowser(inject(PLATFORM_ID))) {
      return;
    }
    // Просмотр страницы""",
    ),
)

S7 = edit(
    S7,
    'core/shop-config.ts',
    (
        "      priorityCovers: 6,",
        "      // Не больше пяти: с SSR каждая — <link rel=\"preload\"> в <head>, на шестой сервер предупредит (NG02961)\n      priorityCovers: 5,",
    ),
)

# ---------- 20.8 Гидратация: «Со скидкой» на главной гидратируется, когда покупатель до неё дойдёт ----------

S8 = edit(
    S7,
    'home/home.html',
    (
        """<h2 class="section-title">Со скидкой</h2>
@if (sale.hasValue()) {
  <div class="grid">
    @for (game of sale.value().items; track game.id) {
      <app-game-card [game]="game" />
    }
  </div>
} @else if (sale.isLoading()) {
  <div class="grid">
    @for (n of skeletons; track n) {
      <div class="skeleton"></div>
    }
  </div>
} @else {
  <p class="error-message">
    Не удалось загрузить игры со скидкой.
    <button class="link-button" (click)="sale.reload()">
      Повторить
    </button>
  </p>
}""",
        """<h2 class="section-title">Со скидкой</h2>
<!-- Подборка ниже первого экрана. С SSR сервер присылает её готовой, а гидратирует её браузер,
     когда покупатель до неё докрутит. Без SSR — обычный @defer: блок появится в области видимости -->
@defer (on viewport; hydrate on viewport) {
  @if (sale.hasValue()) {
    <div class="grid">
      @for (game of sale.value().items; track game.id) {
        <app-game-card [game]="game" />
      }
    </div>
  } @else if (sale.isLoading()) {
    <div class="grid">
      @for (n of skeletons; track n) {
        <div class="skeleton"></div>
      }
    </div>
  } @else {
    <p class="error-message">
      Не удалось загрузить игры со скидкой.
      <button class="link-button" (click)="sale.reload()">
        Повторить
      </button>
    </p>
  }
} @placeholder {
  <div class="grid">
    @for (n of skeletons; track n) {
      <div class="skeleton"></div>
    }
  </div>
}""",
    ),
)

# ---------- 20.9 Окружения и деплой: журнал запросов — только в режиме разработки ----------

S9 = edit(
    S7,
    'app.config.ts',
    ("  inject,\n", "  inject,\n  isDevMode,\n"),
    (
        """      withInterceptors([
        loggingInterceptor,""",
        """      withInterceptors([
        // Журнал запросов — только при разработке, как журнал действий Store
        ...(isDevMode() ? [loggingInterceptor] : []),""",
    ),
)


steps = {
    '01-angular-cli': {'start': S1},
    '02-move-shop': {'start': S1},
    '03-build': {'start': S1, 'solution': S3},
    '04-strict-templates': {'start': S3},
    '05-cli-tools': {'start': S3, 'solution': S5},
    '06-tests': {'start': S5},
    '07-ssr': {'start': S5, 'solution': S7},
    # Гидратация — только в проекте CLI: в превью без SSR hydrate-триггеры дают NG0508, provideClientHydration — NG0505.
    # Правка home.html (S8) показана в тексте шага и проверена в проекте, в код превью не идёт
    '08-hydration': {'start': S7},
    '09-deploy': {'start': S7, 'solution': S9},
    '10-practice': {'start': S9},
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
        write_steps(ROOT, steps, base='19-internals/07-practice')
    print('ok')
