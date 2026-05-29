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
  running: "border-yellow-400 shadow-lg shadow-yellow-200/50",
  success: "border-green-400 shadow-lg shadow-green-200/50",
  error: "border-red-400 shadow-lg shadow-red-200/50",
  healing: "border-orange-400 shadow-lg shadow-orange-200/50 animate-pulse",
  skipped: "border-gray-200 opacity-50",
};

const STATUS_DOT: Record<NodeStatus, string> = {
  idle: "bg-gray-300",
  running: "bg-yellow-400 animate-pulse",
  success: "bg-green-400",
  error: "bg-red-400",
  healing: "bg-orange-400 animate-pulse",
  skipped: "bg-gray-300",
};

export function ActNode({ data }: NodeProps) {
  const d = data as unknown as ActNodeData;
  const [editing, setEditing] = useState(false);
  const [instruction, setInstruction] = useState(d.instruction || "");

  return (
    <div
      className={`bg-white border-2 ${STATUS_BORDER[d.status]} rounded-xl p-4 min-w-[260px] transition-all duration-200 hover:shadow-md`}
      onDoubleClick={() => setEditing(true)}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-300 !w-3 !h-3" />

      <div className="flex items-center gap-2 mb-2">
        <span className={`w-2 h-2 rounded-full ${STATUS_DOT[d.status]}`} />
        <span className="text-sm font-semibold text-gray-800">{d.label}</span>
        <button
          onClick={d.onRemove}
          aria-label="删除步骤"
          className="ml-auto text-gray-300 hover:text-red-500 hover:bg-red-50 p-0.5 rounded transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-400"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {editing ? (
        <textarea
          autoFocus
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          onBlur={() => { d.onUpdate({ instruction }); setEditing(false); }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { d.onUpdate({ instruction }); setEditing(false); } }}
          className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all duration-200"
          rows={2}
          placeholder="点击确认付款"
        />
      ) : (
        <p className="text-xs text-gray-500 truncate leading-relaxed">
          {d.instruction || <span className="text-gray-300 italic">双击输入操作指令...</span>}
        </p>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-gray-300 !w-3 !h-3" />
    </div>
  );
}
