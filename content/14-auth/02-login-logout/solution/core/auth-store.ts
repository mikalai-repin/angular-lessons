import {
  Service,
  computed,
  inject,
  signal,
} from '@angular/core';
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
  }

  // Выход: магазин забывает токен и пользователя
  logOut() {
    this.tokenState.set(null);
    this.userState.set(null);
  }
}
