import { Service, computed, effect, signal } from '@angular/core';
import { CartItem, Game } from './models';

// TODO: порог бесплатной доставки — из настроек магазина (SHOP_CONFIG)
// С какой суммы заказа доставка бесплатная, ₽
const FREE_DELIVERY_FROM = 5000;

// Корзина магазина: позиции, количество, сумма и действия с ними.
// @Service() — Angular сам создаст единственный экземпляр, когда он впервые кому-то понадобится
@Service()
export class CartStore {
  // Позиции корзины. Массив не меняем, а заменяем новым
  readonly items = signal<CartItem[]>([]);

  readonly count = computed(() => this.items().reduce((sum, item) => sum + item.quantity, 0));
  readonly total = computed(() => this.items().reduce((sum, item) => sum + item.game.price * item.quantity, 0));
  readonly summary = computed(() =>
    this.items()
      .map((item) => `${item.game.title} × ${item.quantity}`)
      .join(', '),
  );
  readonly deliveryLeft = computed(() => Math.max(FREE_DELIVERY_FROM - this.total(), 0));

  // Сколько штук каждой игры в корзине: id игры → количество
  private readonly quantities = computed(() => new Map(this.items().map((item) => [item.game.id, item.quantity])));

  // Метод читает сигнал, поэтому шаблон или computed, которые его вызвали, тоже зависят от корзины
  quantityOf(game: Game): number {
    return this.quantities().get(game.id) ?? 0;
  }

  add(game: Game) {
    this.items.update((items) => {
      const existing = items.find((item) => item.game.id === game.id);
      if (!existing) {
        return [...items, { game, quantity: 1 }];
      }
      return items.map((item) => (item === existing ? { ...item, quantity: item.quantity + 1 } : item));
    });
  }

  setQuantity(game: Game, quantity: number) {
    this.items.update((items) => items.map((item) => (item.game.id === game.id ? { ...item, quantity } : item)));
  }

  remove(game: Game) {
    this.items.update((items) => items.filter((item) => item.game.id !== game.id));
  }

  clear() {
    this.items.set([]);
  }

  constructor() {
    // Побочный эффект: сообщение в консоли при каждом изменении корзины
    effect(() => {
      console.log('Корзина:', this.summary() || 'пусто');
    });
  }
}
