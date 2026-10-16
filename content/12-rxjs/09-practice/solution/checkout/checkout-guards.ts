import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CartStore } from '../core/cart-store';

// Оформлять нечего, если корзина пуста: вместо оформления — страница корзины
export const cartNotEmptyGuard: CanActivateFn = () => {
  const cart = inject(CartStore);
  const router = inject(Router);
  return (
    cart.items().length > 0 || router.createUrlTree(['/cart'])
  );
};
