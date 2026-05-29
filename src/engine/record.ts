// 指南 5: 智能录制引擎
// 独立进程: 打开浏览器 → 注入录制脚本 → 用户操作 → 输出语义指令

import { createStagehand } from "./stagehand/client";
import { getRecordScript, getStartRecordingScript, getGetActionsScript } from "./utils/recorder";
import { emit } from "./protocol/messages";
import { writeFileSync } from "fs";
import { randomUUID } from "crypto";

function parseArgs() {
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

  console.log(`[RECORD] 启动录制模式, url=${url}`);

  const stagehand = await createStagehand({
    cacheDir: "/tmp/stagehand-record-cache",
    apiKey,
    model,
    baseURL,
    proxyUrl,
    headless: false,
  });

  // 导航到目标页面
  console.log(`[RECORD] 正在打开页面...`);
  const page = await stagehand.context.newPage(url || "about:blank");

  // 等待页面加载
  await new Promise(r => setTimeout(r, 2000));

  // 注入录制脚本 - 使用 addScriptTag 方式更可靠
  console.log(`[RECORD] 注入录制脚本...`);
  try {
    const recordScript = getRecordScript() + "\n" + getStartRecordingScript();
    await page.evaluate(recordScript);
    console.log(`[RECORD] 脚本注入成功`);
  } catch (e: any) {
    console.error(`[RECORD] 脚本注入失败: ${e.message}`);
    console.error(`[RECORD] 请检查浏览器是否正常打开`);
  }

  emit("ENGINE_BOOT", { message: "录制模式已启动，请在浏览器中操作", url });
  console.log(`[RECORD] 开始监听用户操作...`);

  // 轮询录制结果
  const actions: any[] = [];
  let lastCount = 0;

  const poll = setInterval(async () => {
    try {
      const raw = await page.evaluate(getGetActionsScript());
      if (typeof raw !== "string") return;
      const current: any[] = JSON.parse(raw);

      if (current.length > lastCount) {
        const newActions = current.slice(lastCount);
        for (const action of newActions) {
          actions.push(action);
          console.log(`[RECORD] 录制: ${action.instruction}`);
          emit("ACTION_COMPLETED", { instruction: action.instruction });
        }
        lastCount = current.length;
      }
    } catch (e: any) {
      // 页面导航中，忽略
    }
  }, 500);

  // 等待退出信号
  await new Promise<void>((resolve) => {
    process.on("SIGTERM", () => resolve());
    process.on("SIGINT", () => resolve());
    process.stdin.on("data", (data) => {
      if (data.toString().trim() === "stop") resolve();
    });
  });

  clearInterval(poll);

  // 保存结果
  const result = {
    url,
    actions: actions.map((a) => ({
      id: randomUUID(),
      type: "ACT",
      label: a.instruction,
      instruction: a.instruction,
    })),
  };

  if (outputFile) {
    writeFileSync(outputFile, JSON.stringify(result, null, 2));
  }

  console.log(`[RECORD_DONE] 录制完成，共 ${result.actions.length} 步`);
  console.log(`[RECORD_DONE] ${JSON.stringify(result)}`);

  await stagehand.close();
  process.exit(0);
}

runRecorder().catch((err) => {
  console.error(`[RECORD_ERROR] ${err.message}`);
  process.exit(1);
});
