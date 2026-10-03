import { Component, inject, input } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { CartStore } from '../core/cart-store';
import { Game } from '../core/models';

@Component({
  selector: 'app-game-page',
  imports: [RouterLink],
  templateUrl: './game-page.html',
})
export class GamePage {
  /** Параметр маршрута :id — благодаря withComponentInputBinding() */
  readonly id = input.required<string>();

  protected readonly cart = inject(CartStore);
  protected readonly game = httpResource<Game>(() => `/api/games/${this.id()}`);
}
