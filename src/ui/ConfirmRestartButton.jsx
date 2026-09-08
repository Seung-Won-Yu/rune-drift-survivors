import { useState } from 'react';
import { RuneIcon } from './RuneIcon.jsx';


export function ConfirmRestartButton({
  onConfirm,
  className = '',
  compact = false,
  label = '새 룬으로 시작'
}) {
  const [armed, setArmed] = useState(false);

  const handleClick = () => {
    if (!armed) {
      setArmed(true);
      return;
    }
    setArmed(false);
    onConfirm();
  };

  const accessibleLabel = armed ? '다시 시작 확인: 한 번 더 누르기' : '다시 시작';
  return (
    <button
      className={`${className} restartButton ${armed ? 'isArmed' : ''}`.trim()}
      type="button"
      onClick={handleClick}
      onBlur={() => setArmed(false)}
      onKeyDown={event => {
        if (event.key === 'Escape' && armed) {
          event.preventDefault();
          event.stopPropagation();
          setArmed(false);
        }
      }}
      aria-label={accessibleLabel}
      aria-live="polite"
    >
      {compact ? (
        <>
          <RuneIcon name={armed ? 'alert' : 'restart'} />
          {armed && <small className="restartConfirmCue" aria-hidden="true">다시?</small>}
        </>
      ) : (
        armed ? '한 번 더 눌러 초기화' : label
      )}
    </button>
  );
}
