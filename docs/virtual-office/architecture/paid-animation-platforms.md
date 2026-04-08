# 付费 AI 动画平台调研报告

> 架构-阿构 | 2026-04-01
>
> 需求：找一个平台，输入提示词就能生成像素风角色动画，可以通过 API 集成进产品。
> 用户愿意付费，长期战略（未来团队全由 AI 组成）。

---

## 执行摘要

**直接结论：PixelLab 是目前最符合需求的选项，且几乎是唯一符合所有条件的选项。**

| 平台 | 有 API | 像素风专用 | 输出序列帧/Spritesheet | 骨骼动画 | 推荐度 |
|------|--------|-----------|----------------------|---------|-------|
| **PixelLab** | **是** | **是（专为像素艺术）** | **是（序列帧 PNG）** | **是（骨骼驱动）** | **首推** |
| **FalSprite（fal.ai）** | **是** | **是（spritesheet）** | **是（透明背景 PNG + GIF）** | 否（帧序列）| **次选** |
| Runway Gen-4 | 是 | 否 | 否（MP4 视频）| 否 | 不推荐 |
| Runway Act Two | 是 | 否 | 否（MP4 视频）| 否（需参考视频驱动）| 不推荐 |
| Stability AI | 是 | 否 | 否 | 否 | 不推荐 |
| Mixamo | 否（无公开 API）| 否（3D 专用）| 否 | 否 | 不适用 |
| Plask | 否（无公开 API）| 否（3D 动捕）| 否 | 否 | 不适用 |

---

## 一、PixelLab（首推）

### 1.1 核心能力

PixelLab 是**专为像素艺术游戏资产设计的 AI 生成平台**，官方 API 提供以下端点：

| 功能 | API 端点 | 说明 |
|------|---------|------|
| 文字生成像素图（Pixflux）| `generateImagePixflux` | 文字描述 → 像素角色立绘 |
| 参考图风格生成（Bitforge）| `generateImageBitforge` | 参考图 + 描述 → 同风格角色 |
| **骨骼动画生成** | `animateWithSkeleton` | 角色图 + 动作描述 → 序列帧 |
| **文字驱动动画** | `animateWithText` | 角色图 + 文字动作 → 序列帧 |
| 多方向旋转视图 | `rotate` | 同一角色生成不同朝向 |
| 局部修复 | `inpaint` | 像素图局部编辑 |

**对虚拟办公室的直接价值：**
- 输入：角色描述文字（"lofi 像素风前端工程师，暗青蓝发色，工装"）
- 输出：对应的序列帧 PNG 序列（idle/working/sleeping 等状态）
- **不需要手工绘制 75 帧**，AI 直接生成

### 1.2 SDK 状态

| SDK | 包名 | 状态 | 最后更新 |
|-----|------|------|---------|
| 官方 Python SDK | `pixellab-python`（PyPI）| 官方维护 | 2026-02 |
| 非官方 JS/TS SDK | `pixellab`（npm）| 社区维护，基于官方 Python SDK 移植 | 2026-01 |

**JS/TS SDK 安装：**
```bash
npm install pixellab
# 或
bun add pixellab
```

**基本用法：**
```typescript
import { PixelLabClient } from 'pixellab';

const client = new PixelLabClient(process.env.PIXELLAB_API_KEY);

// 生成角色立绘
const character = await client.generateImagePixflux({
  description: 'lofi pixel art engineer, dark teal hair, working',
  imageSize: { width: 48, height: 96 },
});
await character.image.saveToFile('engineer_base.png');

// 骨骼动画生成（以立绘为基础，生成 idle 序列帧）
const idleAnim = await client.animateWithSkeleton({
  referenceImage: character.image,
  action: 'idle',  // 对应 design-final.md 的状态枚举
});
// idleAnim.frames → PNG 序列帧数组
```

### 1.3 成本

- PixelLab 采用**积分制（credits）**，按量计费
- 官网：`pixellab.ai`（具体定价需注册查看，数量级：$0.01-0.05/图）
- 无月费强制订阅，用多少付多少，符合"按量计费优先"要求

### 1.4 集成方式

**与项目内置 MCP 的关系：** PixelLab 不走 OpenAI 兼容接口，**无法直接接入现有内置 MCP**。需要新增一个 MCP 工具或直接在 main process 中调用 PixelLab SDK。

**推荐集成路径（新建 MCP server）：**
```typescript
// src/process/resources/builtinMcp/pixelArtServer.ts（新建）
server.tool('aionui_pixel_art_generate', '生成像素风角色', {
  description: z.string(),
  width: z.number().default(48),
  height: z.number().default(96),
}, async ({ description, width, height }) => {
  const client = new PixelLabClient(process.env.PIXELLAB_API_KEY);
  const result = await client.generateImagePixflux({ description, imageSize: { width, height } });
  const savedPath = await result.image.saveToFile(...);
  return { content: [{ type: 'text', text: savedPath }] };
});

server.tool('aionui_pixel_art_animate', '生成像素角色动画序列帧', {
  characterImagePath: z.string(),
  action: z.enum(['idle', 'working', 'sleeping', 'chatting', 'happy', 'error']),
}, async ({ characterImagePath, action }) => {
  // 调用 animateWithSkeleton 或 animateWithText
  // 返回序列帧路径列表
});
```

---

## 二、FalSprite（次选，已有开源实现）

### 2.1 核心能力

`lovisdotio/falsprite`（161 stars，2026-02 更新）是一个基于 fal.ai 的开源 spritesheet 生成工具：

- **输入：** 文字描述 + 可选参考图
- **处理流程（全在 fal.ai 上）：**
  1. nano-banana-2 → 生成 spritesheet 图（2×2 到 6×6 网格）
  2. GPT-4o-mini（via fal）→ 智能扩展 prompt（加入角色细节 + 动作编排）
  3. BRIA → 自动去背景
- **输出：** spritesheet PNG（透明背景）+ animated GIF
- **动作支持：** idle / walk / run / attack / cast / jump / dance / death / dodge + 自定义

**API Key：** 只需一个 fal.ai API Key（用户已有）

### 2.2 与项目的集成

FalSprite 是开源的（MIT），可以直接将其核心逻辑（`api/generate.mjs`）移植为项目内置 MCP 工具，复用 fal.ai Key：

```typescript
// 伪代码：从 FalSprite 提取核心调用
const result = await fal.subscribe('fal-ai/nano-banana-2', {
  input: {
    prompt: rewrittenPrompt,  // LLM 扩展后的 prompt
    grid_size: '4x2',         // 4列(帧) × 2行(状态)
  }
});
// 再调 BRIA 去背景
```

**优势：** 无需额外 API Key，现有 fal.ai Key 可直接用
**劣势：** 不如 PixelLab 精确可控，骨骼一致性弱

### 2.3 适用场景

FalSprite 适合快速批量生成"还过得去"的 spritesheet 草稿，用于早期原型验证。PixelLab 适合生产级精细资产。

---

## 三、Runway Gen-4 / Act Two（不推荐用于像素风角色动画）

### 3.1 Runway Gen-4（Image-to-Video）

- SDK：`@runwayml/sdk`（6 天前发版 v3.17.0，Apache-2.0，活跃）
- 接口：`client.imageToVideo.create({ model: 'gen4_turbo', promptImage, promptText })`
- **输出：** MP4 视频（无透明通道）
- **像素风：** 不专为像素艺术设计，像素锯齿感无法保证帧间一致
- **结论：不推荐。** 视频格式无法直接作为游戏动画资产，需要额外帧提取 + 抠图，质量损耗大

### 3.2 Runway Act Two（CharacterPerformance）

- 接口：`client.characterPerformance.create({ character, model: 'act_two', reference })`
- **工作方式：** 需要提供一个人类表演的参考视频（3-30 秒），系统将表演动作迁移到角色上
- **对我们的问题：** 需要预先录制参考视频，且输出为 MP4，不是序列帧
- **结论：不推荐。** 需要真人参考视频，不是"输入提示词就能生成"的方案

---

## 四、其他工具（快速排除）

| 工具 | 排除原因 |
|------|---------|
| **Mixamo** | 3D 骨骼绑定工具，面向 3D 模型（FBX/OBJ），无 2D 像素艺术支持，无公开 API |
| **Plask** | AI 动作捕捉（3D），需要视频输入，无公开 API，无像素风支持 |
| **Stability AI** | 有 API（`stability-ai` npm 包），但无专门的动画/序列帧端点，只做静态图生成 |
| **Piskel** | 浏览器像素编辑器，无 AI 能力，无 API |

---

## 五、推荐集成方案

### MVP 方案：PixelLab + FalSprite 双轨

```
用户配置 PixelLab API Key（Settings > Tools）
  ↓
角色立绘生成（PixelLab Pixflux API）
  → 输入：职位描述文字
  → 输出：48×96px 像素立绘 PNG

动画序列帧生成（PixelLab AnimateWithSkeleton API）
  → 输入：立绘 PNG + 动作名（idle/working/sleeping/chatting/happy/error）
  → 输出：序列帧 PNG × N 帧

Spritesheet 打包（Sharp 脚本，20行）
  → 输入：序列帧 PNG 序列
  → 输出：spritesheet.png + spritesheet.json

tools/animation-previewer 验证
  → 老锤已实现，直接复用
```

### 开发工作量

| 工作项 | 工作量 | 优先级 |
|--------|--------|--------|
| 新建 `pixelArtServer.ts` MCP server（generate + animate 两个工具）| 1 天 | P0 |
| 注册到内置 MCP 列表 | 0.5 天 | P0 |
| Spritesheet 打包脚本（Sharp）| 0.5 天 | P0 |
| Settings UI 增加 PixelLab API Key 配置项 | 0.5 天 | P0 |

**总计：约 2.5 天，可并行**

### 长期战略对齐

用户说"未来团队全是 AI"——PixelLab API 的 `animateWithSkeleton` 端点与这个方向完全对齐：
- AI 员工被创建时，自动调用 PixelLab 生成该员工的像素立绘
- 根据员工职位（前端/产品/架构/设计师）传入对应 prompt
- 自动生成全套动画状态（8种），打包为 spritesheet
- 整个美术生产流程**零人工干预**

---

## 六、待用户确认的问题

1. **是否现在注册 PixelLab 账号并获取 API Key？** 需要验证 animateWithSkeleton 的实际输出格式和质量
2. **FalSprite 作为备选是否可接受？** 可以先用 fal.ai Key 快速验证 spritesheet 生成效果，无需等 PixelLab 注册
3. **PixelLab JS SDK 是非官方移植**（官方只有 Python SDK），如果 JS SDK 有 bug，需要改用官方 Python SDK 写本地脚本调用，或自行包装 REST API

---

*架构-阿构 · 2026-04-01*
