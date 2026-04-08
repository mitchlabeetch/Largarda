# 静态像素图→动画平台调研

> 架构-阿构 | 2026-04-01
> 场景：用户有 Gemini 生成的 3 张像素风静态图，找平台让角色动起来。

---

## 结论（直接看这里）

| 平台 | 能用吗 | 保持像素风 | 指定动作 | API 可用 | 费用 |
|------|--------|-----------|---------|---------|------|
| **PixelLab** | **是** | **是** | **是（文字描述动作）** | **是（npm: pixellab）** | 积分制按量 |
| **Viggle AI** | 否 | 否 | 部分 | 无公开 API | 订阅制 |
| **Kling AI** | 部分 | 否（会平滑化）| 部分 | 有 REST API | 按量 |
| **Pika Labs** | 部分 | 否（会平滑化）| 部分 | 无公开 API | 订阅制 |
| **Runway Act-Two** | 否 | 否 | 是（但需参考视频）| 是 | 按用量 |
| **MonsterMash** | 否（已停）| - | - | 无 | - |
| **PixelOver** | 是（纯手工）| **是** | 是 | **无 API** | $20 买断 |
| **Live2D** | 是 | 否（破坏锯齿）| 是 | 有运行时 | 编辑器付费 |
| **Aseprite** | 是（纯手工）| **是** | 是 | **无 API** | $20 买断 |

**唯一满足全部条件的：PixelLab。**

---

## 各平台详情

### PixelLab — 首推，立即可用

**关键：`animateWithText` 接受 `referenceImage` 参数，直接传用户已有的静态像素图。**

```typescript
import { PixelLabClient, Base64Image } from 'pixellab';

const client = new PixelLabClient(process.env.PIXELLAB_API_KEY);

// 读取用户已有的像素图
const refImage = await Base64Image.fromFile('employee_static.png');

// 传入静态图 + 文字描述动作 → 输出序列帧
const result = await client.animateWithText({
  referenceImage: refImage,       // 用户已有的静态图直接传入
  description: 'pixel art character',
  action: 'typing at keyboard',   // 自由描述动作
  imageSize: { width: 48, height: 96 },
  nFrames: 8,                     // 生成帧数
});

// result.images → Base64Image[] → 保存为 PNG 序列帧
for (let i = 0; i < result.images.length; i++) {
  await result.images[i].saveToFile(`idle_frame_${i}.png`);
}
```

- **像素风保持：** 是，PixelLab 专为像素艺术设计，不会抗锯齿
- **指定动作：** `action` 字段自由文字描述（"typing at keyboard" / "sleeping in chair" / "reading book"）
- **输出：** PNG 序列帧（透明背景），直接打包 spritesheet
- **API：** 有，`npm install pixellab`（JS SDK，官方 Python SDK）
- **费用：** 积分制按量，注册后查看定价

---

### Viggle AI — 不推荐

- **定位：** 人物视频驱动（把静止人像做成跳舞/动作视频）
- **像素风：** 不保持，输出会被平滑化渲染
- **API：** 无公开 API，只有 Discord Bot 和网页 UI
- **结论：不适用。**

---

### Kling AI（快手）— 不推荐用于像素风

- **定位：** 通用 image-to-video，效果接近 Runway Gen-4
- **像素风：** 不专门支持，输出视频会有抗锯齿，像素锯齿感丢失
- **API：** 有 REST API（需申请，国内平台）
- **输出：** MP4 视频，不是序列帧
- **结论：输出格式不对（视频），且会破坏像素风。**

---

### Pika Labs — 不推荐

- **像素风：** 有社区案例，但不专门优化，风格不稳定
- **API：** 无公开 API（只有网页 UI + Discord）
- **结论：无 API，排除。**

---

### Runway Act-Two — 不推荐

- **工作方式：** 需要提供一段真人表演视频（3-30 秒）作为驱动源，把真人动作迁移到角色上
- **像素风：** 不保持
- **结论：需要真人视频驱动，不是"输入图片+描述"的方式。**

---

### MonsterMash — 已停止服务

Google 旗下项目，网站已下线，无法使用。

---

### PixelOver — 有用，但无 API

- **定位：** 专为像素画设计的动画制作桌面软件
- **像素风：** 完美保持（软件本来就是为像素艺术设计）
- **功能：** 上传静态图 → 手动绑定骨骼 → 指定关键帧 → 导出 GIF/序列帧
- **API：** **无**，只有桌面 UI
- **费用：** $20 买断
- **适用场景：** 手工精修阶段（PixelLab 生成后用 PixelOver 微调）

---

### Live2D — 不推荐

- **问题：** 基于变形网格技术，会对像素图做插值变形，锯齿感被破坏
- **适合：** 高精度插画，不适合像素艺术

---

## 推荐行动方案

**现在可以做的：**

1. 注册 PixelLab 账号，获取 API Key
2. 用以下代码验证 3 张静态图的动画效果：
   ```bash
   PIXELLAB_API_KEY=xxx bun run test-pixellab.ts
   ```
3. 验证通过后，新建 `pixelArtServer.ts` MCP server 集成进产品

**注意事项：**
- `animateWithText` 的 `action` 字段是自由文本，需要实验找到最佳 prompt（"sitting and typing on keyboard"效果比"working"更精确）
- `nFrames` 建议从 4 帧开始测试，确认质量后再增到 8-12 帧
- PixelLab JS SDK 是社区移植版，如遇问题可直接调用 REST API（`https://api.pixellab.ai/v1/animate-with-text`）

---

*架构-阿构 · 2026-04-01*
