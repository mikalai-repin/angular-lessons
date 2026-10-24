import {
  Component,
  computed,
  debounced,
  inject,
  input,
  linkedSignal,
  numberAttribute,
} from '@angular/core';
import { httpResource } from '@angular/common/http';
import {
  ActivatedRoute,
  Params,
  Router,
  RouterLink,
} from '@angular/router';
import { Confirmation } from '../../core/confirmation';
import { Game, GamesPage } from '../../core/models';
import { PricePipe } from '../../shared/price-pipe';
import { AdminGames } from '../admin-games';

// Сколько игр в таблице на одной странице
const PAGE_SIZE = 10;

// Колонки, по которым сортирует таблица. Порядок — в параметре sort API:
// 'price' — по возрастанию, '-price' — по убыванию
type SortColumn = 'title' | 'price' | 'inStock';
type Sort = SortColumn | `-${SortColumn}`;
const SORTS: readonly string[] = [
  'title',
  '-title',
  'price',
  '-price',
  'inStock',
  '-inStock',
];

// Значение ?sort= из адреса. Незнакомое или пустое — по названию
function toSort(value: string | undefined): Sort {
  return value && SORTS.includes(value)
    ? (value as Sort)
    : 'title';
}

// Таблица игр в админке: поиск, сортировка, страницы
@Component({
  selector: 'app-games-table',
  imports: [PricePipe, RouterLink],
  templateUrl: './games-table.html',
  styleUrl: './games-table.css',
})
export class GamesTable {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly admin = inject(AdminGames);
  private readonly confirmation = inject(Confirmation);

  // Поиск, сортировка и страница живут в адресе: /admin/games?q=кот&sort=-price&page=2
  readonly q = input('', {
    transform: (value: string | undefined) => value ?? '',
  });
  readonly sort = input('title', { transform: toSort });
  readonly page = input(1, {
    transform: (value: string | undefined) =>
      Math.max(numberAttribute(value, 1), 1),
  });

  // Строка поиска с задержкой: запрос — когда админ сделал паузу в наборе
  private readonly query = debounced(() => this.q(), 300);

  protected readonly games = httpResource<GamesPage>(() => ({
    url: '/api/games',
    params: {
      q: this.query.value(),
      sort: this.sort(),
      page: this.page(),
      size: PAGE_SIZE,
    },
  }));

  // Последний полученный ответ: пока грузится следующий, таблица показывает прежние строки
  protected readonly shown = linkedSignal<
    GamesPage | undefined,
    GamesPage | undefined
  >({
    source: () =>
      this.games.hasValue() ? this.games.value() : undefined,
    computation: (page, previous) => page ?? previous?.value,
  });

  // Номера страниц: 1, 2, 3… — сколько их, считаем по total и size из ответа
  protected readonly pages = computed(() => {
    const shown = this.shown();
    const count = shown
      ? Math.ceil(shown.total / shown.size)
      : 0;
    return Array.from({ length: count }, (_, i) => i + 1);
  });

  // Как отсортирована колонка — для атрибута aria-sort. У несортированной атрибута нет
  protected sortOf(column: SortColumn) {
    const sort = this.sort();
    if (sort === column) {
      return 'ascending';
    }
    return sort === `-${column}` ? 'descending' : null;
  }

  // Щелчок по заголовку: та же колонка — обратный порядок, другая — по возрастанию.
  // Новый порядок — снова с первой страницы
  protected sortBy(column: SortColumn) {
    const sort: Sort =
      this.sort() === column ? `-${column}` : column;
    this.setParams({ sort, page: null });
  }

  // Новый текст поиска — первая страница. replaceUrl: каждая буква — не новая запись в истории
  protected search(q: string) {
    this.setParams({ q: q || null, page: null }, true);
  }

  protected goTo(page: number) {
    this.setParams({ page: page === 1 ? null : page });
  }

  // Удалить — только после «да». Затем — перезагрузить страницу таблицы
  protected async remove(game: Game) {
    const yes = await this.confirmation.ask(
      `Удалить «${game.title}» из каталога?`,
      'Удалить',
    );
    if (yes) {
      await this.admin.remove(game);
      this.games.reload();
    }
  }

  // Новые параметры — новый адрес. merge оставляет остальные, null убирает параметр
  private setParams(params: Params, replaceUrl = false) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
      replaceUrl,
    });
  }
}
