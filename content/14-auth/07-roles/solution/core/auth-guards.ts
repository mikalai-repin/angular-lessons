import { inject } from '@angular/core';
import {
  CanActivateFn,
  CanMatchFn,
  Router,
} from '@angular/router';
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

// Раздел только для администратора. Остальным маршрута как будто нет: роутер ищет дальше и находит «**» — 404
export const adminGuard: CanMatchFn = () =>
  inject(AuthStore).isAdmin();
