import { signalStore, withState } from '@ngrx/signals';

// TODO: «Вы смотрели» — последние MAX_RECENT открытых игр, самая свежая первой.
// Коллекция игр (withEntities), сохранение в localStorage (withStorage, ключ 'hod-konem:recent:v1')
// и метод remember на signalMethod<Game | undefined>
export const RecentStore = signalStore(
  { providedIn: 'root' },
  withState({}),
);
