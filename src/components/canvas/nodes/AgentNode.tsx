import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useState } from "react";
import type { NodeStatus } from "../../../types/workflow";

interface AgentNodeData {
  label: string;
  task?: string;
  maxSteps?: number;
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

export function AgentNode({ data }: NodeProps) {
  const d = data as unknown as AgentNodeData;
  const [editing, setEditing] = useState(false);
  const [task, setTask] = useState(d.task || "");
  const [maxSteps, setMaxSteps] = useState(d.maxSteps || 10);

  return (
    <div className={`bg-white border-2 border-dashed ${STATUS_BORDER[d.status]} rounded-xl p-4 min-w-[280px] shadow-sm`}
      onDoubleClick={() => setEditing(true)}>
      <Handle type="target" position={Position.Top} className="!bg-gray-300" />
      <div className="flex items-center gap-2 mb-2">
        <span>🤖</span>
        <span className="text-sm font-semibold text-gray-800">{d.label}</span>
        <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">AI</span>
        <button onClick={d.onRemove} className="ml-auto text-gray-300 hover:text-red-400 text-xs">✕</button>
      </div>
      {editing ? (
        <div className="space-y-2">
          <textarea autoFocus value={task} onChange={(e) => setTask(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1 text-xs resize-none" rows={3}
            placeholder="帮我在这篇博客里找到联系我们并留言" />
          <div className="flex gap-2 items-center">
            <label className="text-xs text-gray-400">最大步骤:</label>
            <input type="number" value={maxSteps} onChange={(e) => setMaxSteps(Number(e.target.value))}
              className="w-16 border border-gray-300 rounded px-2 py-1 text-xs" min={1} max={50} />
          </div>
          <button onClick={() => { d.onUpdate({ task, maxSteps }); setEditing(false); }}
            className="w-full bg-purple-500 text-white rounded px-2 py-1 text-xs">确认</button>
        </div>
      ) : (
        <div>
          <p className="text-xs text-gray-500 truncate">{d.task || "双击输入 AI 任务目标..."}</p>
          <p className="text-xs text-gray-400 mt-1">最多 {d.maxSteps || 10} 步</p>
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-gray-300" />
    </div>
  );
}
