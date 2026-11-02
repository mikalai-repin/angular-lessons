import {
  Service,
  computed,
  inject,
  signal,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { form } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { Game } from '../core/models';
import { GiftBox, WRAPPINGS, giftSchema } from './gift-schema';

// Пустой набор: с него начинается мастер и к нему возвращается после заказа
function emptyBox(): GiftBox {
  return {
    games: [],
    design: { wrapping: 'kraft', recipient: '', message: '' },
    contacts: { name: '', phone: '', email: '' },
  };
}

// Набор, который собирают в мастере. Шаги мастера — разные страницы, а набор один:
// он живёт в сервисе, пока покупатель ходит между шагами и по магазину (до перезагрузки)
@Service()
export class GiftStore {
  private readonly http = inject(HttpClient);
  private readonly model = signal<GiftBox>(emptyBox());
  // Форма в сервисе: поле сервиса создаётся в контексте внедрения, как и поле компонента
  readonly form = form(this.model, giftSchema);

  readonly games = computed(() => this.model().games);
  readonly wrapping = computed(
    () =>
      WRAPPINGS.find(
        (wrapping) =>
          wrapping.id === this.model().design.wrapping,
      ) ?? WRAPPINGS[0],
  );
  readonly gamesTotal = computed(() =>
    this.games().reduce((sum, game) => sum + game.price, 0),
  );
  readonly total = computed(
    () => this.gamesTotal() + this.wrapping().price,
  );

  has(game: Game): boolean {
    return this.games().some((item) => item.id === game.id);
  }

  // Положить или убрать. Игру, которой нет на складе, не кладём: кнопку можно включить в обход disabled
  toggle(game: Game) {
    this.form
      .games()
      .value.update((games) =>
        this.has(game)
          ? games.filter((item) => item.id !== game.id)
          : game.inStock > 0
            ? [...games, game]
            : games,
      );
  }

  // Набор — обычный заказ: каждая игра по одной штуке, упаковка и открытка — в поле gift.
  // Ошибку сервера получит тот, кто вызвал
  async placeOrder(): Promise<number> {
    const { games, design, contacts } = this.model();
    const order = await firstValueFrom(
      this.http.post<{ id: number }>('/api/orders', {
        items: games.map((game) => ({
          gameId: game.id,
          quantity: 1,
        })),
        contacts,
        gift: design,
        total: this.total(),
      }),
    );
    this.model.set(emptyBox());
    // Новый набор — с чистого листа: без «тронутых» полей и показанных ошибок
    this.form().reset();
    return order.id;
  }
}
