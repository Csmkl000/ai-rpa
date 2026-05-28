import { useWorkflow } from "../../hooks/useWorkflow";
import { useWorkflowStore } from "../../stores/workflowStore";

export function Sidebar() {
  const { workflows, createNewWorkflow, setCurrentWorkflow, deleteWorkflow, saveWorkflow } =
    useWorkflow();
  const currentWorkflow = useWorkflowStore((s) => s.currentWorkflow);

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-full">
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          工作流
        </h2>
        <div className="flex gap-2">
          <button
            onClick={createNewWorkflow}
            className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors"
          >
            + 新建
          </button>
          {currentWorkflow && (
            <button
              onClick={saveWorkflow}
              className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium transition-colors"
            >
              保存
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {workflows.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">暂无工作流</p>
        ) : (
          workflows.map((wf) => (
            <div
              key={wf.id}
              onClick={() => setCurrentWorkflow(wf)}
              className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                currentWorkflow?.id === wf.id
                  ? "bg-blue-600/20 border border-blue-500/30"
                  : "hover:bg-gray-800"
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{wf.name}</p>
                <p className="text-xs text-gray-500">{wf.steps?.length ?? 0} 步</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (wf.id) deleteWorkflow(wf.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 text-xs transition-opacity"
              >
                删除
              </button>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
