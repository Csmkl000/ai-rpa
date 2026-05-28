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

const STATUS_COLORS: Record<NodeStatus, string> = {
  idle: "border-gray-600",
  running: "border-yellow-500 shadow-yellow-500/30 shadow-lg",
  success: "border-green-500 shadow-green-500/30 shadow-lg",
  error: "border-red-500 shadow-red-500/30 shadow-lg",
  healing: "border-orange-500 shadow-orange-500/30 shadow-lg animate-pulse",
  skipped: "border-gray-500 opacity-50",
};

export function LoopNode({ data }: NodeProps) {
  const d = data as unknown as LoopNodeData;
  const [editing, setEditing] = useState(false);
  const [extractInstruction, setExtractInstruction] = useState(d.extractInstruction || "");
  const [maxPages, setMaxPages] = useState(d.maxPages || 10);
  const [fields, setFields] = useState<ExtractField[]>(d.fields || []);

  return (
    <div
      className={`bg-gray-800 border-2 ${STATUS_COLORS[d.status]} rounded-xl p-4 min-w-[300px]`}
      onDoubleClick={() => setEditing(true)}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-500" />

      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">🔄</span>
        <span className="text-sm font-semibold">{d.label}</span>
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
            value={extractInstruction}
            onChange={(e) => setExtractInstruction(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs resize-none"
            rows={2}
            placeholder="提取页面中的列表数据"
          />
          <div className="flex gap-2 items-center">
            <label className="text-xs text-gray-400">最大页数:</label>
            <input
              type="number"
              value={maxPages}
              onChange={(e) => setMaxPages(Number(e.target.value))}
              className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs"
              min={1}
              max={100}
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500">提取字段:</p>
            {fields.map((f, i) => (
              <div key={i} className="flex gap-1">
                <input
                  value={f.name}
                  onChange={(e) => {
                    const newFields = [...fields];
                    newFields[i] = { ...newFields[i], name: e.target.value };
                    setFields(newFields);
                  }}
                  className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs"
                  placeholder="字段名"
                />
                <select
                  value={f.type}
                  onChange={(e) => {
                    const newFields = [...fields];
                    newFields[i] = { ...newFields[i], type: e.target.value as "string" | "number" };
                    setFields(newFields);
                  }}
                  className="bg-gray-700 border border-gray-600 rounded px-1 text-xs"
                >
                  <option value="string">文本</option>
                  <option value="number">数字</option>
                </select>
              </div>
            ))}
            <button
              onClick={() => setFields([...fields, { name: "", type: "string" }])}
              className="text-blue-400 hover:text-blue-300 text-xs"
            >
              + 添加字段
            </button>
          </div>
          <button
            onClick={() => {
              d.onUpdate({ extractInstruction, maxPages, fields });
              setEditing(false);
            }}
            className="w-full bg-blue-600 hover:bg-blue-500 rounded px-2 py-1 text-xs"
          >
            确认
          </button>
        </div>
      ) : (
        <div>
          <p className="text-xs text-gray-400 truncate">
            {d.extractInstruction || "双击配置循环提取..."}
          </p>
          <div className="flex gap-2 mt-1 text-xs text-gray-500">
            <span>最多 {d.maxPages || 10} 页</span>
            {d.fields && <span>{d.fields.length} 个字段</span>}
          </div>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-gray-500" />
    </div>
  );
}
