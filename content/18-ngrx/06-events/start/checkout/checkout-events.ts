import { eventGroup } from '@ngrx/signals/events';

// События оформления заказа. Событие говорит, что произошло, а не что с этим делать
// TODO: событие orderPlaced — заказ принят сервером, данные — { orderId: number } (type из '@ngrx/signals')
export const checkoutEvents = eventGroup({
  source: 'Checkout',
  events: {},
});
