import { effect } from '@angular/core';
import {
  PartialStateUpdater,
  getState,
  patchState,
  signalStoreFeature,
  type,
  withHooks,
} from '@ngrx/signals';

// Как сохранять состояние хранилища в localStorage
export interface StorageConfig<State extends object> {
  // Что записать: из состояния — то, что стоит сохранить
  save: (state: State) => unknown;
  // Что восстановить: прочитанное могли испортить или подменить — поэтому unknown
  restore: (
    saved: unknown,
  ) => Partial<State> | PartialStateUpdater<State>;
}

// Своё расширение Signal Store: хранилище восстанавливается из localStorage при создании
// и записывается туда при каждом изменении состояния
export function withStorage<State extends object>(
  key: string,
  config: StorageConfig<State>,
) {
  return signalStoreFeature(
    // Что расширению нужно от хранилища: состояние типа State. Тип выведется из хранилища
    { state: type<State>() },
    withHooks({
      onInit(store) {
        // TODO: восстановить — прочитать key из localStorage (JSON.parse), передать в config.restore,
        // результат — в patchState. Не JSON — оставить начальное состояние
        // TODO: записывать — effect: getState(store) → config.save → localStorage.setItem(key, …)
      },
    }),
  );
}
