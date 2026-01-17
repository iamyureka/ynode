import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Workflow,
  Search,
  Plus,
  Calendar,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import { useWorkflowDataStore } from '@/store/workflowDataStore';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export function Workflows() {
  const { workflows, workflowsLoading, fetchAllWorkflows, deleteWorkflow } =
    useWorkflowDataStore();
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchAllWorkflows();
  }, [fetchAllWorkflows]);

  const filteredWorkflows = workflows.filter(
    (w) =>
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-1">
            Workflows
          </h1>
          <p className="text-muted-foreground text-sm font-light">
            Manage and monitor your automation workflows.
          </p>
        </div>
        <Link
          to="/new-workflow"
          className="group inline-flex items-center justify-center gap-2 px-4 py-2 rounded-sm bg-secondary hover:bg-secondary/90 text-white font-medium transition-all shadow-lg active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>Create Workflow</span>
        </Link>
      </div>

      <div className="relative group">
        <div className="relative flex items-center bg-sidebar rounded-lg border border-border p-0.5">
          <Search className="h-4 w-4 text-muted-foreground ml-3 mr-2" />
          <input
            type="text"
            placeholder="Search workflows..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-foreground placeholder:text-muted-foreground/40 h-8 text-sm min-w-0"
          />
        </div>
      </div>

      {workflowsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-48 rounded-lg bg-sidebar border border-border animate-pulse"
            />
          ))}
        </div>
      ) : filteredWorkflows.length === 0 ? (
        <div className="text-center py-20 rounded-lg bg-sidebar border border-border border-dashed">
          <div className="h-16 w-16 bg-background rounded-lg flex items-center justify-center mx-auto mb-4 border border-border shadow-inner">
            <Workflow className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            No workflows found
          </h3>
          <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
            Get started by creating your first automation workflow.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWorkflows.map((workflow) => (
            <div
              key={workflow.id}
              className="group relative flex flex-col p-5 rounded-lg bg-sidebar border border-border hover:border-primary/50 transition-all duration-300 shadow-sm"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className={cn(
                    'p-3 rounded-lg border',
                    workflow.isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-background text-muted-foreground border-border'
                  )}
                >
                  <Workflow className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border',
                      workflow.isActive
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-background text-muted-foreground border-border'
                    )}
                  >
                    {workflow.isActive ? 'Active' : 'Inactive'}
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (
                        confirm(
                          'Are you sure you want to delete this workflow?'
                        )
                      ) {
                        deleteWorkflow(workflow.id);
                      }
                    }}
                    className="p-1.5 ml-1 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete Workflow"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="mb-4 flex-1">
                <h3 className="text-base font-semibold text-foreground mb-1 group-hover:text-primary transition-colors line-clamp-1">
                  {workflow.name}
                </h3>
                <p className="text-[10px] text-muted-foreground font-mono truncate bg-background px-1.5 py-0.5 inline-block border border-border rounded">
                  {workflow.id}
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border mt-auto">
                <span className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" />
                  {workflow.updatedAt
                    ? formatDistanceToNow(new Date(workflow.updatedAt), {
                      addSuffix: true,
                    })
                    : 'Just now'}
                </span>

                <Link
                  to={`/editor/${workflow.id}`}
                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group/link"
                >
                  Edit Workflow
                  <ArrowRight className="h-3 w-3 group-hover/link:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
