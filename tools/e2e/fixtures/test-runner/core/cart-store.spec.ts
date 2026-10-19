import { TestBed } from '@angular/core/testing';
import { CartStore } from './cart-store';
import { Game } from './models';

const game = (id: number, price: number, inStock = 5): Game => ({
  id,
  slug: `game-${id}`,
  title: `Игра ${id}`,
  cover: '/assets/covers/treasure-island.svg',
  price,
  category: 'family',
  players: { min: 2, max: 4 },
  playTime: 30,
  age: 8,
  rating: 4.5,
  inStock,
  description: '',
  tags: [],
});

describe('CartStore', () => {
  let cart: CartStore;

  beforeEach(() => {
    localStorage.clear();
    cart = TestBed.inject(CartStore);
  });

  it('пустая корзина', () => {
    expect(cart.count()).toBe(0);
    expect(cart.total()).toBe(0);
  });

  it('add считает штуки и сумму', () => {
    cart.add(game(1, 1000));
    cart.add(game(1, 1000));
    cart.add(game(2, 500));
    expect(cart.count()).toBe(3);
    expect(cart.subtotal()).toBe(2500);
  });

  it('не больше, чем на складе', () => {
    const g = game(3, 100, 1);
    cart.add(g);
    cart.add(g);
    expect(cart.quantityOf(g)).toBe(1);
  });

  it('сохраняет корзину в localStorage (эффект)', () => {
    cart.add(game(1, 1000));
    TestBed.tick();
    expect(localStorage.getItem('hod-konem:cart:v2')).toContain('"quantity":1');
  });

  it('новый тест — новая корзина', () => {
    expect(cart.count()).toBe(0);
  });
});
