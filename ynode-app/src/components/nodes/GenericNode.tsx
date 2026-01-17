import { memo, useMemo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { NodeStatus, PortDataType } from '@ynode/core';
import { getTypeColor } from '@ynode/core';
import { useNodeTypesStore } from '../../store/nodeTypesStore';
import {
  Zap,
  Globe,
  Split,
  Play,
  Trash2,
  MoreHorizontal,
  Copy,
  Clipboard,
  GitBranch,
  Shuffle,
  Plug,
  Timer,
  Code2,
  FileText,
  Variable,
  Combine,
  Clock,
  Webhook,
  Box,
  type LucideIcon,
} from 'lucide-react';
import { Card } from '../ui/card';
import { cn } from '../../lib/utils';
import { useReactFlow } from '@xyflow/react';
import { useState, useCallback } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';

// Extended node data interface
interface ExtendedNodeData {
  label?: string;
  config?: Record<string, unknown>;
  executionState?: NodeStatus;
  isCurrentlyExecuting?: boolean;
  [key: string]: unknown;
}

// Icon mapping - add new icons here as needed
const iconMap: Record<string, LucideIcon> = {
  Zap,
  Globe,
  Split,
  Play,
  GitBranch,
  Shuffle,
  Plug,
  Timer,
  Code2,
  FileText,
  Variable,
  Combine,
  Clock,
  Webhook,
  Box, // Default for new nodes
  // Fallback to Zap if icon not found
};

// Color mapping - maps color names to Tailwind classes
const colorMap: Record<
  string,
  { border: string; bg: string; text: string; ring: string }
> = {
  'brand-green': {
    border: 'border-l-brand-green',
    bg: 'bg-brand-green/10',
    text: 'text-brand-green',
    ring: 'ring-brand-green/50',
  },
  'brand-cyan': {
    border: 'border-l-brand-cyan',
    bg: 'bg-brand-cyan/10',
    text: 'text-brand-cyan',
    ring: 'ring-brand-cyan/50',
  },
  'brand-rose': {
    border: 'border-l-brand-rose',
    bg: 'bg-brand-rose/10',
    text: 'text-brand-rose',
    ring: 'ring-brand-rose/50',
  },
  'brand-teal': {
    border: 'border-l-teal-500',
    bg: 'bg-teal-500/10',
    text: 'text-teal-500',
    ring: 'ring-teal-500/50',
  },
  'brand-orange': {
    border: 'border-l-orange-500',
    bg: 'bg-orange-500/10',
    text: 'text-orange-500',
    ring: 'ring-orange-500/50',
  },
  'brand-purple': {
    border: 'border-l-purple-500',
    bg: 'bg-purple-500/10',
    text: 'text-purple-500',
    ring: 'ring-purple-500/50',
  },
  'brand-yellow': {
    border: 'border-l-yellow-500',
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-500',
    ring: 'ring-yellow-500/50',
  },
  'brand-blue': {
    border: 'border-l-blue-500',
    bg: 'bg-blue-500/10',
    text: 'text-blue-500',
    ring: 'ring-blue-500/50',
  },
  // Default fallback
  default: {
    border: 'border-l-zinc-500',
    bg: 'bg-zinc-500/10',
    text: 'text-muted-foreground',
    ring: 'ring-zinc-500/50',
  },
};

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

// Execution badge component
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
    <span
      className={cn(
        'text-[9px] px-2 py-0.5 rounded-full absolute -top-[35px] right-1 whitespace-nowrap',
        config.className
      )}
    >
      {config.label}
    </span>
  );
};

// Node toolbar component
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
        'absolute -top-10 flex items-center gap-1 p-1 z-50 transition-opacity duration-150',
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

/**
 * GenericNode - A dynamic node component that renders any node type
 * using the node definition from the registry.
 *
 * This allows community developers to create nodes in ynode-core
 * without having to create custom React components for each one.
 */
export const GenericNode = memo(({ data, selected, id, type }: NodeProps) => {
  const nodeData = data as ExtendedNodeData;
  const getNodeDefinition = useNodeTypesStore(
    (state) => state.getNodeDefinition
  );

  // Get node definition from store (fetched from server)
  const nodeDef = useMemo(
    () => getNodeDefinition(type),
    [type, getNodeDefinition]
  );

  if (!nodeDef) {
    // Fallback for unknown node types
    return (
      <div className="group relative">
        <Card className="min-w-[200px] border-l-4 border-l-red-500 bg-card p-4">
          <span className="text-sm text-red-400">
            Unknown node type: {type || 'undefined'}
          </span>
        </Card>
      </div>
    );
  }

  // Get styling based on node definition
  const colors = colorMap[nodeDef.color || 'default'] || colorMap.default;
  const Icon = iconMap[nodeDef.icon] || Zap;

  // Determine inputs and outputs
  const hasInputs = nodeDef.inputs && nodeDef.inputs.length > 0;
  const hasOutputs = nodeDef.outputs && nodeDef.outputs.length > 0;

  return (
    <div className="group relative">
      <div className="absolute -top-10 left-0 right-0 h-10" />
      <NodeToolbar nodeId={id} selected={selected} />
      <Card
        className={cn(
          'min-w-[200px] border-l-4 bg-card relative transition-all duration-300',
          colors.border,
          selected && `ring-2 ${colors.ring}`,
          getExecutionStateClasses(
            nodeData.executionState,
            nodeData.isCurrentlyExecuting
          )
        )}
      >
        <ExecutionBadge state={nodeData.executionState} />

        {/* Input handle(s) */}
        {hasInputs && (
          <>
            {nodeDef.inputs.length === 1 ? (
              <CustomHandle
                type="target"
                position={Position.Left}
                id={nodeDef.inputs[0].id}
                portType={nodeDef.inputs[0].type as PortDataType}
              />
            ) : (
              // Multiple inputs - render each with label
              <div className="flex flex-col gap-2 px-3 pt-3">
                {nodeDef.inputs.map((input) => (
                  <div
                    key={input.id}
                    className="relative flex items-center h-7 bg-white/5 rounded-md border border-border pl-3"
                  >
                    <span className="text-xs font-medium text-muted-foreground">
                      {input.label}
                      {input.required && (
                        <span className="text-red-400 ml-0.5">*</span>
                      )}
                    </span>
                    <Handle
                      type="target"
                      position={Position.Left}
                      id={input.id}
                      style={{
                        top: '50%',
                        transform: 'translateY(-50%)',
                        left: '-7px',
                        backgroundColor: getTypeColor(
                          input.type as PortDataType
                        ),
                        borderColor: getTypeColor(input.type as PortDataType),
                      }}
                      className="!w-3 !h-3 !border-2"
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Node content */}
        <div className="p-3 space-y-2">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-md', colors.bg, colors.text)}>
              <Icon className="w-4 h-4" />
            </div>
            <span className="font-semibold text-sm">
              {nodeData.label || nodeDef.label}
            </span>
          </div>

          {/* Optional: Show description for larger nodes */}
          {nodeDef.description && (
            <p className="text-xs text-muted-foreground truncate max-w-[180px]">
              {nodeDef.description}
            </p>
          )}
        </div>

        {/* Output handle(s) */}
        {hasOutputs && (
          <>
            {nodeDef.outputs.length === 1 ? (
              <CustomHandle
                type="source"
                position={Position.Right}
                id={nodeDef.outputs[0].id}
                portType={nodeDef.outputs[0].type as PortDataType}
              />
            ) : (
              // Multiple outputs - render each with label
              <div className="flex flex-col gap-2 px-3 pb-3">
                {nodeDef.outputs.map((output) => (
                  <div
                    key={output.id}
                    className="relative flex items-center justify-end h-7 bg-white/5 rounded-md border border-border pr-3"
                  >
                    <span className="text-xs font-medium text-muted-foreground">
                      {output.label}
                    </span>
                    <Handle
                      type="source"
                      position={Position.Right}
                      id={output.id}
                      style={{
                        top: '50%',
                        transform: 'translateY(-50%)',
                        right: '-7px',
                        backgroundColor: getTypeColor(
                          output.type as PortDataType
                        ),
                        borderColor: getTypeColor(output.type as PortDataType),
                      }}
                      className="!w-3 !h-3 !border-2"
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
});

GenericNode.displayName = 'GenericNode';

