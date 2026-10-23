import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form } from '@angular/forms/signals';
import {
  CheckoutData,
  checkoutSchema,
} from './checkout-schema';

// Заказ с именем и телефоном, самовывоз — правильный. Тест портит то, что проверяет
function validOrder(): CheckoutData {
  return {
    contacts: {
      name: 'Аня',
      phone: '+7 900 123-45-67',
      email: '',
    },
    delivery: {
      method: 'pickup',
      address: '',
      callBefore: false,
    },
    postcards: [],
    comment: '',
  };
}

// Форма по схеме оформления — без компонента и шаблона. form() внедряет Injector: нужен контекст внедрения
function checkoutForm(order: CheckoutData) {
  return TestBed.runInInjectionContext(() =>
    form(signal(order), checkoutSchema),
  );
}

describe('checkoutSchema', () => {
  it('правильный заказ проходит', () => {
    expect(checkoutForm(validOrder())().valid()).toBe(true);
  });

  // TODO: ни телефона, ни e-mail; телефон с ошибкой; курьер без адреса; открытка без адресата
});
