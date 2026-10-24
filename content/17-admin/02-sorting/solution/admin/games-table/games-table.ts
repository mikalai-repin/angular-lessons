import { Component, inject, input } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { GamesPage } from '../../core/models';
import { PricePipe } from '../../shared/price-pipe';

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

// Таблица игр в админке: название, цена и остаток на складе
@Component({
  selector: 'app-games-table',
  imports: [PricePipe],
  templateUrl: './games-table.html',
  styleUrl: './games-table.css',
})
export class GamesTable {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // Сортировка живёт в адресе: /admin/games?sort=-price. Во вход её кладёт роутер
  readonly sort = input('title', { transform: toSort });

  protected readonly games = httpResource<GamesPage>(() => ({
    url: '/api/games',
    params: { sort: this.sort(), size: PAGE_SIZE },
  }));

  // Как отсортирована колонка — для атрибута aria-sort. У несортированной атрибута нет
  protected sortOf(column: SortColumn) {
    const sort = this.sort();
    if (sort === column) {
      return 'ascending';
    }
    return sort === `-${column}` ? 'descending' : null;
  }

  // Щелчок по заголовку: та же колонка — обратный порядок, другая — по возрастанию
  protected sortBy(column: SortColumn) {
    const sort: Sort =
      this.sort() === column ? `-${column}` : column;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { sort },
      queryParamsHandling: 'merge',
    });
  }
}
