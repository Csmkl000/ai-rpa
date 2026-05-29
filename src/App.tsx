import { useState } from "react";
import { Sidebar } from "./components/layout/Sidebar";
import { MainPanel } from "./components/layout/MainPanel";
import { StatusBar } from "./components/layout/StatusBar";
import { LogPanel } from "./components/layout/LogPanel";
import { DataPreview } from "./components/data/DataPreview";
import { SettingsPanel } from "./components/settings/SettingsPanel";

type RightPanel = "preview" | "logs" | "settings";

export default function App() {
  const [rightPanel, setRightPanel] = useState<RightPanel>("logs");

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white overflow-hidden">
      <div className="flex-1 flex min-h-0">
        <Sidebar />
        <MainPanel />

        <div className="w-96 bg-gray-900 border-l border-gray-800 flex flex-col">
          <div className="flex border-b border-gray-800">
            {(
              [
                ["preview", "数据"],
                ["logs", "日志"],
                ["settings", "设置"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setRightPanel(key)}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                  rightPanel === key
                    ? "text-blue-400 border-b-2 border-blue-400"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-hidden">
            {rightPanel === "preview" && <DataPreview />}
            {rightPanel === "logs" && <LogPanel />}
            {rightPanel === "settings" && <SettingsPanel />}
          </div>
        </div>
      </div>

      <StatusBar />
    </div>
  );
}
