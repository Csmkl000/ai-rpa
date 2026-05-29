// 指南 5: 智能录制引擎
// 独立进程: 打开浏览器 → 注入录制脚本 → 用户操作 → 输出语义指令

import { createStagehand } from "./stagehand/client";
import { getRecordScript, getStartRecordingScript, getGetActionsScript } from "./utils/recorder";
import { emit } from "./protocol/messages";
import { writeFileSync } from "fs";

interface RecordArgs {
  url: string;
  outputFile: string;
  apiKey: string;
  model: string;
  baseURL: string;
  proxyUrl: string;
}

function parseArgs(): RecordArgs {
  const args = process.argv.slice(2);
  let url = "";
  let outputFile = "";
  let apiKey = "";
  let model = "gpt-4o";
  let baseURL = "";
  let proxyUrl = "";

  for (let i = 0; i < args.length; i++) {
    const next = args[i + 1];
    switch (args[i]) {
      case "--url": url = next; i++; break;
      case "--output": outputFile = next; i++; break;
      case "--api-key": apiKey = next; i++; break;
      case "--model": model = next; i++; break;
      case "--base-url": baseURL = next; i++; break;
      case "--proxy": proxyUrl = next; i++; break;
    }
  }

  return { url, outputFile, apiKey, model, baseURL, proxyUrl };
}

async function runRecorder() {
  const { url, outputFile, apiKey, model, baseURL, proxyUrl } = parseArgs();

  // 录制模式必须有头浏览器
  const stagehand = await createStagehand({
    cacheDir: "/tmp/stagehand-record-cache",
    apiKey,
    model,
    baseURL,
    proxyUrl,
    headless: false,
  });

  // 导航到目标页面
  const page = await stagehand.context.newPage(url || "about:blank");
  await page.waitForLoadState("domcontentloaded");

  // 注入录制脚本
  await page.evaluate(getRecordScript());
  await page.evaluate(getStartRecordingScript());

  emit("ENGINE_BOOT", { message: "录制模式已启动，请在浏览器中操作", url });

  // 轮询录制结果，每秒检查一次
  const actions: any[] = [];
  let lastCount = 0;

  const poll = setInterval(async () => {
    try {
      const raw = await page.evaluate(getGetActionsScript());
      const current = JSON.parse(raw as string);

      if (current.length > lastCount) {
        const newActions = current.slice(lastCount);
        for (const action of newActions) {
          actions.push(action);
          emit("ACTION_COMPLETED", { instruction: action.instruction });
        }
        lastCount = current.length;
      }
    } catch {
      // 页面可能正在导航
    }
  }, 1000);

  // 等待进程退出信号
  await new Promise<void>((resolve) => {
    process.on("SIGTERM", () => resolve());
    process.on("SIGINT", () => resolve());

    // 也监听 stdin 的 "stop" 命令
    process.stdin.on("data", (data) => {
      const cmd = data.toString().trim();
      if (cmd === "stop") resolve();
    });
  });

  clearInterval(poll);

  // 保存录制结果
  const result = {
    url,
    actions: actions.map((a, i) => ({
      id: crypto.randomUUID(),
      type: "ACT",
      label: a.instruction,
      instruction: a.instruction,
    })),
  };

  if (outputFile) {
    writeFileSync(outputFile, JSON.stringify(result, null, 2));
  }

  console.log(`[RECORD_DONE] ${JSON.stringify(result)}`);

  await stagehand.close();
  process.exit(0);
}

runRecorder().catch((err) => {
  console.error(`[RECORD_ERROR] ${err.message}`);
  process.exit(1);
});
