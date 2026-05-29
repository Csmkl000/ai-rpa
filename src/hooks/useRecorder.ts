import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useWorkflowStore } from "../stores/workflowStore";
import { logger } from "../lib/logger";
import type { WorkflowStep } from "../types/workflow";

const MOD = "录制";

export function useRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const addStep = useWorkflowStore((s) => s.addStep);

  const startRecording = useCallback(async (url: string) => {
    logger.info(MOD, `开始录制: ${url}`);
    setIsRecording(true);
    try {
      await invoke("start_recording", { url, headless: false });
    } catch (err: any) {
      logger.error(MOD, `启动录制失败: ${err}`);
      setIsRecording(false);
    }
  }, []);

  const stopRecording = useCallback(async () => {
    logger.info(MOD, "停止录制...");
    setIsRecording(false);

    try {
      // stop_recording 返回录制结果 JSON
      const resultJson = await invoke<string>("stop_recording");
      const result = JSON.parse(resultJson);

      if (result.actions && result.actions.length > 0) {
        for (const action of result.actions) {
          addStep({
            id: action.id || crypto.randomUUID(),
            type: "ACT",
            label: action.label || action.instruction,
            instruction: action.instruction,
          });
        }
        logger.success(MOD, `录制完成，已添加 ${result.actions.length} 个步骤`);
      } else {
        logger.warn(MOD, "未录制到任何操作");
      }
    } catch (err: any) {
      logger.error(MOD, `停止录制失败: ${err}`);
    }
  }, [addStep]);

  return {
    isRecording,
    startRecording,
    stopRecording,
  };
}
