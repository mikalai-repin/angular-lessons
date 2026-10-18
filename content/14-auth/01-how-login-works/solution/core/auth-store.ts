import { Service, computed, signal } from '@angular/core';
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
  readonly isAdmin = computed(
    () => this.user()?.role === 'admin',
  );
}
