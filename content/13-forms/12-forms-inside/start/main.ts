import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app';
import { appConfig } from './app.config';
import { exploreForms } from './forms-inside';

bootstrapApplication(App, appConfig)
  // Опыт шага «Под капотом»: вывод — в консоли
  .then((app) => exploreForms(app.injector))
  .catch((err) => console.error(err));
