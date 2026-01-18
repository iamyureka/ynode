import { create } from 'zustand';
import { getAuthHeaders } from './authStore';

const API_BASE = 'http://localhost:3001/api';

export interface CustomNodePort {
    id: string;
    label: string;
    type: string;
    required?: boolean;
    description?: string;
}

export interface CustomNodeConfigField {
    key: string;
    label: string;
    type: 'string' | 'number' | 'boolean' | 'select' | 'code' | 'credential';
    default?: unknown;
    options?: { label: string; value: string }[];
    credentialType?: string;
}

export interface CustomNode {
    id: string;
    type: string;
    label: string;
    description?: string;
    category: string;
    icon: string;
    color?: string;
    inputs: CustomNodePort[];
    outputs: CustomNodePort[];
    configSchema?: CustomNodeConfigField[];
    defaultConfig: Record<string, unknown>;
    code: string;
    usesMemory: boolean;
    usesWorkflowMemory: boolean;
    requiresNetwork: boolean;
    credentials?: { type: string; required: boolean }[];
    isPublic: boolean;
    currentVersion: number;
    createdAt: string;
    updatedAt: string;
}

export interface TestExecutionResult {
    success: boolean;
    outputs: Record<string, unknown>;
    error?: string;
    logs: string[];
}

interface CustomNodesState {
    // Modal state
    isOpen: boolean;
    editingNode: CustomNode | null;

    // Data
    customNodes: CustomNode[];
    isLoading: boolean;
    error: string | null;

    // Actions
    openModal: (node?: CustomNode) => void;
    closeModal: () => void;
    fetchCustomNodes: () => Promise<void>;
    createCustomNode: (data: Partial<CustomNode>) => Promise<CustomNode>;
    updateCustomNode: (
        id: string,
        data: Partial<CustomNode>,
        changeNotes?: string
    ) => Promise<CustomNode>;
    deleteCustomNode: (id: string) => Promise<void>;
    testCode: (
        code: string,
        inputs: Record<string, unknown>,
        config: Record<string, unknown>,
        requiresNetwork?: boolean
    ) => Promise<TestExecutionResult>;
    testCodeStream: (
        code: string,
        inputs: Record<string, unknown>,
        config: Record<string, unknown>,
        requiresNetwork: boolean,
        onLog: (message: string) => void
    ) => Promise<TestExecutionResult>;
}

export const useCustomNodesStore = create<CustomNodesState>((set, get) => ({
    // Initial state
    isOpen: false,
    editingNode: null,
    customNodes: [],
    isLoading: false,
    error: null,

    // Actions
    openModal: (node?: CustomNode) => {
        set({ isOpen: true, editingNode: node || null });
    },

    closeModal: () => {
        set({ isOpen: false, editingNode: null });
    },

    fetchCustomNodes: async () => {
        set({ isLoading: true, error: null });
        try {
            const response = await fetch(`${API_BASE}/custom-nodes`, {
                headers: getAuthHeaders(),
            });
            if (!response.ok) throw new Error('Failed to fetch custom nodes');
            const data = await response.json();
            set({ customNodes: data.customNodes, isLoading: false });
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Unknown error',
                isLoading: false,
            });
        }
    },

    createCustomNode: async (data: Partial<CustomNode>) => {
        const response = await fetch(`${API_BASE}/custom-nodes`, {
            method: 'POST',
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create custom node');
        }
        const node = await response.json();
        set({ customNodes: [node, ...get().customNodes] });
        return node;
    },

    updateCustomNode: async (
        id: string,
        data: Partial<CustomNode>,
        changeNotes?: string
    ) => {
        const response = await fetch(`${API_BASE}/custom-nodes/${id}`, {
            method: 'PUT',
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ...data, changeNotes }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update custom node');
        }
        const updated = await response.json();
        set({
            customNodes: get().customNodes.map((n) => (n.id === id ? updated : n)),
        });
        return updated;
    },

    deleteCustomNode: async (id: string) => {
        const response = await fetch(`${API_BASE}/custom-nodes/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
        });
        if (!response.ok) throw new Error('Failed to delete custom node');
        set({ customNodes: get().customNodes.filter((n) => n.id !== id) });
    },

    testCode: async (
        code: string,
        testInputs: Record<string, unknown>,
        testConfig: Record<string, unknown>,
        requiresNetwork: boolean = false
    ) => {
        const response = await fetch(`${API_BASE}/custom-nodes/test`, {
            method: 'POST',
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code, testInputs, testConfig, requiresNetwork }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Test execution failed');
        }
        return response.json();
    },

    testCodeStream: async (
        code: string,
        testInputs: Record<string, unknown>,
        testConfig: Record<string, unknown>,
        requiresNetwork: boolean,
        onLog: (message: string) => void
    ) => {
        return new Promise((resolve, reject) => {
            const controller = new AbortController();

            fetch(`${API_BASE}/custom-nodes/test-stream`, {
                method: 'POST',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code, testInputs, testConfig, requiresNetwork }),
                signal: controller.signal,
            })
                .then(async (response) => {
                    if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.error || 'Test execution failed');
                    }

                    const reader = response.body?.getReader();
                    if (!reader) throw new Error('No reader');

                    const decoder = new TextDecoder();
                    let buffer = '';

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split('\n');
                        buffer = lines.pop() || '';

                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                try {
                                    const data = JSON.parse(line.slice(6));
                                    if (data.type === 'log') {
                                        onLog(data.message);
                                    } else if (data.type === 'result') {
                                        resolve(data as TestExecutionResult);
                                    } else if (data.type === 'error') {
                                        reject(new Error(data.message));
                                    }
                                } catch { }
                            }
                        }
                    }
                })
                .catch(reject);
        });
    },
}));
