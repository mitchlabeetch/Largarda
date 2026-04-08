# 员工房间交互设计方案

> 体验-阿点 | 2026-04-02
>
> 依据：用户愿景（红白机RPG风格，角色在不同位置代表不同状态）
> 前提：PixelLab 生成透明背景角色 + 现有 room-bg-clean.png 房间背景
> 与 design-final.md 关系：本文专注于**房间场景内的交互细节**，补充 design-final.md Section 3 和 Section 4

---

## 一、设计核心理念

**角色位置即状态**：用户不需要读状态标签，只需看角色在哪里就知道他在干什么。
- 坐在电脑前 = 工作中
- 坐在书桌边发呆/翻笔记 = 整理记忆
- 躺在床上 = 休息/空闲

这是红白机 RPG 的核心语言：角色在地图里的位置传达一切。

---

## 二、房间布局与交互热点

### 2.1 房间坐标系（基于 room-bg-clean.png）

房间背景宽约 640px（显示宽度），横版侧视。家具位置如下：

```
┌──────────────────────────────────────────────────────────────────┐
│  [壁画·左墙]          [书架·右墙]   [窗·右上]                       │
│                        [盆栽·窗边]                                │
│  [床·左区]                          [台灯·桌面]                   │
│  [格子毯·床前]        [书桌区域]→[电脑·显示器]                      │
│                         [椅子]      [键盘]                        │
│                                     [小物件·桌面]                 │
│  ░░░░░░░░░░░░░░░░░░░░░ 木地板 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
└──────────────────────────────────────────────────────────────────┘

坐标参考（以房间宽=640px为基准，原点左上角）：
  床区：           x: 20-180,   y: 120-280
  书架区：         x: 180-290,  y: 60-260
  电脑桌/椅区：    x: 380-580,  y: 160-300
  窗户：           x: 500-620,  y: 30-130
  台灯：           x: 430-470,  y: 130-200
```

### 2.2 可交互热点一览

| 热点名称 | 位置 | 触发方式 | 触发内容 | hitbox 形状 |
|---------|------|---------|---------|------------|
| 电脑/显示器 | 右区中央 | 点击 | 弹出「工作面板」（聊天记录 + 任务） | 矩形，覆盖显示器 ×1.5 |
| 桌面笔记本 | 书桌左侧 | 点击 | 弹出「记忆面板」 | 矩形，约 40×30px |
| 床上角色 | 左区（仅休息状态时） | 点击 | 弹出「唤醒确认对话框」 | 角色精确边界 |
| 书架 | 右区书架 | 点击 | 弹出「记忆面板」（同笔记本） | 矩形，书架区域 |
| 角色本身（工作/记忆状态） | 随状态变化 | 点击 | 快捷菜单（对话/发任务/查看状态） | 角色精确边界 |

**hover 反馈（所有可交互热点）：**
- Canvas 层：绘制 `--vo-border-active`（暖黄色 `rgba(245,166,35,0.7)`）发光边框，2px，blur 3px
- DOM 层：tooltip，JetBrains Mono 10px，暗棕背景，无圆角
- 光标：`cursor: pointer`（可选：自定义像素手形光标）

---

## 三、角色三个状态的位置与姿态

### 状态 1：工作中（working）

**位置：** 电脑桌前，坐在椅子上
- 精确坐标：角色中心 x≈490, y≈240（基于 640px 房间宽）
- 角色朝向：面向左（朝向电脑屏幕，即朝向画面左侧）
- 椅子位于角色正下方

**姿态描述（供 PixelLab Pixflux 生成）：**
```
lofi pixel art character, side view facing left, sitting at computer desk,
leaning slightly forward, both hands on keyboard, eyes looking at monitor screen,
warm teal hair with glasses, orange hoodie, 32x64px pixel art,
transparent background, warm dark brown outline #2B1D0F,
blue-white computer screen glow on face from left side,
cozy room atmosphere
```

**动画规格（对应 design-final.md 打字动作）：**
- 帧数：10帧 @ 10fps，循环
- 微变化：双手交替敲键盘节奏（帧1-6）→ 抬头看屏幕（帧7-8）→ 低头继续打（帧9-10）
- 屏幕冷蓝光从左侧投射在角色脸上（通过 PixiJS ColorMatrixFilter 实现）

---

### 状态 2：整理记忆（memorizing）

**位置：** 书桌靠书架一侧，坐着发呆或翻笔记
- 精确坐标：角色中心 x≈390, y≈240
- 角色朝向：面向右（朝向书架方向）
- 桌面上有一本打开的笔记本（作为可点击热点）

**姿态描述（供 PixelLab 生成）：**
```
lofi pixel art character, side view facing right, sitting at wooden desk,
slightly slouched, one hand resting on chin thinking pose (托腮),
other hand on open notebook, glasses reflecting warm lamp light,
warm teal hair, orange hoodie, 32x64px pixel art,
transparent background, warm dark brown outline #2B1D0F,
warm yellow lamp glow from above right,
daydreaming expression, cozy and contemplative
```

**动画规格（对应 anim_read）：**
- 帧数：10帧 @ 7fps，循环
- 微变化：手翻书页（帧1-4）→ 托腮思考（帧5-6）→ 手指划过文字（帧7-9）→ 翻下一页（帧10）

---

### 状态 3：休息/空闲（resting/sleeping）

**位置：** 床上躺着
- 精确坐标：角色中心 x≈120, y≈220
- 角色朝向：水平躺卧，朝向右侧（面朝房间中央）
- 整个角色在床上，被格子毯部分覆盖

**姿态描述（供 PixelLab 生成）：**
```
lofi pixel art character, lying on bed side view, horizontal position,
curled slightly, eyes closed, peaceful sleeping expression,
warm teal hair on pillow, orange hoodie,
cozy patterned blanket partially covering, 64x32px pixel art (wide format),
transparent background, warm dark brown outline #2B1D0F,
warm lamp glow from right side of scene
```

**动画规格（对应 anim_sleep）：**
- 帧数：8帧 @ 3fps，循环
- 微变化：胸口极慢上下起伏（吸气帧1-4，呼气帧5-8），接近静止
- 整体添加 PixiJS desaturate filter（灰度 0.3）+ alpha 0.8，体现休眠感

---

## 四、状态切换：角色移动路径

### 切换机制

**无寻路，无行走动画**（与 design-final.md 裁决一致）。
切换方式：淡出原位置 → 淡入新位置。

但为了 RPG 感，过渡动画做一个**半透明移动残影**效果：

```
状态切换过渡（约 700ms 总时长）：
  ① 当前位置：角色 opacity 1 → 0，同时向目标方向位移 8px（150ms ease-out）
  ② 目标位置：角色从目标方向偏移 8px 处开始，opacity 0 → 1，位移回正（150ms ease-in）
  ③ 新状态动画开始播放
```

### 各切换路径说明

| 从 → 到 | 路径方向 | 视觉描述 |
|---------|---------|---------|
| working → memorizing | 向左移 | 从电脑桌淡出，在书桌旁淡入，翻开笔记本 |
| working → resting | 向左移（较远）| 从电脑桌淡出，在床上躺下淡入 |
| memorizing → working | 向右移 | 合上笔记本，移向电脑桌 |
| memorizing → resting | 向左移 | 从桌旁淡出，床上躺下淡入 |
| resting → working | 向右移（较远）| 从床上淡出（"起身"），电脑桌前淡入 |
| resting → memorizing | 向右移 | 床上淡出，书桌旁淡入 |

### 特殊切换：唤醒动作

床上角色被点击 → 确认对话框 → 用户点「唤醒他工作」：

```
唤醒序列（约 1200ms）：
  ① 角色在床上播放 2帧"起身"动作（帧：坐起，手撑床沿）
  ② 床区淡出（300ms）
  ③ 角色在电脑桌前淡入，播放 2帧"坐下"动作
  ④ 进入 working 状态动画
```

---

## 五、弹出面板设计

### 5.1 工作面板（点击电脑触发）

**触发**：点击电脑/显示器热点（任意状态下均可点击）

**位置**：右侧抽屉，宽 320px，全高，从右侧滑入（200ms）

```
┌─────────────────────────────────────────────────────────┐
│  [任务进度]  [对话记录]                         [×]       │
│  ──────────────────────────────────────────────────────  │
│  === 任务进度 Tab（默认）===                              │
│                                                          │
│  ▶ 正在执行                                              │
│    修复登录 bug                                          │
│    工具：git diff → grep → file_edit                    │
│    ████████░░  80%                                       │
│    [展开日志 ↓]                                          │
│                                                          │
│  最近完成（3条）                                          │
│    [2h前] 重构权限模块 ✓                                  │
│    [昨天] API超时修复 ✓                                   │
│                                                          │
│  队列中（2条）                                           │
│    · 添加单元测试                                        │
│    · 代码审查 PR #234                                    │
│                                                          │
│  ──────────────────────────────────────────────────────  │
│  [输入新任务...]                              [发送]     │
└─────────────────────────────────────────────────────────┘
```

**对话记录 Tab：**
```
┌─────────────────────────────────────────────────────────┐
│  [任务进度]  [对话记录]                         [×]       │
│  ──────────────────────────────────────────────────────  │
│  [全部] [任务指令] [聊天]                                 │
│                                                          │
│  今天                                                    │
│  用户 21:30：修复登录 bug                                 │
│  小快 21:31：好的，我来看看...                            │
│  小快 21:45：找到了，是 token 过期逻辑问题                 │
│                                                          │
│  昨天                                                    │
│  小快 18:00：权限模块重构完成                             │
│                                                          │
│  ──────────────────────────────────────────────────────  │
│  [发消息...]                                  [发送]     │
└─────────────────────────────────────────────────────────┘
```

**样式规格：**
- 背景：`--vo-bg-panel (#3D2A18)`
- 边框：左侧 2px `--vo-border-active (#F5A623 70%)`，无圆角（像素风）
- 滑入动画：`translateX(320px → 0)`，200ms，steps(8)（像素风步进）
- Tab 激活：底部 2px 暖黄实线，非激活为暗色
- 关闭：点 [×] 或点房间背景空白

---

### 5.2 记忆面板（点击书架或桌面笔记本触发）

**触发**：
- 状态为 memorizing 时：点桌面笔记本 或 点书架
- 任意状态时：点书架（书架始终可点击）

**位置**：右侧抽屉，宽 320px，全高（同工作面板位置，互斥）

```
┌─────────────────────────────────────────────────────────┐
│  小快的记忆库                                   [×]       │
│  [搜索记忆内容...]                                        │
│  ──────────────────────────────────────────────────────  │
│                                                          │
│  核心记忆.md                                   [编辑]    │
│    代码风格偏好：单引号、不加分号                          │
│    调试习惯：先 console.log，再断点                       │
│                                                          │
│  工作风格.md                                   [编辑]    │
│    偏好一次专注一个任务                                    │
│    不喜欢被打断                                           │
│                                                          │
│  ──────────────────────────────────────────────────────  │
│  任务日志（最近 10 条）                                    │
│    [今天] 修复登录 bug                                   │
│    [昨天] 重构权限模块                                    │
│    [3天前] API超时修复                                    │
└─────────────────────────────────────────────────────────┘
```

**编辑记忆文件确认提示（点击[编辑]触发）：**
```
┌───────────────────────────────────┐
│  修改记忆文件                       │
│  ────────────────────────────────  │
│  直接修改记忆可能影响员工行为。       │
│  确认要修改「核心记忆.md」吗？       │
│                                   │
│  [取消]            [确认修改]       │
└───────────────────────────────────┘
```

**样式规格：** 同工作面板，背景/边框/动画一致。

---

### 5.3 唤醒确认对话框（点击床上角色触发）

**触发条件**：角色处于 resting/sleeping 状态，点击床区角色

**位置**：画面中央浮层，宽 280px（不是侧边抽屉，是正中央小对话框）

```
┌───────────────────────────────────────┐
│                                       │
│   💤  小快 正在休息                   │
│   ─────────────────────────────────   │
│   唤醒他工作？                         │
│   他可能需要一点时间恢复状态。           │
│                                       │
│   [取消]         [唤醒他工作]           │
│                                       │
└───────────────────────────────────────┘
```

**样式规格：**
- 背景：`--vo-bg-panel (#3D2A18)`，无圆角，2px 暖黄边框
- 出现动画：`scale(0.85 → 1.0)` + `opacity(0 → 1)`，150ms，steps(4)
- 背景遮罩：`rgba(26,16,8,0.6)` 半透明压暗，点击遮罩 = 取消
- 按钮样式：像素风，2px 实线边框，无圆角

---

### 5.4 角色快捷菜单（点击工作/记忆状态角色触发）

**触发条件**：角色处于 working 或 memorizing 状态，直接点击角色

**位置**：角色正上方浮出，小型气泡菜单

```
         ┌────────────────────────────┐
         │  [对话]  [发任务]  [查看状态] │
         └───────────┬────────────────┘
                     ▼ 箭头朝向角色
              [角色像素图]
```

**样式规格：**
- 菜单宽：自适应内容，约 180px
- 背景：`--vo-bg-card (#4A3320)`，2px `--vo-border-active` 边框
- 出现：从角色头顶向上展开，`translateY(8px → 0)` + opacity，120ms
- 消失：点击菜单外任意位置
- [对话]：打开工作面板的对话记录 Tab
- [发任务]：打开工作面板的任务进度 Tab，焦点在输入框
- [查看状态]：打开状态详情（HEALTH/STRESS/PRODUCTIVITY 详细数值，在 design-final.md 中定义的隐藏进度条，此处可见）

---

## 六、角色生成规格（给 PixelLab 的完整 Prompt 清单）

### 通用规格约束（所有状态共用）

```
通用约束（每个 Prompt 末尾附加）：
- 像素风格：32-bit pixel art, lofi cozy aesthetic
- 尺寸：32x64px（站立）或 64x32px（躺卧），透明背景
- 轮廓色：warm dark brown #2B1D0F（绝对禁止纯黑 #000000）
- 肤色：#F5D5A0（暖米肤）
- 发色：dark teal #3B7A8A
- 服装：orange hoodie（或对应职位服装）
- 配件：round glasses（圆框眼镜）
- 渲染：no anti-aliasing, hard pixel edges, flat shading
- 不要阴影：no drop shadow on character body
```

### 状态 1：working（坐姿打字，面左）

```
lofi pixel art character, side view facing left, sitting at computer desk,
upper body leaning slightly forward, both hands positioned on keyboard,
head tilted up slightly looking at monitor, round glasses,
warm teal hair short style, orange hoodie,
32x64px pixel art, transparent background,
warm dark brown outline #2B1D0F, skin #F5D5A0,
blue-white monitor glow on face and hands,
hard pixel edges, flat shading, no anti-aliasing
```

### 状态 2：memorizing（坐姿托腮，面右）

```
lofi pixel art character, side view facing right, sitting at wooden desk,
one hand resting under chin in thinking pose, other hand on open notebook,
slightly slouched relaxed posture, round glasses catching warm light,
warm teal hair short style, orange hoodie,
32x64px pixel art, transparent background,
warm dark brown outline #2B1D0F, skin #F5D5A0,
warm yellow lamp glow from upper right on face,
contemplative expression, cozy atmosphere,
hard pixel edges, flat shading, no anti-aliasing
```

### 状态 3：resting（躺卧，眼闭）

```
lofi pixel art character, lying on bed side view facing right,
horizontal sleeping position, eyes closed, peaceful expression,
slightly curled up, arms relaxed,
warm teal hair on pillow, orange hoodie,
64x32px pixel art (horizontal orientation), transparent background,
warm dark brown outline #2B1D0F, skin #F5D5A0,
warm ambient lamp glow,
hard pixel edges, flat shading, no anti-aliasing
```

---

## 七、各状态动画帧数规格（PixelLab animateWithSkeleton 参数）

| 状态 | 帧数 | 帧率 | 循环 | PixelLab action 参数 |
|------|------|------|------|---------------------|
| working | 10帧 | 10fps | 是 | `"typing at keyboard, fingers moving, head slightly bobbing"` |
| memorizing | 10帧 | 7fps | 是 | `"reading notes, hand turning pages, occasional chin rest pose"` |
| resting | 8帧 | 3fps | 是 | `"sleeping breathing, chest slowly rising and falling"` |

**帧序列导出格式：**
- 每帧：独立 PNG，透明背景，原始像素尺寸
- 命名：`{state}/frame-{n}.png`，从 0 开始
- Spritesheet：`{state}/spritesheet.png`（水平排列），附 `{state}/spritesheet.json`（帧坐标）

---

## 八、PixiJS 实现要点

### 8.1 角色层级（对应 design-final.md 五层架构）

```
Layer 4（z=40）：角色 Sprite 层
  - 三个状态 Sprite 对象预先创建，通过 alpha 控制显示/隐藏
  - 当前状态 alpha=1，其余 alpha=0
  - 切换时：当前 alpha 0→0（200ms fade out），新状态 0→1（200ms fade in）
  - 每个 Sprite 的 x, y 固定对应状态位置
```

### 8.2 热点 hitbox 实现

```typescript
// 伪代码：热点注册
const hitboxes = [
  {
    name: 'computer',
    rect: { x: 380, y: 160, w: 160, h: 100 },  // 相对于 640px 房间宽
    cursor: 'pointer',
    onHover: drawGlowBorder,
    onClick: openWorkPanel,
  },
  {
    name: 'notebook',
    rect: { x: 360, y: 220, w: 40, h: 30 },
    cursor: 'pointer',
    onHover: drawGlowBorder,
    onClick: openMemoryPanel,
    // 仅在 memorizing 状态下可见/可点击
    visibleStates: ['memorizing'],
  },
  {
    name: 'bookshelf',
    rect: { x: 180, y: 60, w: 110, h: 200 },
    cursor: 'pointer',
    onHover: drawGlowBorder,
    onClick: openMemoryPanel,
  },
  {
    name: 'character_bed',
    // hitbox 随 resting 状态角色位置同步
    cursor: 'pointer',
    onHover: drawGlowBorder,
    onClick: openWakeUpDialog,
    visibleStates: ['resting', 'sleeping'],
  },
];
```

### 8.3 状态切换调用

```typescript
type RoomState = 'working' | 'memorizing' | 'resting';

async function switchRoomState(from: RoomState, to: RoomState) {
  // 1. 淡出当前角色
  await fadeOut(sprites[from], 200);

  // 2. 瞬移（不播放行走）
  sprites[from].visible = false;
  sprites[to].visible = true;
  sprites[to].alpha = 0;

  // 3. 淡入新状态角色
  await fadeIn(sprites[to], 200);

  // 4. 开始新状态循环动画
  spriteAnimations[to].play();
}
```

### 8.4 状态与 EmployeeState 枚举的映射

```typescript
// 将业务状态（EmployeeState）映射到房间视觉状态（RoomState）
const EMPLOYEE_TO_ROOM_STATE: Record<EmployeeState, RoomState> = {
  working:    'working',
  chatting:   'working',   // 聊天时角色仍在电脑桌前
  memorizing: 'memorizing',
  resting:    'resting',
  sleeping:   'resting',
  idle:       'memorizing', // 空闲时发呆，坐在书桌旁
  happy:      'working',    // 庆祝时在电脑桌前
  error:      'working',    // 出错时在电脑桌前
};
```

---

## 九、与现有文档的差异说明

| 内容 | design-final.md（原） | 本文（新） |
|------|----------------------|-----------|
| 床的交互 | 纯装饰，无 hitbox | **改为可点击**（点击床上角色 → 唤醒确认） |
| 角色位置 | 描述模糊（"中右区域"）| 给出 3个精确坐标，对应 3个状态 |
| 笔记本 | 未提及 | 新增桌面笔记本为记忆面板入口（仅 memorizing 状态可见）|
| 状态数量 | 8个枚举状态 | **合并为 3个房间视觉位置**（工作/记忆/休息），多个枚举状态共用同一视觉位置 |
| 角色移动 | "无走路动画，淡入淡出" | 明确了"向目标方向偏移 8px 的淡出淡入"，保留 RPG 移动感 |

**关于床的 hitbox 变更：**
design-final.md 裁决"床无 hitbox"是基于"床为纯装饰"的前提。
用户新愿景明确"点击床上的角色 → 弹出唤醒确认"，这不是点床，是点**床上的角色**。
hitbox 挂在角色上，不是床上，不违背原裁决。

---

## 十、边缘场景处理

| 场景 | 处理方案 |
|------|---------|
| 点击电脑但角色正在 resting | 面板正常弹出，角色不移动（人还在床上，电脑可远程查看） |
| 点击书架但角色正在 working | 面板正常弹出，角色不移动 |
| 切换状态时用户点击 hitbox | 切换动画优先完成（200ms），之后再响应点击 |
| 面板已打开，用户再次点击同一热点 | 面板关闭（toggle 行为） |
| 两个面板同时触发 | 后触发的面板覆盖前一个（同一右侧抽屉位置，互斥） |
| resting 状态下用户直接发任务（不点唤醒）| 通过底部 HUD 发任务，角色自动唤醒并切换到 working |
| 角色资产加载失败 | 显示静态占位图（对应 design-final.md 降级策略） |

---

*体验-阿点 · 房间交互设计方案 · 2026-04-02*
*基于：用户 RPG 愿景 + room-bg-clean.png + design-final.md 原有规格*
