# 像素风美术工作流 — 调研报告

> 架构-阿构 | 2026-04-01
>
> 目标：设计一套 AI 辅助像素风角色动画素材生产工作流，
> 覆盖从文字描述到可用序列帧/骨骼资产的完整链路。

---

## 一、项目内置图片生成能力（现状）

### 1.1 builtin-mcp-image-gen 服务器

项目已内置一个完整的 MCP 图片生成服务器，源码：
- `src/process/resources/builtinMcp/imageGenServer.ts` — MCP server 定义
- `src/common/chat/imageGenCore.ts` — 核心执行逻辑（共用）
- 编译产物：`out/main/builtin-mcp-image-gen.js`

**MCP 工具名：** `aionui_image_generation`

**能力：**
- 文本生成图片（`Generate image: [prompt]`）
- 图片编辑（`Edit image: [modification]`，传入 `image_uris`）
- 支持本地文件路径和 HTTP URL 作为输入图片
- 输出图片保存到 workspace 目录，返回绝对路径

**配置方式：** 通过环境变量传入 provider 配置：
```
AIONUI_IMG_PLATFORM   # 平台标识（openai / gemini / new-api 等）
AIONUI_IMG_BASE_URL   # API 端点
AIONUI_IMG_API_KEY    # API Key
AIONUI_IMG_MODEL      # 模型名称
AIONUI_IMG_PROXY      # 可选代理
```

**平台支持：** 项目 `ClientFactory` 支持 OpenAI 协议兼容接口（`new-api` gateway 模式），意味着**任何 OpenAI 兼容的图片生成 API 都可以接入**，包括：
- OpenAI DALL-E 3（`model: dall-e-3`）
- Stable Diffusion WebUI API（`sd_xl_base_1.0` 等）
- fal.ai（OpenAI 兼容接口）
- 其他 new-api gateway 代理的模型

### 1.2 当前能力局限

- 内置 MCP 只做"生成/编辑图片"，**没有像素化后处理**、**没有 spritesheet 打包**、**没有序列帧裁切**
- 输出为单张图片（PNG/JPG），不是序列帧格式
- 没有 pixel art 专用的 prompt 模板或后处理流水线

---

## 二、MCP 图片生成服务器调研

### 2.1 现有 SD MCP Server（GitHub 调研结果）

| 项目 | Stars | 最后更新 | 说明 |
|------|-------|---------|------|
| `Ichigo3766/image-gen-mcp` | 32 | 2025-07 | 对接 AUTOMATIC1111/ForgeUI WebUI API，Python |
| `joenorton/comfyui-mcp-server` | 267 | 2026-02 | 对接本地 ComfyUI，**最活跃**，Python |
| `mkm29/stablemcp` | 1 | 2025-12 | 简单 SD 包装，维护度低 |
| `nikolausm/huggingface-mcp-server` | 1 | 2025-06 | HuggingFace API 包装 |

**npm 上没有专门的像素风 MCP server**，也没有成熟的 DALL-E/Midjourney MCP server（npm 搜索无结果）。

### 2.2 最值得关注：comfyui-mcp-server

`joenorton/comfyui-mcp-server`（267 stars，2026-02 更新）：
- 轻量 Python MCP server，对接本地 ComfyUI
- ComfyUI 有完整的 pixel art LoRA 工作流支持（见第三节）
- **与项目现有内置 MCP 互补：** 内置 MCP 做云端 API，ComfyUI MCP 做本地高质量生成

### 2.3 结论

不需要引入第三方 MCP server。项目内置 MCP 已支持 OpenAI 兼容接口，只需要：
1. 配置 `AIONUI_IMG_MODEL` 为支持像素风的模型（SD XL + pixel art LoRA，或 fal.ai 上的 pixel art 模型）
2. 在 prompt 中加像素风关键词
3. 后处理（像素化 + 透明背景）由额外脚本处理

---

## 三、像素风 AI 生成工具调研

### 3.1 Stable Diffusion + Pixel Art LoRA（本地部署）

**方案：** AUTOMATIC1111 WebUI 或 ComfyUI + `pixel-art-xl` LoRA

**效果：** 最佳。SD XL + LoRA 可以精确控制像素密度、调色板颜色数量、角色风格。

**本地部署要求：**
- GPU：≥ 8GB VRAM（NVIDIA RTX 3060 以上）
- 存储：≥ 30GB（SD XL 模型 ~7GB + LoRA + ComfyUI）
- 操作系统：macOS（Apple Silicon MPS 支持）/ Windows / Linux

**无 GPU 时的替代：** `fal.ai` 云端 API（支持 SD XL + LoRA，有 pixel art 模型）
- npm 包：`@fal-ai/client`（一周前发版，活跃）
- 费用：按量计费，约 $0.003-0.01/图，低频使用成本极低

**推荐 LoRA：**
- `nerijs/pixel-art-xl`（Hugging Face，免费，专为 SD XL 设计）
- `Pixel Art Style LoRA`（CivitAI，多版本可选）

**像素风 prompt 模板（SD XL）：**
```
pixel art, 16-bit sprite, side view, game character,
[character description],
transparent background, clean outline,
lofi cozy warm color palette, indie game style
Negative: photorealistic, 3d render, blurry, anti-aliasing, smooth
```

### 3.2 PixelLab（专门的像素风 AI 工具）

- 网站：`pixellab.ai`
- 功能：text-to-pixel-art、image-to-pixel-art、动画帧生成
- **GitHub 搜索发现有 `flynnsbit/PixelLab-MCP`（0 stars，2025-10 发布）**，但无实质内容
- **API 状态：** PixelLab 官网提供 API，但需要订阅（价格未公开）
- **优势：** 专为像素艺术设计，输出质量高，支持动画序列帧生成
- **劣势：** API 成本未知，非开源，无法本地部署

**推荐用途：** 作为备用云端工具，在本地 SD 方案不可用时使用。

### 3.3 Aseprite + AI 插件

- Aseprite 本身是专业像素艺术编辑器（$20 买断）
- **AI 生成插件：** 没有成熟的 AI 生成插件（Aseprite 插件生态以自动化脚本为主）
- **实际用途：** 接收 SD 生成的草稿图 → 在 Aseprite 中精修颜色/轮廓 → 导出序列帧

### 3.4 Replicate（云端 SD API）

- npm 包：`replicate`（Apache-2.0，4个月前发版）
- 有大量 pixel art 模型可调用（`zeke/pixel-art-xl`、`konieshadow/pixel-art-sprite-generator` 等）
- 费用：按量计费，pixel art 模型约 $0.005-0.02/图
- **与项目内置 MCP 集成：** Replicate 提供 OpenAI 兼容接口，可直接配置到内置 MCP

---

## 四、完整工作流设计

### 4.1 推荐工作流（fal.ai 云端 + 项目内置 MCP）

适合无本地 GPU 的场景，成本极低，可接入现有内置 MCP。

```
Step 1 — AI 生成草稿
  输入：文字描述（角色职位、外观特征）+ 风格约束
  工具：项目内置 aionui_image_generation MCP
  配置：AIONUI_IMG_PLATFORM=new-api, MODEL=fal-ai/fast-sdxl-pixel-art
  输出：单张静态角色立绘（PNG，约 512×512）
  耗时：10-30 秒/图

Step 2 — 像素化后处理
  输入：Step 1 输出的 PNG
  工具：PixelSnap 脚本（Python + Pillow，见下文）
  处理：降采样到 48×48px → 限制调色板（16色）→ image-rendering: pixelated 渲染
  输出：标准化像素立绘 PNG（透明背景）
  耗时：<1 秒

Step 3 — 序列帧生成（每个动画状态）
  输入：Step 2 的像素立绘 + 动作描述
  方式A（AI）：用 Edit image 模式，以立绘为参考，生成每帧的姿态变化
  方式B（手工）：导入 Aseprite，按 design-final.md §12 的帧规格手工绘制
  方式C（混合）：AI 生成关键帧（第1帧/中间帧），人工插值补帧
  输出：每状态 8-12 帧 PNG（透明背景）

Step 4 — Spritesheet 打包
  工具：TexturePacker 免费版 / 或自写 Node.js 脚本（Sharp 库）
  输出：合并的 spritesheet.png + spritesheet.json（帧坐标定义）
  PixiJS 直接加载：PIXI.Spritesheet.from(json)

Step 5 — 预览验证
  工具：tools/animation-previewer（老锤已实现）
  验证：帧循环是否自然衔接、像素锯齿是否保留
```

### 4.2 高质量工作流（本地 ComfyUI + 像素风 LoRA）

适合有 GPU 或 Apple Silicon Mac 的场景，质量更高，可批量生成。

```
Step 1 — ComfyUI 工作流生成序列帧
  模型：SD XL + pixel-art-xl LoRA
  ComfyUI 节点：
    - LoadCheckpoint (sd_xl_base_1.0)
    - LoraLoader (pixel-art-xl)
    - KSampler (采样参数：steps=20, cfg=7, sampler=dpm++2m)
    - SaveImage (序列命名：idle_001.png ... idle_012.png)
  Seed 锁定：同一角色所有帧使用相同 character seed，确保外观一致

Step 2 — MCP 接入（可选）
  工具：joenorton/comfyui-mcp-server（Python，本地运行）
  效果：Claude Code Agent 可直接调用 ComfyUI API 生成素材

Step 3-5：同方案 4.1 的 Step 3-5
```

### 4.3 PixelSnap 后处理脚本（需要开发提供）

```python
# pixel_snap.py — 将任意图片转换为标准像素风格
# 依赖：pip install Pillow

from PIL import Image

def pixel_snap(
    input_path: str,
    output_path: str,
    target_size: tuple = (48, 48),   # 目标像素尺寸
    palette_colors: int = 16,         # 调色板颜色数
    scale_up: int = 3,               # 最终放大倍数（48 → 144px 显示用）
):
    img = Image.open(input_path).convert("RGBA")

    # 1. 降采样（Nearest，保留锯齿感）
    small = img.resize(target_size, Image.NEAREST)

    # 2. 限制调色板
    small_rgb = small.convert("RGB")
    quantized = small_rgb.quantize(colors=palette_colors, method=Image.Quantize.MEDIANCUT)
    small_palettized = quantized.convert("RGBA")

    # 3. 恢复透明通道
    alpha = small.split()[3]
    small_palettized.putalpha(alpha)

    # 4. 放大（Nearest，不模糊）
    display_size = (target_size[0] * scale_up, target_size[1] * scale_up)
    output = small_palettized.resize(display_size, Image.NEAREST)

    output.save(output_path, "PNG")
    print(f"Saved: {output_path} ({display_size[0]}x{display_size[1]})")

# 用法示例
pixel_snap("ai_generated_character.png", "employee_idle_01.png")
```

---

## 五、与内置 MCP 的对接方式

### 5.1 接入 fal.ai（推荐，零额外开发）

fal.ai 提供 OpenAI 兼容接口，直接配置内置 MCP：

```
AIONUI_IMG_PLATFORM = new-api
AIONUI_IMG_BASE_URL = https://fal.run/v1
AIONUI_IMG_API_KEY  = [用户的 fal.ai API Key]
AIONUI_IMG_MODEL    = fal-ai/fast-sdxl
```

在 Settings > Tools > Image Generation 填入上述配置，无需代码改动。

**Pixel Art 专用模型（fal.ai 上可用）：**
- `fal-ai/pixelwave`（专为像素风设计）
- `fal-ai/fast-sdxl`（SD XL，配合 pixel art prompt 模板）

### 5.2 接入 Replicate（备选）

Replicate 同样提供 OpenAI 兼容接口：

```
AIONUI_IMG_PLATFORM = new-api
AIONUI_IMG_BASE_URL = https://api.replicate.com/v1
AIONUI_IMG_API_KEY  = [用户的 Replicate API Token]
AIONUI_IMG_MODEL    = stability-ai/sdxl
```

### 5.3 后处理 MCP 扩展（P1，需要开发）

当前内置 MCP 只生成图片，没有像素化后处理。P1 阶段可以扩展一个 `aionui_pixel_snap` MCP 工具：

```typescript
// 伪代码：扩展到 imageGenServer.ts 或单独 MCP server
server.tool('aionui_pixel_snap', '将图片像素化处理', {
  input_path: z.string(),
  target_size: z.number().default(48),
  palette_colors: z.number().default(16),
}, async ({ input_path, target_size, palette_colors }) => {
  // 调用 pixel_snap.py 或 Node.js sharp 实现
  // sharp 版本：sharp(input).resize(48, 48, { kernel: 'nearest' }).toFile(output)
});
```

---

## 六、各方案成本对比

| 方案 | 工具成本 | 每图成本 | 质量 | 速度 | 推荐场景 |
|------|---------|---------|------|------|---------|
| fal.ai + 内置 MCP | $0（接入成本）| $0.003-0.01 | 高 | 10-30s | **推荐 MVP** |
| Replicate + 内置 MCP | $0 | $0.005-0.02 | 高 | 10-30s | MVP 备选 |
| 本地 ComfyUI（有 GPU）| $0（运行时）| $0 | 最高 | 5-15s | 有 GPU 时首选 |
| PixelLab API | 订阅（价格未知）| 未知 | 最高（专门优化）| 快 | 待评估 |
| 纯手工（Aseprite）| $20 | $0 | 最高（完全可控）| 慢（2-3天/职位）| 最终资产精修 |

---

## 七、结论与建议

### MVP 推荐工作流

```
用户填入 fal.ai API Key（Settings > Tools > Image Generation）
  ↓
内置 MCP aionui_image_generation 生成角色立绘草稿
  ↓
pixel_snap.py 后处理（降采样 + 调色板限制）
  ↓
Aseprite（免费 LibreSprite）精修细节 + 绘制序列帧
  ↓
tools/animation-previewer 验证
```

**开发侧需要做的额外工作：**
1. 提供 `pixel_snap.py` 脚本（约 30 行，Pillow 实现）
2. 提供 spritesheet 打包脚本（Sharp，约 50 行）
3. P1：扩展内置 MCP，增加 `aionui_pixel_snap` 工具

**不需要引入第三方 MCP server**——项目内置能力已足够，只需配置正确的 API Key 和模型。

---

*架构-阿构 · 2026-04-01*
