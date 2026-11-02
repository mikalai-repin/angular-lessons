import { Component, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { GamesByIds } from '../core/games-by-ids';
import { SHOP_CONFIG } from '../core/shop-config';
import { GameCard } from '../shared/game-card/game-card';

// Страница /wishlist?ids=3,7,12: список желаний по ссылке. Открывается без входа
// и не трогает избранное того, кто открыл: список — в адресе, а не в Store
@Component({
  selector: 'app-wishlist-page',
  imports: [GameCard, RouterLink],
  templateUrl: './wishlist-page.html',
})
export class WishlistPage {
  // Параметр ?ids= из адреса: withComponentInputBinding кладёт его во вход.
  // Ссылку может набрать кто угодно — оставляем только целые положительные id, без повторов
  readonly ids = input<number[], string | undefined>([], {
    transform: toIds,
  });
  private readonly gamesByIds = inject(GamesByIds);
  protected readonly priorityCovers =
    inject(SHOP_CONFIG).priorityCovers;

  // Игры по списку id — тем же сервисом, что и избранное
  protected readonly games = rxResource({
    params: () => {
      const ids = this.ids();
      return ids.length > 0 ? ids : undefined;
    },
    stream: ({ params }) => this.gamesByIds.load(params),
  });
}

// '3,7,abc,3' → [3, 7]
function toIds(value: string | undefined): number[] {
  const ids = (value ?? '')
    .split(',')
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0);
  return [...new Set(ids)];
}
