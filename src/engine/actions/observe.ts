import type { Stagehand, Action } from "@browserbasehq/stagehand";
import { emitStep } from "../protocol/messages";

export interface ObserveStep {
  type: "OBSERVE";
  id: string;
  instruction: string;
}

export async function executeObserve(stagehand: Stagehand, step: ObserveStep): Promise<Action[]> {
  emitStep("STEP_START", step.id, { step: "OBSERVE", instruction: step.instruction });

  const actions = await stagehand.observe(step.instruction);

  emitStep("STEP_COMPLETE", step.id, { step: "OBSERVE", found: actions.length });
  return actions;
}
