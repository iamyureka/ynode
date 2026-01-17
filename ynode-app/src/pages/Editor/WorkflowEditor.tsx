import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Canvas } from '../../components/Canvas/Canvas';
import { NodeConfig } from '../../components/NodeConfig/NodeConfig';
import { ExecutionPanel } from '../../components/ExecutionPanel/ExecutionPanel';
import { MobileNodePalette } from '../../components/Sidebar/MobileNodePalette';
import { MobileNodeConfig } from '../../components/NodeConfig/MobileNodeConfig';
import { useWorkflowStore } from '../../store/workflowStore';
import { useWorkflowDataStore } from '../../store/workflowDataStore';
import { useAuthStore } from '../../store/authStore';
import { useAutosave } from '../../hooks/useAutosave';
import { setGlobalOnRun } from '../../components/nodes/CustomNodes';
import {
  workflowWs,
  createWorkflow,
  updateWorkflow,
  runWorkflow,
  fetchWorkflow,
} from '../../api/workflowApi';
import type { WsMessage } from '../../api/workflowApi';
import {
  Loader2,
  Cloud,
  Trash2,
  Zap,
  LayoutDashboard,
  Plus,
  Puzzle,
} from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';
import { useCustomNodesStore } from '../../store/customNodesStore';

export function WorkflowEditor() {
  const { workflowId: urlWorkflowId } = useParams<{ workflowId?: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMobileNodes, setShowMobileNodes] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const addExecutionLog = useWorkflowStore((state) => state.addExecutionLog);
  const clearExecutionLogs = useWorkflowStore(
    (state) => state.clearExecutionLogs
  );
  const setIsExecuting = useWorkflowStore((state) => state.setIsExecuting);
  const setNodeExecutionState = useWorkflowStore(
    (state) => state.setNodeExecutionState
  );
  const setCurrentExecutingNode = useWorkflowStore(
    (state) => state.setCurrentExecutingNode
  );
  const clearExecutionStates = useWorkflowStore(
    (state) => state.clearExecutionStates
  );
  const setWorkflowId = useWorkflowStore((state) => state.setWorkflowId);
  const loadFromServer = useWorkflowStore((state) => state.loadFromServer);
  const clearWorkflow = useWorkflowStore((state) => state.clearWorkflow);
  const currentWorkflowId = useWorkflowStore((state) => state.workflowId);
  const selectedNode = useWorkflowStore((state) => state.selectedNode);
  const workflowName = useWorkflowStore((state) => state.workflowName);
  const setWorkflowName = useWorkflowStore((state) => state.setWorkflowName);
  const saveStatus = useWorkflowStore((state) => state.saveStatus);
  const saveError = useWorkflowStore((state) => state.saveError);

  const invalidateWorkflows = useWorkflowDataStore(
    (state) => state.invalidateWorkflows
  );

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useAutosave();

  useEffect(() => {
    if (urlWorkflowId && urlWorkflowId !== currentWorkflowId) {
      loadWorkflowFromServer(urlWorkflowId);
    } else if (!urlWorkflowId && currentWorkflowId) {
      clearWorkflow();
    }
  }, [urlWorkflowId]);

  const loadWorkflowFromServer = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const workflow = await fetchWorkflow(id);
      loadFromServer({
        id: workflow.id,
        name: workflow.name,
        nodes: workflow.nodes || [],
        edges: workflow.edges || [],
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load workflow';
      setError(message);
      console.error('Failed to load workflow:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      invalidateWorkflows();
    };
  }, []);

  useEffect(() => {
    if (user) {
      workflowWs.connect();

      const unsubscribe = workflowWs.onMessage((message: WsMessage) => {
        switch (message.type) {
          case 'node:start':
            setCurrentExecutingNode(message.nodeId);
            setNodeExecutionState(message.nodeId, 'running');
            break;
          case 'node:complete':
            setNodeExecutionState(
              message.nodeId,
              message.success ? 'success' : 'error'
            );
            break;
          case 'node:skip':
            setNodeExecutionState(message.nodeId, 'skipped');
            break;
          case 'log':
            addExecutionLog(message.log);
            break;
          case 'workflow:complete':
            setIsExecuting(false);
            setCurrentExecutingNode(null);
            break;
        }
      });

      return () => {
        unsubscribe();
        workflowWs.disconnect();
      };
    }
  }, [user]);

  const handleRun = async () => {
    const { nodes, edges, workflowName, workflowId } =
      useWorkflowStore.getState();

    clearExecutionLogs();
    clearExecutionStates();
    setIsExecuting(true);

    try {
      let currentId = workflowId;

      if (!currentId) {
        const workflow = await createWorkflow({
          name: workflowName,
          nodes,
          edges,
        });
        currentId = workflow.id;
        setWorkflowId(workflow.id);
      } else {
        await updateWorkflow(currentId, {
          name: workflowName,
          nodes,
          edges,
        });
      }

      workflowWs.subscribe(currentId);
      const result = await runWorkflow(currentId);

      const currentLogs = useWorkflowStore.getState().executionLogs;
      if (result.logs?.length > 0 && currentLogs.length === 0) {
        result.logs.forEach((log) => {
          addExecutionLog(log);
        });
      }

      workflowWs.unsubscribe(currentId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Execution failed';
      addExecutionLog({
        id: crypto.randomUUID(),
        nodeId: 'system',
        nodeName: 'System',
        status: 'error',
        message: `Server error: ${message}`,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsExecuting(false);
      setCurrentExecutingNode(null);
    }
  };

  useEffect(() => {
    setGlobalOnRun(handleRun);
  }, [user]);

  const handleClear = () => {
    clearWorkflow();
    navigate('/editor');
  };

  const isSaving = saveStatus === 'saving';
  const hasError = saveStatus === 'error';
  const isSynced = currentWorkflowId !== null;

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading workflow...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center p-6">
          <div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-semibold text-white">
            Failed to load workflow
          </h2>
          <p className="text-muted-foreground max-w-md">{error}</p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="h-full w-full flex flex-col bg-background text-foreground overflow-hidden">
        <header className="h-14 border-b border-white/5 bg-black/80 backdrop-blur-xl flex items-center justify-between px-4 z-50 shrink-0">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center">
              <Zap className="h-3.5 w-3.5 text-white fill-white" />
            </div>
          </Link>
          <span className="text-sm font-medium text-white truncate max-w-[150px]">
            {workflowName}
          </span>
          <div className="w-7" />
        </header>

        <main className="flex-1 relative min-h-0">
          <Canvas />
          <ExecutionPanel />

          <button
            onClick={() => setShowMobileNodes(true)}
            className="absolute bottom-24 right-4 h-14 w-14 rounded-full bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 flex items-center justify-center z-30 active:scale-95 transition-transform"
          >
            <Plus className="w-6 h-6" />
          </button>
        </main>

        <MobileNodePalette
          isOpen={showMobileNodes}
          onClose={() => setShowMobileNodes(false)}
        />

        {selectedNode && <MobileNodeConfig />}
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-background text-foreground overflow-hidden">
      <header className="h-12 border-b border-white/10 bg-zinc-900 backdrop-blur-xl flex items-center justify-between px-4 z-20 shrink-0">
        <div className="flex items-center gap-1">
          <Link
            to="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <img
              src="/ynode_white.svg"
              alt="Ynode Logo"
              className="w-10 h-10 select-none"
              draggable={false}
            />
          </Link>

          <div className="h-5 w-px bg-white/10" />

          <Input
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            placeholder="Workflow Name"
            className="w-48 bg-transparent border-transparent hover:border-white/10 focus:border-white/20 transition-all h-8 text-sm"
          />

          <div
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors',
              hasError
                ? 'text-red-400'
                : isSynced
                  ? 'text-green-400'
                  : 'text-zinc-500'
            )}
            title={
              hasError
                ? saveError || 'Save failed'
                : isSaving
                  ? 'Saving...'
                  : isSynced
                    ? 'Synced to cloud'
                    : 'Not saved'
            }
          >
            <Cloud className={cn('w-3.5 h-3.5', isSaving && 'animate-pulse')} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="text-muted-foreground hover:text-red-400 h-8 text-xs"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            New
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => useCustomNodesStore.getState().openModal()}
            className="text-zinc-400 hover:text-white h-8 text-xs hover:bg-purple-500/10"
          >
            <Puzzle className="w-3.5 h-3.5 mr-1.5" />
            Node Assembler
          </Button>

          <Link to="/">
            <Button
              variant="ghost"
              size="sm"
              className="text-zinc-400 hover:text-white h-8 text-xs"
            >
              <LayoutDashboard className="w-3.5 h-3.5 mr-1.5" />
              Dashboard
            </Button>
          </Link>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        <main className="flex-1 relative flex flex-col min-w-0">
          <Canvas />
          <ExecutionPanel />
        </main>
        <NodeConfig />
      </div>
    </div>
  );
}
