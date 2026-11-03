import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router';
import { course, pagePath, quizPath, stepPath } from '../content/course';
import { progress } from '../progress/storage';
import { Appearance } from './Appearance';
import { DialogHost } from './Dialog';
import { HomePage } from './HomePage';
import { AngularLogo, Loader } from './Loader';
// Страница шага тянет Monaco, TypeScript-воркер и Prettier — грузим её отдельным чанком: шапка, оглавление
// и начальный экран появляются сразу
const StepPage = lazy(() => import('./StepPage').then((module) => ({ default: module.StepPage })));
const QuizPage = lazy(() => import('../quiz/QuizPage').then((module) => ({ default: module.QuizPage })));
const ReferencePage = lazy(() => import('./ReferencePage').then((module) => ({ default: module.ReferencePage })));

function TableOfContents() {
  const location = useLocation();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  // Отметки ✓ читаются из progress при рендере; квиз сдают без перехода по адресу — перечитываем при открытии
  const [, setOpenedAt] = useState(0);

  // Закрываем оглавление после перехода
  useEffect(() => {
    if (detailsRef.current) detailsRef.current.open = false;
  }, [location.pathname]);

  return (
    <details className="toc" ref={detailsRef} onToggle={(event) => event.currentTarget.open && setOpenedAt(Date.now())}>
      <summary>Оглавление</summary>
      <nav className="toc-panel">
        {course.chapters.map((chapter) => (
          <section key={chapter.slug}>
            <h3>
              {progress.isChapterDone(chapter.slug) && <span className="done-mark">✓</span>}
              {`${chapter.index + 1}. ${chapter.title}`}
            </h3>
            <ol>
              {chapter.steps.map((step) => (
                <li key={step.id}>
                  <Link to={stepPath(step)} className={location.pathname === stepPath(step) ? 'current' : undefined}>
                    {progress.isDone(step.id) && <span className="done-mark">✓</span>}
                    {step.meta.title}
                  </Link>
                </li>
              ))}
              {chapter.hasQuiz && (
                <li className="toc-quiz">
                  <Link
                    to={quizPath(chapter)}
                    className={location.pathname === quizPath(chapter) ? 'current' : undefined}
                  >
                    {progress.isChapterDone(chapter.slug) && <span className="done-mark">✓</span>}
                    Квиз по главе
                  </Link>
                </li>
              )}
            </ol>
          </section>
        ))}
        {course.pages.length > 0 && (
          <section>
            <h3>Справочник</h3>
            <ol>
              {course.pages.map((page) => (
                <li key={page.slug}>
                  <Link to={pagePath(page)} className={location.pathname === pagePath(page) ? 'current' : undefined}>
                    {page.title}
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        )}
      </nav>
    </details>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <header className="topbar">
          <Link to="/" className="brand">
            <AngularLogo size={26} />
            {course.title}
          </Link>
          <TableOfContents />
          <span className="topbar-version">Angular v{course.angularVersion}</span>
          <Appearance />
        </header>
        <main className="app-main">
          <Routes>
            <Route path="/" element={<HomePage />} />
            {/* Статический сегмент quiz сильнее :step — шаг с папкой NN-quiz сюда не попадёт */}
            <Route
              path="/:chapter/quiz"
              element={
                <Suspense fallback={<Loader label="Загружаем квиз…" />}>
                  <QuizPage />
                </Suspense>
              }
            />
            <Route
              path="/:chapter/:step"
              element={
                <Suspense fallback={<Loader label="Загружаем редактор…" />}>
                  <StepPage />
                </Suspense>
              }
            />
            {/* Справочные страницы — один сегмент: /legacy; шаги и квизы — два */}
            <Route
              path="/:page"
              element={
                <Suspense fallback={<Loader label="Загружаем страницу…" />}>
                  <ReferencePage />
                </Suspense>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <DialogHost />
      </div>
    </BrowserRouter>
  );
}
