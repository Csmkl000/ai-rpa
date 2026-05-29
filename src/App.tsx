import { useAppStore } from "./stores/appStore";
import { TopBar } from "./components/layout/TopBar";
import { BottomPanel } from "./components/layout/BottomPanel";
import { StatusBar } from "./components/layout/StatusBar";
import { MainPanel } from "./components/layout/MainPanel";
import { SettingsModal } from "./components/settings/SettingsModal";
import { HomePage } from "./pages/HomePage";
// [Refactor: 添加 Error Boundary 防止白屏 by Claude]
import { ErrorBoundary } from "./components/ErrorBoundary";

export default function App() {
  const page = useAppStore((s) => s.page);

  return (
    <ErrorBoundary>
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
