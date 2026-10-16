import {
  apply,
  applyEach,
  applyWhen,
  disabled,
  hidden,
  maxLength,
  minLength,
  required,
  schema,
  validate,
} from '@angular/forms/signals';
import { emailRules } from '../shared/form-rules';

// Сколько открыток можно добавить к заказу и сколько букв в каждой
export const MAX_POSTCARDS = 3;
export const POSTCARD_TEXT_MAX = 120;

// Контакты покупателя
export interface Contacts {
  name: string;
  phone: string;
  email: string;
}

// Открытка к подарку: кому и что написать
export interface Postcard {
  to: string;
  text: string;
}

// Данные формы оформления заказа
export interface CheckoutData {
  contacts: Contacts;
  delivery: {
    method: 'pickup' | 'courier'; // самовывоз или курьер
    address: string;
    callBefore: boolean; // позвонить за час до приезда
  };
  postcards: Postcard[];
  comment: string;
}

// Телефон пишут по-разному: «+7 (900) 123-45-67», «8 900 1234567». Считаем только цифры:
// их 11, первая — 7 или 8
function isPhone(text: string) {
  return /^[78]\d{10}$/.test(text.replace(/\D/g, ''));
}

// Контакты: как обращаться и как связаться
export const contactsSchema = schema<Contacts>((contacts) => {
  required(contacts.name, { message: 'Как к вам обращаться?' });
  validate(contacts.phone, ({ value }) =>
    value() && !isPhone(value())
      ? {
          kind: 'phone',
          message: 'Номер — 11 цифр, например +7 900 123-45-67',
        }
      : undefined,
  );
  apply(contacts.email, emailRules);
  // Перекрёстная проверка: правило поля e-mail читает и соседнее поле — телефон
  validate(contacts.email, ({ value, valueOf }) =>
    !value().trim() && !valueOf(contacts.phone).trim()
      ? {
          kind: 'contact',
          message:
            'Укажите телефон или e-mail, чтобы мы могли связаться с вами',
        }
      : undefined,
  );
});

// Открытка: адресат обязателен, текст — не длиннее POSTCARD_TEXT_MAX
export const postcardSchema = schema<Postcard>((postcard) => {
  required(postcard.to, { message: 'Кому эта открытка?' });
  maxLength(postcard.text, POSTCARD_TEXT_MAX, {
    message: `Не больше ${POSTCARD_TEXT_MAX} символов`,
  });
});

// Вся форма оформления: схемы частей и правила, которые связывают части между собой
export const checkoutSchema = schema<CheckoutData>(
  (checkout) => {
    apply(checkout.contacts, contactsSchema);
    applyEach(checkout.postcards, postcardSchema);

    const delivery = checkout.delivery;
    // Самовывоз: адрес и звонок не нужны. Скрытое поле не проверяется и не влияет на форму
    hidden(delivery.address, {
      when: ({ valueOf }) =>
        valueOf(delivery.method) === 'pickup',
    });
    hidden(delivery.callBefore, {
      when: ({ valueOf }) =>
        valueOf(delivery.method) === 'pickup',
    });
    // Правила курьерской доставки — группой, пока выбран курьер
    applyWhen(
      checkout,
      ({ value }) => value().delivery.method === 'courier',
      (order) => {
        required(order.delivery.address, {
          message: 'Куда привезти заказ?',
        });
        minLength(order.delivery.address, 10, {
          message: 'Укажите улицу, дом и квартиру',
        });
        required(order.contacts.phone, {
          message: 'Курьеру нужен ваш телефон',
        });
      },
    );
    // Позвонить можно, только если есть номер. Строка — причина, её увидит покупатель
    disabled(delivery.callBefore, {
      when: ({ valueOf }) =>
        !valueOf(checkout.contacts.phone).trim() &&
        'Укажите телефон, и курьер позвонит заранее',
    });
  },
);
