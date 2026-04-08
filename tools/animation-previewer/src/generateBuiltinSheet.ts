/**
 * 程序生成内置像素风角色 sprite sheet（绿幕背景）
 * 和 employee.ts 使用相同调色板，保证风格一致
 *
 * 布局（每格 80×80px，PS=4，间距 20px）：
 *   头部  | 躯干 | 左上臂 | 左前臂
 *   右上臂 | 右前臂 | 左腿 | 右腿
 *
 * 输出：HTMLCanvasElement，宽 400px 高 200px
 */

// ── 调色板（与 employee.ts 一致） ────────────────────────────────────────────
const C = {
  skin:     [0xF5, 0xD6, 0xA0] as const,
  skinDk:   [0xD4, 0xA9, 0x6A] as const,
  hair:     [0x4A, 0x37, 0x28] as const,
  hairHi:   [0x6B, 0x50, 0x40] as const,
  eye:      [0x2A, 0x1A, 0x0A] as const,
  eyeW:     [0xF0, 0xE8, 0xD8] as const,
  shirt:    [0x5B, 0x7B, 0x8A] as const,
  shirtDk:  [0x3D, 0x5A, 0x6A] as const,
  pants:    [0x3D, 0x5A, 0x6E] as const,
  pantsDk:  [0x2A, 0x3E, 0x50] as const,
  shoe:     [0x2A, 0x1E, 0x14] as const,
  shoeDk:   [0x1A, 0x10, 0x08] as const,
  lip:      [0xC0, 0x78, 0x58] as const,
  green:    [0x00, 0xFF, 0x00] as const,   // chroma key 绿幕
};

const PS = 4; // 每个像素格 = 4×4 屏幕像素

type Color = readonly [number, number, number];

function px(
  ctx: CanvasRenderingContext2D,
  c: Color,
  ox: number, oy: number,   // 部件在 canvas 内的偏移
  x: number, y: number,
  w = 1, h = 1,
) {
  ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
  ctx.fillRect(ox + x * PS, oy + y * PS, w * PS, h * PS);
}

// ── 各部件绘制函数 ─────────────────────────────────────────────────────────

/** 头部 9×10 art-px */
function drawHead(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
  const p = (c: Color, x: number, y: number, w = 1, h = 1) => px(ctx, c, ox, oy, x, y, w, h);
  // hair
  p(C.hair,   0, 0, 9, 3);
  p(C.hairHi, 1, 0, 4, 1);
  p(C.hair,   0, 3, 2, 5);
  // face
  p(C.skin,   2, 3, 6, 6);
  p(C.skinDk, 7, 5, 1, 3);
  // eye
  p(C.eyeW,   3, 4, 2, 2);
  p(C.eye,    4, 4, 1, 1);
  // ear
  p(C.skin,   8, 4, 1, 2);
  p(C.skinDk, 8, 5, 1, 1);
  // nose
  p(C.skinDk, 5, 6, 1, 1);
  // mouth
  p(C.skinDk, 3, 8, 3, 1);
  p(C.lip,    4, 8, 2, 1);
  // chin
  p(C.skin,   2, 9, 5, 1);
}

/** 躯干 8×11 art-px */
function drawTorso(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
  const p = (c: Color, x: number, y: number, w = 1, h = 1) => px(ctx, c, ox, oy, x, y, w, h);
  p(C.shirt,   1, 0, 6, 9);
  p(C.shirtDk, 6, 1, 1, 8);
  p(C.skin,    2, 0, 4, 2);
  p(C.shirtDk, 2, 3, 2, 2);
  p(C.shirt,   0, 1, 1, 4);
  p(C.pants,   1, 9, 6, 2);
  p(C.pantsDk, 6, 10, 1, 1);
}

/** 上臂 3×6 art-px */
function drawUpperArm(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
  const p = (c: Color, x: number, y: number, w = 1, h = 1) => px(ctx, c, ox, oy, x, y, w, h);
  p(C.shirt,   0, 0, 3, 5);
  p(C.shirtDk, 2, 1, 1, 4);
  p(C.skin,    0, 5, 3, 1);
}

/** 前臂+手 3×7 art-px */
function drawForearm(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
  const p = (c: Color, x: number, y: number, w = 1, h = 1) => px(ctx, c, ox, oy, x, y, w, h);
  p(C.skin,   0, 0, 3, 5);
  p(C.skinDk, 2, 1, 1, 4);
  p(C.skin,   0, 5, 1, 2);
  p(C.skin,   1, 5, 1, 2);
  p(C.skin,   2, 5, 1, 1);
}

/** 大腿 5×7 art-px */
function drawThigh(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
  const p = (c: Color, x: number, y: number, w = 1, h = 1) => px(ctx, c, ox, oy, x, y, w, h);
  p(C.pants,   0, 0, 5, 6);
  p(C.pantsDk, 4, 1, 1, 5);
  p(C.pantsDk, 0, 5, 5, 1);
}

/** 小腿+鞋 3×7 art-px（实际高度7，加鞋3行 = 小腿4行+鞋3行） */
function drawShin(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
  const p = (c: Color, x: number, y: number, w = 1, h = 1) => px(ctx, c, ox, oy, x, y, w, h);
  p(C.pants,   0, 0, 3, 4);
  p(C.pantsDk, 2, 1, 1, 3);
  p(C.shoe,    0, 4, 4, 3);
  p(C.shoeDk,  0, 6, 4, 1);
}

// ── 主函数 ────────────────────────────────────────────────────────────────────

/**
 * 生成内置 sprite sheet canvas
 * 布局：4列2行，每格 CELL×CELL px，绿幕背景
 */
export function generateBuiltinSheet(): HTMLCanvasElement {
  const CELL = 80;   // 每个部件格子大小
  const COLS = 4;
  const ROWS = 2;

  const canvas = document.createElement('canvas');
  canvas.width  = COLS * CELL;
  canvas.height = ROWS * CELL;
  const ctx = canvas.getContext('2d')!;

  // 绿幕背景
  ctx.fillStyle = `rgb(${C.green[0]},${C.green[1]},${C.green[2]})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 每个部件居中放入格子
  const cell = (col: number, row: number, artW: number, artH: number) => ({
    ox: col * CELL + Math.floor((CELL - artW * PS) / 2),
    oy: row * CELL + Math.floor((CELL - artH * PS) / 2),
  });

  // 行0：头 | 躯干 | 左上臂 | 左前臂
  const head   = cell(0, 0,  9, 10);
  const torso  = cell(1, 0,  8, 11);
  const armUL  = cell(2, 0,  3,  6);
  const armFL  = cell(3, 0,  3,  7);

  drawHead(ctx,     head.ox,  head.oy);
  drawTorso(ctx,    torso.ox, torso.oy);
  drawUpperArm(ctx, armUL.ox, armUL.oy);
  drawForearm(ctx,  armFL.ox, armFL.oy);

  // 行1：右上臂 | 右前臂 | 左腿 | 右腿
  const armUR  = cell(0, 1,  3,  6);
  const armFR  = cell(1, 1,  3,  7);
  const legL   = cell(2, 1,  5,  7);  // 大腿
  const legR   = cell(3, 1,  3,  7);  // 小腿+鞋（作为下腿部件）

  drawUpperArm(ctx, armUR.ox, armUR.oy);
  drawForearm(ctx,  armFR.ox, armFR.oy);
  drawThigh(ctx,    legL.ox,  legL.oy);
  drawShin(ctx,     legR.ox,  legR.oy);

  return canvas;
}

/** 把 canvas 转成 data URL，方便调试导出 */
export function sheetToDataURL(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png');
}

/** 部件信息（用于 SpriteSheetLab 自动预填充） */
export const BUILTIN_SHEET_INFO = {
  chromaThreshold: 60,   // 绿幕是纯 #00FF00，低阈值足够
  minArea: 30,           // 像素部件小，降低最小面积
} as const;

