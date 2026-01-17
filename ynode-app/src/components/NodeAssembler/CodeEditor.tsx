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
                { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
                { token: 'keyword', foreground: '569CD6' },
                { token: 'string', foreground: 'CE9178' },
                { token: 'number', foreground: 'B5CEA8' },
                { token: 'variable', foreground: '9CDCFE' },
                { token: 'type', foreground: '4EC9B0' },
                { token: 'function', foreground: 'DCDCAA' },
                { token: 'operator', foreground: 'D4D4D4' },
                { token: 'identifier', foreground: '9CDCFE' },
                { token: 'delimiter', foreground: 'D4D4D4' },
            ],
            colors: {
                'editor.background': '#1E1E1F',
                'editor.foreground': '#D4D4D4',
                'editor.lineHighlightBackground': '#FFFFFF06',
                'editor.selectionBackground': '#264F78',
                'editorCursor.foreground': '#AEAFAD',
                'editor.selectionHighlightBackground': '#ADD6FF26',
                'editorIndentGuide.background': '#404040',
                'editorIndentGuide.activeBackground': '#707070',
                'editorLineNumber.foreground': '#858585',
                'editorLineNumber.activeForeground': '#C6C6C6',
                'editorBracketMatch.background': '#0064001a',
                'editorBracketMatch.border': '#888888',
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
            <div className="px-4 py-2 border-b border-border bg-[#1E1E1F] flex items-center justify-between shrink-0">
                <span className="text-xs text-muted-foreground">JavaScript</span>
                <span className="text-xs text-muted-foreground">
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
                <div className="px-4 py-2 border-t border-border bg-[#1E1E1F] shrink-0 overflow-x-auto">
                    <div className="flex items-center gap-4 min-w-max">
                        {inputs.length > 0 && (
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-muted-foreground uppercase shrink-0">
                                    Inputs:
                                </span>
                                <div className="flex items-center gap-1.5 flex-wrap max-w-[300px]">
                                    {inputs.slice(0, 6).map((input) => (
                                        <code
                                            key={input.id}
                                            className="text-[10px] px-1.5 py-0.5 bg-zinc-800 rounded text-pink-400 whitespace-nowrap"
                                            title={`Type: ${input.type}`}
                                        >
                                            inputs.{input.id}
                                        </code>
                                    ))}
                                    {inputs.length > 6 && (
                                        <span className="text-[10px] text-muted-foreground">
                                            +{inputs.length - 6} more
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                        {outputs.length > 0 && (
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-muted-foreground uppercase shrink-0">
                                    Outputs:
                                </span>
                                <div className="flex items-center gap-1.5 flex-wrap max-w-[300px]">
                                    {outputs.slice(0, 6).map((output) => (
                                        <code
                                            key={output.id}
                                            className="text-[10px] px-1.5 py-0.5 bg-zinc-800 rounded text-green-400 whitespace-nowrap"
                                            title={`Type: ${output.type}`}
                                        >
                                            outputs.{output.id}
                                        </code>
                                    ))}
                                    {outputs.length > 6 && (
                                        <span className="text-[10px] text-muted-foreground">
                                            +{outputs.length - 6} more
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

