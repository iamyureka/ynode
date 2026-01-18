import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import type { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import {
  auditService,
  AuditAction,
  setAuditDatabase,
} from '../services/auditService';

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  name: string | null;
  executions_this_month: number;
  last_reset_at: string;
  failed_login_attempts: number;
  locked_until: string | null;
  password_changed_at: string | null;
  must_change_password: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface ApiUser {
  id: string;
  email: string;
  name: string | null;
  executionsThisMonth: number;
  createdAt: string;
}

export interface SessionRow {
  id: string;
  user_id: string;
  token_hash: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  last_active_at: string;
  expires_at: string;
  is_revoked: number;
}

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000;
const PASSWORD_HISTORY_COUNT = 5;
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

let db: any = null;

export function setAuthDatabase(database: any): void {
  db = database;
  setAuditDatabase(database);
}

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
}

export async function verifyPassword(
  hash: string,
  password: string
): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

export function generateToken(userId: string): string {
  const options = { expiresIn: config.jwtExpiresIn } as jwt.SignOptions;
  return jwt.sign({ userId }, config.jwtSecret, options);
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, config.jwtSecret) as { userId: string };
  } catch {
    return null;
  }
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function createSession(
  userId: string,
  token: string,
  req?: Request
): string {
  const sessionId = uuidv4();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();

  db.prepare(
    `
        INSERT INTO sessions (
            id, user_id, token_hash, ip_address, user_agent,
            created_at, last_active_at, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
  ).run(
    sessionId,
    userId,
    hashToken(token),
    req ? getClientIp(req) : null,
    req?.headers['user-agent'] ?? null,
    now,
    now,
    expiresAt
  );

  return sessionId;
}

export function revokeSession(sessionId: string, reason = 'user_logout'): void {
  db.prepare(
    `
        UPDATE sessions SET 
            is_revoked = 1, 
            revoked_at = ?, 
            revoked_reason = ?
        WHERE id = ?
    `
  ).run(new Date().toISOString(), reason, sessionId);
}

export function revokeAllUserSessions(
  userId: string,
  reason = 'security'
): number {
  const result = db
    .prepare(
      `
        UPDATE sessions SET 
            is_revoked = 1, 
            revoked_at = ?, 
            revoked_reason = ?
        WHERE user_id = ? AND is_revoked = 0
    `
    )
    .run(new Date().toISOString(), reason, userId);

  return result.changes;
}

export function getUserSessions(userId: string): SessionRow[] {
  return db
    .prepare(
      `
        SELECT * FROM sessions 
        WHERE user_id = ? AND is_revoked = 0 AND expires_at > datetime('now')
        ORDER BY last_active_at DESC
    `
    )
    .all(userId);
}

export function validateSession(token: string): SessionRow | null {
  const tokenHash = hashToken(token);
  return db
    .prepare(
      `
        SELECT * FROM sessions 
        WHERE token_hash = ? 
        AND is_revoked = 0 
        AND expires_at > datetime('now')
    `
    )
    .get(tokenHash);
}

function updateSessionActivity(sessionId: string): void {
  db.prepare(
    `
        UPDATE sessions SET last_active_at = ? WHERE id = ?
    `
  ).run(new Date().toISOString(), sessionId);
}

function isAccountLocked(user: UserRow): boolean {
  if (!user.locked_until) return false;
  return new Date(user.locked_until) > new Date();
}

function incrementFailedAttempts(userId: string): void {
  const user = db
    .prepare(`SELECT failed_login_attempts FROM users WHERE id = ?`)
    .get(userId) as UserRow;
  const newCount = (user?.failed_login_attempts || 0) + 1;

  if (newCount >= LOCKOUT_THRESHOLD) {
    const lockUntil = new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString();
    db.prepare(
      `
            UPDATE users SET 
                failed_login_attempts = ?, 
                locked_until = ?,
                updated_at = ?
            WHERE id = ?
        `
    ).run(newCount, lockUntil, new Date().toISOString(), userId);

    auditService.log(AuditAction.ACCOUNT_LOCKED, { userId });
  } else {
    db.prepare(
      `
            UPDATE users SET 
                failed_login_attempts = ?,
                updated_at = ?
            WHERE id = ?
        `
    ).run(newCount, new Date().toISOString(), userId);
  }
}

function resetFailedAttempts(userId: string): void {
  db.prepare(
    `
        UPDATE users SET 
            failed_login_attempts = 0, 
            locked_until = NULL,
            updated_at = ?
        WHERE id = ?
    `
  ).run(new Date().toISOString(), userId);
}

async function isPasswordReused(
  userId: string,
  password: string
): Promise<boolean> {
  const history = db
    .prepare(
      `
        SELECT password_hash FROM password_history 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT ?
    `
    )
    .all(userId, PASSWORD_HISTORY_COUNT) as { password_hash: string }[];

  for (const entry of history) {
    if (await argon2.verify(entry.password_hash, password)) {
      return true;
    }
  }
  return false;
}

function addPasswordToHistory(userId: string, passwordHash: string): void {
  db.prepare(
    `
        INSERT INTO password_history (id, user_id, password_hash, created_at)
        VALUES (?, ?, ?, ?)
    `
  ).run(uuidv4(), userId, passwordHash, new Date().toISOString());

  db.prepare(
    `
        DELETE FROM password_history 
        WHERE user_id = ? AND id NOT IN (
            SELECT id FROM password_history 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT ?
        )
    `
  ).run(userId, userId, PASSWORD_HISTORY_COUNT);
}

function rowToApiUser(row: UserRow): ApiUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    executionsThisMonth: row.executions_this_month,
    createdAt: row.created_at,
  };
}

export async function registerUser(
  email: string,
  password: string,
  name?: string,
  req?: Request
): Promise<{ user: ApiUser; token: string }> {
  const existing = db
    .prepare(`SELECT id FROM users WHERE email = ?`)
    .get(email);
  if (existing) {
    throw new Error('Email already registered');
  }

  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();
  const userId = uuidv4();

  db.prepare(
    `
        INSERT INTO users (
            id, email, password_hash, name,
            executions_this_month, last_reset_at, 
            failed_login_attempts, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 0, ?, 0, 1, ?, ?)
    `
  ).run(userId, email.toLowerCase(), passwordHash, name || null, now, now, now);

  addPasswordToHistory(userId, passwordHash);

  const token = generateToken(userId);
  createSession(userId, token, req);

  auditService.log(AuditAction.REGISTER, { userId, req });

  const user = db
    .prepare(`SELECT * FROM users WHERE id = ?`)
    .get(userId) as UserRow;
  return { user: rowToApiUser(user), token };
}

export async function loginUser(
  email: string,
  password: string,
  req?: Request
): Promise<{ user: ApiUser; token: string }> {
  const user = db
    .prepare(`SELECT * FROM users WHERE email = ?`)
    .get(email.toLowerCase()) as UserRow | undefined;

  if (!user) {
    auditService.log(AuditAction.LOGIN_FAILED, {
      req,
      errorMessage: 'User not found',
      metadata: { email },
    });
    throw new Error('Invalid email or password');
  }

  if (isAccountLocked(user)) {
    const lockUntil = new Date(user.locked_until!);
    const minutesRemaining = Math.ceil(
      (lockUntil.getTime() - Date.now()) / 60000
    );

    auditService.log(AuditAction.LOGIN_FAILED, {
      userId: user.id,
      req,
      errorMessage: 'Account locked',
    });
    throw new Error(
      `Account locked. Try again in ${minutesRemaining} minutes.`
    );
  }

  if (!user.is_active) {
    auditService.log(AuditAction.LOGIN_FAILED, {
      userId: user.id,
      req,
      errorMessage: 'Account disabled',
    });
    throw new Error('Account has been disabled');
  }

  const valid = await verifyPassword(user.password_hash, password);

  if (!valid) {
    incrementFailedAttempts(user.id);
    auditService.log(AuditAction.LOGIN_FAILED, { userId: user.id, req });
    throw new Error('Invalid email or password');
  }

  resetFailedAttempts(user.id);

  const token = generateToken(user.id);
  createSession(user.id, token, req);

  auditService.log(AuditAction.LOGIN_SUCCESS, { userId: user.id, req });

  return { user: rowToApiUser(user), token };
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
  req?: Request
): Promise<void> {
  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId) as
    | UserRow
    | undefined;

  if (!user) {
    throw new Error('User not found');
  }

  const valid = await verifyPassword(user.password_hash, currentPassword);
  if (!valid) {
    throw new Error('Current password is incorrect');
  }

  if (await isPasswordReused(userId, newPassword)) {
    throw new Error(
      `Cannot reuse any of your last ${PASSWORD_HISTORY_COUNT} passwords`
    );
  }

  const passwordHash = await hashPassword(newPassword);
  const now = new Date().toISOString();

  db.prepare(
    `
        UPDATE users SET 
            password_hash = ?, 
            password_changed_at = ?,
            must_change_password = 0,
            updated_at = ?
        WHERE id = ?
    `
  ).run(passwordHash, now, now, userId);

  addPasswordToHistory(userId, passwordHash);

  revokeAllUserSessions(userId, 'password_changed');

  auditService.log(AuditAction.PASSWORD_CHANGED, { userId, req });
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);

  if (!decoded) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  const session = validateSession(token);
  if (!session) {
    res.status(401).json({ error: 'Session expired or revoked' });
    return;
  }

  const user = db
    .prepare(
      `
        SELECT * FROM users WHERE id = ? AND is_active = 1
    `
    )
    .get(decoded.userId) as UserRow | undefined;

  if (!user) {
    res.status(401).json({ error: 'User not found or inactive' });
    return;
  }

  updateSessionActivity(session.id);

  req.userId = user.id;
  req.user = rowToApiUser(user);
  req.sessionId = session.id;

  next();
}

export function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);

  if (decoded) {
    const user = db
      .prepare(
        `
            SELECT * FROM users WHERE id = ? AND is_active = 1
        `
      )
      .get(decoded.userId) as UserRow | undefined;

    if (user) {
      req.userId = user.id;
      req.user = rowToApiUser(user);
    }
  }

  next();
}

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: ApiUser;
      sessionId?: string;
    }
  }
}
