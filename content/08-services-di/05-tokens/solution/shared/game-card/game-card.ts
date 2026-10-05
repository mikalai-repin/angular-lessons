import { Component, computed, inject, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { CartStore } from '../../core/cart-store';
import { Game } from '../../core/models';
import { SHOP_CONFIG } from '../../core/shop-config';
import { DurationPipe } from '../duration-pipe';
import { LazyImage } from '../lazy-image';
import { PlayersPipe } from '../players-pipe';
import { PricePipe } from '../price-pipe';
import { Rating } from '../rating/rating';
import { Tooltip } from '../tooltip';

// Карточка игры в каталоге
@Component({
  selector: 'app-game-card',
  imports: [DecimalPipe, DurationPipe, LazyImage, PlayersPipe, PricePipe, Rating, Tooltip],
  templateUrl: './game-card.html',
  styleUrl: './game-card.css',
  host: {
    role: 'article',
    '[class.sold-out]': 'game().inStock === 0',
  },
})
export class GameCard {
  // Игра, которую показывает карточка. Без неё карточка не имеет смысла — вход обязательный
  readonly game = input.required<Game>();
  // Покупатель хочет посмотреть подробности об игре
  readonly open = output();

  // Корзина — общая для всего магазина: карточка сама кладёт в неё игру
  protected readonly cart = inject(CartStore);
  // Сколько штук этой игры уже в корзине
  protected readonly inCart = computed(() => this.cart.quantityOf(this.game()));

  // При каком остатке на складе писать «Осталось N шт.»
  protected readonly fewLeft = inject(SHOP_CONFIG).fewLeft;
}
