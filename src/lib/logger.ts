export type LogLevel = "debug" | "info" | "success" | "warn" | "error";

export interface LogEntry {
  id: string;
  time: string;
  ts: number;
  level: LogLevel;
  module: string;
  message: string;
  detail?: string;
  stepId?: string;
}

type LogListener = (entry: LogEntry) => void;

const listeners = new Set<LogListener>();
const buffer: LogEntry[] = [];
const MAX_BUFFER = 1000;

function now(): string {
  const d = new Date();
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  const s = d.getSeconds().toString().padStart(2, "0");
  const ms = d.getMilliseconds().toString().padStart(3, "0");
  return `${h}:${m}:${s}.${ms}`;
}

function log(level: LogLevel, module: string, message: string, detail?: string, stepId?: string) {
  const entry: LogEntry = {
    id: crypto.randomUUID(),
    time: now(),
    ts: Date.now(),
    level,
    module,
    message,
    detail,
    stepId,
  };

  buffer.push(entry);
  if (buffer.length > MAX_BUFFER) buffer.shift();

  const prefix = `[${entry.time}][${module}]`;
  const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  fn(detail ? `${prefix} ${message} | ${detail}` : `${prefix} ${message}`);

  for (const l of listeners) {
    try { l(entry); } catch {}
  }
}

export const logger = {
  debug: (module: string, msg: string, detail?: string) => log("debug", module, msg, detail),
  info:  (module: string, msg: string, detail?: string) => log("info", module, msg, detail),
  success: (module: string, msg: string, detail?: string) => log("success", module, msg, detail),
  warn:  (module: string, msg: string, detail?: string) => log("warn", module, msg, detail),
  error: (module: string, msg: string, detail?: string) => log("error", module, msg, detail),

  /** 引擎日志专用：带 stepId 和结构化详情 */
  engine: (level: LogLevel, module: string, msg: string, detail?: string, stepId?: string) =>
    log(level, module, msg, detail, stepId),

  getBuffer: () => [...buffer],
  clear: () => { buffer.length = 0; },

  subscribe: (fn: LogListener) => {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  },

  /** 获取所有活跃模块名 */
  getModules: () => [...new Set(buffer.map((e) => e.module))],
};
