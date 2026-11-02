// Заглушка глобального `process` для браузерной сборки @angular/compiler-cli (copy-vendor.mjs, ts-angular.mjs):
// трекер производительности ngtsc меряет время через process.hrtime. Подставляется esbuild (`inject`) только в код
// бандла — глобальный process в воркере не появляется, и TypeScript не принимает браузер за Node.
export const process = {
  env: {},
  platform: 'browser',
  cwd: () => '/',
  /** [секунды, наносекунды]; с аргументом — разница с прошлым замером, как в Node */
  hrtime(previous) {
    const now = performance.now();
    let seconds = Math.floor(now / 1000);
    let nanoseconds = Math.floor((now % 1000) * 1e6);
    if (!previous) return [seconds, nanoseconds];
    seconds -= previous[0];
    nanoseconds -= previous[1];
    if (nanoseconds < 0) {
      seconds--;
      nanoseconds += 1e9;
    }
    return [seconds, nanoseconds];
  },
  memoryUsage: () => ({ heapUsed: 0 }),
};
