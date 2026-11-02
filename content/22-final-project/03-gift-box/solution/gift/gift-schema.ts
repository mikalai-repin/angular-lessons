import {
  apply,
  maxLength,
  minLength,
  required,
  schema,
} from '@angular/forms/signals';
import {
  Contacts,
  contactsSchema,
} from '../checkout/checkout-schema';
import { Game } from '../core/models';

// Сколько игр в наборе и сколько букв в открытке
export const MIN_GAMES = 2;
export const MAX_GAMES = 4;
export const MESSAGE_MAX = 200;

// Упаковка набора: цена в рублях
export const WRAPPINGS = [
  { id: 'kraft', title: 'Крафт', price: 0 },
  { id: 'festive', title: 'Праздничная', price: 290 },
  { id: 'wooden', title: 'Деревянный ящик', price: 990 },
] as const;

export type Wrapping = (typeof WRAPPINGS)[number];

// Подарочный набор. Каждому шагу мастера — своя часть модели
export interface GiftBox {
  // Шаг 1: игры
  games: Game[];
  // Шаг 2: упаковка и открытка
  design: {
    wrapping: Wrapping['id'];
    recipient: string; // кому подарок
    message: string; // текст открытки
  };
  // Шаг 3: контакты покупателя
  contacts: Contacts;
}

// Правила всего набора. Шаг проверяет свою часть: form.games, form.design, form.contacts
export const giftSchema = schema<GiftBox>((box) => {
  // minLength и maxLength работают и с массивами: считают элементы
  const count = `Выберите от ${MIN_GAMES} до ${MAX_GAMES} игр`;
  minLength(box.games, MIN_GAMES, { message: count });
  maxLength(box.games, MAX_GAMES, { message: count });
  required(box.design.recipient, { message: 'Кому подарок?' });
  maxLength(box.design.message, MESSAGE_MAX, {
    message: `Не больше ${MESSAGE_MAX} символов`,
  });
  // Контакты — те же правила, что в оформлении заказа
  apply(box.contacts, contactsSchema);
});
