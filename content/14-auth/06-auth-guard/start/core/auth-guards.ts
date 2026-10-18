import { CanActivateFn } from '@angular/router';

// Страница только для вошедших
export const authGuard: CanActivateFn = (_route, state) => {
  // TODO: вошёл — пустить; не вошёл — на /login, а адрес страницы (state.url) — в query-параметр returnUrl
  return true;
};
