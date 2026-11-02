import { Service, computed, signal } from '@angular/core';
import { Game } from './models';

// Сколько игр можно сравнивать сразу: больше трёх столбцов не уместится на экране телефона
export const COMPARE_LIMIT = 3;

// Игры в сравнении: карточка добавляет и убирает, шапка показывает счётчик, страница /compare — таблицу.
// Живут до перезагрузки: сравнение — дело одного визита
@Service()
export class CompareStore {
  // Игры целиком, а не id: в таблице всё, что нужно, — без запросов к серверу
  private readonly list = signal<readonly Game[]>([]);

  readonly games = this.list.asReadonly();
  readonly count = computed(() => this.list().length);
  readonly isFull = computed(
    () => this.count() >= COMPARE_LIMIT,
  );

  has(game: Game): boolean {
    return this.list().some((item) => item.id === game.id);
  }

  // Добавить или убрать. Граница — здесь: кнопку можно включить и в обход disabled
  toggle(game: Game) {
    if (this.has(game)) {
      this.remove(game);
    } else if (!this.isFull()) {
      this.list.update((games) => [...games, game]);
    }
  }

  remove(game: Game) {
    this.list.update((games) =>
      games.filter((item) => item.id !== game.id),
    );
  }
}
