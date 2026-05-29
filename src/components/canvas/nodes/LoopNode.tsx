import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useState } from "react";
import type { NodeStatus, ExtractField } from "../../../types/workflow";

interface LoopNodeData {
  label: string;
  extractInstruction?: string;
  fields?: ExtractField[];
  maxPages?: number;
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

export function LoopNode({ data }: NodeProps) {
  const d = data as unknown as LoopNodeData;
  const [editing, setEditing] = useState(false);
  const [extractInstruction, setExtractInstruction] = useState(d.extractInstruction || "");
  const [maxPages, setMaxPages] = useState(d.maxPages || 10);
  const [fields, setFields] = useState<ExtractField[]>(d.fields || []);

  return (
    <div className={`bg-white border-2 ${STATUS_BORDER[d.status]} rounded-xl p-4 min-w-[280px] shadow-sm`}
      onDoubleClick={() => setEditing(true)}>
      <Handle type="target" position={Position.Top} className="!bg-gray-300" />
      <div className="flex items-center gap-2 mb-2">
        <span>🔄</span>
        <span className="text-sm font-semibold text-gray-800">{d.label}</span>
        <button onClick={d.onRemove} className="ml-auto text-gray-300 hover:text-red-400 text-xs">✕</button>
      </div>
      {editing ? (
        <div className="space-y-2">
          <textarea value={extractInstruction} onChange={(e) => setExtractInstruction(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1 text-xs resize-none" rows={2} placeholder="提取列表数据" />
          <div className="flex gap-2 items-center">
            <label className="text-xs text-gray-400">最大页数:</label>
            <input type="number" value={maxPages} onChange={(e) => setMaxPages(Number(e.target.value))}
              className="w-16 border border-gray-300 rounded px-2 py-1 text-xs" min={1} max={100} />
          </div>
          <button onClick={() => { d.onUpdate({ extractInstruction, maxPages, fields }); setEditing(false); }}
            className="w-full bg-blue-500 text-white rounded px-2 py-1 text-xs">确认</button>
        </div>
      ) : (
        <div>
          <p className="text-xs text-gray-500 truncate">{d.extractInstruction || "双击配置循环提取..."}</p>
          <p className="text-xs text-gray-400 mt-1">最多 {d.maxPages || 10} 页</p>
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-gray-300" />
    </div>
  );
}
