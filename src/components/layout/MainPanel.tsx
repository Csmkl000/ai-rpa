import { useState } from "react";
import { useWorkflowStore } from "../../stores/workflowStore";
import { useEngine } from "../../hooks/useEngine";
import { useRecorder } from "../../hooks/useRecorder";
import { WorkflowCanvas } from "../canvas/WorkflowCanvas";
import { StepType } from "../../types/workflow";

const STEP_TYPES: { type: StepType; label: string; icon: string }[] = [
  { type: "GOTO", label: "打开网页", icon: "🌐" },
  { type: "ACT", label: "执行操作", icon: "👆" },
  { type: "EXTRACT", label: "提取数据", icon: "📊" },
  { type: "OBSERVE", label: "观察页面", icon: "👁" },
  { type: "LOOP", label: "循环", icon: "🔄" },
  { type: "CONDITION", label: "条件分支", icon: "🔀" },
  { type: "AUTONOMOUS_AGENT", label: "AI 智能体", icon: "🤖" },
];

export function MainPanel() {
  const currentWorkflow = useWorkflowStore((s) => s.currentWorkflow);
  const { error, clearError, captchaStepId, continueAfterCaptcha } = useEngine();
  const addStep = useWorkflowStore((s) => s.addStep);
  const { isRecording, startRecording, stopRecording } = useRecorder();
  const [recordUrl, setRecordUrl] = useState("https://");
  const [showRecordInput, setShowRecordInput] = useState(false);

  const handleAddStep = (type: StepType) => {
    const labels: Record<StepType, string> = {
      GOTO: "打开网页", ACT: "执行操作", EXTRACT: "提取数据",
      OBSERVE: "观察页面", LOOP: "循环",
      CONDITION: "条件分支", AUTONOMOUS_AGENT: "AI 智能体",
    };
    addStep({ id: crypto.randomUUID(), type, label: labels[type] });
  };

  if (!currentWorkflow) return null;

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* 工具栏 */}
      <div className="h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-2 shrink-0">
        {/* 录制 */}
        {isRecording ? (
          <button
            onClick={stopRecording}
            aria-label="停止录制"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white rounded-lg text-xs font-medium transition-all duration-200 animate-pulse focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <span className="w-2 h-2 bg-white rounded-full" />
            停止录制
          </button>
        ) : showRecordInput ? (
          <div className="flex gap-1.5 items-center">
            <input
              type="text"
              value={recordUrl}
              onChange={(e) => setRecordUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { startRecording(recordUrl); setShowRecordInput(false); }
                if (e.key === "Escape") setShowRecordInput(false);
              }}
              autoFocus
              className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs w-52 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              placeholder="https://example.com"
            />
            <button
              onClick={() => { startRecording(recordUrl); setShowRecordInput(false); }}
              className="px-2.5 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              开始
            </button>
            <button
              onClick={() => setShowRecordInput(false)}
              className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              取消
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowRecordInput(true)}
            aria-label="开始智能录制"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-purple-50 text-purple-600 hover:bg-purple-100 active:bg-purple-200 rounded-lg text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="8" />
            </svg>
            录制
          </button>
        )}

        <div className="w-px h-5 bg-gray-200 mx-1" />

        {/* 步骤按钮 */}
        <div className="flex gap-1 overflow-x-auto">
          {STEP_TYPES.map((st) => (
            <button
              key={st.type}
              onClick={() => handleAddStep(st.type)}
              aria-label={`添加${st.label}步骤`}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-gray-600 rounded-lg text-xs whitespace-nowrap transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              <span>{st.icon}</span>
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* 错误横幅 */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2.5 flex items-center justify-between text-sm animate-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-red-700">{error}</span>
          </div>
          <button
            onClick={clearError}
            aria-label="关闭错误提示"
            className="text-red-400 hover:text-red-600 text-xs px-2 py-0.5 rounded hover:bg-red-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            关闭
          </button>
        </div>
      )}

      {/* 验证码人工介入 */}
      {captchaStepId && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3 flex items-center justify-between animate-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2.5">
            <svg className="w-5 h-5 text-yellow-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-yellow-800 text-sm">检测到验证码，请在浏览器中手动完成验证</span>
          </div>
          <button
            onClick={continueAfterCaptcha}
            aria-label="确认已完成验证，继续执行"
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700 text-white rounded-lg text-sm font-medium shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            我已验证，继续
          </button>
        </div>
      )}

      {/* 画布 */}
      <div className="flex-1 relative bg-gray-50">
        <WorkflowCanvas />
      </div>
    </div>
  );
}
