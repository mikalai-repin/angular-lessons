import {
  Component,
  ElementRef,
  booleanAttribute,
  computed,
  debounced,
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

  // Строка поиска с задержкой: ресурс, значение которого догоняет q, когда q не менялся 300 мс
  private readonly query = debounced(() => this.q(), 300);

  // Поиск, фильтры и сортировка одним объектом. Изменилось что-то — новый поиск с первой страницы
  private readonly filters = computed(() => ({
    q: this.query.value(),
    inStock: this.inStock(),
    rating: this.rating(),
    sort: SORT_PARAMS[this.sort()],
  }));
  // Номер страницы каталога: «Показать ещё» — следующая, новые фильтры — снова первая
  protected readonly page = linkedSignal({
    source: this.filters,
    computation: () => 1,
  });

  // Одна страница каталога с сервера
  protected readonly games = httpResource<GamesPage>(() => ({
    url: '/api/games',
    params: {
      ...this.filters(),
      page: this.page(),
      size: this.config.pageSize,
    },
  }));

  // Последний полученный ответ. Пока грузится новый, у ресурса нет значения, — а мы показываем прежний.
  // value() ресурса с ошибкой бросает исключение, поэтому сначала спрашиваем hasValue()
  protected readonly found = linkedSignal<
    GamesPage | undefined,
    GamesPage | undefined
  >({
    source: () =>
      this.games.hasValue() ? this.games.value() : undefined,
    computation: (page, previous) => page ?? previous?.value,
  });
  // Сколько заглушек показывать, пока каталог загружается
  protected readonly skeletons = [1, 2, 3, 4, 5, 6];

  // Показанные игры: первая страница заменяет список, следующие дописываются в конец.
  // Пока страница грузится (undefined), список прежний
  protected readonly shownGames = linkedSignal<
    GamesPage | undefined,
    Game[]
  >({
    source: () =>
      this.games.hasValue() ? this.games.value() : undefined,
    computation: (page, previous) => {
      const shown = previous?.value ?? [];
      if (!page) {
        return shown;
      }
      return page.page === 1
        ? page.items
        : [...shown, ...page.items];
    },
  });
  protected readonly hitRating = this.config.hitRating;
  // Первые обложки — на первом экране: их грузим в первую очередь
  protected readonly priorityCovers =
    this.config.priorityCovers;

  protected showMore() {
    this.page.update((page) => page + 1);
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
