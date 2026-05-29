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
  { type: "EXTRACT_LOOP", label: "循环提取", icon: "🔄" },
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
      OBSERVE: "观察页面", EXTRACT_LOOP: "循环提取",
      CONDITION: "条件分支", AUTONOMOUS_AGENT: "AI 智能体",
    };
    addStep({ id: crypto.randomUUID(), type, label: labels[type] });
  };

  if (!currentWorkflow) return null;

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* 工具栏 */}
      <div className="h-11 bg-white border-b border-gray-200 flex items-center px-4 gap-2 shrink-0">
        {/* 录制 */}
        {isRecording ? (
          <button
            onClick={stopRecording}
            className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-medium animate-pulse"
          >
            ⏹ 停止录制
          </button>
        ) : showRecordInput ? (
          <div className="flex gap-1">
            <input
              type="text"
              value={recordUrl}
              onChange={(e) => setRecordUrl(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-xs w-48 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="https://example.com"
            />
            <button onClick={() => { startRecording(recordUrl); setShowRecordInput(false); }} className="px-2 py-1 bg-green-500 text-white rounded text-xs">开始</button>
            <button onClick={() => setShowRecordInput(false)} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">取消</button>
          </div>
        ) : (
          <button onClick={() => setShowRecordInput(true)} className="px-2 py-1 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded text-xs font-medium">
            ⏺ 录制
          </button>
        )}

        <div className="w-px h-5 bg-gray-200 mx-1" />

        {/* 步骤按钮 */}
        <div className="flex gap-1 overflow-x-auto">
          {STEP_TYPES.map((st) => (
            <button
              key={st.type}
              onClick={() => handleAddStep(st.type)}
              className="px-2 py-1 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded text-xs whitespace-nowrap transition-colors"
            >
              {st.icon} {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* 错误横幅 */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center justify-between text-sm">
          <span className="text-red-600">{error}</span>
          <button onClick={clearError} className="text-red-400 hover:text-red-600 text-xs">关闭</button>
        </div>
      )}

      {/* 验证码人工介入 */}
      {captchaStepId && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-yellow-500">⚠</span>
            <span className="text-yellow-700 text-sm">检测到验证码，请在浏览器中手动完成验证</span>
          </div>
          <button onClick={continueAfterCaptcha} className="px-4 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded text-sm font-medium">
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
