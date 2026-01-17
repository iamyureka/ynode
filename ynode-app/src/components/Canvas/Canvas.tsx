import { useCallback, useRef, useEffect } from 'react';
import type { DragEvent } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  ReactFlowProvider,
  Panel,
} from '@xyflow/react';
import type { ReactFlowInstance, Edge, EdgeTypes } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useShallow } from 'zustand/react/shallow';
import { useWorkflowStore } from '../../store/workflowStore';
import { useNodeTypes } from '../nodes/CustomNodes';
import { TypedEdge } from './TypedEdge';
import { NodePickerOverlay } from './NodePickerOverlay';
import { RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';

// Custom edge types for type-colored connections
const edgeTypes: EdgeTypes = {
  default: TypedEdge,
  typed: TypedEdge,
};

function CanvasInner() {
  const nodeTypes = useNodeTypes();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    setSelectedNode,
    deleteSelectedNodes,
    deleteEdge,
    copySelectedNodes,
    pasteNodes,
    duplicateSelectedNodes,
    addComment,
    nodeExecutionStates,
    currentExecutingNodeId,
    clearExecutionStates,
    clearExecutionLogs,
  } = useWorkflowStore(
    useShallow((state: any) => ({
      nodes: state.nodes,
      edges: state.edges,
      onNodesChange: state.onNodesChange,
      onEdgesChange: state.onEdgesChange,
      onConnect: state.onConnect,
      addNode: state.addNode,
      setSelectedNode: state.setSelectedNode,
      deleteSelectedNodes: state.deleteSelectedNodes,
      deleteEdge: state.deleteEdge,
      copySelectedNodes: state.copySelectedNodes,
      pasteNodes: state.pasteNodes,
      duplicateSelectedNodes: state.duplicateSelectedNodes,
      addComment: state.addComment,
      nodeExecutionStates: state.nodeExecutionStates,
      currentExecutingNodeId: state.currentExecutingNodeId,
      clearExecutionStates: state.clearExecutionStates,
      clearExecutionLogs: state.clearExecutionLogs,
    }))
  );

  const nodesWithExecutionState = nodes.map((node: any) => {
    const executionState = nodeExecutionStates.get(node.id);
    const isCurrentlyExecuting = currentExecutingNodeId === node.id;

    return {
      ...node,
      data: {
        ...node.data,
        executionState,
        isCurrentlyExecuting,
      },
    };
  });

  const edgesWithExecutionState = edges.map((edge: any) => {
    const sourceState = nodeExecutionStates.get(edge.source);
    const targetState = nodeExecutionStates.get(edge.target);
    const isTargetExecuting = currentExecutingNodeId === edge.target;

    const isFlowing = sourceState === 'success' && isTargetExecuting;
    const isCompleted = sourceState === 'success' && targetState === 'success';

    if (isFlowing) {
      return {
        ...edge,
        animated: true,
        style: { stroke: '#facc15', strokeWidth: 3 },
      };
    } else if (isCompleted) {
      return {
        ...edge,
        animated: false,
        style: { stroke: '#4ade80', strokeWidth: 2 },
      };
    } else if (sourceState === 'error' || targetState === 'error') {
      return {
        ...edge,
        animated: false,
        style: { stroke: '#f87171', strokeWidth: 2 },
      };
    } else if (sourceState === 'skipped' || targetState === 'skipped') {
      return {
        ...edge,
        animated: false,
        style: { stroke: '#6b7280', strokeWidth: 1, opacity: 0.5 },
      };
    }

    return {
      ...edge,
      animated: false,
      style: { stroke: 'hsl(var(--muted-foreground) / 0.4)', strokeWidth: 2 },
    };
  });

  const onInit = useCallback((instance: any) => {
    reactFlowInstance.current = instance;
  }, []);

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/ynodeType');
      if (!type || !reactFlowInstance.current || !reactFlowWrapper.current)
        return;

      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.current.screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });

      addNode(type, position);
    },
    [addNode]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: any) => {
      setSelectedNode(node);
    },
    [setSelectedNode]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      if (event.altKey) {
        event.preventDefault();
        deleteEdge(edge.id);
      }
    },
    [deleteEdge]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        const selectedNodes = nodes.filter((node: any) => node.selected);
        if (selectedNodes.length > 0) {
          deleteSelectedNodes();
        }
      }

      if (event.ctrlKey && event.key === 'c') {
        copySelectedNodes();
      }

      if (event.ctrlKey && event.key === 'v') {
        pasteNodes();
      }

      if (event.ctrlKey && event.key === 'd') {
        event.preventDefault();
        duplicateSelectedNodes();
      }

      if (event.key === 'c' && !event.ctrlKey && !event.metaKey) {
        const selectedNodes = nodes.filter((n: any) => n.selected);
        if (selectedNodes.length > 0 && reactFlowInstance.current) {
          const bounds = selectedNodes.reduce(
            (acc: any, node: any) => ({
              minX: Math.min(acc.minX, node.position.x),
              minY: Math.min(acc.minY, node.position.y),
              maxX: Math.max(acc.maxX, node.position.x + 200),
              maxY: Math.max(acc.maxY, node.position.y + 100),
            }),
            { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
          );

          const padding = 30;
          addComment(
            { x: bounds.minX - padding, y: bounds.minY - padding - 40 },
            {
              width: bounds.maxX - bounds.minX + padding * 2,
              height: bounds.maxY - bounds.minY + padding * 2 + 40,
            }
          );
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    nodes,
    deleteSelectedNodes,
    copySelectedNodes,
    pasteNodes,
    duplicateSelectedNodes,
    addComment,
  ]);

  return (
    <div
      className="flex-1 h-full outline-none bg-black/30"
      ref={reactFlowWrapper}
      tabIndex={0}
    >
      <ReactFlow
        nodes={nodesWithExecutionState}
        edges={edgesWithExecutionState}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={onInit}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          type: 'typed',
          animated: false,
        }}
        panOnDrag={[2]}
        panOnScroll={true}
        selectionOnDrag={true}
        nodesDraggable={true}
        nodeDragThreshold={2}
        elevateNodesOnSelect={false}
        selectNodesOnDrag={false}
      >
        <Background
          color="#fff"
          gap={10}
          size={1}
          className="opacity-[0.35]"
        />
        <Controls position="top-left" />

        <Panel position="top-right" className="m-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              clearExecutionStates();
              clearExecutionLogs();
            }}
            className="bg-background/80 backdrop-blur-sm border-border hover:bg-white/10 gap-2"
            title="Reset execution states and clear logs"
          >
            <RefreshCw className="w-4 h-4" />
            Reset
          </Button>
        </Panel>
      </ReactFlow>

      {/* Node picker overlay - rendered outside ReactFlow to appear above nodes */}
      <NodePickerOverlay />
    </div>
  );
}

export function Canvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}

