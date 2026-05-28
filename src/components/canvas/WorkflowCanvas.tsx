import { useCallback, useEffect, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type OnConnect,
  type Node,
  type Edge,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useWorkflowStore } from "../../stores/workflowStore";
import { GotoNode } from "./nodes/GotoNode";
import { ActNode } from "./nodes/ActNode";
import { ExtractNode } from "./nodes/ExtractNode";
import { LoopNode } from "./nodes/LoopNode";
import { AgentNode } from "./nodes/AgentNode";

const nodeTypes = {
  goto: GotoNode,
  act: ActNode,
  extract: ExtractNode,
  loop: LoopNode,
  agent: AgentNode,
};

const TYPE_TO_NODE: Record<string, string> = {
  GOTO: "goto",
  ACT: "act",
  EXTRACT: "extract",
  OBSERVE: "act",
  EXTRACT_LOOP: "loop",
  AUTONOMOUS_AGENT: "agent",
};

function buildFlowData(
  steps: any[],
  nodeStatuses: Record<string, string>,
  onUpdate: (id: string, updates: Record<string, unknown>) => void,
  onRemove: (id: string) => void
) {
  const nodes: Node[] = steps.map((step, i) => ({
    id: step.id,
    type: TYPE_TO_NODE[step.type] || "act",
    position: { x: 250, y: i * 140 },
    data: {
      ...step,
      status: nodeStatuses[step.id] || "idle",
      onUpdate: (updates: Record<string, unknown>) => onUpdate(step.id, updates),
      onRemove: () => onRemove(step.id),
    },
  }));

  const edges: Edge[] = steps.slice(0, -1).map((step, i) => ({
    id: `${step.id}-${steps[i + 1].id}`,
    source: step.id,
    target: steps[i + 1].id,
    type: "smoothstep",
    animated: nodeStatuses[step.id] === "running",
    style: { stroke: "#6366f1" },
  }));

  return { nodes, edges };
}

export function WorkflowCanvas() {
  const currentWorkflow = useWorkflowStore((s) => s.currentWorkflow);
  const nodeStatuses = useWorkflowStore((s) => s.nodeStatuses);
  const updateStep = useWorkflowStore((s) => s.updateStep);
  const removeStep = useWorkflowStore((s) => s.removeStep);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // 当工作流步骤或节点状态变化时，同步更新画布
  useEffect(() => {
    if (!currentWorkflow) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const { nodes: newNodes, edges: newEdges } = buildFlowData(
      currentWorkflow.steps,
      nodeStatuses,
      updateStep,
      removeStep
    );

    setNodes(newNodes);
    setEdges(newEdges);
  }, [currentWorkflow, currentWorkflow?.steps, nodeStatuses, updateStep, removeStep, setNodes, setEdges]);

  const onConnect: OnConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, type: "smoothstep", style: { stroke: "#6366f1" } }, eds)),
    [setEdges]
  );

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        colorMode="dark"
        defaultEdgeOptions={{
          type: "smoothstep",
          style: { stroke: "#6366f1" },
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#333" />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const status = nodeStatuses[node.id];
            switch (status) {
              case "running": return "#eab308";
              case "success": return "#22c55e";
              case "error": return "#ef4444";
              case "healing": return "#f97316";
              default: return "#4b5563";
            }
          }}
        />
      </ReactFlow>
    </div>
  );
}
