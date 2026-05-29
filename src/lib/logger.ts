export type LogLevel = "debug" | "info" | "success" | "warn" | "error";

export interface LogEntry {
  id: string;
  time: string;
  level: LogLevel;
  module: string;
  message: string;
  detail?: string;
}

type LogListener = (entry: LogEntry) => void;

const listeners = new Set<LogListener>();
const buffer: LogEntry[] = [];
const MAX_BUFFER = 300;

function now(): string {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
}

function log(level: LogLevel, module: string, message: string, detail?: string) {
  const entry: LogEntry = {
    id: crypto.randomUUID(),
    time: now(),
    level,
    module,
    message,
    detail,
  };

  buffer.push(entry);
  if (buffer.length > MAX_BUFFER) buffer.shift();

  const prefix = `[${entry.time}][${module}]`;
  switch (level) {
    case "debug": console.debug(prefix, message); break;
    case "info":  console.info(prefix, message); break;
    case "success": console.info(prefix, "✓", message); break;
    case "warn":  console.warn(prefix, message); break;
    case "error": console.error(prefix, message); break;
  }

  for (const fn of listeners) {
    try { fn(entry); } catch {}
  }
}

export const logger = {
  debug: (module: string, msg: string, detail?: string) => log("debug", module, msg, detail),
  info:  (module: string, msg: string, detail?: string) => log("info", module, msg, detail),
  success: (module: string, msg: string, detail?: string) => log("success", module, msg, detail),
  warn:  (module: string, msg: string, detail?: string) => log("warn", module, msg, detail),
  error: (module: string, msg: string, detail?: string) => log("error", module, msg, detail),

  getBuffer: () => [...buffer],
  clear: () => { buffer.length = 0; },

  subscribe: (fn: LogListener) => {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  },
};
