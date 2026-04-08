/**
 * generate-scene-frames.mjs
 *
 * 用 PixelLab Pixflux 生成完整场景图（400×220px，API最大限制400）。
 * 每个状态生成 4 帧动画，直接包含房间+角色。
 * 显示时拉伸到 1024×559，像素艺术放大，nearest neighbor。
 *
 * 状态：working / idle_sleeping / noting
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../public/assets/scenes');
const API_KEY = process.env.PIXELLAB_API_KEY ?? '3cfb5c9a-7288-44eb-a754-50664d8263b4';
const BASE_URL = 'https://api.pixellab.ai/v1';

// 房间基础描述（角色设定固定）
const ROOM_BASE = [
  'pixel art 16-bit cozy bedroom lofi side view,',
  'character: young programmer with brown hair, round glasses, large over-ear headphones, orange hoodie,',
  'warm cozy room: wood floor, warm lamp light, colorful bed with blanket on left,',
  'tall bookshelf filled with books on right wall, wooden desk with monitor and keyboard,',
  'window showing night sky with stars upper right, potted plant near window,',
  'pixel art style, crisp pixels, no anti-aliasing, warm amber and brown palette,',
  'lofi aesthetic, cozy night atmosphere',
].join(' ');

const SCENES = [
  {
    key: 'working',
    frames: [
      `${ROOM_BASE} -- character sitting at desk, both hands on keyboard typing, leaning forward slightly, focused on monitor screen, frame 1`,
      `${ROOM_BASE} -- character at desk, right hand raised pressing key, left hand on keyboard, eyes on screen, frame 2`,
      `${ROOM_BASE} -- character at desk, left hand raised pressing key, right hand on keyboard, focused expression, frame 3`,
      `${ROOM_BASE} -- character sitting upright at desk, both hands on keyboard, slight head tilt toward screen, frame 4`,
    ],
  },
  {
    key: 'idle_sleeping',
    frames: [
      `${ROOM_BASE} -- character slumped over desk sleeping, head resting on folded arms on desk surface, eyes closed, headphones still on, frame 1`,
      `${ROOM_BASE} -- character sleeping face-down on desk arms, body slightly raised as they breathe in, peaceful expression, frame 2`,
      `${ROOM_BASE} -- character sleeping on desk arms, back at peak height mid-breath, deep rest, frame 3`,
      `${ROOM_BASE} -- character sleeping on desk arms, body relaxed exhaling, totally at rest, frame 4`,
    ],
  },
  {
    key: 'noting',
    frames: [
      `${ROOM_BASE} -- character standing beside bookshelf holding open notebook, writing with pen, looking at book on shelf, frame 1`,
      `${ROOM_BASE} -- character standing at bookshelf, pen moving across notebook page, writing notes, frame 2`,
      `${ROOM_BASE} -- character standing at bookshelf, pen raised thinking, looking at spine of book, frame 3`,
      `${ROOM_BASE} -- character standing at bookshelf, writing in notebook again, warm lamp casting light, frame 4`,
    ],
  },
];

async function apiPost(endpoint, body) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`API ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

function saveBase64(b64, filePath) {
  const raw = b64.startsWith('data:') ? b64.split(',')[1] : b64;
  fs.writeFileSync(filePath, Buffer.from(raw, 'base64'));
}

async function generateScene(scene) {
  const dir = path.join(OUT_DIR, scene.key);
  fs.mkdirSync(dir, { recursive: true });

  for (let i = 0; i < scene.frames.length; i++) {
    const outPath = path.join(dir, `frame-${i}.png`);
    if (fs.existsSync(outPath)) {
      console.log(`  ${scene.key}/frame-${i}: 已存在，跳过`);
      continue;
    }

    console.log(`  生成 ${scene.key}/frame-${i}...`);
    const data = await apiPost('/generate-image-pixflux', {
      description: scene.frames[i],
      image_size: { width: 400, height: 220 },
      no_background: false,
      view: 'side',
      outline: 'lineless',
      shading: 'basic shading',
      detail: 'highly detailed',
    });

    saveBase64(data.image.base64, outPath);
    console.log(`  ${scene.key}/frame-${i} 保存完成，消耗: $${data.usage?.usd ?? '?'}`);

    if (i < scene.frames.length - 1) await new Promise(r => setTimeout(r, 800));
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const scene of SCENES) {
    console.log(`\n生成场景: ${scene.key}`);
    await generateScene(scene);
    await new Promise(r => setTimeout(r, 500));
  }

  const meta = {
    generatedAt: new Date().toISOString(),
    frameSize: { width: 400, height: 220 },
    displaySize: { width: 1024, height: 559 },
    animations: SCENES.map(s => ({
      key: s.key,
      nFrames: s.frames.length,
      fps: 4,
      frames: Array.from({ length: s.frames.length }, (_, i) => `${s.key}/frame-${i}.png`),
    })),
  };

  fs.writeFileSync(path.join(OUT_DIR, 'meta.json'), JSON.stringify(meta, null, 2));
  console.log('\n完成。场景目录:', OUT_DIR);
}

main().catch(e => { console.error('失败:', e.message); process.exit(1); });
