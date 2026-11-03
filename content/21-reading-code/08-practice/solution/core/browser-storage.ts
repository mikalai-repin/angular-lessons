import {
  InjectionToken,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

// Обёртка над localStorage, которая никогда не бросает исключений (как LOCAL_STORAGE в angular.dev).
// Само обращение к localStorage бросает SecurityError, если данные сайтов запрещены,
// а setItem — QuotaExceededError, если место кончилось. Тогда магазин работает без хранилища:
// корзина и вход живут до перезагрузки страницы
class SafeStorage implements Storage {
  get length(): number {
    try {
      return localStorage.length;
    } catch {
      return 0;
    }
  }

  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Не сохранилось — данные останутся в памяти до перезагрузки
    }
  }

  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // Нечего удалять: хранилище недоступно
    }
  }

  key(index: number): string | null {
    try {
      return localStorage.key(index);
    } catch {
      return null;
    }
  }

  clear(): void {
    try {
      localStorage.clear();
    } catch {
      // Нечего очищать: хранилище недоступно
    }
  }
}

// localStorage браузера в обёртке SafeStorage. На сервере (SSR, пререндеринг) хранилища нет — null:
// корзина, избранное и вход живут только в браузере покупателя
export const BROWSER_STORAGE =
  new InjectionToken<Storage | null>('BROWSER_STORAGE', {
    providedIn: 'root',
    factory: () =>
      isPlatformBrowser(inject(PLATFORM_ID))
        ? new SafeStorage()
        : null,
  });
