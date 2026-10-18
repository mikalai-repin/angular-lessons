import {
  ApplicationConfig,
  DEFAULT_CURRENCY_CODE,
  LOCALE_ID,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { registerLocaleData } from '@angular/common';
import {
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import localeRu from '@angular/common/locales/ru';
import {
  TitleStrategy,
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withViewTransitions,
} from '@angular/router';
import { routes } from './app.routes';
import { AuthStore } from './core/auth-store';
import { cacheInterceptor } from './core/cache-interceptor';
import { loggingInterceptor } from './core/logging-interceptor';
import { retryInterceptor } from './core/retry-interceptor';
import { ShopTitleStrategy } from './layout/shop-title-strategy';

// Правила форматирования для русского языка: разделители, названия месяцев, символ рубля
registerLocaleData(localeRu);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
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
        cacheInterceptor,
        retryInterceptor,
      ]),
    ),
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
