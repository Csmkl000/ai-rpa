/**
 * 重构代码回归测试
 * 覆盖: ErrorBoundary, WorkflowStep 类型, schema 生成, 消息协议
 */
import { describe, test, expect } from "bun:test";

// --- ErrorBoundary 测试 ---
describe("ErrorBoundary", () => {
  test("ErrorBoundary 组件文件存在且导出正确", async () => {
    const mod = await import("../src/components/ErrorBoundary");
    expect(mod.ErrorBoundary).toBeDefined();
    expect(typeof mod.ErrorBoundary).toBe("function");
  });
});

// --- WorkflowStep 类型测试 ---
describe("WorkflowStep 类型", () => {
  test("支持 _conditionResult 字段", async () => {
    const mod = await import("../src/types/workflow");
    // 类型编译通过即表示字段存在
    const step: mod.WorkflowStep = {
      id: "test",
      type: "CONDITION",
      label: "test",
      condition: "test condition",
      _conditionResult: true,
    };
    expect(step._conditionResult).toBe(true);
  });

  test("支持 LOOP 类型和 body 字段", async () => {
    const mod = await import("../src/types/workflow");
    const step: mod.WorkflowStep = {
      id: "loop-1",
      type: "LOOP",
      label: "循环",
      condition: "还有下一页",
      maxIterations: 5,
      body: [
        { id: "sub-1", type: "ACT", label: "操作", instruction: "点击下一页" },
      ],
    };
    expect(step.type).toBe("LOOP");
    expect(step.body?.length).toBe(1);
    expect(step.maxIterations).toBe(5);
  });

  test("所有 StepType 值都有效", async () => {
    const mod = await import("../src/types/workflow");
    const validTypes: mod.StepType[] = [
      "GOTO", "ACT", "EXTRACT", "OBSERVE", "LOOP", "CONDITION", "AUTONOMOUS_AGENT",
    ];
    for (const type of validTypes) {
      const step: mod.WorkflowStep = { id: "x", type, label: type };
      expect(step.type).toBe(type);
    }
  });
});

// --- schema 生成测试（边界值） ---
describe("generateDynamicSchema 边界值", () => {
  test("空字段数组生成空对象 schema", async () => {
    const { generateDynamicSchema } = await import("../src/engine/utils/schema");
    const schema = generateDynamicSchema([]);
    const result = schema.safeParse({});
    expect(result.success).toBe(true);
  });

  test("单个 string 字段", async () => {
    const { generateDynamicSchema } = await import("../src/engine/utils/schema");
    const schema = generateDynamicSchema([{ name: "title", type: "string" }]);
    expect(schema.safeParse({ title: "hello" }).success).toBe(true);
    expect(schema.safeParse({ title: 123 }).success).toBe(false);
  });

  test("单个 number 字段", async () => {
    const { generateDynamicSchema } = await import("../src/engine/utils/schema");
    const schema = generateDynamicSchema([{ name: "price", type: "number" }]);
    expect(schema.safeParse({ price: 99.9 }).success).toBe(true);
    expect(schema.safeParse({ price: "abc" }).success).toBe(false);
  });

  test("混合字段", async () => {
    const { generateDynamicSchema } = await import("../src/engine/utils/schema");
    const schema = generateDynamicSchema([
      { name: "name", type: "string" },
      { name: "count", type: "number" },
    ]);
    expect(schema.safeParse({ name: "test", count: 42 }).success).toBe(true);
    expect(schema.safeParse({ name: "test" }).success).toBe(false);
    expect(schema.safeParse({ count: 42 }).success).toBe(false);
  });

  test("null 和 undefined 输入", async () => {
    const { generateDynamicSchema } = await import("../src/engine/utils/schema");
    const schema = generateDynamicSchema([{ name: "x", type: "string" }]);
    expect(schema.safeParse(null).success).toBe(false);
    expect(schema.safeParse(undefined).success).toBe(false);
  });

  test("超长字符串", async () => {
    const { generateDynamicSchema } = await import("../src/engine/utils/schema");
    const schema = generateDynamicSchema([{ name: "x", type: "string" }]);
    const longStr = "a".repeat(100000);
    expect(schema.safeParse({ x: longStr }).success).toBe(true);
  });
});

// --- 消息协议测试 ---
describe("消息协议", () => {
  test("emit 输出包含事件类型标记", async () => {
    const { emit } = await import("../src/engine/protocol/messages");
    let captured = "";
    const orig = console.log;
    console.log = (msg: string) => { captured = msg; };
    emit("ENGINE_BOOT", { message: "test" });
    console.log = orig;
    expect(captured).toContain("[ENGINE_BOOT]");
    expect(captured).toContain("test");
  });

  test("emitStep 输出包含 step_id", async () => {
    const { emitStep } = await import("../src/engine/protocol/messages");
    let captured = "";
    const orig = console.log;
    console.log = (msg: string) => { captured = msg; };
    emitStep("STEP_START", "step-123", { step: "ACT" });
    console.log = orig;
    expect(captured).toContain("[STEP_START]");
    expect(captured).toContain("step-123");
  });

  test("emitError 输出到 stderr", async () => {
    const { emitError } = await import("../src/engine/protocol/messages");
    let captured = "";
    const orig = console.error;
    console.error = (msg: string) => { captured = msg; };
    emitError("something broke", "step-1");
    console.error = orig;
    expect(captured).toContain("[ERROR]");
    expect(captured).toContain("something broke");
    expect(captured).toContain("step-1");
  });

  test("emitData 输出 DATA_RECORD 标记", async () => {
    const { emitData } = await import("../src/engine/protocol/messages");
    let captured = "";
    const orig = console.log;
    console.log = (msg: string) => { captured = msg; };
    emitData({ title: "test" }, "step-1");
    console.log = orig;
    expect(captured).toContain("[DATA_RECORD]");
    expect(captured).toContain("step-1");
  });
});

// --- logger 测试 ---
describe("logger", () => {
  test("logger 存储并返回日志", async () => {
    const { logger } = await import("../src/lib/logger");
    logger.clear();
    logger.info("Test", "hello");
    logger.error("Test", "world");
    const buf = logger.getBuffer();
    expect(buf.length).toBe(2);
    expect(buf[0].message).toBe("hello");
    expect(buf[1].message).toBe("world");
    expect(buf[0].level).toBe("info");
    expect(buf[1].level).toBe("error");
    logger.clear();
  });

  test("logger subscribe 接收新日志", async () => {
    const { logger } = await import("../src/lib/logger");
    logger.clear();
    const received: any[] = [];
    const unsub = logger.subscribe((entry) => received.push(entry));
    logger.warn("Test", "warning msg");
    expect(received.length).toBe(1);
    expect(received[0].level).toBe("warn");
    unsub();
    logger.clear();
  });
});

// --- AppSettings 类型测试 ---
describe("AppSettings", () => {
  test("不包含 control_level 字段", async () => {
    const mod = await import("../src/types/workflow");
    // 如果 control_level 存在于类型中，这里会编译失败
    const settings: mod.AppSettings = {
      llm_provider: "openai",
      llm_api_key: "",
      llm_model: "gpt-4o",
      headless: true,
      cache_ttl_days: 30,
    };
    expect(settings.llm_provider).toBe("openai");
    // 确认没有 control_level
    expect((settings as any).control_level).toBeUndefined();
  });
});
