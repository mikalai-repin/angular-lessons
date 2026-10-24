import { Routes } from '@angular/router';
import { gameTitleResolver } from '../game/game-title';
import { AdminGames } from './admin-games';
import { unsavedChangesGuard } from './admin-guards';
import { AdminHome } from './admin-home/admin-home';
import { AdminLayout } from './admin-layout/admin-layout';
import { GameEdit } from './game-edit/game-edit';
import { GamesTable } from './games-table/games-table';

// Только для урока: строка появится в консоли, когда браузер загрузит этот модуль
console.log('Админка: модуль загружен');

// Маршруты админки. Гард adminGuard стоит выше, на маршруте admin в app.routes.ts:
// пока он не пустил, роутер не дойдёт ни до одного маршрута этого файла
export const adminRoutes: Routes = [
  {
    path: '',
    component: AdminLayout,
    // Провайдеры раздела: роутер создаст для них свой инжектор — его видят только маршруты админки
    providers: [AdminGames],
    children: [
      { path: '', component: AdminHome, title: 'Админка' },
      {
        // Крошка «Игры» — у родителя: она будет и у таблицы, и у страницы игры
        path: 'games',
        data: { breadcrumb: 'Игры' },
        children: [
          { path: '', component: GamesTable, title: 'Игры' },
          {
            path: ':id',
            component: GameEdit,
            // Крошка и заголовок вкладки — название игры, как у страницы игры в магазине
            resolve: { breadcrumb: gameTitleResolver },
            canDeactivate: [unsavedChangesGuard],
          },
        ],
      },
    ],
  },
];
