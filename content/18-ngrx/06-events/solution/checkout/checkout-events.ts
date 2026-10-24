import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';

// События оформления заказа. Событие говорит, что произошло, а не что с этим делать
export const checkoutEvents = eventGroup({
  source: 'Checkout',
  events: {
    // Заказ принят сервером. Тип — данные, которые событие несёт с собой
    orderPlaced: type<{ orderId: number }>(),
  },
});
