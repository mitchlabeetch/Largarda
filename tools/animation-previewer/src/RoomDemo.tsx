import React, { useCallback, useEffect, useRef, useState } from 'react';

type AnimState = 'working' | 'idle_sleeping' | 'noting';

type RoomMeta = {
  background: string;
  characterSize: { width: number; height: number };
  animations: {
    key: string;
    nFrames: number;
    fps: number;
    frames: string[];
    position: { x: number; y: number };
  }[];
};

const BASE_W = 400;
const BASE_H = 220;
const DISPLAY_SCALE = 2.5; // 400×220 → 1000×550
const DISPLAY_W = BASE_W * DISPLAY_SCALE;
const DISPLAY_H = BASE_H * DISPLAY_SCALE;

const STATE_LABELS: Record<AnimState, string> = {
  working: '工作中',
  idle_sleeping: '休息/睡觉',
  noting: '记笔记',
};

const STATE_DESCS: Record<AnimState, string> = {
  working: '坐在电脑桌前敲键盘',
  idle_sleeping: '趴在床上打盹',
  noting: '站在书架旁写笔记',
};

export default function RoomDemo() {
  const [meta, setMeta] = useState<RoomMeta | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [animState, setAnimState] = useState<AnimState>('working');
  const [frameIndex, setFrameIndex] = useState(0);

  // Transition state: null = visible, 'out' = fading out, 'in' = fading in
  const [transition, setTransition] = useState<null | 'out' | 'in'>(null);
  const pendingStateRef = useRef<AnimState | null>(null);

  useEffect(() => {
    fetch('/assets/room/meta.json')
      .then(r => {
        if (!r.ok) throw new Error(`meta.json ${r.status}`);
        return r.json() as Promise<RoomMeta>;
      })
      .then(setMeta)
      .catch((e: unknown) => setLoadErr(e instanceof Error ? e.message : String(e)));
  }, []);

  // Frame ticker
  useEffect(() => {
    if (!meta || transition !== null) return;
    const anim = meta.animations.find(a => a.key === animState);
    if (!anim) return;
    const interval = setInterval(() => {
      setFrameIndex(prev => (prev + 1) % anim.nFrames);
    }, 1000 / anim.fps);
    return () => clearInterval(interval);
  }, [meta, animState, transition]);

  const handleStateChange = useCallback((next: AnimState) => {
    if (next === animState || transition !== null) return;
    pendingStateRef.current = next;
    setTransition('out');
  }, [animState, transition]);

  // Handle transition phases
  useEffect(() => {
    if (transition === 'out') {
      const timer = setTimeout(() => {
        const next = pendingStateRef.current;
        if (next) {
          setAnimState(next);
          setFrameIndex(0);
          pendingStateRef.current = null;
        }
        setTransition('in');
      }, 200);
      return () => clearTimeout(timer);
    }
    if (transition === 'in') {
      const timer = setTimeout(() => {
        setTransition(null);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [transition]);

  const currentAnim = meta?.animations.find(a => a.key === animState);
  const framePath = currentAnim
    ? `/assets/room/${currentAnim.frames[frameIndex % currentAnim.nFrames]}`
    : null;

  const charOpacity = transition === 'out' ? 0 : transition === 'in' ? 1 : 1;
  const charX = currentAnim ? currentAnim.position.x * DISPLAY_SCALE : 0;
  const charY = currentAnim ? currentAnim.position.y * DISPLAY_SCALE : 0;
  const charW = (meta?.characterSize.width ?? 128) * DISPLAY_SCALE;
  const charH = (meta?.characterSize.height ?? 128) * DISPLAY_SCALE;

  return (
    <div style={s.root}>
      <div style={s.scene}>
        {/* Background */}
        <img
          src="/assets/room/background.png"
          style={{
            position: 'absolute', inset: 0,
            width: DISPLAY_W, height: DISPLAY_H,
            imageRendering: 'pixelated',
            display: 'block',
          }}
          alt="room"
        />

        {/* Character overlay */}
        {framePath && (
          <img
            src={framePath}
            style={{
              position: 'absolute',
              left: charX,
              top: charY,
              width: charW,
              height: charH,
              imageRendering: 'pixelated',
              opacity: charOpacity,
              transition: 'opacity 0.2s ease',
              pointerEvents: 'none',
            }}
            alt={animState}
          />
        )}

        {loadErr && (
          <div style={s.errOverlay}>加载失败：{loadErr}</div>
        )}

        <div style={s.modeTag}>PixelLab 骨骼动画 · 分层合成</div>
      </div>

      {/* Controls */}
      <div style={s.controls}>
        <div style={s.controlsLabel}>状态切换</div>
        <div style={s.btnGroup}>
          {(Object.keys(STATE_LABELS) as AnimState[]).map(state => (
            <button
              key={state}
              style={{
                ...s.btn,
                ...(animState === state ? s.btnActive : {}),
              }}
              onClick={() => handleStateChange(state)}
            >
              <span style={s.btnTitle}>{STATE_LABELS[state]}</span>
              <span style={s.btnDesc}>{STATE_DESCS[state]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const s = {
  root: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 16,
    alignItems: 'flex-start',
  },
  scene: {
    position: 'relative' as const,
    width: DISPLAY_W,
    height: DISPLAY_H,
    border: '1px solid rgba(80,160,240,0.2)',
    borderRadius: 6,
    overflow: 'hidden',
    flexShrink: 0,
    background: '#0a0a1a',
  },
  errOverlay: {
    position: 'absolute' as const, inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#ff6060', fontSize: 12,
    background: 'rgba(7,7,26,0.8)',
  },
  modeTag: {
    position: 'absolute' as const, bottom: 8, left: 10,
    fontSize: 10, color: 'rgba(120,200,160,0.6)', pointerEvents: 'none' as const,
  },
  controls: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
  },
  controlsLabel: {
    fontSize: 11, color: 'rgba(120,180,220,0.6)',
    textTransform: 'uppercase' as const, letterSpacing: '0.05em',
  },
  btnGroup: {
    display: 'flex',
    gap: 8,
  },
  btn: {
    display: 'flex', flexDirection: 'column' as const,
    padding: '8px 16px', fontSize: 12, borderRadius: 6, cursor: 'pointer',
    background: 'rgba(30,50,80,0.4)', border: '1px solid rgba(80,140,200,0.25)',
    color: '#8ac0e0', textAlign: 'left' as const, transition: 'all 0.15s',
    minWidth: 120,
  },
  btnActive: {
    background: 'rgba(20,80,160,0.5)', borderColor: 'rgba(60,160,255,0.7)', color: '#60c0ff',
  },
  btnTitle: { fontWeight: 600 as const },
  btnDesc: { fontSize: 10, opacity: 0.6, marginTop: 2 },
} satisfies Record<string, React.CSSProperties>;
