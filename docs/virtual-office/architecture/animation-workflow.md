# 动画美术完整工作流

> 技术实现（1-6章）：开发-老锤
> 设计规范/精修/审核（7-9章）：体验-阿点
> 日期：2026-04-02

---

## 1. API Key 管理

### 1.1 用户把 Key 放在哪

**Settings UI 配置，不用 .env 文件，不用手动改代码。**

用户在 AionUi 的 Settings → Models → 图片生成 里填入：

| 字段 | 含义 | 示例 |
|------|------|------|
| API Key | 图片生成服务的 Key | `sk-xxx`（OpenAI）或 `fal_xxx`（fal.ai） |
| Base URL | API 地址（国内 proxy 可改） | `https://api.openai.com/v1` |
| Model | 图片模型名 | `dall-e-3` 或 `flux-dev` |

这些配置存在 AionUi 本地 SQLite，主进程启动时通过环境变量注入给 `builtin-mcp-image-gen`：

```
AIONUI_IMG_API_KEY=sk-xxx
AIONUI_IMG_BASE_URL=https://api.openai.com/v1
AIONUI_IMG_MODEL=dall-e-3
AIONUI_IMG_PLATFORM=openai
```

**团队代码不直接读 Key**，统一走 `executeImageGeneration()` 函数（`src/common/chat/imageGenCore.ts`），它内部读环境变量，封装了重试/代理/多 Key 轮转。

### 1.2 没有 Key 时的降级

预览器的内置演示（`generateBuiltinSheet.ts`）是纯 Canvas 2D 程序生成，**无需任何 API Key**。用户没配 Key 时预览器仍然正常运行，只有"点击生成"按钮时才需要 Key。

---

## 2. API 调用实现

### 2.1 调用入口

**不新建 HTTP 服务，走 IPC → MCP 链路（复用现有基础设施）。**

现有路径：
```
renderer（React）
  → ipcBridge.conversation.send(...)
  → main process → builtin-mcp-image-gen
  → executeImageGeneration()（imageGenCore.ts）
  → 图片 API（OpenAI / fal.ai / Flux）
  → 返回 base64 PNG
  → 保存到本地文件
```

### 2.2 Sprite Sheet 生成脚本

**场景：用户运行一个命令生成全套素材。**

脚本位置：`tools/animation-previewer/scripts/generate-assets.mjs`

```javascript
// generate-assets.mjs — 运行方式：node generate-assets.mjs
// 依赖：AIONUI_IMG_API_KEY 等环境变量（从 .env.local 或 shell 读取）

import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const client = new OpenAI({
  apiKey: process.env.AIONUI_IMG_API_KEY,
  baseURL: process.env.AIONUI_IMG_BASE_URL ?? 'https://api.openai.com/v1',
});

const SPRITE_SHEET_PROMPT = `pixel art character parts sprite sheet, pure #00FF00 green screen background,
isolated body parts arranged with large gaps: head (side view), torso (side view),
left upper arm, left forearm with hand, right upper arm, right forearm with hand,
left thigh, left shin with shoe. Each part in separate area.
32x32 pixel art style, flat shading, warm colors, programmer character, clean outlines, no shadows between parts`;

async function generateSpriteSheet() {
  console.log('正在生成 sprite sheet...');
  const response = await client.images.generate({
    model: process.env.AIONUI_IMG_MODEL ?? 'dall-e-3',
    prompt: SPRITE_SHEET_PROMPT,
    n: 1,
    size: '1024x1024',
    response_format: 'b64_json',
  });

  const b64 = response.data[0].b64_json;
  const buf = Buffer.from(b64, 'base64');

  // 后处理：像素化（AI 生成图通常不是真正的像素风，需要后处理）
  const pixelated = await sharp(buf)
    .resize(64, 64, { kernel: 'nearest' })   // 缩到 64px（8部件×8px）
    .resize(512, 512, { kernel: 'nearest' })  // 放大回 512px，保持像素感
    .png()
    .toBuffer();

  return pixelated;
}

async function main() {
  const outDir = path.resolve('public/assets/generated');
  fs.mkdirSync(outDir, { recursive: true });

  const sheet = await generateSpriteSheet();
  const outPath = path.join(outDir, 'sprite-sheet.png');
  fs.writeFileSync(outPath, sheet);
  console.log(`已保存：${outPath}`);
  console.log('运行 bun dev 后在预览器"部件切割"tab 里点"上传"可加载这张图。');
}

main().catch(console.error);
```

**注意**：sharp 在主进程已有依赖，但预览器工具目录是独立 Node.js 脚本，需单独安装：

```bash
cd tools/animation-previewer
bun add -d sharp openai
```

### 2.3 一键运行命令

在 `tools/animation-previewer/package.json` 里加 script：

```json
{
  "scripts": {
    "generate-assets": "node scripts/generate-assets.mjs",
    "dev": "vite"
  }
}
```

用户操作流程：
```bash
# 1. 配置 Key（只做一次）
export AIONUI_IMG_API_KEY=sk-xxx
export AIONUI_IMG_BASE_URL=https://api.openai.com/v1  # 可选，改代理地址

# 2. 生成素材
cd tools/animation-previewer
bun run generate-assets

# 3. 启动预览器
bun dev
# 浏览器打开后在"部件切割"tab 上传生成的 sprite-sheet.png
```

---

## 3. 产物存储

### 3.1 目录结构

```
tools/animation-previewer/
├── public/
│   ├── assets/
│   │   └── generated/           ← AI 生成产物（gitignore）
│   │       ├── sprite-sheet.png        原始 AI 生成（绿幕背景）
│   │       ├── sprite-sheet-pixelated.png  像素化后
│   │       └── parts/
│   │           ├── 头部.png
│   │           ├── 躯干.png
│   │           ├── 左上臂.png
│   │           └── ...（8个部件）
│   └── room/                    ← 手工/内置资产（纳入 git）
│       └── room-full.png
└── src/
```

`.gitignore` 加入：
```
public/assets/generated/
```

理由：AI 生成产物体积大、随机性强、不应纳入代码版本控制；内置演示（programmatic Canvas）是代码生成的，不需要存图片文件。

### 3.2 命名规范

| 文件 | 说明 |
|------|------|
| `sprite-sheet.png` | AI 生成的原始 sprite sheet（绿幕背景） |
| `sprite-sheet-pixelated.png` | sharp 后处理的像素化版本 |
| `parts/{label}.png` | 单个部件，label 与 PART_LABELS 一致（中文，如"头部.png"） |
| `room-full.png` | 房间背景参考图（手工资产） |

---

## 4. 导入预览器

### 4.1 当前方式（手动）

生成完的 sprite sheet 放到 `public/assets/generated/sprite-sheet.png` 后，用户在预览器"部件切割"tab 里点"上传自定义 Sheet"选取即可。

### 4.2 自动加载（计划，不阻塞 MVP）

预览器检测 `public/assets/generated/sprite-sheet.png` 是否存在，如果存在则优先加载 AI 生成图，不存在则降级到内置演示（程序生成）。

实现位置：`SpriteSheetLab.tsx` 的 `useEffect` 自动加载块：

```typescript
useEffect(() => {
  if (autoLoaded.current) return;
  autoLoaded.current = true;
  const run = () => {
    if (!sheetCanvasRef.current) { setTimeout(run, 100); return; }

    // 优先尝试加载 AI 生成图
    const aiSheetUrl = '/assets/generated/sprite-sheet.png';
    const img = new Image();
    img.addEventListener('load', () => {
      loadImage(img);
      setTimeout(() => { handleChromaKey(); setTimeout(handleSlice, 50); }, 100);
    });
    img.addEventListener('error', () => {
      // 降级：程序生成内置演示
      const builtinSheet = generateBuiltinSheet();
      loadCanvas(builtinSheet);
      setTimeout(() => { handleChromaKey(); setTimeout(handleSlice, 50); }, 100);
    });
    img.src = aiSheetUrl;
  };
  run();
}, []);
```

**目前实现了降级（内置演示），AI 图自动加载是下一步。**

---

## 5. 集成到正式应用

### 5.1 素材加载方式

正式应用（虚拟办公室场景）加载骨骼动画素材走 PixiJS Texture 系统：

**序列帧方案（MVP，无 Rive）：**

```typescript
// 每个部件是独立 PNG，通过 PIXI.Texture.fromURL 加载
const textures: Record<string, PIXI.Texture> = {};
const PARTS = ['头部', '躯干', '左上臂', '左前臂', '右上臂', '右前臂', '左腿', '右腿'];

async function loadCharacterAssets(basePath: string) {
  await Promise.all(
    PARTS.map(async (part) => {
      textures[part] = await PIXI.Texture.fromURL(`${basePath}/${part}.png`);
      // 像素风必须用 NEAREST，否则模糊
      textures[part].baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
    })
  );
}
```

资产路径规划（正式应用）：

```
src/renderer/assets/virtual-office/characters/
└── employee/
    ├── 头部.png
    ├── 躯干.png
    └── ...（8个部件）
```

**Rive 方案（待产品裁决）：**

如果用 Rive，加载方式走 `@rive-app/canvas` 或 `@rive-app/webgl`：

```typescript
import { Rive } from '@rive-app/canvas';

const r = new Rive({
  src: '/assets/employee.riv',
  canvas: canvasElement,
  autoplay: true,
  onLoad: () => r.play('idle'),
});

// 切换动画状态
r.play('working');  // idle / working / sleeping
```

Rive 文件统一放 `public/rive/`，不放 `src/`（不走 Vite 构建，直接 fetch）。

### 5.2 PixiJS 场景里加载并播放

骨骼系统（`employee.ts` / `character.ts` 模式）的现有实现可直接迁移到正式场景：

1. `Character` / `Employee` class 封装各部件 Sprite + 动画逻辑
2. 主场景只创建**一个** `PIXI.Application`（见 `frontend-tech-notes.md` §2.5 坑2）
3. 每个员工实例化一个 `Employee`，`add` 到同一 `stage`
4. 动画状态切换：`employee.setState('working')`
5. ticker 统一驱动：`app.ticker.add(delta => employees.forEach(e => e.tick(delta / 60)))`

### 5.3 从预览器产物到正式应用的对接步骤

```
① tools/animation-previewer 里：
   运行 generate-assets → 得到 parts/*.png

② 人工精修（阿点负责）：
   在像素编辑器（Aseprite / Pixelorama）微调色调/比例

③ 拷贝到正式应用：
   cp tools/animation-previewer/public/assets/generated/parts/*.png
      src/renderer/assets/virtual-office/characters/employee/

④ 更新 Character 类的纹理路径常量，运行 bun run dev 验证

⑤ 正式场景里 new Employee() 就能看到精修后的像素角色
```

---

## 6. 完整命令速查

```bash
# 生成素材（需要 Key）
export AIONUI_IMG_API_KEY=sk-xxx
cd tools/animation-previewer && bun run generate-assets

# 无 Key 时看内置演示
cd tools/animation-previewer && bun dev
# 打开浏览器 → "部件切割" tab，内置演示自动加载

# 像素化后处理（独立运行）
node scripts/pixelate.mjs input.png output.png --size 64 --palette 16
```

---

*开发-老锤 · 2026-04-02*
*技术侧完成，等阿点补充设计/审核部分后合并。*

---

## 7. 设计规范（体验-阿点）

### 7.1 每个部件的目标尺寸

> 基准：所有部件在 **1x 尺寸**下绘制，PixiJS 和预览器均以 **3x 渲染**（`scale: 3` 或 `PIXI.SCALE_MODES.NEAREST`）。
> AI 生成时用 64×64px 画布（部件本身居中），裁切后按下表规格存储。

| 部件（PART_LABELS）| 对应 Slot | 1x 目标尺寸 | 3x 渲染尺寸 | 关键说明 |
|-------------------|----------|-----------|-----------|---------|
| 头部 | `slot_head` | 16×16px | 48×48px | 含发型；脸/眼需单独可辨 |
| 躯干 | `slot_torso` | 12×14px | 36×42px | 职位换装主要替换衣服色 |
| 左上臂 | `slot_arm_left_upper` | 6×10px | 18×30px | 竖向，肩端宽/肘端窄 |
| 左前臂 | `slot_arm_left_lower` | 6×10px | 18×30px | 袖管渐变到皮肤色 |
| 右上臂 | `slot_arm_right_upper` | 6×10px | 18×30px | 可水平翻转左臂 |
| 右前臂 | `slot_arm_right_lower` | 6×10px | 18×30px | 同左前臂翻转 |
| 左腿 | `slot_leg_left_upper` + `slot_leg_left_lower` | 6×18px（上下合并）| 18×54px | AI 生成时上下腿可合并切割 |
| 右腿 | `slot_leg_right_upper` + `slot_leg_right_lower` | 6×18px | 18×54px | 同左腿翻转 |

**Sprite Sheet 排列要求（给 AI 生成用）：**
- 8个部件横向或网格排列，每个部件之间留 **≥ 8px 间距**（便于连通区域检测分割）
- 背景必须是纯 `#00FF00`（chromaThreshold=60，其他绿色可能混入）
- 整张 Sheet 尺寸建议 **512×512px 或 1024×1024px**（AI 工具标准尺寸）

### 7.2 色板规范

**必须体现的颜色（所有 Prompt 强制约束）：**

| 色彩角色 | 十六进制 | 对应元素 |
|---------|---------|---------|
| 皮肤底色 | `#F5D5A0` | 脸/手/颈部 |
| 皮肤阴影 | `#D4A873` | 皮肤暗部（用色阶，不用渐变）|
| 皮肤高光 | `#FAE8C8` | 皮肤亮部 |
| 前端发色 | `#3B7A8A` | 前端工程师职位发色（暗青蓝）|
| 工装蓝 | `#1E3A5F` | 上衣/夹克主色 |
| 工装深色 | `#162D4A` | 上衣阴影 |
| 工装亮色 | `#254D7A` | 上衣高光/折痕 |
| 轮廓线 | `#2B1D0F` | 所有部件的像素轮廓（暖深棕，不用纯黑）|
| 高光白 | `#F5E6D3` | 最亮高光点（暖白，不用纯白）|

**禁止出现的颜色：**
- 纯黑 `#000000`（用轮廓暖棕 `#2B1D0F` 替代）
- 纯白 `#FFFFFF`（用暖白 `#F5E6D3` 替代）
- 霓虹绿 `#00FF00` 及附近（绿幕色，会被 chromaKey 抠掉）
- 冷蓝系（`#0000FF` 附近）——与 lofi 暖色调不符
- 灰色系（`#808080` 附近）——缺乏 lofi 温度感

**调色板总数约束：** 每个部件不超过 **8 种颜色**（含轮廓线和透明）。超出则用 Aseprite Indexed Mode 强制降色。

### 7.3 参考图要求

**主参考：** `docs/virtual-office/wireframes/reference-employee-room.png`

从参考图提取的约束：
- 视角：**横版侧视**（90° 侧面），非等距，非正面
- 角色体量：头身比约 **1:2.5**（cozy 风格偏大头），与参考图角色一致
- 坐姿：角色坐于桌前，腿部被椅子部分遮挡，上半身可见
- 光源：右侧台灯暖黄 `#F5A623` 为主光，左侧电脑冷蓝为辅光（体现在角色左侧微冷高光）
- 风格：lofi cozy 温暖，不是赛博朋克，不是写实

**如果 AI 生成结果偏离参考图：**
1. 色调偏冷蓝 → Prompt 加 `"warm amber lofi color palette, NO cold blue"`, 老锤重新生成
2. 比例不对（脖子太长/腿太短）→ 阿点标注具体像素位置，更新 Prompt 约束
3. 视角偏等距 → Prompt 加 `"strict 90 degree side profile, flat side view, NOT isometric"`
4. 有抗锯齿 → sharp 后处理 `resize(64)→resize(512)` 通常能消除（老锤已实现）

---

## 8. 精修流程（体验-阿点）

### 8.1 精修工具

**首选：Aseprite**（$20 买断，或编译开源版免费）
- 原生支持像素画（默认无抗锯齿）
- Indexed Color 模式：强制限定调色板（消除 AI 生成的杂色）
- 帧动画支持（后期做序列帧精修）
- Export Sprite Sheet 直接输出整张 Sheet

**备选：Pixelorama**（免费开源，Godot 引擎开发）
- 功能比 Aseprite 少，但完全免费
- 同样支持像素画和透明背景

**不用 Photoshop/GIMP：** 这两个工具默认启用抗锯齿，操作不当会污染像素图边缘。

### 8.2 精修步骤（每个部件）

```
Step 1：降色（Aseprite → Image → Color Mode → Indexed）
  → 色彩数选 8
  → Dithering: None（无抖动，保持硬边）
  → 对比色板，如有偏差手动替换为规范色值

Step 2：检查轮廓（放大 8x 查看）
  → 轮廓线必须是 #2B1D0F（暖深棕）
  → 发现纯黑像素 → 替换为 #2B1D0F
  → 发现渐变边缘 → 用铅笔工具画回硬边

Step 3：检查比例（对照 Section 7.1 目标尺寸）
  → 把画布 Crop 到目标尺寸（如头部 → 16×16px）
  → 如部件内容超出，需重新生成或手工缩减

Step 4：检查关节端点（骨骼绑定关键）
  → 手臂两端（肩端/肘端/腕端）各要有 ≥ 2px 纯色区域，便于 Rive 定关节点
  → 腿部两端同理

Step 5：导出
  → File → Export → PNG
  → 勾选 Transparent Background
  → 不要 Alpha Bleeding
```

### 8.3 精修时间预估

| 部件类型 | 精修时间 |
|---------|---------|
| 头部（最复杂）| 20-30 分钟 |
| 躯干 | 15 分钟 |
| 手臂 × 4 | 各 10 分钟 |
| 腿部 × 2 | 各 10 分钟 |
| **合计（首次）** | **约 1.5-2 小时** |

首次精修后，职位换装皮肤只需改发色和衣服色，每个职位约 30 分钟。

### 8.4 精修后交付物

精修完的文件命名和位置：

```
tools/animation-previewer/public/assets/refined/    ← 精修产物（gitignore）
├── 头部.png          # 精修后 16×16px，8色，PNG 透明
├── 躯干.png
├── 左上臂.png
├── 左前臂.png
├── 右上臂.png
├── 右前臂.png
├── 左腿.png
└── 右腿.png
```

精修完后由老锤拷贝到正式应用路径（对应 Section 5.2 步骤 ③）。

---

## 9. 审核标准（体验-阿点）

### 9.1 视觉通过标准（逐项检查，全部通过才算合格）

**像素风格检查（必须全部通过）：**

| 检查项 | 方法 | 通过标准 |
|-------|------|---------|
| 无抗锯齿 | Aseprite 放大 8x 看边缘 | 所有边缘是 1px 硬切，无灰色过渡像素 |
| 轮廓色 | 用颜色选择工具点轮廓线 | 轮廓线是 `#2B1D0F`，不是 `#000000` |
| 调色板 ≤8色 | Image → Palette 查看 | 每个部件的颜色数不超过 8 种 |
| 透明背景 | 预览器部件卡片棋盘格可见 | 棋盘格可见，无白底/杂色背景 |
| 侧视角度 | 目视检查 | 90° 侧面，看不到正面 |

**比例检查（对照参考图）：**

| 检查项 | 方法 | 通过标准 |
|-------|------|---------|
| 头身比 | 把所有部件拼回完整角色 | 头：全身 ≈ 1:2.5（误差 ±2px）|
| 手臂长度 | 目视 | 上臂和前臂等长（±1px），自然下垂到腰部 |
| 腿部比例 | 目视 | 大腿和小腿等长（±1px）|

**色调检查（对标参考图）：**

| 检查项 | 通过标准 | 常见失败原因 |
|-------|---------|------------|
| 整体暖色调 | 主色接近 `#F5D5A0` / `#1E3A5F` / `#3B7A8A` | AI 偏冷，皮肤变灰蓝 |
| 无霓虹色 | 无饱和度 > 90% 的亮色 | AI 幻觉，随机出现霓虹绿/紫 |
| 轮廓暖棕 | 轮廓线是 `#2B1D0F`，非 `#000000` | AI 常生成纯黑轮廓 |

### 9.2 动画质量标准（有动画后适用）

| 状态 | 检查项 | 通过标准 |
|------|-------|---------|
| `anim_idle` | 呼吸幅度 | 躯干 Y 轴位移 2-3px（肉眼可见但不夸张）|
| `anim_idle` | 节奏 | 3-4 秒一个完整呼吸周期 |
| `anim_work` | 打字感 | 手臂有节律性快速运动，不是静止 |
| `anim_work` | 身体前倾 | 躯干有 2-5° 前倾（专注感）|
| `anim_sleep` | 呼吸比 idle 慢 | 呼吸周期 5-6 秒，幅度 4-5px（更大）|
| 所有状态 | 关节无穿帮 | 0.5x 慢放，任何关节旋转时无缝隙/重叠异常 |
| 所有状态 | 无帧间跳变 | 相邻帧的骨骼位移不超过 4px |

### 9.3 审核流程

```
生成/精修完成
    │
    ▼
阿点打开 localhost:5188 → "部件切割" tab
    │
    ├── 逐项走 9.1 检查表
    │
    ├── 全部通过 → 告知老锤：【审核通过，可进正式资产】
    │
    └── 有问题 → 记录到 art-review-log.md：
          格式：[日期][部件名][问题描述][处理方向]
          示例：[2026-04-02][头部][轮廓线有纯黑像素][精修替换为 #2B1D0F]
          → 属于 Prompt 问题 → 阿点更新 ai-art-prompts.md → 老锤重新生成
          → 属于精修问题 → 阿点自行在 Aseprite 修正 → 重新导出
          → 属于尺寸/比例问题 → 两人讨论后决定方案
```

### 9.4 "能用 vs 完美"的判断原则

MVP 阶段不追求完美，以下情况可以**带问题进入骨骼绑定阶段**，留后续迭代：
- 单个部件颜色稍偏（色差 < ΔE 10）但整体暖色调通过
- 腿部比例轻微不对称（差 1-2px）但不影响动画
- 头发细节像素排列不够精确，但头型轮廓正确

**以下问题必须修完才能进入骨骼绑定：**
- 任何部件有抗锯齿（骨骼旋转后会更明显）
- 颜色中包含绿幕色 `#00FF00` 附近（会被 chromaKey 意外抠掉）
- 关节端点区域不清晰（骨骼绑定时找不到 pivot 点）
- 背景不透明（会影响所有后续渲染）

---

*体验-阿点（设计侧补充）· 2026-04-02*
*对接章节：技术实现见 1-6 章（老锤）；设计规范/精修/审核见 7-9 章（阿点）*
