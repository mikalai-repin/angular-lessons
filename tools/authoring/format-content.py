# Пересобирает код шагов из content/ — форматирует его так, как кнопка «Формат» в редакторе
# (настройки — shared/lesson-prettier.json), и заново пишет base и baseHash первого шага главы. Содержание не меняется.
# Запуск:
#   python3 tools/authoring/format-content.py              — все главы, после изменения shared/lesson-prettier.json;
#   python3 tools/authoring/format-content.py 10-routing   — одна глава (или несколько), например после правки
#     последнего шага прошлой главы: файлы, которые глава не меняет, придут из новой базы, baseHash обновится.
# Главы идут по порядку content/course.json: полные снимки шагов берутся с диска, write_steps форматирует их
# и записывает только изменения. Тексты уроков (lesson.md) не меняются. После запуска: npm run validate.
import json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from steps import PROJECT, read_frontmatter, step_dir, write_steps

CONTENT = os.path.join(PROJECT, 'content')

with open(os.path.join(CONTENT, 'course.json')) as f:
    chapters = json.load(f)['chapters']
selected = sys.argv[1:] or chapters
unknown = set(selected) - set(chapters)
assert not unknown, f'нет таких глав: {", ".join(sorted(unknown))}'

for chapter in chapters:
    if chapter not in selected:
        continue
    root = os.path.join(CONTENT, chapter)
    names = sorted(n for n in os.listdir(root) if os.path.isdir(os.path.join(root, n)))
    steps, base = {}, None
    for index, name in enumerate(names):
        meta = read_frontmatter(os.path.join(root, name))
        if index == 0:
            found = re.search(r'^base: (\S+)$', meta, re.M)
            base = found.group(1) if found else None
        spec = {'start': step_dir(f'{root}/{name}/start')}
        if not re.search(r'^noSolution: true$', meta, re.M):
            spec['solution'] = step_dir(f'{root}/{name}/solution')
        steps[name] = spec
    write_steps(root, steps, base=base)
    print(f'{chapter}: {len(steps)} шагов')
