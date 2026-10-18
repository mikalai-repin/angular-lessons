import {
  Service,
  computed,
  inject,
  signal,
} from '@angular/core';
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
export const SKIP_AUTH = new HttpContextToken<boolean>(
  () => false,
);
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
  readonly isAdmin = computed(
    () => this.user()?.role === 'admin',
  );

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
