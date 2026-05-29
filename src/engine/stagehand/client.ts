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
  provider?: string;
  /** 录制模式：只开浏览器，不需要 LLM */
  recordMode?: boolean;
}

export async function createStagehand(config: StagehandConfig): Promise<Stagehand> {
  const provider = config.provider || "openai";

  // 录制模式不需要 API Key
  if (!config.recordMode && provider !== "ollama" && !config.apiKey) {
    emitError("未配置 API Key。请在设置面板中填写 LLM API Key 后再运行工作流。");
    throw new Error("Missing API Key");
  }

  const rawModel = config.model || "gpt-4o";
  const modelName = rawModel.includes("/") ? rawModel.split("/").pop()! : rawModel;

  let llmClient: any = undefined;

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

  const stagehandOpts: any = {
    env: "LOCAL",
    cacheDir: config.cacheDir,
    verbose: 1,
    localBrowserLaunchOptions: {
      headless: config.headless !== false,
      ...(config.proxyUrl ? { proxy: { server: config.proxyUrl } } : {}),
    },
  };

  if (llmClient) {
    stagehandOpts.llmClient = llmClient;
  }

  const stagehand = new Stagehand(stagehandOpts);
  await stagehand.init();

  // 注入反爬脚本
  if (!config.recordMode) {
    try {
      const pages = stagehand.context.pages();
      for (const page of pages) {
        await page.evaluate(getStealthScript());
      }
    } catch (e: any) {
      emit("LOG", { log: `反爬脚本注入失败: ${e?.message || e}` });
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
