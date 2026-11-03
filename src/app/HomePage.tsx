import { Link } from 'react-router';
import { allSteps, course, pagePath, quizPath, stepPath, type Chapter } from '../content/course';
import { progress } from '../progress/storage';
import { AngularLogo } from './Loader';

/** Куда ведёт карточка главы: первый непройденный шаг, а если пройдены все — квиз или первый шаг */
function chapterPath(chapter: Chapter) {
  const next = chapter.steps.find((step) => !progress.isDone(step.id));
  if (next) return stepPath(next);
  if (chapter.hasQuiz && !progress.isChapterDone(chapter.slug)) return quizPath(chapter);
  return stepPath(chapter.steps[0]);
}

function ChapterCard({ chapter }: { chapter: Chapter }) {
  const total = chapter.steps.length;
  const done = chapter.steps.filter((step) => progress.isDone(step.id)).length;
  const passed = progress.isChapterDone(chapter.slug);
  return (
    <li>
      <Link to={chapterPath(chapter)} className={`home-chapter${passed ? ' passed' : ''}`}>
        <span className="home-chapter-number">{passed ? '✓' : chapter.index + 1}</span>
        <span className="home-chapter-body">
          <span className="home-chapter-title">{chapter.title}</span>
          <span className="home-chapter-description">{chapter.description}</span>
          <span className="home-chapter-meta">
            {done > 0 ? `${done} из ${total} шагов` : `${total} шагов`}
            {chapter.hasQuiz && (passed ? ' · квиз сдан' : ' · квиз')}
          </span>
          {done > 0 && (
            <span className="home-chapter-progress" aria-hidden="true">
              <span style={{ width: `${(done / total) * 100}%` }} />
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}

/** Начальный экран: о курсе, «Продолжить» и главы по частям */
export function HomePage() {
  if (allSteps.length === 0) return <p className="empty-course">В курсе пока нет глав.</p>;
  const last = allSteps.find((step) => step.id === progress.getLastStep());
  const doneSteps = allSteps.filter((step) => progress.isDone(step.id)).length;
  const doneChapters = course.chapters.filter((chapter) => progress.isChapterDone(chapter.slug)).length;

  return (
    <div className="home">
      <section className="home-hero">
        <AngularLogo size={56} />
        <h1>Интерактивный курс по Angular {course.angularVersion.split('.')[0]}</h1>
        <p>
          Слева — урок, в центре — редактор, справа — живое приложение. Шаг за шагом вы напишете с нуля «Ход конём»,
          интернет-магазин настольных игр, и разберётесь, что Angular делает под капотом: компилятор, сигналы,
          обнаружение изменений, внедрение зависимостей.
        </p>
        <div className="home-actions">
          {last ? (
            <>
              <Link to={stepPath(last)} className="button primary">
                Продолжить: {last.meta.title}
              </Link>
              <span className="home-stats">
                Пройдено шагов: {doneSteps} из {allSteps.length}, глав: {doneChapters} из {course.chapters.length}
              </span>
            </>
          ) : (
            <Link to={stepPath(allSteps[0])} className="button primary">
              Начать с первого шага
            </Link>
          )}
        </div>
      </section>

      {course.parts.map((part, index) => {
        const chapters = course.chapters.filter((chapter) => chapter.part === index + 1);
        if (chapters.length === 0) return null;
        return (
          <section key={part.title} className="home-part">
            <h2>
              Часть {index + 1}. {part.title}
            </h2>
            <p>{part.description}</p>
            <ol className="home-chapters">
              {chapters.map((chapter) => (
                <ChapterCard key={chapter.slug} chapter={chapter} />
              ))}
            </ol>
          </section>
        );
      })}

      {course.pages.length > 0 && (
        <section className="home-part">
          <h2>Справочник</h2>
          <ul className="home-chapters">
            {course.pages.map((page) => (
              <li key={page.slug}>
                <Link to={pagePath(page)} className="home-chapter">
                  <span className="home-chapter-body">
                    <span className="home-chapter-title">{page.title}</span>
                    {page.description && <span className="home-chapter-description">{page.description}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
