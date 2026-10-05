import { Component, inject } from '@angular/core';
import { GAMES } from '../core/games-data';
import { SHOP_CONFIG } from '../core/shop-config';
import { GameCard } from '../shared/game-card/game-card';
import { PricePipe } from '../shared/price-pipe';

// Главная страница: приветствие и две подборки
@Component({
  selector: 'app-home',
  imports: [GameCard, PricePipe],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  private readonly config = inject(SHOP_CONFIG);

  protected readonly freeDeliveryFrom =
    this.config.freeDeliveryFrom;
  // Хиты — игры с самым высоким рейтингом
  protected readonly hits = GAMES.filter(
    (game) => game.rating >= this.config.hitRating,
  );
  // Игры со скидкой
  protected readonly sale = GAMES.filter(
    (game) => game.oldPrice !== undefined,
  );
}
