// Логотип-щит Angular и загрузчик платформы. Та же разметка — в index.html (виден до запуска JavaScript):
// при изменении правьте оба места.

const SHIELD = 'M12 1.5 2.2 5l1.5 12.9L12 22.5l8.3-4.6L21.8 5z';
const LETTER = 'M12 4.2 6.3 17h2.1l1.1-2.9h5l1.1 2.9h2.1zm1.7 8.2h-3.4L12 8.3z';

/** Щит Angular. animated — щит «дышит», буква мерцает (только для загрузчика) */
export function AngularLogo({ size = 24, animated = false }: { size?: number; animated?: boolean }) {
  return (
    <svg
      className={animated ? 'angular-logo angular-logo-animated' : 'angular-logo'}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d={SHIELD} className="angular-logo-shield" />
      <path d={LETTER} className="angular-logo-letter" />
    </svg>
  );
}

/** Загрузчик: щит и подпись. compact — для небольших областей (превью) */
export function Loader({ label, compact = false }: { label: string; compact?: boolean }) {
  return (
    <div className={compact ? 'loader loader-compact' : 'loader'} role="status">
      <AngularLogo size={compact ? 40 : 64} animated />
      <span className="loader-label">{label}</span>
    </div>
  );
}
