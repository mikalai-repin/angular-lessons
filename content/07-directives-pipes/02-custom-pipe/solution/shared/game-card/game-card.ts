import { Component, input, output } from '@angular/core';
import { Game } from '../../core/models';
import { PricePipe } from '../price-pipe';
import { Rating } from '../rating/rating';

// При каком остатке на складе писать «Осталось N шт.»
const FEW_LEFT = 5;

// Карточка игры в каталоге
@Component({
  selector: 'app-game-card',
  imports: [PricePipe, Rating],
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
  // Сколько штук этой игры уже в корзине
  readonly inCart = input(0);
  // Покупатель нажал «В корзину». Что с этим делать, решает родитель
  readonly add = output();
  // Покупатель хочет посмотреть подробности об игре
  readonly open = output();

  protected readonly fewLeft = FEW_LEFT;
}
