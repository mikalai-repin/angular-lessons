import { TestBed } from '@angular/core/testing';
import { fakeGame } from '../testing/fake-game';
import { CartStore } from './cart-store';

describe('CartStore', () => {
  let cart: CartStore;

  beforeEach(() => {
    // Корзина читает localStorage, когда создаётся: каждый тест начинает с пустого
    localStorage.clear();
    // Свой экземпляр на каждый тест: после теста TestBed выбрасывает всё, что создал
    cart = TestBed.inject(CartStore);
  });

  it('новая корзина пуста', () => {
    expect(cart.count()).toBe(0);
    expect(cart.total()).toBe(0);
  });

  // TODO: штуки и сумма, остаток на складе, бесплатная доставка, промокод, localStorage
});
