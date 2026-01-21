import { memo } from 'react';
import { Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { PortDataType } from '@ynode/core';
import { Card } from '../ui/card';
import { cn } from '../../lib/utils';
import { useNodeTypesStore } from '../../store/nodeTypesStore';
import {
  NodeToolbar,
  CustomHandle,
  ExecutionBadge,
  getExecutionStateClasses,
  colorMap,
  iconMap,
  DefaultIcon,
} from './NodeComponents';
import type { ExtendedNodeData } from './NodeComponents';

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

  const nodeDef = getNodeDefinition(type || '');

  if (!nodeDef) {
    return (
      <Card className="min-w-[200px] p-4 border-l-4 border-l-red-500 bg-card">
        <span className="text-red-400 text-sm">Unknown node: {type}</span>
      </Card>
    );
  }

  const colors = colorMap[nodeDef.color || 'default'] || colorMap.default;
  const Icon = iconMap[nodeDef.icon] || DefaultIcon;

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
                    className="relative flex items-center gap-2 text-xs text-muted-foreground"
                  >
                    <CustomHandle
                      type="target"
                      position={Position.Left}
                      id={input.id}
                      portType={input.type as PortDataType}
                      style={{
                        position: 'absolute',
                        left: '-12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
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
        <div className="p-4 flex items-center gap-3">
          <div className={cn('p-2 rounded-md', colors.bg, colors.text)}>
            <Icon className="w-4 h-4" />
          </div>
          <span className="font-semibold text-sm">
            {nodeData.label || nodeDef.label}
          </span>
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
                    className="relative flex items-center justify-end gap-2 text-xs text-muted-foreground"
                  >
                    <span>{output.label}</span>
                    <CustomHandle
                      type="source"
                      position={Position.Right}
                      id={output.id}
                      portType={output.type as PortDataType}
                      style={{
                        position: 'absolute',
                        right: '-12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
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
