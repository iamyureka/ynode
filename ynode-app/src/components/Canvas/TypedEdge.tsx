import { memo, useState, useCallback, useRef } from 'react';
import { getSmoothStepPath, useReactFlow } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';
import { getTypeColor, isTypeCompatible } from '../../types/nodeTypes';
import { useNodeTypesStore } from '../../store/nodeTypesStore';
import { useNodePickerStore } from '../../store/nodePickerStore';
import type { PortDataType } from '../../types/nodeTypes';
import { Plus, Trash2 } from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';

interface EdgeToolbarProps {
    position: { x: number; y: number };
    onDelete: () => void;
    onAddClick: () => void;
    visible: boolean;
}

const EdgeToolbar = memo(
    ({ position, onDelete, onAddClick, visible }: EdgeToolbarProps) => {
        if (!visible) return null;

        return (
            <foreignObject
                x={position.x - 60}
                y={position.y - 20}
                width={120}
                height={40}
                className="overflow-visible"
                style={{ pointerEvents: 'none' }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        width: '100%'
                    }}
                >
                    <div
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#252526]/95 backdrop-blur-sm  shadow-xl"
                        style={{
                            pointerEvents: 'auto',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                    >
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onAddClick();
                            }}
                            className="p-1.5 rounded-md text-zinc-300 hover:text-emerald-400 hover:bg-emerald-400/10 transition-all"
                            title="Add node here"
                        >
                            <Plus className="w-5 h-5 translate-x-[-10px] translate-y-[-10px]" />
                        </button>
                        <div className="w-px h-5 bg-white/20" />
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete();
                            }}
                            className="p-1.5 rounded-md text-zinc-300 hover:text-red-400 hover:bg-red-400/10 transition-all"
                            title="Delete connection [Alt+Click]"
                        >
                            <Trash2 className="w-3.5 h-3.5 translate-x-[-8px] translate-y-[-7.6px]" />
                        </button>
                    </div>
                </div>
            </foreignObject>
        );
    }
);

EdgeToolbar.displayName = 'EdgeToolbar';

/**
 * TypedEdge - A custom edge component that colors connections based on the
 * source port's data type.
 *
 * Features:
 * - Type-based coloring (pink for strings, green for numbers, etc.)
 * - Visual feedback for execution state (animated when running)
 * - Compatibility validation highlighting
 * - Animated arrow marker showing flow direction
 * - Hover toolbar with add/delete buttons
 * - Node picker popover for inserting nodes
 */
export const TypedEdge = memo(
    ({
        id,
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
        source,
        target,
        sourceHandleId,
        targetHandleId,
        style = {},
        data,
    }: EdgeProps) => {
        const [isHovered, setIsHovered] = useState(false);
        const pathRef = useRef<SVGPathElement>(null);

        const getNodeDefinition = useNodeTypesStore(
            (state) => state.getNodeDefinition
        );
        const { getNode } = useReactFlow();
        const deleteEdge = useWorkflowStore((state) => state.deleteEdge);
        const insertNodeBetweenEdge = useWorkflowStore(
            (state) => state.insertNodeBetweenEdge
        );

        const { isOpen: isPickerOpen, edgeId: pickerEdgeId, openPicker } = useNodePickerStore();

        const sourceNode = getNode(source);
        const targetNode = getNode(target);

        // Get port types from node definitions
        let sourceType: PortDataType = 'any';
        let targetType: PortDataType = 'any';

        if (sourceNode) {
            const sourceDef = getNodeDefinition(sourceNode.type || '');
            if (sourceDef) {
                const outputPort = sourceDef.outputs.find(
                    (o) => o.id === sourceHandleId
                );
                if (outputPort) {
                    sourceType = outputPort.type as PortDataType;
                }
            }
        }

        if (targetNode) {
            const targetDef = getNodeDefinition(targetNode.type || '');
            if (targetDef) {
                const inputPort = targetDef.inputs.find((i) => i.id === targetHandleId);
                if (inputPort) {
                    targetType = inputPort.type as PortDataType;
                }
            }
        }

        // Get the color based on source type
        const typeColor = getTypeColor(sourceType);

        // Check if the connection is compatible
        const isCompatible = isTypeCompatible(sourceType, targetType);

        // Build the edge path
        const [edgePath] = getSmoothStepPath({
            sourceX,
            sourceY,
            sourcePosition,
            targetX,
            targetY,
            targetPosition,
            borderRadius: 8,
        });

        const arrowOffset = 15;
        const arrowTransform = `translate(${targetX - arrowOffset}, ${targetY}) rotate(0)`;

        const centerX = (sourceX + targetX) / 2;
        const centerY = (sourceY + targetY) / 2;
        const midpoint = { x: centerX, y: centerY };

        // Determine edge style based on execution state and compatibility
        interface EdgeData {
            isFlowing?: boolean;
            isCompleted?: boolean;
            isError?: boolean;
            isSkipped?: boolean;
        }
        const edgeData = (data as EdgeData) || {};
        let strokeColor = typeColor;
        let strokeWidth = 2;
        let strokeDasharray = undefined;
        let opacity = 1;

        // Execution state overrides
        if (edgeData.isFlowing) {
            strokeColor = '#facc15'; // Yellow for flowing
            strokeWidth = 3;
        } else if (edgeData.isCompleted) {
            strokeColor = '#4ade80'; // Green for completed
        } else if (edgeData.isError) {
            strokeColor = '#f87171'; // Red for error
        } else if (edgeData.isSkipped) {
            strokeColor = '#6b7280'; // Gray for skipped
            opacity = 0.5;
        }

        // Incompatible connection warning
        if (!isCompatible && !edgeData.isFlowing && !edgeData.isCompleted) {
            strokeDasharray = '5,5';
            opacity = 0.6;
        }

        const handleDelete = useCallback(() => {
            deleteEdge(id);
        }, [deleteEdge, id]);

        const handleAddClick = useCallback(() => {
            openPicker(midpoint, id, (nodeType: string) => {
                if (insertNodeBetweenEdge) {
                    insertNodeBetweenEdge(id, nodeType);
                }
            });
        }, [openPicker, midpoint, id, insertNodeBetweenEdge]);

        const isPickerOpenForThisEdge = isPickerOpen && pickerEdgeId === id;

        return (
            <g
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => {
                    if (!isPickerOpenForThisEdge) {
                        setIsHovered(false);
                    }
                }}
                className="edge-group"
            >
                {/* Invisible wider path for easier hover detection */}
                <path
                    d={edgePath}
                    stroke="transparent"
                    strokeWidth={20}
                    fill="none"
                    className="pointer-events-stroke"
                />

                {/* Visible styled path */}
                <path
                    ref={pathRef}
                    d={edgePath}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDasharray}
                    opacity={opacity}
                    style={style}
                    className="pointer-events-none transition-all duration-200"
                />

                {/* Arrow marker */}
                <polygon
                    points="-9,-6 0,0 -9,6"
                    transform={arrowTransform}
                    fill={strokeColor}
                    opacity={opacity}
                    className="edge-arrow pointer-events-none"
                />

                {/* Hover toolbar */}
                <EdgeToolbar
                    position={midpoint}
                    onDelete={handleDelete}
                    onAddClick={handleAddClick}
                    visible={isHovered || isPickerOpenForThisEdge}
                />
            </g>
        );
    }
);

TypedEdge.displayName = 'TypedEdge';

export default TypedEdge;
