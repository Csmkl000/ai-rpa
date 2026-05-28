import { Stagehand } from "@browserbasehq/stagehand";
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
    emitError(
      "未配置 API Key。请在设置面板中填写 LLM API Key 后再运行工作流。"
    );
    throw new Error("Missing API Key");
  }

  const clientOptions: Record<string, unknown> = {
    apiKey: config.apiKey,
  };
  if (config.baseURL) {
    clientOptions.baseURL = config.baseURL;
  }

  const stagehand = new Stagehand({
    env: "LOCAL",
    cacheDir: config.cacheDir,
    verbose: 1,
    localBrowserLaunchOptions: {
      headless: true,
      ...(config.proxyUrl
        ? { proxy: { server: config.proxyUrl } }
        : {}),
    },
    model: {
      modelName: (config.model || "gpt-4o") as any,
      ...clientOptions,
    },
  });

  await stagehand.init();
  emit("ENGINE_BOOT", {
    message: "Stagehand v3 CDP 引擎初始化完毕",
    cacheDir: config.cacheDir,
    model: config.model || "gpt-4o",
  });

  return stagehand;
}
