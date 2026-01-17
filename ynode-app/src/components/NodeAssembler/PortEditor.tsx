import { useState, useCallback, memo, useRef, useEffect } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { CustomNodePort } from '@/store/customNodesStore';

const PORT_TYPES = [
    { value: 'any', label: 'Any', color: '#FFFFFF' },
    { value: 'string', label: 'String', color: '#F472B6' },
    { value: 'number', label: 'Number', color: '#4ADE80' },
    { value: 'boolean', label: 'Boolean', color: '#F87171' },
    { value: 'object', label: 'Object', color: '#38BDF8' },
    { value: 'array', label: 'Array', color: '#A78BFA' },
    { value: 'json', label: 'JSON', color: '#FB923C' },
];

interface PortEditorProps {
    title: string;
    ports: CustomNodePort[];
    onChange: (ports: CustomNodePort[]) => void;
    defaultType?: string;
}

interface PortItemProps {
    port: CustomNodePort;
    index: number;
    canDelete: boolean;
    onUpdate: (index: number, updates: Partial<CustomNodePort>) => void;
    onRemove: (index: number) => void;
}

const PortItem = memo(function PortItem({
    port,
    index,
    canDelete,
    onUpdate,
    onRemove,
}: PortItemProps) {
    const [localLabel, setLocalLabel] = useState(port.label);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setLocalLabel(port.label);
    }, [port.label]);

    const handleBlur = useCallback(() => {
        if (localLabel !== port.label) {
            onUpdate(index, { label: localLabel });
        }
    }, [localLabel, port.label, index, onUpdate]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            e.stopPropagation();
            if (e.key === 'Enter') {
                inputRef.current?.blur();
            }
        },
        []
    );

    const portColor =
        PORT_TYPES.find((t) => t.value === port.type)?.color || '#FFFFFF';

    return (
        <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-black/30 border border-white/5 group hover:border-white/10 transition-colors overflow-hidden">
            <GripVertical className="w-3 h-3 text-zinc-700 cursor-move opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />

            <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                    backgroundColor: portColor,
                    boxShadow: `0 0 4px ${portColor}40`,
                }}
            />

            <input
                ref={inputRef}
                type="text"
                value={localLabel}
                onChange={(e) => setLocalLabel(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                onKeyUp={(e) => e.stopPropagation()}
                onKeyPress={(e) => e.stopPropagation()}
                placeholder="Label"
                className="flex-1 min-w-0 h-6 text-xs bg-transparent border-0 px-1.5 text-white placeholder:text-zinc-600 outline-none focus:outline-none"
            />

            <Select
                value={port.type}
                onValueChange={(value) => onUpdate(index, { type: value })}
            >
                <SelectTrigger className="w-20 shrink-0 h-6 text-[10px] bg-black/40 border-white/10 px-2">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {PORT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: type.color }}
                                />
                                {type.label}
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <div className="flex items-center gap-1 shrink-0">
                <Checkbox
                    id={`req-${port.id}`}
                    checked={port.required || false}
                    onCheckedChange={(checked) =>
                        onUpdate(index, { required: checked === true })
                    }
                    className="h-3 w-3"
                />
                <label
                    htmlFor={`req-${port.id}`}
                    className="text-[9px] text-zinc-600 cursor-pointer"
                >
                    Req
                </label>
            </div>

            <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove(index)}
                disabled={!canDelete}
                className="h-5 w-5 shrink-0 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-30"
            >
                <Trash2 className="w-2.5 h-2.5" />
            </Button>
        </div>
    );
});

export function PortEditor({
    title,
    ports,
    onChange,
    defaultType = 'any',
}: PortEditorProps) {
    const addPort = useCallback(() => {
        const id = `port_${Date.now()}`;
        onChange([
            ...ports,
            { id, label: `New ${title.slice(0, -1)}`, type: defaultType },
        ]);
    }, [ports, onChange, title, defaultType]);

    const updatePort = useCallback(
        (index: number, updates: Partial<CustomNodePort>) => {
            const newPorts = [...ports];
            newPorts[index] = { ...newPorts[index], ...updates };

            // auto generate id from label if not a default port
            // default port are named Trigger. even if you delete the Trigger port, the input still works using generated id
            if (
                updates.label &&
                !['trigger', 'result'].includes(newPorts[index].id)
            ) {
                newPorts[index].id = updates.label
                    .toLowerCase()
                    .replace(/[^a-z0-9]/g, '_')
                    .replace(/_+/g, '_')
                    .replace(/^_|_$/g, '');
            }

            onChange(newPorts);
        },
        [ports, onChange]
    );

    const removePort = useCallback(
        (index: number) => {
            if (ports.length <= 1) return;
            onChange(ports.filter((_, i) => i !== index));
        },
        [ports, onChange]
    );

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-medium text-zinc-300 uppercase tracking-wider">
                    {title}
                </h3>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={addPort}
                    className="h-6 text-[10px] text-zinc-500 hover:text-white px-2"
                >
                    <Plus className="w-3 h-3 mr-1" />
                    Add
                </Button>
            </div>

            <div className="space-y-1.5">
                {ports.map((port, index) => (
                    <PortItem
                        key={port.id}
                        port={port}
                        index={index}
                        canDelete={ports.length > 1}
                        onUpdate={updatePort}
                        onRemove={removePort}
                    />
                ))}
            </div>
        </div>
    );
}
