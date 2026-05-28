import { useState, useEffect, useRef } from "react";
import { logger, type LogEntry, type LogLevel } from "../../lib/logger";

const LEVEL_COLOR: Record<LogLevel, string> = {
  debug: "text-gray-500",
  info: "text-blue-400",
  warn: "text-yellow-400",
  error: "text-red-400",
};

const LEVEL_BADGE: Record<LogLevel, string> = {
  debug: "bg-gray-700 text-gray-400",
  info: "bg-blue-900/50 text-blue-400",
  warn: "bg-yellow-900/50 text-yellow-400",
  error: "bg-red-900/50 text-red-400",
};

export function LogPanel() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<LogLevel | "all">("all");
  const [autoScroll, setAutoScroll] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLogs(logger.getBuffer());
    const unsub = logger.subscribe((entry) => {
      setLogs((prev) => [...prev, entry].slice(-MAX_DISPLAY));
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  const filtered = filter === "all" ? logs : logs.filter((l) => l.level === filter);

  return (
    <div className="h-full flex flex-col text-xs">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800">
        <span className="text-gray-400 font-medium">日志</span>
        <div className="flex gap-1 ml-auto">
          {(["all", "debug", "info", "warn", "error"] as const).map((lv) => (
            <button
              key={lv}
              onClick={() => setFilter(lv)}
              className={`px-2 py-0.5 rounded text-xs transition-colors ${
                filter === lv
                  ? "bg-gray-700 text-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {lv === "all" ? "全部" : lv.toUpperCase()}
            </button>
          ))}
        </div>
        <button
          onClick={() => setAutoScroll(!autoScroll)}
          className={`px-2 py-0.5 rounded text-xs ${
            autoScroll ? "bg-green-900/50 text-green-400" : "bg-gray-700 text-gray-400"
          }`}
        >
          {autoScroll ? "自动滚动" : "已锁定"}
        </button>
        <button
          onClick={() => { logger.clear(); setLogs([]); }}
          className="px-2 py-0.5 rounded text-xs text-gray-500 hover:text-gray-300"
        >
          清空
        </button>
      </div>

      {/* Log list */}
      <div className="flex-1 overflow-y-auto font-mono">
        {filtered.length === 0 ? (
          <div className="text-gray-600 text-center py-8">暂无日志</div>
        ) : (
          filtered.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-2 px-3 py-1 hover:bg-gray-800/50 border-b border-gray-900"
            >
              <span className="text-gray-600 shrink-0 w-20">{entry.time}</span>
              <span
                className={`shrink-0 px-1.5 py-0.5 rounded text-xs ${LEVEL_BADGE[entry.level]}`}
              >
                {entry.level}
              </span>
              <span className="text-gray-400 shrink-0 w-24 truncate">{entry.module}</span>
              <span className={`${LEVEL_COLOR[entry.level]} flex-1 break-all`}>
                {entry.message}
                {entry.data !== undefined && (
                  <span className="text-gray-600 ml-2">
                    {typeof entry.data === "string"
                      ? entry.data
                      : JSON.stringify(entry.data).slice(0, 200)}
                  </span>
                )}
              </span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

const MAX_DISPLAY = 200;
