import { Component, inject, signal } from '@angular/core';
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
  protected readonly query = signal('');
  // Ресурс перечитывается сам, когда меняется query: функция читает сигнал
  protected readonly games = httpResource<Page<Game>>(() => ({
    url: '/api/games',
    params: { q: this.query() },
  }));
}
