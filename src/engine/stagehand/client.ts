import { Stagehand, CustomOpenAIClient } from "@browserbasehq/stagehand";
import OpenAI from "openai";
import { emit, emitError } from "../protocol/messages";
import { getStealthScript } from "../utils/stealth";

export interface StagehandConfig {
  cacheDir: string;
  proxyUrl?: string;
  apiKey?: string;
  model?: string;
  baseURL?: string;
  headless?: boolean;
  persistBrowser?: boolean;
  provider?: string;
  recordMode?: boolean;
}

export async function createStagehand(config: StagehandConfig): Promise<Stagehand> {
  const provider = config.provider || "openai";

  if (!config.recordMode && provider !== "ollama" && !config.apiKey) {
    emitError("未配置 API Key。请在设置面板中填写 LLM API Key 后再运行工作流。");
    throw new Error("Missing API Key");
  }

  if (!config.model) {
    throw new Error("未配置模型名称");
  }
  const rawModel = config.model;
  const modelName = rawModel.includes("/") ? rawModel.split("/").pop()! : rawModel;

  let llmClient: InstanceType<typeof CustomOpenAIClient> | undefined = undefined;

  if (!config.recordMode) {
    if (provider === "ollama") {
      const ollamaBaseURL = config.baseURL || "http://localhost:11434/v1";
      const ollamaClient = new OpenAI({ apiKey: "ollama", baseURL: ollamaBaseURL });
      llmClient = new CustomOpenAIClient({ modelName, client: ollamaClient });
    } else {
      const openaiClient = new OpenAI({
        apiKey: config.apiKey!,
        baseURL: config.baseURL || undefined,
      });
      llmClient = new CustomOpenAIClient({ modelName, client: openaiClient });
    }
  }

  const stagehand = new Stagehand({
    env: "LOCAL",
    cacheDir: config.cacheDir,
    verbose: 0,
    disablePino: true,
    logger: (line: any) => {
      // 只输出 message 字段，丢弃冗长的 JSON 对象
      if (typeof line === "string") {
        const clean = line.replace(/\x1b\[[0-9;]*m/g, "").trim();
        if (clean) console.log(`[Stagehand] ${clean}`);
      } else if (line && typeof line === "object") {
        const msg = line.message || "";
        const cat = line.category || "";
        if (msg) {
          console.log(`[Stagehand] ${cat ? `[${cat}] ` : ""}${msg}`);
        }
      }
    },
    localBrowserLaunchOptions: {
      headless: config.headless !== false,
      ...(config.proxyUrl ? { proxy: { server: config.proxyUrl } } : {}),
      ...(config.persistBrowser ? { preserveUserDataDir: true } : {}),
    },
    ...(llmClient ? { llmClient } : {}),
  } as any);

  await stagehand.init();

  // 注入反爬脚本
  if (!config.recordMode) {
    try {
      const pages = stagehand.context.pages();
      for (const page of pages) {
        await page.evaluate(getStealthScript());
      }
    } catch (e: unknown) {
      emit("LOG", { log: `反爬脚本注入失败: ${e instanceof Error ? e.message : String(e)}` });
    }
  }

  emit("ENGINE_BOOT", {
    message: config.recordMode ? "录制模式已启动" : "Stagehand v3 CDP 引擎初始化完毕",
    cacheDir: config.cacheDir,
    model: modelName,
    provider,
  });

  return stagehand;
}
