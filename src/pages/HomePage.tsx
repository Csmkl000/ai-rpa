import { useWorkflow } from "../hooks/useWorkflow";
import { useAppStore } from "../stores/appStore";
import { useWorkflowStore } from "../stores/workflowStore";

export function HomePage() {
  const { workflows, createNewWorkflow, deleteWorkflow, setCurrentWorkflow } = useWorkflow();
  const setPage = useAppStore((s) => s.setPage);

  // [Refactor: wf 类型从 any 改为 Workflow by Claude]
  const handleOpen = (wf: import("../types/workflow").Workflow) => {
    setCurrentWorkflow(wf);
    setPage("workflow");
  };

  const handleNew = () => {
    createNewWorkflow();
    setPage("workflow");
  };

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">AI-RPA</h1>
        <p className="text-gray-500 mb-8">语义化自动化助手，录制一次，长久运行</p>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">我的工作流</h2>
          <button
            onClick={handleNew}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            + 新建工作流
          </button>
        </div>

        {workflows.length === 0 ? (
          <div className="text-center text-gray-400 py-16">
            <p className="text-lg mb-2">还没有工作流</p>
            <p className="text-sm">点击"新建工作流"开始，或在编辑页用 AI 对话生成步骤</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workflows.map((wf) => (
              <div
                key={wf.id}
                onClick={() => handleOpen(wf)}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 truncate flex-1">
                    {wf.name}
                  </h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (wf.id) deleteWorkflow(wf.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all ml-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span>{wf.steps?.length ?? 0} 步</span>
                  {wf.updated_at && (
                    <span>{new Date(wf.updated_at).toLocaleDateString("zh-CN")}</span>
                  )}
                </div>
                {wf.steps && wf.steps.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {wf.steps.slice(0, 4).map((s: import("../types/workflow").WorkflowStep, i: number) => (
                      <span key={i} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                        {s.label || s.type}
                      </span>
                    ))}
                    {wf.steps.length > 4 && (
                      <span className="text-xs text-gray-400">+{wf.steps.length - 4}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
