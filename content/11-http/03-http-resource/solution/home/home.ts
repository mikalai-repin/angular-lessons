import { Component, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { GamesPage } from '../core/models';
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

  protected readonly freeDeliveryFrom =
    this.config.freeDeliveryFrom;
  // Хиты — четыре игры с самым высоким рейтингом. Запрос отправит сам ресурс, он же расскажет, как идут дела
  protected readonly hits = httpResource<GamesPage>(() => ({
    url: '/api/games',
    params: { sort: 'rating', size: 4 },
  }));
  // Игры со скидкой
  protected readonly sale = httpResource<GamesPage>(() => ({
    url: '/api/games',
    params: { onSale: true },
  }));
  // Сколько заглушек показывать, пока подборка загружается
  protected readonly skeletons = [1, 2, 3, 4];
}
