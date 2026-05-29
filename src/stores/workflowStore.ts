import { create } from "zustand";
import type { Workflow, WorkflowStep, NodeStatus, EngineEvent, AppSettings } from "../types/workflow";

interface WorkflowState {
  workflows: Workflow[];
  currentWorkflow: Workflow | null;
  nodeStatuses: Record<string, NodeStatus>;
  isRunning: boolean;
  engineLogs: EngineEvent[];
  settings: AppSettings;

  setWorkflows: (workflows: Workflow[]) => void;
  setCurrentWorkflow: (workflow: Workflow | null) => void;
  addStep: (step: WorkflowStep) => void;
  updateStep: (id: string, updates: Partial<WorkflowStep>) => void;
  removeStep: (id: string) => void;
  reorderSteps: (fromIndex: number, toIndex: number) => void;
  setNodeStatus: (nodeId: string, status: NodeStatus) => void;
  resetNodeStatuses: () => void;
  setRunning: (running: boolean) => void;
  addEngineEvent: (event: EngineEvent) => void;
  clearLogs: () => void;
  setSettings: (settings: AppSettings) => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workflows: [],
  currentWorkflow: null,
  nodeStatuses: {},
  isRunning: false,
  engineLogs: [],
  settings: {
    llm_provider: "openai",
    llm_api_key: "",
    llm_model: "gpt-4o",
    headless: true,
    cache_ttl_days: 30,
  },

  setWorkflows: (workflows) => set({ workflows }),

  setCurrentWorkflow: (workflow) =>
    set({ currentWorkflow: workflow, nodeStatuses: {}, engineLogs: [] }),

  addStep: (step) =>
    set((state) => ({
      currentWorkflow: state.currentWorkflow
        ? {
            ...state.currentWorkflow,
            steps: [...state.currentWorkflow.steps, step],
          }
        : null,
    })),

  updateStep: (id, updates) =>
    set((state) => ({
      currentWorkflow: state.currentWorkflow
        ? {
            ...state.currentWorkflow,
            steps: state.currentWorkflow.steps.map((s) =>
              s.id === id ? { ...s, ...updates } : s
            ),
          }
        : null,
    })),

  removeStep: (id) =>
    set((state) => ({
      currentWorkflow: state.currentWorkflow
        ? {
            ...state.currentWorkflow,
            steps: state.currentWorkflow.steps.filter((s) => s.id !== id),
          }
        : null,
    })),

  reorderSteps: (fromIndex, toIndex) =>
    set((state) => {
      if (!state.currentWorkflow) return {};
      const steps = [...state.currentWorkflow.steps];
      const [moved] = steps.splice(fromIndex, 1);
      steps.splice(toIndex, 0, moved);
      return {
        currentWorkflow: { ...state.currentWorkflow, steps },
      };
    }),

  setNodeStatus: (nodeId, status) =>
    set((state) => ({
      nodeStatuses: { ...state.nodeStatuses, [nodeId]: status },
    })),

  resetNodeStatuses: () =>
    set((state) => {
      const statuses: Record<string, NodeStatus> = {};
      if (state.currentWorkflow) {
        for (const step of state.currentWorkflow.steps) {
          statuses[step.id] = "idle";
        }
      }
      return { nodeStatuses: statuses };
    }),

  setRunning: (running) => set({ isRunning: running }),

  addEngineEvent: (event) =>
    set((state) => ({
      engineLogs: [...state.engineLogs, event],
    })),

  clearLogs: () => set({ engineLogs: [] }),

  setSettings: (settings) => set({ settings }),
}));
