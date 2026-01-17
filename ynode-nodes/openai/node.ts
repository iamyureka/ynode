import { z } from 'zod';
import { defineNode } from '@ynode/core';
import type { ExecutionContext, NodeOutput } from '@ynode/core';

const configSchema = z.object({
    credentialId: z.string().default(''),
    apiUrl: z.string().url().default('https://api.openai.com/v1/chat/completions'),
    model: z
        .enum(['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'])
        .default('gpt-4o-mini'),
    systemPrompt: z.string().default('You are a helpful assistant.'),
    temperature: z.number().min(0).max(2).default(0.7),
    maxTokens: z.number().min(1).max(Number.MAX_SAFE_INTEGER-1).default(1024),
});

type OpenAIConfig = z.infer<typeof configSchema>;

export const openaiNode = defineNode<OpenAIConfig>({
    type: 'openai',
    label: 'OpenAI',
    description: 'Generate text using OpenAI GPT models',
    category: 'ai',
    icon: 'Brain',
    color: 'brand-purple',

    inputs: [
        {
            id: 'trigger',
            label: 'Trigger',
            type: 'any',
            required: true,
            description: 'Triggers execution',
        },
        {
            id: 'prompt',
            label: 'Prompt',
            type: 'string',
            required: true,
            description: 'The prompt to send to OpenAI',
        },
        {
            id: 'model_override',
            label: 'Model',
            type: 'string',
            required: false,
            description: "Override model"
        }
    ],

    outputs: [
        {
            id: 'response',
            label: 'Response',
            type: 'object',
            description: 'AI response with content and usage',
        },
        {
            id: 'text',
            label: 'Text',
            type: 'string',
            description: 'Just the response text',
        },
        {
            id: 'error',
            label: 'Error',
            type: 'object',
            description: 'Error if request failed',
        },
    ],

    configSchema,
    defaultConfig: {
        credentialId: '',
        apiUrl: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-4o-mini',
        systemPrompt: 'You are a helpful assistant.',
        temperature: 0.7,
        maxTokens: 1024,
    },

    credentials: [
        {
            type: 'openai',
            required: true,
            description: 'OpenAI API key',
        },
    ],

    requiresNetwork: true,

    async execute(ctx: ExecutionContext<OpenAIConfig>): Promise<NodeOutput> {
        const { config, inputs, log, credentials } = ctx;

        if (!config.credentialId) {
            return {
                data: { error: { message: 'No OpenAI credential configured' } },
                error: new Error('No OpenAI credential configured'),
            };
        }

        const prompt = inputs.prompt as string;
        if (!prompt) {
            return {
                data: { error: { message: 'No prompt provided' } },
                error: new Error('No prompt provided'),
            };
        }

        try {
            const creds = await credentials.get(config.credentialId);
            const apiKey = creds.apiKey;
            const model = inputs.model_override ? (inputs.model_override as string) : config.model

            log(`Calling ${config.apiUrl} for ${model}...`);
            
            const response = await fetch(
                config.apiUrl,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${apiKey}`,
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [
                            { role: 'system', content: config.systemPrompt },
                            { role: 'user', content: prompt },
                        ],
                        temperature: config.temperature,
                        max_tokens: config.maxTokens,
                    }),
                }
            );

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`OpenAI API error: ${response.status} - ${error}`);
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content || '';

            log(`Response received (${data.usage?.total_tokens || 0} tokens)`);

            return {
                data: {
                    default: { content, usage: data.usage },
                    response: { content, usage: data.usage, model: model },
                    text: content,
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

export default openaiNode;
