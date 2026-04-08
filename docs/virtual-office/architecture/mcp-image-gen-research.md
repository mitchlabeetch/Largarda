# MCP 图片生成能力调研

> 文档目的：摸清项目内现有 MCP 图片生成能力，评估能否用于虚拟办公室像素风素材生成。
> 文档作者：老锤
> 最后更新：2026-04-02

---

## 1. 现有内置 MCP：builtin-mcp-image-gen

### 1.1 代码位置

| 文件 | 说明 |
|------|------|
| `src/process/resources/builtinMcp/imageGenServer.ts` | MCP server 入口，注册工具 |
| `src/common/chat/imageGenCore.ts` | 核心执行逻辑，共享给 MCP 和 Gemini tool |
| `src/process/resources/builtinMcp/constants.ts` | 常量：server name `aionui-image-generation` |
| `src/process/utils/initStorage.ts` | 启动时注册到 `mcp.config`，传递 env vars |

### 1.2 工作原理

运行方式：`node builtin-mcp-image-gen.js`（stdio transport），由主进程 spawn。

配置通过环境变量传入：

| 环境变量 | 含义 |
|---------|------|
| `AIONUI_IMG_PLATFORM` | provider platform（如 openai、custom 等） |
| `AIONUI_IMG_BASE_URL` | API base URL |
| `AIONUI_IMG_API_KEY` | API Key |
| `AIONUI_IMG_MODEL` | 模型名（如 `dall-e-3`、`gpt-image-1`、`flux-dev` 等） |
| `AIONUI_IMG_PROXY` | 可选代理 |

### 1.3 对接的模型

**不硬绑定任何模型**，走 OpenAI 兼容协议（`ClientFactory.createRotatingClient`），凡是支持 chat completion + 返回图片 base64 的 API 都能对接。

Settings UI 里筛选图片模型的规则（`ToolsModalContent.tsx:535`）：
```ts
const isImageModel = (modelName: string) => {
  const name = modelName.toLowerCase();
  return name.includes('image') || name.includes('banana') || name.includes('imagine');
};
```

`modelCapabilities.ts` 里 `image_generation` 类型匹配：
```
/flux|diffusion|stabilityai|sd-|dall|cogview|janus|midjourney|mj-|imagen/i
```

**实际支持的模型（只要平台支持 OpenAI 协议）**：
- OpenAI：`dall-e-3`, `gpt-image-1`
- Stability AI：`stable-diffusion-*`（通过兼容层）
- Flux：`flux-dev`, `flux-schnell`（通过 Together / Replicate 等）
- Janus、CogView 等国产图片模型

### 1.4 MCP tool 参数

工具名：`aionui_image_generation`

| 参数 | 类型 | 是否必填 | 说明 |
|------|------|---------|------|
| `prompt` | string | 必填 | 英文描述，格式："Generate image: ..." 或 "Edit image: ..." |
| `image_uris` | string[] | 可选 | 现有图片路径或 URL 数组（用于图片编辑） |
| `workspace_dir` | string | 可选 | 工作目录，决定输出路径 |

**没有 size / style / quality 等参数**。这些要通过 prompt 描述，或者模型本身支持（如 dall-e-3 的 size 是 API 层参数，目前代码里没透传）。

### 1.5 输出

- 生成图片保存到 `workspace_dir`，文件名 `img-{timestamp}.png`
- 返回文本：原 API 响应 + 保存路径

---

## 2. 项目中其他图片/美术相关 MCP

**结论：没有其他图片相关 MCP。**

搜索范围：`src/**/mcp/**`，`src/**/*image*`，`src/**/*pixel*`，`src/**/*art*`

现有 MCP 相关代码只有：
- `src/process/resources/builtinMcp/`（只有 image-gen 这一个 builtin）
- `src/renderer/hooks/mcp/`（UI hooks，不含业务逻辑）
- `src/process/services/mcpServices/`（MCP 协议适配层）

没有 stable diffusion / comfyui / 图片后处理相关的 MCP。

---

## 3. 能否指定像素风风格？

### 3.1 现有 MCP 能力评估

现有 builtin-mcp-image-gen **可以**通过 prompt 指定像素风，例如：
```
Generate image: pixel art style, 16x16 sprite, cozy office scene, warm colors, limited palette, side view, isometric
```

但**有限制**：
- 没有 size 参数透传（生成尺寸取决于模型默认，DALL-E 3 默认 1024×1024）
- 没有 seed / sampler 控制，像素风效果稳定性差
- 像素风最好的方式是先生成普通图再后处理像素化，现有代码没有后处理步骤

### 3.2 像素风生成的最佳实践

有两种路子：

**路子 A：纯 prompt 控制（最简单，效果一般）**
- 用 DALL-E 3 或 Flux，prompt 加 `pixel art, 16-color palette, sprite sheet` 等关键词
- 优点：直接用现有 MCP，零额外代码
- 缺点：效果不稳，每次出图风格不一致

**路子 B：AI 生图 + 后处理像素化（效果好，需额外代码）**
- 步骤：调 AI API 生图 → 拿到 PNG → 用 Canvas/sharp 缩小到 16×16 → 放大回目标尺寸（nearest neighbor 插值）→ 减色处理（量化到 16 色）
- 优点：效果稳定，真正的像素风
- Node.js 实现：用 `sharp` 库，`sharp().resize(w, h, { kernel: 'nearest' }).png()`
- 完全不需要额外 API，只是图片后处理

---

## 4. 像素风 MCP Skill 可行性方案

### 4.1 方案选型建议

推荐 **路子 B 变体**：做一个独立的 MCP skill，内部调用现有 `executeImageGeneration`（已有），再加像素化后处理。

**无需新 API Key**，复用用户已配置的图片生成模型。

### 4.2 技术方案

```
用户 prompt
  ↓
调 executeImageGeneration() （现有代码）
  ↓
拿到 base64 PNG
  ↓
sharp 后处理像素化：
  1. resize 到 32px 宽（保持比例）kernel: nearest
  2. quantize 到 16 色（sharp 内建）
  3. resize 回目标尺寸（sprite: 32×48, scene: 128×80 等）
  ↓
输出像素 PNG
```

### 4.3 参数设计（如果做成 MCP tool）

```ts
{
  prompt: string,           // 描述，英文，加 "pixel art" 关键词效果更好
  target_size: {            // 目标尺寸，默认 sprite: 32×48
    width: number,          // 最终输出宽（px）
    height: number,
  },
  pixel_scale: number,      // 像素块大小，默认 4（即逻辑像素实际 4x4 物理像素）
  palette_size: number,     // 减色色板数量，默认 16
  workspace_dir?: string,
}
```

### 4.4 依赖

- `sharp`：Node.js 图片处理，项目里**已有**（在主进程文件中可引用）
- 检查：`grep -r "sharp" src/` → 如果没有需要 `bun add sharp`

### 4.5 实现位置

参考现有 `imageGenServer.ts` 模式，新建：
```
src/process/resources/builtinMcp/pixelArtServer.ts
```

或者在现有 `imageGenServer.ts` 里加一个新 tool `aionui_pixel_art_generation`，不新建文件。

---

## 5. API Key 需求总结

| 方案 | 需要什么 Key |
|------|------------|
| 复用现有 builtin-mcp-image-gen + prompt 写像素风 | 用户已配置的图片模型 Key（DALL-E 3 用 OpenAI Key，Flux 用对应平台 Key） |
| 新 MCP skill（后处理像素化） | 同上，不需要额外 Key |
| Stable Diffusion WebUI 本地 | 无需 Key，但用户要本地跑 SD |
| Replicate API（专业像素风模型） | 需要 Replicate API Key（付费） |

**推荐给虚拟办公室的方案：复用现有 builtin-mcp-image-gen + sharp 后处理，零新增 Key 要求。**

---

## 6. 结论

| 问题 | 答案 |
|------|------|
| 对接什么模型？ | 任何 OpenAI 兼容协议的图片生成模型（DALL-E 3、Flux、Stable Diffusion 等） |
| 支持什么参数？ | 仅 prompt + image_uris（参考图）+ workspace_dir，无 size/style/quality |
| 能否指定像素风？ | 能，通过 prompt；稳定像素风需额外后处理 |
| 需要什么 Key？ | 用户自己配置的图片模型 Key |
| 有没有其他美术 MCP？ | 没有 |
| 推荐方案？ | 在现有 MCP 基础上加 sharp 后处理像素化，新增 tool `aionui_pixel_art_generation` |
