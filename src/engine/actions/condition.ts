// 指南 5: 条件分支节点 — AI 判断条件真假
import type { Stagehand } from "@browserbasehq/stagehand";
import { emitStep } from "../protocol/messages";

export interface ConditionStep {
  type: "CONDITION";
  id: string;
  condition: string;
}

export async function executeCondition(
  stagehand: Stagehand,
  step: ConditionStep
): Promise<boolean> {
  emitStep("STEP_START", step.id, { step: "CONDITION", condition: step.condition });

  // 用 observe 让 AI 扫描页面，判断条件是否成立
  try {
    const actions = await stagehand.observe(step.condition);
    const result = actions.length > 0;

    emitStep("STEP_COMPLETE", step.id, {
      step: "CONDITION",
      result,
      found: actions.length,
    });

    return result;
  } catch {
    emitStep("STEP_COMPLETE", step.id, { step: "CONDITION", result: false });
    return false;
  }
}
