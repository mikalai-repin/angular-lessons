import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Game } from '../../core/models';

@Component({
  selector: 'app-game-card',
  imports: [RouterLink],
  templateUrl: './game-card.html',
  styleUrl: './game-card.css',
})
export class GameCard {
  readonly game = input.required<Game>();
  readonly addToCart = output<Game>();
}
