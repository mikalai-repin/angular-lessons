import { use, useEffect, useState, type MouseEvent } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { findPage, loadPage, type Page } from '../content/course';
import { renderMarkdown } from '../lesson/markdown';

/** Справочная страница вне глав (content/pages/<slug>.md, адрес /<slug>): markdown в оформлении урока */
export function ReferencePage() {
  const page = findPage(useParams().page);
  if (!page) return <Navigate to="/" replace />;
  // key: при переходе на другую страницу текст рисуется заново
  return <PageBody key={page.slug} page={page} source={use(loadPage(page))} />;
}

function PageBody({ page, source }: { page: Page; source: string }) {
  const navigate = useNavigate();
  const [html, setHtml] = useState('');

  useEffect(() => {
    let cancelled = false;
    renderMarkdown(source).then((result) => {
      if (!cancelled) setHtml(result);
    });
    return () => {
      cancelled = true;
    };
  }, [source]);

  // Внутренние ссылки (step:…, page:…) переходят без перезагрузки страницы
  function onContentClick(event: MouseEvent<HTMLElement>) {
    const link = (event.target as HTMLElement).closest('a[data-internal]');
    if (!link) return;
    event.preventDefault();
    navigate(link.getAttribute('href')!);
  }

  return (
    <div className="reference-page">
      <header className="reference-header">
        <div className="reference-kind">Справочник</div>
        <h1>{page.title}</h1>
        {page.description && <p>{page.description}</p>}
      </header>
      <article className="lesson-content" onClick={onContentClick} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
