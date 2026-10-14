import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { GAMES } from '../core/games-data';
import { Game, GamesPage } from '../core/models';
import { SHOP_CONFIG } from '../core/shop-config';
import { GameCard } from '../shared/game-card/game-card';
import { PricePipe } from '../shared/price-pipe';

// Главная страница: приветствие и две подборки
@Component({
  selector: 'app-home',
  imports: [GameCard, PricePipe, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  private readonly config = inject(SHOP_CONFIG);
  private readonly http = inject(HttpClient);

  protected readonly freeDeliveryFrom =
    this.config.freeDeliveryFrom;
  // Хиты — четыре игры с самым высоким рейтингом. Их присылает сервер, а пока ответа нет, список пуст
  protected readonly hits = signal<Game[]>([]);
  // Игры со скидкой
  protected readonly sale = GAMES.filter(
    (game) => game.oldPrice !== undefined,
  );

  constructor() {
    // get только описывает запрос: он уйдёт на сервер при подписке (subscribe)
    this.http
      .get<GamesPage>('/api/games', {
        params: { sort: 'rating', size: 4 },
      })
      .subscribe((page) => this.hits.set(page.items));
  }
}
