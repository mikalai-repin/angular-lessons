// Учебный бэкенд магазина «Ход конём» для проекта Angular CLI. Это тот же backend.mjs, что работает в превью курса,
// только запросы приходят не из подменённого fetch, а по HTTP. Данные — server/data/*.json, живут в памяти
// до перезапуска сервера.
//
//   node server/api.mjs              — http://localhost:3000/api/…
//   PORT=3001 LATENCY=0 node server/api.mjs   — другой порт, без задержки ответа (по умолчанию 300 мс)
//
// ng serve отправляет сюда запросы /api/… и /uploads/… через прокси (proxy.conf.json).
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createBackend } from './backend.mjs';

const PORT = Number(process.env.PORT ?? 3000);
const DATA = new URL('./data/', import.meta.url);

const backend = createBackend({
  // backend.mjs грузит данные запросом /backend/data/<имя>.json — здесь это файлы из server/data
  originalFetch: async (path) => new Response(await readFile(new URL(path.split('/').pop(), DATA))),
  // Журнал запросов вместо вкладки «Сеть»
  report: (entry) => {
    if (entry.status !== 'pending') console.log(`${entry.method} ${entry.url} → ${entry.status} (${entry.ms} мс)`);
  },
});
backend.configure({ latency: Number(process.env.LATENCY ?? 300) });

/** Тело запроса целиком: учебному бэкенду хватает небольших JSON и обложек до 1 МБ */
async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return chunks.length > 0 ? Buffer.concat(chunks) : undefined;
}

createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);

  // Обложки, загруженные в админке (глава 17)
  if (request.method === 'GET' && url.pathname.startsWith('/uploads/')) {
    const file = backend.upload(url.pathname);
    if (!file) return response.writeHead(404).end();
    response.writeHead(200, { 'Content-Type': file.type });
    return response.end(Buffer.from(await file.arrayBuffer()));
  }

  // Браузер закрыл соединение (запрос отменён) — отменяем и ожидание ответа в бэкенде
  const aborted = new AbortController();
  response.on('close', () => {
    if (!response.writableEnded) aborted.abort();
  });

  try {
    const result = await backend.handle(
      new Request(url, {
        method: request.method,
        headers: Object.entries(request.headers).flatMap(([name, value]) =>
          value === undefined ? [] : [[name, String(value)]],
        ),
        body: await readBody(request),
        signal: aborted.signal,
      }),
    );
    response.writeHead(result.status, Object.fromEntries(result.headers));
    response.end(Buffer.from(await result.arrayBuffer()));
  } catch (error) {
    if (!aborted.signal.aborted) response.writeHead(500).end(String(error));
  }
}).listen(PORT, () => {
  console.log(`Учебный бэкенд «Ход конём»: http://localhost:${PORT}/api/games`);
});
