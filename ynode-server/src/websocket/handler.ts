import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type {
  WsClientMessage,
  WsServerMessage,
  ExecutionLog,
  ApiWorkflow,
  WorkflowRow,
} from '../types';
import {
  createWorkflow as dbCreateWorkflow,
  updateWorkflow as dbUpdateWorkflow,
  getWorkflowById,
} from '../db';
import { v4 as uuid } from 'uuid';
import { verifyToken, validateSession } from '../middleware/auth';

const subscriptions = new Map<string, Set<WebSocket>>();

const clientSubscriptions = new Map<WebSocket, Set<string>>();

const clientUsers = new Map<WebSocket, string>();

export function setupWebSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);

    const token = url.searchParams.get('token');
    if (!token) {
      console.warn('WebSocket connection rejected: No token provided');
      ws.close(4001, 'Authentication required');
      return;
    }

    const payload = verifyToken(token);
    if (!payload) {
      console.warn('WebSocket connection rejected: Invalid token');
      ws.close(4001, 'Invalid or expired token');
      return;
    }

    const session = validateSession(token);
    if (!session) {
      console.warn('WebSocket connection rejected: Session invalid');
      ws.close(4001, 'Session invalid or expired');
      return;
    }

    console.log(`WebSocket client authenticated: ${payload.userId}`);
    clientSubscriptions.set(ws, new Set());
    clientUsers.set(ws, payload.userId);

    ws.on('message', (data: Buffer) => {
      try {
        const message: WsClientMessage = JSON.parse(data.toString());
        handleMessage(ws, message);
      } catch (error) {
        sendToClient(ws, { type: 'error', message: 'Invalid message format' });
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      cleanupClient(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      cleanupClient(ws);
    });
  });

  console.log('WebSocket server ready on /ws');
  return wss;
}

function handleMessage(ws: WebSocket, message: WsClientMessage): void {
  switch (message.type) {
    case 'subscribe':
      subscribe(ws, message.workflowId);
      break;
    case 'unsubscribe':
      unsubscribe(ws, message.workflowId);
      break;
    case 'workflow:create':
      handleWorkflowCreate(ws, message);
      break;
    case 'workflow:update':
      handleWorkflowUpdate(ws, message);
      break;
  }
}

function handleWorkflowCreate(
  ws: WebSocket,
  message: { requestId: string; name: string; nodes: any[]; edges: any[] }
): void {
  const userId = clientUsers.get(ws);

  if (!userId) {
    sendToClient(ws, {
      type: 'workflow:save_error',
      requestId: message.requestId,
      message: 'Not authenticated via WebSocket. Use HTTP endpoint.',
    });
    return;
  }

  try {
    const id = uuid();
    const now = new Date().toISOString();

    dbCreateWorkflow({
      id,
      user_id: userId,
      name: message.name,
      nodes: JSON.stringify(message.nodes),
      edges: JSON.stringify(message.edges),
    });

    const workflow: ApiWorkflow = {
      id,
      userId,
      name: message.name,
      description: null,
      nodes: message.nodes,
      edges: message.edges,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    sendToClient(ws, {
      type: 'workflow:saved',
      requestId: message.requestId,
      workflow,
      isNew: true,
    });

    console.log(`Workflow created via WS: ${id}`);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to create workflow';
    sendToClient(ws, {
      type: 'workflow:save_error',
      requestId: message.requestId,
      message: errorMessage,
    });
  }
}

function handleWorkflowUpdate(
  ws: WebSocket,
  message: {
    requestId: string;
    workflowId: string;
    name: string;
    nodes: any[];
    edges: any[];
  }
): void {
  const userId = clientUsers.get(ws);

  if (!userId) {
    sendToClient(ws, {
      type: 'workflow:save_error',
      requestId: message.requestId,
      message: 'Not authenticated via WebSocket. Use HTTP endpoint.',
    });
    return;
  }

  try {
    const existing = getWorkflowById(message.workflowId) as
      | WorkflowRow
      | undefined;

    if (!existing || existing.user_id !== userId) {
      sendToClient(ws, {
        type: 'workflow:save_error',
        requestId: message.requestId,
        message: 'Workflow not found or access denied',
      });
      return;
    }

    dbUpdateWorkflow(message.workflowId, {
      name: message.name,
      nodes: JSON.stringify(message.nodes),
      edges: JSON.stringify(message.edges),
    });

    const updated = getWorkflowById(message.workflowId) as WorkflowRow;

    const workflow: ApiWorkflow = {
      id: updated.id,
      userId: updated.user_id,
      name: updated.name,
      description: updated.description,
      nodes: JSON.parse(updated.nodes || '[]'),
      edges: JSON.parse(updated.edges || '[]'),
      isActive: updated.is_active === 1,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    };

    sendToClient(ws, {
      type: 'workflow:saved',
      requestId: message.requestId,
      workflow,
      isNew: false,
    });

    console.log(`Workflow updated via WS: ${message.workflowId}`);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to update workflow';
    sendToClient(ws, {
      type: 'workflow:save_error',
      requestId: message.requestId,
      message: errorMessage,
    });
  }
}

function subscribe(ws: WebSocket, workflowId: string): void {
  if (!subscriptions.has(workflowId)) {
    subscriptions.set(workflowId, new Set());
  }
  subscriptions.get(workflowId)!.add(ws);

  clientSubscriptions.get(ws)?.add(workflowId);

  console.log(`Client subscribed to workflow: ${workflowId}`);
}

function unsubscribe(ws: WebSocket, workflowId: string): void {
  subscriptions.get(workflowId)?.delete(ws);
  clientSubscriptions.get(ws)?.delete(workflowId);

  if (subscriptions.get(workflowId)?.size === 0) {
    subscriptions.delete(workflowId);
  }

  console.log(`Client unsubscribed from workflow: ${workflowId}`);
}

function cleanupClient(ws: WebSocket): void {
  const clientSubs = clientSubscriptions.get(ws);
  if (clientSubs) {
    for (const workflowId of clientSubs) {
      subscriptions.get(workflowId)?.delete(ws);
      if (subscriptions.get(workflowId)?.size === 0) {
        subscriptions.delete(workflowId);
      }
    }
  }
  clientSubscriptions.delete(ws);
  clientUsers.delete(ws);
}

function sendToClient(ws: WebSocket, message: WsServerMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

export function broadcastNodeStart(workflowId: string, nodeId: string): void {
  broadcast(workflowId, { type: 'node:start', workflowId, nodeId });
}

export function broadcastNodeComplete(
  workflowId: string,
  nodeId: string,
  success: boolean
): void {
  broadcast(workflowId, { type: 'node:complete', workflowId, nodeId, success });
}

export function broadcastNodeSkip(workflowId: string, nodeId: string): void {
  broadcast(workflowId, { type: 'node:skip', workflowId, nodeId });
}

export function broadcastWorkflowComplete(
  workflowId: string,
  status: 'success' | 'error'
): void {
  broadcast(workflowId, { type: 'workflow:complete', workflowId, status });
}

export function broadcastLog(workflowId: string, log: ExecutionLog): void {
  broadcast(workflowId, { type: 'log', workflowId, log });
}

function broadcast(workflowId: string, message: WsServerMessage): void {
  const clients = subscriptions.get(workflowId);
  if (!clients) return;

  const messageStr = JSON.stringify(message);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  }
}

export function getSubscriberCount(workflowId: string): number {
  return subscriptions.get(workflowId)?.size || 0;
}
