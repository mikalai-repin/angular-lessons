import { Routes } from '@angular/router';
import { CartPage } from './cart/cart-page/cart-page';
import { Catalog } from './catalog/catalog';
import { Account } from './account/account';
import { FavoritesPage } from './account/favorites-page/favorites-page';
import { OrdersPage } from './account/orders-page/orders-page';
import { GamePage } from './game/game-page';
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
    // TODO: загружать страницу игры лениво
    component: GamePage,
  },
  {
    path: 'cart',
    component: CartPage,
  },
  {
    // TODO: загружать кабинет вместе с его маршрутами отдельно — loadChildren
    path: 'account',
    component: Account,
    // Вложенные маршруты: их страницы выводит <router-outlet> внутри Account
    children: [
      // /account → /account/favorites
      { path: '', redirectTo: 'favorites', pathMatch: 'full' },
      { path: 'favorites', component: FavoritesPage },
      { path: 'orders', component: OrdersPage },
    ],
  },
];
