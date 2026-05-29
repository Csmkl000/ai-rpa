import { createStagehand } from "./stagehand/client";
import { executeGoto } from "./actions/goto";
import { executeAct } from "./actions/act";
import { executeExtract } from "./actions/extract";
import { executeObserve } from "./actions/observe";
import { executeAgent } from "./actions/agent";
import { executeCondition } from "./actions/condition";
import { emit, emitError, emitData, emitStep } from "./protocol/messages";
import { generateDynamicSchema } from "./utils/schema";

interface WorkflowStep {
  id: string;
  type: "GOTO" | "ACT" | "EXTRACT" | "OBSERVE" | "EXTRACT_LOOP" | "AUTONOMOUS_AGENT" | "CONDITION";
  value?: string;
  instruction?: string;
  fields?: Array<{ name: string; type: string }>;
  extractInstruction?: string;
  maxPages?: number;
  task?: string;
  maxSteps?: number;
  condition?: string;
  trueStepId?: string;
  falseStepId?: string;
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
        if (next && !next.startsWith("--")) {
          headless = next !== "false";
          i++;
        } else {
          headless = true;
        }
        break;
      case "--no-headless":
        headless = false;
        break;
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

  // 追踪条件分支的跳转目标
  const stepResults = new Map<string, boolean>();

  for (const step of workflow.steps) {
    // 检查是否被条件分支跳过
    const shouldSkip = workflow.steps.some((s) => {
      if (s.type !== "CONDITION") return false;
      const condResult = stepResults.get(s.id);
      if (condResult === true && s.trueStepId === step.id) return false;
      if (condResult === false && s.falseStepId === step.id) return false;
      // 如果这个步骤是某个条件的分支目标，但条件还没执行，则跳过
      if ((s.trueStepId === step.id || s.falseStepId === step.id) && condResult === undefined) return true;
      return false;
    });

    // #9: 验证必填字段
    if (step.type === "GOTO" && !step.value) {
      emitError("GOTO 步骤缺少 value (URL)", step.id);
      continue;
    }
    if (["ACT", "EXTRACT", "OBSERVE"].includes(step.type) && !step.instruction) {
      emitError(`${step.type} 步骤缺少 instruction`, step.id);
      continue;
    }
    if (step.type === "CONDITION" && !step.condition) {
      emitError("CONDITION 步骤缺少 condition", step.id);
      continue;
    }


    switch (step.type) {
      case "GOTO":
        await executeGoto(stagehand, { type: "GOTO", id: step.id, value: step.value! });
        break;

      case "ACT":
        await executeAct(stagehand, { type: "ACT", id: step.id, instruction: step.instruction! });
        break;

      case "EXTRACT":
        await executeExtract(stagehand, {
          type: "EXTRACT",
          id: step.id,
          instruction: step.instruction!,
          fields: (step.fields || []) as Array<{ name: string; type: "string" | "number" }>,
        });
        break;

      case "OBSERVE":
        await executeObserve(stagehand, { type: "OBSERVE", id: step.id, instruction: step.instruction! });
        break;

      case "EXTRACT_LOOP": {
        let hasNextPage = true;
        let currentPage = 1;
        const maxPages = step.maxPages || 10;

        while (hasNextPage && currentPage <= maxPages) {
          const schema = generateDynamicSchema(
            (step.fields || []) as Array<{ name: string; type: "string" | "number" }>
          );
          try {
            const data = await stagehand.extract(
              step.extractInstruction || "提取页面中的数据",
              schema
            );
            emitData(data, step.id);
          } catch (e: any) {
            emitError(`提取失败: ${e?.message}`, step.id);
            break;
          }

          let actions;
          try {
            actions = await stagehand.observe("查找跳转到下一页或翻页的交互元素");
          } catch (e: any) {
            emitError(`观察页面失败: ${e?.message}`, step.id);
            break;
          }

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
            // #13: 修复 [object Object] 回退
            const desc = nextAction.description || "下一页";
            await stagehand.act(`点击 ${desc}`);
            currentPage++;
          } else {
            emit("PAGINATION_FINISHED", {
              step_id: step.id,
              message: "未发现有效的下一页元素，分页抓取安全终止",
              totalPages: currentPage,
            });
            hasNextPage = false;
          }
        }
        break;
      }

      case "CONDITION": {
        const result = await executeCondition(stagehand, {
          type: "CONDITION",
          id: step.id,
          condition: step.condition!,
        });
        stepResults.set(step.id, result);
        break;
      }

      case "AUTONOMOUS_AGENT":
        await executeAgent(stagehand, {
          type: "AUTONOMOUS_AGENT",
          id: step.id,
          task: step.task!,
          maxSteps: step.maxSteps,
        });
        break;

      default:
        emitError(`未知的步骤类型: ${(step as any).type}`, step.id);
    }
  }

  await stagehand.close();
  process.exit(0);
}

runEngine().catch((err) => {
  emitError(`执行异常: ${err.message}`);
  process.exit(1);
});
