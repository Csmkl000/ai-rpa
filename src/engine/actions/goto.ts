import type { Stagehand } from "@browserbasehq/stagehand";
import { emitStep } from "../protocol/messages";

export interface GotoStep {
  type: "GOTO";
  id: string;
  value: string;
}

export async function executeGoto(stagehand: Stagehand, step: GotoStep): Promise<void> {
  emitStep("STEP_START", step.id, { step: "GOTO", url: step.value });

  const page = await stagehand.context.newPage(step.value);
  await page.waitForLoadState("domcontentloaded");

  emitStep("STEP_COMPLETE", step.id, { step: "GOTO", url: step.value });
}
