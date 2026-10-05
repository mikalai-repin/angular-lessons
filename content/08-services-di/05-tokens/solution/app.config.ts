import { ApplicationConfig, DEFAULT_CURRENCY_CODE, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeRu from '@angular/common/locales/ru';
import { CartStore } from './core/cart-store';
import { DemoCartStore } from './core/demo-cart-store';

// Правила форматирования для русского языка: разделители, названия месяцев, символ рубля
registerLocaleData(localeRu);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Локаль приложения: по ней форматируют встроенные пайпы
    { provide: LOCALE_ID, useValue: 'ru' },
    // Валюта по умолчанию: по ней работают встроенный пайп currency и наш price
    { provide: DEFAULT_CURRENCY_CODE, useValue: 'RUB' },
    // Кто попросит CartStore, получит DemoCartStore — корзину с играми для показа магазина
    { provide: CartStore, useClass: DemoCartStore },
  ],
};
