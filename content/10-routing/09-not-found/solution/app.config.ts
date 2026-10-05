import {
  ApplicationConfig,
  DEFAULT_CURRENCY_CODE,
  LOCALE_ID,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeRu from '@angular/common/locales/ru';
import {
  TitleStrategy,
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withViewTransitions,
} from '@angular/router';
import { routes } from './app.routes';
import { ShopTitleStrategy } from './layout/shop-title-strategy';

// Правила форматирования для русского языка: разделители, названия месяцев, символ рубля
registerLocaleData(localeRu);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Локаль приложения: по ней форматируют встроенные пайпы
    { provide: LOCALE_ID, useValue: 'ru' },
    // Валюта по умолчанию: по ней работают встроенный пайп currency и наш price
    { provide: DEFAULT_CURRENCY_CODE, useValue: 'RUB' },
    // Заголовок вкладки по нашим правилам: «Каталог — Ход конём»
    { provide: TitleStrategy, useClass: ShopTitleStrategy },
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
