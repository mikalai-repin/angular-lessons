import {
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartStore } from '../core/cart-store';
import { Game } from '../core/models';
import { Countdown } from '../shared/countdown/countdown';
import { DurationPipe } from '../shared/duration-pipe';
import { PlayersPipe } from '../shared/players-pipe';
import { PricePipe } from '../shared/price-pipe';
import { Rating } from '../shared/rating/rating';
import { Tab } from '../shared/tabs/tab';
import { Tabs } from '../shared/tabs/tabs';

// Страница игры: обложка, цена, «В корзину», описание и характеристики
@Component({
  selector: 'app-game-page',
  imports: [
    Countdown,
    DurationPipe,
    PlayersPipe,
    PricePipe,
    Rating,
    RouterLink,
    Tab,
    Tabs,
  ],
  templateUrl: './game-page.html',
  styleUrl: './game-page.css',
})
export class GamePage {
  // TODO: вход id — параметр маршрута :id (из адреса приходит строка — нужно число)
  // TODO: игра с этим id из GAMES (computed). Пока игры нет — undefined
  protected readonly game = signal<Game | undefined>(undefined);

  protected readonly cart = inject(CartStore);
  // Сколько штук этой игры уже в корзине
  protected readonly inCart = computed(() => {
    const game = this.game();
    return game ? this.cart.quantityOf(game) : 0;
  });
}
