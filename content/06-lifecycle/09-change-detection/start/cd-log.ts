// Пишет в консоль, шаблоны каких компонентов Angular обновил за одну проверку приложения
// и какие из них при этом созданы впервые.
// Подключается к профайлеру Angular — тому же, которым пользуется Angular DevTools.
// Профайлер — внутренний API (ɵ) и есть только в режиме разработки. Только для изучения.

// Номера событий профайлера Angular 22 (ProfilerEvent в исходниках @angular/core)
const TEMPLATE_CREATE_START = 0;
const TEMPLATE_UPDATE_START = 2;
const CHANGE_DETECTION_END = 13;

export function logChangeDetection() {
  const ng = (window as any).ng;
  let checked: string[] = [];
  let created: string[] = [];

  ng.ɵsetProfiler((event: number, context: any) => {
    // context — экземпляр компонента; у блоков @if и @for он свой, их пропускаем
    const name = context?.constructor?.ɵcmp ? context.constructor.name : null;
    if (event === TEMPLATE_CREATE_START && name) created.push(name);
    if (event === TEMPLATE_UPDATE_START && name) checked.push(name);
    if (event === CHANGE_DETECTION_END && checked.length > 0) {
      console.log(
        `Проверены: ${summary(checked)}` + (created.length > 0 ? ` (из них созданы: ${summary(created)})` : ''),
      );
      checked = [];
      created = [];
    }
  });
}

// ['App', 'GameCard', 'GameCard'] → «App, GameCard ×2»
function summary(names: string[]): string {
  const counts = new Map<string, number>();
  for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1);
  return [...counts].map(([name, count]) => (count > 1 ? `${name} ×${count}` : name)).join(', ');
}
