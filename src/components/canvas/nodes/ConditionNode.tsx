import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useState } from "react";
import type { NodeStatus } from "../../../types/workflow";

interface ConditionNodeData {
  label: string;
  condition?: string;
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

export function ConditionNode({ data }: NodeProps) {
  const d = data as unknown as ConditionNodeData;
  const [editing, setEditing] = useState(false);
  const [condition, setCondition] = useState(d.condition || "");

  return (
    <div
      className={`bg-gray-800 border-2 ${STATUS_COLORS[d.status]} rounded-xl p-4 min-w-[300px] border-dashed`}
      onDoubleClick={() => setEditing(true)}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-500" />

      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">🔀</span>
        <span className="text-sm font-semibold">{d.label}</span>
        <span className="text-xs bg-orange-600/30 text-orange-300 px-1.5 py-0.5 rounded">
          条件
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
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs font-mono resize-none"
            rows={3}
            placeholder='页面包含"登录"文字'
          />
          <p className="text-xs text-gray-500">
            支持自然语言条件描述，AI 自动判断
          </p>
          <button
            onClick={() => {
              d.onUpdate({ condition });
              setEditing(false);
            }}
            className="w-full bg-orange-600 hover:bg-orange-500 rounded px-2 py-1 text-xs"
          >
            确认
          </button>
        </div>
      ) : (
        <p className="text-xs text-gray-400 font-mono truncate">
          {d.condition || "双击输入条件表达式..."}
        </p>
      )}

      {/* True / False 输出端口 */}
      <div className="flex justify-between mt-3">
        <div className="flex items-center gap-1">
          <Handle
            type="source"
            position={Position.Bottom}
            id="true"
            className="!bg-green-500 !relative !left-[-20px]"
            style={{ left: "30%", bottom: 0, position: "relative" }}
          />
          <span className="text-xs text-green-400">是</span>
        </div>
        <div className="flex items-center gap-1">
          <Handle
            type="source"
            position={Position.Bottom}
            id="false"
            className="!bg-red-500 !relative !right-[-20px]"
            style={{ left: "70%", bottom: 0, position: "relative" }}
          />
          <span className="text-xs text-red-400">否</span>
        </div>
      </div>
    </div>
  );
}
