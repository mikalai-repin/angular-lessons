import {
  InjectionToken,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

// localStorage браузера. На сервере (SSR, пререндеринг) хранилища нет — null:
// корзина, избранное и вход живут только в браузере покупателя
// TODO: если данные сайтов запрещены или место кончилось, localStorage бросает исключения.
// Сделайте обёртку, как LOCAL_STORAGE в angular.dev: магазин должен работать и без хранилища
export const BROWSER_STORAGE =
  new InjectionToken<Storage | null>('BROWSER_STORAGE', {
    providedIn: 'root',
    factory: () =>
      isPlatformBrowser(inject(PLATFORM_ID))
        ? localStorage
        : null,
  });
