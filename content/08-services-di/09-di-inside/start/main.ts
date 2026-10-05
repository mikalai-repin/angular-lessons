import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app';
import { appConfig } from './app.config';
import { logInjectorsOnAltClick } from './di-log';

bootstrapApplication(App, appConfig)
  .then(() => logInjectorsOnAltClick())
  .catch((err) => console.error(err));
