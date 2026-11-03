// Только в превью: в проекте CLI zone.js подключают в angular.json → polyfills
import 'zone.js';
import { provideZoneChangeDetection } from '@angular/core';
import { platformBrowser } from '@angular/platform-browser';
import { AppModule } from './legacy/app.module';

platformBrowser()
  .bootstrapModule(AppModule, {
    // Добавлено при обновлении до 21: обнаружение изменений на zone.js
    applicationProviders: [provideZoneChangeDetection()],
  })
  .catch((err) => console.error(err));
