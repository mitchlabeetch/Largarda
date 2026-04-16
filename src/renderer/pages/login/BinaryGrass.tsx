import React, { useEffect, useRef } from 'react';

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

const FPS_INTERVAL = 100; // 10 FPS

const BinaryGrass: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const animRef = useRef<number>(0);
  const lastDrawTimeRef = useRef<number>(0);
  const frameRef = useRef<number>(0);
  const gridRef = useRef<GridState>({ cols: 0, rows: 0, cw: 0, ch: 0 });
  const bladesRef = useRef<Blade[]>([]);

  useEffect(() => {
    const initGrid = (): void => {
      if (!containerRef.current || !measureRef.current) return;

      const rect = measureRef.current.getBoundingClientRect();
      const cw = Math.max(rect.width, 4);
      const ch = Math.max(rect.height, 8);

      const contRect = containerRef.current.getBoundingClientRect();
      const width = contRect.width || window.innerWidth || 1024;
      const height = contRect.height || window.innerHeight || 768;

      const cols = Math.floor(width / cw) + 4;
      const targetHeight = height / 3;
      const rows = Math.floor(targetHeight / ch);

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
    };

    const render = (time: number): void => {
      animRef.current = requestAnimationFrame(render);

      const elapsed = time - lastDrawTimeRef.current;
      if (elapsed < FPS_INTERVAL) return;

      lastDrawTimeRef.current = time - (elapsed % FPS_INTERVAL);
      frameRef.current += 1;

      let { cols, rows } = gridRef.current;

      if (!cols || !rows) {
        initGrid();
        cols = gridRef.current.cols;
        rows = gridRef.current.rows;
        if (!cols || !rows) return;
      }

      const blades = bladesRef.current;
      const grid = new Uint8Array(rows * cols);
      const t = frameRef.current * 0.25;
      const windBase = t;

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

      let html = '';
      const classes = ['', styles.g1, styles.g2, styles.g3, styles.g4, styles.g5];

      for (let r = 0; r < rows; r++) {
        let currentClass = 0;
        let segment = '';

        for (let c = 0; c < cols; c++) {
          const val = grid[r * cols + c];

          if (val === 0) {
            if (currentClass !== 0) {
              html += `<span class="${classes[currentClass]}">${segment}</span>`;
              segment = '';
              currentClass = 0;
            }
            segment += ' ';
          } else {
            const bit = (val & 1) === 1 ? '1' : '0';
            const colorLvl = val >> 1;

            if (currentClass !== colorLvl) {
              if (currentClass !== 0) {
                html += `<span class="${classes[currentClass]}">${segment}</span>`;
              } else {
                html += segment;
              }
              segment = bit;
              currentClass = colorLvl;
            } else {
              segment += bit;
            }
          }
        }

        if (segment) {
          if (currentClass !== 0) {
            html += `<span class="${classes[currentClass]}">${segment}</span>`;
          } else {
            html += segment;
          }
        }
        html += '\n';
      }

      if (preRef.current) {
        preRef.current.innerHTML = html;
      }
    };

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
  }, []);

  return (
    <div ref={containerRef} className={styles.container} aria-hidden='true'>
      <span ref={measureRef} className={styles.measure}>
        0
      </span>
      <pre ref={preRef} className={styles.canvas} />
    </div>
  );
};

export default BinaryGrass;
