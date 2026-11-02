import { Component, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { Router } from '@angular/router';
import { GamesPage } from '../core/models';
import { FieldErrors } from '../shared/field-errors/field-errors';
import { PricePipe } from '../shared/price-pipe';
import { GiftStore } from './gift-store';

// Сколько игр загрузить для выбора: весь каталог одной страницей — игр в нём меньше
const CHOICE_SIZE = 100;

// Шаг 1, /gift/games: игры для набора
@Component({
  selector: 'app-gift-games',
  imports: [FieldErrors, PricePipe],
  templateUrl: './gift-games.html',
  styleUrl: './gift-games.css',
})
export class GiftGames {
  protected readonly gift = inject(GiftStore);
  private readonly router = inject(Router);

  protected readonly catalog = httpResource<GamesPage>(() => ({
    url: '/api/games',
    params: { size: CHOICE_SIZE },
  }));

  // Дальше — только с верным набором. Ошибки поля видны, когда оно «тронуто»: трогаем сами
  protected next() {
    const games = this.gift.form.games();
    games.markAsTouched();
    if (games.valid()) {
      this.router.navigate(['/gift/design']);
    }
  }
}
