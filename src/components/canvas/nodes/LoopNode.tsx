import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useState } from "react";
import type { NodeStatus, WorkflowStep, StepType } from "../../../types/workflow";

interface LoopNodeData {
  label: string;
  condition?: string;
  maxIterations?: number;
  body?: WorkflowStep[];
  status: NodeStatus;
  onUpdate: (updates: Record<string, unknown>) => void;
  onRemove: () => void;
  [key: string]: unknown;
}

const STATUS_BORDER: Record<NodeStatus, string> = {
  idle: "border-gray-200",
  running: "border-yellow-400 shadow-yellow-200 shadow-lg",
  success: "border-green-400 shadow-green-200 shadow-lg",
  error: "border-red-400 shadow-red-200 shadow-lg",
  healing: "border-orange-400 shadow-orange-200 shadow-lg animate-pulse",
  skipped: "border-gray-200 opacity-50",
};

const BODY_STEP_TYPES: { type: StepType; label: string; icon: string }[] = [
  { type: "ACT", label: "操作", icon: "👆" },
  { type: "EXTRACT", label: "提取", icon: "📊" },
  { type: "OBSERVE", label: "观察", icon: "👁" },
];

export function LoopNode({ data }: NodeProps) {
  const d = data as unknown as LoopNodeData;
  const [editing, setEditing] = useState(false);
  const [condition, setCondition] = useState(d.condition || "");
  const [maxIterations, setMaxIterations] = useState(d.maxIterations || 10);
  const [body, setBody] = useState<WorkflowStep[]>(d.body || []);

  const addBodyStep = (type: StepType) => {
    const labels: Record<string, string> = { ACT: "操作", EXTRACT: "提取", OBSERVE: "观察" };
    const newStep: WorkflowStep = {
      id: crypto.randomUUID(),
      type,
      label: labels[type] || type,
    };
    setBody([...body, newStep]);
  };

  const removeBodyStep = (id: string) => {
    setBody(body.filter((s) => s.id !== id));
  };

  const updateBodyStep = (id: string, updates: Partial<WorkflowStep>) => {
    setBody(body.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  return (
    <div
      className={`bg-white border-2 ${STATUS_BORDER[d.status]} rounded-xl min-w-[300px] shadow-sm`}
      onDoubleClick={() => setEditing(true)}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-300" />

      {/* 头部 */}
      <div className="flex items-center gap-2 p-4 pb-2">
        <span>🔄</span>
        <span className="text-sm font-semibold text-gray-800">{d.label}</span>
        <span className="text-xs text-gray-400">最多 {d.maxIterations || 10} 次</span>
        <button onClick={d.onRemove} className="ml-auto text-gray-300 hover:text-red-400 text-xs">✕</button>
      </div>

      {editing ? (
        <div className="px-4 pb-4 space-y-3">
          {/* 条件 */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">继续条件（AI 判断）</label>
            <textarea
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1 text-xs resize-none"
              rows={2}
              placeholder="还有下一页可以点击"
            />
          </div>

          {/* 最大次数 */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">最大迭代:</label>
            <input
              type="number"
              value={maxIterations}
              onChange={(e) => setMaxIterations(Number(e.target.value))}
              className="w-16 border border-gray-300 rounded px-2 py-1 text-xs"
              min={1}
              max={100}
            />
          </div>

          {/* 循环体 */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">每次循环执行:</label>
            <div className="bg-gray-50 rounded-lg p-2 space-y-1 min-h-[40px]">
              {body.map((step, i) => (
                <div key={step.id} className="flex items-center gap-1 bg-white rounded px-2 py-1 text-xs border border-gray-200">
                  <span className="text-gray-400">{i + 1}.</span>
                  <span>{step.label}</span>
                  {step.instruction && <span className="text-gray-400 truncate flex-1">— {step.instruction}</span>}
                  <button onClick={() => removeBodyStep(step.id)} className="text-gray-300 hover:text-red-400 ml-1">✕</button>
                </div>
              ))}
              <div className="flex gap-1 pt-1">
                {BODY_STEP_TYPES.map((st) => (
                  <button
                    key={st.type}
                    onClick={() => addBodyStep(st.type)}
                    className="px-2 py-0.5 bg-gray-200 hover:bg-gray-300 rounded text-xs text-gray-600"
                  >
                    {st.icon} {st.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              d.onUpdate({ condition, maxIterations, body });
              setEditing(false);
            }}
            className="w-full bg-blue-500 text-white rounded px-2 py-1.5 text-xs font-medium"
          >
            确认
          </button>
        </div>
      ) : (
        <div className="px-4 pb-4">
          <p className="text-xs text-gray-500 mb-2">
            {d.condition || "双击设置循环条件..."}
          </p>
          {d.body && d.body.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-2 space-y-0.5">
              {d.body.map((step, i) => (
                <div key={step.id} className="text-xs text-gray-500">
                  {i + 1}. {step.label}
                  {step.instruction && <span className="text-gray-400"> — {step.instruction}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-gray-300" />
    </div>
  );
}
