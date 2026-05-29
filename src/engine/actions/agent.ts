import type { Stagehand } from "@browserbasehq/stagehand";
import { emitStep, emitError } from "../protocol/messages";

export interface AgentStep {
  type: "AUTONOMOUS_AGENT";
  id: string;
  task: string;
  maxSteps?: number;
}

export async function executeAgent(stagehand: Stagehand, step: AgentStep): Promise<void> {
  emitStep("AGENT_START", step.id, { task: step.task });

  const agent = stagehand.agent();
  const result = await agent.execute({
    instruction: step.task,
    maxSteps: step.maxSteps ?? 10,
  });

  if (result.success) {
    emitStep("AGENT_SUCCESS", step.id, {
      task: step.task,
      actions: result.actions?.length ?? 0,
      message: result.message,
    });
  } else {
    emitError(`智能体任务失败: ${result.message}`, step.id);
    throw new Error(result.message);
  }
}
