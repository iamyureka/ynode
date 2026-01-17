import { memo, useRef, useEffect, useCallback } from 'react';
import { useReactFlow, useOnViewportChange } from '@xyflow/react';
import { useNodePickerStore } from '../../store/nodePickerStore';
import { useNodeTypesStore } from '../../store/nodeTypesStore';
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
    Brain,
    MessageSquare,
    Database,
    Wrench,
    Sparkles,
    Send,
    Type,
    type LucideIcon,
} from 'lucide-react';

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
    Box,
    Brain,
    MessageSquare,
    Database,
    Wrench,
    Sparkles,
    Send,
    Type,
};

export const NodePickerOverlay = memo(() => {
    const { isOpen, position, onSelectCallback, closePicker } = useNodePickerStore();
    const { nodes: allNodes, categories } = useNodeTypesStore();
    const { flowToScreenPosition } = useReactFlow();
    const pickerRef = useRef<HTMLDivElement>(null);

    useOnViewportChange({
        onChange: useCallback(() => {
            if (isOpen) {
                closePicker();
            }
        }, [isOpen, closePicker]),
    });

    const screenPos = isOpen ? flowToScreenPosition(position) : { x: 0, y: 0 };

    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
                closePicker();
            }
        };

        const timeoutId = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 0);

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, closePicker]);

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                closePicker();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, closePicker]);

    if (!isOpen) return null;

    const insertableNodes = allNodes.filter((n) => n.category !== 'trigger');

    const nodesByCategory = insertableNodes.reduce(
        (acc, node) => {
            if (!acc[node.category]) acc[node.category] = [];
            acc[node.category].push(node);
            return acc;
        },
        {} as Record<string, typeof insertableNodes>
    );

    const handleSelect = (nodeType: string) => {
        if (onSelectCallback) {
            onSelectCallback(nodeType);
        }
        closePicker();
    };

    return (
        <div
            ref={pickerRef}
            className="fixed bg-background rounded-lg shadow-2xl overflow-hidden"
            style={{
                left: screenPos.x - 120,
                top: screenPos.y + 30,
                width: 240,
                maxHeight: 320,
                zIndex: 99999,
            }}
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
        >
            <div className="px-3 py-2 border-b border-border">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Insert Node
                </span>
            </div>
            <div
                className="max-h-[260px] overflow-y-auto p-1"
                onWheel={(e) => e.stopPropagation()}
            >
                {Object.entries(nodesByCategory).map(([category, nodes]) => {
                    const meta = categories[category];
                    if (!meta) return null;

                    return (
                        <div key={category} className="mb-2">
                            <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase">
                                {meta.label}
                            </div>
                            {nodes.map((node) => {
                                const Icon = iconMap[node.icon] || Zap;
                                return (
                                    <button
                                        key={node.type}
                                        onClick={() => handleSelect(node.type)}
                                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-sm text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
                                    >
                                        <Icon size={14} className="shrink-0 text-muted-foreground" />
                                        <span className="truncate">{node.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

NodePickerOverlay.displayName = 'NodePickerOverlay';

