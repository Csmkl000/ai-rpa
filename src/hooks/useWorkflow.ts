import { useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useWorkflowStore } from "../stores/workflowStore";
import type { Workflow, WorkflowStep, StepType } from "../types/workflow";

export function useWorkflow() {
  const {
    workflows,
    currentWorkflow,
    setWorkflows,
    setCurrentWorkflow,
    addStep,
    updateStep,
    removeStep,
  } = useWorkflowStore();

  const loadWorkflows = useCallback(async () => {
    try {
      const result = await invoke<Workflow[]>("load_workflows");
      setWorkflows(result);
    } catch (err) {
      console.error("加载工作流列表失败:", err);
    }
  }, [setWorkflows]);

  const saveWorkflow = useCallback(async () => {
    if (!currentWorkflow) return;
    try {
      const id = await invoke<number>("save_workflow", {
        input: {
          id: currentWorkflow.id ?? null,
          name: currentWorkflow.name,
          steps: currentWorkflow.steps,
        },
      });
      setCurrentWorkflow({ ...currentWorkflow, id });
      await loadWorkflows();
    } catch (err) {
      console.error("保存工作流失败:", err);
    }
  }, [currentWorkflow, setCurrentWorkflow, loadWorkflows]);

  const deleteWorkflow = useCallback(
    async (id: number) => {
      try {
        await invoke("delete_workflow", { id });
        await loadWorkflows();
        if (currentWorkflow?.id === id) {
          setCurrentWorkflow(null);
        }
      } catch (err) {
        console.error("删除工作流失败:", err);
      }
    },
    [currentWorkflow, loadWorkflows, setCurrentWorkflow]
  );

  const createNewWorkflow = useCallback(() => {
    const workflow: Workflow = {
      name: "新建工作流",
      steps: [],
    };
    setCurrentWorkflow(workflow);
  }, [setCurrentWorkflow]);

  const addNewStep = useCallback(
    (type: StepType) => {
      const labels: Record<StepType, string> = {
        GOTO: "打开网页",
        ACT: "执行操作",
        EXTRACT: "提取数据",
        OBSERVE: "观察页面",
        EXTRACT_LOOP: "循环提取",
        AUTONOMOUS_AGENT: "AI 智能体",
      };

      const step: WorkflowStep = {
        id: crypto.randomUUID(),
        type,
        label: labels[type],
      };
      addStep(step);
    },
    [addStep]
  );

  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  return {
    workflows,
    currentWorkflow,
    loadWorkflows,
    saveWorkflow,
    deleteWorkflow,
    createNewWorkflow,
    addNewStep,
    updateStep,
    removeStep,
    setCurrentWorkflow,
  };
}
