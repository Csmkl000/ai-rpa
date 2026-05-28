import { Stagehand, AISdkClient } from "@browserbasehq/stagehand";
import { createOpenAI } from "@ai-sdk/openai";
import { emit, emitError } from "../protocol/messages";

export interface StagehandConfig {
  cacheDir: string;
  proxyUrl?: string;
  apiKey?: string;
  model?: string;
  baseURL?: string;
}

export async function createStagehand(config: StagehandConfig): Promise<Stagehand> {
  if (!config.apiKey) {
    emitError("未配置 API Key。请在设置面板中填写 LLM API Key 后再运行工作流。");
    throw new Error("Missing API Key");
  }

  const rawModel = config.model || "gpt-4o";
  // 去掉 provider/ 前缀，只保留模型名
  const modelName = rawModel.includes("/") ? rawModel.split("/").pop()! : rawModel;

  // 创建 OpenAI provider，强制走 chat completions（/v1/chat/completions）
  // 第三方 API 不支持新版 /v1/responses 接口
  const openaiProvider = createOpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL || undefined,
  });
  const chatModel = openaiProvider.chat(modelName as any);
  const llmClient = new AISdkClient({ model: chatModel });

  const stagehand = new Stagehand({
    env: "LOCAL",
    cacheDir: config.cacheDir,
    verbose: 1,
    localBrowserLaunchOptions: {
      headless: true,
      ...(config.proxyUrl ? { proxy: { server: config.proxyUrl } } : {}),
    },
    llmClient,
  });

  await stagehand.init();
  emit("ENGINE_BOOT", {
    message: "Stagehand v3 CDP 引擎初始化完毕",
    cacheDir: config.cacheDir,
    model: modelName,
  });

  return stagehand;
}
