import { Play, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CustomNodePort, TestExecutionResult } from '@/store/customNodesStore';
import { cn } from '@/lib/utils';

interface TestPanelProps {
    inputs: CustomNodePort[];
    result: TestExecutionResult | null;
    onRunTest: () => void;
    isTesting: boolean;
}

export function TestPanel({ inputs, result, onRunTest, isTesting }: TestPanelProps) {
    return (
        <div className="h-full flex flex-col bg-[#0d0d0d]">
            <div className="px-4 py-3 border-b border-white/5 bg-black/40 flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-300">Test Execution</span>
                <Button
                    size="sm"
                    onClick={onRunTest}
                    disabled={isTesting}
                    className="bg-green-600 hover:bg-green-700"
                >
                    {isTesting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <Play className="w-4 h-4 mr-2" />
                    )}
                    Run Test
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                {!result ? (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mb-4">
                            <Play className="w-8 h-8 text-zinc-600" />
                        </div>
                        <h3 className="text-lg font-medium text-zinc-400 mb-2">
                            No test results yet
                        </h3>
                        <p className="text-sm text-zinc-600 max-w-md">
                            Click "Run Test" to execute your code with sample input values.
                            Inputs will be populated with default values based on their types.
                        </p>
                        {inputs.length > 0 && (
                            <div className="mt-6 text-left w-full max-w-md">
                                <h4 className="text-xs text-zinc-500 uppercase mb-2">
                                    Test inputs will be:
                                </h4>
                                <div className="space-y-1 font-mono text-xs">
                                    {inputs.map((input) => (
                                        <div key={input.id} className="text-zinc-500">
                                            <span className="text-zinc-400">{input.id}</span>:{' '}
                                            <span className="text-zinc-600">
                                                {getDefaultValueString(input.type)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div
                            className={cn(
                                'p-4 rounded-lg border flex items-start gap-3',
                                result.success
                                    ? 'bg-green-500/5 border-green-500/20'
                                    : 'bg-red-500/5 border-red-500/20'
                            )}
                        >
                            {result.success ? (
                                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                            ) : (
                                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                            )}
                            <div>
                                <h3
                                    className={cn(
                                        'font-medium',
                                        result.success ? 'text-green-400' : 'text-red-400'
                                    )}
                                >
                                    {result.success ? 'Execution Successful' : 'Execution Failed'}
                                </h3>
                                {result.error && (
                                    <p className="text-sm text-red-400/80 mt-1">{result.error}</p>
                                )}
                            </div>
                        </div>

                        {result.success && Object.keys(result.outputs).length > 0 && (
                            <div>
                                <h4 className="text-xs text-zinc-500 uppercase mb-2">Outputs</h4>
                                <pre className="p-4 rounded-lg bg-black/60 border border-white/5 text-sm text-zinc-300 overflow-x-auto font-mono">
                                    {JSON.stringify(result.outputs, null, 2)}
                                </pre>
                            </div>
                        )}

                        {result.logs.length > 0 && (
                            <div>
                                <h4 className="text-xs text-zinc-500 uppercase mb-2">
                                    Console Output ({result.logs.length})
                                </h4>
                                <div className="rounded-lg bg-black/60 border border-white/5 overflow-hidden">
                                    {result.logs.map((log, i) => (
                                        <div
                                            key={i}
                                            className="px-4 py-2 border-b border-white/5 last:border-0 font-mono text-xs text-zinc-400"
                                        >
                                            {log}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function getDefaultValueString(type: string): string {
    switch (type) {
        case 'string':
            return '"test"';
        case 'number':
            return '0';
        case 'boolean':
            return 'false';
        case 'array':
            return '[]';
        case 'object':
            return '{}';
        default:
            return 'null';
    }
}
