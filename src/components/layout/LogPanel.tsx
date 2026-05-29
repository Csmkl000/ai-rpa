import { useState, useEffect, useRef } from "react";
import { logger, type LogEntry, type LogLevel } from "../../lib/logger";

const LEVEL_STYLE: Record<LogLevel, { color: string; icon: string }> = {
  debug:   { color: "text-gray-400",  icon: "·" },
  info:    { color: "text-blue-500",   icon: "→" },
  success: { color: "text-green-500",  icon: "✓" },
  warn:    { color: "text-yellow-500", icon: "⚠" },
  error:   { color: "text-red-500",    icon: "✗" },
};

export function LogPanel() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<LogLevel | "all">("all");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLogs(logger.getBuffer());
    const unsub = logger.subscribe((entry) => {
      setLogs((prev) => [...prev, entry].slice(-200));
    });
    return unsub;
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const filtered = filter === "all" ? logs : logs.filter((l) => l.level === filter);

  return (
    <div className="h-full flex flex-col text-xs">
      {/* 过滤栏 */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-gray-100">
        {(["all", "info", "success", "warn", "error"] as const).map((lv) => (
          <button
            key={lv}
            onClick={() => setFilter(lv)}
            className={`px-2 py-0.5 rounded text-xs transition-colors ${
              filter === lv ? "bg-gray-100 text-gray-700" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {lv === "all" ? "全部" : lv === "success" ? "成功" : lv.toUpperCase()}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={() => { logger.clear(); setLogs([]); }} className="text-gray-400 hover:text-gray-600">
          清空
        </button>
      </div>

      {/* 日志列表 */}
      <div className="flex-1 overflow-y-auto font-mono">
        {filtered.length === 0 ? (
          <div className="text-gray-400 text-center py-8">暂无日志</div>
        ) : (
          filtered.map((entry) => {
            const style = LEVEL_STYLE[entry.level];
            return (
              <div key={entry.id} className="flex items-start gap-2 px-3 py-1 border-b border-gray-50 hover:bg-gray-50">
                <span className="text-gray-400 shrink-0 w-14">{entry.time}</span>
                <span className={`shrink-0 w-4 text-center ${style.color}`}>{style.icon}</span>
                <span className="text-gray-400 shrink-0 w-16 truncate">{entry.module}</span>
                <span className={`${style.color} flex-1 break-all`}>{entry.message}</span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
