import {
  Component,
  computed,
  effect,
  linkedSignal,
  signal,
  untracked,
} from '@angular/core';
import { CartItem } from './core/models';
import { GAMES } from './core/games-data';

// С какой суммы заказа доставка бесплатная, ₽
const FREE_DELIVERY_FROM = 5000;

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  // Номер игры в каталоге — единственное, что меняет переключатель
  protected readonly gameIndex = signal(0);
  protected readonly gamesCount = GAMES.length;

  // Всё остальное о карточке вычисляется из gameIndex
  protected readonly game = computed(
    () => GAMES[this.gameIndex()],
  );
  protected readonly soldOut = computed(
    () => this.game().inStock === 0,
  );
  protected readonly discount = computed(() => {
    const { price, oldPrice } = this.game();
    return oldPrice
      ? Math.round((1 - price / oldPrice) * 100)
      : 0;
  });

  // Сколько штук добавить. Сбрасывается при смене игры и после изменений корзины
  protected readonly quantity = linkedSignal<number>(() =>
    this.game().inStock > this.inCart() ? 1 : 0,
  );

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

  // Сколько штук открытой игры уже в корзине и сколько ещё можно добавить
  protected readonly inCart = computed(
    () =>
      this.cart().find(
        (item) => item.game.id === this.game().id,
      )?.quantity ?? 0,
  );
  protected readonly available = computed(
    () => this.game().inStock - this.inCart(),
  );
  protected readonly deliveryLeft = computed(() =>
    Math.max(FREE_DELIVERY_FROM - this.cartTotal(), 0),
  );

  constructor() {
    // Побочный эффект: сообщение в консоли при каждом изменении корзины
    effect(() => {
      const summary = this.cartSummary() || 'пусто';
      // Открытая игра нужна для сообщения, но её смена — не повод его повторять
      const title = untracked(() => this.game().title);
      console.log(`Корзина: ${summary} (на экране — ${title})`);
    });
  }

  protected showPrevious() {
    this.gameIndex.update(
      (index) => (index - 1 + GAMES.length) % GAMES.length,
    );
  }

  protected showNext() {
    this.gameIndex.update(
      (index) => (index + 1) % GAMES.length,
    );
  }

  protected decreaseQuantity() {
    this.quantity.update((quantity) =>
      Math.max(quantity - 1, 1),
    );
  }

  protected increaseQuantity() {
    this.quantity.update((quantity) =>
      Math.min(quantity + 1, this.available()),
    );
  }

  protected addToCart() {
    const game = this.game();
    const quantity = this.quantity();
    this.cart.update((items) => {
      const existing = items.find(
        (item) => item.game.id === game.id,
      );
      if (!existing) {
        return [...items, { game, quantity }];
      }
      return items.map((item) =>
        item === existing
          ? { ...item, quantity: item.quantity + quantity }
          : item,
      );
    });
  }

  protected removeFromCart() {
    const id = this.game().id;
    this.cart.update((items) =>
      items.filter((item) => item.game.id !== id),
    );
  }

  protected clearCart() {
    this.cart.set([]);
  }

  protected search(query: string) {
    console.log('Ищем:', query);
  }
}
