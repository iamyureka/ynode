import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { config } from '../config';

import './migrations/001_initial_schema';
import './migrations/002_audit_logs';
import './migrations/003_sessions';
import './migrations/004_password_history';
import './migrations/005_credentials_memory';
import './migrations/006_custom_nodes';
import { runMigrations } from './migrations';

const dbDir = path.dirname(config.dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db: Database.Database = new Database(config.dbPath);

db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = -64000');
db.pragma('busy_timeout = 5000');

runMigrations(db);

export function getUserById(id: string) {
  return db.prepare(`SELECT * FROM users WHERE id = ?`).get(id);
}

export function getUserByEmail(email: string) {
  return db
    .prepare(`SELECT * FROM users WHERE email = ?`)
    .get(email.toLowerCase());
}

export function createUser(user: {
  id: string;
  email: string;
  password_hash: string;
  name?: string | null;
}) {
  const now = new Date().toISOString();
  return db
    .prepare(
      `
        INSERT INTO users (
            id, email, password_hash, name,
            executions_this_month, last_reset_at,
            failed_login_attempts, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 0, ?, 0, 1, ?, ?)
    `
    )
    .run(
      user.id,
      user.email.toLowerCase(),
      user.password_hash,
      user.name || null,
      now,
      now,
      now
    );
}

export function updateUser(id: string, updates: Record<string, unknown>) {
  const fields = Object.keys(updates);
  const values = Object.values(updates);

  if (fields.length === 0) return;

  const setClause = fields.map((f) => `${f} = ?`).join(', ');

  return db
    .prepare(
      `
        UPDATE users SET ${setClause}, updated_at = ? WHERE id = ?
    `
    )
    .run(...values, new Date().toISOString(), id);
}

export function incrementUserExecutions(userId: string): void {
  db.prepare(
    `
        UPDATE users SET 
            executions_this_month = executions_this_month + 1,
            updated_at = ?
        WHERE id = ?
    `
  ).run(new Date().toISOString(), userId);
}

export function resetMonthlyExecutions(): void {
  const now = new Date().toISOString();
  db.prepare(
    `
        UPDATE users SET 
            executions_this_month = 0, 
            last_reset_at = ?,
            updated_at = ?
    `
  ).run(now, now);
}

export function getWorkflowsByUserId(userId: string) {
  return db
    .prepare(
      `
        SELECT * FROM workflows 
        WHERE user_id = ?
        ORDER BY updated_at DESC
    `
    )
    .all(userId);
}

export function getWorkflowById(id: string) {
  return db
    .prepare(
      `
        SELECT * FROM workflows WHERE id = ?
    `
    )
    .get(id);
}

export function createWorkflow(workflow: {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  nodes: string;
  edges: string;
  settings?: string | null;
}) {
  const now = new Date().toISOString();
  return db
    .prepare(
      `
        INSERT INTO workflows (
            id, user_id, name, description, nodes, edges, settings,
            is_active, is_deleted, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)
    `
    )
    .run(
      workflow.id,
      workflow.user_id,
      workflow.name,
      workflow.description || null,
      workflow.nodes,
      workflow.edges,
      workflow.settings || null,
      now,
      now
    );
}

export function updateWorkflow(id: string, updates: Record<string, unknown>) {
  const fields = Object.keys(updates);
  const values = Object.values(updates);

  if (fields.length === 0) return;

  const setClause = fields.map((f) => `${f} = ?`).join(', ');

  return db
    .prepare(
      `
        UPDATE workflows SET ${setClause}, updated_at = ? WHERE id = ?
    `
    )
    .run(...values, new Date().toISOString(), id);
}

export function deleteWorkflow(id: string) {
  return db
    .prepare(
      `
        DELETE FROM workflows WHERE id = ?
    `
    )
    .run(id);
}

export function countUserWorkflows(userId: string): number {
  const result = db
    .prepare(
      `
        SELECT COUNT(*) as count FROM workflows 
        WHERE user_id = ?
    `
    )
    .get(userId) as { count: number };
  return result.count;
}

export function createExecution(execution: {
  id: string;
  workflow_id: string;
  user_id: string;
  status: string;
  trigger_type: string;
  logs?: string | null;
}) {
  return db
    .prepare(
      `
        INSERT INTO executions (
            id, workflow_id, user_id, status, trigger_type, logs, started_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    )
    .run(
      execution.id,
      execution.workflow_id,
      execution.user_id,
      execution.status,
      execution.trigger_type,
      execution.logs || null,
      new Date().toISOString()
    );
}

export function updateExecution(
  id: string,
  updates: {
    status?: string;
    logs?: string;
    error_message?: string;
    duration_ms?: number;
    completed_at?: string;
  }
) {
  const fields = Object.keys(updates);
  const values = Object.values(updates);

  if (fields.length === 0) return;

  const setClause = fields.map((f) => `${f} = ?`).join(', ');

  return db
    .prepare(
      `
        UPDATE executions SET ${setClause} WHERE id = ?
    `
    )
    .run(...values, id);
}

export function getExecutionsByWorkflowId(workflowId: string, limit = 50) {
  return db
    .prepare(
      `
        SELECT * FROM executions 
        WHERE workflow_id = ?
        ORDER BY started_at DESC
        LIMIT ?
    `
    )
    .all(workflowId, limit);
}

export function getRecentExecutionsByUserId(userId: string, limit = 50) {
  return db
    .prepare(
      `
        SELECT e.*, w.name as workflow_name
        FROM executions e
        JOIN workflows w ON e.workflow_id = w.id
        WHERE e.user_id = ?
        ORDER BY e.started_at DESC
        LIMIT ?
            `
    )
    .all(userId, limit);
}

export function getExecutionById(id: string) {
  return db.prepare(`SELECT * FROM executions WHERE id = ? `).get(id);
}

export function cleanupExpiredSessions(): number {
  const result = db
    .prepare(
      `
        DELETE FROM sessions 
        WHERE expires_at < datetime('now')
        OR(is_revoked = 1 AND revoked_at < datetime('now', '-7 days'))
            `
    )
    .run();
  return result.changes;
}

export function getWebhookByPath(workflowId: string, path: string) {
  return db
    .prepare(
      `
        SELECT * FROM webhooks 
        WHERE workflow_id = ? AND path = ? AND is_active = 1
        `
    )
    .get(workflowId, path);
}

export function createWebhook(webhook: {
  id: string;
  workflow_id: string;
  path: string;
  method?: string;
  secret_hash?: string | null;
}) {
  return db
    .prepare(
      `
        INSERT INTO webhooks(id, workflow_id, path, method, secret_hash, created_at)
        VALUES(?, ?, ?, ?, ?, ?)
            `
    )
    .run(
      webhook.id,
      webhook.workflow_id,
      webhook.path,
      webhook.method || 'POST',
      webhook.secret_hash || null,
      new Date().toISOString()
    );
}

export function updateWebhookTrigger(id: string): void {
  db.prepare(
    `
        UPDATE webhooks SET 
            last_triggered_at = ?,
        trigger_count = trigger_count + 1
        WHERE id = ?
        `
  ).run(new Date().toISOString(), id);
}

export function getActiveSchedules() {
  return db
    .prepare(
      `
        SELECT s.*, w.name as workflow_name 
        FROM schedules s
        JOIN workflows w ON s.workflow_id = w.id
        WHERE s.is_active = 1 AND w.is_deleted = 0
        `
    )
    .all();
}

export function createSchedule(schedule: {
  id: string;
  workflow_id: string;
  cron_expression: string;
  timezone?: string;
  next_run_at?: string;
}) {
  return db
    .prepare(
      `
        INSERT INTO schedules(id, workflow_id, cron_expression, timezone, next_run_at, created_at)
        VALUES(?, ?, ?, ?, ?, ?)
            `
    )
    .run(
      schedule.id,
      schedule.workflow_id,
      schedule.cron_expression,
      schedule.timezone || 'UTC',
      schedule.next_run_at || null,
      new Date().toISOString()
    );
}

export function updateScheduleRun(id: string, nextRunAt: string): void {
  db.prepare(
    `
        UPDATE schedules SET 
            last_run_at = ?,
        next_run_at = ?,
        run_count = run_count + 1
        WHERE id = ?
        `
  ).run(new Date().toISOString(), nextRunAt, id);
}

setInterval(
  () => {
    const cleaned = cleanupExpiredSessions();
    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} expired sessions`);
    }
  },
  60 * 60 * 1000
);
