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
    cart.items().length > 0 || router.createUrlTree(['/cart'])
  );
};

// Уходят со страницы с недописанным комментарием — спросить. false отменяет переход
export const unsavedCommentGuard: CanDeactivateFn<Checkout> = (
  checkout,
) =>
  !checkout.hasUnsavedChanges() ||
  confirm(
    'Комментарий к заказу не сохранится. Уйти со страницы?',
  );
