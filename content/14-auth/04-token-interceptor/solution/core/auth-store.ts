import {
  Service,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
} from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { User } from './models';

// Ключ токена в localStorage
const TOKEN_KEY = 'hod-konem:token';

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
  readonly isAdmin = computed(
    () => this.user()?.role === 'admin',
  );

  // Вход: e-mail и пароль — на сервер, токен и пользователя — в хранилище.
  // Ошибку (401 — неверный пароль) получит тот, кто вызвал: форма входа покажет её у себя
  async logIn(credentials: Credentials) {
    const response = await firstValueFrom(
      this.http.post<LoginResponse>('/api/login', credentials),
    );
    this.tokenState.set(response.token);
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
      // Токен к запросу добавит интерцептор: tokenState уже записан
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
}
