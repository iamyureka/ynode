import type Database from 'better-sqlite3';
import { registerMigration } from './index';

registerMigration({
    version: 7,
    name: 'custom_nodes',

    up: (db: Database.Database) => {
        // Main custom nodes table
        db.exec(`
      CREATE TABLE IF NOT EXISTS custom_nodes (
        id TEXT PRIMARY KEY,
        type TEXT UNIQUE NOT NULL,
        label TEXT NOT NULL,
        description TEXT,
        category TEXT DEFAULT 'custom',
        icon TEXT DEFAULT 'Puzzle',
        color TEXT DEFAULT 'brand-blue',

        inputs TEXT NOT NULL,
        outputs TEXT NOT NULL,
        config_schema TEXT,
        default_config TEXT,

        code TEXT NOT NULL,

        uses_memory INTEGER DEFAULT 0,
        uses_workflow_memory INTEGER DEFAULT 0,
        requires_network INTEGER DEFAULT 0,
        credentials TEXT,

        user_id TEXT NOT NULL,
        is_public INTEGER DEFAULT 0,
        
        current_version INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,

        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

        // Version history for custom nodes
        db.exec(`
      CREATE TABLE IF NOT EXISTS custom_node_versions (
        id TEXT PRIMARY KEY,
        custom_node_id TEXT NOT NULL,
        version INTEGER NOT NULL,

        label TEXT NOT NULL,
        description TEXT,
        inputs TEXT NOT NULL,
        outputs TEXT NOT NULL,
        config_schema TEXT,
        default_config TEXT,
        code TEXT NOT NULL,

        change_notes TEXT,
        created_at TEXT NOT NULL,

        FOREIGN KEY (custom_node_id) REFERENCES custom_nodes(id) ON DELETE CASCADE,
        UNIQUE(custom_node_id, version)
      )
    `);

        // Indexes for performance
        db.exec(`
      CREATE INDEX IF NOT EXISTS idx_custom_nodes_user_id ON custom_nodes(user_id);
      CREATE INDEX IF NOT EXISTS idx_custom_nodes_type ON custom_nodes(type);
      CREATE INDEX IF NOT EXISTS idx_custom_nodes_is_public ON custom_nodes(is_public);
      CREATE INDEX IF NOT EXISTS idx_custom_nodes_category ON custom_nodes(category);
      CREATE INDEX IF NOT EXISTS idx_custom_node_versions_node_id ON custom_node_versions(custom_node_id);
    `);
    },

    down: (db: Database.Database) => {
        db.exec(`
      DROP TABLE IF EXISTS custom_node_versions;
      DROP TABLE IF EXISTS custom_nodes;
    `);
    },
});
