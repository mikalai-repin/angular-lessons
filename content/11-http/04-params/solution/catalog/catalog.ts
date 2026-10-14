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
import { httpResource } from '@angular/common/http';
import {
  ActivatedRoute,
  Params,
  Router,
} from '@angular/router';
import { Game, GamesPage } from '../core/models';
import { SHOP_CONFIG } from '../core/shop-config';
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

// Сортировка каталога → параметр sort в API: price — по цене, -price — по убыванию цены
const SORT_PARAMS: Record<SortKey, string> = {
  default: '',
  cheap: 'price',
  expensive: '-price',
  rating: 'rating',
};

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

  // Каталог с сервера: поиск, фильтры и сортировка — параметры запроса.
  // Изменился любой сигнал, прочитанный внутри, — ресурс отправит новый запрос
  protected readonly games = httpResource<GamesPage>(() => ({
    url: '/api/games',
    params: {
      q: this.q(),
      inStock: this.inStock(),
      rating: this.rating(),
      sort: SORT_PARAMS[this.sort()],
      // Пока все найденные игры сразу; порции с сервера — в практикуме
      size: 100,
    },
  }));

  // Найденные игры. value() ресурса с ошибкой бросает исключение, поэтому сначала спрашиваем hasValue()
  protected readonly visibleGames = computed(() =>
    this.games.hasValue() ? this.games.value().items : [],
  );
  // Сколько заглушек показывать, пока каталог загружается
  protected readonly skeletons = [1, 2, 3, 4, 5, 6];

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
