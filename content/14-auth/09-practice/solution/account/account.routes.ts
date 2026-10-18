import { Routes } from '@angular/router';
import { authGuard } from '../core/auth-guards';
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
        data: { breadcrumb: 'Избранное' },
      },
      {
        path: 'orders',
        component: OrdersPage,
        title: 'Мои заказы',
        // Заказы — только свои: без входа сервер их не покажет, а гард не пустит на страницу
        canActivate: [authGuard],
        // Гард — при каждом переходе, даже на тот же адрес: так «Выйти» уведёт со страницы
        runGuardsAndResolvers: 'always',
        data: { breadcrumb: 'Заказы' },
      },
    ],
  },
];
