import { effect, inject } from '@angular/core';
import {
  PartialStateUpdater,
  getState,
  patchState,
  signalStoreFeature,
  type,
  withHooks,
} from '@ngrx/signals';
import { BROWSER_STORAGE } from './browser-storage';

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
        // На сервере хранилища нет: состояние остаётся начальным
        const storage = inject(BROWSER_STORAGE);
        if (!storage) {
          return;
        }
        try {
          const saved: unknown = JSON.parse(
            storage.getItem(key) ?? 'null',
          );
          patchState(store, config.restore(saved));
        } catch {
          // Не JSON — остаётся начальное состояние
        }
        // getState читает все сигналы состояния: эффект перезапустится при любом изменении
        effect(() =>
          storage.setItem(
            key,
            JSON.stringify(config.save(getState(store))),
          ),
        );
      },
    }),
  );
}
