import type { Stagehand } from "@browserbasehq/stagehand";
import { emitStep, emitData } from "../protocol/messages";
import { generateDynamicSchema } from "../utils/schema";

export interface ExtractField {
  name: string;
  type: "string" | "number";
}

export interface ExtractStep {
  type: "EXTRACT";
  id: string;
  instruction: string;
  fields: ExtractField[];
}

export async function executeExtract(stagehand: Stagehand, step: ExtractStep): Promise<unknown> {
  emitStep("STEP_START", step.id, { step: "EXTRACT", instruction: step.instruction });

  const schema = generateDynamicSchema(step.fields);
  const data = await stagehand.extract(step.instruction, schema);

  emitData(data, step.id);
  emitStep("STEP_COMPLETE", step.id, { step: "EXTRACT" });
  return data;
}
