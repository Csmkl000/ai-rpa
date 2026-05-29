import { useWorkflowStore } from "../../stores/workflowStore";
import { useEngine } from "../../hooks/useEngine";
import { WorkflowCanvas } from "../canvas/WorkflowCanvas";
import { StepType } from "../../types/workflow";

const STEP_TYPES: { type: StepType; label: string; icon: string }[] = [
  { type: "GOTO", label: "打开网页", icon: "🌐" },
  { type: "ACT", label: "执行操作", icon: "👆" },
  { type: "EXTRACT", label: "提取数据", icon: "📊" },
  { type: "OBSERVE", label: "观察页面", icon: "👁" },
  { type: "EXTRACT_LOOP", label: "循环提取", icon: "🔄" },
  { type: "AUTONOMOUS_AGENT", label: "AI 智能体", icon: "🤖" },
];

export function MainPanel() {
  const currentWorkflow = useWorkflowStore((s) => s.currentWorkflow);
  const { runWorkflow, stopWorkflow, isRunning, error, clearError, captchaStepId, continueAfterCaptcha } = useEngine();
  const addStep = useWorkflowStore((s) => s.addStep);

  const handleAddStep = (type: StepType) => {
    const labels: Record<StepType, string> = {
      GOTO: "打开网页",
      ACT: "执行操作",
      EXTRACT: "提取数据",
      OBSERVE: "观察页面",
      EXTRACT_LOOP: "循环提取",
      AUTONOMOUS_AGENT: "AI 智能体",
    };
    addStep({
      id: crypto.randomUUID(),
      type,
      label: labels[type],
    });
  };

  if (!currentWorkflow) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-lg mb-2">选择或创建一个工作流开始</p>
          <p className="text-sm">从左侧边栏选择现有工作流，或点击"新建"</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Toolbar */}
      <div className="h-14 bg-gray-900 border-b border-gray-800 flex items-center px-4 gap-2">
        <input
          type="text"
          value={currentWorkflow.name}
          onChange={(e) => {
            const store = useWorkflowStore.getState();
            if (store.currentWorkflow) {
              store.setCurrentWorkflow({ ...store.currentWorkflow, name: e.target.value });
            }
          }}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm w-48 focus:outline-none focus:border-blue-500"
          placeholder="工作流名称"
        />

        <div className="flex-1" />

        {/* Step type buttons */}
        <div className="flex gap-1">
          {STEP_TYPES.map((st) => (
            <button
              key={st.type}
              onClick={() => handleAddStep(st.type)}
              disabled={isRunning}
              title={st.label}
              className="px-2 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 rounded text-xs transition-colors"
            >
              {st.icon} {st.label}
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-gray-700 mx-2" />

        {isRunning ? (
          <button
            onClick={stopWorkflow}
            className="px-4 py-1.5 bg-red-600 hover:bg-red-500 rounded text-sm font-medium transition-colors"
          >
            停止
          </button>
        ) : (
          <button
            onClick={runWorkflow}
            className="px-4 py-1.5 bg-green-600 hover:bg-green-500 rounded text-sm font-medium transition-colors"
          >
            运行
          </button>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-900/50 border-b border-red-700 px-4 py-2 flex items-center justify-between text-sm">
          <span className="text-red-300">{error}</span>
          <button onClick={clearError} className="text-red-400 hover:text-red-300 text-xs">
            关闭
          </button>
        </div>
      )}

      {/* 指南 5: 验证码/2FA 人工介入对话框 */}
      {captchaStepId && (
        <div className="bg-yellow-900/50 border-b border-yellow-700 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-yellow-400 text-lg">⚠</span>
            <span className="text-yellow-200 text-sm">
              检测到验证码或双重验证，请在浏览器中手动完成验证
            </span>
          </div>
          <button
            onClick={continueAfterCaptcha}
            className="px-4 py-1.5 bg-yellow-600 hover:bg-yellow-500 rounded text-sm font-medium transition-colors"
          >
            我已验证，继续
          </button>
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 relative">
        <WorkflowCanvas />
      </div>
    </div>
  );
}
