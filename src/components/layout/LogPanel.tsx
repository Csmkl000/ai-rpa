import { useState, useEffect, useRef } from "react";
import { logger, type LogEntry, type LogLevel } from "../../lib/logger";

const LEVEL_STYLE: Record<LogLevel, { color: string; bg: string; icon: string }> = {
  debug:   { color: "text-gray-500",  bg: "",               icon: "·" },
  info:    { color: "text-blue-400",   bg: "",               icon: "→" },
  success: { color: "text-green-400",  bg: "bg-green-500/5", icon: "✓" },
  warn:    { color: "text-yellow-400", bg: "bg-yellow-500/5", icon: "⚠" },
  error:   { color: "text-red-400",    bg: "bg-red-500/5",   icon: "✗" },
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
      <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-800">
        {(["all", "info", "success", "warn", "error"] as const).map((lv) => (
          <button
            key={lv}
            onClick={() => setFilter(lv)}
            className={`px-2 py-0.5 rounded text-xs transition-colors ${
              filter === lv ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {lv === "all" ? "全部" : lv === "success" ? "成功" : lv.toUpperCase()}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => { logger.clear(); setLogs([]); }}
          className="text-gray-600 hover:text-gray-400"
        >
          清空
        </button>
      </div>

      {/* 日志列表 */}
      <div className="flex-1 overflow-y-auto font-mono">
        {filtered.length === 0 ? (
          <div className="text-gray-600 text-center py-8">暂无日志</div>
        ) : (
          filtered.map((entry) => {
            const style = LEVEL_STYLE[entry.level];
            return (
              <div
                key={entry.id}
                className={`flex items-start gap-2 px-3 py-1.5 ${style.bg} border-b border-gray-900/50`}
              >
                <span className="text-gray-600 shrink-0 w-14">{entry.time}</span>
                <span className={`shrink-0 w-4 text-center ${style.color}`}>{style.icon}</span>
                <span className="text-gray-500 shrink-0 w-16 truncate">{entry.module}</span>
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
