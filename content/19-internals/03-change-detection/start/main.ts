import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app';
import { appConfig } from './app.config';
import { logChangeDetectionReasons } from './debug/cd-log';
import { logViewOnAltClick } from './debug/view-log';

bootstrapApplication(App, appConfig)
  .then((appRef) => {
    // Alt + щелчок по элементу — его представление в консоли
    logViewOnAltClick();
    // TODO: журнал проверок с причинами — logChangeDetectionReasons(appRef)
  })
  .catch((err) => console.error(err));
