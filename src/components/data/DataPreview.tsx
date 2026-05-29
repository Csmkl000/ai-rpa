import { useState, useMemo, useCallback } from "react";
import { useWorkflowStore } from "../../stores/workflowStore";

export function DataPreview() {
  const engineLogs = useWorkflowStore((s) => s.engineLogs);
  const [showRaw, setShowRaw] = useState(false);

  const extractedData = useMemo(() => {
    return engineLogs
      .filter((e) => e.event_type === "DATA_EXTRACTED")
      .map((e) => e.data);
  }, [engineLogs]);

  // [Perf: columns memoize，且移到 early return 之前避免违反 hooks 规则]
  const columns = useMemo(() => {
    const keys = new Set<string>();
    for (const row of extractedData) {
      if (typeof row === "object" && row !== null) {
        for (const k of Object.keys(row)) {
          keys.add(k);
        }
      }
    }
    return Array.from(keys);
  }, [extractedData]);

  // [Perf: exportCSV memoize，避免每次 render 重建函数]
  const exportCSV = useCallback(() => {
    const header = columns.join(",");
    const rows = extractedData.map((row) =>
      columns.map((col) => {
        const val = (row as Record<string, unknown>)[col] ?? "";
        return typeof val === "string" && val.includes(",") ? `"${val}"` : String(val);
      }).join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "data.csv";
    a.click();
    // [Perf: 立即释放 Blob URL 避免内存泄漏]
    URL.revokeObjectURL(url);
  }, [columns, extractedData]);

  if (extractedData.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm">
        运行包含"提取数据"的工作流后，数据将在此显示
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500">{extractedData.length} 条数据</span>
        <div className="flex gap-2">
          <button onClick={() => setShowRaw(!showRaw)} className="text-xs text-gray-500 hover:text-gray-700">
            {showRaw ? "表格" : "JSON"}
          </button>
          <button onClick={exportCSV} className="text-xs text-blue-500 hover:text-blue-600">
            导出 CSV
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto border border-gray-200 rounded-lg">
        {showRaw ? (
          <pre className="p-3 text-xs text-gray-600 font-mono whitespace-pre-wrap">
            {JSON.stringify(extractedData, null, 2)}
          </pre>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 sticky top-0">
                {columns.map((col) => (
                  <th key={col} className="px-3 py-2 text-left text-gray-500 font-medium">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {extractedData.map((row, i) => (
                <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                  {columns.map((col) => (
                    <td key={col} className="px-3 py-2 text-gray-700">
                      {String((row as Record<string, unknown>)[col] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
