import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useState } from "react";
import type { NodeStatus } from "../../../types/workflow";

interface ActNodeData {
  label: string;
  instruction?: string;
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

export function ActNode({ data }: NodeProps) {
  const d = data as unknown as ActNodeData;
  const [editing, setEditing] = useState(false);
  const [instruction, setInstruction] = useState(d.instruction || "");

  return (
    <div
      className={`bg-white border-2 ${STATUS_BORDER[d.status]} rounded-xl p-4 min-w-[260px] shadow-sm`}
      onDoubleClick={() => setEditing(true)}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-300" />
      <div className="flex items-center gap-2 mb-2">
        <span>👆</span>
        <span className="text-sm font-semibold text-gray-800">{d.label}</span>
        <button onClick={d.onRemove} className="ml-auto text-gray-300 hover:text-red-400 text-xs">✕</button>
      </div>
      {editing ? (
        <textarea autoFocus value={instruction} onChange={(e) => setInstruction(e.target.value)}
          onBlur={() => { d.onUpdate({ instruction }); setEditing(false); }}
          className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
          rows={2} placeholder="点击确认付款" />
      ) : (
        <p className="text-xs text-gray-500 truncate">{d.instruction || "双击输入操作指令..."}</p>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-gray-300" />
    </div>
  );
}
