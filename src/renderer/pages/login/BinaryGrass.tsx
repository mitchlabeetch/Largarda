import React, { useCallback, useEffect, useRef } from 'react';

import styles from './BinaryGrass.module.css';

type Blade = {
  baseX: number;
  maxH: number;
  bits: number[];
  stiffness: number;
};

type GridState = {
  cols: number;
  rows: number;
  cw: number;
  ch: number;
};

// Teal-based grass color levels matching CSS module (light→dark, bottom→top)
const GRASS_COLORS: readonly string[] = [
  '', // level 0 = empty
  'rgba(45, 148, 130, 0.25)', // g1
  'rgba(50, 160, 140, 0.35)', // g2
  'rgba(55, 170, 148, 0.50)', // g3
  'rgba(60, 180, 155, 0.65)', // g4
  'rgba(65, 190, 162, 0.80)', // g5
];

const FONT_SIZE = 14;
const LINE_HEIGHT = 1.1;
const TARGET_FPS = 10;
const FRAME_INTERVAL = 1000 / TARGET_FPS;

const BinaryGrass: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(0);
  const frameRef = useRef<number>(0);
  const gridRef = useRef<GridState>({ cols: 0, rows: 0, cw: 0, ch: 0 });
  const bladesRef = useRef<Blade[]>([]);
  const gridBufferRef = useRef<Uint8Array | null>(null);

  const initGrid = useCallback((): void => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = container.clientWidth || window.innerWidth || 1024;
    const height = container.clientHeight || window.innerHeight || 768;

    // Measure character dimensions
    ctx.font = `${FONT_SIZE}px 'JetBrains Mono', 'Fira Code', 'Courier New', monospace`;
    const metrics = ctx.measureText('0');
    const cw = Math.max(metrics.width, 4);
    const ch = Math.max(FONT_SIZE * LINE_HEIGHT, 8);

    const cols = Math.floor(width / cw) + 4;
    const targetHeight = height;
    const rows = Math.floor(targetHeight / ch);

    // Resize canvas to match container
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = targetHeight * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${targetHeight}px`;
    ctx.scale(dpr, dpr);
    ctx.font = `${FONT_SIZE}px 'JetBrains Mono', 'Fira Code', 'Courier New', monospace`;
    ctx.textBaseline = 'top';

    const newBlades: Blade[] = [];
    const numBlades = Math.floor(cols * 0.8);

    for (let i = 0; i < numBlades; i++) {
      const baseX = Math.floor(Math.random() * cols);
      const maxH = Math.floor(rows * 0.3 + Math.random() * rows * 0.7);
      const bits: number[] = [];
      for (let j = 0; j < maxH; j++) {
        bits.push(Math.random() > 0.5 ? 1 : 0);
      }
      newBlades.push({
        baseX,
        maxH,
        bits,
        stiffness: 0.2 + Math.random() * 0.8,
      });
    }

    gridRef.current = { cols, rows, cw, ch };
    bladesRef.current = newBlades;

    const requiredSize = cols * rows;
    if (!gridBufferRef.current || gridBufferRef.current.length !== requiredSize) {
      gridBufferRef.current = new Uint8Array(requiredSize);
    }
  }, []);

  const render = useCallback(
    (timestamp: number): void => {
      // Throttle to target FPS
      if (timestamp - lastFrameRef.current < FRAME_INTERVAL) {
        animRef.current = requestAnimationFrame(render);
        return;
      }
      lastFrameRef.current = timestamp;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) {
        animRef.current = requestAnimationFrame(render);
        return;
      }

      frameRef.current += 1;

      let { cols, rows, cw, ch } = gridRef.current;

      if (!cols || !rows) {
        initGrid();
        cols = gridRef.current.cols;
        rows = gridRef.current.rows;
        cw = gridRef.current.cw;
        ch = gridRef.current.ch;
        if (!cols || !rows) {
          animRef.current = requestAnimationFrame(render);
          return;
        }
      }

      const blades = bladesRef.current;
      const grid = gridBufferRef.current!;
      grid.fill(0);

      const t = frameRef.current * 0.25;
      const windBase = t;

      // Paint blades into grid buffer
      for (let i = 0; i < blades.length; i++) {
        const b = blades[i];
        for (let y = 0; y < b.maxH; y++) {
          const hp = y / b.maxH;
          const windForce = Math.sin(windBase + b.baseX * 0.03) * 1.5 + Math.sin(windBase * 1.5 + b.baseX * 0.1) * 0.6;
          const maxSway = b.maxH * 0.35;
          const sway = Math.round(windForce * (hp * hp) * maxSway * (1.2 - b.stiffness));
          const cx = b.baseX + sway;

          if (cx >= 0 && cx < cols) {
            let colorLevel = Math.floor(hp * 5) + 1;
            if (colorLevel > 5) colorLevel = 5;

            const isGlint = Math.sin(t * 3 + b.baseX * 0.1 - y * 0.2) > 0.85;
            const originalBit = b.bits[y];
            const finalBit = isGlint ? (originalBit === 1 ? 0 : 1) : originalBit;

            const cellVal = (colorLevel << 1) | finalBit;
            const idx = (rows - 1 - y) * cols + cx;
            grid[idx] = cellVal;
          }
        }
      }

      // Clear canvas
      const dpr = window.devicePixelRatio || 1;
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

      // Render grid to canvas — batch by color level for fewer fillStyle changes
      for (let level = 1; level <= 5; level++) {
        ctx.fillStyle = GRASS_COLORS[level];

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const val = grid[r * cols + c];
            if (val === 0) continue;

            const colorLvl = val >> 1;
            if (colorLvl !== level) continue;

            const bit = (val & 1) === 1 ? '1' : '0';
            ctx.fillText(bit, c * cw, r * ch);
          }
        }
      }

      animRef.current = requestAnimationFrame(render);
    },
    [initGrid]
  );

  useEffect(() => {
    initGrid();
    animRef.current = requestAnimationFrame(render);

    let resizeTimeout: ReturnType<typeof setTimeout>;
    const handleResize = (): void => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        initGrid();
      }, 150);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animRef.current);
      clearTimeout(resizeTimeout);
    };
  }, [initGrid, render]);

  return (
    <div ref={containerRef} className={styles.container} aria-hidden='true'>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
};

export default BinaryGrass;
