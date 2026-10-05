// Alt + щелчок по элементу превью: в консоли — путь, по которому Angular ищет зависимости ближайшего компонента,
// и где компонент нашёл каждую свою зависимость. Щелчок с Alt только пишет журнал: кнопка под курсором не сработает.
// Пользуется отладочными функциями Angular (ɵ) из глобального ng — они есть только в режиме разработки. Только для изучения.

// Эти токены есть у инжектора любого элемента — в журнале их не показываем
const EVERY_ELEMENT = ['Injector', 'DestroyRef', 'ElementRef', 'Renderer2', 'ViewContainerRef', 'ChangeDetectorRef'];

export function logInjectorsOnAltClick() {
  const ng = (window as any).ng;

  const tokenName = (token: any): string => token?.name ?? String(token);
  const describe = (injector: any): string => {
    const meta = ng.ɵgetInjectorMetadata(injector);
    if (meta?.type === 'element') {
      const el: Element = meta.source;
      const directives = [ng.getComponent(el), ...ng.getDirectives(el)].filter(Boolean).map((d) => d.constructor.name);
      const provided = ng
        .ɵgetInjectorProviders(injector)
        .map((p: any) => tokenName(p.token))
        .filter((name: string) => !EVERY_ELEMENT.includes(name));
      return (
        `<${el.tagName.toLowerCase()}> — ${directives.join(', ')}` +
        (provided.length > 0 ? `; провайдеры: ${provided.join(', ')}` : '')
      );
    }
    if (meta?.type === 'environment') {
      const scope = injector.scopes?.has('root') ? 'root' : injector.scopes?.has('platform') ? 'platform' : '';
      const count = ng.ɵgetInjectorProviders(injector).length;
      return `инжектор окружения ${scope} — провайдеров в списке: ${count}`;
    }
    return 'NullInjector — дальше искать негде: ошибка NG0201';
  };

  window.addEventListener(
    'click',
    (event) => {
      if (!event.altKey) return;
      event.preventDefault();
      event.stopPropagation();
      // Ближайший к месту щелчка хост компонента
      let el = event.target as Element | null;
      while (el && !ng.getComponent(el)) el = el.parentElement;
      if (!el) return;
      const component = ng.getComponent(el);
      const injector = ng.getInjector(el);

      console.log(`Путь поиска для ${component.constructor.name}:`);
      ng.ɵgetInjectorResolutionPath(injector).forEach((step: any, index: number) =>
        console.log(`  ${index + 1}. ${describe(step)}`),
      );
      const deps = ng.ɵgetDependenciesFromInjectable(injector, component.constructor)?.dependencies ?? [];
      console.log(
        deps.length > 0
          ? `${component.constructor.name} получил: ` +
              deps.map((d: any) => `${tokenName(d.token)} ← ${describe(d.providedIn).split(' — ')[0]}`).join('; ')
          : `${component.constructor.name} ничего не внедряет`,
      );
    },
    // Фаза перехвата: журнал срабатывает раньше обработчиков Angular и останавливает событие
    true,
  );
}
