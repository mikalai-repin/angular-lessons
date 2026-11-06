import { inject } from '@angular/core';
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

// Страница только для гостей. Вошедшему на странице входа делать нечего — на главную
export const guestGuard: CanActivateFn = () =>
  inject(AuthStore).isLoggedIn()
    ? inject(Router).createUrlTree(['/'])
    : true;
