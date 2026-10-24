import { Routes } from '@angular/router';
import { AdminHome } from './admin-home/admin-home';
import { AdminLayout } from './admin-layout/admin-layout';
import { GamesTable } from './games-table/games-table';

// Только для урока: строка появится в консоли, когда браузер загрузит этот модуль
console.log('Админка: модуль загружен');

// Маршруты админки. Гард adminGuard стоит выше, на маршруте admin в app.routes.ts:
// пока он не пустил, роутер не дойдёт ни до одного маршрута этого файла
export const adminRoutes: Routes = [
  {
    path: '',
    component: AdminLayout,
    children: [
      { path: '', component: AdminHome, title: 'Админка' },
      {
        path: 'games',
        component: GamesTable,
        title: 'Игры',
        data: { breadcrumb: 'Игры' },
      },
    ],
  },
];
