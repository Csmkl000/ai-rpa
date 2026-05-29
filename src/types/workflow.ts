export type StepType =
  | "GOTO"
  | "ACT"
  | "EXTRACT"
  | "OBSERVE"
  | "LOOP"
  | "CONDITION"
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
  task?: string;
  maxSteps?: number;
  condition?: string;
  trueStepId?: string;
  falseStepId?: string;
  /** LOOP: 最大迭代次数 */
  maxIterations?: number;
  /** LOOP: 循环体子步骤 */
  body?: WorkflowStep[];
}

export interface Workflow {
  id?: number;
  name: string;
  steps: WorkflowStep[];
  created_at?: string;
  updated_at?: string;
}

export type NodeStatus = "idle" | "running" | "success" | "error" | "healing" | "skipped";

export interface EngineEvent {
  event_type: string;
  data: Record<string, unknown>;
}

export type ControlLevel = "auto" | "confirm" | "step";

export interface AppSettings {
  llm_provider: string;
  llm_api_key: string;
  llm_model: string;
  base_url?: string;
  proxy_url?: string;
  headless: boolean;
  cache_ttl_days: number;
  control_level: ControlLevel;
}
