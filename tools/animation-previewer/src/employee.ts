/**
 * Cozy pixel-art employee character.
 * Drawn entirely with PixiJS 7 Graphics (no external images).
 *
 * Pixel scale: PS=4 (each art-pixel = 4×4 screen pixels)
 * Total height: ~36 art-px = 144 screen-px
 *
 * Skeleton (all Containers, pivot at joint origin):
 *   root
 *     chair        — static prop behind character
 *     desk         — static prop in front
 *     thighR/L     — upper leg, pivot at hip
 *       shinR/L    — lower leg, pivot at knee
 *     torso        — body, pivot at hip center
 *       shoulderL  — upper arm, pivot at shoulder
 *         elbowL   — forearm, pivot at elbow
 *       shoulderR  — (same)
 *         elbowR
 *       head       — pivot at neck base
 *
 * Animation states: idle | working | sleeping
 */

import * as PIXI from 'pixi.js';

// Legacy states for Employee demo; ai-character uses working/idle_sleeping/noting
export type AnimState = 'idle' | 'working' | 'sleeping' | 'idle_sleeping' | 'noting';

// ── palette ──────────────────────────────────────────────────────────────────
const C = {
  skin:     0xF5D6A0,
  skinDk:   0xD4A96A,
  hair:     0x4A3728,
  hairHi:   0x6B5040,
  eye:      0x2A1A0A,
  eyeWhite: 0xF0E8D8,
  shirt:    0x5B7B8A,
  shirtDk:  0x3D5A6A,
  pants:    0x3D5A6E,
  pantsDk:  0x2A3E50,
  shoe:     0x2A1E14,
  desk:     0xB8824A,
  deskDk:   0x8A5C2A,
  deskTop:  0xD4A060,
  chair:    0x7A6050,
  chairDk:  0x5A4030,
  laptop:   0x2A2A38,
  screen:   0x4AB0E0,
  key:      0x383848,
  zzz:      0xC0D8F0,
} as const;

const PS = 4; // pixel scale

function p(g: PIXI.Graphics, color: number, x: number, y: number, w = 1, h = 1) {
  g.beginFill(color);
  g.drawRect(x * PS, y * PS, w * PS, h * PS);
  g.endFill();
}

// ── part builders ─────────────────────────────────────────────────────────────

/**
 * Head: 9×10 art-px, facing left (screen-right).
 * Pivot = neck base center → offset so (0,0) is at bottom-center.
 */
function mkHead(): PIXI.Graphics {
  const g = new PIXI.Graphics();
  // hair
  p(g, C.hair,   0, 0, 9, 3);
  p(g, C.hairHi, 1, 0, 4, 1);
  p(g, C.hair,   0, 3, 2, 5);   // left side hair
  // face
  p(g, C.skin,   2, 3, 6, 6);
  p(g, C.skinDk, 7, 5, 1, 3);   // cheek shading
  // eye
  p(g, C.eyeWhite, 3, 4, 2, 2);
  p(g, C.eye,      4, 4, 1, 1);
  // ear
  p(g, C.skin,   8, 4, 1, 2);
  p(g, C.skinDk, 8, 5, 1, 1);
  // nose
  p(g, C.skinDk, 5, 6, 1, 1);
  // mouth
  p(g, C.skinDk, 3, 8, 3, 1);
  p(g, 0xC07858, 4, 8, 2, 1);
  // chin
  p(g, C.skin, 2, 9, 5, 1);
  // pivot offset: bottom-center of head is at (4.5, 10)
  g.x = -4 * PS;
  g.y = -10 * PS;
  return g;
}

/** Torso: 8×11 art-px, pivot = hip center (4, 11). */
function mkTorso(): PIXI.Graphics {
  const g = new PIXI.Graphics();
  p(g, C.shirt,   1, 0, 6, 9);
  p(g, C.shirtDk, 6, 1, 1, 8);   // right shadow
  p(g, C.skin,    2, 0, 4, 2);    // collar / neck
  p(g, C.shirtDk, 2, 3, 2, 2);   // pocket
  p(g, C.shirt,   0, 1, 1, 4);    // left shoulder
  p(g, C.pants,   1, 9, 6, 2);    // waistband
  p(g, C.pantsDk, 6,10, 1, 1);
  g.x = -4 * PS;
  g.y = -11 * PS;
  return g;
}

/** Upper arm: 3×6, pivot top-center (1.5, 0). */
function mkUpperArm(): PIXI.Graphics {
  const g = new PIXI.Graphics();
  p(g, C.shirt,   0, 0, 3, 5);
  p(g, C.shirtDk, 2, 1, 1, 4);
  p(g, C.skin,    0, 5, 3, 1);
  g.x = -1 * PS;
  return g;
}

/** Forearm + hand: 3×7, pivot top (1.5, 0). */
function mkForearm(): PIXI.Graphics {
  const g = new PIXI.Graphics();
  p(g, C.skin,   0, 0, 3, 5);
  p(g, C.skinDk, 2, 1, 1, 4);
  // fingers
  p(g, C.skin,   0, 5, 1, 2);
  p(g, C.skin,   1, 5, 1, 2);
  p(g, C.skin,   2, 5, 1, 1);
  g.x = -1 * PS;
  return g;
}

/** Thigh: 5×7, pivot top-center (2.5, 0). */
function mkThigh(): PIXI.Graphics {
  const g = new PIXI.Graphics();
  p(g, C.pants,   0, 0, 5, 6);
  p(g, C.pantsDk, 4, 1, 1, 5);
  p(g, C.pantsDk, 0, 5, 5, 1);
  g.x = -2 * PS;
  return g;
}

/** Shin + shoe: 3×7, pivot top (1.5, 0). */
function mkShin(): PIXI.Graphics {
  const g = new PIXI.Graphics();
  p(g, C.pants,   0, 0, 3, 4);
  p(g, C.pantsDk, 2, 1, 1, 3);
  p(g, C.shoe,    0, 4, 4, 3);
  p(g, 0x1A1008,  0, 6, 4, 1);
  g.x = -1 * PS;
  return g;
}

/** Desk: 30×5 art-px + legs. */
function mkDesk(): PIXI.Graphics {
  const g = new PIXI.Graphics();
  p(g, C.deskDk,  0, 0, 30, 1);
  p(g, C.desk,    0, 1, 30, 3);
  p(g, C.deskTop, 1, 1, 28, 1);
  p(g, C.deskDk,  0, 4, 30, 1);
  p(g, C.deskDk,  1, 5,  2, 8);
  p(g, C.deskDk, 27, 5,  2, 8);
  return g;
}

/** Laptop on desk. */
function mkLaptop(): PIXI.Graphics {
  const g = new PIXI.Graphics();
  // base
  p(g, C.laptop, 0, 3, 12, 2);
  p(g, C.key,    1, 3, 10, 1);   // keyboard row
  // screen lid
  p(g, C.laptop, 1,-8, 10, 8);
  p(g, 0x181820, 0,-9, 12, 1);
  // screen content
  p(g, C.screen, 2,-7,  8, 6);
  // code lines
  p(g, 0xFFFFFF, 3,-6,  3, 1);
  p(g, 0x90E890, 3,-5,  5, 1);
  p(g, 0xFF9060, 3,-4,  4, 1);
  p(g, 0x90E890, 3,-3,  6, 1);
  // glare
  p(g, 0xC0E8FF, 8,-7,  1, 2);
  return g;
}

/** Chair back. */
function mkChair(): PIXI.Graphics {
  const g = new PIXI.Graphics();
  p(g, C.chairDk, 0, 0, 2, 12);
  p(g, C.chair,   2, 1, 4,  9);
  p(g, C.chairDk, 6, 0, 2, 12);
  p(g, C.chair,   1,10, 6,  2);  // seat pad
  return g;
}

// ── ZZZ overlay (sleeping indicator) ─────────────────────────────────────────
function mkZzz(): PIXI.Graphics {
  const g = new PIXI.Graphics();
  // Three Z letters offset diagonally
  const drawZ = (gx: number, gy: number, sz: number) => {
    p(g, C.zzz, gx,        gy,        sz, 1);
    p(g, C.zzz, gx + sz-1, gy + 1,    1,  sz - 2);
    p(g, C.zzz, gx,        gy + sz-1, sz, 1);
  };
  drawZ(0, 0, 3);
  drawZ(4, 2, 4);
  drawZ(9, 5, 5);
  return g;
}

// ── Character class ───────────────────────────────────────────────────────────

export class Employee {
  root: PIXI.Container;

  private torso:     PIXI.Container;
  private head:      PIXI.Container;
  private shoulderL: PIXI.Container;
  private elbowL:    PIXI.Container;
  private shoulderR: PIXI.Container;
  private elbowR:    PIXI.Container;
  private hipL:      PIXI.Container;
  private kneeL:     PIXI.Container;
  private hipR:      PIXI.Container;
  private kneeR:     PIXI.Container;
  private zzz:       PIXI.Graphics;

  private state: AnimState = 'idle';
  private t = 0;
  // blink state
  private nextBlink = 3;
  private blinkT = 0;
  private blinking = false;
  private eyeGfx: PIXI.Graphics;

  constructor() {
    this.root = new PIXI.Container();

    // ── static scene ──────────────────────────────
    const chair = mkChair();
    chair.x = -7 * PS;
    chair.y = -20 * PS;
    this.root.addChild(chair as unknown as PIXI.DisplayObject);

    const desk = mkDesk();
    desk.x = -5 * PS;
    desk.y = -4 * PS;
    this.root.addChild(desk as unknown as PIXI.DisplayObject);

    const laptop = mkLaptop();
    laptop.x = 12 * PS;
    laptop.y = -4 * PS;
    this.root.addChild(laptop as unknown as PIXI.DisplayObject);

    // ── far leg ───────────────────────────────────
    this.hipL = new PIXI.Container();
    this.hipL.x = -3 * PS;
    this.hipL.y = 0;
    this.hipL.addChild(mkThigh() as unknown as PIXI.DisplayObject);
    this.kneeL = new PIXI.Container();
    this.kneeL.y = 6 * PS;
    this.kneeL.addChild(mkShin() as unknown as PIXI.DisplayObject);
    this.hipL.addChild(this.kneeL as unknown as PIXI.DisplayObject);
    this.root.addChild(this.hipL as unknown as PIXI.DisplayObject);

    // ── torso ─────────────────────────────────────
    this.torso = new PIXI.Container();
    this.torso.addChild(mkTorso() as unknown as PIXI.DisplayObject);
    this.root.addChild(this.torso as unknown as PIXI.DisplayObject);

    // ── near leg ──────────────────────────────────
    this.hipR = new PIXI.Container();
    this.hipR.x = 2 * PS;
    this.hipR.y = 0;
    this.hipR.addChild(mkThigh() as unknown as PIXI.DisplayObject);
    this.kneeR = new PIXI.Container();
    this.kneeR.y = 6 * PS;
    this.kneeR.addChild(mkShin() as unknown as PIXI.DisplayObject);
    this.hipR.addChild(this.kneeR as unknown as PIXI.DisplayObject);
    this.root.addChild(this.hipR as unknown as PIXI.DisplayObject);

    // ── far arm (behind torso) ────────────────────
    this.shoulderL = new PIXI.Container();
    this.shoulderL.x = -3 * PS;
    this.shoulderL.y = -9 * PS;
    this.shoulderL.addChild(mkUpperArm() as unknown as PIXI.DisplayObject);
    this.elbowL = new PIXI.Container();
    this.elbowL.y = 6 * PS;
    this.elbowL.addChild(mkForearm() as unknown as PIXI.DisplayObject);
    this.shoulderL.addChild(this.elbowL as unknown as PIXI.DisplayObject);
    this.torso.addChild(this.shoulderL as unknown as PIXI.DisplayObject);

    // ── head ──────────────────────────────────────
    this.head = new PIXI.Container();
    this.head.y = -9 * PS;
    this.head.addChild(mkHead() as unknown as PIXI.DisplayObject);
    this.torso.addChild(this.head as unknown as PIXI.DisplayObject);

    // ── near arm (in front) ───────────────────────
    this.shoulderR = new PIXI.Container();
    this.shoulderR.x = 3 * PS;
    this.shoulderR.y = -9 * PS;
    this.shoulderR.addChild(mkUpperArm() as unknown as PIXI.DisplayObject);
    this.elbowR = new PIXI.Container();
    this.elbowR.y = 6 * PS;
    this.elbowR.addChild(mkForearm() as unknown as PIXI.DisplayObject);
    this.shoulderR.addChild(this.elbowR as unknown as PIXI.DisplayObject);
    this.torso.addChild(this.shoulderR as unknown as PIXI.DisplayObject);

    // ── ZZZ (only visible in sleeping) ────────────
    this.zzz = mkZzz();
    this.zzz.x = 6 * PS;
    this.zzz.y = -22 * PS;
    this.zzz.visible = false;
    this.root.addChild(this.zzz as unknown as PIXI.DisplayObject);

    // ── separate eye Graphics for blink ───────────
    this.eyeGfx = new PIXI.Graphics();
    this.head.addChild(this.eyeGfx as unknown as PIXI.DisplayObject);

    // set seated pose (legs rotated forward)
    this.hipL.rotation = 1.5;
    this.hipR.rotation = 1.5;
    this.kneeL.rotation = -1.1;
    this.kneeR.rotation = -1.1;
  }

  setState(s: AnimState) {
    this.state = s;
    this.t = 0;
    this.zzz.visible = false;
  }

  tick(dt: number) {
    this.t += dt;
    const t = this.t;

    // blink logic (only in idle)
    if (this.state === 'idle') {
      this.blinkT += dt;
      if (!this.blinking && this.blinkT >= this.nextBlink) {
        this.blinking = true;
        this.blinkT = 0;
        this.nextBlink = 2 + Math.random() * 3;
      }
      if (this.blinking) {
        const bl = this.blinkT;
        this.eyeGfx.clear();
        if (bl < 0.08) {
          // eye closing: draw filled rect over eye
          this.eyeGfx.beginFill(C.skin);
          this.eyeGfx.drawRect((3 - 4) * PS, (4 - 10) * PS, 2 * PS, 2 * PS);
          this.eyeGfx.endFill();
          this.eyeGfx.beginFill(C.skinDk);
          this.eyeGfx.drawRect((3 - 4) * PS, (5 - 10) * PS, 2 * PS, PS);
          this.eyeGfx.endFill();
        } else {
          this.blinking = false;
          this.eyeGfx.clear();
        }
      }
    } else {
      this.eyeGfx.clear();
    }

    switch (this.state) {
      case 'idle':     this._idle(t);     break;
      case 'working':  this._working(t);  break;
      case 'sleeping': this._sleeping(t); break;
    }
  }

  // ── idle: gentle breathing, head sway ────────────────────────────────────
  private _idle(t: number) {
    const b = Math.sin(t * 1.1) * 1.5;   // breath ±1.5px
    this.torso.y = b;
    this.torso.rotation = 0;
    this.head.y  = -9 * PS;
    this.head.rotation = Math.sin(t * 0.5) * 0.025;

    // arms relaxed at sides
    this.shoulderL.rotation = 0.1 + Math.sin(t * 0.7) * 0.03;
    this.shoulderR.rotation = -0.1 + Math.sin(t * 0.7 + 0.4) * 0.03;
    this.elbowL.rotation    =  0.05;
    this.elbowR.rotation    = -0.05;
    this.zzz.visible = false;
  }

  // ── working: lean forward, finger tapping ────────────────────────────────
  private _working(t: number) {
    const b = Math.sin(t * 1.8) * 0.8;
    this.torso.y = b;
    this.torso.rotation = -0.05;
    this.head.y = -9 * PS - 2;
    this.head.rotation = -0.05 + Math.sin(t * 0.35) * 0.02;

    // both arms reach toward laptop keyboard
    this.shoulderL.rotation = 0.85;
    this.shoulderR.rotation = 0.75;
    // fast tapping on forearms
    const tapL = Math.sin(t * 10) * 0.14;
    const tapR = Math.sin(t * 10 + 0.9) * 0.14;
    this.elbowL.rotation = -0.55 + tapL;
    this.elbowR.rotation = -0.50 + tapR;
    this.zzz.visible = false;
  }

  // ── sleeping: slumped, deep slow breath, ZZZ floats ─────────────────────
  private _sleeping(t: number) {
    const b = Math.sin(t * 0.5) * 3;
    this.torso.y = b + 4;
    this.torso.rotation = 0.15 + Math.sin(t * 0.5) * 0.03;
    this.head.y = -9 * PS + 6;
    this.head.rotation = 0.25 + Math.sin(t * 0.5) * 0.06;

    this.shoulderL.rotation = 0.4 + Math.sin(t * 0.5) * 0.04;
    this.shoulderR.rotation = 0.3 + Math.sin(t * 0.5) * 0.04;
    this.elbowL.rotation = 0.2;
    this.elbowR.rotation = 0.15;

    // ZZZ floats up and fades
    this.zzz.visible = true;
    this.zzz.y = (-22 + Math.sin(t * 0.4) * 4) * PS;
    this.zzz.alpha = 0.75 + Math.sin(t * 0.6) * 0.25;
  }
}
