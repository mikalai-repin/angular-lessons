import { useEffect, useRef, useState, type FormEvent } from 'react';

// Модальные окна платформы вместо window.prompt / confirm / alert: тот же вызов «спросил — дождался ответа»,
// но окно в стиле платформы, а ошибку ввода видно под полем. Окно — нативный <dialog> (showModal):
// затемнение, Esc и фокус внутри окна даёт браузер. Хост один на приложение (DialogHost в App)

interface TextRequest {
  kind: 'text';
  title: string;
  message?: string;
  value: string;
  /** Выделить в поле [начало, конец); по умолчанию курсор в конце */
  selection?: [number, number];
  confirmLabel?: string;
  /** Текст ошибки или null: с ошибкой окно не закрывается */
  validate?: (value: string) => string | null;
  resolve: (value: string | null) => void;
}

interface ConfirmRequest {
  kind: 'confirm';
  title: string;
  message?: string;
  confirmLabel?: string;
  /** Действие что-то удаляет: кнопка красная, фокус — на «Отмене» */
  danger?: boolean;
  resolve: (ok: boolean) => void;
}

interface MessageRequest {
  kind: 'message';
  title: string;
  message?: string;
  resolve: () => void;
}

type Request = TextRequest | ConfirmRequest | MessageRequest;
type Options<T extends Request> = Omit<T, 'kind' | 'resolve'>;

let show: ((request: Request) => void) | null = null;

/** Поле ввода; null — ученик отказался */
export function askText(options: Options<TextRequest>): Promise<string | null> {
  return new Promise((resolve) => open({ kind: 'text', ...options, resolve }, () => resolve(null)));
}

export function askConfirm(options: Options<ConfirmRequest>): Promise<boolean> {
  return new Promise((resolve) => open({ kind: 'confirm', ...options, resolve }, () => resolve(false)));
}

export function showMessage(options: Options<MessageRequest>): Promise<void> {
  return new Promise((resolve) => open({ kind: 'message', ...options, resolve }, resolve));
}

function open(request: Request, fallback: () => void) {
  // Без хоста (не должно случаться) — как будто ученик нажал «Отмена»
  if (show) show(request);
  else fallback();
}

export function DialogHost() {
  const [request, setRequest] = useState<Request | null>(null);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const requestRef = useRef<Request | null>(null);
  requestRef.current = request;

  useEffect(() => {
    show = (next) => {
      // Новое окно поверх открытого: старое считаем отменённым
      if (requestRef.current) answer(requestRef.current, null);
      setValue(next.kind === 'text' ? next.value : '');
      setError(null);
      setRequest(next);
    };
    return () => {
      show = null;
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!request || !dialog) return;
    if (!dialog.open) dialog.showModal();
    if (request.kind === 'text') {
      const input = inputRef.current!;
      input.focus();
      const [start, end] = request.selection ?? [input.value.length, input.value.length];
      input.setSelectionRange(start, end);
    } else if (request.kind === 'confirm' && request.danger) {
      cancelRef.current?.focus();
    } else {
      confirmRef.current?.focus();
    }
  }, [request]);

  function close(result: string | boolean | null) {
    if (!request) return;
    answer(request, result);
    setRequest(null);
    dialogRef.current?.close();
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (request?.kind !== 'text') return close(true);
    const problem = request.validate?.(value) ?? null;
    if (problem) {
      setError(problem);
      inputRef.current?.focus();
      return;
    }
    close(value);
  }

  const confirmLabel = request?.kind === 'message' ? 'Понятно' : (request?.confirmLabel ?? 'OK');
  const danger = request?.kind === 'confirm' && request.danger;

  return (
    <dialog
      ref={dialogRef}
      className="app-dialog"
      aria-labelledby="app-dialog-title"
      // Esc: браузер закрыл бы окно сам — закрываем через close(), чтобы ответить вызвавшему
      onCancel={(event) => {
        event.preventDefault();
        close(null);
      }}
      // Щелчок по затемнению вокруг окна — тоже отмена
      onMouseDown={(event) => event.target === event.currentTarget && close(null)}
    >
      {request && (
        <form className="app-dialog-body" onSubmit={onSubmit}>
          <h2 id="app-dialog-title">{request.title}</h2>
          {request.message && <p className="app-dialog-message">{request.message}</p>}
          {request.kind === 'text' && (
            <>
              <input
                ref={inputRef}
                className="app-dialog-input"
                value={value}
                spellCheck={false}
                autoComplete="off"
                aria-invalid={error !== null}
                aria-describedby={error ? 'app-dialog-error' : undefined}
                onChange={(event) => {
                  setValue(event.target.value);
                  setError(null);
                }}
              />
              {error && (
                <p id="app-dialog-error" className="app-dialog-error" role="alert">
                  {error}
                </p>
              )}
            </>
          )}
          <div className="app-dialog-actions">
            {request.kind !== 'message' && (
              <button ref={cancelRef} type="button" className="button" onClick={() => close(null)}>
                Отмена
              </button>
            )}
            <button ref={confirmRef} type="submit" className={danger ? 'button danger' : 'button primary'}>
              {confirmLabel}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}

function answer(request: Request, result: string | boolean | null) {
  if (request.kind === 'text') request.resolve(typeof result === 'string' ? result : null);
  else if (request.kind === 'confirm') request.resolve(result === true);
  else request.resolve();
}
