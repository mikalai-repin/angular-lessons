import { Routes } from '@angular/router';
import { CartPage } from './cart/cart-page/cart-page';
import { Catalog } from './catalog/catalog';
import { Checkout } from './checkout/checkout';
import {
  cartNotEmptyGuard,
  unsavedCommentGuard,
} from './checkout/checkout-guards';
import { gameTitleResolver } from './game/game-title';
import { Home } from './home/home';

// Карта магазина: какой адрес какой странице соответствует
export const routes: Routes = [
  { path: '', component: Home, title: 'Настольные игры' },
  {
    path: 'catalog',
    component: Catalog,
    title: 'Каталог',
  },
  {
    path: 'games/:id',
    // Страница игры загружается отдельно — при первом переходе на неё
    loadComponent: () =>
      import('./game/game-page').then((m) => m.GamePage),
    // Заголовок — название игры: его находит резолвер по :id
    title: gameTitleResolver,
  },
  {
    path: 'cart',
    component: CartPage,
    title: 'Корзина',
  },
  {
    path: 'checkout',
    component: Checkout,
    title: 'Оформление заказа',
    // Пустить на страницу? Спрашивает гард перед переходом
    canActivate: [cartNotEmptyGuard],
    // Отпустить со страницы? Спрашивает гард перед уходом
    canDeactivate: [unsavedCommentGuard],
  },
  {
    path: 'account',
    // Кабинет со всеми вложенными маршрутами — отдельный модуль: загрузится при первом переходе
    loadChildren: () =>
      import('./account/account.routes').then(
        (m) => m.accountRoutes,
      ),
  },
  // TODO: /games → каталог, /game/:id → /games/:id, всё остальное — страница «Нет такой страницы»
];
