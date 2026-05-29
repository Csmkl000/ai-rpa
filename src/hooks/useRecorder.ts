import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useWorkflowStore } from "../stores/workflowStore";
import { logger } from "../lib/logger";
import type { EngineEvent, WorkflowStep } from "../types/workflow";

const MOD = "录制";

export function useRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedSteps, setRecordedSteps] = useState<Partial<WorkflowStep>[]>([]);
  const addStep = useWorkflowStore((s) => s.addStep);
  const settings = useWorkflowStore((s) => s.settings);

  useEffect(() => {
    const unlisten = listen<EngineEvent>("rpa-event", (event) => {
      const { event_type, data } = event.payload;
      if (event_type === "RECORDED_ACTION" && data.instruction) {
        const instruction = data.instruction as string;
        if (instruction && instruction.length > 0) {
          const step: Partial<WorkflowStep> = {
            id: crypto.randomUUID(),
            type: "ACT",
            label: instruction,
            instruction,
          };
          setRecordedSteps((prev) => [...prev, step]);
          logger.success(MOD, instruction);
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
      logger.error(MOD, `启动录制失败: ${err}`);
      setIsRecording(false);
    }
  }, [settings]);

  const stopRecording = useCallback(async () => {
    logger.info(MOD, "停止录制");
    setIsRecording(false);
    try {
      await invoke("stop_recording");
    } catch (err: any) {
      logger.error(MOD, `停止录制失败: ${err}`);
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
    logger.success(MOD, `已添加 ${recordedSteps.length} 个步骤到工作流`);
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
