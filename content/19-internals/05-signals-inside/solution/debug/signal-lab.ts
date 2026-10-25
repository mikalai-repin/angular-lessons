// Лаборатория: сигналы из примитивов Angular — тех самых, из которых сделаны signal, computed и effect.
// @angular/core/primitives/signals — пакет для авторов фреймворков и библиотек; в приложении пишут signal,
// computed и effect. Только для изучения.
import {
  SIGNAL,
  createComputed,
  createSignal,
  createWatch,
} from '@angular/core/primitives/signals';

// Наш «эффект». Что выполнять и когда перезапускать, решает узел createWatch;
// когда именно выполнить — функция schedule: у нас микрозадачей
function watch(fn: () => void) {
  const handle = createWatch(
    fn,
    (watcher) => queueMicrotask(() => watcher.run()),
    false,
  );
  // Первый запуск — тоже через schedule
  handle.notify();
}

const pause = () =>
  new Promise((resolve) => setTimeout(resolve));

export async function runSignalLab() {
  // createSignal возвращает три функции: чтение, запись, обновление
  const [price, setPrice] = createSignal(1990);
  const [quantity, setQuantity] = createSignal(1);
  let runs = 0;
  const total = createComputed(() => {
    runs++;
    return price() * quantity();
  });

  // У функции-сигнала узел — в свойстве SIGNAL. Версия растёт, только когда значение изменилось
  const versions = () =>
    `версии: price ${price[SIGNAL].version}, quantity ${quantity[SIGNAL].version}, total ${total[SIGNAL].version}`;

  watch(() =>
    console.log(
      `Итог ${total()}; вычислений total: ${runs}; ${versions()}`,
    ),
  );
  await pause();

  console.log('— Две записи подряд');
  setQuantity(2);
  setQuantity(3);
  await pause();

  console.log('— Запись того же значения');
  setPrice(1990);
  await pause();

  console.log('— Другие значения, тот же итог');
  setPrice(2985);
  setQuantity(2);
  await pause();
  console.log(`Вычислений total: ${runs}; ${versions()}`);
}
