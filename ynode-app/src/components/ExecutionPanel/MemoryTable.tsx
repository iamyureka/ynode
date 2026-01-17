import { useState, useEffect } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import { getAuthHeaders } from '../../store/authStore';
import { Database, RefreshCw, Trash2, Clock, Key } from 'lucide-react';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';

const API_BASE = 'http://localhost:3001/api';

interface MemoryEntry {
    key: string;
    value: unknown;
    nodeId: string | null;
    expiresAt: string | null;
    createdAt: string;
    updatedAt: string;
}

interface MemoryTableProps {
    className?: string;
}

export function MemoryTable({ className }: MemoryTableProps) {
    const workflowId = useWorkflowStore((state) => state.workflowId);
    const [entries, setEntries] = useState<MemoryEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchMemory = async () => {
        if (!workflowId) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(
                `${API_BASE}/workflows/${workflowId}/memory`,
                {
                    headers: { ...getAuthHeaders() },
                }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch memory');
            }

            const data = await response.json();
            setEntries(data.entries || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load memory');
        } finally {
            setIsLoading(false);
        }
    };

    const deleteEntry = async (key: string) => {
        if (!workflowId) return;

        try {
            const response = await fetch(
                `${API_BASE}/workflows/${workflowId}/memory/${encodeURIComponent(key)}`,
                {
                    method: 'DELETE',
                    headers: { ...getAuthHeaders() },
                }
            );

            if (response.ok) {
                setEntries((prev) => prev.filter((e) => e.key !== key));
            }
        } catch (err) {
            console.error('Failed to delete memory entry:', err);
        }
    };

    useEffect(() => {
        fetchMemory();
    }, [workflowId]);

    const formatValue = (value: unknown): string => {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        if (typeof value === 'string') return value.length > 100 ? value.slice(0, 100) + '...' : value;
        try {
            const str = JSON.stringify(value, null, 2);
            return str.length > 100 ? str.slice(0, 100) + '...' : str;
        } catch {
            return String(value);
        }
    };

    const getTimeAgo = (dateStr: string): string => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const seconds = Math.floor(diff / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    if (!workflowId) {
        return (
            <div className={cn('text-muted-foreground text-center py-4 text-xs', className)}>
                Save the workflow to view memory
            </div>
        );
    }

    return (
        <div className={cn('flex flex-col h-full bg-[#252526]', className)}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-sidebar">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Database className="w-4 h-4" />
                    <span>WORKFLOW MEMORY</span>
                    {entries.length > 0 && (
                        <Badge variant="secondary" className="text-[10px] h-5 bg-white/5 border border-border/50">
                            {entries.length}
                        </Badge>
                    )}
                </div>
                <button
                    onClick={fetchMemory}
                    disabled={isLoading}
                    className="p-1 hover:bg-secondary/50 rounded transition-colors disabled:opacity-50"
                    title="Refresh"
                >
                    <RefreshCw className={cn('w-4 h-4 text-muted-foreground', isLoading && 'animate-spin')} />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                {error ? (
                    <div className="text-red-400 text-xs text-center py-4">{error}</div>
                ) : entries.length === 0 ? (
                    <div className="text-muted-foreground opacity-50 text-center py-4 text-xs">
                        No memory entries yet
                    </div>
                ) : (
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="text-muted-foreground border-b border-border">
                                <th className="text-left py-2 px-2 font-medium">Key</th>
                                <th className="text-left py-2 px-2 font-medium">Value</th>
                                <th className="text-left py-2 px-2 font-medium w-24">Updated</th>
                                <th className="w-8"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map((entry) => (
                                <tr
                                    key={entry.key}
                                    className="border-b border-border/40 hover:bg-secondary/60 transition-colors"
                                >
                                    <td className="py-2 px-2">
                                        <div className="flex items-center gap-1.5">
                                            <Key className="w-3 h-3 text-primary/60" />
                                            <span className="font-mono text-primary">{entry.key}</span>
                                            {entry.nodeId && (
                                                <Badge variant="outline" className="text-[9px] h-4 opacity-60">
                                                    node
                                                </Badge>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-2 px-2">
                                        <code className="bg-background px-1.5 py-0.5 rounded text-[10px] text-muted-foreground font-mono border border-border/40">
                                            {formatValue(entry.value)}
                                        </code>
                                    </td>
                                    <td className="py-2 px-2 text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            <span>{getTimeAgo(entry.updatedAt)}</span>
                                        </div>
                                        {entry.expiresAt && (
                                            <div className="text-[9px] text-yellow-500/70 mt-0.5">
                                                expires {getTimeAgo(entry.expiresAt).replace('ago', 'left')}
                                            </div>
                                        )}
                                    </td>
                                    <td className="py-2 px-1">
                                        <button
                                            onClick={() => deleteEntry(entry.key)}
                                            className="p-1 hover:bg-red-500/20 rounded transition-colors text-muted-foreground hover:text-red-400"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

