import { memo, useCallback, useMemo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { Zap, Globe, Split, Play } from 'lucide-react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { useNodeTypesStore } from '../../store/nodeTypesStore';
import { GenericNode } from './GenericNode';
import {
  NodeToolbar,
  CustomHandle,
  ExecutionBadge,
  getExecutionStateClasses,
} from './NodeComponents';
import type { ExtendedNodeData } from './NodeComponents';

export { CommentNode } from './CommentNode';

let globalOnRun: (() => void) | null = null;
export function setGlobalOnRun(callback: () => void) {
  globalOnRun = callback;
}

/**
 * TriggerNode - Special node with a play button to start workflow execution
 */
export const TriggerNode = memo(({ data, selected, id }: NodeProps) => {
  const nodeData = data as ExtendedNodeData;

  const handlePlay = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (globalOnRun) globalOnRun();
  }, []);

  return (
    <div className="group relative">
      <div className="absolute -top-10 left-0 right-0 h-10" />
      <NodeToolbar nodeId={id} selected={selected} />
      <Card
        className={cn(
          'min-w-[200px] border-l-4 border-l-brand-green bg-card relative transition-all duration-300',
          selected && 'ring-2 ring-brand-green/50',
          getExecutionStateClasses(
            nodeData.executionState,
            nodeData.isCurrentlyExecuting
          )
        )}
      >
        <ExecutionBadge state={nodeData.executionState} />
        <div className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-brand-green/10 text-brand-green">
              <Zap className="w-4 h-4" />
            </div>
            <span className="font-semibold text-sm">{nodeData.label}</span>
          </div>
          <Button
            size="icon"
            variant="outline"
            className="w-8 h-8 rounded-full border-brand-green/50 text-brand-green hover:bg-brand-green hover:text-white transition-all shadow-[0_0_10px_rgba(34,197,94,0.2)]"
            onClick={handlePlay}
          >
            <Play className="w-3 h-3 fill-current" />
          </Button>
        </div>
        <CustomHandle
          type="source"
          position={Position.Right}
          portType="trigger"
        />
      </Card>
    </div>
  );
});

TriggerNode.displayName = 'TriggerNode';

/**
 * HttpRequestNode - Shows method badge and URL preview
 */
export const HttpRequestNode = memo(({ data, selected, id }: NodeProps) => {
  const nodeData = data as ExtendedNodeData;
  const config = nodeData.config as { method?: string; url?: string };

  return (
    <div className="group relative">
      <div className="absolute -top-10 left-0 right-0 h-10" />
      <NodeToolbar nodeId={id} selected={selected} />
      <Card
        className={cn(
          'min-w-[240px] border-l-4 border-l-brand-cyan bg-card relative transition-all duration-300',
          selected && 'ring-2 ring-brand-cyan/50',
          getExecutionStateClasses(
            nodeData.executionState,
            nodeData.isCurrentlyExecuting
          )
        )}
      >
        <ExecutionBadge state={nodeData.executionState} />
        <CustomHandle type="target" position={Position.Left} portType="any" />
        <div className="p-3 space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-brand-cyan/10 text-brand-cyan">
              <Globe className="w-4 h-4" />
            </div>
            <span className="font-semibold text-sm">{nodeData.label}</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded bg-sidebar/20 border border-border/50">
            <Badge
              variant="secondary"
              className="text-[10px] font-bold bg-brand-cyan/20 text-brand-cyan hover:bg-brand-cyan/30"
            >
              {config.method || 'GET'}
            </Badge>
            <span className="text-xs text-muted-foreground truncate max-w-[140px]">
              {config.url || 'No URL configured'}
            </span>
          </div>
        </div>
        <CustomHandle type="source" position={Position.Right} portType="json" />
      </Card>
    </div>
  );
});

HttpRequestNode.displayName = 'HttpRequestNode';

/**
 * IfElseNode - Conditional node with TRUE/FALSE output handles
 */
export const IfElseNode = memo(({ data, selected, id }: NodeProps) => {
  const nodeData = data as ExtendedNodeData;

  return (
    <div className="group relative">
      <div className="absolute -top-10 left-0 right-0 h-10" />
      <NodeToolbar nodeId={id} selected={selected} />
      <Card
        className={cn(
          'min-w-[200px] border-l-4 border-l-brand-rose bg-card relative transition-all duration-300',
          selected && 'ring-2 ring-brand-rose/50',
          getExecutionStateClasses(
            nodeData.executionState,
            nodeData.isCurrentlyExecuting
          )
        )}
      >
        <ExecutionBadge state={nodeData.executionState} />
        <CustomHandle type="target" position={Position.Left} portType="any" />

        <div className="p-3 flex items-center gap-3 border-b border-border/50">
          <div className="p-2 rounded-md bg-brand-rose/10 text-brand-rose">
            <Split className="w-4 h-4" />
          </div>
          <span className="font-semibold text-sm">{nodeData.label}</span>
        </div>

        <div className="flex flex-col gap-3 p-3">
          <div className="relative flex items-center justify-end h-9 bg-brand-green/5 rounded-md border border-brand-green/10 pr-3">
            <span className="text-xs font-bold text-brand-green tracking-wider">
              TRUE
            </span>
            <Handle
              type="source"
              position={Position.Right}
              id="true"
              style={{
                top: '50%',
                transform: 'translateY(-50%)',
                right: '-7px',
              }}
              className="!w-3 !h-3 !bg-brand-green !border-2 !border-background"
            />
          </div>

          <div className="relative flex items-center justify-end h-9 bg-brand-rose/5 rounded-md border border-brand-rose/10 pr-3">
            <span className="text-xs font-bold text-brand-rose tracking-wider">
              FALSE
            </span>
            <Handle
              type="source"
              position={Position.Right}
              id="false"
              style={{
                top: '50%',
                transform: 'translateY(-50%)',
                right: '-7px',
              }}
              className="!w-3 !h-3 !bg-brand-rose !border-2 !border-background"
            />
          </div>
        </div>
      </Card>
    </div>
  );
});

IfElseNode.displayName = 'IfElseNode';

import { CommentNode } from './CommentNode';

// Custom node components for nodes that need special rendering
const customNodeComponents: Record<string, React.ComponentType<NodeProps>> = {
  trigger: TriggerNode,
  httpRequest: HttpRequestNode,
  ifElse: IfElseNode,
  comment: CommentNode,
};

/**
 * Hook to build nodeTypes dynamically from the store.
 * - Nodes with custom components use those
 * - All other nodes use GenericNode for automatic rendering
 *
 * This allows community developers to create nodes
 * without having to create custom React components.
 */
export function useNodeTypes(): Record<string, React.ComponentType<NodeProps>> {
  const allNodes = useNodeTypesStore((state) => state.nodes);

  return useMemo(() => {
    const types: Record<string, React.ComponentType<NodeProps>> = { ...customNodeComponents };

    // Add GenericNode for all nodes from server that don't have custom components
    for (const nodeDef of allNodes) {
      if (!types[nodeDef.type]) {
        types[nodeDef.type] = GenericNode;
      }
    }

    return types;
  }, [allNodes]);
}

// Static export for backwards compatibility (uses custom nodes only)
// For full dynamic support, use the useNodeTypes hook
export const nodeTypes = customNodeComponents;
