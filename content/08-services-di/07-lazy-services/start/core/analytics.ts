import { Service } from '@angular/core';

// Только для урока: строка появится в консоли, когда браузер загрузит и выполнит этот модуль
console.log('Аналитика: модуль загружен');

// Аналитика магазина. Настоящая отправляла бы события на сервер, учебная пишет их в консоль
@Service()
export class Analytics {
  constructor() {
    console.log('Аналитика: экземпляр создан');
  }

  track(event: string, details: string) {
    console.log(`Аналитика: ${event} — ${details}`);
  }
}
