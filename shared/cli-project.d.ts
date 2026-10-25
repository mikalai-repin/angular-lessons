// Типы для shared/cli-project.js (код шага → файлы поверх проекта `ng new`)
type FileMap = Record<string, string>;

export const BACKEND_DATA: string[];
export function projectPath(name: string): string;
export function toProjectFiles(files: FileMap): FileMap;
export function extraPackages(files: FileMap): string[];
export function usesBackend(files: FileMap): boolean;
export function projectReadme(info: {
  chapter: string;
  step: string;
  packages: string[];
  backend: boolean;
  angular: string;
}): string;
