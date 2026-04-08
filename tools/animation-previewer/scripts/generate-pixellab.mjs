/**
 * PixelLab 分层方案生成脚本
 *
 * Step 1: 用 Pixflux 生成 400×220 房间背景
 * Step 2: 用 Pixflux 生成 128×128 透明背景角色
 * Step 3: estimate-skeleton 估算骨骼
 * Step 4: animate-with-skeleton 生成 3 种状态 × 4 帧动画
 * Step 5: 生成 meta.json
 *
 * 运行：node scripts/generate-pixellab.mjs
 * 输出：public/assets/room/
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOM_DIR = path.resolve(__dirname, '../public/assets/room');
const CHAR_DIR = path.join(ROOM_DIR, 'character');
const API_KEY = '3cfb5c9a-7288-44eb-a754-50664d8263b4';
const BASE_URL = 'https://api.pixellab.ai/v1';

// ── helpers ──────────────────────────────────────────────────────────────────

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
  if (!res.ok) {
    throw new Error(`API ${endpoint} error ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

function saveBase64(b64, filePath) {
  const raw = b64.startsWith('data:') ? b64.split(',')[1] : b64;
  fs.writeFileSync(filePath, Buffer.from(raw, 'base64'));
  console.log(`  saved: ${path.relative(process.cwd(), filePath)}`);
}

function readBase64(filePath) {
  return fs.readFileSync(filePath).toString('base64');
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ── Step 1: 生成房间背景 ──────────────────────────────────────────────────────

async function generateBackground() {
  const outPath = path.join(ROOM_DIR, 'background.png');
  if (fs.existsSync(outPath)) {
    console.log('[Step 1] background.png 已存在，跳过。');
    return;
  }
  console.log('[Step 1] 生成房间背景 400×220...');
  const data = await apiPost('/generate-image-pixflux', {
    description: 'cozy pixel art programmer room interior, night time, warm lighting, desk with computer monitor glowing, bookshelf with colorful books, single bed with colorful blanket, desk lamp warm glow, window showing night sky with moon and stars, wooden floor, potted plants, no character, no person, side view, lofi aesthetic',
    image_size: { width: 400, height: 220 },
    no_background: false,
    view: 'side',
    direction: 'east',
    outline: 'single color outline',
    shading: 'medium shading',
    detail: 'highly detailed',
    seed: 1001,
  });
  saveBase64(data.image.base64, outPath);
  console.log(`  cost: $${data.usage?.usd ?? '?'}`);
}

// ── Step 2: 生成角色 ──────────────────────────────────────────────────────────

async function generateCharacter() {
  const outPath = path.join(CHAR_DIR, 'base.png');
  if (fs.existsSync(outPath)) {
    console.log('[Step 2] base.png 已存在，跳过。');
    return;
  }
  console.log('[Step 2] 生成角色 128×128 透明背景...');
  const data = await apiPost('/generate-image-pixflux', {
    description: 'pixel art character, side view facing right, orange hoodie, glasses, large headphones, brown hair, programmer, standing idle pose, full body, clean pixel art style, simple design',
    image_size: { width: 128, height: 128 },
    no_background: true,
    view: 'side',
    direction: 'east',
    outline: 'single color outline',
    shading: 'basic shading',
    detail: 'medium detail',
    seed: 2002,
  });
  saveBase64(data.image.base64, outPath);
  console.log(`  cost: $${data.usage?.usd ?? '?'}`);
}

// ── Step 3: estimate skeleton ─────────────────────────────────────────────────

async function estimateSkeleton() {
  const skelPath = path.join(CHAR_DIR, 'skeleton.json');
  if (fs.existsSync(skelPath)) {
    console.log('[Step 3] skeleton.json 已存在，跳过。');
    return JSON.parse(fs.readFileSync(skelPath, 'utf-8'));
  }
  console.log('[Step 3] 估算骨骼...');
  const charB64 = readBase64(path.join(CHAR_DIR, 'base.png'));
  const data = await apiPost('/estimate-skeleton', {
    image: { type: 'base64', base64: charB64 },
  });
  fs.writeFileSync(skelPath, JSON.stringify(data.keypoints, null, 2));
  console.log(`  检测到 ${data.keypoints.length} 个骨骼点`);
  console.log(`  cost: $${data.usage?.usd ?? '?'}`);
  return data.keypoints;
}

// ── Step 4: animate-with-skeleton ────────────────────────────────────────────
//
// 骨骼姿势设计（128×128 坐标空间）：
//   角色站立参考骨骼（估算后会覆盖，这里只是 fallback）
//
// working: 坐在桌前敲键盘，4帧手臂微动
// idle_sleeping: 趴在床上睡觉，4帧轻微呼吸
// noting: 站在书架旁写笔记，4帧手臂书写

// 从 estimate-skeleton 返回的 keypoints 做偏移，生成 4 帧姿势变化
function makePosesFromKeypoints(keypoints, state) {
  // keypoints: [{x, y, label, z_index}, ...]
  // 返回 4 帧的 skeleton_keypoints，每帧是 keypoints 数组（带微小偏移）

  const frames = [];
  for (let f = 0; f < 3; f++) {
    const frame = keypoints.map(kp => {
      let dx = 0;
      let dy = 0;

      if (state === 'working') {
        // 打字：手臂在 3 帧内交替抬起（标签含空格，API 返回格式）
        if (kp.label === 'RIGHT ARM' || kp.label === 'RIGHT ELBOW') {
          dy = f % 2 === 0 ? -3 : 3;
          dx = f % 2 === 0 ? 2 : -2;
        }
        if (kp.label === 'LEFT ARM' || kp.label === 'LEFT ELBOW') {
          dy = f % 2 === 1 ? -3 : 3;
          dx = f % 2 === 1 ? -2 : 2;
        }
        if (kp.label === 'NOSE' || kp.label === 'NECK') {
          dx = 2;
          dy = f < 2 ? 1 : 0;
        }
      } else if (state === 'idle_sleeping') {
        // 睡觉：3 帧呼吸
        const breathCycle = [0, -2, -3];
        dy = breathCycle[f];
        if (kp.label === 'NECK' || kp.label === 'NOSE') {
          dy += breathCycle[f];
          dx = -4;
        }
      } else if (state === 'noting') {
        // 写笔记：右手 3 帧横向移动
        if (kp.label === 'RIGHT ARM') {
          dx = [-4, 0, 4][f];
          dy = [2, 0, 2][f];
        }
        if (kp.label === 'RIGHT ELBOW') {
          dx = [-2, 0, 3][f];
        }
        if (kp.label === 'NOSE') {
          dx = -2;
          dy = f < 2 ? -1 : 1;
        }
      }

      return {
        x: Math.max(0, Math.min(127, kp.x + dx)),
        y: Math.max(0, Math.min(127, kp.y + dy)),
        label: kp.label,
        z_index: Math.round(kp.z_index ?? 0),
      };
    });
    frames.push(frame);
  }
  return frames;
}

async function generateAnimation(state, keypoints) {
  const stateDir = path.join(CHAR_DIR, state);
  fs.mkdirSync(stateDir, { recursive: true });

  const allExist = [0, 1, 2].every(i =>
    fs.existsSync(path.join(stateDir, `frame-${i}.png`))
  );
  if (allExist) {
    console.log(`[Step 4] ${state}: 已存在 4 帧，跳过。`);
    return;
  }

  console.log(`[Step 4] 生成 ${state} 动画...`);
  const charB64 = readBase64(path.join(CHAR_DIR, 'base.png'));
  const skeletonKeypoints = makePosesFromKeypoints(keypoints, state);

  const data = await apiPost('/animate-with-skeleton', {
    image_size: { width: 128, height: 128 },
    reference_image: { type: 'base64', base64: charB64 },
    skeleton_keypoints: skeletonKeypoints,
    view: 'side',
    direction: 'east',
    guidance_scale: 4.0,
    seed: { working: 3001, idle_sleeping: 3002, noting: 3003 }[state],
  });

  data.images.forEach((img, i) => {
    const outPath = path.join(stateDir, `frame-${i}.png`);
    saveBase64(img.base64, outPath);
  });

  console.log(`  ${state}: ${data.images.length} 帧已保存，cost: $${data.usage?.usd ?? '?'}`);
}

// ── Step 5: meta.json ─────────────────────────────────────────────────────────

function generateMeta() {
  const meta = {
    generatedAt: new Date().toISOString(),
    background: 'background.png',
    characterSize: { width: 128, height: 128 },
    animations: [
      {
        key: 'working',
        nFrames: 3,
        fps: 6,
        frames: [0, 1, 2].map(i => `character/working/frame-${i}.png`),
        // 在 400×220 背景中的位置：右侧电脑桌前
        position: { x: 260, y: 80 },
      },
      {
        key: 'idle_sleeping',
        nFrames: 3,
        fps: 3,
        frames: [0, 1, 2].map(i => `character/idle_sleeping/frame-${i}.png`),
        // 左侧床上
        position: { x: 40, y: 100 },
      },
      {
        key: 'noting',
        nFrames: 3,
        fps: 5,
        frames: [0, 1, 2].map(i => `character/noting/frame-${i}.png`),
        // 书架前
        position: { x: 150, y: 70 },
      },
    ],
  };

  const metaPath = path.join(ROOM_DIR, 'meta.json');
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  console.log(`[Step 5] meta.json 已写入: ${path.relative(process.cwd(), metaPath)}`);
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  fs.mkdirSync(ROOM_DIR, { recursive: true });
  fs.mkdirSync(CHAR_DIR, { recursive: true });

  // Step 1: 背景
  await generateBackground();
  await delay(500);

  // Step 2: 角色
  await generateCharacter();
  await delay(500);

  // Step 3: 骨骼
  const keypoints = await estimateSkeleton();
  await delay(500);

  // Step 4: 三种动画状态
  for (const state of ['working', 'idle_sleeping', 'noting']) {
    await generateAnimation(state, keypoints);
    await delay(800);
  }

  // Step 5: meta.json
  generateMeta();

  console.log('\n全部完成。资产目录:', path.relative(process.cwd(), ROOM_DIR));
}

main().catch(err => {
  console.error('生成失败:', err.message);
  process.exit(1);
});
