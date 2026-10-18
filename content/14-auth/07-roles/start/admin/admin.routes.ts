import { Routes } from '@angular/router';
import { AdminHome } from './admin-home/admin-home';

// Только для урока: строка появится в консоли, когда браузер загрузит этот модуль
console.log('Админка: модуль загружен');

// Маршруты админки. Разделы «Игры» и «Заказы» появятся в главе 17
export const adminRoutes: Routes = [
  { path: '', component: AdminHome, title: 'Админка' },
];
