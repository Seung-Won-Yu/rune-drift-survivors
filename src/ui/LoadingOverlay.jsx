import { useEffect, useState } from 'react';
import { useProgress } from '@react-three/drei';

export function LoadingOverlay() {
  const { active, errors, item, progress } = useProgress();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready || active || errors.length > 0 || progress < 100) return undefined;
    const timer = window.setTimeout(() => setReady(true), 180);
    return () => window.clearTimeout(timer);
  }, [active, errors.length, progress, ready]);

  if (ready) return null;

  const hasErrors = errors.length > 0;
  const progressValue = Math.max(4, Math.min(100, Math.round(progress)));

  return (
    <section
      className={`loadingLayer ${hasErrors ? 'hasError' : ''}`}
      role="status"
      aria-busy={!hasErrors}
      aria-live="polite"
    >
      <div className="loadingPanel">
        <div className="loadingSigil" aria-hidden="true"><span>ᚱ</span></div>
        <p className="eyebrow">{hasErrors ? 'RIFT INTERRUPTED' : 'OPENING RIFT'}</p>
        <h1>{hasErrors ? '균열을 불러오지 못했습니다' : '룬 야전을 새기는 중'}</h1>
        {hasErrors ? (
          <>
            <p>네트워크를 확인한 뒤 다시 시도해 주세요.</p>
            <button className="primaryButton" type="button" onClick={() => window.location.reload()}>
              다시 불러오기
            </button>
          </>
        ) : (
          <>
            <div className="loadingGauge" aria-label={`로딩 ${progressValue}%`}>
              <i style={{ width: `${progressValue}%` }} />
            </div>
            <small>{item ? '전투 자산을 호출하고 있습니다' : '균열 좌표를 맞추고 있습니다'} · {progressValue}%</small>
          </>
        )}
      </div>
    </section>
  );
}
