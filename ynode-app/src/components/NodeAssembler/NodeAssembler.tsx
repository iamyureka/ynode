import { useState, useEffect, useCallback, memo, useRef } from 'react';
import { X, Save, Play, Loader2, RefreshCw, Plus, Trash2, ChevronDown, ChevronRight, Download, Upload, MoreHorizontal } from 'lucide-react';
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
    type CustomNodeConfigField,
} from '@/store/customNodesStore';
import { PortEditor } from './PortEditor';
import { CodeEditor } from './CodeEditor';
import { NodePreview } from './NodePreview';

interface CredentialRequirement {
    type: string;
    required: boolean;
    description?: string;
}

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
    usesWorkflowMemory: boolean,
    credentials: CredentialRequirement[]
): string {
    const lines: string[] = [];

    lines.push(
        '// ═══════════════════════════════════════════════════════════'
    );
    lines.push('// Custom Node - Auto-generated template');
    lines.push(
        '// Available: inputs, outputs, config, credentials, memory, workflowMemory, console'
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

    if (credentials.length > 0) {
        lines.push(
            '// ─── Credentials ─────────────────────────────────────────'
        );
        lines.push('// Make sure to set config.credentialId in node settings');
        lines.push('// const creds = await credentials.get(config.credentialId);');
        lines.push('// const apiKey = creds.apiKey; // or other field from credential');
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

function buildDefaultConfig(schema: CustomNodeConfigField[]): Record<string, unknown> {
    const defaults: Record<string, unknown> = {};
    for (const field of schema) {
        if (field.default !== undefined) {
            defaults[field.key] = field.default;
        } else {
            switch (field.type) {
                case 'string':
                case 'code':
                    defaults[field.key] = '';
                    break;
                case 'number':
                    defaults[field.key] = 0;
                    break;
                case 'boolean':
                    defaults[field.key] = false;
                    break;
                case 'select':
                    defaults[field.key] = field.options?.[0]?.value ?? '';
                    break;
                case 'credential':
                    defaults[field.key] = '';
                    break;
            }
        }
    }
    return defaults;
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
        testCodeStream,
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
    const [credentials, setCredentials] = useState<CredentialRequirement[]>([]);
    const [configSchema, setConfigSchema] = useState<CustomNodeConfigField[]>([]);
    const [timeout, setTimeout_] = useState(30000);
    const [memoryLimit, setMemoryLimit] = useState(128);
    const [showAdvanced, setShowAdvanced] = useState(false);

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
    const [showMenu, setShowMenu] = useState(false);
    const [streamingLogs, setStreamingLogs] = useState<string[]>([]);

    const regenerateCode = useCallback(() => {
        const newCode = generateCodeTemplate(
            inputs,
            outputs,
            usesMemory,
            usesWorkflowMemory,
            credentials
        );
        setCode(newCode);
        setCodeManuallyEdited(false);
    }, [inputs, outputs, usesMemory, usesWorkflowMemory, credentials]);

    useEffect(() => {
        if (!codeManuallyEdited && !editingNode) {
            regenerateCode();
        }
    }, [
        inputs,
        outputs,
        usesMemory,
        usesWorkflowMemory,
        credentials,
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
            setCredentials(editingNode.credentials || []);
            setConfigSchema(editingNode.configSchema || []);
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
            setCredentials([]);
            setConfigSchema([]);
            setTimeout_(30000);
            setMemoryLimit(128);
            setShowAdvanced(false);
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
                credentials: credentials.length > 0 ? credentials : undefined,
                configSchema: configSchema.length > 0 ? configSchema : undefined,
                defaultConfig: buildDefaultConfig(configSchema),
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
        setStreamingLogs([]);

        try {
            const testInputs: Record<string, unknown> = {};
            inputs.forEach((input) => {
                testInputs[input.id] = getDefaultValueForType(input.type);
            });

            const result = await testCodeStream(
                code,
                testInputs,
                {},
                requiresNetwork,
                (message) => {
                    setStreamingLogs((prev) => [...prev, message]);
                }
            );
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

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExport = useCallback(() => {
        const nodeData = {
            version: '1.0',
            label,
            description,
            category,
            icon,
            inputs,
            outputs,
            code,
            usesMemory,
            usesWorkflowMemory,
            requiresNetwork,
            isPublic,
            credentials,
            configSchema,
            timeout,
            memoryLimit,
        };

        const blob = new Blob([JSON.stringify(nodeData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${label || 'custom-node'}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [label, description, category, icon, inputs, outputs, code, usesMemory, usesWorkflowMemory, requiresNetwork, isPublic, credentials, configSchema, timeout, memoryLimit]);

    const handleImportClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);

                if (data.label) setLabel(data.label);
                if (data.description) setDescription(data.description);
                if (data.category) setCategory(data.category);
                if (data.icon) setIcon(data.icon);
                if (data.inputs) setInputs(data.inputs);
                if (data.outputs) setOutputs(data.outputs);
                if (data.code) {
                    setCode(data.code);
                    setCodeManuallyEdited(true);
                }
                if (typeof data.usesMemory === 'boolean') setUsesMemory(data.usesMemory);
                if (typeof data.usesWorkflowMemory === 'boolean') setUsesWorkflowMemory(data.usesWorkflowMemory);
                if (typeof data.requiresNetwork === 'boolean') setRequiresNetwork(data.requiresNetwork);
                if (typeof data.isPublic === 'boolean') setIsPublic(data.isPublic);
                if (data.credentials) setCredentials(data.credentials);
                if (data.configSchema) setConfigSchema(data.configSchema);
                if (typeof data.timeout === 'number') setTimeout_(data.timeout);
                if (typeof data.memoryLimit === 'number') setMemoryLimit(data.memoryLimit);

                setError(null);
            } catch (err) {
                setError('Failed to parse JSON file');
            }
        };
        reader.readAsText(file);

        e.target.value = '';
    }, []);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={closeModal}
            />

            <div
                className="relative w-[95vw] h-[90vh] max-w-[1600px] bg-[#171717] rounded-xl shadow-2xl flex flex-col overflow-hidden"
                onKeyDown={stopPropagation}
            >
                <div className="flex items-center justify-between px-4 py-2.5 bg-background border-border border-b shrink-0">
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
                        <div className="relative">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowMenu(!showMenu)}
                                className="text-zinc-500 hover:text-white h-7 w-7"
                                title="More options"
                            >
                                <MoreHorizontal className="w-4 h-4" />
                            </Button>
                            {showMenu && (
                                <>
                                    <div
                                        className="fixed inset-0 z-[150]"
                                        onClick={() => setShowMenu(false)}
                                    />
                                    <div className="absolute right-0 top-8 z-[200] w-48 rounded-lg border border-white/10 bg-[#1a1a1a] p-1.5 shadow-xl">
                                        <button
                                            onClick={() => { handleExport(); setShowMenu(false); }}
                                            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-zinc-400 hover:bg-white/5 hover:text-white"
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                            Export as JSON
                                        </button>
                                        <button
                                            onClick={() => { handleImportClick(); setShowMenu(false); }}
                                            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-zinc-400 hover:bg-white/5 hover:text-white"
                                        >
                                            <Upload className="w-3.5 h-3.5" />
                                            Import from JSON
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json"
                            onChange={handleImport}
                            className="hidden"
                        />
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
                    <div className="w-84 border-r border-white/10 flex flex-col overflow-hidden shrink-0">
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

                            <div className="border border-white/10 rounded-lg overflow-hidden">
                                <div className="flex items-center justify-between px-2 py-1.5 bg-black/20">
                                    <span className="text-[10px] text-zinc-500 font-medium uppercase">
                                        Credentials
                                    </span>
                                    <button
                                        onClick={() =>
                                            setCredentials([
                                                ...credentials,
                                                { type: '', required: true, description: '' },
                                            ])
                                        }
                                        className="text-zinc-600 hover:text-zinc-400"
                                    >
                                        <Plus className="w-3 h-3" />
                                    </button>
                                </div>
                                {credentials.length === 0 ? (
                                    <div className="p-2 text-[10px] text-zinc-600 text-center">
                                        No credentials required
                                    </div>
                                ) : (
                                    <div className="p-2 space-y-2">
                                        {credentials.map((cred, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center gap-1.5 bg-black/20 rounded p-1.5"
                                            >
                                                <Input
                                                    value={cred.type}
                                                    onChange={(e) => {
                                                        const updated = [...credentials];
                                                        updated[idx] = { ...cred, type: e.target.value };
                                                        setCredentials(updated);
                                                    }}
                                                    onKeyDown={stopPropagation}
                                                    onKeyUp={stopPropagation}
                                                    onKeyPress={stopPropagation}
                                                    placeholder="Type (e.g. openai)"
                                                    className="flex-1 bg-transparent border-0 h-6 text-[10px] px-1"
                                                />
                                                <div className="flex items-center gap-1">
                                                    <Checkbox
                                                        checked={cred.required}
                                                        onCheckedChange={(c) => {
                                                            const updated = [...credentials];
                                                            updated[idx] = { ...cred, required: c === true };
                                                            setCredentials(updated);
                                                        }}
                                                        className="h-3 w-3"
                                                    />
                                                    <span className="text-[9px] text-zinc-500">Req</span>
                                                </div>
                                                <button
                                                    onClick={() =>
                                                        setCredentials(credentials.filter((_, i) => i !== idx))
                                                    }
                                                    className="text-zinc-600 hover:text-red-400"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="border border-white/10 rounded-lg overflow-hidden">
                                <div className="flex items-center justify-between px-2 py-1.5 bg-black/20">
                                    <span className="text-[10px] text-zinc-500 font-medium uppercase">
                                        Config Fields
                                    </span>
                                    <button
                                        onClick={() =>
                                            setConfigSchema([
                                                ...configSchema,
                                                { key: '', label: '', type: 'string' },
                                            ])
                                        }
                                        className="text-zinc-600 hover:text-zinc-400"
                                    >
                                        <Plus className="w-3 h-3" />
                                    </button>
                                </div>
                                {configSchema.length === 0 ? (
                                    <div className="p-2 text-[10px] text-zinc-600 text-center">
                                        No config fields
                                    </div>
                                ) : (
                                    <div className="p-2 space-y-2">
                                        {configSchema.map((field, idx) => (
                                            <div
                                                key={idx}
                                                className="space-y-1 bg-black/20 rounded p-1.5"
                                            >
                                                <div className="flex items-center gap-1.5">
                                                    <Input
                                                        value={field.key}
                                                        onChange={(e) => {
                                                            const updated = [...configSchema];
                                                            updated[idx] = { ...field, key: e.target.value };
                                                            setConfigSchema(updated);
                                                        }}
                                                        onKeyDown={stopPropagation}
                                                        onKeyUp={stopPropagation}
                                                        onKeyPress={stopPropagation}
                                                        placeholder="Key"
                                                        className="flex-1 bg-transparent border-0 h-6 text-[10px] px-1"
                                                    />
                                                    <Input
                                                        value={field.label}
                                                        onChange={(e) => {
                                                            const updated = [...configSchema];
                                                            updated[idx] = { ...field, label: e.target.value };
                                                            setConfigSchema(updated);
                                                        }}
                                                        onKeyDown={stopPropagation}
                                                        onKeyUp={stopPropagation}
                                                        onKeyPress={stopPropagation}
                                                        placeholder="Label"
                                                        className="flex-1 bg-transparent border-0 h-6 text-[10px] px-1"
                                                    />
                                                    <button
                                                        onClick={() =>
                                                            setConfigSchema(configSchema.filter((_, i) => i !== idx))
                                                        }
                                                        className="text-zinc-600 hover:text-red-400"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Select
                                                        value={field.type}
                                                        onValueChange={(v) => {
                                                            const updated = [...configSchema];
                                                            updated[idx] = {
                                                                ...field,
                                                                type: v as CustomNodeConfigField['type'],
                                                            };
                                                            setConfigSchema(updated);
                                                        }}
                                                    >
                                                        <SelectTrigger className="h-6 text-[10px] bg-transparent border-0 flex-1">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="string">String</SelectItem>
                                                            <SelectItem value="number">Number</SelectItem>
                                                            <SelectItem value="boolean">Boolean</SelectItem>
                                                            <SelectItem value="select">Select</SelectItem>
                                                            <SelectItem value="code">Code</SelectItem>
                                                            <SelectItem value="credential">Credential</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="border border-white/10 rounded-lg overflow-hidden">
                                <button
                                    onClick={() => setShowAdvanced(!showAdvanced)}
                                    className="w-full flex items-center justify-between px-2 py-1.5 bg-black/20 hover:bg-black/30"
                                >
                                    <span className="text-[10px] text-zinc-500 font-medium uppercase">
                                        Advanced Options
                                    </span>
                                    {showAdvanced ? (
                                        <ChevronDown className="w-3 h-3 text-zinc-600" />
                                    ) : (
                                        <ChevronRight className="w-3 h-3 text-zinc-600" />
                                    )}
                                </button>
                                {showAdvanced && (
                                    <div className="p-2 space-y-2">
                                        <div>
                                            <label className="text-[9px] text-zinc-600 uppercase">
                                                Timeout (ms)
                                            </label>
                                            <Input
                                                type="number"
                                                value={timeout}
                                                onChange={(e) => setTimeout_(Number(e.target.value))}
                                                onKeyDown={stopPropagation}
                                                onKeyUp={stopPropagation}
                                                onKeyPress={stopPropagation}
                                                className="bg-black/40 border-white/10 h-6 text-[10px]"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[9px] text-zinc-600 uppercase">
                                                Memory Limit (MB)
                                            </label>
                                            <Input
                                                type="number"
                                                value={memoryLimit}
                                                onChange={(e) => setMemoryLimit(Number(e.target.value))}
                                                onKeyDown={stopPropagation}
                                                onKeyUp={stopPropagation}
                                                onKeyPress={stopPropagation}
                                                className="bg-black/40 border-white/10 h-6 text-[10px]"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 p-3">
                            <label
                                className="text-[10px] text-zinc-500 cursor-pointer"
                            >
                                Node Assembler v0.0.2-alpha
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

                    <div className="w-96 border-l border-white/10 flex flex-col overflow-hidden shrink-0">
                        <div className={cn('overflow-hidden', showTestPanel ? 'h-[50%]' : 'flex-1')}>
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
                            <div className="flex-1 flex flex-col overflow-hidden border-t border-white/10">
                                <div className="px-3 py-1.5 flex items-center justify-between shrink-0 bg-black/20">
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
                                <div className="flex-1 overflow-y-auto p-2 min-h-0">
                                    {isTesting ? (
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 px-2 py-1.5 bg-blue-500/10 rounded">
                                                <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                                                <span className="text-[10px] text-blue-400">Running...</span>
                                            </div>
                                            {streamingLogs.length > 0 && (
                                                <div>
                                                    <div className="text-[9px] text-zinc-600 uppercase mb-0.5 flex items-center gap-1">
                                                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                                        Live Console ({streamingLogs.length})
                                                    </div>
                                                    <div className="space-y-0.5 max-h-32 overflow-y-auto">
                                                        {streamingLogs.map((log, i) => (
                                                            <div
                                                                key={i}
                                                                className="text-[9px] text-green-400 bg-black/40 rounded px-1.5 py-0.5"
                                                            >
                                                                {log}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : testResult ? (
                                        <div className="space-y-2">
                                            <div
                                                className={cn(
                                                    'px-2 py-1.5 rounded text-[10px]',
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
