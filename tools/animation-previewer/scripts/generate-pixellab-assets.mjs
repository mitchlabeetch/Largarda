/**
 * PixelLab 素材生成脚本
 *
 * 生成三个动画状态的序列帧：idle / working / sleeping
 * 每个状态 4 帧，64×64px，侧视角
 *
 * 运行方式：
 *   PIXELLAB_API_KEY=xxx node scripts/generate-pixellab-assets.mjs
 *
 * 输出目录：public/assets/generated/
 *   reference.png          — 角色参考图
 *   idle/frame-0.png ...   — idle 4帧
 *   working/frame-0.png ... — working 4帧
 *   sleeping/frame-0.png ... — sleeping 4帧
 *   meta.json              — 帧元数据，供预览器加载
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../public/assets/generated');
const API_KEY = process.env.PIXELLAB_API_KEY ?? '3cfb5c9a-7288-44eb-a754-50664d8263b4';
const BASE_URL = 'https://api.pixellab.ai/v1';

const ANIMATIONS = [
  {
    key: 'working',
    action: [
      '4-frame typing animation at computer desk, side view facing right.',
      'Character actively typing on keyboard, leaning slightly forward, focused.',
      'frame 0 both hands on keyboard resting,',
      'frame 1 right hand raised slightly pressing key,',
      'frame 2 left hand raised pressing key,',
      'frame 3 both hands back to keyboard.',
      'Fast finger movement, engaged posture, eyes on screen.',
    ].join(' '),
    nFrames: 4,
  },
  {
    key: 'idle_sleeping',
    action: [
      'napping at desk, SAME scene SAME character as reference image.',
      'Character sitting at computer desk side view facing right.',
      'Head resting on crossed arms on desk, eyes closed, sleeping posture.',
      'DO NOT change scene. DO NOT change clothing. DO NOT change viewpoint.',
      'Slow deep sleep breathing cycle:',
      'frame 0 head on arms resting, torso normal,',
      'frame 1 back rising +2px slow inhale,',
      'frame 2 back at peak +4px full inhale,',
      'frame 3 back dropping exhale, returning to frame 0.',
    ].join(' '),
    nFrames: 4,
    imageGuidanceScale: 4.0,
  },
  {
    key: 'noting',
    action: [
      '4-frame note-taking animation near bookshelf, side view facing right.',
      'Character standing or sitting near bookshelf, writing in notebook.',
      'frame 0 hand holding pen on notebook, looking at page,',
      'frame 1 pen moving across page writing,',
      'frame 2 pen raised pausing to think, head slightly tilted,',
      'frame 3 pen back to notebook writing again.',
      'Thoughtful focused expression, warm lighting from lamp.',
    ].join(' '),
    nFrames: 4,
    imageGuidanceScale: 3.0,
  },
];

const CHARACTER_DESCRIPTION = [
  'pixel art programmer character sitting at desk',
  'side view 90 degrees',
  'warm lofi cozy color palette',
  'dark warm brown hair',
  'blue-grey programmer shirt',
  'dark pants',
  'cute chibi proportions',
  'clean pixel art outlines',
  'no anti-aliasing',
].join(', ');

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
    throw new Error(`API error ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

function saveBase64(b64, filePath) {
  const raw = b64.startsWith('data:') ? b64.split(',')[1] : b64;
  fs.writeFileSync(filePath, Buffer.from(raw, 'base64'));
}

async function generateReference() {
  // animate-with-text 只接受 64×64，优先读 reference-64.png
  const ref64Path = path.join(OUT_DIR, 'reference-64.png');
  const refPath   = path.join(OUT_DIR, 'reference.png');

  if (fs.existsSync(ref64Path)) {
    console.log('参考图(64×64)已存在，跳过生成。');
    return fs.readFileSync(ref64Path).toString('base64');
  }

  if (fs.existsSync(refPath)) {
    console.log('参考图已存在，跳过生成。');
    return fs.readFileSync(refPath).toString('base64');
  }

  console.log('生成角色参考图...');
  const data = await apiPost('/generate-image-pixflux', {
    description: CHARACTER_DESCRIPTION,
    image_size: { width: 64, height: 64 },
    no_background: true,
    view: 'side',
    direction: 'east',
    outline: 'single color outline',
    shading: 'basic shading',
    detail: 'medium detail',
    seed: 42,
  });

  saveBase64(data.image.base64, refPath);
  console.log(`参考图已保存：${refPath}，消耗：$${data.usage.usd}`);
  return data.image.base64.startsWith('data:')
    ? data.image.base64.split(',')[1]
    : data.image.base64;
}

async function generateAnimation(animDef, referenceB64) {
  const dir = path.join(OUT_DIR, animDef.key);
  fs.mkdirSync(dir, { recursive: true });

  // 检查是否已生成
  const allExist = Array.from({ length: animDef.nFrames }, (_, i) =>
    fs.existsSync(path.join(dir, `frame-${i}.png`))
  ).every(Boolean);

  if (allExist) {
    console.log(`${animDef.key}: 已存在，跳过。`);
    return;
  }

  console.log(`生成 ${animDef.key} 动画 (${animDef.nFrames}帧)...`);
  const data = await apiPost('/animate-with-text', {
    description: CHARACTER_DESCRIPTION,
    action: animDef.action,
    view: 'side',
    direction: 'east',
    image_size: { width: 64, height: 64 },
    n_frames: animDef.nFrames,
    reference_image: { type: 'base64', base64: referenceB64 },
    text_guidance_scale: 8.0,
    image_guidance_scale: animDef.imageGuidanceScale ?? 2.0,
  });

  data.images.forEach((img, i) => {
    const outPath = path.join(dir, `frame-${i}.png`);
    saveBase64(img.base64, outPath);
  });

  console.log(`${animDef.key}: ${data.images.length}帧已保存，消耗：$${data.usage.usd}`);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // 1. 生成参考图
  const referenceB64 = await generateReference();

  // 2. 生成各状态动画（串行，避免 rate limit）
  for (const anim of ANIMATIONS) {
    await generateAnimation(anim, referenceB64);
    // 每个请求间隔 500ms，避免触发 rate limit
    await new Promise(r => setTimeout(r, 500));
  }

  // 3. 生成 meta.json，供预览器加载
  const meta = {
    generatedAt: new Date().toISOString(),
    frameSize: { width: 64, height: 64 },
    animations: ANIMATIONS.map(a => ({
      key: a.key,
      nFrames: a.nFrames,
      fps: 8,
      frames: Array.from({ length: a.nFrames }, (_, i) => `${a.key}/frame-${i}.png`),
    })),
  };

  fs.writeFileSync(path.join(OUT_DIR, 'meta.json'), JSON.stringify(meta, null, 2));
  console.log('\n全部完成。素材目录：', OUT_DIR);
  console.log('meta.json 已写入，启动 bun dev 后预览器会自动加载 AI 生成的动画。');
}

main().catch(err => {
  console.error('生成失败：', err.message);
  process.exit(1);
});
