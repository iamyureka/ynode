import { memo, useCallback, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { NodeData, NodeStatus, PortDataType } from '@ynode/core';
import { getTypeColor } from '@ynode/core';
import {
  Zap,
  Globe,
  Split,
  Play,
  Trash2,
  MoreHorizontal,
  Copy,
  Clipboard,
} from 'lucide-react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { useWorkflowStore } from '../../store/workflowStore';

export { CommentNode } from './CommentNode';

let globalOnRun: (() => void) | null = null;
export function setGlobalOnRun(callback: () => void) {
  globalOnRun = callback;
}

interface ExtendedNodeData extends NodeData {
  executionState?: NodeStatus;
  isCurrentlyExecuting?: boolean;
}

const getExecutionStateClasses = (
  state?: NodeStatus,
  isExecuting?: boolean
) => {
  if (isExecuting) {
    return 'animate-pulse ring-2 ring-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.4)]';
  }
  switch (state) {
    case 'running':
      return 'ring-2 ring-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.3)]';
    case 'success':
      return 'ring-2 ring-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]';
    case 'error':
      return 'ring-2 ring-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]';
    case 'skipped':
      return 'opacity-50';
    default:
      return '';
  }
};

const ExecutionBadge = ({ state }: { state?: NodeStatus }) => {
  if (!state || state === 'pending') return null;

  const config = {
    running: {
      label: 'Running',
      className: 'bg-yellow-500/20 text-yellow-400 animate-pulse',
    },
    success: { label: 'Done', className: 'bg-green-500/20 text-green-400' },
    error: { label: 'Error', className: 'bg-red-500/20 text-red-400' },
    skipped: { label: 'Skipped', className: 'bg-gray-500/20 text-gray-400' },
  }[state];

  if (!config) return null;

  return (
    <Badge
      variant="secondary"
      className={cn(
        'text-[9px] absolute -top-[35px] right-1 whitespace-nowrap',
        config.className
      )}
    >
      {config.label}
    </Badge>
  );
};

interface NodeToolbarProps {
  nodeId: string;
  selected: boolean;
}

const NodeToolbar = ({ nodeId, selected }: NodeToolbarProps) => {
  const { deleteElements } = useReactFlow();
  const [showMenu, setShowMenu] = useState(false);
  const copySelectedNodes = useWorkflowStore(
    (state) => state.copySelectedNodes
  );
  const duplicateSelectedNodes = useWorkflowStore(
    (state) => state.duplicateSelectedNodes
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      deleteElements({ nodes: [{ id: nodeId }] });
    },
    [deleteElements, nodeId]
  );

  const handleMenuClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setShowMenu(!showMenu);
    },
    [showMenu]
  );

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      copySelectedNodes();
      setShowMenu(false);
    },
    [copySelectedNodes]
  );

  const handleDuplicate = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      duplicateSelectedNodes();
      setShowMenu(false);
    },
    [duplicateSelectedNodes]
  );

  return (
    <div
      className={cn(
        'absolute -top-10 flex items-center gap-1 p-1 shadow-xl z-50 transition-opacity duration-150',
        selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      )}
      onMouseLeave={() => setShowMenu(false)}
    >
      <button
        onClick={handleDelete}
        className="p-1.5 rounded-md text-muted-foreground hover:text-red-400 transition-colors"
        title="Delete"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
      <div className="relative">
        <button
          onClick={handleMenuClick}
          className="p-1.5 rounded-md text-muted-foreground hover:text-white transition-colors"
          title="More options"
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>

        {showMenu && (
          <div className="absolute top-full right-0 mt-1 w-36 bg-background rounded-lg shadow-xl overflow-hidden z-50">
            <button
              onClick={handleCopy}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 hover:text-white transition-colors"
            >
              <Copy className="w-3 h-3" />
              Copy
            </button>
            <button
              onClick={handleDuplicate}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 hover:text-white transition-colors"
            >
              <Clipboard className="w-3 h-3" />
              Duplicate
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Custom handle component with type-based colors
interface CustomHandleProps {
  type: 'source' | 'target';
  position: Position;
  id?: string;
  portType?: PortDataType;
  className?: string;
  style?: React.CSSProperties;
}

const CustomHandle = ({
  type,
  position,
  id,
  portType = 'any',
  className,
  style,
}: CustomHandleProps) => {
  const typeColor = getTypeColor(portType);

  return (
    <Handle
      type={type}
      position={position}
      id={id}
      style={{
        ...style,
        backgroundColor: typeColor,
        borderColor: typeColor,
      }}
      className={cn(
        '!w-3 !h-3 !border-2',
        '!shadow-[0_0_6px_currentColor]',
        className
      )}
    />
  );
};

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

import { CommentNode } from './CommentNode';
import { GenericNode } from './GenericNode';
import { useNodeTypesStore } from '../../store/nodeTypesStore';
import { useMemo } from 'react';

// Custom node components for nodes that need special rendering
const customNodeComponents: Record<string, any> = {
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
export function useNodeTypes(): Record<string, any> {
  const allNodes = useNodeTypesStore((state) => state.nodes);

  return useMemo(() => {
    const types: Record<string, any> = { ...customNodeComponents };

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

