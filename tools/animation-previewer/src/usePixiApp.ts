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

    // pixi 7: synchronous constructor — wrap in try/catch for headless/no-WebGL envs
    let pixiApp: PIXI.Application;
    try {
      pixiApp = new PIXI.Application({
        width: optionsRef.current.width,
        height: optionsRef.current.height,
        backgroundColor: optionsRef.current.background,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        forceCanvas: true,
      });
    } catch (err) {
      // WebGL unavailable (headless, CI), silently skip
      console.error('[usePixiApp] PIXI.Application init failed:', err);
      return;
    }
    appRef.current = pixiApp;
    // pixi 7: canvas lives at app.view
    container.appendChild(pixiApp.view as HTMLCanvasElement);
    setApp(pixiApp);

    return () => {
      if (appRef.current) {
        try {
          appRef.current.destroy(true);
        } catch {
          // ignore
        }
        appRef.current = null;
      }
      setApp(null);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef]);

  return app;
}

export { usePixiApp };
