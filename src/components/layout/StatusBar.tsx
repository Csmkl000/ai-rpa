import { useWorkflowStore } from "../../stores/workflowStore";

export function StatusBar() {
  const isRunning = useWorkflowStore((s) => s.isRunning);
  const engineLogs = useWorkflowStore((s) => s.engineLogs);
  const lastLog = engineLogs[engineLogs.length - 1];

  return (
    <footer className="h-10 bg-gray-900 border-t border-gray-800 flex items-center px-4 gap-4 text-xs">
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${
            isRunning ? "bg-green-500 animate-pulse" : "bg-gray-500"
          }`}
        />
        <span className="text-gray-400">{isRunning ? "运行中" : "就绪"}</span>
      </div>

      {lastLog && (
        <div className="flex-1 truncate text-gray-500">
          [{lastLog.event_type}]{" "}
          {typeof lastLog.data === "object"
            ? JSON.stringify(lastLog.data).slice(0, 100)
            : String(lastLog.data)}
        </div>
      )}

      <div className="text-gray-600">
        {engineLogs.length} 条日志
      </div>
    </footer>
  );
}
