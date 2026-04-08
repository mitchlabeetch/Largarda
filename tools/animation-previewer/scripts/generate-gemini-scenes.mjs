/**
 * generate-gemini-scenes.mjs
 *
 * 用 Gemini 生成完整场景序列帧（cozy pixel art 风格）。
 * 3个状态 × 4帧 = 12张图，存到 public/assets/scenes/
 *
 * 用法：
 *   GEMINI_API_KEY=xxx node scripts/generate-gemini-scenes.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../public/assets/scenes');

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('错误：请设置 GEMINI_API_KEY 环境变量');
  console.error('用法：GEMINI_API_KEY=your_key node scripts/generate-gemini-scenes.mjs');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// 场景基础描述（固定角色+房间风格）
const SCENE_BASE = [
  'pixel art style illustration, 16-bit retro game art, crisp pixels, no anti-aliasing,',
  'cozy lofi bedroom side view, warm amber lighting from desk lamp,',
  'warm color palette: deep amber, brown, rust, cream,',
  'room layout: bed with colorful quilt on left, tall bookshelf filled with books on right wall,',
  'wooden desk with computer monitor and keyboard on right side,',
  'window showing night sky with stars and crescent moon on upper right,',
  'potted plant near window,',
  'character: young programmer with brown hair, round glasses, orange hoodie sweatshirt, large over-ear headphones,',
  'pixel art game scene, warm cozy night atmosphere,',
  'high quality pixel art, detailed scene',
].join(' ');

const SCENES = [
  {
    key: 'working',
    frames: [
      `${SCENE_BASE} -- scene: character sitting at desk both hands on keyboard actively typing, leaning slightly forward, looking at glowing monitor screen`,
      `${SCENE_BASE} -- scene: character at desk right hand raised pressing a key, left hand resting on keyboard, focused on screen`,
      `${SCENE_BASE} -- scene: character at desk left hand raised pressing a key, right hand on keyboard, concentrated expression`,
      `${SCENE_BASE} -- scene: character sitting at desk both hands on keyboard, head tilted slightly toward monitor, typing`,
    ],
  },
  {
    key: 'idle_sleeping',
    frames: [
      `${SCENE_BASE} -- scene: character slumped forward asleep on desk, head resting on folded arms on desk surface, eyes closed, headphones still on`,
      `${SCENE_BASE} -- scene: character sleeping face-down on crossed arms on desk, back slightly raised inhaling, peaceful sleep`,
      `${SCENE_BASE} -- scene: character sleeping head on arms on desk, back at peak height mid-breath, deep rest`,
      `${SCENE_BASE} -- scene: character sleeping on arms on desk, body fully relaxed exhaling, quiet cozy room`,
    ],
  },
  {
    key: 'noting',
    frames: [
      `${SCENE_BASE} -- scene: character standing beside bookshelf holding open notebook writing with pen, looking at book on shelf`,
      `${SCENE_BASE} -- scene: character standing at bookshelf, pen moving across open notebook page, writing notes earnestly`,
      `${SCENE_BASE} -- scene: character standing at bookshelf, pen raised in thought, gazing at book spine, thinking`,
      `${SCENE_BASE} -- scene: character standing at bookshelf writing in notebook again, warm lamp casting soft light on pages`,
    ],
  },
];

async function generateImage(prompt, outPath) {
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash-exp',
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseModalities: ['Text', 'Image'],
    },
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.mimeType?.startsWith('image/')) {
      const buf = Buffer.from(part.inlineData.data, 'base64');
      fs.writeFileSync(outPath, buf);
      return true;
    }
  }
  return false;
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
    try {
      const ok = await generateImage(scene.frames[i], outPath);
      if (ok) {
        const size = fs.statSync(outPath).size;
        console.log(`  ${scene.key}/frame-${i} 保存完成 (${(size / 1024).toFixed(0)}KB)`);
      } else {
        console.warn(`  ${scene.key}/frame-${i} 警告：API 没返回图片数据`);
      }
    } catch (e) {
      console.error(`  ${scene.key}/frame-${i} 失败:`, e.message);
      throw e;
    }

    if (i < scene.frames.length - 1) await new Promise(r => setTimeout(r, 1000));
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const scene of SCENES) {
    console.log(`\n生成场景: ${scene.key}`);
    await generateScene(scene);
    await new Promise(r => setTimeout(r, 500));
  }

  // 写 meta.json（displaySize 根据实际生成图尺寸来，先写 1024x559）
  const meta = {
    generatedAt: new Date().toISOString(),
    frameSize: { width: 1024, height: 1024 },
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
  console.log('注意：Gemini 生成的图片尺寸不固定，meta.json 中 frameSize 可能需要手动调整。');
  console.log('ScenePlayer 已改为用 CSS 拉伸，尺寸只影响渲染比例。');
}

main().catch(e => { console.error('失败:', e.message); process.exit(1); });
