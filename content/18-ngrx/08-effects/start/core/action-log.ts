import { isDevMode } from '@angular/core';
import { ActionReducer, MetaReducer } from '@ngrx/store';

// Мета-редьюсер — обёртка вокруг редьюсера всего Store: видит каждое действие и состояние после него
function logActions(
  reducer: ActionReducer<object>,
): ActionReducer<object> {
  return (state, action) => {
    const next = reducer(state, action);
    console.log('Действие:', action.type, JSON.stringify(next));
    return next;
  };
}

// Журнал — только при разработке
export const metaReducers: MetaReducer[] = isDevMode()
  ? [logActions]
  : [];
