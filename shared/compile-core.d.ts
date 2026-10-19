// Типы для shared/compile-core.js (модуль на чистом JS: его импортируют и Node-скрипты)
export interface CompiledStep {
  /** Скомпилированные модули: 'app.js', 'core/cart.js' */
  files: Record<string, string>;
  /** Глобальные стили (styles.css шага) */
  styles: string[];
  /** Ошибки сборки: не найден файл шаблона, синтаксис */
  errors: string[];
}

export declare function compileFiles(
  ts: unknown,
  angularJitApplicationTransform: unknown,
  files: Record<string, string>,
  /** tests — компилировать и файлы тестов *.spec.ts (превью в режиме «Тесты») */
  options?: { tests?: boolean },
): CompiledStep;
