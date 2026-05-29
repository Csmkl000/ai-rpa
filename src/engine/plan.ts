// AI 规划器独立入口
import { planWorkflow } from "./planner";
import { readFileSync } from "fs";

const args = process.argv.slice(2);
let inputFile = "";

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--input" && args[i + 1]) {
    inputFile = args[i + 1];
    i++;
  }
}

if (!inputFile) {
  console.error("Missing --input argument");
  process.exit(1);
}

const input = JSON.parse(readFileSync(inputFile, "utf-8"));

planWorkflow(input.userInput, input.apiKey, input.model, input.baseURL)
  .then((result) => {
    // 输出 JSON 到 stdout
    console.log(JSON.stringify(result));
    process.exit(0);
  })
  .catch((err) => {
    console.error(`[PLAN_ERROR] ${err.message}`);
    process.exit(1);
  });
