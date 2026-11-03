import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { GameCardComponent } from './game-card/game-card.component';

// Модуль приложения: какие компоненты в нём объявлены
// и какие модули видны их шаблонам
@NgModule({
  declarations: [AppComponent],
  // Standalone-компонент в модуле не объявляют, а импортируют
  imports: [BrowserModule, FormsModule, GameCardComponent],
  // Добавлено при обновлении до 18: вместо HttpClientModule в imports
  providers: [provideHttpClient(withInterceptorsFromDi())],
  bootstrap: [AppComponent],
})
export class AppModule {}
