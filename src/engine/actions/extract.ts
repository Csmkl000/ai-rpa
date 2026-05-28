import type { Stagehand } from "@browserbasehq/stagehand";
import { emit, emitData } from "../protocol/messages";
import { generateDynamicSchema } from "../utils/schema";

export interface ExtractField {
  name: string;
  type: "string" | "number";
}

export interface ExtractStep {
  type: "EXTRACT";
  instruction: string;
  fields: ExtractField[];
}

export async function executeExtract(stagehand: Stagehand, step: ExtractStep): Promise<unknown> {
  emit("STEP_START", { step: "EXTRACT", instruction: step.instruction });

  const schema = generateDynamicSchema(step.fields);
  const data = await stagehand.extract(step.instruction, schema);

  emitData(data);
  emit("STEP_COMPLETE", { step: "EXTRACT" });
  return data;
}
