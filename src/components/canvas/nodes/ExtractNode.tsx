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

const STATUS_BORDER: Record<NodeStatus, string> = {
  idle: "border-gray-200",
  running: "border-yellow-400 shadow-yellow-200 shadow-lg",
  success: "border-green-400 shadow-green-200 shadow-lg",
  error: "border-red-400 shadow-red-200 shadow-lg",
  healing: "border-orange-400 shadow-orange-200 shadow-lg animate-pulse",
  skipped: "border-gray-200 opacity-50",
};

export function ExtractNode({ data }: NodeProps) {
  const d = data as unknown as ExtractNodeData;
  const [editing, setEditing] = useState(false);
  const [instruction, setInstruction] = useState(d.instruction || "");
  const [fields, setFields] = useState<ExtractField[]>(d.fields || []);

  return (
    <div className={`bg-white border-2 ${STATUS_BORDER[d.status]} rounded-xl p-4 min-w-[280px] shadow-sm`}
      onDoubleClick={() => setEditing(true)}>
      <Handle type="target" position={Position.Top} className="!bg-gray-300" />
      <div className="flex items-center gap-2 mb-2">
        <span>📊</span>
        <span className="text-sm font-semibold text-gray-800">{d.label}</span>
        <button onClick={d.onRemove} className="ml-auto text-gray-300 hover:text-red-400 text-xs">✕</button>
      </div>
      {editing ? (
        <div className="space-y-2">
          <textarea value={instruction} onChange={(e) => setInstruction(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            rows={2} placeholder="提取商品信息" />
          <div className="space-y-1">
            <p className="text-xs text-gray-400">提取字段:</p>
            {fields.map((f, i) => (
              <div key={i} className="flex gap-1">
                <input value={f.name} onChange={(e) => { const nf = [...fields]; nf[i] = { ...nf[i], name: e.target.value }; setFields(nf); }}
                  className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs" placeholder="字段名" />
                <select value={f.type} onChange={(e) => { const nf = [...fields]; nf[i] = { ...nf[i], type: e.target.value as "string" | "number" }; setFields(nf); }}
                  className="border border-gray-300 rounded px-1 text-xs">
                  <option value="string">文本</option><option value="number">数字</option>
                </select>
              </div>
            ))}
            <button onClick={() => setFields([...fields, { name: "", type: "string" }])} className="text-blue-500 text-xs">+ 添加字段</button>
          </div>
          <button onClick={() => { d.onUpdate({ instruction, fields }); setEditing(false); }}
            className="w-full bg-blue-500 text-white rounded px-2 py-1 text-xs">确认</button>
        </div>
      ) : (
        <div>
          <p className="text-xs text-gray-500 truncate">{d.instruction || "双击配置提取规则..."}</p>
          {d.fields && d.fields.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {d.fields.map((f, i) => <span key={i} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{f.name}</span>)}
            </div>
          )}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-gray-300" />
    </div>
  );
}
