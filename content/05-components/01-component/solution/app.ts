import {
  Component,
  computed,
  effect,
  signal,
} from '@angular/core';
import { CartItem, Game } from './core/models';
import { GAMES } from './core/games-data';
import { GameCard } from './shared/game-card/game-card';

// С какой суммы заказа доставка бесплатная, ₽
const FREE_DELIVERY_FROM = 5000;

// Варианты сортировки каталога
type SortKey = 'default' | 'cheap' | 'expensive' | 'rating';

@Component({
  selector: 'app-root',
  imports: [GameCard],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  // Строка поиска, фильтр и сортировка каталога
  protected readonly query = signal('');
  protected readonly inStockOnly = signal(false);
  protected readonly sortBy = signal<SortKey>('default');

  // Игры, которые видит покупатель: найденные, отфильтрованные и отсортированные
  protected readonly visibleGames = computed(() => {
    const query = this.query().trim().toLowerCase();
    const games = GAMES.filter(
      (game) =>
        (game.title.toLowerCase().includes(query) ||
          game.tags.some((tag) => tag.includes(query))) &&
        (!this.inStockOnly() || game.inStock > 0),
    );
    // filter вернул новый массив, поэтому сортировка не испортит GAMES
    switch (this.sortBy()) {
      case 'cheap':
        return games.sort((a, b) => a.price - b.price);
      case 'expensive':
        return games.sort((a, b) => b.price - a.price);
      case 'rating':
        return games.sort((a, b) => b.rating - a.rating);
      default:
        return games;
    }
  });

  // Корзина — массив позиций. Его не меняем, а заменяем новым
  protected readonly cart = signal<CartItem[]>([]);
  protected readonly cartCount = computed(() =>
    this.cart().reduce((sum, item) => sum + item.quantity, 0),
  );
  protected readonly cartTotal = computed(() =>
    this.cart().reduce(
      (sum, item) => sum + item.game.price * item.quantity,
      0,
    ),
  );
  protected readonly cartSummary = computed(() =>
    this.cart()
      .map((item) => `${item.game.title} × ${item.quantity}`)
      .join(', '),
  );
  protected readonly deliveryLeft = computed(() =>
    Math.max(FREE_DELIVERY_FROM - this.cartTotal(), 0),
  );

  // Сколько штук каждой игры в корзине: id игры → количество
  protected readonly inCart = computed(
    () =>
      new Map(
        this.cart().map((item) => [
          item.game.id,
          item.quantity,
        ]),
      ),
  );

  constructor() {
    // Побочный эффект: сообщение в консоли при каждом изменении корзины
    effect(() => {
      console.log('Корзина:', this.cartSummary() || 'пусто');
    });
  }

  protected addToCart(game: Game) {
    this.cart.update((items) => {
      const existing = items.find(
        (item) => item.game.id === game.id,
      );
      if (!existing) {
        return [...items, { game, quantity: 1 }];
      }
      return items.map((item) =>
        item === existing
          ? { ...item, quantity: item.quantity + 1 }
          : item,
      );
    });
  }

  protected changeQuantity(item: CartItem, delta: number) {
    this.cart.update((items) =>
      items.map((i) =>
        i.game.id === item.game.id
          ? { ...i, quantity: i.quantity + delta }
          : i,
      ),
    );
  }

  protected removeFromCart(item: CartItem) {
    this.cart.update((items) =>
      items.filter((i) => i.game.id !== item.game.id),
    );
  }

  protected clearCart() {
    this.cart.set([]);
  }

  protected changeSort(value: string) {
    this.sortBy.set(value as SortKey);
  }

  protected resetFilters() {
    this.query.set('');
    this.inStockOnly.set(false);
    this.sortBy.set('default');
  }
}
