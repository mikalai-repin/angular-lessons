import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app';
import { appConfig } from './app.config';
import { logChangeDetection } from './cd-log';

bootstrapApplication(App, appConfig)
  .then(() => logChangeDetection())
  .catch((err) => console.error(err));
