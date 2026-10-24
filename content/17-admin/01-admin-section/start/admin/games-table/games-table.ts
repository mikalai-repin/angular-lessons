import { Component } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { GamesPage } from '../../core/models';
import { PricePipe } from '../../shared/price-pipe';

// Сколько игр в таблице на одной странице
const PAGE_SIZE = 10;

// Таблица игр в админке: название, цена и остаток на складе
@Component({
  selector: 'app-games-table',
  imports: [PricePipe],
  templateUrl: './games-table.html',
  styleUrl: './games-table.css',
})
export class GamesTable {
  // Первая страница каталога — тот же GET /api/games, что у покупателя
  protected readonly games = httpResource<GamesPage>(() => ({
    url: '/api/games',
    params: { size: PAGE_SIZE },
  }));
}
