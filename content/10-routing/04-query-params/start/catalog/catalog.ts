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
import { Game } from '../core/models';
import { SHOP_CONFIG } from '../core/shop-config';
import { GAMES } from '../core/games-data';
import { GameCard } from '../shared/game-card/game-card';
import { LoadMore } from '../shared/load-more/load-more';
import { Rating } from '../shared/rating/rating';
import { Tooltip } from '../shared/tooltip';

// Варианты сортировки каталога
type SortKey = 'default' | 'cheap' | 'expensive' | 'rating';

// Каталог: поиск, фильтры, сортировка и сетка карточек
@Component({
  selector: 'app-catalog',
  imports: [
    DecimalPipe,
    PercentPipe,
    GameCard,
    LoadMore,
    Rating,
    Tooltip,
  ],
  templateUrl: './catalog.html',
  styleUrl: './catalog.css',
})
export class Catalog {
  // Настройки магазина: рейтинг «Хита» и размер порции каталога
  private readonly config = inject(SHOP_CONFIG);

  // TODO: строка поиска, фильтры и сортировка — в query-параметрах адреса: входы q, inStock, rating, sort
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
    computation: () => this.config.pageSize,
  });
  protected readonly shownGames = computed(() =>
    this.visibleGames().slice(0, this.shownCount()),
  );
  protected readonly hitRating = this.config.hitRating;

  protected showMore() {
    this.shownCount.update(
      (count) => count + this.config.pageSize,
    );
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
