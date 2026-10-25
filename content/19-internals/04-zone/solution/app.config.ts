import {
  ApplicationConfig,
  DEFAULT_CURRENCY_CODE,
  LOCALE_ID,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { registerLocaleData } from '@angular/common';
import {
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import localeRu from '@angular/common/locales/ru';
import { provideEffects } from '@ngrx/effects';
import { provideState, provideStore } from '@ngrx/store';
import {
  TitleStrategy,
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withViewTransitions,
} from '@angular/router';
import { routes } from './app.routes';
import { metaReducers } from './core/action-log';
import { authInterceptor } from './core/auth-interceptor';
import { AuthStore } from './core/auth-store';
import { cacheInterceptor } from './core/cache-interceptor';
import {
  restoreFavorites,
  saveFavorites,
} from './core/favorites-effects';
import { favoritesFeature } from './core/favorites-feature';
import { loggingInterceptor } from './core/logging-interceptor';
import { retryInterceptor } from './core/retry-interceptor';
import { ShopTitleStrategy } from './layout/shop-title-strategy';

// Правила форматирования для русского языка: разделители, названия месяцев, символ рубля
registerLocaleData(localeRu);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Проверки по zone.js — как в приложениях до Angular 20: после любого события, таймера, ответа сервера
    provideZoneChangeDetection(),
    // До запуска приложения — восстановить вход. Первая страница появится, когда ответит сервер
    provideAppInitializer(() => inject(AuthStore).restore()),
    // Локаль приложения: по ней форматируют встроенные пайпы
    { provide: LOCALE_ID, useValue: 'ru' },
    // Валюта по умолчанию: по ней работают встроенный пайп currency и наш price
    { provide: DEFAULT_CURRENCY_CODE, useValue: 'RUB' },
    // Заголовок вкладки по нашим правилам: «Каталог — Ход конём»
    { provide: TitleStrategy, useClass: ShopTitleStrategy },
    // HttpClient — клиент HTTP: запросы к серверу через inject(HttpClient).
    // Интерцепторы — по порядку: запрос проходит их сверху вниз, ответ — снизу вверх
    provideHttpClient(
      withInterceptors([
        loggingInterceptor,
        authInterceptor,
        cacheInterceptor,
        retryInterceptor,
      ]),
    ),
    // Классический Store: одно состояние на всё приложение. provideState добавляет в него часть
    // metaReducers — обёртки вокруг редьюсеров: журнал действий
    provideStore({}, { metaReducers }),
    provideState(favoritesFeature),
    // Эффекты: побочные действия в ответ на действия — сохранение избранного
    provideEffects({ restoreFavorites, saveFavorites }),
    // Роутер: карта маршрутов и его возможности
    // withComponentInputBinding — параметры адреса попадают во входы компонента страницы
    // withViewTransitions — плавная смена страниц, withInMemoryScrolling — прокрутка как в браузере
    provideRouter(
      routes,
      withComponentInputBinding(),
      withViewTransitions(),
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
      }),
    ),
  ],
};
