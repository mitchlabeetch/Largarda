# 全应用像素风 UI 系统方案

> 体验-阿点 | 2026-04-01
>
> 范围：整个 AionUi 应用，不只是虚拟办公室模块
> 目标：在现有 Arco Design + UnoCSS 基础上叠加像素风视觉层，不重写组件

---

## 一、结论先行

| 问题 | 结论 |
|------|------|
| 有没有现成的像素风 React 组件库？ | 无可直接用的 —— 现有库要么样式过时（NES.css），要么和 Arco 冲突。**推荐路线：保留 Arco 逻辑层，用全局 CSS 覆盖视觉层** |
| CSS 像素风框架能否集成？ | NES.css 可局部引入做点缀，但不能全局注入（会覆盖 Arco 变量）。只建议用于装饰性元素 |
| 像素风字体？ | **Silkscreen**（标题/Logo）+ **系统字体**（正文），不用 Press Start 2P（可读性差） |
| 和 Arco 的过渡方案？ | **全局覆盖 CSS 变量 + 局部像素风组件替换**，渐进推进，不一次重写 |

---

## 二、现有系统盘点

### 当前色彩体系

应用现有两套色板：
- **全局主题**：`src/renderer/styles/themes/default-color-scheme.css`，AOU 紫色系（`--aou-*`，`--bg-*`，`--text-*`），light/dark 两套
- **虚拟办公室**：`design-final.md` 定义的 `--vo-*` 变量，暖棕/赛博点缀，仅在 VO 模块使用

**现有问题：**
- 主题是标准 SaaS 紫色系，`--bg-base: #ffffff`，`--primary: #165dff`，完全不像素风
- Arco 组件默认样式（border-radius: 4px、box-shadow: 柔和阴影）和像素风硬边框直接冲突

### 像素风的核心视觉特征

```
1. 边框：1px 或 2px 实线硬边框，无圆角（border-radius: 0）
2. 阴影：blocky drop shadow（x+2, y+2, 无模糊），不用 box-shadow blur
3. 字体：像素字体用于标题；正文用清晰无衬线字体（系统字体可接受）
4. 颜色：有限色板，色块之间无渐变（不用 linear-gradient）
5. 光标：url() 自定义像素光标（可选，高投入）
6. 动画：步进动画（steps()），不用 ease/cubic-bezier 曲线过渡
```

---

## 三、像素风字体方案

### 推荐方案：Silkscreen（主标题）+ 系统字体（正文）

**Silkscreen**
- 用途：Logo、页面标题（h1/h2）、状态标签、强调数字
- 来源：Google Fonts（免费）
- 引入：`@import url('https://fonts.googleapis.com/css2?family=Silkscreen:wght@400;700&display=swap')`
- 字号限制：最小 12px，小于此尺寸像素点崩散，不可用

**不推荐 Press Start 2P 的原因：**
- 大写锁定，全小写难以阅读
- 最小可用字号 10px，正文级别几乎不可读
- 等宽性强，不适合中英混排（中文字符宽度不匹配）

**正文字体：保持系统字体**
```css
--pixel-font-display: 'Silkscreen', monospace;  /* 标题、Logo、标签 */
--pixel-font-body: system-ui, -apple-system, sans-serif;  /* 正文、输入框、说明 */
```

**中文处理：**
- 中文不套用像素字体（无合适的免费中文像素字体）
- 中文用系统字体，小字号用 `font-weight: 700` 保持清晰度
- 像素感通过边框/背景色块传达，不依赖中文字形本身

---

## 四、色板扩展方案

### 在现有 CSS 变量体系上增加像素风主题层

不修改现有 `--bg-*` 和 `--aou-*` 变量（保持 Arco 正常工作）。

在 `default-color-scheme.css` 新增 `--pixel-*` 变量前缀，专供像素风覆盖使用：

```css
/* 像素风全局色板 — 追加到 default-color-scheme.css */
:root,
[data-color-scheme='default'] {
  /* 像素风主色调（暗背景，整个应用统一） */
  --pixel-bg-0: #0d0f1a;       /* 最深背景，几乎黑色蓝 */
  --pixel-bg-1: #141726;       /* 主背景（替换 --bg-base 用于像素风页面） */
  --pixel-bg-2: #1e2236;       /* 卡片/面板背景 */
  --pixel-bg-3: #282e44;       /* 悬浮层/输入框背景 */
  --pixel-bg-4: #333a52;       /* hover 背景 */

  /* 像素风文字 */
  --pixel-text-primary: #e8eaf0;   /* 主要文字，冷白 */
  --pixel-text-secondary: #8892b0; /* 次要文字 */
  --pixel-text-dim: #4a5272;       /* 弱化文字 */
  --pixel-text-accent: #7eb8ff;    /* 强调，冷蓝 */

  /* 像素风边框（关键：硬边框无圆角） */
  --pixel-border: #3a4060;         /* 默认边框 */
  --pixel-border-active: #7eb8ff;  /* 激活/聚焦边框 */
  --pixel-border-bright: #aac8ff;  /* 高亮边框 */

  /* 像素风强调色（和 VO 模块暖色系保持区分） */
  --pixel-accent-blue: #4d9fff;    /* 主要 CTA，蓝色 */
  --pixel-accent-cyan: #3de8c8;    /* 成功/完成，青绿 */
  --pixel-accent-amber: #f5a623;   /* 警告/注意，延续 VO 暖黄 */
  --pixel-accent-red: #ef4444;     /* 错误/危险 */
  --pixel-accent-purple: #a78bfa;  /* 特殊/AI 相关 */

  /* Blocky 阴影（像素风核心，无模糊 blur） */
  --pixel-shadow-sm: 2px 2px 0 #0d0f1a;
  --pixel-shadow-md: 3px 3px 0 #0d0f1a;
  --pixel-shadow-lg: 4px 4px 0 #0d0f1a;
  --pixel-shadow-accent: 2px 2px 0 #4d9fff;

  /* 像素风动画速度（步进，非缓动） */
  --pixel-transition: 80ms steps(2);  /* 步进式，有颗粒感 */
  --pixel-transition-slow: 150ms steps(3);
}
```

### 与 VO 模块色板的关系

| 作用域 | 前缀 | 色调 |
|--------|------|------|
| 整个应用（聊天/任务/设置等） | `--pixel-*` | 冷蓝暗夜 |
| 虚拟办公室场景内 | `--vo-*` | 暖棕 Lofi |
| 进入 VO 房间时，`--pixel-*` 变量自动让位，`--vo-*` 接管 ||

---

## 五、核心组件像素风样式指南

### 5.1 按钮（Button）

```css
/* 像素风按钮 — Arco .arco-btn 覆盖 */
.arco-btn {
  border-radius: 0 !important;                  /* 无圆角 */
  border: 2px solid var(--pixel-border) !important;
  box-shadow: var(--pixel-shadow-sm) !important;
  font-family: var(--pixel-font-display);
  font-size: 12px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  transition: var(--pixel-transition) !important;
  background: var(--pixel-bg-3) !important;
  color: var(--pixel-text-primary) !important;
}

.arco-btn:hover {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 #0d0f1a !important;     /* hover 时阴影加深 = 向上浮起效果 */
  border-color: var(--pixel-border-active) !important;
}

.arco-btn:active {
  transform: translate(2px, 2px);
  box-shadow: none !important;                   /* 按下时阴影消失 = 按下效果 */
}

/* Primary 按钮 */
.arco-btn-primary {
  background: var(--pixel-accent-blue) !important;
  border-color: var(--pixel-border-bright) !important;
  color: #0d0f1a !important;
  box-shadow: var(--pixel-shadow-accent) !important;
}
```

**视觉效果说明：**
- hover：向左上位移 1px + 阴影加深 → 像素风"浮起"
- active：向右下位移 2px + 阴影消失 → 像素风"按下"
- 无任何 ease 过渡，全部 steps() 步进

---

### 5.2 输入框（Input）

```css
.arco-input,
.arco-input-wrapper,
.arco-textarea {
  border-radius: 0 !important;
  border: 2px solid var(--pixel-border) !important;
  box-shadow: inset 1px 1px 0 rgba(0,0,0,0.3) !important; /* 内阴影 = 凹陷感 */
  background: var(--pixel-bg-1) !important;
  color: var(--pixel-text-primary) !important;
  font-family: var(--pixel-font-body);
  caret-color: var(--pixel-accent-blue);
}

.arco-input:focus,
.arco-input-wrapper:focus-within {
  border-color: var(--pixel-border-active) !important;
  box-shadow: inset 1px 1px 0 rgba(0,0,0,0.3),
              0 0 0 2px rgba(77, 159, 255, 0.15) !important; /* 聚焦光晕，柔和不闪 */
}

/* placeholder */
.arco-input::placeholder {
  color: var(--pixel-text-dim);
  font-style: normal;
}
```

---

### 5.3 卡片（Card / Panel）

像素风卡片的核心是：**有厚度感**，通过 blocky shadow 实现。

```css
.pixel-card {
  border: 2px solid var(--pixel-border);
  border-radius: 0;
  background: var(--pixel-bg-2);
  box-shadow: var(--pixel-shadow-md);
  padding: 12px 16px;
}

/* 卡片标题栏 — 背景色块分隔 */
.pixel-card__header {
  background: var(--pixel-bg-3);
  margin: -12px -16px 12px;
  padding: 8px 16px;
  border-bottom: 2px solid var(--pixel-border);
  font-family: var(--pixel-font-display);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--pixel-text-accent);
}

/* 活跃状态（如选中的员工卡片）*/
.pixel-card--active {
  border-color: var(--pixel-border-active);
  box-shadow: var(--pixel-shadow-accent);
}
```

---

### 5.4 弹窗（Modal / Drawer）

```css
.arco-modal {
  border-radius: 0 !important;
  border: 2px solid var(--pixel-border-active) !important;
  box-shadow: 6px 6px 0 #0d0f1a !important;     /* 大 blocky shadow = 层次感 */
  background: var(--pixel-bg-2) !important;
}

.arco-modal-header {
  border-radius: 0 !important;
  border-bottom: 2px solid var(--pixel-border) !important;
  background: var(--pixel-bg-3) !important;
  padding: 12px 20px !important;
}

.arco-modal-title {
  font-family: var(--pixel-font-display) !important;
  font-size: 13px !important;
  text-transform: uppercase !important;
  letter-spacing: 0.06em !important;
  color: var(--pixel-text-accent) !important;
}

/* 弹窗遮罩 — 半透明格子纹，像素风装饰 */
.arco-overlay-mask {
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 3px,
    rgba(0,0,0,0.05) 3px,
    rgba(0,0,0,0.05) 4px
  ),
  repeating-linear-gradient(
    90deg,
    transparent,
    transparent 3px,
    rgba(0,0,0,0.05) 3px,
    rgba(0,0,0,0.05) 4px
  ),
  rgba(13, 15, 26, 0.75) !important;
}
```

---

### 5.5 导航栏 / 顶部栏

```css
.pixel-nav {
  height: 40px;
  background: var(--pixel-bg-1);
  border-bottom: 2px solid var(--pixel-border);
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 8px;
  /* 底部增加一条 1px 亮线 = 像素风分隔感 */
  box-shadow: 0 2px 0 rgba(77, 159, 255, 0.1);
}

/* Logo 文字 */
.pixel-nav__logo {
  font-family: var(--pixel-font-display);
  font-size: 14px;
  color: var(--pixel-accent-blue);
  letter-spacing: 0.1em;
  text-shadow: 1px 1px 0 #0d0f1a;
}

/* 导航 Tab */
.pixel-nav__tab {
  padding: 4px 12px;
  font-size: 11px;
  font-family: var(--pixel-font-display);
  text-transform: uppercase;
  color: var(--pixel-text-secondary);
  border: 1px solid transparent;
  cursor: pointer;
  transition: var(--pixel-transition);
}

.pixel-nav__tab--active {
  color: var(--pixel-text-accent);
  border-color: var(--pixel-border-active);
  background: var(--pixel-bg-3);
  box-shadow: var(--pixel-shadow-sm);
}
```

---

### 5.6 状态标签（Badge / Tag）

```css
.pixel-badge {
  display: inline-block;
  padding: 2px 6px;
  font-family: var(--pixel-font-display);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border: 1px solid currentColor;
  border-radius: 0;
  line-height: 1.4;
}

.pixel-badge--working { color: #7ed321; border-color: #7ed321; background: rgba(126, 211, 33, 0.1); }
.pixel-badge--idle    { color: #8892b0; border-color: #8892b0; background: rgba(136, 146, 176, 0.1); }
.pixel-badge--stress  { color: #f5a623; border-color: #f5a623; background: rgba(245, 166, 35, 0.1); }
.pixel-badge--error   { color: #ef4444; border-color: #ef4444; background: rgba(239, 68, 68, 0.1); }
```

---

### 5.7 滚动条

```css
/* 全局像素风滚动条 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--pixel-bg-1);
  border-left: 1px solid var(--pixel-border);
}

::-webkit-scrollbar-thumb {
  background: var(--pixel-bg-4);
  border: 1px solid var(--pixel-border);
}

::-webkit-scrollbar-thumb:hover {
  background: var(--pixel-border-active);
}

::-webkit-scrollbar-corner {
  background: var(--pixel-bg-1);
}
```

---

## 六、与 Arco Design 的过渡方案

### 策略：全局 CSS 变量覆盖 + 渐进式组件替换

**不推荐方案：卸载 Arco**
- Arco 承载了大量业务逻辑（Select、Table、Form、Modal 等）
- 重写成本高，bug 风险大
- 像素风本质是视觉覆盖，不需要重写交互逻辑

**推荐方案：三层叠加**

```
Layer 1：Arco 原始组件（交互逻辑、无障碍、键盘操作 → 保留）
Layer 2：全局 CSS 变量覆盖（border-radius、colors、shadows → 覆盖）
Layer 3：像素风装饰 CSS（字体、blocky shadow、步进动画 → 新增）
```

**实施顺序：**

```
阶段 1（1-2天，风险最低）：
  - 新建 src/renderer/styles/pixel-theme.css
  - 只覆盖 CSS 变量（--bg-base 等），不碰 Arco class
  - 全局注入，立即看到效果
  - 风险：颜色变了，其他不变

阶段 2（3-5天，渐进）：
  - 增加 Arco 组件的像素风覆盖（按钮、输入框、卡片）
  - 逐个组件验证，不批量改
  - 每个组件单独测试

阶段 3（可选，长期）：
  - 对高曝光组件（员工卡片、任务卡片）自定义实现
  - 完全脱离 Arco 样式层，保留 Arco 逻辑（如 Modal 的 Portal、Form 的 validation）
```

### 哪些 Arco 组件最难覆盖（需特别注意）

| 组件 | 难点 | 处理方式 |
|------|------|---------|
| Select / Dropdown | 弹出层 z-index + 位置计算 | 覆盖 `.arco-select-popup` 样式即可，不动 JS |
| Table | 复杂 colgroup / sticky header | 只覆盖颜色，不碰布局 |
| DatePicker | 大量内联样式 | 暂不处理，等 P2 阶段 |
| Notification / Message | 全局 toast，位置由 Arco 控制 | 覆盖背景色和边框即可 |
| Progress / Slider | SVG 实现 | 用 CSS 自定义属性控制颜色 |

---

## 七、像素风装饰元素（可选增强）

以下元素不是必须，但能大幅提升像素感：

### 7.1 全局背景格子纹

```css
body {
  background-color: var(--pixel-bg-0);
  background-image:
    linear-gradient(rgba(58, 64, 96, 0.15) 1px, transparent 1px),
    linear-gradient(90deg, rgba(58, 64, 96, 0.15) 1px, transparent 1px);
  background-size: 16px 16px;
}
```

效果：极淡的网格底纹，强化像素感，不干扰内容可读性。

### 7.2 扫描线（CRT 效果，可选）

```css
.pixel-scanlines::after {
  content: '';
  position: fixed;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.03) 2px,
    rgba(0, 0, 0, 0.03) 4px
  );
  pointer-events: none;
  z-index: 9999;
}
```

注意：只在虚拟办公室场景开启，全局开启会影响可读性。

### 7.3 分隔线装饰

```css
.pixel-divider {
  border: none;
  height: 2px;
  background: repeating-linear-gradient(
    90deg,
    var(--pixel-border) 0,
    var(--pixel-border) 4px,
    transparent 4px,
    transparent 8px
  );
}
```

效果：虚线分隔，像素风经典样式。

### 7.4 加载动画（像素风）

```css
@keyframes pixel-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.pixel-loading {
  animation: pixel-blink 800ms steps(1) infinite;
}
```

---

## 八、文件结构规划

```
src/renderer/styles/
├── themes/
│   ├── index.css                  （入口，引入所有主题）
│   ├── base.css                   （现有，不动）
│   ├── default-color-scheme.css   （现有，追加 --pixel-* 变量）
│   └── pixel-theme.css            【新建】像素风覆盖，全局注入
├── layout.css                     （现有，不动）
├── arco-override.css              （现有，追加按钮/弹窗的像素风覆盖）
└── colors.ts                      （现有，不动）
```

**pixel-theme.css 内容范围：**
- 像素字体引入（@import Silkscreen）
- 全局 border-radius: 0 覆盖（仅 Arco 组件）
- 滚动条样式
- 全局背景格子纹
- `.pixel-card`、`.pixel-badge`、`.pixel-nav` 等工具类

---

## 九、MVP 范围（建议首批上线）

| 优先级 | 内容 | 工时预估 |
|--------|------|---------|
| P0 | 新建 `--pixel-*` CSS 变量，追加到 default-color-scheme.css | 0.5天 |
| P0 | pixel-theme.css：全局背景色、border-radius 归零、滚动条 | 0.5天 |
| P0 | 按钮像素风覆盖（hover/active 位移效果） | 0.5天 |
| P1 | 输入框、卡片像素风覆盖 | 1天 |
| P1 | Silkscreen 字体引入，覆盖导航栏标题 | 0.5天 |
| P1 | Modal/弹窗像素风覆盖 | 0.5天 |
| P2 | 全局背景格子纹 | 0.25天 |
| P2 | 自定义像素风组件（员工卡片、任务卡片）脱离 Arco 样式层 | 3天+ |

---

## 十、实施风险

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| Arco 组件内联样式覆盖失败 | 中 | 低 | 用 `:global` + `!important`，或添加 wrapper class 提升优先级 |
| 黑暗系色板降低正文对比度 | 中 | 高 | 每个颜色组合跑 WCAG 对比度检测（≥ 4.5:1 AA） |
| Silkscreen 字体加载慢 | 低 | 低 | `font-display: swap`，加载前回退到 monospace |
| border-radius 归零影响图片/头像 | 中 | 低 | 头像用 `.pixel-avatar` class 单独控制，不受全局影响 |
| 中文和像素字体混排错位 | 中 | 中 | 像素字体只覆盖英文/数字元素，中文文本不套用 `--pixel-font-display` |

---

*体验-阿点 · 全应用像素风 UI 系统方案 · 2026-04-01*
*技术集成和组件实现由开发-小快执行，本文为设计规范*
