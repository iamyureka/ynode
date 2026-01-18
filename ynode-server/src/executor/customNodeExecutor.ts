/**
 * Custom Node Executor
 * Executes user-defined JavaScript code in a sandboxed environment (isolated-vm).
 * Provides the same execution context as the built-in code node.
 */

import type { MemoryAPI } from '@ynode/core';
import * as dns from 'dns';
import { promisify } from 'util';

const dnsResolve4 = promisify(dns.resolve4);
const dnsResolve6 = promisify(dns.resolve6);

const BLOCKED_HOSTS = [
    'localhost', '127.0.0.1', '::1', '0.0.0.0',
    '169.254.169.254',
    '100.100.100.200',
    'metadata.google.internal',
    'metadata',
    'instance-data',
    'metadata.goog',
];

const BLOCKED_DOMAINS = [
    'localtest.me',
    'vcap.me',
    'lvh.me',
    'lacolhost.com',
    'yoogle.com',
    '42foo.com',
    'nip.io',
    'sslip.io',
    'xip.io',
    'xip.name',
    'nip.li',
    '1u.ms',
    'spoofed.burpcollaborator.net',
];

const BLOCKED_PREFIXES = [
    '10.', '172.16.', '172.17.', '172.18.', '172.19.',
    '172.20.', '172.21.', '172.22.', '172.23.', '172.24.',
    '172.25.', '172.26.', '172.27.', '172.28.', '172.29.',
    '172.30.', '172.31.', '192.168.', '169.254.',
    'fc00:', 'fd00:', 'fe80:',
    '::1', '::ffff:',
    '0:0:0:0:0:0:0:',
];

function normalizeIPv6(ip: string): string {
    let normalized = ip.replace(/[\[\]]/g, '');

    if (normalized.includes('::')) {
        const parts = normalized.split('::');
        const leftParts = parts[0] ? parts[0].split(':') : [];
        const rightParts = parts[1] ? parts[1].split(':') : [];
        const missingZeros = 8 - leftParts.length - rightParts.length;
        const middleParts = Array(missingZeros).fill('0');
        normalized = [...leftParts, ...middleParts, ...rightParts].join(':');
    }

    const segments = normalized.split(':').map(s => s.padStart(4, '0'));
    return segments.join(':');
}

function isPrivateIP(ip: string): boolean {
    const cleanIP = ip.replace(/[\[\]]/g, '').toLowerCase();

    if (cleanIP === '::1' || cleanIP === '0:0:0:0:0:0:0:1') return true;
    if (cleanIP.startsWith('::ffff:')) {
        const ipv4 = cleanIP.slice(7);
        return isPrivateIP(ipv4);
    }

    try {
        const normalized = normalizeIPv6(cleanIP);
        if (normalized === '0000:0000:0000:0000:0000:0000:0000:0001') return true;

        if (normalized.startsWith('0000:0000:0000:0000:0000:ffff:')) {
            const last32bits = normalized.slice(30);
            const parts = last32bits.match(/.{4}/g) || [];
            if (parts.length === 2) {
                const a = parseInt(parts[0].slice(0, 2), 16);
                const b = parseInt(parts[0].slice(2, 4), 16);
                const c = parseInt(parts[1].slice(0, 2), 16);
                const d = parseInt(parts[1].slice(2, 4), 16);
                return isPrivateIP(`${a}.${b}.${c}.${d}`);
            }
        }
    } catch {
        // continue with other checks
    }

    if (cleanIP.startsWith('fe8') || cleanIP.startsWith('fe9') ||
        cleanIP.startsWith('fea') || cleanIP.startsWith('feb')) {
        return true;
    }

    if (cleanIP.startsWith('fc') || cleanIP.startsWith('fd')) {
        return true;
    }

    const parts = cleanIP.split('.');
    if (parts.length === 4) {
        const octets = parts.map(p => {
            if (p.startsWith('0x')) return parseInt(p, 16);
            if (p.startsWith('0') && p.length > 1 && !p.includes('.')) return parseInt(p, 8);
            return parseInt(p, 10);
        });

        if (octets.some(o => isNaN(o) || o < 0 || o > 255)) return false;

        const [a, b, c, d] = octets;

        if (a === 10) return true;
        if (a === 172 && b >= 16 && b <= 31) return true;
        if (a === 192 && b === 168) return true;
        if (a === 127) return true;
        if (a === 169 && b === 254) return true;
        if (a === 0) return true;
        if (a === 255 && b === 255 && c === 255 && d === 255) return true;
        if (a >= 224 && a <= 239) return true;
    }

    if (/^\d+$/.test(cleanIP)) {
        const num = parseInt(cleanIP, 10);
        if (num >= 0 && num <= 0xFFFFFFFF) {
            const a = (num >>> 24) & 0xFF;
            const b = (num >>> 16) & 0xFF;
            const c = (num >>> 8) & 0xFF;
            const d = num & 0xFF;
            return isPrivateIP(`${a}.${b}.${c}.${d}`);
        }
    }

    if (/^0x[0-9a-f]+$/i.test(cleanIP)) {
        const num = parseInt(cleanIP, 16);
        if (num >= 0 && num <= 0xFFFFFFFF) {
            const a = (num >>> 24) & 0xFF;
            const b = (num >>> 16) & 0xFF;
            const c = (num >>> 8) & 0xFF;
            const d = num & 0xFF;
            return isPrivateIP(`${a}.${b}.${c}.${d}`);
        }
    }

    return false;
}

const urlCheckCache = new Map<string, { blocked: boolean; timestamp: number }>();
const CACHE_TTL = 5000;

async function isBlockedUrl(urlString: string): Promise<boolean> {
    const now = Date.now();
    const cached = urlCheckCache.get(urlString);
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
        return cached.blocked;
    }

    try {
        let normalizedUrl = urlString;
        let prevUrl = '';

        while (prevUrl !== normalizedUrl) {
            prevUrl = normalizedUrl;
            try {
                normalizedUrl = decodeURIComponent(normalizedUrl);
            } catch {
                break;
            }
        }

        const url = new URL(normalizedUrl);
        let hostname = url.hostname.toLowerCase();
        hostname = hostname.replace(/[\[\]]/g, '');

        if (!['http:', 'https:'].includes(url.protocol)) {
            urlCheckCache.set(urlString, { blocked: true, timestamp: now });
            return true;
        }
        if (url.username || url.password || urlString.includes('@')) {
            urlCheckCache.set(urlString, { blocked: true, timestamp: now });
            return true;
        }

        if (BLOCKED_HOSTS.includes(hostname)) {
            urlCheckCache.set(urlString, { blocked: true, timestamp: now });
            return true;
        }

        if (BLOCKED_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d))) {
            urlCheckCache.set(urlString, { blocked: true, timestamp: now });
            return true;
        }

        if (hostname.endsWith('.internal') ||
            hostname.endsWith('.local') ||
            hostname.endsWith('.localhost') ||
            hostname.endsWith('.localdomain') ||
            hostname.endsWith('.lan')) {
            urlCheckCache.set(urlString, { blocked: true, timestamp: now });
            return true;
        }

        if (hostname.endsWith('.nip.io') ||
            hostname.endsWith('.sslip.io') ||
            hostname.endsWith('.xip.io')) {
            urlCheckCache.set(urlString, { blocked: true, timestamp: now });
            return true;
        }

        if (BLOCKED_PREFIXES.some(prefix => hostname.startsWith(prefix))) {
            urlCheckCache.set(urlString, { blocked: true, timestamp: now });
            return true;
        }

        if (isPrivateIP(hostname)) {
            urlCheckCache.set(urlString, { blocked: true, timestamp: now });
            return true;
        }

        try {
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('DNS timeout')), 5000)
            );

            const resolutionPromises = [
                dnsResolve4(hostname).catch(() => []),
                dnsResolve6(hostname).catch(() => [])
            ];

            const results = await Promise.race([
                Promise.all(resolutionPromises),
                timeoutPromise
            ]);

            const allAddresses = results.flat();

            for (const addr of allAddresses) {
                if (isPrivateIP(addr)) {
                    urlCheckCache.set(urlString, { blocked: true, timestamp: now });
                    return true;
                }
            }
        } catch (err) {
            urlCheckCache.set(urlString, { blocked: true, timestamp: now });
            return true;
        }

        if (urlCheckCache.size > 1000) {
            for (const [key, value] of urlCheckCache.entries()) {
                if (now - value.timestamp > CACHE_TTL * 2) {
                    urlCheckCache.delete(key);
                }
            }
        }

        urlCheckCache.set(urlString, { blocked: false, timestamp: now });
        return false;
    } catch {
        urlCheckCache.set(urlString, { blocked: true, timestamp: now });
        return true;
    }
}

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

        const $input = inputs.data ?? inputs.trigger ?? Object.values(inputs)[0] ?? null;

        const isolate = new ivm.Isolate({ memoryLimit });
        const context = await isolate.createContext();
        const jail = context.global;

        await jail.set('$input', new ivm.ExternalCopy($input).copyInto());
        await jail.set('inputs', new ivm.ExternalCopy(inputs).copyInto());
        await jail.set('config', new ivm.ExternalCopy(config).copyInto());
        await jail.set('_memoryData', new ivm.ExternalCopy(memoryData).copyInto());
        await jail.set('_workflowMemoryData', new ivm.ExternalCopy(workflowMemoryData).copyInto());
        await jail.set('outputs', {}, { copy: true });
        await jail.set('_memoryUpdates', {}, { copy: true });
        await jail.set('_workflowMemoryUpdates', {}, { copy: true });

        await jail.set('_logCallback', new ivm.Reference((msg: string) => {
            logHandler(msg);
        }));

        if (credentials) {
            await jail.set('_credentialsCallback', new ivm.Reference(async (credentialId: string) => {
                try {
                    const creds = await credentials.get(credentialId);
                    return JSON.stringify({ success: true, data: creds });
                } catch (err) {
                    return JSON.stringify({
                        success: false,
                        error: err instanceof Error ? err.message : 'Failed to fetch credential'
                    });
                }
            }));
        }

        await context.eval(`
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

      globalThis.credentials = {
        get: async (credentialId) => {
          if (typeof _credentialsCallback === 'undefined') {
            throw new Error('Credentials API not available');
          }
          const resultJson = await _credentialsCallback.apply(undefined, [credentialId], { result: { promise: true } });
          const result = JSON.parse(resultJson);
          if (!result.success) {
            throw new Error(result.error);
          }
          return result.data;
        }
      };

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

      // Remove dangerous globals
      delete globalThis.SharedArrayBuffer;
      delete globalThis.Atomics;
      delete globalThis.WebAssembly;
      
      // Freeze prototypes to prevent pollution
      Object.freeze(Object.prototype);
      Object.freeze(Array.prototype);
      Object.freeze(Function.prototype);
      Object.freeze(String.prototype);
      Object.freeze(Number.prototype);
      Object.freeze(Boolean.prototype);
      Object.freeze(RegExp.prototype);
      Object.freeze(Date.prototype);
      Object.freeze(Map.prototype);
      Object.freeze(Set.prototype);
      Object.freeze(Promise.prototype);
    `);

        if (input.requiresNetwork) {
            await jail.set('_fetchCallback', new ivm.Reference(async (url: string, optionsJson: string) => {
                const MAX_REDIRECTS = 5;
                const MAX_RESPONSE_SIZE = 10 * 1024 * 1024; // 10MB
                let currentUrl = url;
                let redirectCount = 0;

                try {
                    if (await isBlockedUrl(currentUrl)) {
                        logHandler(`Blocked request to: ${currentUrl}`);
                        return JSON.stringify({
                            ok: false,
                            status: 403,
                            statusText: 'URL blocked by security policy',
                            text: 'Access to internal networks is not permitted',
                        });
                    }

                    const options = optionsJson ? JSON.parse(optionsJson) : {};

                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 30000);

                    const safeOptions = {
                        ...options,
                        redirect: 'manual',
                        signal: controller.signal,
                    };

                    let response = await fetch(currentUrl, safeOptions);
                    clearTimeout(timeoutId);

                    while (response.status >= 300 && response.status < 400 && redirectCount < MAX_REDIRECTS) {
                        const location = response.headers.get('location');
                        if (!location) break;

                        try {
                            currentUrl = new URL(location, currentUrl).toString();
                        } catch {
                            return JSON.stringify({
                                ok: false,
                                status: 400,
                                statusText: 'Invalid redirect URL',
                                text: '',
                            });
                        }

                        if (await isBlockedUrl(currentUrl)) {
                            logHandler(`Blocked redirect to: ${currentUrl}`);
                            return JSON.stringify({
                                ok: false,
                                status: 403,
                                statusText: 'Redirect to blocked URL',
                                text: 'Redirect to internal networks is not permitted',
                            });
                        }

                        redirectCount++;
                        logHandler(`Following redirect ${redirectCount}/${MAX_REDIRECTS}: ${currentUrl}`);

                        const redirectController = new AbortController();
                        const redirectTimeoutId = setTimeout(() => redirectController.abort(), 30000);

                        response = await fetch(currentUrl, {
                            ...safeOptions,
                            signal: redirectController.signal,
                        });

                        clearTimeout(redirectTimeoutId);
                    }

                    if (redirectCount >= MAX_REDIRECTS) {
                        return JSON.stringify({
                            ok: false,
                            status: 508,
                            statusText: 'Too many redirects',
                            text: '',
                        });
                    }

                    const contentLength = response.headers.get('content-length');
                    if (contentLength && parseInt(contentLength) > MAX_RESPONSE_SIZE) {
                        return JSON.stringify({
                            ok: false,
                            status: 413,
                            statusText: 'Response too large',
                            text: '',
                        });
                    }

                    const reader = response.body?.getReader();
                    if (reader) {
                        const chunks: Uint8Array[] = [];
                        let totalSize = 0;

                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) break;

                            totalSize += value.length;
                            if (totalSize > MAX_RESPONSE_SIZE) {
                                reader.cancel();
                                return JSON.stringify({
                                    ok: false,
                                    status: 413,
                                    statusText: 'Response too large',
                                    text: '',
                                });
                            }

                            chunks.push(value);
                        }

                        const allChunks = new Uint8Array(totalSize);
                        let position = 0;
                        for (const chunk of chunks) {
                            allChunks.set(chunk, position);
                            position += chunk.length;
                        }

                        const text = new TextDecoder().decode(allChunks);

                        return JSON.stringify({
                            ok: response.ok,
                            status: response.status,
                            statusText: response.statusText,
                            text: text,
                            headers: Object.fromEntries(response.headers.entries()),
                        });
                    }

                    const text = await response.text();
                    return JSON.stringify({
                        ok: response.ok,
                        status: response.status,
                        statusText: response.statusText,
                        text: text,
                        headers: Object.fromEntries(response.headers.entries()),
                    });
                } catch (err) {
                    const errorMsg = err instanceof Error ? err.message : 'Network error';
                    logHandler(`Fetch error: ${errorMsg}`);
                    return JSON.stringify({
                        ok: false,
                        status: 0,
                        statusText: errorMsg,
                        text: '',
                    });
                }
            }));

            await context.eval(`
                globalThis._networkEnabled = true;
                globalThis.fetch = async (url, options) => {
                    const optionsJson = options ? JSON.stringify(options) : '';
                    const resultJson = await _fetchCallback.apply(undefined, [url, optionsJson], { result: { promise: true } });
                    const result = JSON.parse(resultJson);
                    return {
                        ok: result.ok,
                        status: result.status,
                        statusText: result.statusText,
                        headers: result.headers || {},
                        text: async () => result.text,
                        json: async () => JSON.parse(result.text),
                    };
                };
            `);
        }

        const wrappedCode = `(async () => { ${code} })();`;

        // SECURITY: Use Promise.race to enforce timeout for async code
        // isolated-vm timeout only works for synchronous code
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Execution timeout: code exceeded ${timeout}ms limit`));
            }, timeout);
        });

        const executionPromise = context.eval(wrappedCode, { timeout, promise: true });

        await Promise.race([executionPromise, timeoutPromise]);

        const outputsRef = await jail.get('outputs');
        const outputs = await outputsRef.copy();

        const memoryUpdatesRef = await jail.get('_memoryUpdates');
        const extractedMemoryUpdates = await memoryUpdatesRef.copy();

        const workflowMemoryUpdatesRef = await jail.get('_workflowMemoryUpdates');
        const extractedWorkflowMemoryUpdates = await workflowMemoryUpdatesRef.copy();

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

export async function testCustomNodeCode(
    code: string,
    testInputs: Record<string, unknown>,
    testConfig: Record<string, unknown>,
    requiresNetwork: boolean = false
): Promise<CustomNodeExecutorResult> {
    return testCustomNodeCodeWithCallback(code, testInputs, testConfig, requiresNetwork);
}

export async function testCustomNodeCodeWithCallback(
    code: string,
    testInputs: Record<string, unknown>,
    testConfig: Record<string, unknown>,
    requiresNetwork: boolean = false,
    onLog?: (message: string) => void
): Promise<CustomNodeExecutorResult> {
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
        requiresNetwork,
        memory: mockMemoryApi,
        workflowMemory: mockMemoryApi,
        log: onLog,
        timeout: 30000,
        memoryLimit: 64,
    });
}