import type { Stagehand } from "@browserbasehq/stagehand";
import { emit } from "../protocol/messages";

export interface GotoStep {
  type: "GOTO";
  value: string;
}

export async function executeGoto(stagehand: Stagehand, step: GotoStep): Promise<void> {
  emit("STEP_START", { step: "GOTO", url: step.value });

  const page = await stagehand.context.newPage(step.value);
  await page.waitForLoadState("domcontentloaded");

  emit("STEP_COMPLETE", { step: "GOTO", url: step.value });
}
