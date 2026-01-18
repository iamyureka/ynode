import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';

export const PASSWORD_POLICY = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: false,
  maxLength: 128,
};

const passwordSchema = z
  .string()
  .min(
    PASSWORD_POLICY.minLength,
    `Password must be at least ${PASSWORD_POLICY.minLength} characters`
  )
  .max(
    PASSWORD_POLICY.maxLength,
    `Password must be at most ${PASSWORD_POLICY.maxLength} characters`
  )
  .refine(
    (val) => !PASSWORD_POLICY.requireUppercase || /[A-Z]/.test(val),
    'Password must contain at least one uppercase letter'
  )
  .refine(
    (val) => !PASSWORD_POLICY.requireLowercase || /[a-z]/.test(val),
    'Password must contain at least one lowercase letter'
  )
  .refine(
    (val) => !PASSWORD_POLICY.requireNumber || /[0-9]/.test(val),
    'Password must contain at least one number'
  );

export const registerSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .max(255, 'Email too long')
    .toLowerCase()
    .trim(),
  password: passwordSchema,
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name too long')
    .trim()
    .optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: passwordSchema,
});

const positionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

const nodeSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  position: positionSchema,
  data: z.record(z.any()).optional(),
});

const edgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  sourceHandle: z.string().optional().nullable(),
  targetHandle: z.string().optional().nullable(),
  type: z.string().optional(),
});

export const workflowSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').trim(),
  description: z
    .string()
    .max(1000, 'Description too long')
    .optional()
    .nullable(),
  nodes: z.array(nodeSchema).max(100, 'Too many nodes (max 100)'),
  edges: z.array(edgeSchema).max(200, 'Too many edges (max 200)'),
  settings: z
    .object({
      timeout: z.number().min(1000).max(3600000).optional(),
      retryAttempts: z.number().min(0).max(5).optional(),
    })
    .optional(),
});

export const updateWorkflowSchema = workflowSchema.partial();

const scopeEnum = z.enum([
  'workflows:read',
  'workflows:write',
  'workflows:execute',
  'workflows:delete',
  'executions:read',
  'webhooks:manage',
]);

export const createApiKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').trim(),
  scopes: z.array(scopeEnum).min(1, 'At least one scope is required'),
  expiresIn: z.enum(['30d', '90d', '1y', 'never']).optional(),
});

export const webhookSchema = z.object({
  path: z
    .string()
    .min(1, 'Path is required')
    .max(200, 'Path too long')
    .regex(/^[a-zA-Z0-9\-_\/]+$/, 'Path contains invalid characters'),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).optional(),
});

const cronRegex =
  /^(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)$/;

export const scheduleSchema = z.object({
  cronExpression: z.string().regex(cronRegex, 'Invalid cron expression'),
  timezone: z.string().max(50).optional().default('UTC'),
});

export function validate<T extends z.ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = schema.safeParse(req.body);

      if (!result.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: result.error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
        return;
      }

      req.body = result.data;
      next();
    } catch (error) {
      res.status(400).json({ error: 'Invalid request body' });
    }
  };
}

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export function validateQuery<T extends z.ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = schema.safeParse(req.query);

      if (!result.success) {
        res.status(400).json({
          error: 'Invalid query parameters',
          details: result.error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
        return;
      }

      req.query = result.data as any;
      next();
    } catch (error) {
      res.status(400).json({ error: 'Invalid query parameters' });
    }
  };
}
