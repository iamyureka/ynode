import { useCallback, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import type { NodeStatus, PortDataType } from '@ynode/core';
import { getTypeColor } from '@ynode/core';
import {
    Trash2,
    MoreHorizontal,
    Copy,
    Clipboard,
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import { useWorkflowStore } from '../../store/workflowStore';

export interface ExtendedNodeData {
    label?: string;
    config?: Record<string, unknown>;
    executionState?: NodeStatus;
    isCurrentlyExecuting?: boolean;
}

export const getExecutionStateClasses = (
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

export const ExecutionBadge = ({ state }: { state?: NodeStatus }) => {
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

export interface NodeToolbarProps {
    nodeId: string;
    selected: boolean;
}

export const NodeToolbar = ({ nodeId, selected }: NodeToolbarProps) => {
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

export interface CustomHandleProps {
    type: 'source' | 'target';
    position: Position;
    id?: string;
    portType?: PortDataType;
    className?: string;
    style?: React.CSSProperties;
}

// Custom handle component with type-based colors
export const CustomHandle = ({
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

export const colorMap: Record<
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
    'brand-violet': {
        border: 'border-l-brand-violet',
        bg: 'bg-brand-violet/10',
        text: 'text-brand-violet',
        ring: 'ring-brand-violet/50',
    },
    'brand-amber': {
        border: 'border-l-brand-amber',
        bg: 'bg-brand-amber/10',
        text: 'text-brand-amber',
        ring: 'ring-brand-amber/50',
    },
    'zinc-500': {
        border: 'border-l-zinc-500',
        bg: 'bg-zinc-500/10',
        text: 'text-zinc-400',
        ring: 'ring-zinc-500/50',
    },
    'blue-500': {
        border: 'border-l-blue-500',
        bg: 'bg-blue-500/10',
        text: 'text-blue-500',
        ring: 'ring-blue-500/50',
    },
    default: {
        border: 'border-l-zinc-500',
        bg: 'bg-zinc-500/10',
        text: 'text-muted-foreground',
        ring: 'ring-zinc-500/50',
    },
};

import {
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
    Box,
    type LucideIcon,
} from 'lucide-react';

export const iconMap: Record<string, LucideIcon> = {
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
    Box,
};

export const DefaultIcon = Zap;
