import { useRef } from 'react';
import Editor, { type Monaco } from '@monaco-editor/react';
import { Label } from '../ui/label';
import { cn } from '../../lib/utils';

interface MonacoCodeEditorProps {
    value: string;
    onChange: (value: string) => void;
    language: string;
    label?: string;
    required?: boolean;
    description?: string;
    height?: string;
    className?: string;
}

export function MonacoCodeEditor({
    value,
    onChange,
    language,
    label = 'Code',
    required = false,
    description,
    height = '400px',
    className,
}: MonacoCodeEditorProps) {
    const editorRef = useRef<any>(null);

    const handleEditorDidMount = (editor: any, monaco: Monaco) => {
        editorRef.current = editor;

        monaco.editor.defineTheme('ynode-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'comment', foreground: '64748B', fontStyle: 'italic' },
                { token: 'keyword', foreground: '10B981' },
                { token: 'string', foreground: '34D399' },
                { token: 'number', foreground: 'FBBF24' },
                { token: 'variable', foreground: 'F1F5F9' },
                { token: 'type', foreground: '60A5FA' },
                { token: 'function', foreground: '06B6D4' },
                { token: 'operator', foreground: '10B981' },
            ],
            colors: {
                'editor.background': '#0f0f11ff',
                'editor.foreground': '#F1F5F9',
                'editor.lineHighlightBackground': '#FFFFFF08',
                'editor.selectionBackground': '#10B98140',
                'editorCursor.foreground': '#10B981',
                'editor.selectionHighlightBackground': '#10B98120',
                'editorIndentGuide.background': '#FFFFFF08',
                'editorIndentGuide.activeBackground': '#10B98140',
                'editor.inactiveSelectionBackground': '#10B98120',
                'editorBracketMatch.background': '#10B98130',
                'editorBracketMatch.border': '#10B981',
            },
        });

        monaco.editor.setTheme('ynode-dark');

        if (language === 'javascript' || language === 'typescript') {
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

            const libSource = `
        /** The main input data from the connected node */
        declare const $input: any;
        
        /** All inputs as an object */
        declare const inputs: Record<string, any>;
        
        /** Set your results here */
        declare const outputs: Record<string, any>;
        
        /** Node-scoped memory for storing data */
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
        
        /** Workflow-scoped memory for sharing data across nodes */
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
      `;

            monaco.languages.typescript.javascriptDefaults.addExtraLib(
                libSource,
                'ts:ynode-env.d.ts'
            );
        }

        if (language === 'python') {
        }
    };

    const handleEditorChange = (newValue: string | undefined) => {
        onChange(newValue || '');
    };

    return (
        <div className={cn('space-y-2', className)}>
            {label && (
                <Label>
                    {label}
                    {required && <span className="text-red-400 ml-1">*</span>}
                </Label>
            )}

            <div className="rounded-lg overflow-hidden border border-border shadow-lg">
                <Editor
                    height={height}
                    language={language}
                    value={value}
                    onChange={handleEditorChange}
                    onMount={handleEditorDidMount}
                    theme="ynode-dark"
                    options={{
                        fixedOverflowWidgets: true,
                        minimap: { enabled: false },
                        fontSize: 14,
                        fontFamily: "'Fira Code', 'JetBrains Mono', 'Consolas', 'Monaco', monospace",
                        fontLigatures: true,
                        lineNumbers: 'off',
                        roundedSelection: true,
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        tabSize: 2,
                        insertSpaces: true,
                        formatOnPaste: true,
                        formatOnType: true,
                        wordWrap: 'on',
                        wrappingIndent: 'indent',
                        quickSuggestions: {
                            other: true,
                            comments: false,
                            strings: true,
                        },
                        parameterHints: {
                            enabled: true,
                        },
                        suggestOnTriggerCharacters: true,
                        acceptSuggestionOnEnter: 'on',
                        snippetSuggestions: 'top',
                        padding: {
                            top: 12,
                            bottom: 12,
                        },
                        cursorBlinking: 'smooth',
                        cursorSmoothCaretAnimation: 'on',
                        smoothScrolling: true,
                        contextmenu: true,
                        mouseWheelZoom: true,
                        folding: true,
                        foldingStrategy: 'indentation',
                        bracketPairColorization: {
                            enabled: true,
                        },
                    }}
                />
            </div>

            {description && (
                <p className="text-[10px] text-muted-foreground">{description}</p>
            )}
        </div>
    );
}

