import {
  AnimationCallbackEvent,
  Component,
  inject,
  input,
} from '@angular/core';
import { Flight, FlyToCart } from '../../core/fly-to-cart';

// Обложки, которые летят в корзину. Стоят в шапке рядом со ссылкой на корзину
@Component({
  selector: 'app-flying-covers',
  templateUrl: './flying-covers.html',
  styleUrl: './flying-covers.css',
})
export class FlyingCovers {
  // Куда лететь: ссылка на корзину в шапке
  readonly target = input.required<HTMLElement>();
  protected readonly flyToCart = inject(FlyToCart);

  // Обложка появилась на месте картинки карточки — летим к корзине
  protected takeOff(
    event: AnimationCallbackEvent,
    flight: Flight,
  ) {
    const cover = event.target as HTMLElement;
    const from = flight.from;
    const to = this.target().getBoundingClientRect();
    // На сколько сдвинуть центр обложки, чтобы он попал в центр ссылки
    const dx =
      to.left + to.width / 2 - (from.left + from.width / 2);
    const dy =
      to.top + to.height / 2 - (from.top + from.height / 2);
    const animation = cover.animate(
      [
        { transform: 'none', opacity: 1 },
        {
          transform: `translate(${dx}px, ${dy}px) scale(0.1)`,
          opacity: 0.6,
        },
      ],
      // forwards: долетевшая обложка не прыгнет назад, пока её не убрали
      { duration: 700, easing: 'ease-in', fill: 'forwards' },
    );
    animation.onfinish = () => {
      this.flyToCart.land(flight);
      // Ссылка на корзину «ловит» обложку
      this.target().animate(
        [
          { transform: 'scale(1)' },
          { transform: 'scale(1.2)' },
          { transform: 'scale(1)' },
        ],
        { duration: 250 },
      );
    };
  }
}
