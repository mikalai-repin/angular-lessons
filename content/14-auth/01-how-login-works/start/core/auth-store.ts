import { Service } from '@angular/core';

// Вход покупателя: токен и пользователь. Единственное место, где магазин знает, кто вошёл
@Service()
export class AuthStore {
  // TODO: токен (string | null) и пользователь (User | null) — закрытые сигналы, снаружи — только чтение
  // TODO: isLoggedIn и isAdmin — вычисляемые сигналы
}
