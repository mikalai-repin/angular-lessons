import { Component, booleanAttribute, input, model } from '@angular/core';

// Рейтинг звёздами: показывает оценку и, если не readonly, даёт её выбрать
@Component({
  selector: 'app-rating',
  templateUrl: './rating.html',
  styleUrl: './rating.css',
  host: {
    '[attr.role]': "readonly() ? 'img' : 'slider'",
    '[attr.aria-label]': "'Рейтинг ' + value() + ' из 5'",
    '[attr.aria-valuenow]': 'readonly() ? null : value()',
    '[attr.aria-valuemax]': 'readonly() ? null : 5',
    '[attr.tabindex]': 'readonly() ? null : 0',
    '[class.readonly]': 'readonly()',
    '(keydown.arrowright)': 'step(0.5)',
    '(keydown.arrowleft)': 'step(-0.5)',
  },
})
export class Rating {
  // Оценка от 0 до 5. Родитель может и задать её, и узнать, что её изменили
  readonly value = model(0);
  // Только показывать, не давать менять. <app-rating readonly> — то же, что [readonly]="true"
  readonly readonly = input(false, { transform: booleanAttribute });

  protected readonly stars = [1, 2, 3, 4, 5];

  protected select(star: number, event: MouseEvent) {
    if (this.readonly()) return;
    // Щелчок по левой половине звезды — половина звезды
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const selected = event.clientX - rect.left < rect.width / 2 ? star - 0.5 : star;
    // Повторный щелчок по той же оценке сбрасывает её
    this.value.update((value) => (value === selected ? 0 : selected));
  }

  // Стрелки на клавиатуре: на ползвезды больше или меньше
  protected step(delta: number) {
    if (this.readonly()) return;
    this.value.update((value) => Math.min(Math.max(Math.round(value * 2) / 2 + delta, 0), 5));
  }
}
