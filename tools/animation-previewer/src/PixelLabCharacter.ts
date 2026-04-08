/**
 * PixelLabCharacter — 播放 PixelLab AI 生成的序列帧动画
 *
 * 加载 /assets/generated/meta.json，按照状态切换对应序列帧。
 * 帧尺寸 64×64，scale=4 渲染到 256×256 屏幕像素。
 */

import * as PIXI from 'pixi.js';
import type { AnimState } from './employee';

const ASSET_BASE = '/assets/generated';
const SCALE = 5; // 64px → 320px，nearest neighbor

type FrameMeta = {
  key: string;
  nFrames: number;
  fps: number;
  frames: string[];
};

type Meta = {
  frameSize: { width: number; height: number };
  animations: FrameMeta[];
};

export class PixelLabCharacter {
  root: PIXI.Container;
  private sprite: PIXI.Sprite;
  private textures: Map<string, PIXI.Texture[]> = new Map();
  private meta: Meta | null = null;
  private state: AnimState = 'idle';
  private frameIndex = 0;
  private elapsed = 0;
  private fps = 8;

  constructor() {
    this.root = new PIXI.Container();
    this.sprite = new PIXI.Sprite();
    this.sprite.scale.set(SCALE);
    // PixiJS 7: nearest neighbor for pixel art
    this.root.addChild(this.sprite as unknown as PIXI.DisplayObject);
  }

  async load(): Promise<void> {
    // 1. 拿 meta.json
    const metaRes = await fetch(`${ASSET_BASE}/meta.json`);
    if (!metaRes.ok) throw new Error(`meta.json not found: ${metaRes.status}`);
    this.meta = (await metaRes.json()) as Meta;

    // 2. 加载所有帧纹理（并行）
    const loadPromises = this.meta.animations.flatMap(anim =>
      anim.frames.map(async (framePath) => {
        const url = `${ASSET_BASE}/${framePath}`;
        const tex = await PIXI.Texture.fromURL(url);
        // PixiJS 7: nearest neighbor
        tex.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;

        const existing = this.textures.get(anim.key) ?? [];
        existing.push(tex);
        this.textures.set(anim.key, existing);
      })
    );
    await Promise.all(loadPromises);

    // 3. 设置初始帧
    this.applyFrame();
  }

  setState(state: AnimState) {
    if (this.state === state) return;
    this.state = state;
    this.frameIndex = 0;
    this.elapsed = 0;

    const anim = this.meta?.animations.find(a => a.key === state);
    this.fps = anim?.fps ?? 8;
    this.applyFrame();
  }

  tick(dt: number) {
    // dt in seconds
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
    if (tex) this.sprite.texture = tex;
  }
}
