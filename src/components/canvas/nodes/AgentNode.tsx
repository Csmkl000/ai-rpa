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

const STATUS_COLORS: Record<NodeStatus, string> = {
  idle: "border-gray-600",
  running: "border-yellow-500 shadow-yellow-500/30 shadow-lg",
  success: "border-green-500 shadow-green-500/30 shadow-lg",
  error: "border-red-500 shadow-red-500/30 shadow-lg",
  healing: "border-orange-500 shadow-orange-500/30 shadow-lg animate-pulse",
  skipped: "border-gray-500 opacity-50",
};

export function AgentNode({ data }: NodeProps) {
  const d = data as unknown as AgentNodeData;
  const [editing, setEditing] = useState(false);
  const [task, setTask] = useState(d.task || "");
  const [maxSteps, setMaxSteps] = useState(d.maxSteps || 10);

  return (
    <div
      className={`bg-gray-800 border-2 ${STATUS_COLORS[d.status]} rounded-xl p-4 min-w-[300px] border-dashed`}
      onDoubleClick={() => setEditing(true)}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-500" />

      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">🤖</span>
        <span className="text-sm font-semibold">{d.label}</span>
        <span className="text-xs bg-purple-600/30 text-purple-300 px-1.5 py-0.5 rounded">
          AI 自主
        </span>
        <button
          onClick={d.onRemove}
          className="ml-auto text-gray-500 hover:text-red-400 text-xs"
        >
          ✕
        </button>
      </div>

      {editing ? (
        <div className="space-y-2">
          <textarea
            autoFocus
            value={task}
            onChange={(e) => setTask(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs resize-none"
            rows={3}
            placeholder="帮我在这篇博客里找到联系我们并留言"
          />
          <div className="flex gap-2 items-center">
            <label className="text-xs text-gray-400">最大步骤:</label>
            <input
              type="number"
              value={maxSteps}
              onChange={(e) => setMaxSteps(Number(e.target.value))}
              className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs"
              min={1}
              max={50}
            />
          </div>
          <button
            onClick={() => {
              d.onUpdate({ task, maxSteps });
              setEditing(false);
            }}
            className="w-full bg-purple-600 hover:bg-purple-500 rounded px-2 py-1 text-xs"
          >
            确认
          </button>
        </div>
      ) : (
        <div>
          <p className="text-xs text-gray-400 truncate">
            {d.task || "双击输入 AI 任务目标..."}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            最多 {d.maxSteps || 10} 步
          </p>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-gray-500" />
    </div>
  );
}
