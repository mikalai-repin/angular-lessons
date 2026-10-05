import {
  Component,
  computed,
  inject,
  input,
  numberAttribute,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartStore } from '../core/cart-store';
import { GAMES } from '../core/games-data';
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
  // Параметр маршрута :id — во вход его кладёт роутер (withComponentInputBinding).
  // Из адреса приходит строка: numberAttribute превращает её в число
  readonly id = input.required({ transform: numberAttribute });

  // Игра с этим id; undefined — такой игры нет
  protected readonly game = computed(() =>
    GAMES.find((game) => game.id === this.id()),
  );

  protected readonly cart = inject(CartStore);
  // Сколько штук этой игры уже в корзине
  protected readonly inCart = computed(() => {
    const game = this.game();
    return game ? this.cart.quantityOf(game) : 0;
  });
}
