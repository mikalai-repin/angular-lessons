import { Routes } from '@angular/router';
import { Catalog } from './catalog/catalog';
import { GamePage } from './game/game-page';
import { NotFound } from './not-found';

export const routes: Routes = [
  { path: '', component: Catalog, title: 'Каталог — Ход конём' },
  { path: 'games/:id', component: GamePage, title: 'Игра — Ход конём' },
  // Корзина грузится лениво: отдельный модуль загружается при первом переходе
  { path: 'cart', loadComponent: () => import('./cart/cart').then((m) => m.CartPage), title: 'Корзина — Ход конём' },
  { path: '**', component: NotFound },
];
