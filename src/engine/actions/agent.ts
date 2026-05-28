import type { Stagehand } from "@browserbasehq/stagehand";
import { emit } from "../protocol/messages";

export interface AgentStep {
  type: "AUTONOMOUS_AGENT";
  task: string;
  maxSteps?: number;
}

export async function executeAgent(stagehand: Stagehand, step: AgentStep): Promise<void> {
  emit("AGENT_START", { task: step.task });

  const agent = stagehand.agent();
  const result = await agent.execute({
    instruction: step.task,
    maxSteps: step.maxSteps ?? 10,
  });

  if (result.success) {
    emit("AGENT_SUCCESS", {
      task: step.task,
      actions: result.actions?.length ?? 0,
      message: result.message,
    });
  } else {
    throw new Error(`智能体任务失败: ${result.message}`);
  }
}
