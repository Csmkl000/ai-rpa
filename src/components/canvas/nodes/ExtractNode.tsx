import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useState } from "react";
import type { NodeStatus, ExtractField } from "../../../types/workflow";

interface ExtractNodeData {
  label: string;
  instruction?: string;
  fields?: ExtractField[];
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

export function ExtractNode({ data }: NodeProps) {
  const d = data as unknown as ExtractNodeData;
  const [editing, setEditing] = useState(false);
  const [instruction, setInstruction] = useState(d.instruction || "");
  const [fields, setFields] = useState<ExtractField[]>(d.fields || []);

  const addField = () => {
    setFields([...fields, { name: "", type: "string" }]);
  };

  const updateField = (index: number, updates: Partial<ExtractField>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    setFields(newFields);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  return (
    <div
      className={`bg-gray-800 border-2 ${STATUS_COLORS[d.status]} rounded-xl p-4 min-w-[300px]`}
      onDoubleClick={() => setEditing(true)}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-500" />

      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">📊</span>
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
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500 resize-none"
            rows={2}
            placeholder="提取页面中的商品信息"
          />
          <div className="space-y-1">
            <p className="text-xs text-gray-500">提取字段:</p>
            {fields.map((f, i) => (
              <div key={i} className="flex gap-1">
                <input
                  value={f.name}
                  onChange={(e) => updateField(i, { name: e.target.value })}
                  className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs"
                  placeholder="字段名"
                />
                <select
                  value={f.type}
                  onChange={(e) => updateField(i, { type: e.target.value as "string" | "number" })}
                  className="bg-gray-700 border border-gray-600 rounded px-1 text-xs"
                >
                  <option value="string">文本</option>
                  <option value="number">数字</option>
                </select>
                <button
                  onClick={() => removeField(i)}
                  className="text-red-400 hover:text-red-300 text-xs px-1"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              onClick={addField}
              className="text-blue-400 hover:text-blue-300 text-xs"
            >
              + 添加字段
            </button>
          </div>
          <button
            onClick={() => {
              d.onUpdate({ instruction, fields });
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
            {d.instruction || "双击配置提取规则..."}
          </p>
          {d.fields && d.fields.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {d.fields.map((f, i) => (
                <span key={i} className="text-xs bg-gray-700 px-1.5 py-0.5 rounded">
                  {f.name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-gray-500" />
    </div>
  );
}
