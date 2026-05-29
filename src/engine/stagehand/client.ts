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
}

export async function createStagehand(config: StagehandConfig): Promise<Stagehand> {
  const provider = config.provider || "openai";

  // Ollama 本地模型不需要 API Key
  if (provider !== "ollama" && !config.apiKey) {
    emitError("未配置 API Key。请在设置面板中填写 LLM API Key 后再运行工作流。");
    throw new Error("Missing API Key");
  }

  const rawModel = config.model || "gpt-4o";
  const modelName = rawModel.includes("/") ? rawModel.split("/").pop()! : rawModel;

  let llmClient;

  if (provider === "ollama") {
    // 指南 2: Ollama 本地模型兼容
    // Ollama 兼容 OpenAI API 格式，baseURL 默认 http://localhost:11434/v1
    const ollamaBaseURL = config.baseURL || "http://localhost:11434/v1";
    const ollamaClient = new OpenAI({
      apiKey: "ollama", // Ollama 不需要真实 key
      baseURL: ollamaBaseURL,
    });
    llmClient = new CustomOpenAIClient({
      modelName,
      client: ollamaClient,
    });
    emit("ENGINE_BOOT", {
      message: `Ollama 本地模型已连接: ${modelName}`,
      baseURL: ollamaBaseURL,
    });
  } else {
    // OpenAI 兼容 API（含第三方中转站）
    const openaiClient = new OpenAI({
      apiKey: config.apiKey!,
      baseURL: config.baseURL || undefined,
    });
    llmClient = new CustomOpenAIClient({
      modelName,
      client: openaiClient,
    });
  }

  const stagehand = new Stagehand({
    env: "LOCAL",
    cacheDir: config.cacheDir,
    verbose: 1,
    localBrowserLaunchOptions: {
      headless: config.headless !== false,
      ...(config.proxyUrl ? { proxy: { server: config.proxyUrl } } : {}),
    },
    llmClient,
  });

  await stagehand.init();

  // 指南 7.2: 注入反爬指纹伪装脚本
  try {
    const pages = stagehand.context.pages();
    for (const page of pages) {
      await page.evaluate(getStealthScript());
    }
  } catch (e: any) {
    emit("LOG", { log: `反爬脚本注入失败: ${e?.message || e}` });
  }

  emit("ENGINE_BOOT", {
    message: "Stagehand v3 CDP 引擎初始化完毕",
    cacheDir: config.cacheDir,
    model: modelName,
    provider,
  });

  return stagehand;
}
