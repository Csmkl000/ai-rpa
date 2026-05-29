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
  idle: "border-gray-200 border-dashed",
  running: "border-purple-400 shadow-lg shadow-purple-200/50",
  success: "border-green-400 shadow-lg shadow-green-200/50",
  error: "border-red-400 shadow-lg shadow-red-200/50",
  healing: "border-orange-400 shadow-lg shadow-orange-200/50 animate-pulse",
  skipped: "border-gray-200 opacity-50",
};

export function AgentNode({ data }: NodeProps) {
  const d = data as unknown as AgentNodeData;
  const [editing, setEditing] = useState(false);
  const [task, setTask] = useState(d.task || "");
  const [maxSteps, setMaxSteps] = useState(d.maxSteps || 10);

  return (
    <div className={`bg-white border-2 ${STATUS_BORDER[d.status]} rounded-xl p-4 min-w-[280px] transition-all duration-200 hover:shadow-md`}
      onDoubleClick={() => setEditing(true)}>
      <Handle type="target" position={Position.Top} className="!bg-gray-300 !w-3 !h-3" />
      <div className="flex items-center gap-2 mb-2">
        <span>🤖</span>
        <span className="text-sm font-semibold text-gray-800">{d.label}</span>
        <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-md font-medium">AI</span>
        <button onClick={d.onRemove} aria-label="删除步骤" className="ml-auto text-gray-300 hover:text-red-500 hover:bg-red-50 p-0.5 rounded transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-400">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      {editing ? (
        <div className="space-y-2">
          <textarea autoFocus value={task} onChange={(e) => setTask(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
            rows={3} placeholder="帮我在这篇博客里找到联系我们并留言" />
          <div className="flex gap-2 items-center">
            <label className="text-xs text-gray-400">最大步骤:</label>
            <input type="number" value={maxSteps} onChange={(e) => setMaxSteps(Number(e.target.value))}
              className="w-16 border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-200" min={1} max={50} />
          </div>
          <button onClick={() => { d.onUpdate({ task, maxSteps }); setEditing(false); }}
            className="w-full bg-purple-500 hover:bg-purple-600 text-white rounded-lg px-2 py-1.5 text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500">确认</button>
        </div>
      ) : (
        <div>
          <p className="text-xs text-gray-500 truncate">{d.task || <span className="text-gray-300 italic">双击输入 AI 任务目标...</span>}</p>
          <p className="text-xs text-gray-400 mt-1">最多 {d.maxSteps || 10} 步</p>
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-gray-300 !w-3 !h-3" />
    </div>
  );
}
