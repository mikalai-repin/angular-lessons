import {
  Component,
  ElementRef,
  computed,
  inject,
  linkedSignal,
  signal,
  viewChild,
} from '@angular/core';
import { DecimalPipe, PercentPipe } from '@angular/common';
import { CartStore } from './core/cart-store';
import { Game } from './core/models';
import { GAMES } from './core/games-data';
import { Header } from './layout/header/header';
import { GameCard } from './shared/game-card/game-card';
import { GameDetails } from './shared/game-details/game-details';
import { LoadMore } from './shared/load-more/load-more';
import { PricePipe } from './shared/price-pipe';
import { Quantity } from './shared/quantity/quantity';
import { Rating } from './shared/rating/rating';
import { Tooltip } from './shared/tooltip';

// С какого рейтинга игра получает стикер «Хит»
const HIT_RATING = 4.8;

// Сколько игр показывать сразу и добавлять по «Показать ещё»
const PAGE_SIZE = 6;

// Варианты сортировки каталога
type SortKey = 'default' | 'cheap' | 'expensive' | 'rating';

@Component({
  selector: 'app-root',
  imports: [
    DecimalPipe,
    PercentPipe,
    GameCard,
    GameDetails,
    Header,
    LoadMore,
    PricePipe,
    Rating,
    Quantity,
    Tooltip,
  ],
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
  private readonly searchBox =
    viewChild.required<ElementRef<HTMLInputElement>>(
      'searchBox',
    );

  // Игры, которые видит покупатель: найденные, отфильтрованные и отсортированные
  protected readonly visibleGames = computed(() => {
    const query = this.query().trim().toLowerCase();
    const games = GAMES.filter(
      (game) =>
        (game.title.toLowerCase().includes(query) ||
          game.tags.some((tag) => tag.includes(query))) &&
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
  protected readonly shownGames = computed(() =>
    this.visibleGames().slice(0, this.shownCount()),
  );
  protected readonly hitRating = HIT_RATING;

  // Игра, открытая в окне «Подробнее»; null — окно закрыто
  protected readonly selectedGame = signal<Game | null>(null);

  // Корзина: позиции, сумма, действия. Её же показывают шапка и карточки
  protected readonly cart = inject(CartStore);

  protected showMore() {
    this.shownCount.update((count) => count + PAGE_SIZE);
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
