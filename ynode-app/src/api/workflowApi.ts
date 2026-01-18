import { getAuthHeaders, useAuthStore } from '../store/authStore';

const API_BASE = 'http://localhost:3001/api';

export interface User {
  id: string;
  email: string;
  executionsThisMonth: number;
  createdAt: string;
}

export interface Workflow {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  nodes: any[];
  edges: any[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExecutionLog {
  id: string;
  nodeId: string;
  nodeName: string;
  status: 'running' | 'success' | 'error';
  message: string;
  data?: unknown;
  timestamp: string;
}

export interface ExecutionResult {
  executionId: string;
  workflowId: string;
  status: 'success' | 'error' | 'running';
  logs: ExecutionLog[];
  startedAt: string;
  completedAt: string;
}

export interface Execution {
  id: string;
  workflowId: string;
  status: 'success' | 'error' | 'running';
  logs: ExecutionLog[];
  triggerType: 'manual' | 'webhook' | 'schedule';
  startedAt: string;
  completedAt: string | null;
}

class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    useAuthStore.getState().logout();
    throw new ApiError(401, 'Session expired. Please login again.');
  }

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(response.status, data.error || 'Request failed');
  }

  return data;
}

export async function fetchWorkflows(): Promise<Workflow[]> {
  const response = await fetch(`${API_BASE}/workflows`, {
    headers: { ...getAuthHeaders() },
  });
  return handleResponse<Workflow[]>(response);
}

export async function fetchWorkflow(id: string): Promise<Workflow> {
  const response = await fetch(`${API_BASE}/workflows/${id}`, {
    headers: { ...getAuthHeaders() },
  });
  return handleResponse<Workflow>(response);
}

export async function createWorkflow(
  workflow: Partial<Workflow>
): Promise<Workflow> {
  const response = await fetch(`${API_BASE}/workflows`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(workflow),
  });
  return handleResponse<Workflow>(response);
}

export async function updateWorkflow(
  id: string,
  updates: Partial<Workflow>
): Promise<Workflow> {
  const response = await fetch(`${API_BASE}/workflows/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(updates),
  });
  return handleResponse<Workflow>(response);
}

export async function deleteWorkflow(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/workflows/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });
  if (!response.ok) {
    const data = await response.json();
    throw new ApiError(
      response.status,
      data.error || 'Failed to delete workflow'
    );
  }
}

export async function runWorkflow(id: string): Promise<ExecutionResult> {
  const response = await fetch(`${API_BASE}/workflows/${id}/run`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
  });
  return handleResponse<ExecutionResult>(response);
}

export async function fetchExecutions(
  workflowId: string,
  limit = 50
): Promise<Execution[]> {
  const response = await fetch(
    `${API_BASE}/workflows/${workflowId}/executions?limit=${limit}`,
    {
      headers: { ...getAuthHeaders() },
    }
  );
  return handleResponse<Execution[]>(response);
}

export async function fetchExecution(id: string): Promise<Execution> {
  const response = await fetch(`${API_BASE}/executions/${id}`, {
    headers: { ...getAuthHeaders() },
  });
  return handleResponse<Execution>(response);
}

export async function fetchUserExecutions(
  limit = 50
): Promise<(Execution & { workflowName: string })[]> {
  const response = await fetch(`${API_BASE}/executions?limit=${limit}`, {
    headers: { ...getAuthHeaders() },
  });
  return handleResponse<(Execution & { workflowName: string })[]>(response);
}

export async function checkHealth(): Promise<{
  status: string;
  version: string;
  timestamp: string;
}> {
  const response = await fetch(`${API_BASE}/health`);
  if (!response.ok) throw new Error('Server not reachable');
  return response.json();
}

export type WsMessage =
  | { type: 'node:start'; workflowId: string; nodeId: string }
  | {
    type: 'node:complete';
    workflowId: string;
    nodeId: string;
    success: boolean;
  }
  | { type: 'node:skip'; workflowId: string; nodeId: string }
  | {
    type: 'workflow:complete';
    workflowId: string;
    status: 'success' | 'error';
  }
  | { type: 'log'; workflowId: string; log: ExecutionLog }
  | { type: 'error'; message: string }
  | { type: 'workflow:saved'; workflow: Workflow; isNew: boolean }
  | { type: 'workflow:save_error'; message: string; requestId?: string };

interface SaveRequest {
  requestId: string;
  resolve: (workflow: Workflow) => void;
  reject: (error: Error) => void;
}

export class WorkflowWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private subscribedWorkflows = new Set<string>();
  private messageHandlers = new Set<(message: WsMessage) => void>();
  private pendingSaves = new Map<string, SaveRequest>();
  private isConnected = false;

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    const token = useAuthStore.getState().token;
    if (!token) {
      console.warn('Cannot connect WebSocket: No authentication token');
      return;
    }
    const wsUrl = `ws://localhost:3001/ws?token=${encodeURIComponent(token)}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.isConnected = true;

      this.subscribedWorkflows.forEach((id) => {
        this.send({ type: 'subscribe', workflowId: id });
      });
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WsMessage;

        if (message.type === 'workflow:saved') {
          const requestId = (message as any).requestId;
          const pending = this.pendingSaves.get(requestId);
          if (pending) {
            pending.resolve(message.workflow);
            this.pendingSaves.delete(requestId);
          }
        } else if (message.type === 'workflow:save_error') {
          const requestId = message.requestId;
          if (requestId) {
            const pending = this.pendingSaves.get(requestId);
            if (pending) {
              pending.reject(new Error(message.message));
              this.pendingSaves.delete(requestId);
            }
          }
        }

        this.messageHandlers.forEach((handler) => handler(message));
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.isConnected = false;
      this.handleReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.pendingSaves.forEach((pending) => {
        pending.reject(new Error('WebSocket disconnected'));
      });
      this.pendingSaves.clear();
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(
      `Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`
    );
    setTimeout(() => this.connect(), delay);
  }

  private send(message: Record<string, unknown>): boolean {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  get connected(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }

  subscribe(workflowId: string): void {
    this.subscribedWorkflows.add(workflowId);
    this.send({ type: 'subscribe', workflowId });
  }

  unsubscribe(workflowId: string): void {
    this.subscribedWorkflows.delete(workflowId);
    this.send({ type: 'unsubscribe', workflowId });
  }

  async saveWorkflow(data: {
    id?: string | null;
    name: string;
    nodes: any[];
    edges: any[];
  }): Promise<Workflow> {
    if (!this.connected) {
      if (data.id) {
        return updateWorkflow(data.id, {
          name: data.name,
          nodes: data.nodes,
          edges: data.edges,
        });
      } else {
        return createWorkflow({
          name: data.name,
          nodes: data.nodes,
          edges: data.edges,
        });
      }
    }

    const requestId = crypto.randomUUID();

    return new Promise((resolve, reject) => {
      this.pendingSaves.set(requestId, { requestId, resolve, reject });

      const sent = this.send({
        type: data.id ? 'workflow:update' : 'workflow:create',
        requestId,
        workflowId: data.id,
        name: data.name,
        nodes: data.nodes,
        edges: data.edges,
      });

      if (!sent) {
        this.pendingSaves.delete(requestId);
        reject(new Error('Failed to send save request'));
      }

      setTimeout(() => {
        if (this.pendingSaves.has(requestId)) {
          this.pendingSaves.delete(requestId);
          reject(new Error('Save timeout'));
        }
      }, 10000);
    });
  }

  onMessage(handler: (message: WsMessage) => void): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.subscribedWorkflows.clear();
    this.messageHandlers.clear();
    this.pendingSaves.clear();
  }
}

export const workflowWs = new WorkflowWebSocket();
