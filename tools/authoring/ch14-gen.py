# Генератор кода шагов главы 14 «Авторизация».
# Запуск: python3 tools/authoring/ch14-gen.py — ПЕРЕЗАПИСЫВАЕТ start/ и solution/ всех шагов главы 14.
# Старт главы — решение практикума главы 13 (10-practice) + тип User и заготовка AuthStore.
# Шаги — полные снимки: каждый строится правками (edit) поверх результата предыдущего шага.
# Код форматирует write_steps (как кнопка «Формат» в редакторе). После запуска: npm run validate.
# Тексты уроков (lesson.md) пишутся отдельно, руками; генератор их не трогает.
import os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from steps import PROJECT, read_dir, rep, step_dir, write_steps

ROOT = f'{PROJECT}/content/14-auth'
BASE = read_dir(step_dir(f'{PROJECT}/content/13-forms/10-practice/solution'))


def edit(files, name, *pairs):
    """Копия снимка, в которой файл name изменён заменами (старое, новое)."""
    out = dict(files)
    text = out[name]
    for old, new in pairs:
        text = rep(text, old, new)
    out[name] = text
    return out


def put(files, **named):
    """Копия снимка с новыми или заменёнными файлами: put(S, **{'core/auth-store.ts': '…'})."""
    out = dict(files)
    out.update(named)
    return out


# ---------- Старт главы: тип User и заготовка AuthStore ----------

S0 = edit(BASE, 'core/models.ts', ("""// Промокод: GET /api/promo/:code""", """// Пользователь магазина: ответ на вход и GET /api/me
export interface User {
  id: number;
  email: string;
  name: string;
  role: 'user' | 'admin'; // покупатель или администратор
}

// Промокод: GET /api/promo/:code"""))

AUTH_STORE_START = """import { Service } from '@angular/core';

// Вход покупателя: токен и пользователь. Единственное место, где магазин знает, кто вошёл
@Service()
export class AuthStore {
  // TODO: токен (string | null) и пользователь (User | null) — закрытые сигналы, снаружи — только чтение
  // TODO: isLoggedIn и isAdmin — вычисляемые сигналы
}
"""
S0 = put(S0, **{'core/auth-store.ts': AUTH_STORE_START})
# Стили шапки для входа и выхода — готовыми в старте: курс не про CSS
S0 = edit(S0, 'layout/header/header.css',
    (""".cart,
.favorites {
  color: inherit;""", """.cart,
.favorites,
.account {
  color: inherit;"""),
    (""".nav a,
a.cart,
a.favorites {""", """.nav a,
a.cart,
a.favorites,
a.account {"""),
    (""".nav a.active,
a.cart.active,
a.favorites.active {""", """.nav a.active,
a.cart.active,
a.favorites.active,
a.account.active {"""))

S0 = edit(S0, 'layout/header/header.css', ("""/* Ссылка на текущую страницу""", """/* «Выйти» — кнопка, которая выглядит как пункт меню */
.logout {
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  opacity: 0.8;
  cursor: pointer;
}

/* Ссылка на текущую страницу"""))


# ---------- 14.1 Как устроен вход: AuthStore и «Войти» в шапке ----------

AUTH_STORE_1 = """import { Service, computed, signal } from '@angular/core';
import { User } from './models';

// Вход покупателя: токен и пользователь. Единственное место, где магазин знает, кто вошёл
@Service()
export class AuthStore {
  // Токен — пропуск, который сервер выдал при входе. Пока покупатель не вошёл — null
  private readonly tokenState = signal<string | null>(null);
  // Кто вошёл: имя, e-mail, роль. Пока сервер не подтвердил вход — null
  private readonly userState = signal<User | null>(null);

  // Снаружи — только чтение: менять вход могут лишь методы хранилища
  readonly token = this.tokenState.asReadonly();
  readonly user = this.userState.asReadonly();

  // Вошёл ли покупатель: сервер подтвердил, кто он
  readonly isLoggedIn = computed(() => this.user() !== null);
  // Администратор ли он. Роль выдаёт сервер, магазин её только читает
  readonly isAdmin = computed(() => this.user()?.role === 'admin');
}
"""

S1 = put(S0, **{'core/auth-store.ts': AUTH_STORE_1})
S1 = edit(S1, 'layout/header/header.ts',
    ("import { CartStore } from '../../core/cart-store';",
     "import { AuthStore } from '../../core/auth-store';\nimport { CartStore } from '../../core/cart-store';"),
    ("// Шапка магазина: логотип, меню, избранное и сводка корзины",
     "// Шапка магазина: логотип, меню, избранное, сводка корзины и вход"),
    ("""  protected readonly favorites = inject(FavoritesStore);
""", """  protected readonly favorites = inject(FavoritesStore);
  protected readonly auth = inject(AuthStore);
"""))
S1 = edit(S1, 'layout/header/header.html', ("""    >В корзине: {{ cart.count() }} ·
    {{ cart.subtotal() | price }}</a
  >
""", """    >В корзине: {{ cart.count() }} ·
    {{ cart.subtotal() | price }}</a
  >
  <!-- Вошёл — имя со ссылкой в кабинет, не вошёл — «Войти» -->
  @if (auth.user(); as user) {
    <a
      class="account"
      routerLink="/account"
      routerLinkActive="active"
      ariaCurrentWhenActive="page"
      >{{ user.name }}</a
    >
  } @else {
    <a
      class="account"
      routerLink="/login"
      routerLinkActive="active"
      ariaCurrentWhenActive="page"
      >Войти</a
    >
  }
"""))
# ---------- 14.2 Вход и выход ----------

AUTH_STORE_2 = """import { Service, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { User } from './models';

// E-mail и пароль для входа
export interface Credentials {
  email: string;
  password: string;
}

// Ответ сервера на вход: токен и пользователь
interface LoginResponse {
  token: string;
  user: User;
}

// Вход покупателя: токен и пользователь. Единственное место, где магазин знает, кто вошёл
@Service()
export class AuthStore {
  private readonly http = inject(HttpClient);

  // Токен — пропуск, который сервер выдал при входе. Пока покупатель не вошёл — null
  private readonly tokenState = signal<string | null>(null);
  // Кто вошёл: имя, e-mail, роль. Пока сервер не подтвердил вход — null
  private readonly userState = signal<User | null>(null);

  // Снаружи — только чтение: менять вход могут лишь методы хранилища
  readonly token = this.tokenState.asReadonly();
  readonly user = this.userState.asReadonly();

  // Вошёл ли покупатель: сервер подтвердил, кто он
  readonly isLoggedIn = computed(() => this.user() !== null);
  // Администратор ли он. Роль выдаёт сервер, магазин её только читает
  readonly isAdmin = computed(() => this.user()?.role === 'admin');

  // Вход: e-mail и пароль — на сервер, токен и пользователя — в хранилище.
  // Ошибку (401 — неверный пароль) получит тот, кто вызвал: форма входа покажет её у себя
  async logIn(credentials: Credentials) {
    const response = await firstValueFrom(
      this.http.post<LoginResponse>('/api/login', credentials),
    );
    this.tokenState.set(response.token);
    this.userState.set(response.user);
  }

  // Выход: магазин забывает токен и пользователя
  logOut() {
    this.tokenState.set(null);
    this.userState.set(null);
  }
}
"""

S2 = put(S1, **{'core/auth-store.ts': AUTH_STORE_2})
S2 = edit(S2, 'login/login.ts',
    ("""import { Component, inject, signal } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
} from '@angular/common/http';
""", """import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
"""),
    ("""} from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { emailRules } from '../shared/form-rules';

// Данные формы входа
interface LoginData {
  email: string;
  password: string;
}

// Ответ сервера на вход: токен и пользователь
interface LoginResponse {
  token: string;
  user: { name: string; email: string; role: string };
}

// Страница входа: e-mail и пароль уходят на сервер. Что делать с токеном, разберём в главе 14
""", """} from '@angular/forms/signals';
import { Router } from '@angular/router';
import { AuthStore, Credentials } from '../core/auth-store';
import { emailRules } from '../shared/form-rules';

// Страница входа: e-mail и пароль уходят на сервер, токен и пользователя запоминает AuthStore
"""),
    ("""export class Login {
  private readonly http = inject(HttpClient);
  // Имя пользователя после удачного входа
  protected readonly userName = signal('');
""", """export class Login {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
"""),
    ("signal<LoginData>({", "signal<Credentials>({"),
    ("""    try {
      const response = await firstValueFrom(
        this.http.post<LoginResponse>(
          '/api/login',
          this.model(),
        ),
      );
      this.userName.set(response.user.name);
      return undefined;""", """    try {
      await this.auth.logIn(this.model());
      // Вошли — на главную. Вернуть покупателя туда, откуда он пришёл, научимся в шаге про гарды
      this.router.navigateByUrl('/');
      return undefined;"""))
LOGIN_HTML = S1['login/login.html']
LOGIN_HTML_2 = rep(LOGIN_HTML, """<h1>Вход</h1>
@if (userName()) {
  <p>Здравствуйте, {{ userName() }}! Вы вошли.</p>
} @else {
""", """<h1>Вход</h1>
""")
assert LOGIN_HTML_2.rstrip().endswith('</form>\n}')
LOGIN_HTML_2 = LOGIN_HTML_2.rstrip()[:-1].rstrip() + '\n'
# отступ формы — на уровень выше (Prettier выровнял бы и сам)
LOGIN_HTML_2 = '\n'.join(line[2:] if line.startswith('  ') else line for line in LOGIN_HTML_2.split('\n'))
S2 = put(S2, **{'login/login.html': LOGIN_HTML_2})
S2 = edit(S2, 'layout/header/header.html', ("""      >Каталог</a
    >
    <app-quick-search />""", """      >Каталог</a
    >
    <app-quick-search />
    @if (auth.isLoggedIn()) {
      <button class="logout" (click)="auth.logOut()">
        Выйти
      </button>
    }"""))
# ---------- 14.3 Сессия после перезагрузки ----------

S3 = edit(S2, 'core/auth-store.ts',
    ("""import { HttpClient } from '@angular/common/http';""", """import {
  HttpClient,
  HttpErrorResponse,
} from '@angular/common/http';"""),
    ("""// E-mail и пароль для входа""", """// Ключ токена в localStorage
const TOKEN_KEY = 'hod-konem:token';

// E-mail и пароль для входа"""),
    ("""    this.tokenState.set(response.token);
    this.userState.set(response.user);
  }

  // Выход: магазин забывает токен и пользователя
  logOut() {
    this.tokenState.set(null);
    this.userState.set(null);
  }
""", """    this.tokenState.set(response.token);
    this.userState.set(response.user);
    // Токен переживёт перезагрузку страницы. Пользователя не сохраняем: о нём заново расскажет сервер
    localStorage.setItem(TOKEN_KEY, response.token);
  }

  // Выход: магазин забывает токен и пользователя
  logOut() {
    this.tokenState.set(null);
    this.userState.set(null);
    localStorage.removeItem(TOKEN_KEY);
  }

  // Вход после перезагрузки: токен — из localStorage, пользователь — от сервера (GET /api/me).
  // Ошибок не бросает: если сервер токен не принял, покупатель просто не вошёл
  async restore() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      return;
    }
    this.tokenState.set(token);
    try {
      const user = await firstValueFrom(
        this.http.get<User>('/api/me', {
          // Пропуск — в заголовке Authorization: так его ждёт сервер
          headers: { Authorization: `Bearer ${token}` },
        }),
      );
      this.userState.set(user);
    } catch (error) {
      this.tokenState.set(null);
      // 401 — сервер токен не принял (истёк или подделан): забываем его.
      // Сервер недоступен — не вошли, но токен оставляем до следующего запуска
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401
      ) {
        localStorage.removeItem(TOKEN_KEY);
      }
    }
  }
"""))
S3 = edit(S3, 'app.config.ts',
    ("""  LOCALE_ID,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';""", """  LOCALE_ID,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';"""),
    ("""import { routes } from './app.routes';
""", """import { routes } from './app.routes';
import { AuthStore } from './core/auth-store';
"""),
    ("""    provideBrowserGlobalErrorListeners(),
""", """    provideBrowserGlobalErrorListeners(),
    // До запуска приложения — восстановить вход. Первая страница появится, когда ответит сервер
    provideAppInitializer(() => inject(AuthStore).restore()),
"""))

# ---------- 14.4 Токен в запросах: интерцептор ----------

AUTH_INTERCEPTOR_START = """import { HttpInterceptorFn } from '@angular/common/http';

// Токен — в каждый запрос к нашему серверу
export const authInterceptor: HttpInterceptorFn = (
  req,
  next,
) => {
  // TODO: если покупатель вошёл и запрос идёт на /api/…, добавить заголовок Authorization
  return next(req);
};
"""

AUTH_INTERCEPTOR_4 = """import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthStore } from './auth-store';

// Токен — в каждый запрос к нашему серверу
export const authInterceptor: HttpInterceptorFn = (
  req,
  next,
) => {
  const token = inject(AuthStore).token();
  // Не вошёл — пропуска нет. Чужой адрес — пропуск не отдаём: токен нужен только нашему серверу
  if (!token || !req.url.startsWith('/api/')) {
    return next(req);
  }
  // Запрос менять нельзя — только сделать копию с новым заголовком
  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }),
  );
};
"""

S4_START = put(S3, **{'core/auth-interceptor.ts': AUTH_INTERCEPTOR_START})
S4 = put(S4_START, **{'core/auth-interceptor.ts': AUTH_INTERCEPTOR_4})
S4 = edit(S4, 'core/auth-store.ts', ("""      const user = await firstValueFrom(
        this.http.get<User>('/api/me', {
          // Пропуск — в заголовке Authorization: так его ждёт сервер
          headers: { Authorization: `Bearer ${token}` },
        }),
      );""", """      // Токен к запросу добавит интерцептор: tokenState уже записан
      const user = await firstValueFrom(
        this.http.get<User>('/api/me'),
      );"""))
S4 = edit(S4, 'app.config.ts',
    ("""import { AuthStore } from './core/auth-store';
""", """import { authInterceptor } from './core/auth-interceptor';
import { AuthStore } from './core/auth-store';
"""),
    ("""        loggingInterceptor,
        cacheInterceptor,""", """        loggingInterceptor,
        authInterceptor,
        cacheInterceptor,"""))
S4 = edit(S4, 'game/game-page.ts',
    ("""import { CACHE } from '../core/cache-interceptor';""", """import { AuthStore } from '../core/auth-store';
import { CACHE } from '../core/cache-interceptor';"""),
    ("""  protected readonly cart = inject(CartStore);
  // Сколько штук""", """  protected readonly cart = inject(CartStore);
  private readonly auth = inject(AuthStore);
  // Сколько штук"""),
    ("""      author: 'Вы',""", """      // Подпись — как у сервера: имя вошедшего или «Гость»
      author: this.auth.user()?.name ?? 'Гость',"""))

# ---------- 14.5 Ответ 401 ----------

AUTH_INTERCEPTOR_5 = """import {
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthStore } from './auth-store';

// Токен — в каждый запрос к нашему серверу. Сервер его больше не принимает — выход
export const authInterceptor: HttpInterceptorFn = (
  req,
  next,
) => {
  // inject — сразу, пока идёт вызов интерцептора: ответ придёт позже, вне контекста внедрения
  const auth = inject(AuthStore);
  const router = inject(Router);
  const token = auth.token();
  // Не вошёл — пропуска нет. Чужой адрес — пропуск не отдаём: токен нужен только нашему серверу
  if (!token || !req.url.startsWith('/api/')) {
    return next(req);
  }
  // Запрос менять нельзя — только сделать копию с новым заголовком
  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }),
  ).pipe(
    catchError((error: unknown) => {
      // 401 на запрос с токеном: пропуск истёк или недействителен — сессия закончилась.
      // Проверка входа после перезагрузки (покупатель ещё не вошёл) разбирается с 401 сама
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        auth.isLoggedIn()
      ) {
        auth.logOut();
        router.navigateByUrl('/login');
      }
      // Ошибку отдаём дальше: тот, кто отправлял запрос, тоже должен о ней узнать
      return throwError(() => error);
    }),
  );
};
"""
S5 = put(S4, **{'core/auth-interceptor.ts': AUTH_INTERCEPTOR_5})

# ---------- 14.6 Гард входа и возврат ----------

AUTH_GUARDS_START = """import { CanActivateFn } from '@angular/router';

// Страница только для вошедших
export const authGuard: CanActivateFn = (_route, state) => {
  // TODO: вошёл — пустить; не вошёл — на /login, а адрес страницы (state.url) — в query-параметр returnUrl
  return true;
};
"""

AUTH_GUARDS_6 = """import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from './auth-store';

// Страница только для вошедших. Не вошёл — на страницу входа, а куда он шёл — в returnUrl
export const authGuard: CanActivateFn = (_route, state) => {
  if (inject(AuthStore).isLoggedIn()) {
    return true;
  }
  return inject(Router).createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url },
  });
};
"""

S6_START = put(S5, **{'core/auth-guards.ts': AUTH_GUARDS_START})
S6 = put(S6_START, **{'core/auth-guards.ts': AUTH_GUARDS_6})
S6 = edit(S6, 'account/account.routes.ts',
    ("""import { Routes } from '@angular/router';
""", """import { Routes } from '@angular/router';
import { authGuard } from '../core/auth-guards';
"""),
    ("""        component: OrdersPage,
        title: 'Мои заказы',""", """        component: OrdersPage,
        title: 'Мои заказы',
        // Заказы — только свои: без входа сервер их не покажет, а гард не пустит на страницу
        canActivate: [authGuard],"""))
S6 = edit(S6, 'login/login.ts',
    ("""import { Component, inject, signal } from '@angular/core';""", """import {
  Component,
  inject,
  input,
  signal,
} from '@angular/core';"""),
    ("""export class Login {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
""", """export class Login {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  // Куда вернуться после входа: query-параметр ?returnUrl=… (его ставит гард).
  // Во вход его кладёт роутер — withComponentInputBinding, как в главе 10
  readonly returnUrl = input<string>();
"""),
    ("""      await this.auth.logIn(this.model());
      // Вошли — на главную. Вернуть покупателя туда, откуда он пришёл, научимся в шаге про гарды
      this.router.navigateByUrl('/');""", """      await this.auth.logIn(this.model());
      // Вошли — туда, откуда пришли, или на главную
      this.router.navigateByUrl(safeReturnUrl(this.returnUrl()));"""))
S6 = put(S6, **{'login/login.ts': S6['login/login.ts'] + """
// Возвращаем только на свои страницы: «/…», но не «//…» — так браузер пишет адрес другого сайта.
// Ссылку с returnUrl мог составить кто угодно, и вести она могла куда угодно
function safeReturnUrl(url: string | undefined): string {
  return url?.startsWith('/') && !url.startsWith('//')
    ? url
    : '/';
}
"""})
S6 = edit(S6, 'core/auth-interceptor.ts', ("""        auth.logOut();
        router.navigateByUrl('/login');""", """        auth.logOut();
        // После входа — обратно на эту страницу
        router.navigate(['/login'], {
          queryParams: { returnUrl: router.url },
        });"""))

# ---------- 14.7 Роли: админка только для администратора ----------

ADMIN_ROUTES = """import { Routes } from '@angular/router';
import { AdminHome } from './admin-home/admin-home';

// Только для урока: строка появится в консоли, когда браузер загрузит этот модуль
console.log('Админка: модуль загружен');

// Маршруты админки. Разделы «Игры» и «Заказы» появятся в главе 17
export const adminRoutes: Routes = [
  { path: '', component: AdminHome, title: 'Админка' },
];
"""

ADMIN_HOME_TS = """import { Component } from '@angular/core';
import {
  HttpErrorResponse,
  httpResource,
} from '@angular/common/http';

// Сводка магазина для администратора: GET /api/admin/summary
interface AdminSummary {
  games: number; // игр в каталоге
  outOfStock: number; // из них нет в наличии
  orders: number; // заказов
  users: number; // пользователей
}

// Главная страница админки: сводка магазина. Данные отдаёт только администратору сам сервер
@Component({
  selector: 'app-admin-home',
  templateUrl: './admin-home.html',
})
export class AdminHome {
  protected readonly summary = httpResource<AdminSummary>(
    () => '/api/admin/summary',
  );

  // Что ответил сервер, если отказал: «403 — Недостаточно прав»
  protected errorText(error: unknown) {
    return error instanceof HttpErrorResponse
      ? `${error.status} — ${error.error?.message}`
      : 'сервер недоступен';
  }
}
"""

ADMIN_HOME_HTML = """<h1>Админка</h1>
@if (summary.hasValue()) {
  @let s = summary.value();
  <ul>
    <li>Игр в каталоге: {{ s.games }}, нет в наличии: {{ s.outOfStock }}</li>
    <li>Заказов: {{ s.orders }}</li>
    <li>Пользователей: {{ s.users }}</li>
  </ul>
  <p class="muted">Разделы «Игры» и «Заказы» появятся в главе 17.</p>
} @else if (summary.isLoading()) {
  <p class="muted">Загружаем сводку…</p>
} @else if (summary.error(); as error) {
  <p class="error-message">
    Сервер отказал: {{ errorText(error) }}
  </p>
}
"""

S7_START = put(S6, **{
    'admin/admin.routes.ts': ADMIN_ROUTES,
    'admin/admin-home/admin-home.ts': ADMIN_HOME_TS,
    'admin/admin-home/admin-home.html': ADMIN_HOME_HTML,
})
S7_START = edit(S7_START, 'core/auth-guards.ts', ("""import { CanActivateFn, Router } from '@angular/router';""", """import {
  CanActivateFn,
  CanMatchFn,
  Router,
} from '@angular/router';"""), ("""    queryParams: { returnUrl: state.url },
  });
};
""", """    queryParams: { returnUrl: state.url },
  });
};

// Раздел только для администратора
export const adminGuard: CanMatchFn = () => {
  // TODO: true — только если вошёл администратор
  return true;
};
"""))
S7 = edit(S7_START, 'core/auth-guards.ts', ("""// Раздел только для администратора
export const adminGuard: CanMatchFn = () => {
  // TODO: true — только если вошёл администратор
  return true;
};""", """// Раздел только для администратора. Остальным маршрута как будто нет: роутер ищет дальше и находит «**» — 404
export const adminGuard: CanMatchFn = () =>
  inject(AuthStore).isAdmin();"""))
S7 = edit(S7, 'app.routes.ts', ("""  // Без id игры показывать нечего""", """  {
    path: 'admin',
    // canMatch: не администратору маршрут не подходит — и код админки даже не загружается
    canMatch: [adminGuard],
    loadChildren: () =>
      import('./admin/admin.routes').then((m) => m.adminRoutes),
    data: { breadcrumb: 'Админка' },
  },
  // Без id игры показывать нечего"""), ("""import { gameTitleResolver } from './game/game-title';""", """import { adminGuard } from './core/auth-guards';
import { gameTitleResolver } from './game/game-title';"""))
S7 = edit(S7, 'layout/header/header.html', ("""    <app-quick-search />
    @if (auth.isLoggedIn()) {""", """    <!-- Ссылка — только удобство: защищают админку гард и сервер -->
    @if (auth.isAdmin()) {
      <a
        routerLink="/admin"
        routerLinkActive="active"
        ariaCurrentWhenActive="page"
        >Админка</a
      >
    }
    <app-quick-search />
    @if (auth.isLoggedIn()) {"""))

# ---------- 14.8 Обновление токена: refresh-токен ----------

AUTH_STORE_8 = """import { Service, computed, inject, signal } from '@angular/core';
import {
  HttpClient,
  HttpContext,
  HttpContextToken,
  HttpErrorResponse,
} from '@angular/common/http';
import {
  Observable,
  finalize,
  firstValueFrom,
  map,
  shareReplay,
  throwError,
} from 'rxjs';
import { User } from './models';

// Ключи токенов в localStorage
const TOKEN_KEY = 'hod-konem:token';
const REFRESH_KEY = 'hod-konem:refresh-token';

// Метка запроса «без токена»: обновление и выход сами несут refresh-токен в теле.
// Метка — здесь, а не в интерцепторе: интерцептор импортирует этот файл, а круговых импортов превью не умеет
export const SKIP_AUTH = new HttpContextToken<boolean>(() => false);
const skipAuth = () => new HttpContext().set(SKIP_AUTH, true);

// E-mail и пароль для входа
export interface Credentials {
  email: string;
  password: string;
}

// Пара токенов: короткий пропуск для запросов и долгий — чтобы получить новый пропуск
interface Tokens {
  token: string;
  refreshToken: string;
}

// Ответ сервера на вход: токены и пользователь
interface LoginResponse extends Tokens {
  user: User;
}

// Вход покупателя: токены и пользователь. Единственное место, где магазин знает, кто вошёл
@Service()
export class AuthStore {
  private readonly http = inject(HttpClient);

  // Токен — пропуск, который сервер выдал при входе. Пока покупатель не вошёл — null
  private readonly tokenState = signal<string | null>(null);
  // Кто вошёл: имя, e-mail, роль. Пока сервер не подтвердил вход — null
  private readonly userState = signal<User | null>(null);
  // Обновление, которое уже идёт: все, кому нужен новый токен, ждут его, а не отправляют своё
  private refreshing: Observable<string> | null = null;

  // Снаружи — только чтение: менять вход могут лишь методы хранилища
  readonly token = this.tokenState.asReadonly();
  readonly user = this.userState.asReadonly();

  // Вошёл ли покупатель: сервер подтвердил, кто он
  readonly isLoggedIn = computed(() => this.user() !== null);
  // Администратор ли он. Роль выдаёт сервер, магазин её только читает
  readonly isAdmin = computed(() => this.user()?.role === 'admin');

  // Вход: e-mail и пароль — на сервер, токены и пользователя — в хранилище.
  // Ошибку (401 — неверный пароль) получит тот, кто вызвал: форма входа покажет её у себя
  async logIn(credentials: Credentials) {
    const response = await firstValueFrom(
      this.http.post<LoginResponse>('/api/login', credentials),
    );
    this.saveTokens(response);
    this.userState.set(response.user);
  }

  // Выход: сервер отзывает refresh-токен, магазин забывает всё
  logOut() {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (refreshToken) {
      // Ответа не ждём: выйти нужно сразу, даже если сервер недоступен
      this.http
        .post(
          '/api/logout',
          { refreshToken },
          { context: skipAuth() },
        )
        .subscribe({ error: () => {} });
    }
    this.tokenState.set(null);
    this.userState.set(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  }

  // Новый пропуск по refresh-токену. Сколько бы запросов ни попросили, к серверу уйдёт один:
  // shareReplay раздаёт его ответ всем, а finalize разрешает следующее обновление, когда это закончилось
  refresh(): Observable<string> {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (!refreshToken) {
      return throwError(() => new Error('Нет refresh-токена'));
    }
    this.refreshing ??= this.http
      .post<Tokens>(
        '/api/refresh',
        { refreshToken },
        { context: skipAuth() },
      )
      .pipe(
        map((tokens) => {
          this.saveTokens(tokens);
          return tokens.token;
        }),
        finalize(() => (this.refreshing = null)),
        shareReplay(1),
      );
    return this.refreshing;
  }

  // Вход после перезагрузки: токен — из localStorage, пользователь — от сервера (GET /api/me).
  // Ошибок не бросает: если сервер токен не принял, покупатель просто не вошёл
  async restore() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      return;
    }
    this.tokenState.set(token);
    try {
      // Токен к запросу добавит интерцептор, он же обновит истёкший
      const user = await firstValueFrom(
        this.http.get<User>('/api/me'),
      );
      this.userState.set(user);
    } catch (error) {
      this.tokenState.set(null);
      // 401 — сервер токен не принял (истёк или подделан): забываем его.
      // Сервер недоступен — не вошли, но токен оставляем до следующего запуска
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401
      ) {
        localStorage.removeItem(TOKEN_KEY);
      }
    }
  }

  // Токены — в сигнал и в localStorage: так они переживут перезагрузку
  private saveTokens({ token, refreshToken }: Tokens) {
    this.tokenState.set(token);
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(REFRESH_KEY, refreshToken);
  }
}
"""

AUTH_INTERCEPTOR_8 = """import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthStore, SKIP_AUTH } from './auth-store';

// Копия запроса с пропуском в заголовке: сам запрос менять нельзя
function withToken(req: HttpRequest<unknown>, token: string) {
  return req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });
}

// Токен — в каждый запрос к нашему серверу. Истёк — обновить и повторить запрос, не вышло — выход
export const authInterceptor: HttpInterceptorFn = (
  req,
  next,
) => {
  // inject — сразу, пока идёт вызов интерцептора: ответ придёт позже, вне контекста внедрения
  const auth = inject(AuthStore);
  const router = inject(Router);
  const token = auth.token();
  // Не вошёл — пропуска нет. Чужой адрес — пропуск не отдаём: токен нужен только нашему серверу.
  // Обновление и выход — без пропуска: истёкший токен там только помешал бы
  if (
    !token ||
    !req.url.startsWith('/api/') ||
    req.context.get(SKIP_AUTH)
  ) {
    return next(req);
  }
  return next(withToken(req, token)).pipe(
    catchError((error: unknown) => {
      if (
        !(error instanceof HttpErrorResponse) ||
        error.status !== 401
      ) {
        return throwError(() => error);
      }
      // 401: пропуск истёк. Получаем новый и повторяем тот же запрос с ним
      return auth.refresh().pipe(
        catchError((refreshError: unknown) => {
          // Сервер обновления недоступен — сессия, может быть, жива: не выходим, отдаём ошибку дальше
          if (
            refreshError instanceof HttpErrorResponse &&
            refreshError.status !== 401
          ) {
            return throwError(() => refreshError);
          }
          // Refresh-токен не принят (или его нет) — сессия закончилась.
          // Проверка входа после перезагрузки разбирается сама
          if (auth.isLoggedIn()) {
            router.navigate(['/login'], {
              queryParams: { returnUrl: router.url },
            });
          }
          auth.logOut();
          return throwError(() => error);
        }),
        switchMap((fresh) => next(withToken(req, fresh))),
      );
    }),
  );
};
"""

S8 = put(S7, **{'core/auth-store.ts': AUTH_STORE_8, 'core/auth-interceptor.ts': AUTH_INTERCEPTOR_8})

# ---------- 14.9 Практикум: личный кабинет ----------
# В старте: тип Order и готовые стили списка заказов (компонент-заглушка подключает их через styleUrl)

ORDERS_PAGE_CSS = """/* Заказ в списке: номер и дата, под ними — сколько игр и сумма */
.order {
  padding: 8px 0;
  border-bottom: 1px solid #d2d2d7;
}

.order h2 {
  margin: 0 0 4px;
  font-size: 16px;
}

.order p {
  margin: 0;
}
"""

S9_START = edit(S8, 'core/models.ts', ("""// Позиция корзины""", """// Заказ: ответ на POST /api/orders, список своих заказов — GET /api/orders
export interface Order {
  id: number;
  userId: number | null; // null — оформлен без входа
  items: { gameId: number; quantity: number }[];
  total: number; // к оплате, ₽
  createdAt: string; // '2026-10-18T09:30:00.000Z'
}

// Позиция корзины"""))

ORDERS_PAGE_TS = """import { Component } from '@angular/core';
import { DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { Order } from '../../core/models';
import { PricePipe } from '../../shared/price-pipe';

// Раздел кабинета «Заказы»: заказы, оформленные после входа
@Component({
  selector: 'app-orders-page',
  imports: [DatePipe, PricePipe, RouterLink],
  templateUrl: './orders-page.html',
  styleUrl: './orders-page.css',
})
export class OrdersPage {
  // Свои заказы: кто спрашивает, сервер узнает по токену — его добавит интерцептор
  protected readonly orders = httpResource<Order[]>(
    () => '/api/orders',
  );

  // Сколько игр в заказе, штук
  protected count(order: Order) {
    return order.items.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );
  }
}
"""

ORDERS_PAGE_HTML = """@if (orders.hasValue()) {
  @for (order of orders.value(); track order.id) {
    <article class="order">
      <h2>
        Заказ №{{ order.id }} ·
        {{ order.createdAt | date: 'longDate' }}
      </h2>
      <p class="muted">
        Игр: {{ count(order) }} · {{ order.total | price }}
      </p>
    </article>
  } @empty {
    <p class="muted">
      Вы ещё ничего не заказывали.
      <a routerLink="/catalog">Перейти в каталог</a>
    </p>
  }
} @else if (orders.isLoading()) {
  <p class="muted">Загружаем заказы…</p>
} @else if (orders.error()) {
  <p class="error-message">Не удалось загрузить заказы.</p>
  <button class="link-button" (click)="orders.reload()">
    Повторить
  </button>
}
"""


S9_START = put(S9_START, **{'account/orders-page/orders-page.css': ORDERS_PAGE_CSS})
S9_START = edit(S9_START, 'account/orders-page/orders-page.ts', ("export class OrdersPage {}", "export class OrdersPage {\n  // TODO: заказы покупателя с сервера — GET /api/orders\n}"), ("  templateUrl: './orders-page.html',\n})", "  templateUrl: './orders-page.html',\n  styleUrl: './orders-page.css',\n})"))
S9 = put(S9_START, **{
    'account/orders-page/orders-page.ts': ORDERS_PAGE_TS,
    'account/orders-page/orders-page.html': ORDERS_PAGE_HTML,
})
S9 = edit(S9, 'account/account.routes.ts', ("""        // Заказы — только свои: без входа сервер их не покажет, а гард не пустит на страницу
        canActivate: [authGuard],""", """        // Заказы — только свои: без входа сервер их не покажет, а гард не пустит на страницу
        canActivate: [authGuard],
        // Гард — при каждом переходе, даже на тот же адрес: так «Выйти» уведёт со страницы
        runGuardsAndResolvers: 'always',"""))
S9 = edit(S9, 'layout/header/header.ts',
    ("""import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';""", """import { Component, computed, inject } from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';"""),
    ("""  protected readonly auth = inject(AuthStore);
}""", """  protected readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  // Куда вернуть покупателя после входа: на текущую страницу.
  // lastSuccessfulNavigation — сигнал: после каждого перехода адрес пересчитается (как в крошках)
  protected readonly returnUrl = computed(() => {
    this.router.lastSuccessfulNavigation();
    const url = this.router.url;
    // Со страницы входа возвращаться на неё же незачем
    return url.startsWith('/login') ? null : url;
  });

  // Выход. Если страница только для вошедших, гард уведёт с неё: проходим по тому же адресу ещё раз
  protected logOut() {
    this.auth.logOut();
    this.router.navigateByUrl(this.router.url, {
      onSameUrlNavigation: 'reload',
    });
  }
}"""))
S9 = edit(S9, 'layout/header/header.html',
    ("""      class="account"
      routerLink="/login"
      routerLinkActive="active\"""", """      class="account"
      routerLink="/login"
      [queryParams]="{ returnUrl: returnUrl() }"
      routerLinkActive="active\""""),
    ("""<button class="logout" (click)="auth.logOut()">""", """<button class="logout" (click)="logOut()">"""))
S9 = edit(S9, 'checkout/checkout.ts',
    ("""import { CartStore } from '../core/cart-store';""", """import { AuthStore } from '../core/auth-store';
import { CartStore } from '../core/cart-store';"""),
    ("""  protected readonly cart = inject(CartStore);
  private readonly http = inject(HttpClient);""", """  protected readonly cart = inject(CartStore);
  protected readonly auth = inject(AuthStore);
  private readonly http = inject(HttpClient);"""))
S9 = edit(S9, 'checkout/checkout.html', ("""  <p>Спасибо! Мы свяжемся с вами, когда заказ будет готов.</p>
  <a routerLink="/catalog">Вернуться в каталог</a>""", """  <p>Спасибо! Мы свяжемся с вами, когда заказ будет готов.</p>
  <!-- Заказ с токеном сервер записал на покупателя: он есть в «Моих заказах» -->
  @if (auth.isLoggedIn()) {
    <p><a routerLink="/account/orders">Мои заказы</a></p>
  }
  <a routerLink="/catalog">Вернуться в каталог</a>"""))

steps = {
    '01-how-login-works': {'start': S0, 'solution': S1},
    '02-login-logout': {'start': S1, 'solution': S2},
    '03-session': {'start': S2, 'solution': S3},
    '04-token-interceptor': {'start': S4_START, 'solution': S4},
    '05-unauthorized': {'start': S4, 'solution': S5},
    '06-auth-guard': {'start': S6_START, 'solution': S6},
    '07-roles': {'start': S7_START, 'solution': S7},
    '08-refresh-token': {'start': S7, 'solution': S8},
    '09-practice': {'start': S9_START, 'solution': S9},
    # 14.10 Безопасность сессии: теория и опыты, без решения
    '10-session-security': {'start': S9},
}

if __name__ == '__main__':
    write_steps(ROOT, steps, base='13-forms/10-practice')
    print('ok')
