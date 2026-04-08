# 虚拟办公室 — 团队工作状态

> 最后更新：2026-04-02 18:00
> 当前阶段：第二步（架构+技术方案）→ 第三步（demo开发）过渡中
> 状态：用户下班，全员idle，明天唤醒继续

---

## 进度总览

| 步骤 | 状态 | 说明 |
|------|------|------|
| 第一步 需求框架 | ✅ 完成 | PRD+设计+流程定稿，用户裁决15条 |
| 第二步 架构+技术方案 | ✅ 90% | 架构方案完成，PixelLab API流程已确认 |
| 第三步 开发（demo） | 🔄 30% | 老锤完成脚本+移动系统，待跑API生成资产 |
| 第四步 测试 | 待启动 | |
| 第五步 分阶段交付 | 待启动 | |

---

## 用户裁决（共15条）

1. 等级和经验条：不要
2. 记忆系统：核心，持久化
3. 员工数量：不限
4. 家具布局：暂时固定
5. 骨骼动画：P0必做
6. 通讯入口：电脑屏幕上
7. 床：暂时不交互
8. 点空白关抽屉：是
9. H/S/P进度条：不显示
10. 场景视角：横版侧视
11. 美术资源：自绘
12. 不花钱买Spine
13. 整个应用都要像素风
14. 可对接其他AI模型（API Key）生成像素素材
15. 第一阶段要完整体验（真实Agent数据驱动）

---

## 当前方案：分层合成（已确认）

**核心思路：固定房间背景 + PixelLab骨骼动画角色叠加**

1. Pixflux 生成房间背景（400×220，无角色）— 固定不变
2. Bitforge 生成角色（128×128，透明背景，style_image风格约束）
3. Estimate Skeleton → 提取18个骨骼关键点
4. Animate with Skeleton → 3状态(working/sleeping/noting) × 4帧
5. RoomDemo.tsx 合成展示（背景 + 角色叠加，状态切换时角色移动）

**PixelLab 账号状态：** Tier 1 Pixel Apprentice，2000次/月，Key: 3cfb5c9a

---

## 老锤已完成的工作

| 产出 | 文件 | 状态 |
|------|------|------|
| AI场景帧（旧方案）| public/assets/scenes/ | 已废弃（房间不一致） |
| ScenePlayer（旧）| src/SceneCharacter.ts + App.tsx | 已废弃 |
| PixelLab生成脚本 | scripts/generate-character-sprites.mjs | ✅ 待运行 |
| 角色移动系统 | src/RoomCharacter.ts | ✅ 完成 |
| RoomDemo.tsx | 未创建 | 待做 |

---

## 明天待做

| 成员 | 任务 |
|------|------|
| 老锤 | 1. 运行generate-character-sprites.mjs生成资产 2. 新建RoomDemo.tsx 3. 接入App.tsx |
| 阿点 | 审核生成的角色/背景美术质量 |
| 其他 | 待分配 |

---

## 架构方案（老尺，已完成）

- S1 记忆写入：A实例完成后Haiku异步写摘要
- S2 记忆注入：3层智能系统（Layer0索引+Layer1 Haiku选择+Layer2深度注入≤16KB）
- S3 状态推送：复用IPC事件链路
- S4 Canvas/DOM：Canvas管hitbox，面板全DOM
- S5 三实例：复用WorkerTaskManager，B用一次性LLM
- 开发顺序：S5→S3→S2→S1，S4独立

---

## 技术方向

| 项目 | 结论 |
|------|------|
| Canvas引擎 | PixiJS 7（或纯HTML img叠加） |
| 动画方案 | PixelLab Animate with Skeleton（骨骼动画） |
| 美术生成 | PixelLab API（Bitforge+Pixflux），Tier 1 已充值 |
| 视角 | 横版侧视 |
| 风格 | 温暖lofi像素风（全应用） |
| 记忆 | 3层智能注入 |
| 推送 | 复用IPC事件 |

---

*用户下班，明天继续*
