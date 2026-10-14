// Типы проверок шагов (content/<глава>/<шаг>/check.ts). Проверку выполняет среда превью
// (public/preview-runtime.js) в запущенном приложении ученика: после старта, когда Angular отрисовал экран.
// Проверяем результат (DOM, адрес, запросы), а не текст кода. Формат — docs/lesson-format.md.
declare module '@course/check' {
  /** Запрос к учебному бэкенду с начала проверки */
  export interface CheckRequest {
    method: string;
    /** Путь с параметрами: '/api/games?q=кот' */
    url: string;
    status: number | 'canceled';
  }

  export interface CheckContext {
    /** Документ приложения */
    document: Document;
    /** Адрес приложения, как в адресной строке превью: '/catalog?q=кот' */
    url(): string;
    /** Переход внутри приложения (как ссылка, без перезапуска) и ожидание отрисовки */
    navigate(url: string): Promise<void>;
    /** Ждёт, пока Angular обновит экран и закончатся запросы; ms — подождать ещё сверх этого */
    settle(ms?: number): Promise<void>;
    /** Первый элемент по селектору */
    $<E extends Element = HTMLElement>(selector: string, root?: ParentNode): E | null;
    /** Все элементы по селектору */
    $$<E extends Element = HTMLElement>(selector: string, root?: ParentNode): E[];
    /** Видимый текст одной строкой: пробелы схлопнуты, неразрывные — обычные. Нет элемента — '' */
    text(target: string | Element | null | undefined): string;
    /** Элемент есть на странице и виден (не hidden, не display: none) */
    visible(target: string | Element | null | undefined): boolean;
    /** Щелчок и ожидание отрисовки */
    click(target: string | Element): Promise<void>;
    /** Новое значение поля (input, textarea, select) с событиями input и change, затем ожидание отрисовки */
    fill(target: string | Element, value: string): Promise<void>;
    /** Флажок: если состояние отличается от checked — щелчок */
    setChecked(target: string | Element, checked: boolean): Promise<void>;
    /** Завершает проверку неудачей с подсказкой */
    fail(hint: string): never;
    /** Запросы к учебному бэкенду с начала проверки (завершённые и отменённые) */
    readonly requests: readonly CheckRequest[];
    /** Строки консоли приложения (console.log и другие уровни) с начала проверки */
    readonly logs: readonly string[];
    /** Ошибки в консоли приложения с начала запуска */
    readonly errors: readonly string[];
  }

  export interface CheckResult {
    pass: boolean;
    /** Обязателен при pass: false — что не так и куда смотреть, без готового ответа */
    hint?: string;
  }

  export type Check = (context: CheckContext) => CheckResult | Promise<CheckResult>;

  /**
   * Необязательный `export const storage: CheckStorage` в check.ts: ключи localStorage, с которыми приложение
   * стартует перед проверкой (сохранённая корзина и т. п.). Данные ученика на время проверки убираются
   * и потом возвращаются
   */
  export type CheckStorage = Record<string, string>;
}
