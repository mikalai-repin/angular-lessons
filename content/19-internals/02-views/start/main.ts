import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app';
import { appConfig } from './app.config';
import { logViewOnAltClick } from './debug/view-log';

bootstrapApplication(App, appConfig)
  // TODO: когда приложение запустится, включите журнал представлений — logViewOnAltClick()
  .catch((err) => console.error(err));
