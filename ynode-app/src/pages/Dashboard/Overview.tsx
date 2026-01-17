import { useEffect, useState } from 'react';
import {
  Activity,
  Workflow,
  Clock,
  CheckCircle2,
  Play,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchUserExecutions } from '@/api/workflowApi';
import { useAuthStore } from '@/store/authStore';
import { useWorkflowDataStore } from '@/store/workflowDataStore';
import { cn } from '@/lib/utils';

export function Overview() {
  const user = useAuthStore((state) => state.user);
  const { workflows, fetchAllWorkflows } = useWorkflowDataStore();

  const [activeWorkflows, setActiveWorkflows] = useState(0);
  const [totalExecutions, setTotalExecutions] = useState(0);
  const [successRate, setSuccessRate] = useState('0%');
  const [avgDuration, setAvgDuration] = useState('0ms');

  useEffect(() => {
    fetchAllWorkflows();
  }, [fetchAllWorkflows]);

  useEffect(() => {
    setActiveWorkflows(workflows.filter((w: any) => w.isActive).length);
  }, [workflows]);

  useEffect(() => {
    const loadExecutionStats = async () => {
      try {
        const executions = await fetchUserExecutions(50);
        setTotalExecutions(user?.executionsThisMonth || 0);

        if (executions.length > 0) {
          const successCount = executions.filter(
            (e: any) => e.status === 'success'
          ).length;
          const rate = (successCount / executions.length) * 100;
          setSuccessRate(`${rate.toFixed(1)}%`);

          const completed = executions.filter(
            (e: any) => e.completedAt && e.startedAt
          );
          if (completed.length > 0) {
            const totalDuration = completed.reduce((acc: number, curr: any) => {
              return (
                acc +
                (new Date(curr.completedAt!).getTime() -
                  new Date(curr.startedAt).getTime())
              );
            }, 0);
            const avg = Math.round(totalDuration / completed.length);
            setAvgDuration(`${avg}ms`);
          }
        }
      } catch (error) {
        console.error('Failed to load execution stats:', error);
      }
    };

    loadExecutionStats();
  }, [user]);

  const stats = [
    {
      label: 'Active Workflows',
      value: activeWorkflows.toString(),
      icon: Workflow,
      color: 'text-violet-400',
      bg: 'bg-violet-500/10',
      border: 'border-violet-500/20',
    },
    {
      label: 'Total Executions',
      value: totalExecutions.toString(),
      sub: 'This Month',
      icon: Activity,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20',
    },
    {
      label: 'Success Rate',
      value: successRate,
      sub: 'Last 50 Runs',
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
    },
    {
      label: 'Avg Duration',
      value: avgDuration,
      sub: 'Per Execution',
      icon: Clock,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-1">
            Dashboard
          </h1>
          <p className="text-muted-foreground text-sm font-light">
            Overview of your automation ecosystem.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/new-workflow"
            className="group inline-flex items-center justify-center gap-2 px-4 py-2 rounded-sm bg-secondary hover:bg-secondary/90 text-white font-medium transition-all shadow-lg active:scale-95"
          >
            <Play className="h-4 w-4 fill-current" />
            <span>New Workflow</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="relative p-5 rounded-lg bg-sidebar border border-border group overflow-hidden shadow-sm"
          >
            <div className="relative z-10">
              <div
                className={cn(
                  'inline-flex p-2.5 rounded-lg mb-3 border',
                  stat.bg,
                  stat.color,
                  stat.border
                )}
              >
                <stat.icon className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-foreground tracking-tight">
                  {stat.value}
                </h3>
                <div className="flex items-center gap-2">
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                    {stat.label}
                  </p>
                  {stat.sub && (
                    <span className="text-[9px] uppercase tracking-widest text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-border">
                      {stat.sub}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-lg bg-sidebar border border-border overflow-hidden flex flex-col shadow-sm">
          <div className="p-4 border-b border-border flex items-center justify-between bg-secondary/20">
            <h2 className="text-sm font-semibold text-foreground tracking-tight flex items-center gap-2">
              <Workflow className="h-4 w-4 text-muted-foreground" />
              Recent Workflows
            </h2>
            <Link
              to="/workflows"
              className="text-[11px] font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
            >
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-border flex-1">
            {workflows.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-8">
                <div className="h-12 w-12 bg-background rounded-lg flex items-center justify-center mb-4 border border-border shadow-inner">
                  <Workflow className="h-6 w-6 text-muted-foreground/40" />
                </div>
                <h3 className="text-foreground font-medium text-sm mb-1">
                  No workflows yet
                </h3>
                <p className="text-muted-foreground text-xs max-w-[200px] mx-auto">
                  Create your first workflow to start automating.
                </p>
              </div>
            ) : (
              workflows.slice(0, 5).map((workflow) => (
                <div
                  key={workflow.id}
                  className="p-3 flex items-center justify-between gap-3 hover:bg-white/5 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={cn(
                        'h-9 w-9 shrink-0 rounded flex items-center justify-center border',
                        workflow.isActive
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : 'bg-background border-border text-muted-foreground'
                      )}
                    >
                      <Workflow className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-foreground font-medium text-sm group-hover:text-primary transition-colors truncate">
                        {workflow.name}
                      </h3>
                      <p className="text-[10px] text-muted-foreground font-mono truncate" title={workflow.id}>
                        {workflow.id.slice(0, 8)}…
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div
                      className={cn(
                        'px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest whitespace-nowrap',
                        workflow.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-background text-muted-foreground border border-border'
                      )}
                    >
                      {workflow.isActive ? 'Active' : 'Stopped'}
                    </div>
                    <Link
                      to={`/editor/${workflow.id}`}
                      className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group/link"
                    >
                      Edit Workflow
                      <ArrowRight className="h-3 w-3 group-hover/link:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg bg-sidebar border border-border overflow-hidden flex flex-col h-full shadow-sm">
          <div className="p-4 border-b border-border bg-secondary/20">
            <h2 className="text-sm font-semibold text-foreground tracking-tight flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              System Status
            </h2>
          </div>
          <div className="p-4 flex-1 flex flex-col gap-5">
            <div className="relative overflow-hidden rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-4">
              <div className="flex items-start gap-3">
                <span className="relative flex h-2 w-2 mt-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <div>
                  <h3 className="text-xs font-semibold text-emerald-400">
                    ynode/core
                  </h3>
                  <p className="text-[10px] text-emerald-500/60 mt-0.5">
                    running v0.1.0-stable
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Quick Actions
              </h4>
              <button className="w-full text-left px-3.5 py-2.5 rounded-lg bg-background hover:bg-secondary/40 border border-border transition-all group">
                <span className="block text-xs font-medium text-foreground group-hover:text-primary">
                  View Documentation (WIP)
                </span>
                <span className="block text-[10px] text-muted-foreground mt-0.5">
                  Learn how to build complex flows
                </span>
              </button>
              <button className="w-full text-left px-3.5 py-2.5 rounded-lg bg-background hover:bg-secondary/40 border border-border transition-all group">
                <span className="block text-xs font-medium text-foreground group-hover:text-primary">
                  API Configuration (WIP)
                </span>
                <span className="block text-[10px] text-muted-foreground mt-0.5">
                  Manage your access tokens
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

