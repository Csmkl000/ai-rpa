import { useEffect, useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useWorkflowStore } from "../stores/workflowStore";
import type { EngineEvent } from "../types/workflow";

export function useEngine() {
  const {
    currentWorkflow,
    isRunning,
    setRunning,
    addEngineEvent,
    setNodeStatus,
    resetNodeStatuses,
  } = useWorkflowStore();

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unlisten = listen<EngineEvent>("rpa-event", (event) => {
      const { event_type, data } = event.payload;
      addEngineEvent(event.payload);

      switch (event_type) {
        case "CACHE_HIT":
          if (data.step_id) setNodeStatus(data.step_id as string, "success");
          break;
        case "SELF_HEAL":
          if (data.step_id) setNodeStatus(data.step_id as string, "healing");
          break;
        case "ACTION_COMPLETED":
        case "STEP_COMPLETE":
          if (data.step_id) setNodeStatus(data.step_id as string, "success");
          break;
        case "STEP_START":
          if (data.step_id) setNodeStatus(data.step_id as string, "running");
          break;
        case "DATA_EXTRACTED":
          break;
        case "AGENT_SUCCESS":
          break;
        case "FINISHED":
          setRunning(false);
          break;
        case "ERROR":
          if (data.step_id) setNodeStatus(data.step_id as string, "error");
          if (data.message) setError(data.message as string);
          break;
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [addEngineEvent, setNodeStatus, setRunning]);

  const runWorkflow = useCallback(async () => {
    if (!currentWorkflow || isRunning) return;

    setError(null);
    resetNodeStatuses();
    setRunning(true);

    const workflowJson = JSON.stringify(currentWorkflow);

    try {
      await invoke("run_workflow", {
        workflowJson,
        workflowId: currentWorkflow.id ?? 0,
      });
    } catch (err: any) {
      const msg = typeof err === "string" ? err : err?.message || String(err);
      setError(msg);
      setRunning(false);
    }
  }, [currentWorkflow, isRunning, resetNodeStatuses, setRunning]);

  const stopWorkflow = useCallback(async () => {
    try {
      await invoke("stop_workflow");
      setRunning(false);
    } catch (err) {
      console.error("停止工作流失败:", err);
    }
  }, [setRunning]);

  const clearError = useCallback(() => setError(null), []);

  return { runWorkflow, stopWorkflow, isRunning, error, clearError };
}
