/**
 * generate-character-sprites.mjs
 *
 * 三步生成 RPG 式透明背景像素角色 sprite：
 *
 * Step 1: Bitforge + style_image(char-full.png) → 生成站立姿态基础角色（透明背景，128×128）
 * Step 2: estimate-skeleton → 从基础角色提取骨骼关键点
 * Step 3: animate-with-skeleton × 3姿态 → 生成：坐着打字 / 趴桌睡觉 / 站立翻书
 *
 * 用法：
 *   PIXELLAB_API_KEY=your_key node scripts/generate-character-sprites.mjs
 *
 * 输出到 public/assets/sprites/
 *   base.png              — 基础角色（站立，透明背景）
 *   working/frame-N.png   — 坐着打字（4帧）
 *   sleeping/frame-N.png  — 趴桌睡觉（4帧）
 *   noting/frame-N.png    — 站立翻书/记笔记（4帧）
 *   meta.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR    = path.resolve(__dirname, '../public/assets/sprites');
const ASSETS_DIR = path.resolve(__dirname, '../public/room');
const API_KEY    = process.env.PIXELLAB_API_KEY;
const BASE_URL   = 'https://api.pixellab.ai/v1';

if (!API_KEY) {
  console.error('错误：请设置 PIXELLAB_API_KEY 环境变量');
  process.exit(1);
}

// ─── helpers ───────────────────────────────────────────────────────────────

function toBase64Image(filePath) {
  const buf = fs.readFileSync(filePath);
  const b64 = buf.toString('base64');
  const ext = path.extname(filePath).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
  return { type: 'base64', base64: `data:${mime};base64,${b64}` };
}

function saveBase64(b64str, outPath) {
  const raw = b64str.startsWith('data:') ? b64str.split(',')[1] : b64str;
  fs.writeFileSync(outPath, Buffer.from(raw, 'base64'));
}

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
  if (!res.ok) throw new Error(`API ${res.status} ${endpoint}: ${JSON.stringify(data)}`);
  return data;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Step 1: Bitforge 生成基础角色（站立，透明背景，128×128）──────────────

async function generateBaseCharacter() {
  const outPath = path.join(OUT_DIR, 'base.png');
  if (fs.existsSync(outPath)) {
    console.log('Step 1: base.png 已存在，跳过');
    return outPath;
  }

  console.log('Step 1: Bitforge 生成基础角色...');
  const styleImage = toBase64Image(path.join(ASSETS_DIR, 'char-full.png'));

  const data = await apiPost('/generate-image-bitforge', {
    description: 'pixel art character, young programmer, orange hoodie sweatshirt, round glasses, large over-ear headphones, brown hair, standing pose, side view facing right, full body visible',
    negative_description: 'background, room, furniture, chair, desk, blurry, low quality',
    image_size: { width: 128, height: 128 },
    text_guidance_scale: 8.0,
    style_strength: 60.0,
    style_image: styleImage,
    no_background: true,
    view: 'side',
    direction: 'east',
    outline: 'selective outline',
    shading: 'basic shading',
    detail: 'highly detailed',
  });

  saveBase64(data.image.base64, outPath);
  console.log(`Step 1: 完成 → ${outPath} ($${data.usage?.usd ?? '?'})`);
  return outPath;
}

// ─── Step 2: estimate-skeleton ─────────────────────────────────────────────

async function estimateSkeleton(imagePath) {
  console.log('Step 2: 估算骨骼关键点...');
  const image = toBase64Image(imagePath);
  const data = await apiPost('/estimate-skeleton', { image });
  console.log(`Step 2: 获得 ${data.keypoints.length} 个关键点 ($${data.usage?.usd ?? '?'})`);
  return data.keypoints;
}

// ─── Step 3: animate-with-skeleton × 3 poses ──────────────────────────────

// 手动设定3种姿态的骨骼关键点（归一化坐标 0~1，基于128×128画布）
// 这些值参考 PixelLab 的 SkeletonLabel 规范：
// NOSE NECK, RIGHT/LEFT SHOULDER ELBOW ARM, RIGHT/LEFT HIP KNEE LEG, RIGHT/LEFT EYE EAR

function makePose_working(baseKps) {
  // 坐着打字：上半身前倾，手臂前伸到键盘
  // 直接用 estimate 的结果，让模型根据 description 自行调整
  return baseKps.map(kp => {
    const k = { ...kp };
    // 把腿部关键点折叠（坐姿）
    if (k.label === 'RIGHT KNEE' || k.label === 'LEFT KNEE') {
      k.y = Math.min(k.y + 0.1, 0.95);
    }
    if (k.label === 'RIGHT LEG' || k.label === 'LEFT LEG') {
      k.y = Math.min(k.y + 0.05, 0.95);
      k.x = k.label === 'RIGHT LEG' ? Math.max(k.x - 0.05, 0.05) : Math.min(k.x + 0.05, 0.95);
    }
    // 手臂前伸
    if (k.label === 'RIGHT ARM' || k.label === 'LEFT ARM') {
      k.y = Math.min(k.y + 0.05, 0.95);
    }
    return k;
  });
}

function makePose_sleeping(baseKps) {
  // 趴桌睡觉：整体下移，头部前倾，手臂折叠在桌上
  return baseKps.map(kp => {
    const k = { ...kp };
    if (['NOSE','RIGHT EYE','LEFT EYE','RIGHT EAR','LEFT EAR'].includes(k.label)) {
      k.y = Math.min(k.y + 0.15, 0.95);
      k.x = Math.min(k.x + 0.1, 0.95);
    }
    if (k.label === 'NECK') {
      k.y = Math.min(k.y + 0.1, 0.95);
    }
    if (['RIGHT SHOULDER','LEFT SHOULDER'].includes(k.label)) {
      k.y = Math.min(k.y + 0.08, 0.95);
    }
    if (['RIGHT ELBOW','LEFT ELBOW','RIGHT ARM','LEFT ARM'].includes(k.label)) {
      k.y = Math.min(k.y + 0.1, 0.95);
    }
    return k;
  });
}

function makePose_noting(baseKps) {
  // 站立翻书：右手抬起持书，左手扶书，微微低头
  return baseKps.map(kp => {
    const k = { ...kp };
    if (['NOSE','RIGHT EYE','LEFT EYE','RIGHT EAR','LEFT EAR'].includes(k.label)) {
      k.y = Math.min(k.y + 0.03, 0.95);
    }
    if (k.label === 'RIGHT ELBOW') {
      k.y = Math.max(k.y - 0.1, 0.05);
      k.x = Math.max(k.x - 0.05, 0.05);
    }
    if (k.label === 'RIGHT ARM') {
      k.y = Math.max(k.y - 0.15, 0.05);
      k.x = Math.max(k.x - 0.05, 0.05);
    }
    if (k.label === 'LEFT ELBOW') {
      k.y = Math.max(k.y - 0.08, 0.05);
    }
    if (k.label === 'LEFT ARM') {
      k.y = Math.max(k.y - 0.1, 0.05);
    }
    return k;
  });
}

const POSES = [
  {
    key: 'working',
    nFrames: 4,
    description: 'sitting at desk typing on keyboard, leaning forward, arms extended',
    makePose: makePose_working,
  },
  {
    key: 'sleeping',
    nFrames: 4,
    description: 'slumped over desk sleeping, head resting on folded arms, eyes closed',
    makePose: makePose_sleeping,
  },
  {
    key: 'noting',
    nFrames: 4,
    description: 'standing holding open notebook, writing with pen, looking at page',
    makePose: makePose_noting,
  },
];

async function generatePose(pose, baseImagePath, baseKeypoints) {
  const dir = path.join(OUT_DIR, pose.key);
  fs.mkdirSync(dir, { recursive: true });

  const referenceImage = toBase64Image(baseImagePath);
  const skeletonKeypoints = pose.makePose(baseKeypoints);

  // animate-with-skeleton 一次返回多帧（通过 init_images 传不同帧种子）
  // 但实际用法是：每次调用生成3帧，我们调用多次（每次seed不同）组成动画
  const allFramePaths = [];

  // 调用2次，每次生成约3帧，共4帧（取前4个）
  let frameIdx = 0;
  for (let batch = 0; batch < 2 && frameIdx < pose.nFrames; batch++) {
    const existing = Array.from({length: pose.nFrames}, (_, i) =>
      path.join(dir, `frame-${i}.png`)
    ).filter(p => fs.existsSync(p));

    if (existing.length >= pose.nFrames) {
      console.log(`  ${pose.key}: 所有帧已存在，跳过`);
      return;
    }

    console.log(`  ${pose.key} batch ${batch + 1}/2...`);

    const data = await apiPost('/animate-with-skeleton', {
      image_size: { width: 128, height: 128 },
      guidance_scale: 5.0,
      view: 'side',
      direction: 'east',
      reference_image: referenceImage,
      skeleton_keypoints: skeletonKeypoints,
      seed: batch * 1000 + Math.floor(Math.random() * 999),
    });

    for (const img of (data.images ?? [])) {
      if (frameIdx >= pose.nFrames) break;
      const outPath = path.join(dir, `frame-${frameIdx}.png`);
      if (!fs.existsSync(outPath)) {
        saveBase64(img.base64, outPath);
        console.log(`    frame-${frameIdx} 保存 ($${data.usage?.usd ?? '?'})`);
      }
      frameIdx++;
    }

    await sleep(1000);
  }
}

// ─── main ──────────────────────────────────────────────────────────────────

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Step 1
  const baseImagePath = await generateBaseCharacter();
  await sleep(800);

  // Step 2
  const baseKeypoints = await estimateSkeleton(baseImagePath);
  fs.writeFileSync(path.join(OUT_DIR, 'base-keypoints.json'), JSON.stringify(baseKeypoints, null, 2));
  console.log('骨骼关键点已保存到 base-keypoints.json');
  await sleep(500);

  // Step 3
  for (const pose of POSES) {
    console.log(`\nStep 3: 生成姿态 ${pose.key}...`);
    await generatePose(pose, baseImagePath, baseKeypoints);
    await sleep(800);
  }

  // meta.json
  const meta = {
    generatedAt: new Date().toISOString(),
    spriteSize: { width: 128, height: 128 },
    poses: POSES.map(p => ({
      key: p.key,
      nFrames: p.nFrames,
      fps: 4,
      frames: Array.from({ length: p.nFrames }, (_, i) => `${p.key}/frame-${i}.png`),
    })),
  };
  fs.writeFileSync(path.join(OUT_DIR, 'meta.json'), JSON.stringify(meta, null, 2));

  console.log('\n完成。sprites 目录:', OUT_DIR);
  console.log('base.png — 基础角色（透明背景，供预览器叠加到房间背景上）');
}

main().catch(e => { console.error('失败:', e.message); process.exit(1); });
