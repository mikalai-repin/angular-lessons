import { InjectionToken } from '@angular/core';

// Настройки магазина: числа, которые раньше были константами в разных файлах
export interface ShopConfig {
  freeDeliveryFrom: number; // с какой суммы заказа доставка бесплатная, ₽
  deliveryPrice: number; // сколько стоит доставка до этой суммы, ₽
  fewLeft: number; // при каком остатке на складе писать «Осталось N шт.»
  hitRating: number; // с какого рейтинга игра получает стикер «Хит»
  pageSize: number; // сколько игр показывать сразу и добавлять по «Показать ещё»
}

// Токен — ключ, по которому настройки выдаёт DI. factory — значение, если в провайдерах токена нет
export const SHOP_CONFIG = new InjectionToken<ShopConfig>(
  'SHOP_CONFIG',
  {
    factory: () => ({
      freeDeliveryFrom: 5000,
      deliveryPrice: 390,
      fewLeft: 5,
      hitRating: 4.8,
      pageSize: 6,
    }),
  },
);
