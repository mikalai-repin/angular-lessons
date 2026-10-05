import { Routes } from '@angular/router';
import { Account } from './account';
import { FavoritesPage } from './favorites-page/favorites-page';
import { OrdersPage } from './orders-page/orders-page';

// Только для урока: строка появится в консоли, когда браузер загрузит этот модуль
console.log('Кабинет: модуль загружен');

// Маршруты кабинета. Путь '' — относительно родителя: адрес /account уже совпал в app.routes.ts
export const accountRoutes: Routes = [
  {
    path: '',
    component: Account,
    children: [
      { path: '', redirectTo: 'favorites', pathMatch: 'full' },
      {
        path: 'favorites',
        component: FavoritesPage,
        title: 'Избранное',
      },
      {
        path: 'orders',
        component: OrdersPage,
        title: 'Мои заказы',
      },
    ],
  },
];
