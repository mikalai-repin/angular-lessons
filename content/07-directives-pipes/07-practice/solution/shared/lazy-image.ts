import {
  Directive,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { InView } from './in-view';

// Ленивая картинка: <img [appLazy]="адрес"> загружается, только когда появилась на экране
@Directive({
  selector: 'img[appLazy]',
  hostDirectives: [InView],
  host: {
    class: 'lazy',
    '[attr.src]': 'src()',
    '[class.loaded]': 'loaded()',
    '(load)': 'loaded.set(true)',
  },
})
export class LazyImage {
  // Адрес картинки
  readonly appLazy = input.required<string>();

  // Была ли картинка на экране. Пока не была — атрибута src нет, и браузер её не загружает
  private readonly seen = signal(false);
  protected readonly src = computed(() =>
    this.seen() ? this.appLazy() : null,
  );
  // Картинка загрузилась — можно проявить
  protected readonly loaded = signal(false);

  constructor() {
    inject(InView).visible.subscribe(() => this.seen.set(true));
  }
}
