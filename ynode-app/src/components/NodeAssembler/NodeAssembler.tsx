import { useState, useEffect, useCallback, memo } from 'react';
import { X, Save, Play, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    useCustomNodesStore,
    type CustomNode,
    type CustomNodePort,
} from '@/store/customNodesStore';
import { PortEditor } from './PortEditor';
import { CodeEditor } from './CodeEditor';
import { NodePreview } from './NodePreview';

const CATEGORIES = [
    { value: 'custom', label: 'Custom' },
    { value: 'ai', label: 'AI' },
    { value: 'data', label: 'Data' },
    { value: 'integration', label: 'Integration' },
    { value: 'utility', label: 'Utility' },
    { value: 'transform', label: 'Transform' },
    { value: 'communication', label: 'Communication' },
];

const ICONS = [
    'Puzzle',
    'Code',
    'Brain',
    'Database',
    'Globe',
    'Zap',
    'MessageSquare',
    'Send',
    'Search',
    'Filter',
    'Calculator',
    'FileText',
    'Image',
    'Music',
    'Video',
    'Cloud',
    'Server',
    'Lock',
    'Unlock',
    'Settings',
];

function generateCodeTemplate(
    inputs: CustomNodePort[],
    outputs: CustomNodePort[],
    usesMemory: boolean,
    usesWorkflowMemory: boolean
): string {
    const lines: string[] = [];

    lines.push(
        '// ═══════════════════════════════════════════════════════════'
    );
    lines.push('// Custom Node - Auto-generated template');
    lines.push(
        '// Available: inputs, outputs, config, memory, workflowMemory, console'
    );
    lines.push(
        '// ═══════════════════════════════════════════════════════════'
    );
    lines.push('');

    if (inputs.length > 0) {
        lines.push(
            '// ─── Inputs ───────────────────────────────────────────────'
        );
        inputs.forEach((input) => {
            const typeComment = input.type !== 'any' ? ` // type: ${input.type}` : '';
            lines.push(`const ${input.id} = inputs.${input.id};${typeComment}`);
        });
        lines.push('');
    }

    if (usesMemory) {
        lines.push(
            '// ─── Node Memory (persists across executions) ─────────────'
        );
        lines.push('// const storedValue = memory.get("key");');
        lines.push('// memory.set("key", value);');
        lines.push('');
    }

    if (usesWorkflowMemory) {
        lines.push(
            '// ─── Workflow Memory (shared across nodes) ───────────────'
        );
        lines.push('// const sharedValue = workflowMemory.get("key");');
        lines.push('// workflowMemory.set("key", value);');
        lines.push('');
    }

    lines.push(
        '// ─── Your Logic Here ──────────────────────────────────────'
    );
    lines.push('');

    const primaryInput = inputs[0];
    if (primaryInput) {
        lines.push(`// Process the ${primaryInput.label}`);
        lines.push(`let result = ${primaryInput.id};`);
        lines.push('');
        lines.push('// Example transformations:');
        lines.push(
            '// result = typeof result === "string" ? result.toUpperCase() : result;'
        );
        lines.push(
            '// result = Array.isArray(result) ? result.filter(x => x) : result;'
        );
        lines.push(
            '// result = { ...result, processed: true, timestamp: Date.now() };'
        );
    } else {
        lines.push('let result = null;');
    }

    lines.push('');
    lines.push('// Log for debugging');
    lines.push('console.log("Processing complete:", result);');
    lines.push('');

    if (outputs.length > 0) {
        lines.push(
            '// ─── Outputs ──────────────────────────────────────────────'
        );
        outputs.forEach((output, i) => {
            if (i === 0) {
                lines.push(`outputs.${output.id} = result;`);
            } else {
                lines.push(`outputs.${output.id} = null; // TODO: Set ${output.label}`);
            }
        });
    }

    return lines.join('\n');
}

// Memoized Preview to prevent unnecessary re-renders
const MemoizedPreview = memo(NodePreview);

export function NodeAssembler() {
    const {
        isOpen,
        closeModal,
        editingNode,
        createCustomNode,
        updateCustomNode,
        testCode,
    } = useCustomNodesStore();

    // Form state
    const [label, setLabel] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('custom');
    const [icon, setIcon] = useState('Puzzle');
    const [inputs, setInputs] = useState<CustomNodePort[]>([
        { id: 'trigger', label: 'Trigger', type: 'any', required: true },
    ]);
    const [outputs, setOutputs] = useState<CustomNodePort[]>([
        { id: 'result', label: 'Result', type: 'any' },
    ]);
    const [code, setCode] = useState('');
    const [usesMemory, setUsesMemory] = useState(false);
    const [usesWorkflowMemory, setUsesWorkflowMemory] = useState(false);
    const [requiresNetwork, setRequiresNetwork] = useState(false);
    const [isPublic, setIsPublic] = useState(false);

    const [codeManuallyEdited, setCodeManuallyEdited] = useState(false);

    // UI state
    const [showTestPanel, setShowTestPanel] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{
        success: boolean;
        outputs: Record<string, unknown>;
        error?: string;
        logs: string[];
    } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const regenerateCode = useCallback(() => {
        const newCode = generateCodeTemplate(
            inputs,
            outputs,
            usesMemory,
            usesWorkflowMemory
        );
        setCode(newCode);
        setCodeManuallyEdited(false);
    }, [inputs, outputs, usesMemory, usesWorkflowMemory]);

    useEffect(() => {
        if (!codeManuallyEdited && !editingNode) {
            regenerateCode();
        }
    }, [
        inputs,
        outputs,
        usesMemory,
        usesWorkflowMemory,
        codeManuallyEdited,
        editingNode,
        regenerateCode,
    ]);

    const handleCodeChange = useCallback((newCode: string) => {
        setCode(newCode);
        setCodeManuallyEdited(true);
    }, []);

    useEffect(() => {
        if (editingNode) {
            setLabel(editingNode.label);
            setDescription(editingNode.description || '');
            setCategory(editingNode.category);
            setIcon(editingNode.icon);
            setInputs(editingNode.inputs);
            setOutputs(editingNode.outputs);
            setCode(editingNode.code);
            setUsesMemory(editingNode.usesMemory);
            setUsesWorkflowMemory(editingNode.usesWorkflowMemory);
            setRequiresNetwork(editingNode.requiresNetwork);
            setIsPublic(editingNode.isPublic);
            setCodeManuallyEdited(true);
        } else {
            setLabel('');
            setDescription('');
            setCategory('custom');
            setIcon('Puzzle');
            setInputs([
                { id: 'trigger', label: 'Trigger', type: 'any', required: true },
            ]);
            setOutputs([{ id: 'result', label: 'Result', type: 'any' }]);
            setUsesMemory(false);
            setUsesWorkflowMemory(false);
            setRequiresNetwork(false);
            setIsPublic(false);
            setCodeManuallyEdited(false);
        }
        setTestResult(null);
        setError(null);
        setShowTestPanel(false);
    }, [editingNode, isOpen]);

    const handleSave = async () => {
        if (!label.trim()) {
            setError('Label is required');
            return;
        }

        if (inputs.length === 0) {
            setError('At least one input is required');
            return;
        }

        if (outputs.length === 0) {
            setError('At least one output is required');
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            const nodeData: Partial<CustomNode> = {
                label,
                description: description || undefined,
                category,
                icon,
                inputs,
                outputs,
                code,
                usesMemory,
                usesWorkflowMemory,
                requiresNetwork,
                isPublic,
                defaultConfig: {},
            };

            if (editingNode) {
                await updateCustomNode(
                    editingNode.id,
                    nodeData,
                    'Updated via Node Assembler'
                );
            } else {
                await createCustomNode(nodeData);
            }

            closeModal();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save');
        } finally {
            setIsSaving(false);
        }
    };

    const handleTest = async () => {
        setIsTesting(true);
        setTestResult(null);
        setError(null);
        setShowTestPanel(true);

        try {
            const testInputs: Record<string, unknown> = {};
            inputs.forEach((input) => {
                testInputs[input.id] = getDefaultValueForType(input.type);
            });

            const result = await testCode(code, testInputs, {});
            setTestResult(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Test failed');
        } finally {
            setIsTesting(false);
        }
    };

    // Prevent keyboard events from bubbling to parent (fixes space key issue)
    const stopPropagation = useCallback(
        (e: React.KeyboardEvent) => e.stopPropagation(),
        []
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={closeModal}
            />

            <div
                className="relative w-[95vw] h-[90vh] max-w-[1600px] bg-zinc-950 rounded-xl border border-white/10 shadow-2xl flex flex-col overflow-hidden"
                onKeyDown={stopPropagation}
            >
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-black/40 shrink-0">
                    <div className="flex items-center gap-3">
                        <div>
                            <h2 className="text-sm font-semibold text-white">
                                {editingNode ? 'Edit Custom Node' : 'Node Assembler'}
                            </h2>
                            <p className="text-[10px] text-zinc-500">
                                Create custom nodes using JavaScript
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {codeManuallyEdited && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={regenerateCode}
                                className="text-zinc-500 hover:text-white text-xs h-7 px-2"
                                title="Regenerate code template"
                            >
                                <RefreshCw className="w-3 h-3 mr-1" />
                                Regen
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleTest}
                            disabled={isTesting || !code.trim()}
                            className="text-zinc-400 hover:text-white h-7"
                        >
                            {isTesting ? (
                                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            ) : (
                                <Play className="w-3.5 h-3.5 mr-1.5" />
                            )}
                            Test
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleSave} // TODO: Saving node
                            disabled={isSaving || !label.trim()}
                            className="text-zinc-400 hover:text-white h-7"
                        >
                            {isSaving ? (
                                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            ) : (
                                <Save className="w-3.5 h-3.5 mr-1.5" />
                            )}
                            Save
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={closeModal}
                            className="text-zinc-400 hover:text-white h-7 w-7"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {error && (
                    <div className="mx-4 mt-2 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs shrink-0">
                        {error}
                    </div>
                )}

                <div className="flex-1 flex overflow-hidden">
                    <div className="w-64 border-r border-white/10 flex flex-col overflow-hidden shrink-0">
                        <div className="p-3 space-y-2.5 border-b border-white/10">
                            <div>
                                <label className="text-[10px] text-zinc-500 uppercase mb-0.5 block">
                                    Label *
                                </label>
                                <Input
                                    value={label}
                                    onChange={(e) => setLabel(e.target.value)}
                                    onKeyDown={stopPropagation}
                                    onKeyUp={stopPropagation}
                                    onKeyPress={stopPropagation}
                                    placeholder="My Custom Node"
                                    className="bg-black/40 border-white/10 h-7 text-xs"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] text-zinc-500 uppercase mb-0.5 block">
                                    Description
                                </label>
                                <Input
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    onKeyDown={stopPropagation}
                                    onKeyUp={stopPropagation}
                                    onKeyPress={stopPropagation}
                                    placeholder="What does this node do?"
                                    className="bg-black/40 border-white/10 h-7 text-xs"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] text-zinc-500 uppercase mb-0.5 block">
                                        Category
                                    </label>
                                    <Select value={category} onValueChange={setCategory}>
                                        <SelectTrigger className="h-7 text-xs bg-black/40 border-white/10">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CATEGORIES.map((cat) => (
                                                <SelectItem key={cat.value} value={cat.value}>
                                                    {cat.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <label className="text-[10px] text-zinc-500 uppercase mb-0.5 block">
                                        Icon
                                    </label>
                                    <Select value={icon} onValueChange={setIcon}>
                                        <SelectTrigger className="h-7 text-xs bg-black/40 border-white/10">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ICONS.map((ic) => (
                                                <SelectItem key={ic} value={ic}>
                                                    {ic}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 pt-1">
                                <div className="flex items-center gap-1.5">
                                    <Checkbox
                                        id="uses-memory"
                                        checked={usesMemory}
                                        onCheckedChange={(c) => setUsesMemory(c === true)}
                                        className="h-3.5 w-3.5"
                                    />
                                    <label
                                        htmlFor="uses-memory"
                                        className="text-[10px] text-zinc-400 cursor-pointer"
                                    >
                                        Memory (node)
                                    </label>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Checkbox
                                        id="uses-wf-memory"
                                        checked={usesWorkflowMemory}
                                        onCheckedChange={(c) => setUsesWorkflowMemory(c === true)}
                                        className="h-3.5 w-3.5"
                                    />
                                    <label
                                        htmlFor="uses-wf-memory"
                                        className="text-[10px] text-zinc-400 cursor-pointer"
                                    >
                                        Workflow Memory
                                    </label>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Checkbox
                                        id="requires-network"
                                        checked={requiresNetwork}
                                        onCheckedChange={(c) => setRequiresNetwork(c === true)}
                                        className="h-3.5 w-3.5"
                                    />
                                    <label
                                        htmlFor="requires-network"
                                        className="text-[10px] text-zinc-400 cursor-pointer"
                                    >
                                        Network
                                    </label>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Checkbox
                                        id="is-public"
                                        checked={isPublic}
                                        onCheckedChange={(c) => setIsPublic(c === true)}
                                        className="h-3.5 w-3.5"
                                    />
                                    <label
                                        htmlFor="is-public"
                                        className="text-[10px] text-zinc-400 cursor-pointer"
                                    >
                                        Is Public ?
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 space-y-3">
                            <PortEditor
                                title="Inputs"
                                ports={inputs}
                                onChange={setInputs}
                                defaultType="any"
                            />
                            <PortEditor
                                title="Outputs"
                                ports={outputs}
                                onChange={setOutputs}
                                defaultType="any"
                            />
                        </div>
                        <div className="flex items-center gap-1.5 p-3">
                            <label
                                className="text-[10px] text-zinc-500 cursor-pointer"
                            >
                                v0.0.1-alpha
                            </label>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                        <CodeEditor
                            code={code}
                            onChange={handleCodeChange}
                            inputs={inputs}
                            outputs={outputs}
                        />
                    </div>

                    <div className="w-56 border-l border-white/10 flex flex-col overflow-hidden shrink-0">
                        <div
                            className={cn(
                                'border-b border-white/10 transition-all',
                                showTestPanel ? 'h-[50%]' : 'flex-1'
                            )}
                        >
                            <MemoizedPreview
                                label={label}
                                icon={icon}
                                category={category}
                                inputs={inputs}
                                outputs={outputs}
                                usesMemory={usesMemory}
                                usesWorkflowMemory={usesWorkflowMemory}
                                requiresNetwork={requiresNetwork}
                            />
                        </div>

                        {showTestPanel && (
                            <div className="flex-1 overflow-hidden flex flex-col">
                                <div className="px-3 py-1.5 border-b border-white/5 flex items-center justify-between shrink-0 bg-black/20">
                                    <span className="text-[10px] text-zinc-500 font-medium uppercase">
                                        Test Results
                                    </span>
                                    <button
                                        onClick={() => setShowTestPanel(false)}
                                        className="text-zinc-600 hover:text-zinc-400 text-[10px]"
                                    >
                                        Hide
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-2">
                                    {isTesting ? (
                                        <div className="flex items-center justify-center h-full">
                                            <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
                                        </div>
                                    ) : testResult ? (
                                        <div className="space-y-2">
                                            <div
                                                className={cn(
                                                    'px-2 py-1 rounded text-[10px]',
                                                    testResult.success
                                                        ? 'bg-green-500/10 text-green-400'
                                                        : 'bg-red-500/10 text-red-400'
                                                )}
                                            >
                                                {testResult.success ? '✓ Success' : '✗ Failed'}
                                                {testResult.error && (
                                                    <p className="mt-0.5 text-[9px] opacity-80">
                                                        {testResult.error}
                                                    </p>
                                                )}
                                            </div>

                                            {testResult.success &&
                                                Object.keys(testResult.outputs).length > 0 && (
                                                    <div>
                                                        <div className="text-[9px] text-zinc-600 uppercase mb-0.5">
                                                            Outputs
                                                        </div>
                                                        <pre className="text-[9px] text-zinc-300 bg-black/40 rounded p-1.5 overflow-x-auto">
                                                            {JSON.stringify(testResult.outputs, null, 2)}
                                                        </pre>
                                                    </div>
                                                )}

                                            {testResult.logs.length > 0 && (
                                                <div>
                                                    <div className="text-[9px] text-zinc-600 uppercase mb-0.5">
                                                        Console ({testResult.logs.length})
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        {testResult.logs.slice(0, 5).map((log, i) => (
                                                            <div
                                                                key={i}
                                                                className="text-[9px] text-zinc-400 bg-black/40 rounded px-1.5 py-0.5 truncate"
                                                            >
                                                                {log}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center text-zinc-600 text-[10px] py-4">
                                            Click "Test" to run
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function getDefaultValueForType(type: string): unknown {
    switch (type) {
        case 'string':
            return 'test';
        case 'number':
            return 0;
        case 'boolean':
            return false;
        case 'array':
            return [];
        case 'object':
            return {};
        default:
            return null;
    }
}
