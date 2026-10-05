import {
  Component,
  input,
  model,
  numberAttribute,
} from '@angular/core';

// Выбор количества: «− N +» в пределах от min до max
@Component({
  selector: 'app-quantity',
  templateUrl: './quantity.html',
  styleUrl: './quantity.css',
})
export class Quantity {
  readonly value = model.required<number>();
  // Границы можно задать и привязкой, и атрибутом: min="1" — строка, numberAttribute сделает из неё число
  readonly min = input(0, { transform: numberAttribute });
  readonly max = input(Infinity, {
    transform: numberAttribute,
  });

  protected change(delta: number) {
    this.value.update((value) =>
      Math.min(Math.max(value + delta, this.min()), this.max()),
    );
  }
}
