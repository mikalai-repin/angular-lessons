import {
  Component,
  ElementRef,
  booleanAttribute,
  computed,
  inject,
  input,
  linkedSignal,
  numberAttribute,
  viewChild,
} from '@angular/core';
import { DecimalPipe, PercentPipe } from '@angular/common';
import {
  ActivatedRoute,
  Params,
  Router,
} from '@angular/router';
import { Game } from '../core/models';
import { SHOP_CONFIG } from '../core/shop-config';
import { GAMES } from '../core/games-data';
import { GameCard } from '../shared/game-card/game-card';
import { LoadMore } from '../shared/load-more/load-more';
import { Rating } from '../shared/rating/rating';
import { Tooltip } from '../shared/tooltip';

// Варианты сортировки каталога
type SortKey = 'default' | 'cheap' | 'expensive' | 'rating';

// Значение ?sort= из адреса. Адрес может набрать кто угодно: незнакомое значение — сортировка по умолчанию
function toSortKey(value: string | undefined): SortKey {
  return value === 'cheap' ||
    value === 'expensive' ||
    value === 'rating'
    ? value
    : 'default';
}

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

  // Строка поиска, фильтры и сортировка живут в адресе: /catalog?q=кот&inStock=true&rating=4.5&sort=cheap.
  // Роутер передаёт query-параметры во входы. Нет параметра — во вход приходит undefined
  readonly q = input('', {
    transform: (value: string | undefined) => value ?? '',
  });
  readonly inStock = input(false, {
    transform: booleanAttribute,
  });
  readonly rating = input(0, {
    transform: (value: string | undefined) =>
      numberAttribute(value, 0),
  });
  readonly sort = input('default', { transform: toSortKey });

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // Поле поиска из шаблона: #searchBox
  private readonly searchBox =
    viewChild.required<ElementRef<HTMLInputElement>>(
      'searchBox',
    );

  // Игры, которые видит покупатель: найденные, отфильтрованные и отсортированные
  protected readonly visibleGames = computed(() => {
    const query = this.q().trim().toLowerCase();
    const games = GAMES.filter(
      (game) =>
        (game.title.toLowerCase().includes(query) ||
          game.tags.some((tag) => tag.includes(query))) &&
        (!this.inStock() || game.inStock > 0) &&
        game.rating >= this.rating(),
    );
    // filter вернул новый массив, поэтому сортировка не испортит GAMES
    switch (this.sort()) {
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

  // Новые фильтры — новый адрес. merge оставляет остальные параметры, null убирает параметр из адреса
  protected setFilters(filters: Params, replaceUrl = false) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: filters,
      queryParamsHandling: 'merge',
      replaceUrl,
    });
  }

  protected resetFilters() {
    // Тот же адрес без query-параметров
    this.router.navigate([], { relativeTo: this.route });
    // Кнопка «Сбросить фильтры» сейчас исчезнет вместе с фокусом — вернём фокус в поиск
    this.searchBox().nativeElement.focus();
  }
}
