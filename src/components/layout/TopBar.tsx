import { useAppStore } from "../../stores/appStore";
import { useWorkflowStore } from "../../stores/workflowStore";
import { useEngine } from "../../hooks/useEngine";

export function TopBar() {
  const { page, setPage, setSettingsOpen } = useAppStore();
  const currentWorkflow = useWorkflowStore((s) => s.currentWorkflow);
  const { runWorkflow, stopWorkflow, isRunning } = useEngine();

  return (
    <header className="h-12 bg-white border-b border-gray-200 flex items-center px-4 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-6">
        <span className="text-lg font-bold text-blue-600">AI-RPA</span>
      </div>

      {/* 首页按钮 */}
      <button
        onClick={() => setPage("home")}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          page === "home"
            ? "bg-blue-50 text-blue-600"
            : "text-gray-600 hover:bg-gray-100"
        }`}
      >
        首页
      </button>

      {/* 当前工作流名 */}
      {page === "workflow" && currentWorkflow && (
        <div className="flex items-center gap-2 ml-2">
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-700 font-medium truncate max-w-48">
            {currentWorkflow.name}
          </span>
        </div>
      )}

      <div className="flex-1" />

      {/* 运行/停止 */}
      {page === "workflow" && (
        isRunning ? (
          <button
            onClick={stopWorkflow}
            className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-md text-sm font-medium transition-colors mr-2"
          >
            停止
          </button>
        ) : (
          <button
            onClick={runWorkflow}
            className="px-4 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-md text-sm font-medium transition-colors mr-2"
          >
            运行
          </button>
        )
      )}

      {/* 设置按钮 */}
      <button
        onClick={() => setSettingsOpen(true)}
        className="w-8 h-8 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        title="设置"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    </header>
  );
}
