# Team Permission Level Mapping

Team 模式下 leader 与 member 之间的权限等级映射规则。

## 背景

AionUi 是多 Agent 平台，team 模式下 leader 和 member 可能是不同后端（Claude、Gemini、Codex 等），各后端的权限 mode 名称和粒度不一致。需要一套统一的映射机制，保证：

- **leader 不弹框，成员绝对不弹框**（第一优先级）
- **leader 弹框，成员尽量也弹框**（第二优先级）
- leader 配置完权限模式后，所有成员自动生效对应等级

## 权限等级定义

| 等级 | 名称     | 含义                             | 用户感受             |
| ---- | -------- | -------------------------------- | -------------------- |
| L0   | Locked   | 只读/只问，不编辑不执行命令      | 不弹框（不调工具）   |
| L1   | Default  | 所有操作都需要用户确认           | 每次都弹             |
| L2   | AutoEdit | 文件编辑自动过，shell 命令需确认 | 偶尔弹（只有命令类） |
| L3   | FullAuto | 全部自动过，不弹框               | 从不弹               |

## 各后端 Mode → Level 映射

### Claude

| mode                | level | 说明                                                                                                                   |
| ------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------- |
| `plan`              | L0    | 只规划不执行                                                                                                           |
| `dontAsk`           | L3    | 仅预批准：匹配规则的自动执行，不匹配的直接拒绝，从不弹框。用户选此模式的核心诉求是"别烦我"，映射到 L3 保证成员也不弹框 |
| `default`           | L1    | 标准模式，全部需确认                                                                                                   |
| `acceptEdits`       | L2    | 文件编辑自动过，命令需确认                                                                                             |
| `bypassPermissions` | L3    | 全自动（YOLO）                                                                                                         |

### Gemini

| mode       | level | 说明                              |
| ---------- | ----- | --------------------------------- |
| `default`  | L1    | 标准模式                          |
| `autoEdit` | L2    | 编辑和读取自动过，exec/mcp 需确认 |
| `yolo`     | L3    | 全自动                            |

### Codex

| mode            | level | 说明                            |
| --------------- | ----- | ------------------------------- |
| `default`       | L1    | Plan 模式（沙盒内，全部需确认） |
| `autoEdit`      | L2    | 编辑自动过                      |
| `yolo`          | L3    | 全自动（沙盒内）                |
| `yoloNoSandbox` | L3    | 全自动（无沙盒）                |

### Qwen

| mode      | level | 说明     |
| --------- | ----- | -------- |
| `default` | L1    | 标准模式 |
| `yolo`    | L3    | 全自动   |

> 无 L0、L2。映射时就近取（见策略说明）。

### iFlow

| mode      | level | 说明                                |
| --------- | ----- | ----------------------------------- |
| `plan`    | L0    | 规划模式                            |
| `default` | L1    | 标准模式                            |
| `smart`   | L2    | 智能模式（待确认是否等同 AutoEdit） |
| `yolo`    | L3    | 全自动                              |

### Aionrs

| mode        | level | 说明       |
| ----------- | ----- | ---------- |
| `default`   | L1    | 标准模式   |
| `auto_edit` | L2    | 编辑自动过 |
| `yolo`      | L3    | 全自动     |

### Cursor

| mode    | level | 说明                                   |
| ------- | ----- | -------------------------------------- |
| `ask`   | L0    | 问答模式，不编辑不执行                 |
| `plan`  | L0    | 规划模式，只读（与其他后端 plan 一致） |
| `agent` | L3    | Agent 模式，完整工具访问               |

> 无 L1、L2。L1 就近取 L0 `plan`（严格侧）；L2 就近取视 leader 方向而定。

### OpenCode

| mode    | level | 说明     |
| ------- | ----- | -------- |
| `plan`  | L0    | 规划模式 |
| `build` | L2    | 构建模式 |

> 无 L1、L3。映射时就近取；L3 映射到 `build`（该后端 ceiling），**需系统层兜底**。

## 无精确匹配时的策略

**就近取（Follow the Leader）**：当 member 后端没有目标等级的精确 mode 时，选该后端中**最接近 leader 等级**的可用 mode。

规则：

1. 优先选距离最近的等级
2. 等距时按 leader 所在方向取：leader 偏宽松则取宽松侧，leader 偏严格则取严格侧
3. 当 member 最高等级仍低于 leader → Manager 层系统兜底自动批准（保证"leader 不弹成员也不弹"）

示例：

- Leader L3，Qwen 只有 L1/L3 → 精确匹配 L3 → `yolo`
- Leader L2，Qwen 只有 L1/L3 → 等距，leader 在宽松侧 → 取 L3 `yolo`
- Leader L1，OpenCode 只有 L0/L2 → 等距，leader 在严格侧 → 取 L0 `plan`
- Leader L1，Cursor 只有 L0/L3 → L0 距离 1 更近 → 取 L0 `plan`

## Level → Mode 映射表

基于上述策略，各后端在每个目标等级的映射结果。等距情况标注了两个方向的取值。

| 后端     | L0 →        | L1 →                  | L2 →                  | L3 →                | 备注                                                                   |
| -------- | ----------- | --------------------- | --------------------- | ------------------- | ---------------------------------------------------------------------- |
| Claude   | `plan`      | `default`             | `acceptEdits`         | `bypassPermissions` | 全覆盖（`dontAsk` 也归 L3，但只在 leader 为 Claude 且选 dontAsk 时用） |
| Gemini   | `default` ↓ | `default`             | `autoEdit`            | `yolo`              | L0 就近取 L1                                                           |
| Codex    | `default` ↓ | `default`             | `autoEdit`            | `yolo`              | L0 就近取 L1                                                           |
| Qwen     | `default` ↓ | `default`             | `yolo` ↑              | `yolo`              | L0→L1; L2 等距取宽松侧                                                 |
| iFlow    | `plan`      | `default`             | `smart`               | `yolo`              | 全覆盖                                                                 |
| Aionrs   | `default` ↓ | `default`             | `auto_edit`           | `yolo`              | L0 就近取 L1                                                           |
| Cursor   | `ask`       | `plan` ↓              | `agent` ↑ or `plan` ↓ | `agent`             | L1→L0; L2 等距视 leader 方向                                           |
| OpenCode | `plan`      | `plan` ↓ or `build` ↑ | `build`               | `build` ⚠           | L1 等距视 leader 方向; L3 取 ceiling                                   |

↑ = 就近取了更宽松等级 ↓ = 就近取了更严格等级
⚠ = 该后端最高等级仍低于目标，需 Manager 层系统兜底自动批准

## 完整映射表

查找方式：先在左侧找到 Leader 后端 → 再找 Member 后端 → 右侧 L0-L3 列即为该 member 在每个权限等级应使用的 mode。

Leader 的哪个 mode 对应哪个 Level，见上方"各后端 Mode → Level 映射"章节。

| Leader       | Member   | L0          | L1        | L2            | L3                  |
| ------------ | -------- | ----------- | --------- | ------------- | ------------------- |
| **Claude**   | Gemini   | `default` ↓ | `default` | `autoEdit`    | `yolo`              |
|              | Codex    | `default` ↓ | `default` | `autoEdit`    | `yolo`              |
|              | Qwen     | `default` ↓ | `default` | `yolo` ↑      | `yolo`              |
|              | iFlow    | `plan`      | `default` | `smart`       | `yolo`              |
|              | Aionrs   | `default` ↓ | `default` | `auto_edit`   | `yolo`              |
|              | Cursor   | `ask`       | `plan` ↓  | `agent` ↑     | `agent`             |
|              | OpenCode | `plan`      | `plan` ↓  | `build`       | `build` ⚠           |
| **Gemini**   | Claude   | `plan`      | `default` | `acceptEdits` | `bypassPermissions` |
|              | Codex    | `default` ↓ | `default` | `autoEdit`    | `yolo`              |
|              | Qwen     | `default` ↓ | `default` | `yolo` ↑      | `yolo`              |
|              | iFlow    | `plan`      | `default` | `smart`       | `yolo`              |
|              | Aionrs   | `default` ↓ | `default` | `auto_edit`   | `yolo`              |
|              | Cursor   | `ask`       | `plan` ↓  | `agent` ↑     | `agent`             |
|              | OpenCode | `plan`      | `plan` ↓  | `build`       | `build` ⚠           |
| **Codex**    | Claude   | `plan`      | `default` | `acceptEdits` | `bypassPermissions` |
|              | Gemini   | `default` ↓ | `default` | `autoEdit`    | `yolo`              |
|              | Qwen     | `default` ↓ | `default` | `yolo` ↑      | `yolo`              |
|              | iFlow    | `plan`      | `default` | `smart`       | `yolo`              |
|              | Aionrs   | `default` ↓ | `default` | `auto_edit`   | `yolo`              |
|              | Cursor   | `ask`       | `plan` ↓  | `agent` ↑     | `agent`             |
|              | OpenCode | `plan`      | `plan` ↓  | `build`       | `build` ⚠           |
| **Qwen**     | Claude   | `plan`      | `default` | `acceptEdits` | `bypassPermissions` |
|              | Gemini   | `default` ↓ | `default` | `autoEdit`    | `yolo`              |
|              | Codex    | `default` ↓ | `default` | `autoEdit`    | `yolo`              |
|              | iFlow    | `plan`      | `default` | `smart`       | `yolo`              |
|              | Aionrs   | `default` ↓ | `default` | `auto_edit`   | `yolo`              |
|              | Cursor   | `ask`       | `plan` ↓  | `agent` ↑     | `agent`             |
|              | OpenCode | `plan`      | `plan` ↓  | `build`       | `build` ⚠           |
| **iFlow**    | Claude   | `plan`      | `default` | `acceptEdits` | `bypassPermissions` |
|              | Gemini   | `default` ↓ | `default` | `autoEdit`    | `yolo`              |
|              | Codex    | `default` ↓ | `default` | `autoEdit`    | `yolo`              |
|              | Qwen     | `default` ↓ | `default` | `yolo` ↑      | `yolo`              |
|              | Aionrs   | `default` ↓ | `default` | `auto_edit`   | `yolo`              |
|              | Cursor   | `ask`       | `plan` ↓  | `agent` ↑     | `agent`             |
|              | OpenCode | `plan`      | `plan` ↓  | `build`       | `build` ⚠           |
| **Aionrs**   | Claude   | `plan`      | `default` | `acceptEdits` | `bypassPermissions` |
|              | Gemini   | `default` ↓ | `default` | `autoEdit`    | `yolo`              |
|              | Codex    | `default` ↓ | `default` | `autoEdit`    | `yolo`              |
|              | Qwen     | `default` ↓ | `default` | `yolo` ↑      | `yolo`              |
|              | iFlow    | `plan`      | `default` | `smart`       | `yolo`              |
|              | Cursor   | `ask`       | `plan` ↓  | `agent` ↑     | `agent`             |
|              | OpenCode | `plan`      | `plan` ↓  | `build`       | `build` ⚠           |
| **Cursor**   | Claude   | `plan`      | `default` | `acceptEdits` | `bypassPermissions` |
|              | Gemini   | `default` ↓ | `default` | `autoEdit`    | `yolo`              |
|              | Codex    | `default` ↓ | `default` | `autoEdit`    | `yolo`              |
|              | Qwen     | `default` ↓ | `default` | `yolo` ↑      | `yolo`              |
|              | iFlow    | `plan`      | `default` | `smart`       | `yolo`              |
|              | Aionrs   | `default` ↓ | `default` | `auto_edit`   | `yolo`              |
|              | OpenCode | `plan`      | `plan` ↓  | `build`       | `build` ⚠           |
| **OpenCode** | Claude   | `plan`      | `default` | `acceptEdits` | `bypassPermissions` |
|              | Gemini   | `default` ↓ | `default` | `autoEdit`    | `yolo`              |
|              | Codex    | `default` ↓ | `default` | `autoEdit`    | `yolo`              |
|              | Qwen     | `default` ↓ | `default` | `yolo` ↑      | `yolo`              |
|              | iFlow    | `plan`      | `default` | `smart`       | `yolo`              |
|              | Aionrs   | `default` ↓ | `default` | `auto_edit`   | `yolo`              |
|              | Cursor   | `ask`       | `plan` ↓  | `agent` ↑     | `agent`             |

↑ = 无精确匹配，就近取了更宽松等级（已知取舍）
↓ = 无精确匹配，就近取了更严格等级
⚠ = member 后端 ceiling 低于 leader 等级，需 Manager 层系统兜底自动批准

## 已知取舍

### Member 比 leader 更宽松的情况

在以下场景中，由于就近取策略，member 会比 leader 稍微更宽松：

| Leader 等级   | Member 后端 | Member 映射到 | 差异                               |
| ------------- | ----------- | ------------- | ---------------------------------- |
| L2 (AutoEdit) | Qwen        | L3 `yolo`     | member 对命令也自动过，leader 会弹 |
| L2 (AutoEdit) | Cursor      | L3 `agent`    | 同上                               |

这是设计取舍：优先保证"leader 不弹成员不弹"（第一优先级），代价是在 L2 场景下 Qwen/Cursor 的 member 比 leader 更宽松。用户不会因此被弹框打扰，差异是静默的。

如果未来需要严格控制"成员不能比 leader 更宽松"，需要在 Manager 层实现反向拦截（拦截 member CLI 自动批准的操作，改为走审批流程）。反向拦截暂未实现，预留扩展点。

## 系统兜底（Manager 层自动批准）

当 member 后端的最高可用等级仍低于 leader 等级时（表中标 ⚠ 的情况），映射表无法完全覆盖。此时需要在 AionUi 的 Manager 层（`AcpAgentManager` / `GeminiAgentManager`）做兜底：

- 检测 leader 等级 > member 实际可达最高等级
- 对 member 发出的权限请求直接自动批准
- 确保用户不会看到弹框

当前触发此逻辑的后端：**OpenCode**（最高 L2，leader 为 L3 时需要兜底）。

## 反向场景说明（leader 严格，member 偏宽松）

**当 leader 在 L0 或 L1 时**：所有已知后端都有 `default`（L1）或更严格的模式，反向映射不会出现 member 比 leader 更宽松的情况。

**当 leader 在 L2 时**：Qwen 和 Cursor 因无 L2 等效模式，就近取到 L3，member 比 leader 更宽松。这是已知取舍（见上方"已知取舍"章节）。

**未来风险**：如果新接入后端只有 `yolo`（无 `default`），即使 leader 在 L0/L1，member 也会被迫更宽松。届时需要在 Manager 层做反向拦截。反向拦截暂未实现，预留扩展点。

## 待确认项

- [ ] iFlow `smart` 是否等同于 AutoEdit (L2)？需确认实际行为
- [ ] OpenCode 的 L3 兜底是否在本次实现？
