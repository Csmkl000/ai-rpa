import type { Stagehand } from "@browserbasehq/stagehand";
import { emit } from "../protocol/messages";

export interface ActStep {
  type: "ACT";
  instruction: string;
}

export async function executeAct(stagehand: Stagehand, step: ActStep): Promise<void> {
  emit("STEP_START", { step: "ACT", instruction: step.instruction });

  const result = await stagehand.act(step.instruction);

  emit("ACTION_COMPLETED", {
    instruction: step.instruction,
    result,
  });
  emit("STEP_COMPLETE", { step: "ACT" });
}
