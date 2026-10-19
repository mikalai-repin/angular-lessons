// Типы API Vitest для тестов шагов (*.spec.ts): модуль 'vitest' и глобальные describe/it/expect/vi —
// в проекте Angular CLI их даёт "types": ["vitest/globals"] в tsconfig.spec.json. Пакет vitest 5 целиком
// (с Vite и Node) в редактор не положить, поэтому здесь — то, что умеет раннер превью (vendor-src/vitest.mjs),
// с сигнатурами Vitest 5.0.5. expect и шпионы — настоящие типы @vitest/expect и @vitest/spy.
// Читают: редактор (src/editor/monaco.ts) и проверка типов уроков (scripts/validate-content.mjs).

declare module 'vitest' {
  import type { Assertion, ExpectStatic as BaseExpectStatic, Tester } from '@vitest/expect';
  import type { Mock, MockInstance, MockedFunction, MockedObject, Procedure } from '@vitest/spy';

  export type { Assertion, Mock, MockInstance, MockedFunction, MockedObject };

  /** expect из Vitest: @vitest/expect + методы, которые Vitest добавляет сам (без снапшотов и expect.poll) */
  export interface ExpectStatic extends BaseExpectStatic {
    assert: Chai.AssertStatic;
    unreachable: (message?: string) => never;
    soft: <T>(actual: T, message?: string) => Assertion<void, T>;
    addEqualityTesters: (testers: Array<Tester>) => void;
    /** Сколько проверок expect должен выполнить тест */
    assertions: (expected: number) => void;
    /** Тест должен выполнить хотя бы одну проверку expect */
    hasAssertions: () => void;
  }

  type Awaitable<T> = T | PromiseLike<T>;

  export interface TaskInfo {
    name: string;
    id: number;
  }

  /** Контекст теста — первый аргумент функции теста и beforeEach/afterEach */
  export interface TestContext {
    task: TaskInfo;
    /** expect, привязанный к этому тесту */
    expect: ExpectStatic;
    /** Пропустить тест изнутри: context.skip() или context.skip(условие, 'причина') */
    skip(note?: string): never;
    skip(condition: boolean, note?: string): void;
    onTestFinished(fn: (context: TestContext) => Awaitable<void>): void;
    onTestFailed(fn: (context: TestContext) => Awaitable<void>): void;
  }

  export interface TestOptions {
    timeout?: number;
    skip?: boolean;
    only?: boolean;
    todo?: boolean;
    fails?: boolean;
  }

  export type TestFunction = (context: TestContext) => Awaitable<unknown>;
  type SuiteFactory = () => unknown;

  // Как в Vitest 5 (vitest/dist/chunks/config.*.d.ts), без формы each`шаблон` — её раннер превью не умеет
  type ExtractEachCallbackArgs<T extends ReadonlyArray<any>> = {
    1: [T[0]];
    2: [T[0], T[1]];
    3: [T[0], T[1], T[2]];
    4: [T[0], T[1], T[2], T[3]];
    5: [T[0], T[1], T[2], T[3], T[4]];
    fallback: Array<T extends ReadonlyArray<infer U> ? U : any>;
  }[T extends Readonly<[any]>
    ? 1
    : T extends Readonly<[any, any]>
      ? 2
      : T extends Readonly<[any, any, any]>
        ? 3
        : T extends Readonly<[any, any, any, any]>
          ? 4
          : T extends Readonly<[any, any, any, any, any]>
            ? 5
            : 'fallback'];

  interface EachFunctionReturn<T extends any[]> {
    (name: string | Function, fn: (...args: T) => Awaitable<void>, options?: number): void;
    (name: string | Function, options: TestOptions, fn: (...args: T) => Awaitable<void>): void;
  }

  interface EachFunction {
    <T extends any[] | [any]>(cases: ReadonlyArray<T>): EachFunctionReturn<T>;
    <T extends ReadonlyArray<any>>(cases: ReadonlyArray<T>): EachFunctionReturn<ExtractEachCallbackArgs<T>>;
    <T>(cases: ReadonlyArray<T>): EachFunctionReturn<T[]>;
  }

  interface TestForFunctionReturn<Arg> {
    (name: string | Function, fn: (arg: Arg, context: TestContext) => Awaitable<void>): void;
    (name: string | Function, options: TestOptions, fn: (args: Arg, context: TestContext) => Awaitable<void>): void;
  }

  interface TestForFunction {
    <T>(cases: ReadonlyArray<T>): TestForFunctionReturn<T>;
  }

  interface SuiteForFunction {
    <T>(cases: ReadonlyArray<T>): EachFunctionReturn<[T]>;
  }

  export interface TestAPI {
    (name: string | Function, fn?: TestFunction, options?: number | TestOptions): void;
    (name: string | Function, options: TestOptions, fn?: TestFunction): void;
    skip: TestAPI;
    only: TestAPI;
    todo(name: string | Function): void;
    fails: TestAPI;
    concurrent: TestAPI;
    sequential: TestAPI;
    skipIf(condition: unknown): TestAPI;
    runIf(condition: unknown): TestAPI;
    each: EachFunction;
    for: TestForFunction;
  }

  export interface SuiteAPI {
    (name: string | Function, fn?: SuiteFactory, options?: number | TestOptions): void;
    (name: string | Function, options: TestOptions, fn?: SuiteFactory): void;
    skip: SuiteAPI;
    only: SuiteAPI;
    todo(name: string | Function): void;
    concurrent: SuiteAPI;
    sequential: SuiteAPI;
    skipIf(condition: unknown): SuiteAPI;
    runIf(condition: unknown): SuiteAPI;
    each: EachFunction;
    for: SuiteForFunction;
  }

  export interface Suite {
    name: string;
  }

  export const describe: SuiteAPI;
  export const suite: SuiteAPI;
  export const it: TestAPI;
  export const test: TestAPI;

  /** Функция, которую вернул хук, — очистка: выполнится после теста (beforeEach) или набора (beforeAll) */
  export function beforeAll(fn: (suite: Suite) => Awaitable<unknown>, timeout?: number): void;
  export function afterAll(fn: (suite: Suite) => Awaitable<unknown>, timeout?: number): void;
  export function beforeEach(fn: (context: TestContext, suite: Suite) => Awaitable<unknown>, timeout?: number): void;
  export function afterEach(fn: (context: TestContext, suite: Suite) => Awaitable<unknown>, timeout?: number): void;
  export function onTestFinished(fn: (context: TestContext) => Awaitable<void>): void;
  export function onTestFailed(fn: (context: TestContext) => Awaitable<void>): void;

  export const expect: ExpectStatic;
  export const assert: Chai.AssertStatic;

  type FakeTimer =
    | 'setTimeout'
    | 'clearTimeout'
    | 'setInterval'
    | 'clearInterval'
    | 'setImmediate'
    | 'clearImmediate'
    | 'Date'
    | 'requestAnimationFrame'
    | 'cancelAnimationFrame'
    | 'requestIdleCallback'
    | 'cancelIdleCallback'
    | 'performance'
    | 'queueMicrotask';

  export interface FakeTimerInstallOpts {
    now?: number | Date;
    toFake?: FakeTimer[];
    toNotFake?: FakeTimer[];
    loopLimit?: number;
    shouldAdvanceTime?: boolean;
    advanceTimeDelta?: number;
    shouldClearNativeTimers?: boolean;
  }

  export interface WaitForOptions {
    timeout?: number;
    interval?: number;
  }

  export interface VitestUtils {
    fn: typeof import('@vitest/spy').fn;
    spyOn: typeof import('@vitest/spy').spyOn;
    isMockFunction(fn: unknown): fn is MockInstance;
    mocked<T>(item: T, deep?: boolean): T;
    clearAllMocks(): VitestUtils;
    resetAllMocks(): VitestUtils;
    restoreAllMocks(): VitestUtils;

    useFakeTimers(config?: FakeTimerInstallOpts): VitestUtils;
    useRealTimers(): VitestUtils;
    isFakeTimers(): boolean;
    advanceTimersByTime(ms: number): VitestUtils;
    advanceTimersByTimeAsync(ms: number): Promise<VitestUtils>;
    advanceTimersToNextTimer(steps?: number): VitestUtils;
    advanceTimersToNextTimerAsync(steps?: number): Promise<VitestUtils>;
    advanceTimersToNextFrame(): VitestUtils;
    runAllTimers(): VitestUtils;
    runAllTimersAsync(): Promise<VitestUtils>;
    runOnlyPendingTimers(): VitestUtils;
    runOnlyPendingTimersAsync(): Promise<VitestUtils>;
    runAllTicks(): VitestUtils;
    clearAllTimers(): VitestUtils;
    getTimerCount(): number;
    setSystemTime(time: number | string | Date): VitestUtils;
    getMockedSystemTime(): Date | null;
    getRealSystemTime(): number;

    waitFor<T>(callback: () => T | Promise<T>, options?: number | WaitForOptions): Promise<T>;
    waitUntil<T>(callback: () => T | Promise<T>, options?: number | WaitForOptions): Promise<T>;
    stubGlobal(name: string | symbol | number, value: unknown): VitestUtils;
    unstubAllGlobals(): VitestUtils;

    /** В превью курса не работает: модули здесь не подменить. В проекте Angular CLI работает */
    mock(path: string, factory?: () => unknown): void;
    doMock(path: string, factory?: () => unknown): void;
    unmock(path: string): void;
    importActual<T = unknown>(path: string): Promise<T>;
    importMock<T = unknown>(path: string): Promise<T>;
  }

  export const vi: VitestUtils;
  export const vitest: VitestUtils;

  /** Тип функции-шпиона, как в Vitest: Mock<(x: number) => string> */
  export type { Procedure };
}

// Глобальные имена: тесты в проекте Angular CLI пишут без импортов (vitest/globals).
// Файл без import/export на верхнем уровне — глобальный: и модуль 'vitest' выше, и эти константы видны всем файлам
declare const describe: typeof import('vitest').describe;
declare const suite: typeof import('vitest').suite;
declare const it: typeof import('vitest').it;
declare const test: typeof import('vitest').test;
declare const beforeAll: typeof import('vitest').beforeAll;
declare const afterAll: typeof import('vitest').afterAll;
declare const beforeEach: typeof import('vitest').beforeEach;
declare const afterEach: typeof import('vitest').afterEach;
declare const onTestFinished: typeof import('vitest').onTestFinished;
declare const onTestFailed: typeof import('vitest').onTestFailed;
declare const expect: typeof import('vitest').expect;
declare const assert: typeof import('vitest').assert;
declare const vi: typeof import('vitest').vi;
declare const vitest: typeof import('vitest').vitest;
