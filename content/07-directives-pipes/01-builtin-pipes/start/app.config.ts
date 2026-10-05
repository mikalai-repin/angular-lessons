import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';

export const appConfig: ApplicationConfig = {
  // TODO: локаль приложения — ru (LOCALE_ID) и данные локали (registerLocaleData)
  providers: [provideBrowserGlobalErrorListeners()],
};
