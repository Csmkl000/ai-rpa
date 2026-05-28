import { useCallback, useMemo } from "react";
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

export function WorkflowCanvas() {
  const currentWorkflow = useWorkflowStore((s) => s.currentWorkflow);
  const nodeStatuses = useWorkflowStore((s) => s.nodeStatuses);
  const updateStep = useWorkflowStore((s) => s.updateStep);
  const removeStep = useWorkflowStore((s) => s.removeStep);

  const { initialNodes, initialEdges } = useMemo(() => {
    if (!currentWorkflow) return { initialNodes: [], initialEdges: [] };

    const nodes: Node[] = currentWorkflow.steps.map((step, i) => ({
      id: step.id,
      type: TYPE_TO_NODE[step.type] || "act",
      position: { x: 250, y: i * 140 },
      data: {
        ...step,
        status: nodeStatuses[step.id] || "idle",
        onUpdate: (updates: Record<string, unknown>) => updateStep(step.id, updates),
        onRemove: () => removeStep(step.id),
      },
    }));

    const edges: Edge[] = currentWorkflow.steps.slice(0, -1).map((step, i) => ({
      id: `${step.id}-${currentWorkflow.steps[i + 1].id}`,
      source: step.id,
      target: currentWorkflow.steps[i + 1].id,
      type: "smoothstep",
      animated: nodeStatuses[step.id] === "running",
      style: { stroke: "#6366f1" },
    }));

    return { initialNodes: nodes, initialEdges: edges };
  }, [currentWorkflow, nodeStatuses, updateStep, removeStep]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

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
