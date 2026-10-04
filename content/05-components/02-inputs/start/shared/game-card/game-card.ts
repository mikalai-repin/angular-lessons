import { Component } from '@angular/core';
import { GAMES } from '../../core/games-data';

// При каком остатке на складе писать «Осталось N шт.»
const FEW_LEFT = 5;

// Карточка игры в каталоге
@Component({
  selector: 'app-game-card',
  templateUrl: './game-card.html',
  styleUrl: './game-card.css',
})
export class GameCard {
  // Пока карточка всегда показывает первую игру каталога
  protected readonly game = GAMES[0];

  protected readonly fewLeft = FEW_LEFT;
}
