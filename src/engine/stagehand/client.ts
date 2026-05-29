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
}

export async function createStagehand(config: StagehandConfig): Promise<Stagehand> {
  if (!config.apiKey) {
    emitError("未配置 API Key。请在设置面板中填写 LLM API Key 后再运行工作流。");
    throw new Error("Missing API Key");
  }

  const rawModel = config.model || "gpt-4o";
  const modelName = rawModel.includes("/") ? rawModel.split("/").pop()! : rawModel;

  const openaiClient = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL || undefined,
  });

  const llmClient = new CustomOpenAIClient({
    modelName,
    client: openaiClient,
  });

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

  // 指南 7.2: 注入反爬指纹伪装脚本到当前页面
  try {
    const context = stagehand.context;
    const pages = context.pages();
    for (const page of pages) {
      await page.evaluate(getStealthScript());
    }
  } catch {
    // 忽略注入失败
  }

  emit("ENGINE_BOOT", {
    message: "Stagehand v3 CDP 引擎初始化完毕",
    cacheDir: config.cacheDir,
    model: modelName,
  });

  return stagehand;
}
