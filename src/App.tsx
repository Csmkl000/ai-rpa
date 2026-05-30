import { useAppStore } from "./stores/appStore";
import { TopBar } from "./components/layout/TopBar";
import { BottomPanel } from "./components/layout/BottomPanel";
import { StatusBar } from "./components/layout/StatusBar";
import { MainPanel } from "./components/layout/MainPanel";
import { SettingsModal } from "./components/settings/SettingsModal";
import { HomePage } from "./pages/HomePage";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { EngineListener } from "./components/layout/EngineListener";

export default function App() {
  const page = useAppStore((s) => s.page);

  return (
    <ErrorBoundary>
      {/* 引擎事件全局监听器，只挂载一次 */}
      <EngineListener />

      <div className="h-screen flex flex-col bg-gray-50 text-gray-900 overflow-hidden">
        <TopBar />

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

        <StatusBar />
        <SettingsModal />
      </div>
    </ErrorBoundary>
  );
}
