import type { Check, CheckStorage } from '@course/check';

// Ключ списка «Вы смотрели» — из задания
const KEY = 'hod-konem:recent:v1';

// Покупатель уже смотрел «Го». Рядом — испорченные записи: их список показывать не должен
export const storage: CheckStorage = {
  [KEY]: JSON.stringify([
    {
      id: 9,
      slug: 'go-board',
      title: 'Го',
      cover: '/assets/covers/go-board.svg',
      price: 3490,
      category: 'strategy',
      players: { min: 2, max: 2 },
      playTime: 90,
      age: 8,
      rating: 4.8,
      inStock: 4,
      description:
        'Древняя игра на доске 19 × 19 с камнями из стекла.',
      tags: ['классика', 'абстрактная'],
    },
    'мусор',
    { id: 'x' },
  ]),
};

// Проверка практикума: блок «Вы смотрели» на главной — восстановление из localStorage с проверкой,
// новые игры в начале, повторная — переезжает в начало, не больше четырёх, 404 не попадает, запись в localStorage
const check: Check = async ({
  document,
  $$,
  text,
  navigate,
  settle,
  errors,
  fail,
}) => {
  const win =
    document.defaultView ?? fail('Нет окна приложения.');
  const pause = (ms: number) =>
    new Promise((resolve) => win.setTimeout(resolve, ms));

  // id игр в блоке «Вы смотрели» по порядку — из ссылок на страницы игр
  const shown = () =>
    $$<HTMLAnchorElement>('.recent a').map((a) =>
      Number(
        a.getAttribute('href')?.match(/games\/(\d+)/)?.[1],
      ),
    );
  const heading = () =>
    $$('h2').find((h) => text(h) === 'Вы смотрели');

  // Открыть страницу игры и дождаться, пока она загрузится (или скажет, что игры нет)
  const visit = async (id: number) => {
    await navigate(`/games/${id}`);
    for (let i = 0; i < 40; i++) {
      if (text('h1') !== '') {
        return;
      }
      await pause(100);
    }
    fail(
      `Страница /games/${id} не отрисовалась.${errors.length > 0 ? ` В консоли: ${errors[0]}` : ''} Значение ресурса игры можно читать, только когда оно есть (hasValue()).`,
    );
  };

  await navigate('/');
  await settle(300);
  if (!heading()) {
    fail(
      'На главной нет заголовка «Вы смотрели», хотя в localStorage сохранена игра «Го». RecentStore должен восстанавливать список (withStorage с ключом hod-konem:recent:v1), а главная — показывать его, если он не пуст.',
    );
  }
  const restored = shown();
  if (restored.length === 0) {
    fail(
      'Под заголовком «Вы смотрели» нет ссылок на игры: нужен список <ul class="recent">, в нём — ссылки [routerLink]="[\'/games\', game.id]" с обложками.',
    );
  }
  if (restored.length !== 1 || restored[0] !== 9) {
    fail(
      `После восстановления в блоке должна быть одна игра — «Го» (id 9), а показаны id: ${restored.join(', ')}. Прочитанному из localStorage не доверяем: записи без числового id и названия отбрасываются.`,
    );
  }

  // Игра, которой нет, в список не попадает
  await visit(999);
  for (const id of [4, 8, 4, 1, 2, 3]) {
    await visit(id);
  }
  await navigate('/');
  await settle(300);
  const ids = shown();
  if (ids.includes(999)) {
    fail(
      'В «Вы смотрели» попала несуществующая игра 999: запоминать нужно только загруженную игру.',
    );
  }
  if (ids.length > 4) {
    fail(
      `В «Вы смотрели» ${ids.length} игр, а должно быть не больше четырёх: самые старые забываются.`,
    );
  }
  const expected = [3, 2, 1, 4];
  if (ids.join() !== expected.join()) {
    const hint =
      ids.join() === [3, 2, 1, 8].join()
        ? ' Игра, которую открыли снова, должна переезжать в начало списка.'
        : '';
    fail(
      `Открыли игры 999, 4, 8, 4, 1, 2, 3 — в блоке ожидались id ${expected.join(', ')} (самая свежая первой), а показаны ${ids.join(', ') || 'никакие'}.${hint}`,
    );
  }

  // Список сохраняется: в localStorage — те же игры в том же порядке
  let saved: unknown;
  try {
    saved = JSON.parse(win.localStorage.getItem(KEY) ?? 'null');
  } catch {
    fail(`В localStorage под ключом ${KEY} — не JSON.`);
  }
  const savedIds = Array.isArray(saved)
    ? saved.map((game: { id?: unknown } | null) => game?.id)
    : [];
  if (savedIds.join() !== expected.join()) {
    fail(
      `В localStorage под ключом ${KEY} должны быть игры ${expected.join(', ')} по порядку, а там: ${JSON.stringify(savedIds)}.`,
    );
  }

  if (errors.length > 0) {
    fail(`В консоли ошибки: ${errors[0]}`);
  }
  return { pass: true };
};

export default check;
