import { computed, signal } from '@angular/core';
import { BehaviorSubject, combineLatest, map } from 'rxjs';

// Опыт для шага «Под капотом»: одна и та же производная величина на RxJS и на сигналах.
// Цена игры и цена со скидкой 10 % — обе зависят от одной цены, итог — от обеих («ромб»)
export function compareDiamond() {
  // RxJS: BehaviorSubject — поток, который помнит последнее значение и сразу отдаёт его подписчику
  const price$ = new BehaviorSubject(1000);
  const discounted$ = price$.pipe(map((price) => price * 0.9));
  combineLatest([price$, discounted$]).subscribe(
    ([price, discounted]) =>
      console.log(`RxJS: ${price} → ${discounted}`),
  );

  // Сигналы: то же самое
  const price = signal(1000);
  const discounted = computed(() => price() * 0.9);
  const line = computed(
    () => `Сигналы: ${price()} → ${discounted()}`,
  );
  console.log(line());

  // Цена изменилась
  price$.next(2000);
  price.set(2000);
  console.log(line());
}
