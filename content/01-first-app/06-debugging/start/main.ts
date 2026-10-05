import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app';
import { appConfig } from './app.config';

bootstrapApplication(App, appConfig)
  .then((appRef) =>
    console.log(
      'Магазин запущен. Корневых компонентов:',
      appRef.component.length,
    ),
  )
  .catch((err) => console.error(err));
