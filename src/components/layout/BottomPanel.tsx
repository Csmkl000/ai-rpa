import { useAppStore } from "../../stores/appStore";
import { LogPanel } from "./LogPanel";
import { DataPreview } from "../data/DataPreview";

export function BottomPanel() {
  const { bottomPanelTab, setBottomPanelTab, bottomPanelOpen, toggleBottomPanel } = useAppStore();

  return (
    <div className="bg-white border-t border-gray-200 shrink-0 flex flex-col" style={{ height: bottomPanelOpen ? "240px" : "36px" }}>
      {/* 标签栏 */}
      <div className="flex items-center h-9 px-3 border-b border-gray-100 shrink-0">
        <button
          onClick={() => setBottomPanelTab("data")}
          className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
            bottomPanelTab === "data"
              ? "bg-blue-50 text-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          数据
        </button>
        <button
          onClick={() => setBottomPanelTab("logs")}
          className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
            bottomPanelTab === "logs"
              ? "bg-blue-50 text-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          日志
        </button>

        <div className="flex-1" />

        <button
          onClick={toggleBottomPanel}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          title={bottomPanelOpen ? "收起" : "展开"}
        >
          <svg className={`w-4 h-4 transition-transform ${bottomPanelOpen ? "rotate-0" : "rotate-180"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* 内容 */}
      {bottomPanelOpen && (
        <div className="flex-1 overflow-hidden">
          {bottomPanelTab === "data" ? <DataPreview /> : <LogPanel />}
        </div>
      )}
    </div>
  );
}
