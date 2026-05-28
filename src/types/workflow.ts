export type StepType =
  | "GOTO"
  | "ACT"
  | "EXTRACT"
  | "OBSERVE"
  | "EXTRACT_LOOP"
  | "AUTONOMOUS_AGENT";

export interface ExtractField {
  name: string;
  type: "string" | "number";
}

export interface WorkflowStep {
  id: string;
  type: StepType;
  label: string;
  value?: string;
  instruction?: string;
  fields?: ExtractField[];
  extractInstruction?: string;
  maxPages?: number;
  task?: string;
  maxSteps?: number;
}

export interface Workflow {
  id?: number;
  name: string;
  steps: WorkflowStep[];
}

export type NodeStatus = "idle" | "running" | "success" | "error" | "healing" | "skipped";

export interface EngineEvent {
  event_type: string;
  data: Record<string, unknown>;
}

export interface AppSettings {
  llm_provider: string;
  llm_api_key: string;
  llm_model: string;
  base_url?: string;
  proxy_url?: string;
  headless: boolean;
  cache_ttl_days: number;
}
