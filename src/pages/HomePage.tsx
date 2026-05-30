import { useState } from "react";
import { useWorkflow } from "../hooks/useWorkflow";
import { useAppStore } from "../stores/appStore";
import { NewWorkflowDialog } from "../components/dialogs/NewWorkflowDialog";

export function HomePage() {
  const { workflows, deleteWorkflow, setCurrentWorkflow } = useWorkflow();
  const setPage = useAppStore((s) => s.setPage);
  const [showDialog, setShowDialog] = useState(false);

  const handleOpen = (wf: import("../types/workflow").Workflow) => {
    setCurrentWorkflow(wf);
    setPage("workflow");
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-8 py-12">
        {/* 标题区 */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">AI-RPA</h1>
          <p className="text-base text-gray-500 leading-relaxed">语义化自动化助手，录制一次，长久运行</p>
        </div>

        {/* 操作栏 */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-800">我的工作流</h2>
          <button
            onClick={() => setShowDialog(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm shadow-blue-500/20 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新建工作流
          </button>
        </div>

        {/* 工作流列表 */}
        {workflows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <p className="text-gray-500 text-base mb-1">还没有工作流</p>
            <p className="text-gray-400 text-sm mb-6">点击上方按钮创建你的第一个自动化任务</p>
            <button
              onClick={() => setShowDialog(true)}
              className="text-sm text-blue-500 hover:text-blue-600 font-medium transition-colors"
            >
              立即创建 →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {workflows.map((wf) => (
              <div
                key={wf.id}
                onClick={() => handleOpen(wf)}
                role="button"
                tabIndex={0}
                aria-label={`打开工作流: ${wf.name}`}
                onKeyDown={(e) => e.key === "Enter" && handleOpen(wf)}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-blue-300 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 truncate flex-1 transition-colors">
                    {wf.name}
                  </h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (wf.id) deleteWorkflow(wf.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                  <span>{wf.steps?.length ?? 0} 步</span>
                  {wf.updated_at && <span>{new Date(wf.updated_at).toLocaleDateString("zh-CN")}</span>}
                </div>
                {wf.steps && wf.steps.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {wf.steps.slice(0, 4).map((s, i) => (
                      <span key={i} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md">
                        {s.label || s.type}
                      </span>
                    ))}
                    {wf.steps.length > 4 && <span className="text-xs text-gray-400">+{wf.steps.length - 4}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <NewWorkflowDialog open={showDialog} onClose={() => setShowDialog(false)} />
    </div>
  );
}
