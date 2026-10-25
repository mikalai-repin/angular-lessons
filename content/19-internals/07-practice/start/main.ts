import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app';
import { appConfig } from './app.config';
import { logChangeDetectionReasons } from './debug/cd-log';
import { logViewOnAltClick } from './debug/view-log';

bootstrapApplication(App, appConfig)
  .then((appRef) => {
    // Alt + щелчок по элементу — его представление в консоли
    logViewOnAltClick();
    // Каждая проверка приложения: что её запросило и почему обновлён каждый шаблон
    logChangeDetectionReasons(appRef);
  })
  .catch((err) => console.error(err));
