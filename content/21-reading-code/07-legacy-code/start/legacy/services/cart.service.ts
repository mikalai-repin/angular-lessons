import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { Game } from '../../core/models';

// Состояние корзины — поток: текущее значение хранит BehaviorSubject
@Injectable({ providedIn: 'root' })
export class CartService {
  private items$ = new BehaviorSubject<Game[]>([]);

  readonly count$ = this.items$.pipe(
    map((items) => items.length),
  );

  add(game: Game) {
    this.items$.next([...this.items$.value, game]);
  }
}
