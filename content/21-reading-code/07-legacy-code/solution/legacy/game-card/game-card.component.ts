import { Component, input, output } from '@angular/core';
import { Game } from '../../core/models';

@Component({
  selector: 'app-game-card',
  templateUrl: './game-card.component.html',
  styleUrl: './game-card.component.css',
  host: {
    '[class.sold-out]': 'game().inStock === 0',
  },
})
export class GameCardComponent {
  readonly game = input.required<Game>();
  readonly add = output<Game>();
}
