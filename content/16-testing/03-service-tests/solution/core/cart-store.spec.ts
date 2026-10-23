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

  it('считает штуки и сумму', () => {
    const game = fakeGame({ price: 1000 });
    cart.add(game);
    cart.add(game);
    cart.add(fakeGame({ id: 2, price: 500 }));
    expect(cart.count()).toBe(3);
    expect(cart.subtotal()).toBe(2500);
  });

  it('не кладёт больше, чем есть на складе', () => {
    const game = fakeGame({ inStock: 1 });
    cart.add(game);
    cart.add(game);
    expect(cart.quantityOf(game)).toBe(1);
  });

  it('доставка бесплатна от 5000 ₽', () => {
    cart.add(fakeGame({ price: 4990 }));
    expect(cart.delivery()).toBe(390);
    cart.add(fakeGame({ id: 2, price: 10 }));
    expect(cart.delivery()).toBe(0);
  });

  it('снимает промокод, когда сумма стала меньше порога', () => {
    const cheap = fakeGame({ id: 2, price: 1500 });
    cart.add(fakeGame({ price: 2000 }));
    cart.add(cheap);
    const promo = {
      code: 'KNIGHT500',
      amount: 500,
      minTotal: 3000,
    };
    expect(cart.applyPromo(promo)).toBe(true);
    cart.remove(cheap);
    expect(cart.promo()).toBeNull();
  });

  it('сохраняет корзину в localStorage', () => {
    cart.add(fakeGame());
    // Записывает эффект, а эффекты выполняются, когда Angular обновляет приложение
    TestBed.tick();
    const saved = localStorage.getItem('hod-konem:cart:v2');
    expect(JSON.parse(saved ?? '[]')).toEqual([
      { game: fakeGame(), quantity: 1 },
    ]);
  });
});
