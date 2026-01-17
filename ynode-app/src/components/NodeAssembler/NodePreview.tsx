import * as LucideIcons from 'lucide-react';
import { getTypeColor } from '@ynode/core';
import type { PortDataType } from '@ynode/core';
import type { CustomNodePort } from '@/store/customNodesStore';
import { cn } from '@/lib/utils';

interface NodePreviewProps {
    label: string;
    icon: string;
    category: string;
    inputs: CustomNodePort[];
    outputs: CustomNodePort[];
    usesMemory?: boolean;
    usesWorkflowMemory?: boolean;
    requiresNetwork?: boolean;
}

const colorMap: Record<
    string,
    { border: string; bg: string; text: string }
> = {
    custom: {
        border: 'border-l-purple-500',
        bg: 'bg-purple-500/10',
        text: 'text-purple-500',
    },
    ai: {
        border: 'border-l-brand-cyan',
        bg: 'bg-brand-cyan/10',
        text: 'text-brand-cyan',
    },
    data: {
        border: 'border-l-blue-500',
        bg: 'bg-blue-500/10',
        text: 'text-blue-500',
    },
    integration: {
        border: 'border-l-orange-500',
        bg: 'bg-orange-500/10',
        text: 'text-orange-500',
    },
    utility: {
        border: 'border-l-brand-green',
        bg: 'bg-brand-green/10',
        text: 'text-brand-green',
    },
    transform: {
        border: 'border-l-teal-500',
        bg: 'bg-teal-500/10',
        text: 'text-teal-500',
    },
    communication: {
        border: 'border-l-brand-rose',
        bg: 'bg-brand-rose/10',
        text: 'text-brand-rose',
    },
};

export function NodePreview({
    label,
    icon,
    category,
    inputs,
    outputs,
    usesMemory,
    usesWorkflowMemory,
    requiresNetwork,
}: NodePreviewProps) {
    const icons = LucideIcons as unknown as Record<
        string,
        React.ComponentType<{ className?: string }>
    >;
    const IconComponent = icons[icon] || LucideIcons.Puzzle;

    const colors = colorMap[category] || colorMap.custom;
    const hasMultipleInputs = inputs.length > 1;
    const hasMultipleOutputs = outputs.length > 1;

    return (
        <div className="flex flex-col items-center justify-center h-full p-4 bg-[#0d0d0d]">
            <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-4">
                Live Preview
            </div>

            <div className="relative">
                <div
                    className={cn(
                        'min-w-[180px] max-w-[220px] rounded-xl border-2 border-white/10 bg-card text-card-foreground shadow-lg',
                        'border-l-4',
                        colors.border
                    )}
                >
                    {hasMultipleInputs && (
                        <div className="flex flex-col gap-2 px-3 pt-3">
                            {inputs.map((input) => (
                                <div
                                    key={input.id}
                                    className="relative flex items-center h-7 bg-white/5 rounded-md border border-white/10 pl-3"
                                >
                                    <span className="text-xs font-medium text-muted-foreground">
                                        {input.label}
                                        {input.required && (
                                            <span className="text-red-400 ml-0.5">*</span>
                                        )}
                                    </span>
                                    <div
                                        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2"
                                        style={{
                                            backgroundColor: getTypeColor(
                                                input.type as PortDataType
                                            ),
                                            borderColor: getTypeColor(input.type as PortDataType),
                                            boxShadow: `0 0 6px ${getTypeColor(input.type as PortDataType)}`,
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="p-3 space-y-2">
                        <div className="flex items-center gap-3">
                            <div className={cn('p-2 rounded-md', colors.bg, colors.text)}>
                                <IconComponent className="w-4 h-4" />
                            </div>
                            <span className="font-semibold text-sm text-white">
                                {label || 'Custom Node'}
                            </span>
                        </div>

                        {(usesMemory || usesWorkflowMemory || requiresNetwork) && (
                            <div className="flex gap-1 flex-wrap">
                                {usesMemory && (
                                    <span className="text-[8px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded font-medium">
                                        MEM
                                    </span>
                                )}
                                {usesWorkflowMemory && (
                                    <span className="text-[8px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded font-medium">
                                        WF
                                    </span>
                                )}
                                {requiresNetwork && (
                                    <span className="text-[8px] px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded font-medium">
                                        NET
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {hasMultipleOutputs && (
                        <div className="flex flex-col gap-2 px-3 pb-3">
                            {outputs.map((output) => (
                                <div
                                    key={output.id}
                                    className="relative flex items-center justify-end h-7 bg-white/5 rounded-md border border-white/10 pr-3"
                                >
                                    <span className="text-xs font-medium text-muted-foreground">
                                        {output.label}
                                    </span>
                                    <div
                                        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 rounded-full border-2"
                                        style={{
                                            backgroundColor: getTypeColor(
                                                output.type as PortDataType
                                            ),
                                            borderColor: getTypeColor(output.type as PortDataType),
                                            boxShadow: `0 0 6px ${getTypeColor(output.type as PortDataType)}`,
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {!hasMultipleInputs && inputs.length === 1 && (
                        <div
                            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2"
                            style={{
                                backgroundColor: getTypeColor(inputs[0].type as PortDataType),
                                borderColor: getTypeColor(inputs[0].type as PortDataType),
                                boxShadow: `0 0 6px ${getTypeColor(inputs[0].type as PortDataType)}`,
                            }}
                        />
                    )}

                    {!hasMultipleOutputs && outputs.length === 1 && (
                        <div
                            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 rounded-full border-2"
                            style={{
                                backgroundColor: getTypeColor(outputs[0].type as PortDataType),
                                borderColor: getTypeColor(outputs[0].type as PortDataType),
                                boxShadow: `0 0 6px ${getTypeColor(outputs[0].type as PortDataType)}`,
                            }}
                        />
                    )}
                </div>
            </div>

            <div className="mt-4 text-[9px] text-zinc-600 text-center max-w-[180px]">
                This preview shows how your node will appear on the canvas
            </div>
        </div>
    );
}
