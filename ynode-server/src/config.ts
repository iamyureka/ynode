const getJwtSecret = (): string => {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable must be set in prod');
  }

  return 'ynode-dev-secret';
};

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || 'localhost',

  jwtSecret: getJwtSecret(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  dbPath: process.env.DB_PATH || './data/ynode.db',

  corsOrigins: process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:5173',
    'http://localhost:4173',
  ],

  nodeExecutionDelayMs: 100,
};

export type Config = typeof config;
