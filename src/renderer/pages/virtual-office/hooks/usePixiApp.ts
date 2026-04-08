import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import * as PIXI from 'pixi.js';

type PixiAppOptions = {
  width: number;
  height: number;
  background: number;
};

function usePixiApp(containerRef: RefObject<HTMLDivElement | null>, options: PixiAppOptions): PIXI.Application | null {
  const [app, setApp] = useState<PIXI.Application | null>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    let cancelled = false;

    const pixiApp = new PIXI.Application();
    appRef.current = pixiApp;

    pixiApp
      .init({
        width: optionsRef.current.width,
        height: optionsRef.current.height,
        background: optionsRef.current.background,
        backgroundAlpha: 1,
        antialias: false,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      })
      .then(() => {
        if (cancelled) {
          pixiApp.destroy(true);
          return;
        }
        container.appendChild(pixiApp.canvas as HTMLCanvasElement);
        setApp(pixiApp);
      })
      .catch((err: unknown) => {
        console.error('[usePixiApp] init failed:', err);
      });

    return () => {
      cancelled = true;
      if (appRef.current) {
        try {
          appRef.current.destroy(true);
        } catch {
          // ignore destroy errors
        }
        appRef.current = null;
      }
      setApp(null);
      // remove canvas if it was appended
      const canvas = container.querySelector('canvas');
      if (canvas) {
        container.removeChild(canvas);
      }
    };
  }, [containerRef]);

  return app;
}

export { usePixiApp };
export type { PixiAppOptions };
