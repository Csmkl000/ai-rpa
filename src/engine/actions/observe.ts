import type { Stagehand } from "@browserbasehq/stagehand";
import { emit } from "../protocol/messages";

export interface ObserveStep {
  type: "OBSERVE";
  instruction: string;
}

export async function executeObserve(stagehand: Stagehand, step: ObserveStep): Promise<unknown[]> {
  emit("STEP_START", { step: "OBSERVE", instruction: step.instruction });

  const actions = await stagehand.observe(step.instruction);

  emit("STEP_COMPLETE", {
    step: "OBSERVE",
    found: actions.length,
  });
  return actions as unknown[];
}
