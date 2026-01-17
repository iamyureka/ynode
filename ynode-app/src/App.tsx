import { useEffect, useState, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useNodeTypesStore } from './store/nodeTypesStore';
import { AuthScreen } from './components/Auth/AuthScreen';
import { NodeAssembler } from './components/NodeAssembler';
import './index.css';

const AppLayout = lazy(() =>
  import('./layouts/AppLayout').then((m) => ({ default: m.AppLayout }))
);
const Overview = lazy(() =>
  import('./pages/Dashboard/Overview').then((m) => ({ default: m.Overview }))
);
const Executions = lazy(() =>
  import('./pages/Dashboard/Executions').then((m) => ({
    default: m.Executions,
  }))
);
const ExecutionDetails = lazy(() =>
  import('./pages/Dashboard/ExecutionDetails').then((m) => ({
    default: m.ExecutionDetails,
  }))
);
const Workflows = lazy(() =>
  import('./pages/Dashboard/Workflows').then((m) => ({ default: m.Workflows }))
);
const WorkflowEditor = lazy(() =>
  import('./pages/Editor/WorkflowEditor').then((m) => ({
    default: m.WorkflowEditor,
  }))
);
const CredentialsPage = lazy(() => import('./pages/Settings/Credentials'));

const PageLoader = () => (
  <div className="h-screen w-screen flex items-center justify-center bg-zinc-950">
    <div className="flex flex-col items-center gap-4">
      <div className="h-12 w-12 rounded-xl bg-primary/20 animate-pulse flex items-center justify-center">
        <div className="h-6 w-6 bg-primary rounded-md animate-spin" />
      </div>
    </div>
  </div>
);

function App() {
  const { user, token, checkAuth } = useAuthStore();
  const fetchNodeTypes = useNodeTypesStore((state) => state.fetchNodeTypes);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const init = async () => {
      // Fetch node types from server (includes built-in + plugins)
      try {
        await fetchNodeTypes();
      } catch (error) {
        console.error('Failed to load node types:', error);
      }

      // Check authentication
      if (token) {
        await checkAuth();
      }
      setIsInitializing(false);
    };
    init();
  }, [token, checkAuth, fetchNodeTypes]);

  if (isInitializing) {
    return <PageLoader />;
  }

  return (
    <>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route
              path="/auth"
              element={!user ? <AuthScreen /> : <Navigate to="/" />}
            />

            {user ? (
              <>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Overview />} />
                  <Route path="/executions" element={<Executions />} />
                  <Route
                    path="/executions/:executionId"
                    element={<ExecutionDetails />}
                  />
                  <Route
                    path="/settings"
                    element={<Navigate to="/settings/credentials" />}
                  />
                  <Route
                    path="/settings/credentials"
                    element={<CredentialsPage />}
                  />
                  <Route path="/workflows" element={<Workflows />} />
                  <Route
                    path="/editor/:workflowId?"
                    element={<WorkflowEditor />}
                  />
                  <Route
                    path="/new-workflow"
                    element={<Navigate to="/editor" />}
                  />
                </Route>
              </>
            ) : (
              <Route path="*" element={<Navigate to="/auth" />} />
            )}
          </Routes>
        </Suspense>
      </BrowserRouter>
      <NodeAssembler />
    </>
  );
}

export default App;

