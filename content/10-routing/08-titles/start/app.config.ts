import {
  ApplicationConfig,
  DEFAULT_CURRENCY_CODE,
  LOCALE_ID,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeRu from '@angular/common/locales/ru';
import {
  provideRouter,
  withComponentInputBinding,
} from '@angular/router';
import { routes } from './app.routes';

// Правила форматирования для русского языка: разделители, названия месяцев, символ рубля
registerLocaleData(localeRu);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Локаль приложения: по ней форматируют встроенные пайпы
    { provide: LOCALE_ID, useValue: 'ru' },
    // Валюта по умолчанию: по ней работают встроенный пайп currency и наш price
    { provide: DEFAULT_CURRENCY_CODE, useValue: 'RUB' },
    // TODO: свои правила заголовка вкладки — ShopTitleStrategy
    // Роутер: карта маршрутов и его возможности
    // withComponentInputBinding — параметры адреса попадают во входы компонента страницы
    provideRouter(routes, withComponentInputBinding()),
  ],
};
