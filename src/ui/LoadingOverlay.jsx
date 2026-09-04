import { useEffect, useState } from 'react';
import { useProgress } from '@react-three/drei';
import { RuneIcon } from './RuneIcon.jsx';

export function LoadingOverlay() {
  const { active, errors, item, progress, total } = useProgress();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const assetsSettled = !active && (total === 0 || progress >= 100);
    if (ready || errors.length > 0 || !assetsSettled) return undefined;
    const timer = window.setTimeout(() => setReady(true), 180);
    return () => window.clearTimeout(timer);
  }, [active, errors.length, progress, ready, total]);

  if (ready) return null;

  const hasErrors = errors.length > 0;
  const progressValue = Math.max(4, Math.min(100, Math.round(progress)));

  return (
    <section
      className={`loadingLayer ${hasErrors ? 'hasError' : ''}`}
      role={hasErrors ? 'alert' : 'status'}
      aria-busy={!hasErrors}
      aria-live="polite"
      aria-labelledby="loading-heading"
    >
      <div className="loadingPanel">
        <div className="loadingIdentity">
          <div className="loadingSigil" aria-hidden="true"><RuneIcon name="circuit" /></div>
          <div className="loadingCopy">
            <p className="eyebrow">RUNE DRIFT · SURVIVORS</p>
            <h1 id="loading-heading">{hasErrors ? '균열을 불러오지 못했습니다' : '룬 야전을 새기는 중'}</h1>
            <p>{hasErrors ? '전투 자산을 읽는 도중 흐름이 끊겼습니다.' : '네 개의 봉인을 잇고 5분의 균열을 견뎌내세요.'}</p>
          </div>
        </div>
        {hasErrors ? (
          <>
            <p className="loadingRecovery">네트워크 상태를 확인한 뒤 현재 런을 다시 불러오세요.</p>
            <button className="primaryButton" type="button" onClick={() => window.location.reload()}>
              다시 불러오기
            </button>
          </>
        ) : (
          <>
            <div className="loadingProgressMeta">
              <span>{item ? '전투 자산 호출' : '균열 좌표 정렬'}</span>
              <strong>{progressValue}%</strong>
            </div>
            <div
              className="loadingGauge"
              role="progressbar"
              aria-label="게임 로딩"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressValue}
            >
              <i style={{ width: `${progressValue}%` }} />
            </div>
            <div className="loadingRoute" aria-hidden="true">
              <span>무기</span><i /><span>생명</span><i /><span>정화</span><i /><span>각인</span>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
