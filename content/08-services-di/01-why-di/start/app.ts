import { Component, ElementRef, computed, effect, linkedSignal, signal, viewChild } from '@angular/core';
import { DecimalPipe, PercentPipe } from '@angular/common';
import { CartItem, Game } from './core/models';
import { GAMES } from './core/games-data';
import { Header } from './layout/header/header';
import { GameCard } from './shared/game-card/game-card';
import { GameDetails } from './shared/game-details/game-details';
import { LoadMore } from './shared/load-more/load-more';
import { PricePipe } from './shared/price-pipe';
import { Quantity } from './shared/quantity/quantity';
import { Rating } from './shared/rating/rating';
import { Tooltip } from './shared/tooltip';

// С какой суммы заказа доставка бесплатная, ₽
const FREE_DELIVERY_FROM = 5000;

// С какого рейтинга игра получает стикер «Хит»
const HIT_RATING = 4.8;

// Сколько игр показывать сразу и добавлять по «Показать ещё»
const PAGE_SIZE = 6;

// Варианты сортировки каталога
type SortKey = 'default' | 'cheap' | 'expensive' | 'rating';

@Component({
  selector: 'app-root',
  imports: [DecimalPipe, PercentPipe, GameCard, GameDetails, Header, LoadMore, PricePipe, Rating, Quantity, Tooltip],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  // Строка поиска, фильтры и сортировка каталога
  protected readonly query = signal('');
  protected readonly inStockOnly = signal(false);
  protected readonly minRating = signal(0);
  protected readonly sortBy = signal<SortKey>('default');

  // Поле поиска из шаблона: #searchBox
  private readonly searchBox = viewChild.required<ElementRef<HTMLInputElement>>('searchBox');

  // Игры, которые видит покупатель: найденные, отфильтрованные и отсортированные
  protected readonly visibleGames = computed(() => {
    const query = this.query().trim().toLowerCase();
    const games = GAMES.filter(
      (game) =>
        (game.title.toLowerCase().includes(query) || game.tags.some((tag) => tag.includes(query))) &&
        (!this.inStockOnly() || game.inStock > 0) &&
        game.rating >= this.minRating(),
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

  // Сколько игр каталога показано. Новый поиск, фильтр или сортировка — снова первая порция
  protected readonly shownCount = linkedSignal<Game[], number>({
    source: this.visibleGames,
    computation: () => PAGE_SIZE,
  });
  protected readonly shownGames = computed(() => this.visibleGames().slice(0, this.shownCount()));
  protected readonly hitRating = HIT_RATING;

  // Игра, открытая в окне «Подробнее»; null — окно закрыто
  protected readonly selectedGame = signal<Game | null>(null);

  // TODO: корзину — в core/cart-store.ts, а здесь взять готовый экземпляр cartStore
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

  protected setQuantity(item: CartItem, quantity: number) {
    this.cart.update((items) => items.map((i) => (i.game.id === item.game.id ? { ...i, quantity } : i)));
  }

  protected removeFromCart(item: CartItem) {
    this.cart.update((items) => items.filter((i) => i.game.id !== item.game.id));
  }

  protected showMore() {
    this.shownCount.update((count) => count + PAGE_SIZE);
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
    this.minRating.set(0);
    this.sortBy.set('default');
    // Кнопка «Сбросить фильтры» сейчас исчезнет вместе с фокусом — вернём фокус в поиск
    this.searchBox().nativeElement.focus();
  }
}
