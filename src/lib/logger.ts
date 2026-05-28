export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  id: string;
  time: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: unknown;
}

type LogListener = (entry: LogEntry) => void;

const listeners = new Set<LogListener>();
const buffer: LogEntry[] = [];
const MAX_BUFFER = 500;

function now(): string {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}.${d.getMilliseconds().toString().padStart(3, "0")}`;
}

function log(level: LogLevel, module: string, message: string, data?: unknown) {
  const entry: LogEntry = {
    id: crypto.randomUUID(),
    time: now(),
    level,
    module,
    message,
    data,
  };

  buffer.push(entry);
  if (buffer.length > MAX_BUFFER) buffer.shift();

  // 同步输出到控制台
  const prefix = `[${entry.time}][${module}]`;
  switch (level) {
    case "debug": console.debug(prefix, message, data ?? ""); break;
    case "info":  console.info(prefix, message, data ?? ""); break;
    case "warn":  console.warn(prefix, message, data ?? ""); break;
    case "error": console.error(prefix, message, data ?? ""); break;
  }

  // 通知所有监听者
  for (const fn of listeners) {
    try { fn(entry); } catch {}
  }
}

export const logger = {
  debug: (module: string, msg: string, data?: unknown) => log("debug", module, msg, data),
  info:  (module: string, msg: string, data?: unknown) => log("info", module, msg, data),
  warn:  (module: string, msg: string, data?: unknown) => log("warn", module, msg, data),
  error: (module: string, msg: string, data?: unknown) => log("error", module, msg, data),

  getBuffer: () => [...buffer],
  clear: () => { buffer.length = 0; },

  subscribe: (fn: LogListener) => {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  },
};
