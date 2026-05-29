// 对话式执行独立入口
import { createStagehand } from "./stagehand/client";
import { chatGenerateStep, chatExecuteStep } from "./chat";
import { readFileSync } from "fs";

const args = process.argv.slice(2);
let inputFile = "";
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--input" && args[i + 1]) { inputFile = args[i + 1]; i++; }
}

if (!inputFile) { console.error("Missing --input"); process.exit(1); }

const input = JSON.parse(readFileSync(inputFile, "utf-8"));

async function run() {
  const stagehand = await createStagehand({
    cacheDir: input.cacheDir || "/tmp/stagehand-chat-cache",
    apiKey: input.apiKey,
    model: input.model,
    baseURL: input.baseURL,
    headless: true,
  });

  // 生成指令
  const step = await chatGenerateStep(stagehand, input.userMessage, input.apiKey, input.model, input.baseURL);

  // 执行指令
  let result = "";
  if (step.type !== "DONE") {
    result = await chatExecuteStep(stagehand, step);
  } else {
    result = step.message || "任务完成";
  }

  // 输出结果
  console.log(JSON.stringify({ step, result }));

  await stagehand.close();
  process.exit(0);
}

run().catch((err) => {
  console.error(`[CHAT_ERROR] ${err.message}`);
  process.exit(1);
});
