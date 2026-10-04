import { Component, computed, effect, signal } from '@angular/core';
import { CartItem, Game } from './core/models';
import { GAMES } from './core/games-data';

// С какой суммы заказа доставка бесплатная, ₽
const FREE_DELIVERY_FROM = 5000;

// При каком остатке на складе писать «Осталось N шт.»
const FEW_LEFT = 5;

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  // Строка поиска и игры, которые ей подходят
  protected readonly query = signal('');
  protected readonly visibleGames = computed(() => {
    const query = this.query().trim().toLowerCase();
    return GAMES.filter(
      (game) => game.title.toLowerCase().includes(query) || game.tags.some((tag) => tag.includes(query)),
    );
  });
  protected readonly fewLeft = FEW_LEFT;

  // Корзина — массив позиций. Его не меняем, а заменяем новым
  protected readonly cart = signal<CartItem[]>([]);
  protected readonly cartCount = computed(() => this.cart().reduce((sum, item) => sum + item.quantity, 0));
  protected readonly cartTotal = computed(() =>
    this.cart().reduce((sum, item) => sum + item.game.price * item.quantity, 0),
  );
  protected readonly cartSummary = computed(() =>
    this.cart()
      .map((item) => `${item.game.title} × ${item.quantity}`)
      .join(', '),
  );
  protected readonly deliveryLeft = computed(() => Math.max(FREE_DELIVERY_FROM - this.cartTotal(), 0));

  // Сколько штук каждой игры в корзине: id игры → количество
  protected readonly inCart = computed(() => new Map(this.cart().map((item) => [item.game.id, item.quantity])));

  constructor() {
    // Побочный эффект: сообщение в консоли при каждом изменении корзины
    effect(() => {
      console.log('Корзина:', this.cartSummary() || 'пусто');
    });
  }

  protected addToCart(game: Game) {
    this.cart.update((items) => {
      const existing = items.find((item) => item.game.id === game.id);
      if (!existing) {
        return [...items, { game, quantity: 1 }];
      }
      return items.map((item) => (item === existing ? { ...item, quantity: item.quantity + 1 } : item));
    });
  }

  protected changeQuantity(item: CartItem, delta: number) {
    this.cart.update((items) =>
      items.map((i) => (i.game.id === item.game.id ? { ...i, quantity: i.quantity + delta } : i)),
    );
  }

  protected removeFromCart(item: CartItem) {
    this.cart.update((items) => items.filter((i) => i.game.id !== item.game.id));
  }

  protected clearCart() {
    this.cart.set([]);
  }
}
