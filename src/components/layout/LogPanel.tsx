import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { logger, type LogEntry, type LogLevel } from "../../lib/logger";

const LEVEL_STYLE: Record<LogLevel, { color: string; bg: string; icon: string }> = {
  debug:   { color: "text-gray-400",   bg: "",                  icon: "·" },
  info:    { color: "text-blue-500",    bg: "",                  icon: "→" },
  success: { color: "text-green-500",   bg: "bg-green-50",       icon: "✓" },
  warn:    { color: "text-amber-500",   bg: "bg-amber-50",       icon: "⚠" },
  error:   { color: "text-red-500",     bg: "bg-red-50",         icon: "✗" },
};

const MAX_LOGS = 1000;

export function LogPanel() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<LogLevel | "all">("all");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef<LogEntry[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    if (pendingRef.current.length === 0) return;
    const batch = pendingRef.current.splice(0);
    setLogs((prev) => {
      const merged = [...prev, ...batch];
      return merged.length > MAX_LOGS ? merged.slice(-MAX_LOGS) : merged;
    });
  }, []);

  useEffect(() => {
    setLogs(logger.getBuffer());
    const unsub = logger.subscribe((entry) => {
      pendingRef.current.push(entry);
      if (!timerRef.current) {
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          flush();
        }, 150);
      }
    });
    return () => {
      unsub();
      if (timerRef.current) clearTimeout(timerRef.current);
      flush();
    };
  }, [flush]);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
    });
    return () => cancelAnimationFrame(id);
  }, [logs]);

  const modules = useMemo(() => {
    const set = new Set(logs.map((l) => l.module));
    return Array.from(set).sort();
  }, [logs]);

  const filtered = useMemo(() => {
    let result = logs;
    if (filter !== "all") result = result.filter((l) => l.level === filter);
    if (moduleFilter !== "all") result = result.filter((l) => l.module === moduleFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.message.toLowerCase().includes(q) ||
          (l.detail && l.detail.toLowerCase().includes(q)) ||
          l.module.toLowerCase().includes(q)
      );
    }
    return result;
  }, [logs, filter, moduleFilter, search]);

  const errorCount = useMemo(() => logs.filter((l) => l.level === "error").length, [logs]);

  return (
    <div className="h-full flex flex-col text-xs">
      {/* 工具栏 */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 shrink-0">
        {/* 搜索 */}
        <div className="relative flex-1 max-w-48">
          <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索日志..."
            className="w-full pl-7 pr-2 py-1 bg-gray-50 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </div>

        {/* 模块过滤 */}
        <select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className="bg-gray-50 border border-gray-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">全部模块</option>
          {modules.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        {/* 级别过滤 */}
        <div className="flex gap-0.5">
          {(["all", "info", "success", "warn", "error"] as const).map((lv) => (
            <button
              key={lv}
              onClick={() => setFilter(lv)}
              className={`relative px-2 py-0.5 rounded text-xs transition-all duration-200 ${
                filter === lv ? "bg-gray-100 text-gray-700 font-medium" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {lv === "all" ? "全部" : lv === "success" ? "成功" : lv.toUpperCase()}
              {lv === "error" && errorCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center">
                  {errorCount > 9 ? "9+" : errorCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <span className="text-gray-400">{filtered.length}/{logs.length}</span>

        <button
          onClick={() => { logger.clear(); setLogs([]); pendingRef.current = []; }}
          className="text-gray-400 hover:text-gray-600 px-1.5 py-0.5 rounded hover:bg-gray-100 transition-all"
        >
          清空
        </button>
      </div>

      {/* 日志列表 */}
      <div className="flex-1 overflow-y-auto font-mono">
        {filtered.length === 0 ? (
          <div className="text-gray-400 text-center py-12">
            {logs.length === 0 ? "暂无日志" : "无匹配日志"}
          </div>
        ) : (
          filtered.map((entry) => {
            const style = LEVEL_STYLE[entry.level];
            const isExpanded = expandedId === entry.id;
            const hasDetail = entry.detail || entry.stepId;

            return (
              <div
                key={entry.id}
                className={`flex flex-col px-3 py-1.5 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                  entry.level === "error" ? "border-l-2 border-l-red-400" : ""
                } ${entry.level === "warn" ? "border-l-2 border-l-amber-400" : ""}`}
                onClick={() => hasDetail && setExpandedId(isExpanded ? null : entry.id)}
                style={{ cursor: hasDetail ? "pointer" : "default" }}
              >
                <div className="flex items-start gap-2">
                  <span className="text-gray-400 shrink-0 w-[70px]">{entry.time}</span>
                  <span className={`shrink-0 w-4 text-center font-bold ${style.color}`}>{style.icon}</span>
                  <span className="text-gray-400 shrink-0 w-20 truncate">{entry.module}</span>
                  <span className={`${style.color} flex-1 break-all`}>{entry.message}</span>
                  {hasDetail && (
                    <span className="text-gray-400 shrink-0 text-[10px]">{isExpanded ? "▲" : "▼"}</span>
                  )}
                </div>
                {isExpanded && hasDetail && (
                  <div className="ml-[106px] mt-1 p-2 bg-gray-50 rounded-md text-gray-500 break-all">
                    {entry.stepId && (
                      <div className="text-gray-400 mb-1">step: {entry.stepId}</div>
                    )}
                    {entry.detail && <div>{entry.detail}</div>}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
