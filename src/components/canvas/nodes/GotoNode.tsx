import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useState } from "react";
import type { NodeStatus } from "../../../types/workflow";

interface GotoNodeData {
  label: string;
  value?: string;
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

export function GotoNode({ data }: NodeProps) {
  const d = data as unknown as GotoNodeData;
  const [editing, setEditing] = useState(false);
  const [url, setUrl] = useState(d.value || "");

  return (
    <div
      className={`bg-gray-800 border-2 ${STATUS_COLORS[d.status]} rounded-xl p-4 min-w-[280px]`}
      onDoubleClick={() => setEditing(true)}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-500" />

      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">🌐</span>
        <span className="text-sm font-semibold">{d.label}</span>
        <button
          onClick={d.onRemove}
          className="ml-auto text-gray-500 hover:text-red-400 text-xs"
        >
          ✕
        </button>
      </div>

      {editing ? (
        <input
          autoFocus
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onBlur={() => {
            d.onUpdate({ value: url });
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              d.onUpdate({ value: url });
              setEditing(false);
            }
          }}
          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
          placeholder="https://example.com"
        />
      ) : (
        <p className="text-xs text-gray-400 truncate">{d.value || "双击输入网址..."}</p>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-gray-500" />
    </div>
  );
}
