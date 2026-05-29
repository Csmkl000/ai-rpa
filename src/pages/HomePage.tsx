import { useState } from "react";
import { useWorkflow } from "../hooks/useWorkflow";
import { useAppStore } from "../stores/appStore";
import { useWorkflowStore } from "../stores/workflowStore";
import { usePlanner } from "../hooks/usePlanner";

export function HomePage() {
  const { workflows, createNewWorkflow, deleteWorkflow, setCurrentWorkflow } = useWorkflow();
  const setPage = useAppStore((s) => s.setPage);
  const { plan, isPlanning, error, clearError } = usePlanner();
  const [planInput, setPlanInput] = useState("");

  const handleOpen = (wf: any) => {
    setCurrentWorkflow(wf);
    setPage("workflow");
  };

  const handleNew = () => {
    createNewWorkflow();
    setPage("workflow");
  };

  const handlePlan = () => {
    if (planInput.trim()) {
      plan(planInput.trim());
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-4xl mx-auto">
        {/* AI 规划区 */}
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">AI-RPA</h1>
          <p className="text-gray-500 mb-6">用一句话描述你想自动化的任务，AI 帮你生成工作流</p>

          <div className="flex gap-2">
            <input
              type="text"
              value={planInput}
              onChange={(e) => setPlanInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handlePlan()}
              disabled={isPlanning}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              placeholder="例如: 打开淘宝搜索手机，提取前 3 页商品的标题和价格"
            />
            <button
              onClick={handlePlan}
              disabled={isPlanning || !planInput.trim()}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
            >
              {isPlanning ? "规划中..." : "AI 规划"}
            </button>
          </div>

          {error && (
            <div className="mt-3 text-sm text-red-500 flex items-center gap-2">
              <span>{error}</span>
              <button onClick={clearError} className="text-red-400 hover:text-red-600 text-xs">关闭</button>
            </div>
          )}

          {/* 快捷示例 */}
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              "打开百度搜索今日新闻，提取前5条标题",
              "打开 bilibili 搜索 Python 教程，提取视频标题和播放量",
              "打开京东搜索笔记本电脑，提取商品名和价格，翻3页",
            ].map((example) => (
              <button
                key={example}
                onClick={() => setPlanInput(example)}
                className="text-xs text-gray-400 hover:text-blue-500 bg-gray-50 hover:bg-blue-50 px-3 py-1.5 rounded-full transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        {/* 快速开始 + 工作流列表 */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">我的工作流</h2>
          <button
            onClick={handleNew}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors"
          >
            + 手动新建
          </button>
        </div>

        {workflows.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <p>还没有工作流，试试上面的 AI 规划</p>
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
                    {wf.steps.slice(0, 4).map((s: any, i: number) => (
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
