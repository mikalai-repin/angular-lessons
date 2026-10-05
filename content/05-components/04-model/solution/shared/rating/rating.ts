import { Component, model } from '@angular/core';

// Рейтинг звёздами: показывает оценку и даёт её выбрать
@Component({
  selector: 'app-rating',
  templateUrl: './rating.html',
  styleUrl: './rating.css',
})
export class Rating {
  // Оценка от 0 до 5. Родитель может и задать её, и узнать, что её изменили
  readonly value = model(0);

  protected readonly stars = [1, 2, 3, 4, 5];

  protected select(star: number, event: MouseEvent) {
    // Щелчок по левой половине звезды — половина звезды
    const rect = (
      event.currentTarget as HTMLElement
    ).getBoundingClientRect();
    const selected =
      event.clientX - rect.left < rect.width / 2
        ? star - 0.5
        : star;
    // Повторный щелчок по той же оценке сбрасывает её
    this.value.update((value) =>
      value === selected ? 0 : selected,
    );
  }
}
