import { InjectionToken } from '@angular/core';

// Настройки магазина: числа, которые раньше были константами в разных файлах
export interface ShopConfig {
  freeDeliveryFrom: number; // с какой суммы заказа доставка бесплатная, ₽
  fewLeft: number; // при каком остатке на складе писать «Осталось N шт.»
  hitRating: number; // с какого рейтинга игра получает стикер «Хит»
  pageSize: number; // сколько игр показывать сразу и добавлять по «Показать ещё»
}

// TODO: токен SHOP_CONFIG со значением по умолчанию: 5000, 5, 4.8, 6
