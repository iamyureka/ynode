import { useRef } from 'react';
import Editor, { type Monaco } from '@monaco-editor/react';
import type { CustomNodePort } from '@/store/customNodesStore';

interface CodeEditorProps {
    code: string;
    onChange: (code: string) => void;
    inputs?: CustomNodePort[];
    outputs?: CustomNodePort[];
}

export function CodeEditor({
    code,
    onChange,
    inputs = [],
    outputs = [],
}: CodeEditorProps) {
    const editorRef = useRef<unknown>(null);

    const handleEditorDidMount = (editor: unknown, monaco: Monaco) => {
        editorRef.current = editor;

        monaco.editor.defineTheme('node-assembler-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'comment', foreground: '64748B', fontStyle: 'italic' },
                { token: 'keyword', foreground: 'A78BFA' },
                { token: 'string', foreground: '34D399' },
                { token: 'number', foreground: 'FBBF24' },
                { token: 'variable', foreground: 'F1F5F9' },
                { token: 'type', foreground: '60A5FA' },
                { token: 'function', foreground: '06B6D4' },
                { token: 'operator', foreground: 'A78BFA' },
            ],
            colors: {
                'editor.background': '#09090b',
                'editor.foreground': '#F1F5F9',
                'editor.lineHighlightBackground': '#FFFFFF06',
                'editor.selectionBackground': '#A78BFA30',
                'editorCursor.foreground': '#A78BFA',
                'editor.selectionHighlightBackground': '#A78BFA15',
                'editorIndentGuide.background': '#FFFFFF08',
                'editorIndentGuide.activeBackground': '#A78BFA30',
                'editorLineNumber.foreground': '#3f3f46',
                'editorLineNumber.activeForeground': '#71717a',
                'editorBracketMatch.background': '#A78BFA25',
                'editorBracketMatch.border': '#A78BFA',
            },
        });

        monaco.editor.setTheme('node-assembler-dark');

        const inputDefs = inputs
            .map((p) => `  /** ${p.label} (${p.type}) */\n  ${p.id}: any;`)
            .join('\n');
        const outputDefs = outputs
            .map((p) => `  /** ${p.label} (${p.type}) */\n  ${p.id}: any;`)
            .join('\n');

        const libSource = `
      /** All input values from connected nodes */
      declare const inputs: {
${inputDefs}
      };
      
      /** Set output values here */
      declare const outputs: {
${outputDefs}
      };
      
      /** Node configuration values */
      declare const config: Record<string, any>;
      
      /** Node-scoped memory (persists across executions) */
      declare const memory: {
        /** Get a value from memory */
        get(key: string): any;
        /** Set a value in memory */
        set(key: string, value: any): void;
        /** Delete a value from memory */
        delete(key: string): void;
        /** Get all keys in memory */
        keys(): string[];
      };
      
      /** Workflow-scoped memory (shared across nodes) */
      declare const workflowMemory: {
        /** Get a value from workflow memory */
        get(key: string): any;
        /** Set a value in workflow memory */
        set(key: string, value: any): void;
        /** Delete a value from workflow memory */
        delete(key: string): void;
        /** Get all keys in workflow memory */
        keys(): string[];
      };

      /** Console for debug logging */
      declare const console: {
        log(...args: any[]): void;
        warn(...args: any[]): void;
        error(...args: any[]): void;
      };
    `;

        monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
            noSemanticValidation: false,
            noSyntaxValidation: false,
        });

        monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
            target: monaco.languages.typescript.ScriptTarget.ES2020,
            allowNonTsExtensions: true,
            moduleResolution:
                monaco.languages.typescript.ModuleResolutionKind.NodeJs,
            module: monaco.languages.typescript.ModuleKind.CommonJS,
            noEmit: true,
            esModuleInterop: true,
            allowJs: true,
        });

        monaco.languages.typescript.javascriptDefaults.addExtraLib(
            libSource,
            'ts:node-assembler.d.ts'
        );
    };

    return (
        <div className="h-full flex flex-col bg-[#09090b]">
            <div className="px-4 py-2 border-b border-white/5 bg-black/40 flex items-center justify-between shrink-0">
                <span className="text-xs text-zinc-500">JavaScript</span>
                <span className="text-xs text-zinc-600">
                    {code.split('\n').length} lines
                </span>
            </div>

            <div className="flex-1 min-h-0">
                <Editor
                    height="100%"
                    language="javascript"
                    value={code}
                    onChange={(val) => onChange(val || '')}
                    onMount={handleEditorDidMount}
                    theme="node-assembler-dark"
                    options={{
                        minimap: { enabled: false },
                        fontSize: 13,
                        fontFamily:
                            "'Fira Code', 'JetBrains Mono', 'Consolas', 'Monaco', monospace",
                        fontLigatures: true,
                        lineNumbers: 'on',
                        lineNumbersMinChars: 3,
                        roundedSelection: true,
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        tabSize: 2,
                        insertSpaces: true,
                        formatOnPaste: true,
                        wordWrap: 'on',
                        wrappingIndent: 'indent',
                        quickSuggestions: {
                            other: true,
                            comments: false,
                            strings: true,
                        },
                        parameterHints: { enabled: true },
                        suggestOnTriggerCharacters: true,
                        acceptSuggestionOnEnter: 'on',
                        snippetSuggestions: 'top',
                        padding: { top: 12, bottom: 12 },
                        cursorBlinking: 'smooth',
                        cursorSmoothCaretAnimation: 'on',
                        smoothScrolling: true,
                        folding: true,
                        foldingStrategy: 'indentation',
                        bracketPairColorization: { enabled: true },
                        renderLineHighlight: 'line',
                        scrollbar: {
                            verticalScrollbarSize: 8,
                            horizontalScrollbarSize: 8,
                        },
                    }}
                />
            </div>

            {(inputs.length > 0 || outputs.length > 0) && (
                <div className="px-4 py-2 border-t border-white/5 bg-black/40 flex flex-wrap gap-x-4 gap-y-1 shrink-0">
                    {inputs.length > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-zinc-600 uppercase">
                                Inputs:
                            </span>
                            {inputs.map((input) => (
                                <code
                                    key={input.id}
                                    className="text-[10px] px-1.5 py-0.5 bg-zinc-800 rounded text-pink-400"
                                    title={`Type: ${input.type}`}
                                >
                                    inputs.{input.id}
                                </code>
                            ))}
                        </div>
                    )}
                    {outputs.length > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-zinc-600 uppercase">
                                Outputs:
                            </span>
                            {outputs.map((output) => (
                                <code
                                    key={output.id}
                                    className="text-[10px] px-1.5 py-0.5 bg-zinc-800 rounded text-green-400"
                                    title={`Type: ${output.type}`}
                                >
                                    outputs.{output.id}
                                </code>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
