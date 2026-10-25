import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app';
import { appConfig } from './app.config';
import { logViewOnAltClick } from './debug/view-log';

bootstrapApplication(App, appConfig)
  // Alt + щелчок по элементу — его представление в консоли
  .then(() => logViewOnAltClick())
  .catch((err) => console.error(err));
