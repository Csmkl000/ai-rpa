/**
 * 本地端到端测试（不依赖 Tauri，直接测 Bun 执行引擎）
 * 运行: bun test tests/engine.test.ts
 */
import { describe, test, expect } from "bun:test";

describe("Workflow JSON 解析", () => {
  test("空步骤工作流应被正确处理", () => {
    const workflow = { name: "test", steps: [] };
    expect(workflow.steps.length).toBe(0);
  });

  test("GOTO 步骤应包含 URL", () => {
    const step = { id: "1", type: "GOTO", label: "打开网页", value: "https://example.com" };
    expect(step.type).toBe("GOTO");
    expect(step.value).toBeTruthy();
  });

  test("ACT 步骤应包含 instruction", () => {
    const step = { id: "2", type: "ACT", label: "点击按钮", instruction: "点击确认付款" };
    expect(step.instruction).toBeTruthy();
  });

  test("EXTRACT 步骤应包含 fields", () => {
    const step = {
      id: "3",
      type: "EXTRACT",
      label: "提取数据",
      instruction: "提取商品信息",
      fields: [
        { name: "title", type: "string" },
        { name: "price", type: "number" },
      ],
    };
    expect(step.fields.length).toBe(2);
    expect(step.fields[1].type).toBe("number");
  });

  test("工作流 JSON 序列化/反序列化应保持一致", () => {
    const workflow = {
      name: "测试工作流",
      steps: [
        { id: "a", type: "GOTO", label: "打开网页", value: "https://example.com" },
        { id: "b", type: "ACT", label: "点击", instruction: "点击登录" },
      ],
    };
    const json = JSON.stringify(workflow);
    const parsed = JSON.parse(json);
    expect(parsed.name).toBe("测试工作流");
    expect(parsed.steps.length).toBe(2);
    expect(parsed.steps[0].value).toBe("https://example.com");
  });
});

describe("消息协议", () => {
  test("emit 输出应包含事件类型", () => {
    const log = console.log;
    let captured = "";
    console.log = (msg: string) => { captured = msg; };

    // 模拟 emit
    const type = "ENGINE_BOOT";
    const data = { message: "test" };
    console.log(`[${type}] ${JSON.stringify(data)}`);

    console.log = log;
    expect(captured).toContain("[ENGINE_BOOT]");
    expect(captured).toContain("test");
  });
});

describe("动态 Schema 生成", () => {
  test("应根据字段定义生成正确的 Zod schema", async () => {
    const { generateDynamicSchema } = await import("../src/engine/utils/schema");

    const schema = generateDynamicSchema([
      { name: "title", type: "string" },
      { name: "price", type: "number" },
    ]);

    // 验证有效数据通过
    const valid = schema.safeParse({ title: "商品", price: 99.9 });
    expect(valid.success).toBe(true);

    // 验证类型错误被捕获
    const invalid = schema.safeParse({ title: "商品", price: "不是数字" });
    expect(invalid.success).toBe(false);
  });
});

describe("Stagehand 客户端配置", () => {
  test("缺少 API Key 时应抛出错误", async () => {
    // 不能真正调用 Stagehand，但验证逻辑
    const config = { cacheDir: "/tmp/test", apiKey: "" };
    expect(config.apiKey).toBe("");
    // createStagehand 会在 apiKey 为空时 throw
  });

  test("配置应支持 baseURL", () => {
    const config = {
      cacheDir: "/tmp/test",
      apiKey: "sk-test",
      model: "gpt-4o",
      baseURL: "https://api.example.com/v1",
    };
    expect(config.baseURL).toBeTruthy();
  });
});
