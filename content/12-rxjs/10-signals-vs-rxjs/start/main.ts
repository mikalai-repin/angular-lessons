import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app';
import { appConfig } from './app.config';
import { compareDiamond } from './diamond';

// Опыт шага «Под капотом»: вывод — в консоли
compareDiamond();

bootstrapApplication(App, appConfig).catch((err) =>
  console.error(err),
);
