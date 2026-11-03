import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Observable, Subject } from 'rxjs';
import {
  debounceTime,
  startWith,
  switchMap,
  takeUntil,
} from 'rxjs/operators';
import { Game } from '../core/models';
import { CartService } from './services/cart.service';
import { GamesService } from './services/games.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  // Добавлено при обновлении до 19: компонент объявлен в модуле
  standalone: false,
  // Добавлено при обновлении до 22: прежняя стратегия по умолчанию
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class AppComponent implements OnInit, OnDestroy {
  games: Game[] = [];
  loading = true;
  query = '';
  cartCount$: Observable<number>;

  private search$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private gamesService: GamesService,
    private cartService: CartService,
  ) {
    this.cartCount$ = this.cartService.count$;
  }

  ngOnInit() {
    this.search$
      .pipe(
        startWith(''),
        debounceTime(300),
        switchMap((query) => {
          this.loading = true;
          return this.gamesService.getGames(query);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((games) => {
        this.games = games;
        this.loading = false;
      });
  }

  onSearch(query: string) {
    this.search$.next(query);
  }

  addToCart(game: Game) {
    this.cartService.add(game);
  }

  trackById(index: number, game: Game) {
    return game.id;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
