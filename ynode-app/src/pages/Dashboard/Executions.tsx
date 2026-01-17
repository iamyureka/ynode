import { useEffect, useState } from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Play,
  Calendar,
  Search,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { fetchUserExecutions, type Execution } from '@/api/workflowApi';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function Executions() {
  const [executions, setExecutions] = useState<
    (Execution & { workflowName: string })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadExecutions();
  }, []);

  const loadExecutions = async () => {
    try {
      setLoading(true);
      const data = await fetchUserExecutions(100);
      setExecutions(data);
    } catch (error) {
      console.error('Failed to load executions:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const styles = {
      success:
        'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      error:
        'bg-red-500/10 text-red-400 border-red-500/20',
      running: 'bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse',
      default: 'bg-background text-muted-foreground border-border',
    };
    const style = styles[status as keyof typeof styles] || styles.default;

    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border',
          style
        )}
      >
        {status === 'success' && <CheckCircle2 className="h-3 w-3" />}
        {status === 'error' && <XCircle className="h-3 w-3" />}
        {status === 'running' && (
          <Loader2 className="h-3 w-3 animate-spin flow-root" />
        )}
        <span className="capitalize">{status}</span>
      </div>
    );
  };

  const filteredExecutions = executions.filter(
    (ex) =>
      ex.workflowName?.toLowerCase().includes(search.toLowerCase()) ||
      ex.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-1">
            Execution History
          </h1>
          <p className="text-muted-foreground text-sm font-light">
            View and analyze your recent workflow runs.
          </p>
        </div>
      </div>

      <div className="relative group">
        <div className="relative flex items-center bg-sidebar rounded-lg border border-border p-0.5">
          <Search className="h-4 w-4 text-muted-foreground ml-3 mr-2" />
          <input
            type="text"
            placeholder="Search executions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-foreground placeholder:text-muted-foreground/40 h-8 text-sm min-w-0"
          />
        </div>
      </div>

      <div className="rounded-lg bg-sidebar border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary/40 text-muted-foreground font-medium border-b border-border">
              <tr>
                <th className="px-6 py-4 font-semibold tracking-wider text-[10px] uppercase">
                  Status
                </th>
                <th className="px-6 py-4 font-semibold tracking-wider text-[10px] uppercase">
                  Workflow
                </th>
                <th className="px-6 py-4 font-semibold tracking-wider text-[10px] uppercase">
                  Trigger
                </th>
                <th className="px-6 py-4 font-semibold tracking-wider text-[10px] uppercase">
                  Started
                </th>
                <th className="px-6 py-4 font-semibold tracking-wider text-[10px] uppercase">
                  Duration
                </th>
                <th className="px-6 py-4 font-semibold tracking-wider text-[10px] uppercase text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
                      <p className="text-muted-foreground">
                        Loading execution history...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : filteredExecutions.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-20 text-center text-muted-foreground"
                  >
                    No executions found
                  </td>
                </tr>
              ) : (
                filteredExecutions.map((execution) => (
                  <tr
                    key={execution.id}
                    className="hover:bg-secondary transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <StatusBadge status={execution.status} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {execution.workflowName}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono mt-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                        #{execution.id.slice(0, 8)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded bg-secondary/60">
                          <Play className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <span className="capitalize text-xs">
                          {execution.triggerType || 'Manual'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      <div
                        className="flex items-center gap-2 text-xs"
                        title={new Date(execution.startedAt).toLocaleString()}
                      >
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>
                          {formatDistanceToNow(new Date(execution.startedAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      <div className="flex items-center gap-2 text-xs">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-mono">
                          {execution.completedAt
                            ? `${new Date(execution.completedAt).getTime() - new Date(execution.startedAt).getTime()}ms`
                            : '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/executions/${execution.id}`}
                        className="inline-flex items-center justify-center p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

