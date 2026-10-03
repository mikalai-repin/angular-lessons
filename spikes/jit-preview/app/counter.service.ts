import { Injectable, signal, computed } from '@angular/core';
@Injectable({ providedIn: 'root' })
export class CounterService {
  readonly count = signal(0);
  readonly double = computed(() => this.count() * 2);
  inc() { this.count.update((c) => c + 1); }
}
