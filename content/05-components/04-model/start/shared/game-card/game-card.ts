import { Component, input, output } from '@angular/core';
import { Game } from '../../core/models';

// При каком остатке на складе писать «Осталось N шт.»
const FEW_LEFT = 5;

// Карточка игры в каталоге
@Component({
  selector: 'app-game-card',
  templateUrl: './game-card.html',
  styleUrl: './game-card.css',
})
export class GameCard {
  // Игра, которую показывает карточка. Без неё карточка не имеет смысла — вход обязательный
  readonly game = input.required<Game>();
  // Сколько штук этой игры уже в корзине
  readonly inCart = input(0);
  // Покупатель нажал «В корзину». Что с этим делать, решает родитель
  readonly add = output();

  protected readonly fewLeft = FEW_LEFT;
}
