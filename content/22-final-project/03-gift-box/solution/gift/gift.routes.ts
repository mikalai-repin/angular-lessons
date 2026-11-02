import { Routes } from '@angular/router';
import { GiftConfirm } from './gift-confirm';
import { GiftDesign } from './gift-design';
import { GiftGames } from './gift-games';
import {
  designDoneGuard,
  gamesChosenGuard,
} from './gift-guards';
import { GiftLayout } from './gift-layout';

// Маршруты мастера: /gift/games, /gift/design, /gift/confirm. Путь '' — относительно /gift
export const giftRoutes: Routes = [
  {
    path: '',
    component: GiftLayout,
    children: [
      { path: '', redirectTo: 'games', pathMatch: 'full' },
      {
        path: 'games',
        component: GiftGames,
        title: 'Подарок: игры',
        data: { breadcrumb: 'Игры' },
      },
      {
        path: 'design',
        component: GiftDesign,
        title: 'Подарок: упаковка',
        data: { breadcrumb: 'Упаковка' },
        canActivate: [gamesChosenGuard],
      },
      {
        path: 'confirm',
        component: GiftConfirm,
        title: 'Подарок: оформление',
        data: { breadcrumb: 'Оформление' },
        canActivate: [gamesChosenGuard, designDoneGuard],
      },
    ],
  },
];
