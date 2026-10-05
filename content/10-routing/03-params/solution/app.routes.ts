import { Routes } from '@angular/router';
import { CartPage } from './cart/cart-page/cart-page';
import { Catalog } from './catalog/catalog';
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
    component: GamePage,
  },
  {
    path: 'cart',
    component: CartPage,
  },
];
