import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useWorkflowStore } from "../stores/workflowStore";
import { logger } from "../lib/logger";
import type { EngineEvent, WorkflowStep } from "../types/workflow";

const MOD = "Recorder";

export function useRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedSteps, setRecordedSteps] = useState<Partial<WorkflowStep>[]>([]);
  const addStep = useWorkflowStore((s) => s.addStep);
  const settings = useWorkflowStore((s) => s.settings);

  useEffect(() => {
    const unlisten = listen<EngineEvent>("rpa-event", (event) => {
      const { event_type, data } = event.payload;
      if (event_type === "RECORDED_ACTION") {
        const log = data.log as string;
        const jsonStr = log.split("[ACTION_COMPLETED] ")[1];
        if (jsonStr) {
          try {
            const parsed = JSON.parse(jsonStr);
            const step: Partial<WorkflowStep> = {
              id: crypto.randomUUID(),
              type: "ACT",
              label: parsed.instruction || "录制操作",
              instruction: parsed.instruction,
            };
            setRecordedSteps((prev) => [...prev, step]);
            logger.info(MOD, `录制: ${parsed.instruction}`);
          } catch {}
        }
      }
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  const startRecording = useCallback(async (url: string) => {
    logger.info(MOD, `开始录制: ${url}`);
    setIsRecording(true);
    setRecordedSteps([]);

    try {
      await invoke("start_recording", {
        url,
        apiKey: settings.llm_api_key,
        model: settings.llm_model,
        baseUrl: settings.base_url || "",
      });
    } catch (err: any) {
      logger.error(MOD, "启动录制失败:", err);
      setIsRecording(false);
    }
  }, [settings]);

  const stopRecording = useCallback(async () => {
    logger.info(MOD, "停止录制");
    setIsRecording(false);

    try {
      await invoke("stop_recording");
    } catch (err: any) {
      logger.error(MOD, "停止录制失败:", err);
    }
  }, []);

  const addRecordedToWorkflow = useCallback(() => {
    for (const step of recordedSteps) {
      if (step.type && step.label) {
        addStep({
          id: step.id || crypto.randomUUID(),
          type: step.type as any,
          label: step.label,
          instruction: step.instruction,
        });
      }
    }
    logger.info(MOD, `已将 ${recordedSteps.length} 个录制步骤添加到工作流`);
    setRecordedSteps([]);
  }, [recordedSteps, addStep]);

  return {
    isRecording,
    recordedSteps,
    startRecording,
    stopRecording,
    addRecordedToWorkflow,
  };
}
