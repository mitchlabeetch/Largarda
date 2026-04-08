# 虚拟办公室 — AI 动画生成工具调研

> 体验-阿点 | 2026-04-01
>
> 调研角度：设计/美术实操 + 效果评估
> 互补：阿构侧重技术集成方案，本文侧重工具可用性和效果质量
>
> 核心需求：静态像素风角色 → 循环动画（呼吸/打字/待机），保持像素风格，透明背景，低成本

---

## 一、结论先行

| 推荐度 | 工具 | 方向 | 适合场景 |
|--------|------|------|---------|
| ★★★★★ | **Rive**（rive.app）| 手动骨骼+AI辅助 | 最接近需求，可输出循环动画，WebGL运行时免费 |
| ★★★★ | **Animated Drawings**（Meta）| 图转动画 | 从静态图自动生成走路/动作，免费开源 |
| ★★★★ | **PixelLab + Aseprite**组合 | AI帧生成+手工校正 | 像素风最高保真，流程成熟 |
| ★★★ | **Runway ML**（Gen-3）| 图转视频 | 效果好但容易失去像素风格，需后处理 |
| ★★★ | **LeiaPix / Pika Labs** | 图转循环视频 | 容易变成写实风，像素风保持难 |
| ★★ | **Stable Diffusion AnimateDiff**| AI帧生成 | 本地运行免费，但像素风保持困难 |

**MVP 推荐方案：Rive 骨骼 + PixelLab AI 帧生成辅助**

---

## 二、逐工具详评

### 工具 1：Rive（rive.app）★★★★★

**类型：** 手动骨骼动画编辑器 + State Machine，有 AI 辅助功能（Rive AI，beta）

**核心能力：**
- Web 端骨骼动画编辑器，免费个人版
- State Machine：定义状态（idle/working/chatting）和转换条件，直接对应我们的枚举状态机
- 运行时：`@rive-app/canvas`（npm，免费），可直接嵌入 PixiJS 或 React
- **Rive AI（beta）**：上传静态图，AI 自动识别骨骼点并生成动画（实验功能，2024年推出）

**像素风保持：**
- 骨骼动画方案：贴图不变形，100% 保持像素风
- 注意：关节旋转时可能出现像素缝隙，需要关节处贴图预留重叠像素

**透明背景：** 支持，导出时背景透明

**循环播放：** State Machine 原生支持无缝循环

**成本：**
- 编辑器：免费（个人版）
- 运行时：免费开源
- Rive AI：目前 beta 免费

**适合我们的场景：**
- 直接替代 DragonBones，API 更现代（DragonBones 停更风险）
- State Machine 和我们的 `EmployeeState` 枚举完美对应
- 缺点：PixiJS 集成需要自建桥接层（阿构需确认）

**操作流程：**
```
1. rive.app 新建项目
2. 导入分部件 PNG（与 DragonBones 相同的 slot 图）
3. 手动绑定骨骼（比 DragonBones 界面更直观）
4. 制作 anim_idle / anim_work 等 8 个动作
5. 建 State Machine，连接状态转换
6. 导出 .riv 文件
7. React 端用 @rive-app/react 直接播放
```

---

### 工具 2：Animated Drawings（Meta Research）★★★★

**类型：** 图转动画，开源，免费

**地址：** https://github.com/facebookresearch/AnimatedDrawings

**核心能力：**
- 上传一张手绘/像素风角色图
- AI 自动检测人体关键点（头/肩/肘/腕/髋/膝/踝）
- 自动生成走路、跑步、跳跃等动作的关键帧
- 输出：视频（mp4）或关键帧序列

**像素风保持：**
- 输入什么风格输出什么风格（不转换风格）
- 测试结果：像素风输入 → 像素风输出，效果较好
- 问题：关键点检测在小尺寸像素图（32px）上精度较低，建议用 128px 以上图测试

**透明背景：** 视频输出不支持，但可以按输入图颜色做后期抠图

**循环播放：** 支持循环视频导出

**成本：** 完全免费，本地运行

**适合场景：** 快速验证动作是否自然，不适合直接用于生产（输出是视频非骨骼数据）

**局限：**
- 只能生成预设动作（走/跑/跳），不能生成"打字"这类特定动作
- 输出为视频，需要转成序列帧再裁切各部件

---

### 工具 3：PixelLab（pixellab.ai）+ Aseprite 组合 ★★★★

**类型：** AI 像素画生成 + 手工动画编辑

**核心能力（PixelLab Animate 功能）：**
- 给首帧像素图，描述动作（"character breathing slowly"），AI 生成后续帧
- 保持像素风格（专为像素画训练）
- 每次生成 4-8 帧，多次生成拼接成完整循环

**像素风保持：** ★★★★★（专为像素画设计，风格最稳定）

**透明背景：** 支持

**循环播放：** 需要在 Aseprite 手工调整首尾帧衔接

**成本：**
- PixelLab：免费版有限额，Pro 约 $10/月
- Aseprite：$20 一次性（或编译开源版免费）

**操作流程：**
```
1. 用 PixelLab 生成静态角色（已有 prompt，见 ai-art-prompts.md）
2. 用 PixelLab Animate：上传静态帧，输入"breathing idle animation, pixel art"
3. AI 生成 4-6 帧变化
4. 在 Aseprite 调整帧间隔，确保首尾衔接自然
5. 导出为 spritesheet PNG（Aseprite 原生支持）
```

**适合场景：** 生成高质量像素风 idle/breathing 动画，适合 MVP 的 `anim_idle` 和 `anim_sleep`

---

### 工具 4：Runway ML（Gen-3 Alpha）★★★

**类型：** 图转视频，商业工具

**核心能力：**
- 上传参考图 + 文字描述 → 生成 3-10 秒短视频
- Motion Brush：指定区域运动方向（手臂/胸口起伏）

**像素风保持：** ★★（Gen-3 倾向于平滑化，像素边缘会被柔化）

**后处理方案：** 生成后在 Aseprite 重新像素化（Indexed Color，限制调色板）可以恢复像素风

**透明背景：** 不支持，需要后期抠图（背景用绿幕再 Chroma Key）

**成本：** $12/月起，有免费试用额度（125 credits）

**适合场景：** 有参考图时快速验证动作方向，不建议直接用于生产

---

### 工具 5：AnimateDiff（Stable Diffusion 插件）★★

**类型：** AI 帧生成，本地运行，免费

**核心能力：**
- 给首帧图 + 提示词，生成后续帧（视频序列）
- 有像素风 LoRA 模型可用

**像素风保持：** ★★★（需要配合像素 LoRA，效果不稳定）

**透明背景：** 不支持（需要后期）

**成本：** 免费，但需要较好的 GPU（8GB VRAM 以上）

**适合场景：** 有本地 GPU 资源时的低成本方案，效果不及专业工具

---

### 工具 6：Pika Labs / LeiaPix ★★

**类型：** 图转循环视频

**像素风保持：** ★（容易变成写实风或3D感，不推荐用于像素风项目）

**结论：不适合本项目**

---

## 三、针对我们8个动画状态的工具推荐

| 状态 | 推荐工具 | 理由 |
|------|---------|------|
| `anim_idle`（呼吸待机）| PixelLab Animate | 专长：微小的呼吸起伏，像素风保持最好 |
| `anim_work`（打字）| Rive 手动骨骼 | 打字是特定动作，AI 无法精确生成，手动最可控 |
| `anim_chat`（聊天）| Rive 手动骨骼 | 同上，嘴部动作需要精确控制 |
| `anim_read`（翻书）| Rive 手动骨骼 | 翻书是特定道具动作 |
| `anim_rest`（休息）| PixelLab Animate + Aseprite | 伸懒腰，AI 生成后手工校正 |
| `anim_sleep`（休眠）| PixelLab Animate | 极慢呼吸，AI 很擅长 |
| `anim_happy`（庆祝）| Animated Drawings + 手工 | AI 生成跳跃参考，手工细化 |
| `anim_error`（出错）| Rive 手动骨骼 | 叹气动作需要精确节奏控制 |

---

## 四、MVP 推荐方案（综合成本和效果）

### 方案 A：Rive 全骨骼（推荐）

```
优点：
- 一套骨骼覆盖所有 8 个状态
- State Machine 对应我们的枚举状态机
- 运行时 @rive-app/canvas 免费，集成比 DragonBones 更现代
- 比 DragonBones 更活跃维护

缺点：
- 需要手动制作每个骨骼动作（但和 DragonBones 工作量相同）
- PixiJS 集成需要桥接层（阿构需评估）

成本：编辑器免费，运行时免费
工时：约 3-5 天（8 个状态，1 个职位）
```

### 方案 B：PixelLab Animate + Aseprite 序列帧（备选）

```
优点：
- 像素风格最高保真
- AI 辅助生成呼吸/休息类循环动画，减少手工帧数

缺点：
- 序列帧方案，无骨骼复用（职位换装需要重新生成每套）
- 动作精度不如手动骨骼

成本：PixelLab Pro $10/月 + Aseprite $20
工时：idle/sleep 用 AI 生成约 0.5 天/个，打字/聊天类手工约 1-2 天/个
```

### 方案 C：混合（最务实）

```
- idle / sleep / rest：PixelLab Animate 生成（AI 擅长）
- work / chat / read / error：Rive 或 DragonBones 手动骨骼（精度要求高）
- 两套资产并行，骨骼动画失败时序列帧兜底
```

---

## 五、一个重要发现：Rive 可能比 DragonBones 更适合

DragonBones 已于 2021 年停止更新（Adobe 收购后停维护），`pixi-dragonbones` 运行时社区响应慢。

Rive 是目前最活跃的 Web 骨骼动画生态：
- 编辑器持续迭代（2024 年推出 AI 功能）
- 运行时有官方维护的 React/Canvas/WebGL 版本
- State Machine 功能天然对应状态机设计

**建议阿构评估 Rive 作为 DragonBones 的替代方案。** 如果 PixiJS 集成成本可接受，Rive 在工具链层面比 DragonBones 更安全。

---

## 六、立刻可以尝试的操作（用户今天就能跑）

**5 分钟验证 PixelLab Animate：**
1. 去 pixellab.ai，注册免费账号
2. 用 ai-art-prompts.md 里的 Prompt B 生成一张侧视角色图
3. 点"Animate"按钮，输入 `"idle breathing, pixel art character, slow gentle movement"`
4. 看效果是否符合预期

**10 分钟验证 Rive：**
1. 去 rive.app，新建文件
2. 导入任意一张分部件 PNG
3. 建一个简单的呼吸骨骼动画
4. 看导出和播放效果

---

*体验-阿点 · AI 动画工具调研 · 2026-04-01*
*侧重实操和效果评估，技术集成方案见阿构调研文档*
