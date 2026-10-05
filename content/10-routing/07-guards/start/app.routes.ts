import { Routes } from '@angular/router';
import { CartPage } from './cart/cart-page/cart-page';
import { Catalog } from './catalog/catalog';
import { Home } from './home/home';

// Карта магазина: какой адрес какой странице соответствует
export const routes: Routes = [
  { path: '', component: Home },
  {
    path: 'catalog',
    component: Catalog,
  },
  {
    path: 'games/:id',
    // Страница игры загружается отдельно — при первом переходе на неё
    loadComponent: () =>
      import('./game/game-page').then((m) => m.GamePage),
  },
  {
    path: 'cart',
    component: CartPage,
  },
  // TODO: оформление заказа 'checkout' — только с непустой корзиной; спросить, прежде чем уйти с недописанным комментарием
  {
    path: 'account',
    // Кабинет со всеми вложенными маршрутами — отдельный модуль: загрузится при первом переходе
    loadChildren: () =>
      import('./account/account.routes').then(
        (m) => m.accountRoutes,
      ),
  },
];
