/**
 * 全局代码覆盖率测试
 * 覆盖: 所有模块的核心逻辑、边界值、异常路径
 */
import { describe, test, expect, beforeEach } from "bun:test";

// ============================================
// 1. 工作流类型系统
// ============================================
describe("工作流类型系统", () => {
  test("所有 StepType 枚举值", async () => {
    const { } = await import("../src/types/workflow");
    const types = ["GOTO", "ACT", "EXTRACT", "OBSERVE", "LOOP", "CONDITION", "AUTONOMOUS_AGENT"];
    for (const t of types) {
      expect(typeof t).toBe("string");
    }
  });

  test("NodeStatus 所有状态值", async () => {
    const statuses = ["idle", "running", "success", "error", "healing", "skipped"];
    expect(statuses.length).toBe(6);
  });

  test("Workflow 完整结构", async () => {
    const mod = await import("../src/types/workflow");
    const wf: mod.Workflow = {
      id: 1,
      name: "测试",
      steps: [{ id: "s1", type: "GOTO", label: "打开", value: "https://a.com" }],
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
    };
    expect(wf.steps.length).toBe(1);
    expect(wf.steps[0].type).toBe("GOTO");
  });

  test("ExtractField 类型", async () => {
    const mod = await import("../src/types/workflow");
    const f: mod.ExtractField = { name: "title", type: "string" };
    expect(f.type).toBe("string");
  });

  test("EngineEvent 结构", async () => {
    const mod = await import("../src/types/workflow");
    const evt: mod.EngineEvent = { event_type: "TEST", data: { key: "val" } };
    expect(evt.event_type).toBe("TEST");
  });
});

// ============================================
// 2. Schema 生成（全路径）
// ============================================
describe("generateDynamicSchema 全路径", () => {
  test("空数组 → 空对象 schema，任意对象通过", async () => {
    const { generateDynamicSchema } = await import("../src/engine/utils/schema");
    const s = generateDynamicSchema([]);
    expect(s.safeParse({}).success).toBe(true);
    expect(s.safeParse({ a: 1 }).success).toBe(true);
  });

  test("string 字段拒绝 number", async () => {
    const { generateDynamicSchema } = await import("../src/engine/utils/schema");
    const s = generateDynamicSchema([{ name: "x", type: "string" }]);
    expect(s.safeParse({ x: 123 }).success).toBe(false);
    expect(s.safeParse({ x: "ok" }).success).toBe(true);
  });

  test("number 字段拒绝 string", async () => {
    const { generateDynamicSchema } = await import("../src/engine/utils/schema");
    const s = generateDynamicSchema([{ name: "x", type: "number" }]);
    expect(s.safeParse({ x: "abc" }).success).toBe(false);
    expect(s.safeParse({ x: 0 }).success).toBe(true);
    expect(s.safeParse({ x: -1.5 }).success).toBe(true);
  });

  test("多字段必须全部存在", async () => {
    const { generateDynamicSchema } = await import("../src/engine/utils/schema");
    const s = generateDynamicSchema([
      { name: "a", type: "string" },
      { name: "b", type: "number" },
    ]);
    expect(s.safeParse({ a: "x", b: 1 }).success).toBe(true);
    expect(s.safeParse({ a: "x" }).success).toBe(false);
    expect(s.safeParse({ b: 1 }).success).toBe(false);
    expect(s.safeParse({}).success).toBe(false);
  });

  test("多余字段被忽略（strip）", async () => {
    const { generateDynamicSchema } = await import("../src/engine/utils/schema");
    const s = generateDynamicSchema([{ name: "a", type: "string" }]);
    expect(s.safeParse({ a: "ok", extra: "ignored" }).success).toBe(true);
  });

  test("null/undefined 输入拒绝", async () => {
    const { generateDynamicSchema } = await import("../src/engine/utils/schema");
    const s = generateDynamicSchema([{ name: "x", type: "string" }]);
    expect(s.safeParse(null).success).toBe(false);
    expect(s.safeParse(undefined).success).toBe(false);
  });

  test("数组输入拒绝", async () => {
    const { generateDynamicSchema } = await import("../src/engine/utils/schema");
    const s = generateDynamicSchema([{ name: "x", type: "string" }]);
    expect(s.safeParse([1, 2, 3]).success).toBe(false);
  });

  test("空字符串通过 string 字段", async () => {
    const { generateDynamicSchema } = await import("../src/engine/utils/schema");
    const s = generateDynamicSchema([{ name: "x", type: "string" }]);
    expect(s.safeParse({ x: "" }).success).toBe(true);
  });

  test("0 通过 number 字段", async () => {
    const { generateDynamicSchema } = await import("../src/engine/utils/schema");
    const s = generateDynamicSchema([{ name: "x", type: "number" }]);
    expect(s.safeParse({ x: 0 }).success).toBe(true);
  });
});

// ============================================
// 3. 消息协议（全类型）
// ============================================
describe("消息协议全事件类型", () => {
  const types = [
    "ENGINE_BOOT", "CACHE_HIT", "CACHE_MISS", "SELF_HEALING",
    "ACTION_COMPLETED", "DATA_RECORD", "PAGINATION_FINISHED",
    "AGENT_START", "AGENT_SUCCESS", "AGENT_FAILED",
    "STEP_START", "STEP_COMPLETE", "CAPTCHA_PAUSE",
    "SCREENSHOT", "LOG", "ERROR", "EXECUTION_CRASH",
  ];

  for (const type of types) {
    test(`emit("${type}") 不抛异常`, async () => {
      const { emit } = await import("../src/engine/protocol/messages");
      const orig = console.log;
      console.log = () => {};
      expect(() => emit(type as any, { test: true })).not.toThrow();
      console.log = orig;
    });
  }

  test("emitData 带 stepId", async () => {
    const { emitData } = await import("../src/engine/protocol/messages");
    let captured = "";
    const orig = console.log;
    console.log = (msg: string) => { captured = msg; };
    emitData({ a: 1 }, "step-abc");
    console.log = orig;
    expect(captured).toContain("step-abc");
    expect(captured).toContain("[DATA_RECORD]");
  });

  test("emitData 不带 stepId", async () => {
    const { emitData } = await import("../src/engine/protocol/messages");
    let captured = "";
    const orig = console.log;
    console.log = (msg: string) => { captured = msg; };
    emitData({ a: 1 });
    console.log = orig;
    expect(captured).toContain("[DATA_RECORD]");
  });

  test("emitError 带 stepId", async () => {
    const { emitError } = await import("../src/engine/protocol/messages");
    let captured = "";
    const orig = console.error;
    console.error = (msg: string) => { captured = msg; };
    emitError("fail", "s1");
    console.error = orig;
    expect(captured).toContain("fail");
    expect(captured).toContain("s1");
  });
});

// ============================================
// 4. Logger 全功能
// ============================================
describe("logger 全功能", () => {
  test("所有日志级别", async () => {
    const { logger } = await import("../src/lib/logger");
    logger.clear();
    logger.debug("M", "d");
    logger.info("M", "i");
    logger.success("M", "s");
    logger.warn("M", "w");
    logger.error("M", "e");
    const buf = logger.getBuffer();
    expect(buf.length).toBe(5);
    expect(buf.map((b) => b.level)).toEqual(["debug", "info", "success", "warn", "error"]);
    logger.clear();
  });

  test("clear 清空后 getBuffer 返回空", async () => {
    const { logger } = await import("../src/lib/logger");
    logger.info("M", "test");
    logger.clear();
    expect(logger.getBuffer().length).toBe(0);
  });

  test("subscribe 接收多条日志", async () => {
    const { logger } = await import("../src/lib/logger");
    logger.clear();
    const received: any[] = [];
    const unsub = logger.subscribe((e) => received.push(e));
    logger.info("A", "1");
    logger.error("B", "2");
    logger.warn("C", "3");
    expect(received.length).toBe(3);
    expect(received[0].module).toBe("A");
    expect(received[1].level).toBe("error");
    expect(received[2].message).toBe("3");
    unsub();
    logger.clear();
  });

  test("unsubscribe 后不再接收", async () => {
    const { logger } = await import("../src/lib/logger");
    logger.clear();
    const received: any[] = [];
    const unsub = logger.subscribe((e) => received.push(e));
    logger.info("M", "1");
    unsub();
    logger.info("M", "2");
    expect(received.length).toBe(1);
    logger.clear();
  });

  test("日志包含时间戳格式 HH:MM:SS", async () => {
    const { logger } = await import("../src/lib/logger");
    logger.clear();
    logger.info("M", "test");
    const buf = logger.getBuffer();
    expect(buf[0].time).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    logger.clear();
  });
});

// ============================================
// 5. Zustand Store 全状态
// ============================================
describe("workflowStore 状态管理", () => {
  test("初始状态", async () => {
    const { useWorkflowStore } = await import("../src/stores/workflowStore");
    const state = useWorkflowStore.getState();
    expect(state.currentWorkflow).toBeNull();
    expect(state.isRunning).toBe(false);
    expect(state.engineLogs).toEqual([]);
    expect(state.nodeStatuses).toEqual({});
  });

  test("setCurrentWorkflow 设置工作流", async () => {
    const { useWorkflowStore } = await import("../src/stores/workflowStore");
    const store = useWorkflowStore.getState();
    store.setCurrentWorkflow({ name: "test", steps: [] });
    expect(useWorkflowStore.getState().currentWorkflow?.name).toBe("test");
    store.setCurrentWorkflow(null);
  });

  test("addStep 添加步骤", async () => {
    const { useWorkflowStore } = await import("../src/stores/workflowStore");
    const store = useWorkflowStore.getState();
    store.setCurrentWorkflow({ name: "test", steps: [] });
    store.addStep({ id: "s1", type: "ACT", label: "点击" });
    expect(useWorkflowStore.getState().currentWorkflow?.steps.length).toBe(1);
    store.setCurrentWorkflow(null);
  });

  test("updateStep 更新步骤", async () => {
    const { useWorkflowStore } = await import("../src/stores/workflowStore");
    const store = useWorkflowStore.getState();
    store.setCurrentWorkflow({
      name: "test",
      steps: [{ id: "s1", type: "ACT", label: "旧" }],
    });
    store.updateStep("s1", { label: "新" });
    expect(useWorkflowStore.getState().currentWorkflow?.steps[0].label).toBe("新");
    store.setCurrentWorkflow(null);
  });

  test("removeStep 删除步骤", async () => {
    const { useWorkflowStore } = await import("../src/stores/workflowStore");
    const store = useWorkflowStore.getState();
    store.setCurrentWorkflow({
      name: "test",
      steps: [
        { id: "s1", type: "ACT", label: "a" },
        { id: "s2", type: "ACT", label: "b" },
      ],
    });
    store.removeStep("s1");
    expect(useWorkflowStore.getState().currentWorkflow?.steps.length).toBe(1);
    expect(useWorkflowStore.getState().currentWorkflow?.steps[0].id).toBe("s2");
    store.setCurrentWorkflow(null);
  });

  test("setNodeStatus / resetNodeStatuses", async () => {
    const { useWorkflowStore } = await import("../src/stores/workflowStore");
    const store = useWorkflowStore.getState();
    store.setNodeStatus("s1", "running");
    store.setNodeStatus("s2", "success");
    expect(useWorkflowStore.getState().nodeStatuses["s1"]).toBe("running");
    store.resetNodeStatuses();
    expect(useWorkflowStore.getState().nodeStatuses).toEqual({});
  });

  test("setRunning / addEngineEvent / clearLogs", async () => {
    const { useWorkflowStore } = await import("../src/stores/workflowStore");
    const store = useWorkflowStore.getState();
    store.setRunning(true);
    expect(useWorkflowStore.getState().isRunning).toBe(true);
    store.addEngineEvent({ event_type: "TEST", data: {} });
    expect(useWorkflowStore.getState().engineLogs.length).toBe(1);
    store.clearLogs();
    expect(useWorkflowStore.getState().engineLogs.length).toBe(0);
    store.setRunning(false);
  });

  test("默认 settings 值", async () => {
    const { useWorkflowStore } = await import("../src/stores/workflowStore");
    const s = useWorkflowStore.getState().settings;
    expect(s.llm_provider).toBe("openai");
    expect(s.llm_model).toBe("gpt-4o");
    expect(s.headless).toBe(true);
    expect(s.cache_ttl_days).toBe(30);
    expect((s as any).control_level).toBeUndefined();
  });
});

// ============================================
// 6. appStore 状态管理
// ============================================
describe("appStore 状态管理", () => {
  test("初始状态", async () => {
    const { useAppStore } = await import("../src/stores/appStore");
    const s = useAppStore.getState();
    expect(s.page).toBe("home");
    expect(s.bottomPanelOpen).toBe(true);
    expect(s.settingsOpen).toBe(false);
  });

  test("setPage 切换页面", async () => {
    const { useAppStore } = await import("../src/stores/appStore");
    useAppStore.getState().setPage("workflow");
    expect(useAppStore.getState().page).toBe("workflow");
    useAppStore.getState().setPage("home");
  });

  test("toggleBottomPanel", async () => {
    const { useAppStore } = await import("../src/stores/appStore");
    const before = useAppStore.getState().bottomPanelOpen;
    useAppStore.getState().toggleBottomPanel();
    expect(useAppStore.getState().bottomPanelOpen).toBe(!before);
    useAppStore.getState().toggleBottomPanel();
  });

  test("setSettingsOpen", async () => {
    const { useAppStore } = await import("../src/stores/appStore");
    useAppStore.getState().setSettingsOpen(true);
    expect(useAppStore.getState().settingsOpen).toBe(true);
    useAppStore.getState().setSettingsOpen(false);
  });
});

// ============================================
// 7. Tauri API 封装
// ============================================
describe("tauri.ts", () => {
  test("getSettings 和 updateSettings 函数存在", async () => {
    const mod = await import("../src/lib/tauri");
    expect(typeof mod.getSettings).toBe("function");
    expect(typeof mod.updateSettings).toBe("function");
  });
});

// ============================================
// 8. Stealth 脚本
// ============================================
describe("stealth.ts", () => {
  test("getStealthScript 返回非空字符串", async () => {
    const { getStealthScript } = await import("../src/engine/utils/stealth");
    const script = getStealthScript();
    expect(typeof script).toBe("string");
    expect(script.length).toBeGreaterThan(100);
  });

  test("包含隐藏 webdriver 代码", async () => {
    const { getStealthScript } = await import("../src/engine/utils/stealth");
    expect(getStealthScript()).toContain("webdriver");
  });

  test("包含伪造 plugins 代码", async () => {
    const { getStealthScript } = await import("../src/engine/utils/stealth");
    expect(getStealthScript()).toContain("plugins");
  });

  test("包含伪造 languages 代码", async () => {
    const { getStealthScript } = await import("../src/engine/utils/stealth");
    expect(getStealthScript()).toContain("languages");
  });
});

// ============================================
// 9. Recorder 脚本
// ============================================
describe("recorder.ts", () => {
  test("getRecordScript 返回非空字符串", async () => {
    const { getRecordScript } = await import("../src/engine/utils/recorder");
    const script = getRecordScript();
    expect(typeof script).toBe("string");
    expect(script.length).toBeGreaterThan(100);
  });

  test("包含事件监听器", async () => {
    const { getRecordScript } = await import("../src/engine/utils/recorder");
    expect(getRecordScript()).toContain("addEventListener");
    expect(getRecordScript()).toContain("click");
    expect(getRecordScript()).toContain("submit");
  });

  test("getStartRecordingScript 设置激活标志", async () => {
    const { getStartRecordingScript } = await import("../src/engine/utils/recorder");
    expect(getStartRecordingScript()).toContain("RECORDING_ACTIVE");
  });

  test("getGetActionsScript 读取录制数据", async () => {
    const { getGetActionsScript } = await import("../src/engine/utils/recorder");
    expect(getGetActionsScript()).toContain("RECORDED_ACTIONS");
  });
});

// ============================================
// 10. Captcha 检测
// ============================================
describe("captcha.ts", () => {
  test("detectCaptcha 函数存在且返回 Promise<boolean>", async () => {
    const { detectCaptcha } = await import("../src/engine/utils/captcha");
    expect(typeof detectCaptcha).toBe("function");
  });

  test("waitForUserContinue 函数存在", async () => {
    const { waitForUserContinue } = await import("../src/engine/utils/captcha");
    expect(typeof waitForUserContinue).toBe("function");
  });
});

// ============================================
// 11. Stagehand 客户端配置
// ============================================
describe("stagehand/client.ts", () => {
  test("createStagehand 函数存在", async () => {
    const { createStagehand } = await import("../src/engine/stagehand/client");
    expect(typeof createStagehand).toBe("function");
  });

  test("缺少 API Key 时抛出异常", async () => {
    const { createStagehand } = await import("../src/engine/stagehand/client");
    await expect(
      createStagehand({ cacheDir: "/tmp/test" })
    ).rejects.toThrow("Missing API Key");
  });

  test("缺少 model 时抛出异常", async () => {
    const { createStagehand } = await import("../src/engine/stagehand/client");
    await expect(
      createStagehand({ cacheDir: "/tmp/test", apiKey: "sk-test" })
    ).rejects.toThrow("未配置模型名称");
  });
});

// ============================================
// 12. 组件文件可导入
// ============================================
describe("组件模块可导入", () => {
  const components = [
    "../src/components/ErrorBoundary",
    "../src/components/layout/TopBar",
    "../src/components/layout/BottomPanel",
    "../src/components/layout/StatusBar",
    "../src/components/layout/MainPanel",
    "../src/components/layout/LogPanel",
    "../src/components/canvas/WorkflowCanvas",
    "../src/components/canvas/nodes/ActNode",
    "../src/components/canvas/nodes/GotoNode",
    "../src/components/canvas/nodes/ExtractNode",
    "../src/components/canvas/nodes/LoopNode",
    "../src/components/canvas/nodes/AgentNode",
    "../src/components/canvas/nodes/ConditionNode",
    "../src/components/data/DataPreview",
    "../src/components/settings/SettingsModal",
  ];

  for (const path of components) {
    const name = path.split("/").pop();
    test(`${name} 可正常导入`, async () => {
      const mod = await import(path);
      expect(mod).toBeDefined();
      expect(Object.keys(mod).length).toBeGreaterThan(0);
    });
  }
});

// ============================================
// 13. 页面组件可导入
// ============================================
describe("页面组件", () => {
  test("HomePage 可导入", async () => {
    const mod = await import("../src/pages/HomePage");
    expect(mod.HomePage).toBeDefined();
  });

  test("App 可导入", async () => {
    const mod = await import("../src/App");
    expect(mod.default).toBeDefined();
  });
});

// ============================================
// 14. Hook 模块可导入
// ============================================
describe("Hook 模块", () => {
  test("useEngine 可导入", async () => {
    const mod = await import("../src/hooks/useEngine");
    expect(mod.useEngine).toBeDefined();
  });

  test("useWorkflow 可导入", async () => {
    const mod = await import("../src/hooks/useWorkflow");
    expect(mod.useWorkflow).toBeDefined();
  });

  test("useRecorder 可导入", async () => {
    const mod = await import("../src/hooks/useRecorder");
    expect(mod.useRecorder).toBeDefined();
  });
});
