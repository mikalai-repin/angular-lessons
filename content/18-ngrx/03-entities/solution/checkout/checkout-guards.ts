import { inject } from '@angular/core';
import {
  CanActivateFn,
  CanDeactivateFn,
  Router,
} from '@angular/router';
import { CartStore } from '../core/cart-store';
import { Checkout } from './checkout';

// Оформлять нечего, если корзина пуста: вместо оформления — страница корзины
export const cartNotEmptyGuard: CanActivateFn = () => {
  const cart = inject(CartStore);
  const router = inject(Router);
  return (
    cart.ids().length > 0 || router.createUrlTree(['/cart'])
  );
};

// Уходят со страницы с заполненной, но не отправленной формой — спросить. false отменяет переход
export const unsavedCheckoutGuard: CanDeactivateFn<Checkout> = (
  checkout,
) =>
  !checkout.hasUnsavedChanges() ||
  confirm('Данные заказа не сохранятся. Уйти со страницы?');
