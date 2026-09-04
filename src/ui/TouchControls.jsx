import { useEffect, useRef, useState } from 'react';
import { RuneIcon } from './RuneIcon.jsx';

export function createTouchControlsState() {
  return {
    active: false,
    x: 0,
    z: 0,
    dashQueued: false
  };
}

export function TouchControls({ controlsRef }) {
  const stickRef = useRef(null);
  const pointerId = useRef(null);
  const dashReleaseTimer = useRef(null);
  const [stick, setStick] = useState({ active: false, x: 0, z: 0 });
  const [dashPressed, setDashPressed] = useState(false);

  const commitStick = (x, z, active) => {
    if (controlsRef.current) {
      controlsRef.current.active = active;
      controlsRef.current.x = active ? x : 0;
      controlsRef.current.z = active ? z : 0;
    }
    setStick({ active, x: active ? x : 0, z: active ? z : 0 });
  };

  const updateStick = event => {
    const node = stickRef.current;
    if (!node) return;
    event.preventDefault();
    const rect = node.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const maxDistance = rect.width * 0.36;
    let x = (event.clientX - centerX) / maxDistance;
    let z = (event.clientY - centerY) / maxDistance;
    const length = Math.hypot(x, z);
    if (length > 1) {
      x /= length;
      z /= length;
    }
    commitStick(x, z, true);
  };

  const startStick = event => {
    pointerId.current = event.pointerId;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    updateStick(event);
  };

  const moveStick = event => {
    if (pointerId.current !== event.pointerId) return;
    updateStick(event);
  };

  const endStick = event => {
    if (pointerId.current !== event.pointerId) return;
    event.preventDefault();
    pointerId.current = null;
    commitStick(0, 0, false);
  };

  const queueDash = event => {
    event.preventDefault();
    if (controlsRef.current) controlsRef.current.dashQueued = true;
    setDashPressed(true);
  };

  const releaseDash = event => {
    event?.preventDefault();
    window.clearTimeout(dashReleaseTimer.current);
    setDashPressed(false);
  };

  const queueKeyboardDash = event => {
    if (event.repeat || (event.key !== 'Enter' && event.key !== ' ')) return;
    queueDash(event);
  };

  const queueAssistiveDash = event => {
    if (event.detail !== 0) return;
    queueDash(event);
    window.clearTimeout(dashReleaseTimer.current);
    dashReleaseTimer.current = window.setTimeout(() => setDashPressed(false), 140);
  };

  useEffect(() => () => window.clearTimeout(dashReleaseTimer.current), []);

  return (
    <div className="touchControls" role="group" aria-label="터치 조작">
      <div
        ref={stickRef}
        className={`runeTouchStick touchStick ${stick.active ? 'isActive' : ''}`}
        role="group"
        aria-label="이동 조이스틱: 누른 채 드래그해 이동"
        style={{
          '--stick-x': `${stick.x * 30}px`,
          '--stick-z': `${stick.z * 30}px`
        }}
        onPointerDown={startStick}
        onPointerMove={moveStick}
        onPointerUp={endStick}
        onPointerCancel={endStick}
      >
        <span aria-hidden="true">MOVE</span>
        <i aria-hidden="true" />
      </div>
      <button
        className={`runeDashButton touchDashButton ${dashPressed ? 'isPressed' : ''}`}
        type="button"
        aria-label="대시"
        onPointerDown={queueDash}
        onPointerUp={releaseDash}
        onPointerCancel={releaseDash}
        onKeyDown={queueKeyboardDash}
        onKeyUp={releaseDash}
        onClick={queueAssistiveDash}
        onBlur={releaseDash}
      >
        <small aria-hidden="true">DASH</small>
        <RuneIcon name="dash" />
      </button>
    </div>
  );
}
