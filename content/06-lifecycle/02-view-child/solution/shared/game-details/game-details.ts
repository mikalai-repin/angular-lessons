import { Component, input, output } from '@angular/core';
import { Game } from '../../core/models';
import { Rating } from '../rating/rating';

// Окно «Подробнее»: обложка, описание, цена и кнопка «В корзину»
@Component({
  selector: 'app-game-details',
  imports: [Rating],
  templateUrl: './game-details.html',
  styleUrl: './game-details.css',
})
export class GameDetails {
  readonly game = input.required<Game>();
  readonly inCart = input(0);
  readonly add = output();
  // Покупатель закрыл окно
  readonly closed = output();
}
