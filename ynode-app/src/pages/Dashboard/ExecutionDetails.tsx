import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Terminal,
  FileJson,
  Loader2,
  Activity,
} from 'lucide-react';
import { fetchExecution, type Execution } from '@/api/workflowApi';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export function ExecutionDetails() {
  const { executionId } = useParams<{ executionId: string }>();
  const [execution, setExecution] = useState<Execution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!executionId) return;
    loadExecution(executionId);
  }, [executionId]);

  const loadExecution = async (id: string) => {
    try {
      setLoading(true);
      const data = await fetchExecution(id);
      setExecution(data);
    } catch (err) {
      setError('Failed to load execution details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'success':
        return 'border-emerald-500/20 text-emerald-400 bg-emerald-500/10 shadow-sm';
      case 'error':
        return 'border-red-500/20 text-red-400 bg-red-500/10 shadow-sm';
      case 'running':
        return 'border-blue-500/20 text-blue-400 bg-blue-500/10 animate-pulse';
      default:
        return 'border-border text-muted-foreground bg-background';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground animate-pulse">
          Loading execution details...
        </p>
      </div>
    );
  }

  if (error || !execution) {
    return (
      <div className="flex flex-col items-center justify-center p-20 min-h-[60vh] text-center">
        <div className="h-16 w-16 rounded-lg bg-destructive/10 flex items-center justify-center mb-6 border border-destructive/20">
          <XCircle className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">
          Error Loading Execution
        </h2>
        <p className="text-muted-foreground mb-8 max-w-sm text-sm">
          {error || 'Execution not found or deleted.'}
        </p>
        <Link
          to="/executions"
          className="px-6 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-all text-sm font-medium"
        >
          Return to Execution History
        </Link>
      </div>
    );
  }

  const duration =
    execution.completedAt && execution.startedAt
      ? new Date(execution.completedAt).getTime() -
      new Date(execution.startedAt).getTime()
      : null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div>
        <Link
          to="/executions"
          className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4 group"
        >
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Back to History
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-4 mb-3">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                Execution Details
              </h1>
              <div
                className={cn(
                  'px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border flex items-center gap-1.5',
                  getStatusStyle(execution.status)
                )}
              >
                {execution.status === 'success' && (
                  <CheckCircle2 className="h-3 w-3" />
                )}
                {execution.status === 'error' && (
                  <XCircle className="h-3 w-3" />
                )}
                {execution.status === 'running' && (
                  <Activity className="h-3 w-3" />
                )}
                {execution.status}
              </div>
            </div>
            <div className="flex items-center gap-6 text-[11px] text-muted-foreground">
              <span className="font-mono bg-background px-2 py-0.5 rounded border border-border">
                {execution.id}
              </span>
              <span className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                {formatDistanceToNow(new Date(execution.startedAt), {
                  addSuffix: true,
                })}
              </span>
              {duration && (
                <span className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-mono">{duration}ms</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-sidebar border border-border overflow-hidden shadow-sm flex flex-col">
        <div className="p-4 border-b border-border bg-secondary/20 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Terminal className="h-4 w-4 text-primary" />
            Execution Log Stream
          </h2>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-background/50 px-2 py-0.5 rounded border border-border/50">
            {execution.logs.length} Steps
          </span>
        </div>

        <div className="p-4 space-y-4">
          {execution.logs.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm italic">
              Waiting for execution logs...
            </div>
          ) : (
            execution.logs.map((log, index) => (
              <div key={index} className="flex gap-4 group">
                <div className="flex flex-col items-center gap-1 shrink-0 pt-1.5">
                  <div
                    className={cn(
                      'h-2.5 w-2.5 rounded-full border-2 border-sidebar z-10',
                      log.status === 'success'
                        ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                        : log.status === 'error'
                          ? 'bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.4)]'
                          : 'bg-primary shadow-[0_0_8px_rgba(229,160,31,0.4)]'
                    )}
                  />
                  {index < execution.logs.length - 1 && (
                    <div className="w-px flex-1 bg-border/50" />
                  )}
                </div>

                <div className="flex-1 min-w-0 bg-background/50 rounded-lg border border-border p-3.5 hover:bg-background transition-colors shadow-sm">
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">
                        {log.nodeName}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono bg-sidebar px-1.5 py-0.5 rounded border border-border/50">
                        {log.nodeId}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground break-words leading-relaxed font-mono">
                    {String(log.message)}
                  </p>

                  {(() => {
                    const data = log.data;
                    if (
                      data &&
                      typeof data === 'object' &&
                      !Array.isArray(data) &&
                      Object.keys(data).length > 0
                    ) {
                      return (
                        <div className="mt-2.5 pt-2.5 border-t border-border/30">
                          <details className="group/details">
                            <summary className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground transition-all select-none list-none">
                              <FileJson className="h-3 w-3" />
                              <span>View Data payload</span>
                            </summary>
                            <div className="mt-2 text-[10px] font-mono bg-sidebar rounded border border-border/50 p-2.5 overflow-x-auto text-muted-foreground animate-in slide-in-from-top-1 fade-in duration-200">
                              <pre>{JSON.stringify(data, null, 2)}</pre>
                            </div>
                          </details>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
