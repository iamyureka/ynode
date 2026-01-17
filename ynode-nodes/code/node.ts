import { z } from 'zod';
import { defineNode } from '@ynode/core';
import type { ExecutionContext, NodeOutput } from '@ynode/core';

const configSchema = z.object({
    language: z.enum(['javascript', 'python']).default('javascript'),
    code: z.string().default(`// Available variables:
// $input - The main input data
// inputs - All inputs as object
// outputs - Set your results here
// memory - Node-scoped memory (get/set)
// workflowMemory - Workflow-scoped memory (get/set)

outputs.result = $input;
`),
    timeout: z.number().min(1000).max(120000).default(30000),
    memoryLimit: z.number().min(8).max(512).default(128), // MB
});

type CodeConfig = z.infer<typeof configSchema>;

export const codeNode = defineNode<CodeConfig>({
    type: 'code',
    label: 'Code',
    description: 'Execute JavaScript or Python code in isolated sandbox',
    category: 'utility',
    icon: 'Code',
    color: 'brand-orange',

    inputs: [
        {
            id: 'trigger',
            label: 'Trigger',
            type: 'any',
            required: true,
            description: 'Triggers execution',
        },
        {
            id: 'data',
            label: 'Data',
            type: 'any',
            description: 'Input data available as $input',
        },
    ],

    outputs: [
        {
            id: 'result',
            label: 'Result',
            type: 'any',
            description: 'The outputs.result value',
        },
        {
            id: 'all',
            label: 'All Outputs',
            type: 'object',
            description: 'Complete outputs object',
        },
        {
            id: 'error',
            label: 'Error',
            type: 'object',
            description: 'Error if execution failed',
        },
    ],

    configSchema,
    defaultConfig: {
        language: 'javascript',
        code: `// Available variables:
// $input - The main input data
// inputs - All inputs as object
// outputs - Set your results here
// memory - Node-scoped memory (get/set)
// workflowMemory - Workflow-scoped memory (get/set)

outputs.result = $input;
`,
        timeout: 30000,
        memoryLimit: 128,
    },

    usesMemory: true,
    usesWorkflowMemory: true,

    async execute(ctx: ExecutionContext<CodeConfig>): Promise<NodeOutput> {
        const { config, inputs, log, memory, workflowMemory } = ctx;

        const lang = (config.language || 'javascript').toLowerCase();
        log(`Executing ${lang} code...`);

        if (lang === 'python' || lang === 'py') {
            return {
                data: {
                    error: {
                        message: 'Python execution is not supported in this environment.',
                    },
                },
                error: new Error('Python not supported'),
            };
        }

        try {
            // @ts-ignore - "Cannot find module"
            const vm = await import('node:vm');

            // TODO: Setting to enable/disable memory so that this process is skipped when not needed?
            // Retrieve memory values
            const memoryKeys = await memory.list();
            const workflowMemoryKeys = await workflowMemory.list();

            const memoryData: Record<string, unknown> = {};
            const workflowMemoryData: Record<string, unknown> = {};

            for (const key of memoryKeys) {
                memoryData[key] = await memory.get(key);
            }
            for (const key of workflowMemoryKeys) {
                workflowMemoryData[key] = await workflowMemory.get(key);
            }
            const $input = inputs.data ?? inputs.trigger ?? null;

            // TODO: logMessages UNUSED!
            const logMessages: string[] = [];

            const context = {
                $input: $input,
                inputs: inputs,
                _memoryData: memoryData,
                _workflowMemoryData: workflowMemoryData,
                outputs: {result: null},
                _memoryUpdates: {},
                _workflowMemoryUpdates: {},
                _logCallback: (msg: string) => {
                    logMessages.push(msg);
                    log(msg);
                }
            }

            // Setup safe environment in isolate
            const setupScript = new vm.Script(`
                // Setup console
                globalThis.console = {
                    log: (...args) => {
                        const msg = '${this.label}| ' + args.map(a => String(a)).join(' ');
                        _logCallback(msg);
                    },
                    warn: (...args) => {
                        const msg = '${this.label}| WARN: ' + args.map(a => String(a)).join(' ');
                        _logCallback(msg);
                    },
                    error: (...args) => {
                        const msg = '${this.label}| ERROR: ' + args.map(a => String(a)).join(' ');
                        _logCallback(msg);
                    }
                };

                // Setup memory proxies
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

                // Safe built-ins available
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
            `);

            // Create context and run setup
            vm.createContext(context);
            await setupScript.runInContext(context);

            // Run user code with timeout
            const timeout = config.timeout || 30000;
            const userScript = new vm.Script(config.code);
            await userScript.runInContext(context, { timeout: timeout});

            // Extract results from VM
            const outputs = context.outputs;
            const extractedMemoryUpdates = context._memoryUpdates;
            const extractedWorkflowMemoryUpdates = context._workflowMemoryUpdates;

            // Persist memory updates
            for (const [key, value] of Object.entries(extractedMemoryUpdates)) {
                if (value === null) {
                    await memory.delete(key);
                } else {
                    await memory.set(key, value);
                }
            }
            for (const [key, value] of Object.entries(
                extractedWorkflowMemoryUpdates
            )) {
                if (value === null) {
                    await workflowMemory.delete(key);
                } else {
                    await workflowMemory.set(key, value);
                }
            }

            log(`Code executed successfully`);

            return {
                data: {
                    default: outputs.result ?? outputs,
                    result: outputs.result ?? outputs,
                    all: outputs,
                },
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            log(`Error: ${message}`);
            return {
                data: { error: { message } },
                error: error as Error,
            };
        }
    },
});

export default codeNode;
