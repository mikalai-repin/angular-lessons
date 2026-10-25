import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app';
import { appConfig } from './app.config';
import { logChangeDetectionReasons } from './debug/cd-log';
import { runSignalLab } from './debug/signal-lab';
import { logViewOnAltClick } from './debug/view-log';

// Лаборатория сигналов: печатает в консоль, как живут узлы
runSignalLab();

bootstrapApplication(App, appConfig)
  .then((appRef) => {
    // Alt + щелчок по элементу — его представление в консоли
    logViewOnAltClick();
    // Каждая проверка приложения: что её запросило и почему обновлён каждый шаблон
    logChangeDetectionReasons(appRef);
  })
  .catch((err) => console.error(err));
