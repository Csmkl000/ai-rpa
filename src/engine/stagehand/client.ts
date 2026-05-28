import { Stagehand } from "@browserbasehq/stagehand";
import { emit } from "../protocol/messages";

export interface StagehandConfig {
  cacheDir: string;
  proxyUrl?: string;
  apiKey?: string;
  model?: string;
}

export async function createStagehand(config: StagehandConfig): Promise<Stagehand> {
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
    model: config.model
      ? { modelName: config.model as any }
      : undefined,
  });

  await stagehand.init();
  emit("ENGINE_BOOT", {
    message: "Stagehand v3 CDP 引擎初始化完毕",
    cacheDir: config.cacheDir,
  });

  return stagehand;
}
