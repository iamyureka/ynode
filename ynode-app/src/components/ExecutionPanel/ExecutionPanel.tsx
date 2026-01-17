import { useRef, useEffect, useState } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import {
  Terminal,
  Check,
  Clock,
  XCircle,
  ChevronUp,
  ChevronDown,
  Database,
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import { MemoryTable } from './MemoryTable';

type TabType = 'console' | 'memory';

export function ExecutionPanel() {
  const executionLogs = useWorkflowStore((state) => state.executionLogs);
  const isExecuting = useWorkflowStore((state) => state.isExecuting);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('console');

  useEffect(() => {
    if (logsEndRef.current && isExpanded && activeTab === 'console') {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [executionLogs, isExpanded, activeTab]);

  useEffect(() => {
    if (isExecuting) {
      setIsExpanded(true);
      setActiveTab('console');
    }
  }, [isExecuting]);

  return (
    <div
      className={cn(
        'absolute bottom-6 left-6 right-6 bg-background rounded-lg border border-border flex flex-col justify-center overflow-hidden z-40 transition-all duration-300 shadow-black/40 bg-[#252526]',
        isExpanded ? 'h-64' : 'h-12'
      )}
    >
      <div
        className="flex items-center justify-between px-4 py-2 border-b min-h-12 border-border bg-background cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          {/* Console Tab */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveTab('console');
              if (!isExpanded) setIsExpanded(true);
            }}
            className={cn(
              'flex items-center gap-2 text-xs outline-none font-mono transition-colors px-2 py-1 rounded',
              activeTab === 'console'
                ? 'text-primary bg-primary/10 border border-primary/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            )}
          >
            <Terminal className="w-4 h-4" />
            <span className="font-semibold tracking-tight">CONSOLE</span>
            {executionLogs.length > 0 && (
              <Badge
                variant="secondary"
                className={cn(
                  'text-[10px] h-5 px-1.5 min-w-[20px] justify-center',
                  activeTab === 'console' ? 'bg-primary/20 border border-primary/20' : 'bg-white/5'
                )}
              >
                {executionLogs.length}
              </Badge>
            )}
          </button>

          {/* Memory Tab */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveTab('memory');
              if (!isExpanded) setIsExpanded(true);
            }}
            className={cn(
              'flex items-center gap-2 text-xs font-mono transition-colors px-2 py-1 rounded',
              activeTab === 'memory'
                ? 'text-purple-400 bg-purple-500/10 border border-purple-500/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            )}
          >
            <Database className="w-4 h-4" />
            <span className="font-semibold tracking-tight">MEMORY</span>
          </button>

          {isExecuting && (
            <Badge
              variant="outline"
              className="ml-2 animate-pulse border-primary text-primary bg-primary/10 text-[10px] h-5"
            >
              RUNNING
            </Badge>
          )}
        </div>
        <button className="p-1 hover:bg-white/10 rounded transition-colors">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </div>

      <div
        className={cn(
          'flex-1 overflow-hidden transition-opacity duration-200',
          isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
      >
        {activeTab === 'console' ? (
          <div className="h-full bg-[#252526] overflow-y-auto overflow-x-hidden p-4 font-mono text-xs space-y-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            {executionLogs.length === 0 ? (
              <div className="text-muted-foreground opacity-50 text-center py-4">
                No execution logs yet. Click "Run" on a Trigger node to start.
              </div>
            ) : (
              executionLogs.map((log, index) => (
                <div
                  key={`${log.id}-${index}`}
                  className={`flex items-start gap-3 p-2 rounded border transition-colors ${log.status === 'success'
                    ? 'bg-green-500/10 border-green-500/20 text-green-400'
                    : log.status === 'error'
                      ? 'bg-red-500/10 border-red-500/20 text-red-400'
                      : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                    }`}
                >
                  <div className="mt-0.5">
                    {log.status === 'success' ? (
                      <Check className="w-3 h-3" />
                    ) : log.status === 'error' ? (
                      <XCircle className="w-3 h-3" />
                    ) : (
                      <Clock className="w-3 h-3" />
                    )}
                  </div>
                  <div className="flex-1 flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold opacity-80">{log.nodeId}</span>
                      <span className="opacity-50 text-[10px]">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="opacity-90 whitespace-pre-wrap">
                      {log.message}
                    </div>
                    {log.data ? (
                      <pre className="mt-2 p-2 bg-background rounded overflow-hidden text-[10px] opacity-70 border border-border whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    ) : null}
                  </div>
                </div>
              ))
            )}
            {isExecuting && (
              <div className="flex items-center gap-2 p-2 text-primary animate-pulse">
                <Clock className="w-3 h-3" />
                <span>Processing...</span>
              </div>
            )}
            <div ref={logsEndRef} />
          </div>
        ) : (
          <MemoryTable className="h-full" />
        )}
      </div>
    </div>
  );
}
