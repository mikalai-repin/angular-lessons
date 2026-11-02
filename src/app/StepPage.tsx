import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Group, Panel, Separator, usePanelRef, type PanelImperativeHandle } from 'react-resizable-panels';
import { Navigate, useParams } from 'react-router';
import { findStep, neighbours, nextPath, type FileMap, type Step } from '../content/course';
import { CodeEditor } from '../editor/CodeEditor';
import { fileNameError, normalizeFileName, orderFiles } from '../editor/files';
import { compileStep } from '../compiler';
import {
  collectDiagnostics,
  disposeModels,
  disposeOtherModels,
  formatEditor,
  readModels,
  refreshDiagnostics,
  syncModels,
} from '../editor/monaco';
import { LessonPanel } from '../lesson/LessonPanel';
import { Preview, type CheckResult, type PreviewMode, type PreviewRun } from '../preview/Preview';
import { progress } from '../progress/storage';
import { downloadProject } from './download';
import { askConfirm, askText, showMessage } from './Dialog';
import { useMediaQuery } from './useMediaQuery';

const AUTORUN_DELAY = 1000;
const SAVE_DELAY = 300;

type PaneId = 'lesson' | 'code' | 'result';

const PANE_LABELS: Record<PaneId, string> = { lesson: 'Урок', code: 'Код', result: 'Результат' };
/** Ширина свёрнутой панели — полоска с подписью */
const COLLAPSED_SIZE = '34px';

export function StepPage() {
  const params = useParams();
  const step = findStep(params.chapter, params.step);
  if (!step) return <Navigate to="/" replace />;
  // key: при смене шага всё состояние рабочей области создаётся заново
  return <StepWorkspace key={step.id} step={step} />;
}

/**
 * Стартовые файлы шага: код из base, а где его нет — из старта; deleted — файлы, которые ученик удалил
 * или переименовал. Файлы, которые есть только в решении, ученик создаёт сам — на старте их нет
 */
function startFiles(step: Step, base: FileMap = {}, deleted: string[] = []): FileMap {
  const files: FileMap = {};
  for (const name of step.fileOrder) {
    if (name in step.start && !deleted.includes(name)) files[name] = base[name] ?? step.start[name];
  }
  return files;
}

/** Сохранённый код ученика, дополненный файлами, которые появились в старте шага позже, и созданными им файлами */
function initialFiles(step: Step): FileMap {
  const saved = progress.getCode(step.id) ?? {};
  return { ...startFiles(step, saved, progress.getDeleted(step.id)), ...saved };
}

/** Удалённые файлы старта: те, которых нет в коде ученика */
const deletedOf = (step: Step, files: FileMap) => Object.keys(step.start).filter((name) => !(name in files));

let runCounter = 0;

function StepWorkspace({ step }: { step: Step }) {
  const isNarrow = useMediaQuery('(max-width: 900px)');
  const [files] = useState(() => {
    const initial = initialFiles(step);
    // Модели Monaco нужны до первого рендера редактора. Модели прошлого шага — убрать сразу, не дожидаясь его очистки
    disposeOtherModels(step.id);
    syncModels(step.id, initial);
    return initial;
  });
  const filesRef = useRef(files);
  /** Вкладки: файлы шага без удалённых и файлы, созданные учеником */
  const [fileList, setFileList] = useState(() => orderFiles(step.fileOrder, files));
  const fileListRef = useRef(fileList);
  const [active, setActive] = useState(() => {
    const focus = step.meta.focus;
    return focus && fileList.includes(focus) ? focus : fileList[0];
  });
  const [run, setRun] = useState<PreviewRun | null>(null);
  const [autorun, setAutorun] = useState(progress.getAutorun);
  const [hasBackup, setHasBackup] = useState(() => Boolean(progress.getBackup(step.id)));
  const [downloading, setDownloading] = useState(false);
  const [mobileTab, setMobileTab] = useState<PaneId>('lesson');
  /** Проверка шага: идёт или её результат */
  const [check, setCheck] = useState<'running' | CheckResult | null>(null);
  /** Что показывает превью: приложение или тесты. Frontmatter preview: tests — тесты при входе и при проверке */
  const defaultMode: PreviewMode = step.meta.preview === 'tests' ? 'tests' : 'app';
  const modeRef = useRef<PreviewMode>(defaultMode);
  const hasTests = defaultMode === 'tests' || fileList.some((file) => file.endsWith('.spec.ts'));
  const panes = useCollapsiblePanes(!isNarrow, () => runCode());

  const timers = useRef<{ save?: number; autorun?: number }>({});

  const { prev } = neighbours(step);

  /** withCheck: после запуска — проверка шага (check.ts); проверка — всегда в режиме шага (preview из frontmatter) */
  const runCode = useCallback(
    async (withCheck = false) => {
      window.clearTimeout(timers.current.autorun);
      const id = ++runCounter;
      setCheck(withCheck ? 'running' : null);
      if (withCheck) modeRef.current = defaultMode;
      const mode = modeRef.current;
      const list = fileListRef.current;
      // Код компилирует воркер (TypeScript 6 + JIT-трансформ Angular), ошибки типов даёт TS-воркер Monaco
      const [compiled, diagnostics, checkCode] = await Promise.all([
        compileStep(readModels(step.id, list), { tests: mode === 'tests' }).catch((error: Error) => ({
          files: {},
          styles: [],
          errors: [`Компилятор не запустился: ${error.message}`],
        })),
        collectDiagnostics(step.id, list),
        withCheck && step.check
          ? compileStep({ 'check.ts': step.check }).then((result) => result.files['check.js'])
          : undefined,
      ]);
      // Пока компилировали, мог начаться следующий запуск — устаревший результат не показываем
      if (id !== runCounter) return;
      setRun({
        mode,
        files: compiled.files,
        styles: compiled.styles,
        buildErrors: compiled.errors,
        diagnostics,
        entry: 'main.js',
        id,
        check: checkCode,
      });
    },
    [step, defaultMode],
  );

  const onModeChange = useCallback(
    (mode: PreviewMode) => {
      modeRef.current = mode;
      runCode();
    },
    [runCode],
  );

  const onCheckResult = useCallback(
    (result: CheckResult) => {
      setCheck(result);
      if (result.pass) progress.setDone(step.id);
    },
    [step],
  );

  useEffect(() => {
    syncModels(step.id, filesRef.current);
    progress.setLastStep(step.id);
    runCode();
    // Подчёркивания, посчитанные, пока воркер ещё не знал всех файлов шага, пересчитываем
    refreshDiagnostics(step.id, fileListRef.current);
    const pending = timers.current;
    return () => {
      window.clearTimeout(pending.autorun);
      window.clearTimeout(pending.save);
      disposeModels(step.id);
    };
  }, [step, runCode]);

  const onChange = useCallback(
    (file: string, code: string) => {
      if (filesRef.current[file] === code) return;
      filesRef.current = { ...filesRef.current, [file]: code };

      window.clearTimeout(timers.current.save);
      timers.current.save = window.setTimeout(
        () => progress.setCode(step.id, filesRef.current, deletedOf(step, filesRef.current)),
        SAVE_DELAY,
      );

      if (autorun) {
        window.clearTimeout(timers.current.autorun);
        timers.current.autorun = window.setTimeout(() => runCode(), AUTORUN_DELAY);
      }
    },
    [step, autorun, runCode],
  );

  /**
   * Подменяет набор файлов и их код (сброс, решение, возврат своего кода, создание, переименование и удаление файла).
   * nextActive — какой файл открыть; если открытого файла больше нет, открывается соседний
   */
  function replaceFiles(nextFiles: FileMap, nextActive?: string) {
    window.clearTimeout(timers.current.save);
    const previous = fileListRef.current;
    const list = orderFiles(step.fileOrder, nextFiles);
    filesRef.current = nextFiles;
    fileListRef.current = list;
    syncModels(step.id, nextFiles);
    progress.setCode(step.id, nextFiles, deletedOf(step, nextFiles));
    setFileList(list);
    setActive((current) => {
      if (nextActive && list.includes(nextActive)) return nextActive;
      if (list.includes(current)) return current;
      const index = Math.max(previous.indexOf(current), 0);
      return list[Math.min(index, list.length - 1)];
    });
    // Новый .ts-файл воркер TypeScript должен узнать до проверки соседей, которые его импортируют
    refreshDiagnostics(step.id, list);
    runCode();
  }

  async function onCreateFile() {
    const folder = active.slice(0, active.lastIndexOf('/') + 1);
    const answer = await askText({
      title: 'Новый файл',
      message: 'Путь от src/app/, расширение .ts, .html или .css.',
      value: folder,
      confirmLabel: 'Создать',
      validate: (value) => fileNameError(normalizeFileName(value), fileListRef.current),
    });
    if (answer === null) return;
    const name = normalizeFileName(answer);
    replaceFiles({ ...filesRef.current, [name]: '' }, name);
  }

  async function onRenameFile(file: string) {
    // Выделено имя без папки и расширения — его обычно и меняют
    const start = file.lastIndexOf('/') + 1;
    const dot = file.lastIndexOf('.');
    const answer = await askText({
      title: 'Переименовать файл',
      message: `Новое имя для «${file}». Импорты и templateUrl в других файлах поправьте сами.`,
      value: file,
      selection: [start, dot > start ? dot : file.length],
      confirmLabel: 'Переименовать',
      validate: (value) => {
        const name = normalizeFileName(value);
        if (name === file) return null;
        return fileNameError(
          name,
          fileListRef.current.filter((other) => other !== file),
        );
      },
    });
    if (answer === null) return;
    const name = normalizeFileName(answer);
    if (name === file) return;
    // Импорты и templateUrl в других файлах не меняем — как и IDE без рефакторинга, их правит ученик
    const next: FileMap = {};
    for (const [other, code] of Object.entries(filesRef.current)) next[other === file ? name : other] = code;
    replaceFiles(next, name);
  }

  async function onDeleteFile(file: string) {
    if (fileListRef.current.length === 1) {
      await showMessage({ title: 'Файл не удалить', message: 'Последний файл шага удалить нельзя.' });
      return;
    }
    const ok = await askConfirm({
      title: `Удалить «${file}»?`,
      message: 'Вернуть файлы шага можно кнопкой «Сброс».',
      confirmLabel: 'Удалить',
      danger: true,
    });
    if (!ok) return;
    const rest = { ...filesRef.current };
    delete rest[file];
    replaceFiles(rest);
  }

  async function onReset() {
    const ok = await askConfirm({
      title: 'Вернуть стартовый код шага?',
      message: 'Ваши изменения пропадут.',
      confirmLabel: 'Сбросить',
      danger: true,
    });
    if (!ok) return;
    replaceFiles(startFiles(step));
    progress.clearCode(step.id);
    setHasBackup(false);
  }

  async function onShowSolution() {
    const ok = await askConfirm({
      title: 'Показать решение?',
      message: 'Ваш код сохранится, его можно будет вернуть кнопкой «Вернуть мой код».',
      confirmLabel: 'Показать',
    });
    if (!ok) return;
    progress.setBackup(step.id, filesRef.current);
    setHasBackup(true);
    // Решение — ровно его файлы: созданные учеником убираются (они остаются в копии его кода), удалённые возвращаются
    replaceFiles({ ...step.solution });
  }

  function onRestoreBackup() {
    const backup = progress.getBackup(step.id);
    // В копии — все файлы ученика, включая созданные; удалённых в ней нет
    if (backup) replaceFiles(backup);
    progress.setBackup(step.id, undefined);
    setHasBackup(false);
  }

  async function onDownload() {
    setDownloading(true);
    try {
      await downloadProject(step, filesRef.current);
    } catch (error) {
      await showMessage({ title: 'Не удалось собрать архив', message: (error as Error).message });
    } finally {
      setDownloading(false);
    }
  }

  function toggleAutorun(value: boolean) {
    setAutorun(value);
    progress.setAutorun(value);
  }

  const lesson = (
    <LessonPanel
      step={step}
      prev={prev}
      nextPath={nextPath(step)}
      hasSolution={Object.keys(step.solution).length > 0}
      hasBackup={hasBackup}
      onShowSolution={onShowSolution}
      onRestoreBackup={onRestoreBackup}
      onNext={() => progress.setDone(step.id)}
      actions={!isNarrow && panes.collapseButton('lesson', '«')}
    />
  );

  const editor = (
    <div className="code-column">
      <CodeEditor
        stepId={step.id}
        files={fileList}
        active={active}
        readonly={step.meta.readonly ?? []}
        onSelect={setActive}
        onCreateFile={onCreateFile}
        onRenameFile={onRenameFile}
        onDeleteFile={onDeleteFile}
        onChange={onChange}
        onRun={() => runCode()}
        actions={!isNarrow && panes.collapseButton('code', '«')}
      />
      <div className="toolbar">
        <button className="button primary" onClick={() => runCode()} title="Ctrl/Cmd + Enter">
          ▶ Запустить
        </button>
        {step.check && (
          <button
            className="button check-button"
            onClick={() => runCode(true)}
            disabled={check === 'running'}
            title="Запустить приложение заново и проверить результат"
          >
            ✓ Проверить
          </button>
        )}
        <button className="button" onClick={() => formatEditor()} title="Prettier · Ctrl/Cmd + S, Shift + Alt + F">
          Формат
        </button>
        <button className="button" onClick={onReset}>
          Сброс
        </button>
        <button
          className="button"
          onClick={onDownload}
          disabled={downloading}
          title="Скачать код шага архивом — поверх проекта Angular CLI (глава 20)"
        >
          {downloading ? 'Собираю…' : 'Скачать'}
        </button>
        <label className="toggle">
          <input type="checkbox" checked={autorun} onChange={(event) => toggleAutorun(event.target.checked)} />
          Автозапуск
        </label>
      </div>
      {check && (
        <div className={`check-result ${check === 'running' ? 'running' : check.pass ? 'pass' : 'fail'}`} role="status">
          {check === 'running'
            ? 'Проверяем: приложение запускается заново…'
            : check.pass
              ? '✓ Всё работает. Можно идти дальше.'
              : `✗ ${check.hint}`}
          {check !== 'running' && (
            <button className="icon-button" title="Скрыть" onClick={() => setCheck(null)}>
              ×
            </button>
          )}
        </div>
      )}
    </div>
  );

  const preview = (
    <Preview
      run={run}
      initialUrl={step.meta.url ?? '/'}
      backend={step.meta.backend ?? {}}
      onCheckResult={onCheckResult}
      onModeChange={hasTests ? onModeChange : undefined}
      actions={!isNarrow && panes.collapseButton('result', '»')}
    />
  );

  if (isNarrow) {
    return (
      <div className="workspace-narrow">
        <div className="mobile-tabs" role="tablist">
          {(
            [
              ['lesson', 'Урок'],
              ['code', 'Код'],
              ['result', 'Результат'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={mobileTab === id}
              className={mobileTab === id ? 'tab active' : 'tab'}
              onClick={() => {
                setMobileTab(id);
                // Скрытый iframe имеет нулевой размер: код, который меряет элементы при старте, получит нули.
                // Поэтому при открытии результата перезапускаем код уже в видимом окне
                if (id === 'result') runCode();
              }}
            >
              {label}
            </button>
          ))}
        </div>
        {/* Все панели остаются смонтированными, чтобы не терять редактор и превью при переключении */}
        <div className="mobile-pane" hidden={mobileTab !== 'lesson'}>
          {lesson}
        </div>
        <div className="mobile-pane" hidden={mobileTab !== 'code'}>
          {editor}
        </div>
        <div className="mobile-pane" hidden={mobileTab !== 'result'}>
          {preview}
        </div>
      </div>
    );
  }

  return (
    <Group orientation="horizontal" className="workspace">
      <Panel {...panes.panelProps('lesson')} defaultSize="32%" minSize="20%">
        {panes.content('lesson', lesson)}
      </Panel>
      <Separator className="separator" />
      <Panel {...panes.panelProps('code')} defaultSize="36%" minSize="20%">
        {panes.content('code', editor)}
      </Panel>
      <Separator className="separator" />
      <Panel {...panes.panelProps('result')} defaultSize="32%" minSize="15%">
        {panes.content('result', preview)}
      </Panel>
    </Group>
  );
}

/**
 * Сворачивание панелей рабочей области: кнопкой в шапке панели или перетаскиванием разделителя за минимальный размер.
 * Свёрнутая панель — узкая полоска с подписью; содержимое остаётся смонтированным, чтобы не терять редактор и превью
 */
function useCollapsiblePanes(isWide: boolean, onResultExpanded: () => void) {
  const refs: Record<PaneId, RefObject<PanelImperativeHandle | null>> = {
    lesson: usePanelRef(),
    code: usePanelRef(),
    result: usePanelRef(),
  };
  // Панели появляются развёрнутыми; свёрнутые в прошлый раз сворачивает эффект ниже, а sync отмечает их здесь
  const [collapsed, setCollapsed] = useState<PaneId[]>([]);
  const collapsedRef = useRef(collapsed);

  // До первой отрисовки: группа к этому моменту уже посчитала раскладку.
  // Ещё раз — при переходе с узкого экрана: панели создаются заново, развёрнутыми
  useLayoutEffect(() => {
    if (!isWide) return;
    const saved = progress.getCollapsed() as PaneId[];
    collapsedRef.current = [];
    setCollapsed([]);
    // Хотя бы одна панель должна остаться развёрнутой
    for (const id of saved.slice(0, 2)) refs[id].current?.collapse();
  }, [isWide]);

  /** Вызывается при каждом изменении размера панели: свернули её или развернули */
  function sync(id: PaneId) {
    const isCollapsed = refs[id].current?.isCollapsed() ?? false;
    const current = collapsedRef.current;
    if (current.includes(id) === isCollapsed) return;
    const next = isCollapsed ? [...current, id] : current.filter((pane) => pane !== id);
    collapsedRef.current = next;
    setCollapsed(next);
    progress.setCollapsed(next);
    // Скрытый iframe имеет нулевой размер: код, который меряет элементы при старте, получит нули — перезапускаем
    if (id === 'result' && !isCollapsed) onResultExpanded();
  }

  return {
    panelProps: (id: PaneId) => ({
      id,
      panelRef: refs[id],
      collapsible: true,
      collapsedSize: COLLAPSED_SIZE,
      onResize: () => sync(id),
    }),

    content: (id: PaneId, children: ReactNode) => (
      <>
        <div className="pane" hidden={collapsed.includes(id)}>
          {children}
        </div>
        {collapsed.includes(id) && (
          <button
            className="pane-strip"
            title={`Развернуть: ${PANE_LABELS[id]}`}
            onClick={() => refs[id].current?.expand()}
          >
            <span className="pane-strip-icon" aria-hidden="true">
              {id === 'result' ? '«' : '»'}
            </span>
            <span className="pane-strip-label">{PANE_LABELS[id]}</span>
          </button>
        )}
      </>
    ),

    /** Последнюю развёрнутую панель свернуть нельзя — кнопки у неё нет */
    collapseButton: (id: PaneId, icon: string) =>
      collapsed.length < 2 && (
        <button
          type="button"
          className="icon-button pane-collapse"
          title={`Свернуть: ${PANE_LABELS[id]}`}
          onClick={() => refs[id].current?.collapse()}
        >
          {icon}
        </button>
      ),
  };
}
