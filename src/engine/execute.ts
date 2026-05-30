// 拦截 stdout，源头清除 ANSI 转义码（Stagehand pino 日志带颜色码）
const _origStdoutWrite = process.stdout.write.bind(process.stdout);
process.stdout.write = (chunk: any, ...args: any[]) => {
  if (typeof chunk === "string") {
    chunk = chunk.replace(/\x1b\[[0-9;]*m/g, "");
  }
  return _origStdoutWrite(chunk, ...args);
};

import { createStagehand } from "./stagehand/client";
import type { Stagehand } from "@browserbasehq/stagehand";
import { executeGoto } from "./actions/goto";
import { executeAct } from "./actions/act";
import { executeExtract } from "./actions/extract";
import { executeObserve } from "./actions/observe";
import { executeAgent } from "./actions/agent";
import { executeCondition } from "./actions/condition";
import { emit, emitError, emitStep } from "./protocol/messages";

interface WorkflowStep {
  id: string;
  type: "GOTO" | "ACT" | "EXTRACT" | "OBSERVE" | "LOOP" | "CONDITION" | "AUTONOMOUS_AGENT";
  value?: string;
  instruction?: string;
  fields?: Array<{ name: string; type: string }>;
  extractInstruction?: string;
  task?: string;
  maxSteps?: number;
  condition?: string;
  trueStepId?: string;
  falseStepId?: string;
  maxIterations?: number;
  body?: WorkflowStep[];
  // [Refactor: 用字段替代 globalThis hack by Claude]
  _conditionResult?: boolean;
}

interface Workflow {
  name: string;
  steps: WorkflowStep[];
}

function parseArgs() {
  const args = process.argv.slice(2);
  let workflowFile = "";
  let cacheDir = "";
  let apiKey = "";
  let model = "gpt-4o";
  let baseURL = "";
  let proxyUrl = "";
  let headless = true;

  for (let i = 0; i < args.length; i++) {
    const next = args[i + 1];
    switch (args[i]) {
      case "--workflow-file": workflowFile = next; i++; break;
      case "--cache-dir": cacheDir = next; i++; break;
      case "--api-key": apiKey = next; i++; break;
      case "--model": model = next; i++; break;
      case "--base-url": baseURL = next; i++; break;
      case "--proxy": proxyUrl = next; i++; break;
      case "--headless":
        if (next && !next.startsWith("--")) { headless = next !== "false"; i++; }
        else headless = true;
        break;
      case "--no-headless": headless = false; break;
    }
  }

  if (!workflowFile) throw new Error("Missing --workflow-file argument");

  const workflowJson = require("fs").readFileSync(workflowFile, "utf-8");
  const workflow: Workflow = JSON.parse(workflowJson);
  return { workflow, cacheDir: cacheDir || "/tmp/stagehand-cache", apiKey, model, baseURL, proxyUrl, headless };
}

/** 执行单个步骤 */
// [Refactor: stagehand 类型从 any 改为 Stagehand by Claude]
async function executeStep(stagehand: Stagehand, step: WorkflowStep): Promise<void> {
  switch (step.type) {
    case "GOTO":
      await executeGoto(stagehand, { type: "GOTO", id: step.id, value: step.value! });
      break;

    case "ACT":
      await executeAct(stagehand, { type: "ACT", id: step.id, instruction: step.instruction! });
      break;

    case "EXTRACT":
      await executeExtract(stagehand, {
        type: "EXTRACT", id: step.id, instruction: step.instruction!,
        fields: (step.fields || []) as Array<{ name: string; type: "string" | "number" }>,
      });
      break;

    case "OBSERVE":
      await executeObserve(stagehand, { type: "OBSERVE", id: step.id, instruction: step.instruction! });
      break;

    case "CONDITION": {
      // [Refactor: 结果存到 step 对象，替代 globalThis by Claude]
      const result = await executeCondition(stagehand, {
        type: "CONDITION", id: step.id, condition: step.condition!,
      });
      step._conditionResult = result;
      break;
    }

    case "AUTONOMOUS_AGENT":
      await executeAgent(stagehand, {
        type: "AUTONOMOUS_AGENT", id: step.id, task: step.task!, maxSteps: step.maxSteps,
      });
      break;

    default:
      emitError(`未知的步骤类型: ${step.type}`, step.id);
  }
}

async function runEngine() {
  const { workflow, cacheDir, apiKey, model, baseURL, proxyUrl, headless } = parseArgs();

  const stagehand = await createStagehand({
    cacheDir, apiKey, model, baseURL, proxyUrl, headless,
  });

  for (const step of workflow.steps) {
    if (step.type === "LOOP") {
      // 通用循环: 每次迭代执行 body 中的所有步骤，AI 判断条件是否继续
      const maxIter = step.maxIterations || 10;
      const body = step.body || [];

      emitStep("STEP_START", step.id, { step: "LOOP", condition: step.condition, maxIterations: maxIter });

      for (let i = 0; i < maxIter; i++) {
        emit("LOG", { log: `循环第 ${i + 1}/${maxIter} 次` });

        for (const bodyStep of body) {
          await executeStep(stagehand, bodyStep);
        }

        // AI 判断是否继续
        if (step.condition) {
          try {
            const actions = await stagehand.observe(step.condition);
            if (actions.length === 0) {
              emit("LOG", { log: `条件不满足，循环结束 (第 ${i + 1} 次)` });
              break;
            }
          } catch {
            emit("LOG", { log: `条件判断失败，循环结束` });
            break;
          }
        }
      }

      emitStep("STEP_COMPLETE", step.id, { step: "LOOP" });
    } else {
      await executeStep(stagehand, step);
    }
  }

  await stagehand.close();
  process.exit(0);
}

runEngine().catch((err) => {
  emitError(`执行异常: ${err.message}`);
  process.exit(1);
});
