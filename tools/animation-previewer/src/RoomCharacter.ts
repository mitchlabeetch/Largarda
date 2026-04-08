/**
 * RoomCharacter — RPG 式房间角色系统
 *
 * 功能：
 * - 角色是透明背景 sprite，叠加在房间背景上
 * - 3个姿态：working（坐打字）/ sleeping（趴桌）/ noting（站翻书）
 * - 状态切换时，角色从当前位置线性移动到目标位置，到位后切换动画帧
 * - tick(dt) 驱动移动 + 帧动画
 *
 * 位置预设（基于 1024×559 画布，可按实际背景调整）：
 *   working:  x=680, y=370  — 桌前椅子
 *   sleeping: x=680, y=370  — 同位置趴桌（不移动）
 *   noting:   x=480, y=350  — 书架旁
 *
 * 移动实现：线性插值 lerp，moveSpeed px/s
 */

import * as PIXI from 'pixi.js';

type PoseKey = 'working' | 'sleeping' | 'noting';

type SpriteMeta = {
  spriteSize: { width: number; height: number };
  poses: {
    key: string;
    nFrames: number;
    fps: number;
    frames: string[];
  }[];
};

// 预设位置（在 1024×559 画布上的坐标，可按实际背景调整）
const POSE_POSITIONS: Record<PoseKey, { x: number; y: number }> = {
  working:  { x: 700, y: 390 },
  sleeping: { x: 700, y: 370 },
  noting:   { x: 490, y: 360 },
};

const MOVE_SPEED = 180; // px/s
const ASSET_BASE = '/assets/sprites';

export class RoomCharacter {
  root: PIXI.Container;
  private sprite: PIXI.Sprite;
  private textures: Map<string, PIXI.Texture[]> = new Map();
  private meta: SpriteMeta | null = null;

  private pose: PoseKey = 'working';
  private frameIndex = 0;
  private elapsed = 0;
  private fps = 4;

  // 移动状态
  private posX = POSE_POSITIONS.working.x;
  private posY = POSE_POSITIONS.working.y;
  private targetX = POSE_POSITIONS.working.x;
  private targetY = POSE_POSITIONS.working.y;
  private moving = false;
  private pendingPose: PoseKey | null = null;  // 到位后切换到这个姿态

  // 缩放（128px sprite 在 1024×559 画布上的合适大小）
  private readonly SCALE = 2.0; // 128 × 2 = 256px 显示高度

  constructor() {
    this.root = new PIXI.Container();
    this.sprite = new PIXI.Sprite();
    this.sprite.anchor.set(0.5, 1.0); // 中下对齐，方便放置在地面
    this.root.addChild(this.sprite as unknown as PIXI.DisplayObject);
    this.root.x = this.posX;
    this.root.y = this.posY;
  }

  async load(): Promise<void> {
    const metaRes = await fetch(`${ASSET_BASE}/meta.json`);
    if (!metaRes.ok) throw new Error(`sprites/meta.json not found: ${metaRes.status}`);
    this.meta = (await metaRes.json()) as SpriteMeta;

    const loadPromises = this.meta.poses.flatMap(pose =>
      pose.frames.map(async (framePath) => {
        const url = `${ASSET_BASE}/${framePath}`;
        const tex = await PIXI.Texture.fromURL(url);
        tex.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
        const existing = this.textures.get(pose.key) ?? [];
        existing.push(tex);
        this.textures.set(pose.key, existing);
      })
    );
    await Promise.all(loadPromises);

    this.sprite.scale.set(this.SCALE);
    this.applyFrame();
  }

  setPose(pose: PoseKey) {
    if (this.pose === pose && !this.moving) return;

    const target = POSE_POSITIONS[pose];

    // 如果目标位置和当前不同，先走过去
    if (Math.abs(target.x - this.posX) > 2 || Math.abs(target.y - this.posY) > 2) {
      this.targetX = target.x;
      this.targetY = target.y;
      this.moving = true;
      this.pendingPose = pose;

      // 移动时播放走路帧（如果有）或当前帧
    } else {
      // 就在原地，直接切换
      this.switchPose(pose);
    }
  }

  private switchPose(pose: PoseKey) {
    this.pose = pose;
    this.frameIndex = 0;
    this.elapsed = 0;

    const poseInfo = this.meta?.poses.find(p => p.key === pose);
    this.fps = poseInfo?.fps ?? 4;
    this.applyFrame();
  }

  tick(dt: number) {
    // 移动插值
    if (this.moving) {
      const dx = this.targetX - this.posX;
      const dy = this.targetY - this.posY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const step = MOVE_SPEED * dt;

      if (dist <= step) {
        this.posX = this.targetX;
        this.posY = this.targetY;
        this.moving = false;
        if (this.pendingPose) {
          this.switchPose(this.pendingPose);
          this.pendingPose = null;
        }
      } else {
        this.posX += (dx / dist) * step;
        this.posY += (dy / dist) * step;
      }

      // 移动时水平翻转朝向
      this.sprite.scale.x = dx < 0 ? -this.SCALE : this.SCALE;

      this.root.x = Math.round(this.posX);
      this.root.y = Math.round(this.posY);
    }

    // 帧动画
    const poseInfo = this.meta?.poses.find(p => p.key === this.pose);
    if (!poseInfo) return;

    this.elapsed += dt;
    const interval = 1 / this.fps;
    if (this.elapsed >= interval) {
      this.elapsed -= interval;
      this.frameIndex = (this.frameIndex + 1) % poseInfo.nFrames;
      this.applyFrame();
    }
  }

  private applyFrame() {
    const frames = this.textures.get(this.pose);
    if (!frames || frames.length === 0) return;
    const tex = frames[this.frameIndex % frames.length];
    if (tex) this.sprite.texture = tex;
  }
}
