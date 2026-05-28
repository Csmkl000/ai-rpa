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
  | "ERROR"
  | "EXECUTION_CRASH";

export function emit(type: EngineEventType, data?: Record<string, unknown>) {
  const msg = data ? `[${type}] ${JSON.stringify(data)}` : `[${type}]`;
  console.log(msg);
}

export function emitData(data: unknown) {
  console.log(`[DATA_RECORD] ${JSON.stringify(data)}`);
}

export function emitError(message: string) {
  console.error(`[ERROR] ${message}`);
}
