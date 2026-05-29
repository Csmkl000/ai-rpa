import { useWorkflowStore } from "../../stores/workflowStore";

export function StatusBar() {
  const isRunning = useWorkflowStore((s) => s.isRunning);

  return (
    <footer className="h-6 bg-gray-50 border-t border-gray-200 flex items-center px-4 text-xs text-gray-400 shrink-0">
      <div className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? "bg-green-500 animate-pulse" : "bg-gray-300"}`} />
        <span>{isRunning ? "运行中" : "就绪"}</span>
      </div>
    </footer>
  );
}
