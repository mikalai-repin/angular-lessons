# Генератор кода шагов главы 21 «Разбор настоящего кода».
# Запуск: python3 tools/authoring/ch21-gen.py — ПЕРЕЗАПИСЫВАЕТ start/ и solution/ всех шагов главы 21.
#         python3 tools/authoring/ch21-gen.py dump <папка> — полные снимки шагов в <папка>/<шаг>/<start|solution>
#         (для опытов: tools/e2e/run-dir.mjs и exp.mjs принимают такую папку).
# Глава читает код angular.dev (reference/angular/adev, `npm run reference`): шаги 1–6 без кода, в превью —
# магазин главы 20 без изменений. Практикум переносит в магазин приём angular.dev — обёртку над localStorage,
# которая не бросает исключений (LOCAL_STORAGE в adev/shared-docs/providers/local-storage.ts).
# Код форматирует write_steps (как кнопка «Формат» в редакторе). После запуска: npm run validate.
# Тексты уроков (lesson.md) пишутся отдельно, руками; генератор их не трогает.
import os, shutil, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from steps import PROJECT, format_snapshots, read_dir, rep, step_dir, write_steps

ROOT = f'{PROJECT}/content/21-reading-code'
BASE = read_dir(step_dir(f'{PROJECT}/content/20-real-project/09-deploy/solution'))


def edit(files, name, *pairs):
    """Копия снимка, в которой файл name изменён заменами (старое, новое)."""
    out = dict(files)
    text = out[name]
    for old, new in pairs:
        text = rep(text, old, new)
    out[name] = text
    return out


# ---------- 21.1–21.6: магазин главы 20 без изменений ----------

S1 = BASE

# ---------- 21.7 Практикум: хранилище, которое не бросает ----------

STORAGE_COMMENT = """// localStorage браузера. На сервере (SSR, пререндеринг) хранилища нет — null:
// корзина, избранное и вход живут только в браузере покупателя
"""

S7_START = edit(
    S1,
    'core/browser-storage.ts',
    (
        STORAGE_COMMENT,
        STORAGE_COMMENT
        + """// TODO: если данные сайтов запрещены или место кончилось, localStorage бросает исключения.
// Сделайте обёртку, как LOCAL_STORAGE в angular.dev: магазин должен работать и без хранилища
""",
    ),
)

S7 = edit(
    S1,
    'core/browser-storage.ts',
    (
        STORAGE_COMMENT,
        """// localStorage браузера в обёртке SafeStorage. На сервере (SSR, пререндеринг) хранилища нет — null:
// корзина, избранное и вход живут только в браузере покупателя
""",
    ),
    (
        """        ? localStorage
""",
        """        ? new SafeStorage()
""",
    ),
    (
        """import { isPlatformBrowser } from '@angular/common';
""",
        """import { isPlatformBrowser } from '@angular/common';

// Обёртка над localStorage, которая никогда не бросает исключений (как LOCAL_STORAGE в angular.dev).
// Само обращение к localStorage бросает SecurityError, если данные сайтов запрещены,
// а setItem — QuotaExceededError, если место кончилось. Тогда магазин работает без хранилища:
// корзина и вход живут до перезагрузки страницы
class SafeStorage implements Storage {
  get length(): number {
    try {
      return localStorage.length;
    } catch {
      return 0;
    }
  }

  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Не сохранилось — данные останутся в памяти до перезагрузки
    }
  }

  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // Нечего удалять: хранилище недоступно
    }
  }

  key(index: number): string | null {
    try {
      return localStorage.key(index);
    } catch {
      return null;
    }
  }

  clear(): void {
    try {
      localStorage.clear();
    } catch {
      // Нечего очищать: хранилище недоступно
    }
  }
}
""",
    ),
)

steps = {
    '01-map': {'start': S1},
    '02-routing': {'start': S1},
    '03-state': {'start': S1},
    '04-prerender': {'start': S1},
    '05-editor': {'start': S1},
    '06-review': {'start': S1},
    '07-practice': {'start': S7_START, 'solution': S7},
}


def dump(target):
    """Полные снимки шагов (отформатированные) — в target/<шаг>/<start|solution>/ для опытов."""
    kinds = [(step, kind, spec[kind]) for step, spec in steps.items() for kind in ('start', 'solution') if spec.get(kind) is not None]
    for (step, kind, _), files in zip(kinds, format_snapshots([files for _, _, files in kinds])):
        path = os.path.join(target, step, kind)
        shutil.rmtree(path, ignore_errors=True)
        for name, code in files.items():
            full = os.path.join(path, name)
            os.makedirs(os.path.dirname(full), exist_ok=True)
            with open(full, 'w') as f:
                f.write(code)


if __name__ == '__main__':
    if len(sys.argv) > 2 and sys.argv[1] == 'dump':
        dump(sys.argv[2])
    else:
        write_steps(ROOT, steps, base='20-real-project/09-deploy')
    print('ok')
