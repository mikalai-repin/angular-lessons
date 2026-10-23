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

  it('без телефона и e-mail — «Укажите телефон или e-mail…»', () => {
    const order = validOrder();
    order.contacts.phone = '';
    const f = checkoutForm(order);
    expect(f().valid()).toBe(false);
    expect(f.contacts.email().errors()[0]?.kind).toBe(
      'contact',
    );
  });

  it('телефон — 11 цифр', () => {
    const order = validOrder();
    order.contacts.phone = '+7 900 123';
    const f = checkoutForm(order);
    expect(f.contacts.phone().errors()[0]?.kind).toBe('phone');
  });

  it('курьеру нужен адрес', () => {
    const f = checkoutForm(validOrder());
    f.delivery.method().value.set('courier');
    const errors = f.delivery.address().errors();
    expect(errors.map((error) => error.message)).toEqual([
      'Куда привезти заказ?',
    ]);
  });

  it('у открытки должен быть адресат', () => {
    const order = validOrder();
    order.postcards = [{ to: '', text: 'С днём рождения!' }];
    const f = checkoutForm(order);
    expect(f().valid()).toBe(false);
    expect(f.postcards[0].to().errors()[0]?.kind).toBe(
      'required',
    );
  });
});
