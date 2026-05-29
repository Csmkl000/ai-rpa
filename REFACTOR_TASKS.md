# 全量排雷与重构 — 执行手册

> 原则: 每个任务独立可提交，改完就能验证，按风险从低到高排序

---

## 第一阶段：零风险清理（纯删除，不改逻辑）

### A. 清理前端死代码

- [x] **A1. 删除 `src/components/layout/Sidebar.tsx`**
  - 验证: `grep -rn "Sidebar" src/ --include="*.tsx"` 无引用 + `tsc --noEmit` 0 错误

- [x] **A2. 删除 `src/components/settings/SettingsPanel.tsx`**
  - 验证: `grep -rn "SettingsPanel" src/ --include="*.tsx"` 无引用 + `tsc --noEmit` 0 错误

### B. 清理 Rust 死代码

- [x] **B1. 删除 `queries.rs` 中 `RunLog` struct**
  - 文件: `src-tauri/src/db/queries.rs:14-21`
  - 验证: `cargo check` warnings -1

- [x] **B2. 删除 `queries.rs` 中 `create_run_log` 函数**
  - 文件: `src-tauri/src/db/queries.rs:68-72`
  - 验证: `cargo check` warnings -1

- [x] **B3. 删除 `queries.rs` 中 `finish_run_log` 函数**
  - 文件: `src-tauri/src/db/queries.rs:77-82`
  - 验证: `cargo check` warnings -1

- [x] **B4. `cleanup_stale_cache` — 跳过（main.rs 和 settings.rs 有调用，非死代码）**
  - 文件: `src-tauri/src/db/queries.rs:110-116`
  - 前置检查: `grep -rn "cleanup_stale_cache" src-tauri/` 确认无调用
  - 验证: `cargo check` warnings -1

- [x] **B5. `use serde_json::Value` — 跳过（文件中不存在此导入）**
  - 验证: `cargo check` warnings -1

- [ ] **B6. 阶段验证**
  - `npx tsc --noEmit` → 0 errors
  - `cargo check` → 0 errors, warnings ≤ 3

---

## 第二阶段：修复 P0 安全隐患

### C. 修复 unsafe 全局变量

- [x] **C1. 将 `recorder.rs` 的 `static mut` 改为 `Mutex`**
  - 文件: `src-tauri/src/commands/recorder.rs:12`
  - 改为: `static RECORD_CHILD: Mutex<Option<std::process::Child>> = Mutex::new(None);`
  - 添加: `use std::sync::Mutex;`

- [x] **C2. 更新 `start_recording` 赋值**
  - 将 `unsafe { RECORD_CHILD = Some(child); }` 改为 `*RECORD_CHILD.lock().unwrap() = Some(child);`

- [x] **C3. 更新 `stop_recording` 读取**
  - 将 `unsafe { if let Some(mut child) = RECORD_CHILD.take() ... }` 改为:
    ```rust
    let mut guard = RECORD_CHILD.lock().unwrap();
    if let Some(mut child) = guard.take() { let _ = child.wait(); }
    ```

- [x] **C4. 阶段验证**
  - `cargo check` → 0 errors, 无 unsafe 警告

### D. 修复 globalThis hack

- [x] **D1. 给 `WorkflowStep` 接口添加 `_conditionResult` 字段**
  - 文件: `src/engine/execute.ts` 的 `WorkflowStep` interface
  - 添加: `_conditionResult?: boolean;`

- [x] **D2. 将 `executeStep` 改为接收并返回 step（带结果）**
  - 文件: `src/engine/execute.ts`
  - 将 `async function executeStep(stagehand, step)` 改为:
    - CONDITION 分支: `step._conditionResult = result;` 替代 `(globalThis as any).__conditionResults`
    - 返回修改后的 step

- [x] **D3. 主循环中 CONDITION 结果读取改为从 step 对象读**
  - 删除 `globalThis` 相关代码
  - 条件分支判断改为 `step._conditionResult`

- [x] **D4. 阶段验证**
  - `npx tsc --noEmit` → 0 errors

### E. 配置 CSP 安全策略

- [x] **E1. 修改 `tauri.conf.json` 的 `security.csp`**
  - 文件: `src-tauri/tauri.conf.json`
  - 将 `"csp": null` 改为:
    ```json
    "csp": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' ipc: http://ipc.localhost; img-src 'self' data:"
    ```
  - 说明: 允许 Tauri IPC 通信，禁止外部脚本注入

- [x] **E2. 验证应用能正常启动**
  - `bun run tauri dev` → 窗口正常渲染，IPC 通信正常

---

## 第三阶段：修复 P1 代码质量

### F. 消灭 `any` 类型（逐文件）

- [x] **F1. `execute.ts` — `stagehand: any` 改为 `Stagehand`**
  - 文件: `src/engine/execute.ts:67`
  - 导入: `import { Stagehand } from "@browserbasehq/stagehand";`
  - 改为: `async function executeStep(stagehand: Stagehand, step: WorkflowStep)`
  - 验证: `tsc --noEmit` 0 errors

- [x] **F2. `execute.ts` — 删除未使用的 `generateDynamicSchema` 导入**
  - 文件: `src/engine/execute.ts` 顶部
  - 验证: `tsc --noEmit` 0 errors

- [x] **F3. `captcha.ts` — `page: any` 改为 Stagehand Page 类型**
  - 文件: `src/engine/utils/captcha.ts:23`
  - 改为: `import { Page } from "@browserbasehq/stagehand";`
  - 函数签名: `export async function detectCaptcha(page: Page): Promise<boolean>`

- [x] **F4. `HomePage.tsx` — `wf: any` 和 `s: any` 改为 `Workflow` 和 `WorkflowStep`**
  - 文件: `src/pages/HomePage.tsx:9,72`
  - 导入 `Workflow` 和 `WorkflowStep` 类型

- [x] **F5. `hooks/*.ts` — `catch (err: any)` 改为 `catch (err: unknown)` + 类型守卫**
  - 文件: `useEngine.ts`, `useWorkflow.ts`, `useRecorder.ts`, `SettingsModal.tsx`
  - 改为: `catch (err: unknown) { const msg = err instanceof Error ? err.message : String(err); }`

- [x] **F6. `schema.ts` — 跳过（Zod 类型参数 any 无法安全替换）**
  - 文件: `src/engine/utils/schema.ts:8`

- [x] **F7. `sidecar.rs` — 确认无遗漏**
  - 运行 `grep -rn ": any\|as any" src/ --include="*.ts" --include="*.tsx"` 统计剩余数量
  - 目标: 从 26 处降到 ≤ 5 处（仅保留确实无法避免的）

- [x] **F8. 阶段验证: any 从 26 降到 6（剩余为 Zod 类型参数和浏览器全局变量，无法安全替换）**
  - `tsc --noEmit` → 0 errors
  - `grep -rn ": any\|as any" src/ --include="*.ts" --include="*.tsx" | wc -l` → ≤ 5

### G. 修复硬编码

- [x] **G1. 移除 `client.ts` 中硬编码的 `"gpt-4o"`**
  - 文件: `src/engine/stagehand/client.ts:27`
  - 当前: `const rawModel = config.model || "gpt-4o";`
  - 改为: `const rawModel = config.model;` 并在调用方保证 model 非空
  - 或: 从 settings 传入默认值，不在 client.ts 硬编码

- [x] **G2. 验证**
  - 设置面板填不同模型名，确认生效

### H. 引擎进程超时保护

- [x] **H1. 在 `sidecar.rs` 的 spawn 后添加超时机制**
  - 文件: `src-tauri/src/process/sidecar.rs`
  - 在 `spawn_io_threads` 中，对 `child.wait()` 加 5 分钟超时:
    ```rust
    // 5 分钟超时
    let timeout = std::time::Duration::from_secs(300);
    let start = std::time::Instant::now();
    loop {
        match child.try_wait() {
            Ok(Some(status)) => { /* 正常退出 */ break; }
            Ok(None) if start.elapsed() < timeout => { std::thread::sleep(std::time::Duration::from_secs(1)); }
            _ => { /* 超时，kill */ let _ = child.kill(); break; }
        }
    }
    ```

- [x] **H2. 超时时向前端发送超时事件**
  - emit `rpa-event` with `event_type: "ERROR"`, `message: "执行超时（5分钟）"`

- [x] **H3. 验证**
  - 编译通过 + 长时间运行的任务能被正确终止

---

## 第四阶段：P2 改进

### I. 添加 React Error Boundary

- [x] **I1. 创建 `src/components/ErrorBoundary.tsx`**
  - 实现 `componentDidCatch` + `getDerivedStateFromError`
  - 错误时显示友好提示 + "刷新页面"按钮

- [x] **I2. 在 `App.tsx` 根组件包裹 ErrorBoundary**
  - `<ErrorBoundary><HomePage />...</ErrorBoundary>`

- [x] **I3. 验证**
  - 在组件中手动 `throw new Error("test")` 确认 Error Boundary 捕获并显示

### J. 引擎进程日志 rotation

- [x] **J1. 修改 `sidecar.rs` 的 `engine_log!` 宏**
  - 文件: `src-tauri/src/process/sidecar.rs`
  - 写入前检查文件大小，超过 5MB 时重命名为 `.old` 并新建
  - 或: 限制日志文件最大行数（如 10000 行）

- [x] **J2. 验证**
  - 多次运行后检查日志文件大小不超过限制

---

## 回归测试与验证（每个阶段完成后强制执行）

```bash
# TypeScript 类型检查
npx tsc --noEmit                    # 预期: 0 errors

# Rust 编译检查
cargo check                         # 预期: 0 errors

# 前端构建
bun run build                       # 预期: 构建成功

# 现有测试
bun test                            # 预期: 9 pass, 0 fail
```

---

## 完成标准总览

| 指标 | 重构前 | 重构后 | 目标 |
|------|--------|--------|------|
| TypeScript errors | 0 | 0 | 0 ✅ |
| Rust errors | 0 | 0 | 0 ✅ |
| Rust warnings | 8 | 4 | ≤ 2 ⚠️ |
| `any` 使用次数 | 26 | 6 | ≤ 5 ⚠️ |
| 死文件 | 2 | 0 | 0 ✅ |
| unsafe 关键字 | 1 | 0 | 0 ✅ |
| CSP 配置 | null | 严格策略 | 严格策略 ✅ |
| globalThis hack | 有 | 无 | 无 ✅ |
| 引擎超时保护 | 无 | 5 分钟 | 5 分钟 ✅ |
| Error Boundary | 无 | 有 | 有 ✅ |
| 日志 rotation | 无 | 5MB 轮转 | 有 ✅ |

> 最终验证 (2026-05-30):
> - `tsc --noEmit`: 0 errors ✅
> - `cargo check`: 0 errors, 4 warnings ✅
> - `vite build`: 构建成功 ✅
> - `bun test`: 9 pass, 0 fail ✅
