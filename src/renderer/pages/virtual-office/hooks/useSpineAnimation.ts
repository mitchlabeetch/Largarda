import { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import type { Spine } from '@pixi-spine/all-4.1';

type SpineAnimationConfig = {
  skelUrl: string;
  atlasUrl: string;
};

type SpineAnimationControls = {
  spine: Spine | null;
  availableAnimations: string[];
  availableSkins: string[];
  currentAnimation: string | null;
  currentSkin: string | null;
  isLoaded: boolean;
  error: string | null;
  playAnimation: (name: string, loop?: boolean) => void;
  setSkin: (name: string) => void;
  setTimeScale: (scale: number) => void;
};

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  return res.text();
}

async function fetchBinary(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  return res.arrayBuffer();
}

function useSpineAnimation(app: PIXI.Application | null, config: SpineAnimationConfig | null): SpineAnimationControls {
  const [spine, setSpine] = useState<Spine | null>(null);
  const [availableAnimations, setAvailableAnimations] = useState<string[]>([]);
  const [availableSkins, setAvailableSkins] = useState<string[]>([]);
  const [currentAnimation, setCurrentAnimation] = useState<string | null>(null);
  const [currentSkin, setCurrentSkin] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const spineRef = useRef<Spine | null>(null);
  const loadedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!app || !config) return;

    const key = `${config.skelUrl}::${config.atlasUrl}`;
    if (loadedKeyRef.current === key) return;

    let cancelled = false;

    const loadSpine = async () => {
      setIsLoaded(false);
      setError(null);

      // remove previous spine from stage
      if (spineRef.current) {
        app.stage.removeChild(spineRef.current as unknown as PIXI.ContainerChild);
        spineRef.current.destroy();
        spineRef.current = null;
        setSpine(null);
      }

      try {
        const {
          Spine: SpineClass,
          AtlasAttachmentLoader,
          SkeletonBinary,
          SkeletonJson,
          SkeletonData,
          TextureAtlas,
        } = await import('@pixi-spine/all-4.1');

        const skelUrl = config.skelUrl;
        const atlasUrl = config.atlasUrl;

        // fetch atlas text (works for both regular URL and data URL)
        const atlasText = await fetchText(atlasUrl);
        if (cancelled) return;

        // determine base path for texture lookup (atlas uses relative image paths)
        const basePath =
          skelUrl.startsWith('data:') || skelUrl.startsWith('blob:')
            ? ''
            : skelUrl.substring(0, skelUrl.lastIndexOf('/') + 1);

        // build TextureAtlas — callback fires once per atlas page image
        // path is the filename from the atlas file (e.g. "spineboy.png")
        const atlas = await new Promise<InstanceType<typeof TextureAtlas>>((resolve, reject) => {
          const _ta = new TextureAtlas(
            atlasText,
            (path, loaderFunction) => {
              const imgUrl = basePath ? `${basePath}${path}` : path;
              PIXI.Assets.load<PIXI.Texture>(imgUrl)
                .then((tex) => {
                  tex.source.scaleMode = 'nearest';
                  // pixi-spine base uses pixi 7 BaseTexture type; cast to satisfy the type
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  loaderFunction(tex as any);
                })
                .catch((e: unknown) => {
                  reject(e instanceof Error ? e : new Error(String(e)));
                });
            },
            (ta) => {
              if (ta) resolve(ta);
              else reject(new Error('TextureAtlas creation failed'));
            }
          );
        });
        if (cancelled) return;

        const attachmentLoader = new AtlasAttachmentLoader(atlas);

        // parse skeleton
        let skeletonData: InstanceType<typeof SkeletonData>;
        if (skelUrl.endsWith('.json') || skelUrl.startsWith('data:application/json')) {
          const jsonText = await fetchText(skelUrl);
          if (cancelled) return;
          const jsonParser = new SkeletonJson(attachmentLoader);
          skeletonData = jsonParser.readSkeletonData(jsonText);
        } else {
          // binary .skel
          const buffer = await fetchBinary(skelUrl);
          if (cancelled) return;
          const binaryParser = new SkeletonBinary(attachmentLoader);
          skeletonData = binaryParser.readSkeletonData(new Uint8Array(buffer));
        }

        const spineInstance = new SpineClass(skeletonData) as Spine;

        // center horizontally, place at 3/4 height
        spineInstance.x = app.screen.width / 2;
        spineInstance.y = (app.screen.height / 4) * 3;

        app.stage.addChild(spineInstance as unknown as PIXI.ContainerChild);
        spineRef.current = spineInstance;

        const animations = skeletonData.animations.map((a) => a.name);
        const skins = skeletonData.skins.map((s) => s.name);
        const defaultSkin = skins.includes('default') ? 'default' : (skins[0] ?? null);

        setAvailableAnimations(animations);
        setAvailableSkins(skins);
        setCurrentSkin(defaultSkin);
        setIsLoaded(true);
        setSpine(spineInstance);
        loadedKeyRef.current = key;

        // auto-play first animation on loop
        if (animations.length > 0) {
          const firstAnim = animations[0];
          spineInstance.state.setAnimation(0, firstAnim, true);
          setCurrentAnimation(firstAnim);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          setError(msg);
          setIsLoaded(false);
        }
      }
    };

    loadSpine();

    return () => {
      cancelled = true;
    };
  }, [app, config]);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (spineRef.current) {
        try {
          spineRef.current.destroy();
        } catch {
          // ignore
        }
        spineRef.current = null;
      }
      loadedKeyRef.current = null;
    };
  }, []);

  const playAnimation = (name: string, loop = true) => {
    if (!spineRef.current) return;
    spineRef.current.state.setAnimation(0, name, loop);
    setCurrentAnimation(name);
  };

  const setSkin = (name: string) => {
    if (!spineRef.current) return;
    spineRef.current.skeleton.setSkinByName(name);
    spineRef.current.skeleton.setSlotsToSetupPose();
    setCurrentSkin(name);
  };

  const setTimeScale = (scale: number) => {
    if (!spineRef.current) return;
    spineRef.current.state.timeScale = scale;
  };

  return {
    spine,
    availableAnimations,
    availableSkins,
    currentAnimation,
    currentSkin,
    isLoaded,
    error,
    playAnimation,
    setSkin,
    setTimeScale,
  };
}

export { useSpineAnimation };
export type { SpineAnimationConfig, SpineAnimationControls };
