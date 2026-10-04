# Запись кода шагов главы на диск — общая для всех генераторов chNN-gen.py.
#
# steps = {'01-slug': {'start': {...}, 'solution': {...}}, ...} — в порядке шагов. Значение 'start'/'solution' —
# ПОЛНЫЙ снимок кода: словарь «путь файла → код» или строка — путь папки с полным кодом (например, из step_dir).
# У шага без решения (noSolution) 'solution' нет.
#
# На диск write_steps пишет только изменения (так же собирает шаги shared/step-chain.js):
# - start/ — файлы, которые отличаются от результата предыдущего шага. Если отличий нет, папки start/ нет —
#   это шаг startFrom: previous; иначе во frontmatter шага нужен startFrom: custom (проверит npm run validate);
# - solution/ — файлы, которые отличаются от старта шага;
# - файлы, которые пропали, во frontmatter перечисляются вручную: removedInStart / removedInSolution.
#   write_steps сверяет их с lesson.md и печатает, чего не хватает.
import os, re, shutil, subprocess

PROJECT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))


def read_dir(path):
    files = {}
    for dirpath, _, names in os.walk(path):
        for name in names:
            full = os.path.join(dirpath, name)
            with open(full) as f:
                files[os.path.relpath(full, path)] = f.read()
    return files


def frontmatter_list(stepdir, key):
    lesson = os.path.join(stepdir, 'lesson.md')
    if not os.path.exists(lesson):
        return None
    with open(lesson) as f:
        match = re.match(r'---\n(.*?)\n---', f.read(), re.S)
    found = re.search(rf'^{key}: \[(.*)\]$', match.group(1) if match else '', re.M)
    return sorted(s.strip() for s in found.group(1).split(',')) if found else []


def write_steps(root, steps):
    previous = {}
    for step, spec in steps.items():
        stepdir = os.path.join(root, step)
        os.makedirs(stepdir, exist_ok=True)
        full = {kind: read_dir(spec[kind]) if isinstance(spec.get(kind), str) else spec.get(kind)
                for kind in ('start', 'solution')}
        start, solution = full['start'], full['solution']
        own = {
            'start': {n: c for n, c in start.items() if previous.get(n) != c},
            'solution': {n: c for n, c in solution.items() if start.get(n) != c} if solution is not None else {},
        }
        removed = {
            'removedInStart': sorted(set(previous) - set(start)),
            'removedInSolution': sorted(set(start) - set(solution)) if solution is not None else [],
        }
        for key, names in removed.items():
            declared = frontmatter_list(stepdir, key)
            if declared is not None and declared != names:
                print(f'⚠ {step}: во frontmatter нужно {key}: [{", ".join(names)}]')
        for kind, files in own.items():
            path = os.path.join(stepdir, kind)
            if os.path.isdir(path):
                shutil.rmtree(path)
            for name, code in files.items():
                target = os.path.join(path, name)
                os.makedirs(os.path.dirname(target), exist_ok=True)
                with open(target, 'w') as f:
                    f.write(code)
        previous = solution if solution is not None else start


def step_dir(path):
    """Папка с ПОЛНЫМ кодом шага по пути …/<шаг>/start или …/<шаг>/solution.

    В content/ шаг хранит только изменения, поэтому полный код выгружается (scripts/step-files.mjs)
    в tools/e2e/out/steps/<глава>/<шаг>/<start|solution>. Генераторы читают через неё код прошлой главы:
    CH05 = step_dir(f'{PROJECT}/content/05-components/09-practice/solution').
    """
    path = os.path.abspath(path)
    rel = os.path.relpath(path, os.path.join(PROJECT, 'content'))
    out = os.path.join(PROJECT, 'tools', 'e2e', 'out', 'steps', rel)
    subprocess.run(['node', 'scripts/step-files.mjs', path, out], cwd=PROJECT, check=True, stdout=subprocess.DEVNULL)
    return out
