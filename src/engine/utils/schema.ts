import { z } from "zod";

export interface FieldDef {
  name: string;
  type: "string" | "number";
}

export function generateDynamicSchema(fields: FieldDef[]): z.ZodObject<any> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of fields) {
    switch (field.type) {
      case "number":
        shape[field.name] = z.number();
        break;
      default:
        shape[field.name] = z.string();
        break;
    }
  }

  return z.object(shape);
}

