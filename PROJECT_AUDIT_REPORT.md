# AI-RPA 项目审计报告

> 审计时间: 2026-05-29
> 审计范围: 全部源码 (40 TS/TSX + 13 Rust)

---

## 1. 技术栈全景图

### 前端

| 技术 | 版本 | 状态 | 评价 |
|------|------|------|------|
| React | 19 | 最新 | 正常 |
| TypeScript | 5.6+ | 最新 | 正常 |
| Tailwind CSS | v4 | 最新主版本 | 正常 |
| Vite | v6 | 最新主版本 | 正常 |
| Zustand | v5 | 最新 | 状态管理轻量方案，选型合理 |
| @xyflow/react | v12 | 最新 | 流程图库，前身 ReactFlow |
| Zod | v3 | 最新 | Schema 校验，Stagehand 依赖 |

### 后端 (Rust)

| 技术 | 版本 | 状态 | 评价 |
|------|------|------|------|
| Tauri | v2 | 最新 | 桌面壳，选型正确 |
| rusqlite | 0.32 | 落后一个次版本 | 最新 0.33，建议升级 |
| tokio | v1 | 最新 | 异步运行时 |
| serde/serde_json | v1 | 最新 | 序列化标准 |

### 执行引擎

| 技术 | 版本 | 状态 | 评价 |
|------|------|------|------|
| Stagehand | v3 | 最新 | 核心自动化库 |
| OpenAI SDK | v4 | 最新 | LLM 调用 |
| Bun | 1.3 | 较新 | 引擎运行时 |

**总结**: 依赖全面较新，无严重过时库。`rusqlite` 可小版本升级。

---

## 2. 架构拓扑解析

```
/home/model-rpa/
├── src/                           # React 前端
│   ├── main.tsx                   # 入口
│   ├── App.tsx                    # 根组件 (路由: 首页/编辑页)
│   ├── pages/
│   │   └── HomePage.tsx           # 首页 (工作流列表)
│   ├── components/
│   │   ├── layout/                # 布局组件 (TopBar, BottomPanel, StatusBar)
│   │   ├── canvas/                # React Flow 画布 + 7 种节点
│   │   ├── data/                  # 数据预览
│   │   └── settings/              # 设置弹窗
│   ├── hooks/                     # 业务逻辑 (useEngine, useWorkflow, useRecorder)
│   ├── stores/                    # Zustand 状态 (appStore, workflowStore)
│   ├── types/                     # 类型定义
│   └── lib/                       # 工具 (logger, tauri)
│
├── src/engine/                    # Bun 执行引擎 (独立进程)
│   ├── execute.ts                 # 工作流执行入口
│   ├── record.ts                  # 智能录制入口
│   ├── stagehand/client.ts        # Stagehand 实例管理
│   ├── actions/                   # 5 种动作执行器
│   ├── protocol/messages.ts       # stdout 消息协议
│   └── utils/                     # 工具 (schema, captcha, stealth, recorder)
│
├── src-tauri/                     # Rust 主进程
│   ├── src/main.rs                # 入口 + 命令注册
│   ├── src/commands/              # 7 个 IPC 命令模块
│   ├── src/db/                    # SQLite 数据库层
│   └── src/process/sidecar.rs     # Bun 进程管理
│
└── tests/                         # 测试 (仅 1 个文件)
```

### 核心数据流

```
用户操作 (React UI)
    │
    ├── invoke("run_workflow") ──→ Rust (commands/engine.rs)
    │                                   │
    │                                   ├── 读取设置 (DB)
    │                                   ├── 写 workflow JSON 到临时文件
    │                                   └── spawn bun execute.ts
    │                                         │
    │                                         ├── Stagehand.init()
    │                                         ├── 逐 step 执行
    │                                         │   ├── GOTO → newPage
    │                                         │   ├── ACT → stagehand.act()
    │                                         │   ├── EXTRACT → stagehand.extract()
    │                                         │   └── LOOP → 循环 body
    │                                         │
    │                                         └── stdout → [事件名] JSON
    │
    ├── listen("rpa-event") ←──── Rust (解析 stdout, emit 到前端)
    │
    └── 更新 UI (节点状态灯, 日志, 数据)
```

---

## 3. 高危技术债清单

### P0 — 必须修复

| # | 问题 | 位置 | 影响 |
|---|------|------|------|
| 1 | **CSP 设为 null** | `tauri.conf.json:security.csp` | 生产环境无 XSS 防护，恶意网页可注入脚本 |
| 2 | **globalThis hack 存储条件结果** | `execute.ts:92-93` | 用 `(globalThis as any).__conditionResults` 存状态，极度脆弱，多实例会互相污染 |
| 3 | **sidecar.rs 使用 unsafe 全局变量存子进程** | `recorder.rs:12` | `static mut RECORD_CHILD` 是 unsafe，多线程下未定义行为 |

### P1 — 应该修复

| # | 问题 | 位置 | 影响 |
|---|------|------|------|
| 4 | **26 处 `any` 类型** | 散布各文件 | TypeScript 严格模式形同虚设，类型安全失效 |
| 5 | **2 个死文件未清理** | `Sidebar.tsx`, `SettingsPanel.tsx` | 无人引用，增加维护困惑 |
| 6 | **测试覆盖率极低** | `tests/engine.test.ts` (108 行) | 仅引擎 schema 测试，前端/后端/集成零覆盖 |
| 7 | **8 个 Rust warnings** | `queries.rs` (RunLog, create_run_log, finish_run_log, cleanup_stale_cache 未使用) | 死代码，编译噪音 |
| 8 | **execute.ts 中 stagehand 参数类型为 any** | `execute.ts:67` | `executeStep(stagehand: any, ...)` 丢失类型信息 |
| 9 | **硬编码默认模型 "gpt-4o"** | `client.ts:27` | 应从配置读取，不应硬编码 |
| 10 | **引擎进程无超时保护** | `sidecar.rs` spawn 后无限等待 | 引擎卡死时用户无法感知，只能手动 kill |

### P2 — 建议改进

| # | 问题 | 位置 | 影响 |
|---|------|------|------|
| 11 | **无 React Error Boundary** | `App.tsx` | 前端运行时错误直接白屏 |
| 12 | **logger 不持久化** | `lib/logger.ts` | 刷新页面日志丢失 |
| 13 | **SettingsPanel.tsx 是死代码** | 已被 SettingsModal.tsx 替代 | 应删除 |
| 14 | **无国际化支持** | 全局 | 硬编码中文字符串 |
| 15 | **sidecar.rs 日志写文件无 rotation** | `engine_log!` 宏 | 日志文件无限增长 |

---

## 4. 前 3 步重构路线图

### 第 1 步：修复 P0 安全隐患

- 配置 Tauri CSP 策略（至少限制 script-src 和 connect-src）
- 将 `globalThis.__conditionResults` 改为通过 step 数据传递
- 将 `static mut RECORD_CHILD` 改为 `Mutex<Option<Child>>`

### 第 2 步：消灭 any + 清理死代码

- 为 Stagehand 的 page/stagehand 对象定义接口类型
- 删除 `Sidebar.tsx` 和 `SettingsPanel.tsx`
- 删除 `queries.rs` 中未使用的 `RunLog`, `create_run_log`, `finish_run_log`, `cleanup_stale_cache`
- 将 `executeStep` 的 `stagehand: any` 改为 `Stagehand`

### 第 3 步：补测试 + 加 Error Boundary

- 为 React 关键组件加 Error Boundary
- 为 `execute.ts` 的主循环加单元测试（mock stagehand）
- 为 Rust 命令层加集成测试（内存数据库）
- 引擎进程加 5 分钟超时保护

---

## 统计摘要

| 指标 | 值 |
|------|-----|
| 源文件总数 | 53 (40 TS + 13 Rust) |
| 总代码行数 | ~4500 |
| 最大文件 | sidecar.rs (265 行) |
| TypeScript 错误 | 0 |
| Rust warnings | 8 |
| `any` 使用次数 | 26 |
| 死文件 | 2 |
| 测试文件 | 1 (108 行) |
| 测试覆盖率 | 极低 |
| 安全问题 | 1 P0 (CSP null) |
