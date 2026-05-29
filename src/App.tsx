import { useAppStore } from "./stores/appStore";
import { TopBar } from "./components/layout/TopBar";
import { BottomPanel } from "./components/layout/BottomPanel";
import { StatusBar } from "./components/layout/StatusBar";
import { MainPanel } from "./components/layout/MainPanel";
import { SettingsModal } from "./components/settings/SettingsModal";
import { HomePage } from "./pages/HomePage";

export default function App() {
  const page = useAppStore((s) => s.page);

  return (
    <div className="h-screen flex flex-col bg-gray-50 text-gray-900 overflow-hidden">
      {/* 顶栏 */}
      <TopBar />

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-h-0">
        {page === "home" ? (
          <HomePage />
        ) : (
          <>
            <MainPanel />
            <BottomPanel />
          </>
        )}
      </div>

      {/* 状态栏 */}
      <StatusBar />

      {/* 设置弹窗 */}
      <SettingsModal />
    </div>
  );
}
