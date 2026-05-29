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

const STATUS_BORDER: Record<NodeStatus, string> = {
  idle: "border-gray-200",
  running: "border-yellow-400 shadow-yellow-200 shadow-lg",
  success: "border-green-400 shadow-green-200 shadow-lg",
  error: "border-red-400 shadow-red-200 shadow-lg",
  healing: "border-orange-400 shadow-orange-200 shadow-lg animate-pulse",
  skipped: "border-gray-200 opacity-50",
};

export function ConditionNode({ data }: NodeProps) {
  const d = data as unknown as ConditionNodeData;
  const [editing, setEditing] = useState(false);
  const [condition, setCondition] = useState(d.condition || "");

  return (
    <div className={`bg-white border-2 border-dashed ${STATUS_BORDER[d.status]} rounded-xl p-4 min-w-[280px] shadow-sm`}
      onDoubleClick={() => setEditing(true)}>
      <Handle type="target" position={Position.Top} className="!bg-gray-300" />
      <div className="flex items-center gap-2 mb-2">
        <span>🔀</span>
        <span className="text-sm font-semibold text-gray-800">{d.label}</span>
        <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded">条件</span>
        <button onClick={d.onRemove} className="ml-auto text-gray-300 hover:text-red-400 text-xs">✕</button>
      </div>
      {editing ? (
        <div className="space-y-2">
          <textarea autoFocus value={condition} onChange={(e) => setCondition(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-mono resize-none" rows={3}
            placeholder='页面包含"登录"文字' />
          <button onClick={() => { d.onUpdate({ condition }); setEditing(false); }}
            className="w-full bg-orange-500 text-white rounded px-2 py-1 text-xs">确认</button>
        </div>
      ) : (
        <p className="text-xs text-gray-500 font-mono truncate">{d.condition || "双击输入条件..."}</p>
      )}
      <div className="flex justify-between mt-3 text-xs">
        <span className="text-green-500">✓ 是</span>
        <span className="text-red-500">✗ 否</span>
      </div>
      <Handle type="source" position={Position.Bottom} id="true" className="!bg-green-400" style={{ left: "30%" }} />
      <Handle type="source" position={Position.Bottom} id="false" className="!bg-red-400" style={{ left: "70%" }} />
    </div>
  );
}
