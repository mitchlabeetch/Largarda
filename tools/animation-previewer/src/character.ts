/**
 * Character built from cropped reference image parts.
 * Parts are loaded as Sprites and arranged in a bone hierarchy.
 * Background is the full reference room image.
 *
 * Animation states: idle | working | sleeping
 */

import * as PIXI from 'pixi.js';

export type AnimState = 'idle' | 'working' | 'sleeping';

export class Character {
  root: PIXI.Container;

  private head: PIXI.Container;
  private torso: PIXI.Container;
  private lower: PIXI.Container;

  private state: AnimState = 'idle';
  private t = 0;
  private loaded = false;

  constructor() {
    this.root = new PIXI.Container();
    this.head = new PIXI.Container();
    this.torso = new PIXI.Container();
    this.lower = new PIXI.Container();

    this.root.addChild(this.lower as unknown as PIXI.DisplayObject);
    this.root.addChild(this.torso as unknown as PIXI.DisplayObject);
    this.root.addChild(this.head as unknown as PIXI.DisplayObject);
  }

  async load() {
    const headTex = await PIXI.Texture.fromURL('/room/part-head.png');
    const torsoTex = await PIXI.Texture.fromURL('/room/part-torso.png');
    const lowerTex = await PIXI.Texture.fromURL('/room/part-lower.png');
    const legsTex = await PIXI.Texture.fromURL('/room/part-legs.png');

    // Head sprite - pivot at bottom center (neck)
    const headSprite = new PIXI.Sprite(headTex);
    headSprite.anchor.set(0.5, 1.0);
    this.head.addChild(headSprite as unknown as PIXI.DisplayObject);
    this.head.x = 0;
    this.head.y = -105;

    // Torso sprite - pivot at center
    const torsoSprite = new PIXI.Sprite(torsoTex);
    torsoSprite.anchor.set(0.5, 0.5);
    this.torso.addChild(torsoSprite as unknown as PIXI.DisplayObject);
    this.torso.x = 5;
    this.torso.y = -55;

    // Lower body
    const lowerSprite = new PIXI.Sprite(lowerTex);
    lowerSprite.anchor.set(0.5, 0.5);
    this.lower.addChild(lowerSprite as unknown as PIXI.DisplayObject);
    this.lower.x = 0;
    this.lower.y = 10;

    // Legs
    const legsSprite = new PIXI.Sprite(legsTex);
    legsSprite.anchor.set(0.5, 0);
    const legsContainer = new PIXI.Container();
    legsContainer.addChild(legsSprite as unknown as PIXI.DisplayObject);
    legsContainer.x = 2;
    legsContainer.y = 40;
    this.root.addChild(legsContainer as unknown as PIXI.DisplayObject);

    this.loaded = true;
  }

  setState(s: AnimState) {
    this.state = s;
    this.t = 0;
  }

  tick(dt: number) {
    if (!this.loaded) return;
    this.t += dt;
    const t = this.t;

    switch (this.state) {
      case 'idle':
        this._idle(t);
        break;
      case 'working':
        this._working(t);
        break;
      case 'sleeping':
        this._sleeping(t);
        break;
    }
  }

  private _idle(t: number) {
    const breathe = Math.sin(t * 1.2) * 1.5;
    this.torso.y = -55 + breathe;
    this.head.y = -105 + breathe * 0.8;
    this.head.rotation = Math.sin(t * 0.5) * 0.02;
    this.torso.rotation = 0;
  }

  private _working(t: number) {
    const breathe = Math.sin(t * 2.0) * 0.8;
    this.torso.y = -55 + breathe;
    this.torso.rotation = Math.sin(t * 8) * 0.008;
    this.head.y = -105 + breathe * 0.6 - 2;
    this.head.rotation = Math.sin(t * 0.4) * 0.03 - 0.03;
  }

  private _sleeping(t: number) {
    const breathe = Math.sin(t * 0.5) * 3;
    this.torso.y = -55 + breathe + 3;
    this.torso.rotation = Math.sin(t * 0.5) * 0.02;
    this.head.y = -105 + breathe + 8;
    this.head.rotation = Math.sin(t * 0.5) * 0.05 + 0.1;
  }
}
