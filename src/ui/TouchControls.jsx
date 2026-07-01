import { useRef, useState } from 'react';

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
  const [stick, setStick] = useState({ active: false, x: 0, z: 0 });

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
  };

  return (
    <div className="touchControls" aria-label="터치 조작">
      <div
        ref={stickRef}
        className={`touchStick ${stick.active ? 'isActive' : ''}`}
        role="button"
        tabIndex={0}
        aria-label="이동 조이스틱"
        style={{
          '--stick-x': `${stick.x * 30}px`,
          '--stick-z': `${stick.z * 30}px`
        }}
        onPointerDown={startStick}
        onPointerMove={moveStick}
        onPointerUp={endStick}
        onPointerCancel={endStick}
      >
        <i aria-hidden="true" />
      </div>
      <button
        className="touchDashButton"
        type="button"
        aria-label="대시"
        onPointerDown={queueDash}
      >
        <span aria-hidden="true">↯</span>
      </button>
    </div>
  );
}
