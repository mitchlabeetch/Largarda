/**
 * SceneCharacter — 播放完整场景序列帧（400×220px，拉伸到 1024×559）
 *
 * 每个状态是一组完整的场景图（房间+角色一体），nearest neighbor 放大显示。
 */

import * as PIXI from 'pixi.js';
import type { AnimState } from './employee';

const ASSET_BASE = '/assets/scenes';

type FrameMeta = {
  key: string;
  nFrames: number;
  fps: number;
  frames: string[];
};

type Meta = {
  frameSize: { width: number; height: number };
  displaySize: { width: number; height: number };
  animations: FrameMeta[];
};

export class SceneCharacter {
  root: PIXI.Container;
  private sprite: PIXI.Sprite;
  private textures: Map<string, PIXI.Texture[]> = new Map();
  private meta: Meta | null = null;
  private state: AnimState = 'working';
  private frameIndex = 0;
  private elapsed = 0;
  private fps = 4;
  displayW = 1024;
  displayH = 559;

  constructor() {
    this.root = new PIXI.Container();
    this.sprite = new PIXI.Sprite();
    this.root.addChild(this.sprite as unknown as PIXI.DisplayObject);
  }

  async load(): Promise<void> {
    const metaRes = await fetch(`${ASSET_BASE}/meta.json`);
    if (!metaRes.ok) throw new Error(`scenes/meta.json not found: ${metaRes.status}`);
    this.meta = (await metaRes.json()) as Meta;

    this.displayW = this.meta.displaySize?.width ?? 1024;
    this.displayH = this.meta.displaySize?.height ?? 559;

    const loadPromises = this.meta.animations.flatMap(anim =>
      anim.frames.map(async (framePath) => {
        const url = `${ASSET_BASE}/${framePath}`;
        const tex = await PIXI.Texture.fromURL(url);
        tex.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;

        const existing = this.textures.get(anim.key) ?? [];
        existing.push(tex);
        this.textures.set(anim.key, existing);
      })
    );
    await Promise.all(loadPromises);
    this.applyFrame();
  }

  setState(state: AnimState) {
    if (this.state === state) return;
    this.state = state;
    this.frameIndex = 0;
    this.elapsed = 0;

    const anim = this.meta?.animations.find(a => a.key === state);
    this.fps = anim?.fps ?? 4;
    this.applyFrame();
  }

  tick(dt: number) {
    const anim = this.meta?.animations.find(a => a.key === this.state);
    if (!anim) return;

    this.elapsed += dt;
    const interval = 1 / this.fps;
    if (this.elapsed >= interval) {
      this.elapsed -= interval;
      this.frameIndex = (this.frameIndex + 1) % anim.nFrames;
      this.applyFrame();
    }
  }

  private applyFrame() {
    const frames = this.textures.get(this.state);
    if (!frames || frames.length === 0) return;
    const tex = frames[this.frameIndex % frames.length];
    if (!tex) return;

    this.sprite.texture = tex;
    // 拉伸到 displaySize，nearest neighbor 保持像素艺术感
    this.sprite.width  = this.displayW;
    this.sprite.height = this.displayH;
  }
}
