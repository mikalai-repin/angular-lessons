import { inject } from '@angular/core';
import {
  CanActivateFn,
  CanDeactivateFn,
  Router,
} from '@angular/router';
import { CartStore } from '../core/cart-store';
import { Checkout } from './checkout';

// TODO: cartNotEmptyGuard — пустая корзина? Вместо оформления — страница корзины
// TODO: unsavedCommentGuard — уходят с недописанным комментарием? Спросить через confirm()
