# 虚拟办公室 — AI 生成像素角色 Prompt 文档

> 体验-阿点 | 2026-04-01
>
> 用途：用户拿这些 prompt 去 AI 图片工具（Midjourney / Leonardo.ai / PixelLab）生成角色图，
> 生成后按本文档的切割说明和命名规范整理到项目目录。
>
> **重要：** 这些是技术占位资产，用于骨骼动画预览器联调。正式资产由美术手绘（Aseprite）替换。

---

## 一、使用工具推荐

| 工具 | 推荐理由 | 像素风效果 |
|------|---------|----------|
| **PixelLab**（pixellab.ai）| 专为像素画设计，直接输出像素风格，无需后处理 | ★★★★★ |
| **Leonardo.ai** | 有像素画模型（Pixel Art v2），效果稳定 | ★★★★ |
| **Midjourney** | 需要加 `--style raw` + pixel art 关键词，需多试 | ★★★ |

**推荐 PixelLab 或 Leonardo.ai**，像素风还原度最高，不需要额外做像素化后处理。

---

## 二、基础风格参数（所有 prompt 通用）

```
Style tags（所有生成请附加）:
pixel art, 32x32 pixel style, cozy lofi aesthetic, warm color palette,
transparent background, side view, clean pixel outlines, no anti-aliasing,
indie game character, warm brown and amber tones, soft lighting
```

**色彩约束（必须体现）：**
- 皮肤：暖米色 `#F5D5A0` 附近
- 头发（前端工程师职位）：暗青蓝 `#3B7A8A`
- 服装：深蓝工装 `#1E3A5F`
- 轮廓线：深暖棕 `#2B1D0F`（不用纯黑）
- 高光：暖米白 `#F5E6D3`

**禁止出现的元素：**
- 霓虹色、冷蓝色、赛博朋克元素
- 抗锯齿（所有边缘必须是硬像素边）
- 阴影渐变（阴影用像素色阶，不用渐变）

---

## 三、Step 1：生成完整角色参考图

> 先生成完整角色，用于确认风格和比例，再做部件切割。

### Prompt A — 完整角色正面（用于比例参考）

```
pixel art character, cozy lofi style, front view, standing idle pose,
office worker, dark blue work jacket, dark teal hair (#3B7A8A), warm skin tone,
32 pixel height character, warm amber color palette, thick pixel outlines,
transparent background, no anti-aliasing, indie RPG style, soft cozy lighting,
full body visible from head to feet, arms slightly away from body for easy cutout,
legs slightly apart for easy cutout
--ar 1:2 --style raw
```

**预期输出：** 约 32×64px 等比（或其倍数），站姿，双臂稍张开便于切割

### Prompt B — 完整角色侧视（主要使用视角）

```
pixel art character, cozy lofi style, side view facing right, standing idle pose,
office worker male, dark blue work jacket with collar, dark teal hair,
warm skin tone, pixel art 32px height, warm color palette (#F5A623 amber accents),
thick pixel outlines, transparent background, no anti-aliasing,
clean side silhouette, arms slightly forward for easy joint cutout,
legs slightly apart, cozy indie game aesthetic, lofi warmth
--ar 1:2 --style raw
```

**预期输出：** 侧面站姿，这是主用图，需要效果最好

---

## 四、Step 2：生成分部件图（共 11 个部件）

> 每个部件单独生成，透明背景，便于 DragonBones 导入。
> 尺寸统一用 **64×64px 画布**（部件本身可能更小，画布留空白方便定位）。

### 部件 1：头部（slot_head）

```
pixel art character head only, side view facing right, dark teal hair (#3B7A8A),
warm skin tone face, simple pixel eyes and mouth, cozy lofi style,
64x64 transparent canvas, head centered, no neck or body,
thick pixel outlines, no anti-aliasing, warm color palette
```

**目标尺寸：** 头部约 16×16px，居中于 64×64 画布

---

### 部件 2：躯干（slot_torso）

```
pixel art character torso only, side view facing right, dark blue work jacket (#1E3A5F),
no head no arms no legs, just the chest and upper body section,
64x64 transparent canvas, torso centered, cozy lofi office worker style,
thick pixel outlines, no anti-aliasing, warm accent details
```

**目标尺寸：** 躯干约 12×14px，居中于 64×64 画布

---

### 部件 3：左上臂（slot_arm_left_upper）

```
pixel art single arm segment, upper arm only, side view, dark blue jacket sleeve,
warm skin tone at elbow end, no hand no forearm, just upper arm section,
64x64 transparent canvas, arm segment centered vertically,
thick pixel outlines, no anti-aliasing, cozy lofi pixel art style
```

**目标尺寸：** 约 6×10px，竖向居中

---

### 部件 4：左前臂（slot_arm_left_lower）

```
pixel art single forearm segment, lower arm only, side view,
dark blue jacket sleeve fading to warm skin tone at wrist,
no hand no upper arm, just forearm section,
64x64 transparent canvas, forearm centered,
thick pixel outlines, no anti-aliasing, cozy pixel art
```

**目标尺寸：** 约 6×10px

---

### 部件 5：左手（slot_hand_left）

```
pixel art hand only, side view, small warm skin tone hand,
simple pixel fingers or closed fist, no arm attached,
64x64 transparent canvas, hand centered,
thick pixel outlines, no anti-aliasing, cozy lofi pixel art
```

**目标尺寸：** 约 6×6px

---

### 部件 6：右上臂（slot_arm_right_upper）

与左上臂 prompt 相同，生成后若需要水平翻转使用：

```
pixel art single arm segment, upper arm only, side view facing right,
dark blue jacket sleeve, warm skin tone at elbow end,
64x64 transparent canvas, arm segment centered,
thick pixel outlines, no anti-aliasing, cozy lofi pixel art style
```

---

### 部件 7：右前臂（slot_arm_right_lower）

与左前臂相同，可复用或单独生成。

---

### 部件 8：右手（slot_hand_right）

与左手相同，可复用或水平翻转。

---

### 部件 9：腰/臀（slot_waist）

```
pixel art character waist and hip section only, side view,
dark blue work pants or jacket lower half, no legs no torso,
just the hip connecting piece, 64x64 transparent canvas, centered,
thick pixel outlines, no anti-aliasing, cozy lofi style
```

**目标尺寸：** 约 12×8px

---

### 部件 10：大腿（左/右，slot_leg_left_upper / slot_leg_right_upper）

```
pixel art single thigh segment, upper leg only, side view,
dark navy work pants, no knee no foot, just upper thigh section,
64x64 transparent canvas, leg segment centered,
thick pixel outlines, no anti-aliasing, cozy pixel art
```

**目标尺寸：** 约 6×10px

---

### 部件 11：小腿（左/右，slot_leg_left_lower / slot_leg_right_lower）

```
pixel art single lower leg segment, calf only, side view,
dark navy pants to warm brown boot/shoe at ankle,
no thigh no foot, just lower leg section,
64x64 transparent canvas, centered,
thick pixel outlines, no anti-aliasing, cozy pixel art
```

**目标尺寸：** 约 6×8px

---

### 部件 12：脚（左/右，slot_foot_left / slot_foot_right）

```
pixel art foot/shoe only, side view facing right,
small warm brown pixel shoe, no leg attached,
64x64 transparent canvas, shoe centered at bottom,
thick pixel outlines, no anti-aliasing, cozy lofi style
```

**目标尺寸：** 约 8×4px

---

## 五、切割标注说明（整图切割方案）

如果 AI 工具不支持单独生成部件，可以先用 **Prompt B（侧视完整角色）** 生成整张图，再按以下方案切割：

```
完整角色图（约 32×64px 原始，建议生成 128×256px 以便切割）：

  ┌────────────────┐ ← y=0
  │    [头部]      │   y=0~16px    → slot_head（16×16px）
  │                │
  ├────────────────┤ ← y=16
  │   [躯干]       │   y=16~30px   → slot_torso（12×14px，水平居中）
  │                │
  ├────────────────┤ ← y=30
  │  [腰/臀]       │   y=30~38px   → slot_waist（12×8px）
  ├────────────────┤ ← y=38
  │  [大腿]        │   y=38~48px   → slot_leg_*_upper（6×10px，左/右分切）
  ├────────────────┤ ← y=48
  │  [小腿]        │   y=48~56px   → slot_leg_*_lower（6×8px）
  ├────────────────┤ ← y=56
  │  [脚]          │   y=56~60px   → slot_foot_*（8×4px）
  └────────────────┘ ← y=60

  手臂（左侧，x=0~6px；右侧，x=26~32px）：
  ├── 上臂：y=16~26px → slot_arm_*_upper（6×10px）
  ├── 前臂：y=26~36px → slot_arm_*_lower（6×10px）
  └── 手：  y=36~42px → slot_hand_*（6×6px）
```

**推荐切割工具：** Aseprite（File → Export Sprite Sheet，手动框选各部件）

---

## 六、文件命名和目录规范

生成后的文件存放到：

```
tools/animation-previewer/public/sprites/employee/
├── slot_head.png
├── slot_face.png          （可暂时不生成，用头部代替）
├── slot_torso.png
├── slot_arm_left_upper.png
├── slot_arm_left_lower.png
├── slot_hand_left.png
├── slot_arm_right_upper.png   （可复用左侧水平翻转）
├── slot_arm_right_lower.png
├── slot_hand_right.png
├── slot_waist.png
├── slot_leg_left_upper.png
├── slot_leg_left_lower.png
├── slot_foot_left.png
├── slot_leg_right_upper.png   （可复用左侧水平翻转）
├── slot_leg_right_lower.png
├── slot_foot_right.png
└── reference_full_body.png    （完整角色参考图，不用于骨骼，仅参考）
```

**命名规则：**
- 与 asset-breakdown.md 的 DragonBones Slot 名完全一致
- 全小写，下划线分隔
- PNG 格式，透明背景
- 不加职位前缀（占位资产，职位换装后期再做）

---

## 七、生成后质检清单

拿到生成图后逐项检查：

- [ ] 透明背景（不是白底）
- [ ] 无抗锯齿（边缘是硬像素，用 Aseprite 放大检查）
- [ ] 暖色调（无霓虹绿/冷蓝等异色）
- [ ] 侧视角度（不是斜45°等距视角）
- [ ] 各部件比例符合 asset-breakdown.md 的建议尺寸
- [ ] 关节端点（手臂末端、大腿末端）有足够像素便于 DragonBones 设置关节点

**不合格时的处理：**
- 抗锯齿：在 Aseprite 用 Indexed Color 模式重新索引，限制调色板，可消除抗锯齿
- 颜色偏冷：在 Aseprite 整体色调偏移，加暖黄/棕色
- 比例不对：裁切或在 Aseprite 手工补像素调整

---

## 八、DragonBones 导入顺序

部件图准备好后，DragonBones 导入步骤：

1. 新建 DragonBones 项目，画布 128×192px（角色渲染 3x 后的目标尺寸）
2. 按 slot 顺序导入各部件图（从躯干开始向外扩展）
3. 设置父子关系：躯干 → 上臂 → 前臂 → 手；躯干 → 腰 → 大腿 → 小腿 → 脚
4. 设置关节点（pivot）在部件连接端
5. 先做 `anim_idle` 动作（呼吸起伏，最简单），验证骨骼结构正确后再做其他动作

---

*体验-阿点 · AI 生成 Prompt 文档 · 2026-04-01*
*供用户使用 PixelLab / Leonardo.ai 生成占位像素资产*
