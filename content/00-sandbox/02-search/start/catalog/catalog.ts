import { Component, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { CartStore } from '../core/cart-store';
import { Game, Page } from '../core/models';
import { GameCard } from '../shared/game-card/game-card';

@Component({
  selector: 'app-catalog',
  imports: [GameCard],
  templateUrl: './catalog.html',
})
export class Catalog {
  protected readonly cart = inject(CartStore);
  // TODO: добавьте сигнал query и передавайте его в запрос как параметр q
  protected readonly games = httpResource<Page<Game>>(() => '/api/games');
}
