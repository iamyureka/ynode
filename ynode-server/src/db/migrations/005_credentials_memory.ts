import { registerMigration } from './index';

registerMigration({
  version: 6,
  name: 'credentials_and_memory',
  up: (db) => {
    db.exec(`
            CREATE TABLE IF NOT EXISTS credentials (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                encrypted_data TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_credentials_user_id ON credentials(user_id);
            CREATE INDEX IF NOT EXISTS idx_credentials_type ON credentials(type);

            CREATE TABLE IF NOT EXISTS workflow_memory (
                id TEXT PRIMARY KEY,
                workflow_id TEXT NOT NULL,
                node_id TEXT,
                key TEXT NOT NULL,
                value TEXT NOT NULL,
                expires_at TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
            );

            CREATE UNIQUE INDEX IF NOT EXISTS idx_memory_unique 
                ON workflow_memory(workflow_id, COALESCE(node_id, ''), key);
            CREATE INDEX IF NOT EXISTS idx_memory_workflow ON workflow_memory(workflow_id);
            CREATE INDEX IF NOT EXISTS idx_memory_expires ON workflow_memory(expires_at);
        `);
  },
  down: (db) => {
    db.exec(`
            DROP TABLE IF EXISTS workflow_memory;
            DROP TABLE IF EXISTS credentials;
        `);
  },
});
