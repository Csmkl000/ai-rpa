import { create } from "zustand";

export type Page = "home" | "workflow";

interface AppState {
  page: Page;
  bottomPanelTab: "data" | "logs";
  bottomPanelOpen: boolean;
  settingsOpen: boolean;

  setPage: (page: Page) => void;
  setBottomPanelTab: (tab: "data" | "logs") => void;
  toggleBottomPanel: () => void;
  setSettingsOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  page: "home",
  bottomPanelTab: "logs",
  bottomPanelOpen: true,
  settingsOpen: false,

  setPage: (page) => set({ page }),
  setBottomPanelTab: (tab) => set({ bottomPanelTab: tab }),
  toggleBottomPanel: () => set((s) => ({ bottomPanelOpen: !s.bottomPanelOpen })),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
}));
