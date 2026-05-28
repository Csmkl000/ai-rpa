import { Stagehand } from "@browserbasehq/stagehand";
import { createStagehand } from "./stagehand/client";
import { executeGoto } from "./actions/goto";
import { executeAct } from "./actions/act";
import { executeExtract } from "./actions/extract";
import { executeObserve } from "./actions/observe";
import { executeAgent } from "./actions/agent";
import { emit, emitError, emitData } from "./protocol/messages";
import { generateDynamicSchema } from "./utils/schema";

interface WorkflowStep {
  type: "GOTO" | "ACT" | "EXTRACT" | "OBSERVE" | "EXTRACT_LOOP" | "AUTONOMOUS_AGENT";
  value?: string;
  instruction?: string;
  fields?: Array<{ name: string; type: string }>;
  extractInstruction?: string;
  maxPages?: number;
  task?: string;
  maxSteps?: number;
}

interface Workflow {
  name: string;
  steps: WorkflowStep[];
}

function parseArgs(): {
  workflow: Workflow;
  cacheDir: string;
  apiKey: string;
  model: string;
  baseURL: string;
  proxyUrl: string;
  headless: boolean;
} {
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
      case "--headless": headless = next !== "false"; i++; break;
    }
  }

  if (!workflowFile) {
    throw new Error("Missing --workflow-file argument");
  }

  const workflowJson = require("fs").readFileSync(workflowFile, "utf-8");
  const workflow: Workflow = JSON.parse(workflowJson);
  return {
    workflow,
    cacheDir: cacheDir || "/tmp/stagehand-cache",
    apiKey,
    model,
    baseURL,
    proxyUrl,
    headless,
  };
}

async function runEngine() {
  const { workflow, cacheDir, apiKey, model, baseURL, proxyUrl, headless } = parseArgs();

  const stagehand = await createStagehand({
    cacheDir,
    apiKey,
    model,
    baseURL,
    proxyUrl,
    headless,
  });

  for (const step of workflow.steps) {
    switch (step.type) {
      case "GOTO":
        await executeGoto(stagehand, { type: "GOTO", value: step.value! });
        break;

      case "ACT":
        await executeAct(stagehand, { type: "ACT", instruction: step.instruction! });
        break;

      case "EXTRACT":
        await executeExtract(stagehand, {
          type: "EXTRACT",
          instruction: step.instruction!,
          fields: (step.fields || []) as Array<{ name: string; type: "string" | "number" }>,
        });
        break;

      case "OBSERVE":
        await executeObserve(stagehand, { type: "OBSERVE", instruction: step.instruction! });
        break;

      case "EXTRACT_LOOP": {
        let hasNextPage = true;
        let currentPage = 1;
        const maxPages = step.maxPages || 10;

        while (hasNextPage && currentPage <= maxPages) {
          const schema = generateDynamicSchema(
            (step.fields || []) as Array<{ name: string; type: "string" | "number" }>
          );
          const data = await stagehand.extract(
            step.extractInstruction || "提取页面中的数据",
            schema
          );
          emitData(data);

          const actions = await stagehand.observe("查找跳转到下一页或翻页的交互元素");
          const nextAction = actions.find(
            (a: any) =>
              a.description?.toLowerCase().includes("next") ||
              a.description?.includes("下一页") ||
              a.description?.includes("＞") ||
              a.description?.includes(">>")
          );

          if (nextAction) {
            const sleepTime = Math.floor(Math.random() * 1500) + 1500;
            await new Promise((r) => setTimeout(r, sleepTime));
            await stagehand.act(`点击 ${nextAction.description || nextAction}`);
            currentPage++;
          } else {
            emit("PAGINATION_FINISHED", {
              message: "未发现有效的下一页元素，分页抓取安全终止",
              totalPages: currentPage,
            });
            hasNextPage = false;
          }
        }
        break;
      }

      case "AUTONOMOUS_AGENT":
        await executeAgent(stagehand, {
          type: "AUTONOMOUS_AGENT",
          task: step.task!,
          maxSteps: step.maxSteps,
        });
        break;

      default:
        emitError(`未知的步骤类型: ${(step as any).type}`);
    }
  }

  await stagehand.close();
  process.exit(0);
}

runEngine().catch((err) => {
  emitError(`执行异常: ${err.message}`);
  process.exit(1);
});
