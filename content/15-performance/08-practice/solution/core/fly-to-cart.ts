import { Service, signal } from '@angular/core';

// Обложка в полёте: что летит и откуда
export interface Flight {
  id: number;
  cover: string;
  // Где была обложка в карточке, когда нажали «В корзину»
  from: DOMRect;
}

// Полёт обложки в корзину: карточка запускает, FlyingCovers в шапке показывает
@Service()
export class FlyToCart {
  private nextId = 1;
  private readonly flightsState = signal<readonly Flight[]>([]);
  // Обложки, которые летят прямо сейчас
  readonly flights = this.flightsState.asReadonly();

  // Запустить обложку из картинки карточки
  launch(cover: string, from: HTMLElement) {
    // Покупатель попросил систему поменьше двигать интерфейс — не летим
    if (
      matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    const flight: Flight = {
      id: this.nextId++,
      cover,
      // Замеряем сейчас: потом карточка может уехать или исчезнуть
      from: from.getBoundingClientRect(),
    };
    this.flightsState.update((flights) => [...flights, flight]);
  }

  // Обложка долетела — убрать её
  land(flight: Flight) {
    this.flightsState.update((flights) =>
      flights.filter((f) => f !== flight),
    );
  }
}
