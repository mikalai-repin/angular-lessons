import { Routes } from '@angular/router';
import { CartPage } from './cart/cart-page/cart-page';
import { Catalog } from './catalog/catalog';
import { Checkout } from './checkout/checkout';
import {
  cartNotEmptyGuard,
  unsavedCommentGuard,
} from './checkout/checkout-guards';
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
  },
  {
    path: 'games/:id',
    // Страница игры загружается отдельно — при первом переходе на неё
    loadComponent: () =>
      import('./game/game-page').then((m) => m.GamePage),
    // Заголовок — название игры: его находит резолвер по :id
    title: gameTitleResolver,
  },
  {
    path: 'cart',
    component: CartPage,
    title: 'Корзина',
  },
  {
    path: 'checkout',
    component: Checkout,
    title: 'Оформление заказа',
    // Пустить на страницу? Спрашивает гард перед переходом
    canActivate: [cartNotEmptyGuard],
    // Отпустить со страницы? Спрашивает гард перед уходом
    canDeactivate: [unsavedCommentGuard],
  },
  {
    path: 'account',
    // Кабинет со всеми вложенными маршрутами — отдельный модуль: загрузится при первом переходе
    loadChildren: () =>
      import('./account/account.routes').then(
        (m) => m.accountRoutes,
      ),
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
