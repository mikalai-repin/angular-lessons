import { Routes } from '@angular/router';
import { Catalog } from './catalog/catalog';
import {
  cartNotEmptyGuard,
  unsavedCheckoutGuard,
} from './checkout/checkout-guards';
import { adminGuard } from './core/auth-guards';
import { gameTitleResolver } from './game/game-title';
import { Home } from './home/home';
import { NotFound } from './not-found/not-found';

// Карта магазина: какой адрес какой странице соответствует
export const routes: Routes = [
  { path: '', component: Home, title: 'Настольные игры' },
  {
    path: 'catalog',
    component: Catalog,
    title: 'Каталог',
    data: { breadcrumb: 'Каталог' },
  },
  {
    path: 'games/:id',
    // Страница игры загружается отдельно — при первом переходе на неё
    loadComponent: () =>
      import('./game/game-page').then((m) => m.GamePage),
    // Крошка — название игры: резолвер загрузит его с сервера и положит в data.breadcrumb.
    // Заголовок вкладки ShopTitleStrategy возьмёт из крошки
    resolve: { breadcrumb: gameTitleResolver },
  },
  {
    path: 'cart',
    // Корзина, оформление и вход — с формами: их код загрузится при первом переходе
    loadComponent: () =>
      import('./cart/cart-page/cart-page').then(
        (m) => m.CartPage,
      ),
    title: 'Корзина',
    data: { breadcrumb: 'Корзина' },
  },
  {
    path: 'checkout',
    loadComponent: () =>
      import('./checkout/checkout').then((m) => m.Checkout),
    title: 'Оформление заказа',
    data: { breadcrumb: 'Оформление заказа' },
    // Пустить на страницу? Спрашивает гард перед переходом
    canActivate: [cartNotEmptyGuard],
    // Отпустить со страницы? Спрашивает гард перед уходом
    canDeactivate: [unsavedCheckoutGuard],
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./login/login').then((m) => m.Login),
    title: 'Вход',
  },
  {
    path: 'account',
    // Кабинет со всеми вложенными маршрутами — отдельный модуль: загрузится при первом переходе
    loadChildren: () =>
      import('./account/account.routes').then(
        (m) => m.accountRoutes,
      ),
    data: { breadcrumb: 'Кабинет' },
  },
  {
    path: 'admin',
    // canMatch: не администратору маршрут не подходит — и код админки даже не загружается
    canMatch: [adminGuard],
    loadChildren: () =>
      import('./admin/admin.routes').then((m) => m.adminRoutes),
    data: { breadcrumb: 'Админка' },
  },
  // Без id игры показывать нечего — ведём в каталог
  { path: 'games', redirectTo: 'catalog', pathMatch: 'full' },
  // Старые ссылки вида /game/3 из рассылок: переадресация с тем же id
  {
    path: 'game/:id',
    redirectTo: ({ params }) => `/games/${params['id']}`,
  },
  // Всё, что не подошло ни одному маршруту выше. Этот маршрут — всегда последний
  {
    path: '**',
    component: NotFound,
    title: 'Страница не найдена',
  },
];
