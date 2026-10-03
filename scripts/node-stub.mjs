// Заглушка модулей Node (fs, path, os, …) для браузерной сборки @angular/compiler-cli (см. copy-vendor.mjs).
// JIT-трансформу они не нужны: compiler-cli импортирует их ради других своих частей.
const noop = () => undefined;
export default {};
export const createRequire = () => () => ({});
export const readFileSync = () => '';
export const existsSync = () => false;
export const resolve = (...parts) => parts.join('/');
export const dirname = (path) => path;
export const join = (...parts) => parts.join('/');
export const relative = (_from, to) => to;
export const isAbsolute = () => true;
export const sep = '/';
export const basename = (path) => path;
export const extname = () => '';
export const normalize = (path) => path;
export const parse = () => ({});
export const fileURLToPath = (url) => url;
export const platform = () => 'browser';
export const EOL = '\n';
export const tmpdir = () => '/tmp';
export const homedir = () => '/';
export const inspect = noop;
