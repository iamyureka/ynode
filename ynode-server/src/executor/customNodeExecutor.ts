/**
 * Custom Node Executor
 * Executes user-defined JavaScript code in a sandboxed environment (isolated-vm).
 * Provides the same execution context as the built-in code node.
 */

import type { ExecutionContext, NodeOutput, MemoryAPI } from '@ynode/core';

export interface CustomNodeExecutorInput {
    code: string;
    inputs: Record<string, unknown>;
    config: Record<string, unknown>;
    usesMemory?: boolean;
    usesWorkflowMemory?: boolean;
    requiresNetwork?: boolean;
    memory?: MemoryAPI;
    workflowMemory?: MemoryAPI;
    credentials?: {
        get: (id: string) => Promise<Record<string, string>>;
    };
    log?: (message: string) => void;
    timeout?: number;
    memoryLimit?: number;
}

export interface CustomNodeExecutorResult {
    success: boolean;
    outputs: Record<string, unknown>;
    error?: string;
    logs: string[];
}

export async function executeCustomNodeCode(
    input: CustomNodeExecutorInput
): Promise<CustomNodeExecutorResult> {
    const {
        code,
        inputs,
        config,
        memory,
        workflowMemory,
        credentials,
        log = console.log,
        timeout = 30000,
        memoryLimit = 128,
    } = input;

    const logs: string[] = [];
    const logHandler = (msg: string) => {
        logs.push(msg);
        log(msg);
    };

    try {
        // @ts-ignore - dynamic import for isolated-vm
        const ivmModule = await import('isolated-vm');
        const ivm = ivmModule.default || ivmModule;

        // Retrieve memory values if available
        const memoryData: Record<string, unknown> = {};
        const workflowMemoryData: Record<string, unknown> = {};

        if (memory) {
            const memoryKeys = await memory.list();
            for (const key of memoryKeys) {
                memoryData[key] = await memory.get(key);
            }
        }

        if (workflowMemory) {
            const workflowMemoryKeys = await workflowMemory.list();
            for (const key of workflowMemoryKeys) {
                workflowMemoryData[key] = await workflowMemory.get(key);
            }
        }

        // Find main input value
        const $input = inputs.data ?? inputs.trigger ?? Object.values(inputs)[0] ?? null;

        // Create isolated VM instance
        const isolate = new ivm.Isolate({ memoryLimit });
        const context = await isolate.createContext();
        const jail = context.global;

        // Set up globals
        await jail.set('$input', new ivm.ExternalCopy($input).copyInto());
        await jail.set('inputs', new ivm.ExternalCopy(inputs).copyInto());
        await jail.set('config', new ivm.ExternalCopy(config).copyInto());
        await jail.set('_memoryData', new ivm.ExternalCopy(memoryData).copyInto());
        await jail.set(
            '_workflowMemoryData',
            new ivm.ExternalCopy(workflowMemoryData).copyInto()
        );

        // Output containers
        await jail.set('outputs', {}, { copy: true });
        await jail.set('_memoryUpdates', {}, { copy: true });
        await jail.set('_workflowMemoryUpdates', {}, { copy: true });

        // Logging callback
        await jail.set(
            '_logCallback',
            new ivm.Reference((msg: string) => {
                logHandler(msg);
            })
        );

        // Set up environment in isolate
        await context.eval(`
      // Console
      globalThis.console = {
        log: (...args) => {
          const msg = args.map(a => String(a)).join(' ');
          _logCallback.applySync(undefined, [msg]);
        },
        warn: (...args) => {
          const msg = 'WARN: ' + args.map(a => String(a)).join(' ');
          _logCallback.applySync(undefined, [msg]);
        },
        error: (...args) => {
          const msg = 'ERROR: ' + args.map(a => String(a)).join(' ');
          _logCallback.applySync(undefined, [msg]);
        }
      };

      // Memory proxies
      globalThis.memory = {
        get: (key) => _memoryData[key],
        set: (key, value) => { _memoryUpdates[key] = value; },
        delete: (key) => { _memoryUpdates[key] = null; },
        keys: () => Object.keys(_memoryData)
      };

      globalThis.workflowMemory = {
        get: (key) => _workflowMemoryData[key],
        set: (key, value) => { _workflowMemoryUpdates[key] = value; },
        delete: (key) => { _workflowMemoryUpdates[key] = null; },
        keys: () => Object.keys(_workflowMemoryData)
      };

      // Safe built-ins
      globalThis.JSON = JSON;
      globalThis.Math = Math;
      globalThis.Date = Date;
      globalThis.Array = Array;
      globalThis.Object = Object;
      globalThis.String = String;
      globalThis.Number = Number;
      globalThis.Boolean = Boolean;
      globalThis.Map = Map;
      globalThis.Set = Set;
      globalThis.Promise = Promise;
      globalThis.RegExp = RegExp;
    `);

        // If network is required, inject fetch
        if (input.requiresNetwork) {
            // Note: Full fetch support requires passing a reference
            // For now, we'll indicate network is available
            await context.eval(`
        globalThis._networkEnabled = true;
        // Fetch will be available in future implementation
      `);
        }

        // Execute user code
        await context.eval(code, { timeout });

        // Extract results
        const outputsRef = await jail.get('outputs');
        const outputs = await outputsRef.copy();

        const memoryUpdatesRef = await jail.get('_memoryUpdates');
        const extractedMemoryUpdates = await memoryUpdatesRef.copy();

        const workflowMemoryUpdatesRef = await jail.get('_workflowMemoryUpdates');
        const extractedWorkflowMemoryUpdates =
            await workflowMemoryUpdatesRef.copy();

        // Persist memory updates
        if (memory) {
            for (const [key, value] of Object.entries(extractedMemoryUpdates)) {
                if (value === null) {
                    await memory.delete(key);
                } else {
                    await memory.set(key, value as unknown);
                }
            }
        }

        if (workflowMemory) {
            for (const [key, value] of Object.entries(extractedWorkflowMemoryUpdates)) {
                if (value === null) {
                    await workflowMemory.delete(key);
                } else {
                    await workflowMemory.set(key, value as unknown);
                }
            }
        }

        // Cleanup
        isolate.dispose();

        logHandler('Custom node executed successfully');

        return {
            success: true,
            outputs,
            logs,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logHandler(`Error: ${message}`);
        return {
            success: false,
            outputs: {},
            error: message,
            logs,
        };
    }
}

/**
 * Execute a test run of custom node code
 * Used by the Node Assembler test panel
 */
export async function testCustomNodeCode(
    code: string,
    testInputs: Record<string, unknown>,
    testConfig: Record<string, unknown>
): Promise<CustomNodeExecutorResult> {
    // Mock memory APIs for testing
    const mockMemory: Record<string, unknown> = {};

    const mockMemoryApi: MemoryAPI = {
        get: async (key) => mockMemory[key],
        set: async (key, value) => {
            mockMemory[key] = value;
        },
        delete: async (key) => {
            delete mockMemory[key];
        },
        list: async () => Object.keys(mockMemory),
    };

    return executeCustomNodeCode({
        code,
        inputs: testInputs,
        config: testConfig,
        memory: mockMemoryApi,
        workflowMemory: mockMemoryApi,
        timeout: 10000, // Shorter timeout for testing
        memoryLimit: 64, // Lower memory for testing
    });
}
