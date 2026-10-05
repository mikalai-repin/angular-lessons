import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app';

bootstrapApplication(App)
  .then((appRef) =>
    console.log(
      'Магазин запущен. Корневых компонентов:',
      appRef.components.length,
    ),
  )
  .catch((err) => console.error(err));
