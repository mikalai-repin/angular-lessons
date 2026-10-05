import { computed, signal } from '@angular/core';
import { CartItem, Game } from './models';

// С какой суммы заказа доставка бесплатная, ₽
const FREE_DELIVERY_FROM = 5000;

// TODO: класс CartStore — корзина магазина: позиции, количество, сумма и действия с ними. Перенесите её сюда из App
// TODO: единственный экземпляр корзины на всё приложение — cartStore
