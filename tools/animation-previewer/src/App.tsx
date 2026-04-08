import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import { usePixiApp } from './usePixiApp';
import { Character } from './character';
import type { AnimState } from './employee';
import { Employee } from './employee';
import { PixelLabCharacter } from './PixelLabCharacter';
import PixelArtLab from './PixelArtLab';
import SpriteSheetLab from './SpriteSheetLab';
import RoomDemo from './RoomDemo';

// ── Pixi Error Boundary ──────────────────────────────────────────────────────
class PixiErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: string | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(e: Error) { return { error: e.message }; }
  override render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 20, color: '#ff9090', fontSize: 12 }}>
          渲染器初始化失败（当前环境不支持 WebGL）：{this.state.error}
        </div>
      );
    }
    return this.props.children;
  }
}

type Mode = 'reference' | 'employee' | 'pixel-art' | 'sprite-sheet' | 'ai-character' | 'room-demo';

// Reference image canvas
const REF_W = 1024;
const REF_H = 559;

// Employee demo canvas — smaller, focused
const EMP_W = 640;
const EMP_H = 400;

const STATES: { key: AnimState; label: string; desc: string }[] = [
  { key: 'working',      label: '工作 working',      desc: 'A实例执行任务，坐在电脑前敲键盘' },
  { key: 'idle_sleeping', label: '空闲/睡觉 idle',   desc: '无任务，趴在桌上睡觉打盹' },
  { key: 'noting',        label: '记笔记 noting',    desc: 'B实例整理记忆，书架旁翻书写笔记' },
];

export default function App() {
  const [mode, setMode] = useState<Mode>('ai-character');
  const [currentState, setCurrentState] = useState<AnimState>('working');
  const [timeScale, setTimeScale] = useState(1);
  const [loadError, setLoadError] = useState<string | null>(null);

  const containerRef       = useRef<HTMLDivElement>(null);
  const charRef            = useRef<Character | null>(null);
  const employeeRef        = useRef<Employee | null>(null);
  const pixelLabCharRef    = useRef<PixelLabCharacter | null>(null);
  const tickerRef          = useRef<((delta: number) => void) | null>(null);
  const timeScaleRef       = useRef(timeScale);
  useEffect(() => { timeScaleRef.current = timeScale; }, [timeScale]);

  const canvasW = EMP_W;
  const canvasH = EMP_H;

  const app = usePixiApp(containerRef, {
    width: canvasW, height: canvasH, background: 0x1a1208,
  });

  // ── setup scene whenever app or mode changes ───────────────────────────────
  useEffect(() => {
    if (!app) return;

    // teardown previous
    if (tickerRef.current) { app.ticker.remove(tickerRef.current); tickerRef.current = null; }
    if (charRef.current)   { app.stage.removeChild(charRef.current.root as unknown as PIXI.DisplayObject); charRef.current = null; }
    if (employeeRef.current) { app.stage.removeChild(employeeRef.current.root as unknown as PIXI.DisplayObject); employeeRef.current = null; }
    if (pixelLabCharRef.current) { app.stage.removeChild(pixelLabCharRef.current.root as unknown as PIXI.DisplayObject); pixelLabCharRef.current = null; }
    app.stage.removeChildren();
    setLoadError(null);

    if (mode === 'reference') {
      const setup = async () => {
        try {
          const bgTex = await PIXI.Texture.fromURL('/room/room-full.png');
          const bg    = new PIXI.Sprite(bgTex);
          bg.width = REF_W; bg.height = REF_H;
          app.stage.addChild(bg as unknown as PIXI.DisplayObject);

          const char = new Character();
          await char.load();
          char.root.x = 700; char.root.y = 380;
          char.setState(currentState as import('./character').AnimState);
          app.stage.addChild(char.root as unknown as PIXI.DisplayObject);
          charRef.current = char;

          const onTick = (delta: number) => char.tick((delta / 60) * timeScaleRef.current);
          app.ticker.add(onTick);
          tickerRef.current = onTick;
        } catch (e: unknown) {
          setLoadError(e instanceof Error ? e.message : String(e));
        }
      };
      setup();
    } else {
      // employee demo — pure Graphics, no async needed
      const emp = new Employee();
      emp.root.x = EMP_W / 2 - 20;
      emp.root.y = EMP_H / 2 + 60;
      emp.setState(currentState);
      app.stage.addChild(emp.root as unknown as PIXI.DisplayObject);
      employeeRef.current = emp;

      const onTick = (delta: number) => emp.tick((delta / 60) * timeScaleRef.current);
      app.ticker.add(onTick);
      tickerRef.current = onTick;
    }

    return () => {
      if (tickerRef.current) { app.ticker.remove(tickerRef.current); tickerRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app, mode]);

  const handleStateChange = useCallback((s: AnimState) => {
    setCurrentState(s);
    charRef.current?.setState(s as import('./character').AnimState);
    employeeRef.current?.setState(s);
    pixelLabCharRef.current?.setState(s);
  }, []);

  const handleTimeScale = useCallback((v: number) => setTimeScale(v), []);

  return (
    <div style={s.root}>
      <div style={s.header}>
        <span style={s.title}>虚拟办公室 — 骨骼动画预览器</span>

        {/* mode tabs */}
        <div style={s.tabs}>
          <button
            style={{ ...s.tab, ...(mode === 'ai-character' ? s.tabActive : {}) }}
            onClick={() => setMode('ai-character')}
          >AI 角色</button>
          <button
            style={{ ...s.tab, ...(mode === 'employee' ? s.tabActive : {}) }}
            onClick={() => setMode('employee')}
          >员工 Demo</button>
          <button
            style={{ ...s.tab, ...(mode === 'reference' ? s.tabActive : {}) }}
            onClick={() => setMode('reference')}
          >参考图模式</button>
          <button
            style={{ ...s.tab, ...(mode === 'pixel-art' ? s.tabActive : {}) }}
            onClick={() => setMode('pixel-art')}
          >像素风生成</button>
          <button
            style={{ ...s.tab, ...(mode === 'sprite-sheet' ? s.tabActive : {}) }}
            onClick={() => setMode('sprite-sheet')}
          >部件切割</button>
          <button
            style={{ ...s.tab, ...(mode === 'room-demo' ? s.tabActive : {}) }}
            onClick={() => setMode('room-demo')}
          >房间 Demo</button>
        </div>
      </div>

      {mode === 'pixel-art' ? <PixelArtLab /> : null}
      {mode === 'sprite-sheet' ? <SpriteSheetLab /> : null}
      {mode === 'room-demo' ? <RoomDemo /> : null}

      <PixiErrorBoundary>
      <div style={{ ...s.workspace, display: mode === 'pixel-art' || mode === 'sprite-sheet' || mode === 'room-demo' ? 'none' : 'flex' }}>

        {mode === 'ai-character' ? (
          <ScenePlayer animState={currentState} timeScale={timeScale} displayW={REF_W} displayH={REF_H} />
        ) : (
          <div style={{ ...s.canvasWrap, width: canvasW, height: canvasH }}>
            <div ref={containerRef} />
            {loadError && (
              <div style={s.overlay}>
                <span style={{ color: '#ff6060' }}>加载失败：{loadError}</span>
              </div>
            )}
            {mode === 'employee' && (
              <div style={s.modeTag}>PixiJS Graphics 骨骼</div>
            )}
          </div>
        )}

        <div style={s.panel}>
          <Section label="动画状态">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {STATES.map(({ key, label, desc }) => (
                <button
                  key={key}
                  style={{ ...s.stateBtn, ...(currentState === key ? s.stateBtnActive : {}) }}
                  onClick={() => handleStateChange(key)}
                >
                  <span style={{ fontWeight: 600 }}>{label}</span>
                  <span style={{ fontSize: 10, opacity: 0.6, marginTop: 2 }}>{desc}</span>
                </button>
              ))}
            </div>
          </Section>

          <Section label={`速度 ${timeScale.toFixed(2)}x`}>
            <input
              type="range" min={0.1} max={3} step={0.05}
              value={timeScale} style={s.slider}
              onChange={(e) => handleTimeScale(Number(e.target.value))}
            />
          </Section>

          {mode === 'employee' && (
            <Section label="骨骼层级">
              <pre style={s.tree}>{TREE}</pre>
            </Section>
          )}

          {mode === 'reference' && (
            <Section label="说明">
              <div style={{ fontSize: 11, lineHeight: 1.6, color: 'rgba(140,180,220,0.7)' }}>
                <p style={{ margin: '0 0 4px' }}>背景：参考图原图 (1024×559)</p>
                <p style={{ margin: '0 0 4px' }}>角色：裁切部件 Sprite 动画</p>
                <p style={{ margin: 0 }}>骨骼：Container 层级旋转/位移</p>
              </div>
            </Section>
          )}
        </div>
      </div>
      </PixiErrorBoundary>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={s.section}>
      <div style={s.sectionLabel}>{label}</div>
      {children}
    </div>
  );
}

// ── ScenePlayer — 纯 HTML img 播放 400×220 全场景序列帧 ──────────────────────
type SceneMeta = {
  frameSize: { width: number; height: number };
  displaySize: { width: number; height: number };
  animations: { key: string; nFrames: number; fps: number; frames: string[] }[];
};

function ScenePlayer({ animState, timeScale, displayW, displayH }: {
  animState: AnimState;
  timeScale: number;
  displayW: number;
  displayH: number;
}) {
  const [meta, setMeta] = useState<SceneMeta | null>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    fetch('/assets/scenes/meta.json')
      .then(r => { if (!r.ok) throw new Error(`meta.json ${r.status}`); return r.json(); })
      .then((m: SceneMeta) => setMeta(m))
      .catch((e: unknown) => setLoadErr(e instanceof Error ? e.message : String(e)));
  }, []);

  // reset frame when state changes
  useEffect(() => { setFrameIndex(0); }, [animState]);

  // tick
  useEffect(() => {
    if (!meta) return;
    const anim = meta.animations.find(a => a.key === animState);
    if (!anim) return;
    const fps = (anim.fps ?? 4) * timeScale;
    const interval = setInterval(() => {
      setFrameIndex(prev => (prev + 1) % anim.nFrames);
    }, 1000 / fps);
    return () => clearInterval(interval);
  }, [meta, animState, timeScale]);

  if (loadErr) {
    return (
      <div style={{ ...s.canvasWrap, width: displayW, height: displayH, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#ff6060', fontSize: 12 }}>加载失败：{loadErr}</span>
      </div>
    );
  }

  if (!meta) {
    return (
      <div style={{ ...s.canvasWrap, width: displayW, height: displayH, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'rgba(120,180,220,0.5)', fontSize: 12 }}>加载中...</span>
      </div>
    );
  }

  const anim = meta.animations.find(a => a.key === animState);
  const framePath = anim ? `/assets/scenes/${anim.frames[frameIndex % anim.frames.length]}` : null;

  return (
    <div style={{ ...s.canvasWrap, width: displayW, height: displayH, position: 'relative' }}>
      {framePath && (
        <img
          src={framePath}
          style={{
            width: displayW, height: displayH,
            display: 'block',
            imageRendering: 'pixelated',
          }}
          alt={animState}
        />
      )}
      <div style={s.modeTag}>PixelLab AI 序列帧</div>
    </div>
  );
}

const TREE = `root
├─ chair (Graphics)
├─ desk  (Graphics)
├─ laptop(Graphics)
├─ hipL → kneeL (leg)
├─ torso
│  ├─ shoulderL → elbowL
│  ├─ head
│  └─ shoulderR → elbowR
└─ hipR → kneeR (leg)`;

const s = {
  root: {
    display: 'flex', flexDirection: 'column' as const,
    height: '100vh', padding: 16, gap: 12,
    background: '#07071a', color: '#c0d8f0', overflow: 'hidden',
    fontFamily: 'system-ui, sans-serif',
  },
  header: { display: 'flex', alignItems: 'center', gap: 16 },
  title: { fontSize: 17, fontWeight: 600, color: '#60c0ff', letterSpacing: '0.03em' },
  tabs: { display: 'flex', gap: 6 },
  tab: {
    padding: '4px 14px', fontSize: 12, borderRadius: 20, cursor: 'pointer',
    background: 'rgba(30,50,80,0.5)', border: '1px solid rgba(80,140,200,0.3)',
    color: '#80a8cc', transition: 'all 0.15s',
  },
  tabActive: {
    background: 'rgba(20,80,180,0.6)', borderColor: 'rgba(60,160,255,0.7)', color: '#80d0ff',
  },
  workspace: { display: 'flex', gap: 16, alignItems: 'flex-start', overflow: 'auto', flex: 1 },
  canvasWrap: {
    position: 'relative' as const, flexShrink: 0,
    border: '1px solid rgba(80,160,240,0.2)', borderRadius: 6, overflow: 'hidden',
  },
  overlay: {
    position: 'absolute' as const, inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(7,7,26,0.8)',
  },
  modeTag: {
    position: 'absolute' as const, bottom: 8, left: 10,
    fontSize: 10, color: 'rgba(120,200,160,0.6)', pointerEvents: 'none' as const,
  },
  panel: {
    display: 'flex', flexDirection: 'column' as const, gap: 10,
    overflowY: 'auto' as const, flex: 1, maxWidth: 260, minWidth: 180,
  },
  section: {
    display: 'flex', flexDirection: 'column' as const, gap: 8,
    padding: '10px 12px',
    background: 'rgba(10,10,20,0.85)', border: '1px solid rgba(80,200,255,0.15)',
    borderRadius: 8,
  },
  sectionLabel: {
    fontSize: 11, color: 'rgba(120,180,220,0.6)',
    textTransform: 'uppercase' as const, letterSpacing: '0.05em',
  },
  stateBtn: {
    display: 'flex', flexDirection: 'column' as const,
    padding: '8px 12px', fontSize: 12, borderRadius: 6, cursor: 'pointer',
    background: 'rgba(30,50,80,0.4)', border: '1px solid rgba(80,140,200,0.25)',
    color: '#8ac0e0', textAlign: 'left' as const, transition: 'all 0.15s',
  },
  stateBtnActive: {
    background: 'rgba(20,80,160,0.5)', borderColor: 'rgba(60,160,255,0.7)', color: '#60c0ff',
  },
  slider: { width: '100%', accentColor: '#3af' },
  tree: {
    margin: 0, fontSize: 10, lineHeight: 1.6,
    color: 'rgba(140,200,180,0.7)', fontFamily: 'monospace', whiteSpace: 'pre' as const,
  },
} satisfies Record<string, React.CSSProperties>;
