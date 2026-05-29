export type EngineEventType =
  | "ENGINE_BOOT"
  | "CACHE_HIT"
  | "CACHE_MISS"
  | "SELF_HEALING"
  | "ACTION_COMPLETED"
  | "DATA_RECORD"
  | "PAGINATION_FINISHED"
  | "AGENT_START"
  | "AGENT_SUCCESS"
  | "AGENT_FAILED"
  | "STEP_START"
  | "STEP_COMPLETE"
  | "CAPTCHA_PAUSE"
  | "ERROR"
  | "EXECUTION_CRASH";

export function emit(type: EngineEventType, data?: Record<string, unknown>) {
  const msg = data ? `[${type}] ${JSON.stringify(data)}` : `[${type}]`;
  console.log(msg);
}

export function emitStep(type: EngineEventType, stepId: string, data?: Record<string, unknown>) {
  emit(type, { step_id: stepId, ...data });
}

export function emitData(data: unknown, stepId?: string) {
  const payload = stepId ? { step_id: stepId, data } : data;
  console.log(`[DATA_RECORD] ${JSON.stringify(payload)}`);
}

export function emitError(message: string, stepId?: string) {
  const payload = stepId ? JSON.stringify({ step_id: stepId, message }) : message;
  console.error(`[ERROR] ${payload}`);
}

export function emitCaptcha(stepId: string) {
  console.log(`[CAPTCHA_PAUSE] ${JSON.stringify({ step_id: stepId })}`);
}
