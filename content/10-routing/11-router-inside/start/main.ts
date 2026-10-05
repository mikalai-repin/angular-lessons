import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app';
import { appConfig } from './app.config';
import { logNavigation } from './router-log';

// Журнал навигации подключается в провайдере, который выполняется при запуске приложения — до первого перехода
bootstrapApplication(App, {
  providers: [...appConfig.providers, logNavigation()],
}).catch((err) => console.error(err));
