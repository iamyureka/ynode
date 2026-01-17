import { db } from './index';
import { v4 as uuidv4 } from 'uuid';

// Types
export interface CustomNodeRow {
    id: string;
    type: string;
    label: string;
    description: string | null;
    category: string;
    icon: string;
    color: string | null;

    inputs: string; // JSON
    outputs: string; // JSON
    config_schema: string | null; // JSON
    default_config: string | null; // JSON

    code: string;

    uses_memory: number;
    uses_workflow_memory: number;
    requires_network: number;
    credentials: string | null; // JSON

    user_id: string;
    is_public: number;

    current_version: number;
    created_at: string;
    updated_at: string;
}

export interface CustomNodeVersionRow {
    id: string;
    custom_node_id: string;
    version: number;
    label: string;
    description: string | null;
    inputs: string;
    outputs: string;
    config_schema: string | null;
    default_config: string | null;
    code: string;
    change_notes: string | null;
    created_at: string;
}

export interface CustomNodeInput {
    type: string;
    label: string;
    description?: string;
    category?: string;
    icon?: string;
    color?: string;
    inputs: object[];
    outputs: object[];
    configSchema?: object[];
    defaultConfig?: Record<string, unknown>;
    code: string;
    usesMemory?: boolean;
    usesWorkflowMemory?: boolean;
    requiresNetwork?: boolean;
    credentials?: object[];
    isPublic?: boolean;
}

// Get all custom nodes for a user (includes public nodes from others)
export function getCustomNodesByUserId(userId: string): CustomNodeRow[] {
    return db
        .prepare(
            `
      SELECT * FROM custom_nodes 
      WHERE user_id = ? OR is_public = 1
      ORDER BY updated_at DESC
    `
        )
        .all(userId) as CustomNodeRow[];
}

// Get only user's own custom nodes
export function getUserOwnedCustomNodes(userId: string): CustomNodeRow[] {
    return db
        .prepare(
            `
      SELECT * FROM custom_nodes 
      WHERE user_id = ?
      ORDER BY updated_at DESC
    `
        )
        .all(userId) as CustomNodeRow[];
}

// Get a single custom node by ID
export function getCustomNodeById(id: string): CustomNodeRow | undefined {
    return db
        .prepare(`SELECT * FROM custom_nodes WHERE id = ?`)
        .get(id) as CustomNodeRow | undefined;
}

// Get a custom node by type
export function getCustomNodeByType(type: string): CustomNodeRow | undefined {
    return db
        .prepare(`SELECT * FROM custom_nodes WHERE type = ?`)
        .get(type) as CustomNodeRow | undefined;
}

// Check if a type is already taken
export function isCustomNodeTypeAvailable(
    type: string,
    excludeId?: string
): boolean {
    const query = excludeId
        ? `SELECT COUNT(*) as count FROM custom_nodes WHERE type = ? AND id != ?`
        : `SELECT COUNT(*) as count FROM custom_nodes WHERE type = ?`;

    const result = excludeId
        ? (db.prepare(query).get(type, excludeId) as { count: number })
        : (db.prepare(query).get(type) as { count: number });

    return result.count === 0;
}

// Create a new custom node
export function createCustomNode(
    userId: string,
    input: CustomNodeInput
): CustomNodeRow {
    const id = uuidv4();
    const now = new Date().toISOString();

    // Generate a unique type from the label if not provided
    const type =
        input.type ||
        `custom_${input.label.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;

    db.prepare(
        `
    INSERT INTO custom_nodes (
      id, type, label, description, category, icon, color,
      inputs, outputs, config_schema, default_config, code,
      uses_memory, uses_workflow_memory, requires_network, credentials,
      user_id, is_public, current_version, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `
    ).run(
        id,
        type,
        input.label,
        input.description || null,
        input.category || 'custom',
        input.icon || 'Puzzle',
        input.color || null,
        JSON.stringify(input.inputs),
        JSON.stringify(input.outputs),
        input.configSchema ? JSON.stringify(input.configSchema) : null,
        input.defaultConfig ? JSON.stringify(input.defaultConfig) : null,
        input.code,
        input.usesMemory ? 1 : 0,
        input.usesWorkflowMemory ? 1 : 0,
        input.requiresNetwork ? 1 : 0,
        input.credentials ? JSON.stringify(input.credentials) : null,
        userId,
        input.isPublic ? 1 : 0,
        now,
        now
    );

    // Create initial version
    createCustomNodeVersion(id, 1, input, 'Initial version');

    return getCustomNodeById(id)!;
}

// Update a custom node (creates a new version)
export function updateCustomNode(
    id: string,
    input: Partial<CustomNodeInput>,
    changeNotes?: string
): CustomNodeRow | undefined {
    const existing = getCustomNodeById(id);
    if (!existing) return undefined;

    const now = new Date().toISOString();
    const newVersion = existing.current_version + 1;

    // Build update statement dynamically
    const updates: string[] = ['updated_at = ?', 'current_version = ?'];
    const values: unknown[] = [now, newVersion];

    if (input.label !== undefined) {
        updates.push('label = ?');
        values.push(input.label);
    }
    if (input.description !== undefined) {
        updates.push('description = ?');
        values.push(input.description);
    }
    if (input.category !== undefined) {
        updates.push('category = ?');
        values.push(input.category);
    }
    if (input.icon !== undefined) {
        updates.push('icon = ?');
        values.push(input.icon);
    }
    if (input.color !== undefined) {
        updates.push('color = ?');
        values.push(input.color);
    }
    if (input.inputs !== undefined) {
        updates.push('inputs = ?');
        values.push(JSON.stringify(input.inputs));
    }
    if (input.outputs !== undefined) {
        updates.push('outputs = ?');
        values.push(JSON.stringify(input.outputs));
    }
    if (input.configSchema !== undefined) {
        updates.push('config_schema = ?');
        values.push(JSON.stringify(input.configSchema));
    }
    if (input.defaultConfig !== undefined) {
        updates.push('default_config = ?');
        values.push(JSON.stringify(input.defaultConfig));
    }
    if (input.code !== undefined) {
        updates.push('code = ?');
        values.push(input.code);
    }
    if (input.usesMemory !== undefined) {
        updates.push('uses_memory = ?');
        values.push(input.usesMemory ? 1 : 0);
    }
    if (input.usesWorkflowMemory !== undefined) {
        updates.push('uses_workflow_memory = ?');
        values.push(input.usesWorkflowMemory ? 1 : 0);
    }
    if (input.requiresNetwork !== undefined) {
        updates.push('requires_network = ?');
        values.push(input.requiresNetwork ? 1 : 0);
    }
    if (input.credentials !== undefined) {
        updates.push('credentials = ?');
        values.push(JSON.stringify(input.credentials));
    }
    if (input.isPublic !== undefined) {
        updates.push('is_public = ?');
        values.push(input.isPublic ? 1 : 0);
    }

    values.push(id);

    db.prepare(
        `UPDATE custom_nodes SET ${updates.join(', ')} WHERE id = ?`
    ).run(...values);

    // Merge with existing for version snapshot
    const updated = getCustomNodeById(id)!;
    createCustomNodeVersion(
        id,
        newVersion,
        {
            type: updated.type,
            label: updated.label,
            description: updated.description || undefined,
            inputs: JSON.parse(updated.inputs),
            outputs: JSON.parse(updated.outputs),
            configSchema: updated.config_schema
                ? JSON.parse(updated.config_schema)
                : undefined,
            defaultConfig: updated.default_config
                ? JSON.parse(updated.default_config)
                : undefined,
            code: updated.code,
        },
        changeNotes || `Version ${newVersion}`
    );

    return updated;
}

// Delete a custom node
export function deleteCustomNode(id: string): boolean {
    const result = db.prepare(`DELETE FROM custom_nodes WHERE id = ?`).run(id);
    return result.changes > 0;
}

// Create a version snapshot
function createCustomNodeVersion(
    customNodeId: string,
    version: number,
    input: Partial<CustomNodeInput>,
    changeNotes?: string
): void {
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(
        `
    INSERT INTO custom_node_versions (
      id, custom_node_id, version, label, description,
      inputs, outputs, config_schema, default_config, code,
      change_notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
    ).run(
        id,
        customNodeId,
        version,
        input.label || 'Untitled',
        input.description || null,
        JSON.stringify(input.inputs || []),
        JSON.stringify(input.outputs || []),
        input.configSchema ? JSON.stringify(input.configSchema) : null,
        input.defaultConfig ? JSON.stringify(input.defaultConfig) : null,
        input.code || '',
        changeNotes || null,
        now
    );
}

// Get version history for a custom node
export function getCustomNodeVersions(
    customNodeId: string
): CustomNodeVersionRow[] {
    return db
        .prepare(
            `
      SELECT * FROM custom_node_versions 
      WHERE custom_node_id = ?
      ORDER BY version DESC
    `
        )
        .all(customNodeId) as CustomNodeVersionRow[];
}

// Get a specific version
export function getCustomNodeVersion(
    customNodeId: string,
    version: number
): CustomNodeVersionRow | undefined {
    return db
        .prepare(
            `
      SELECT * FROM custom_node_versions 
      WHERE custom_node_id = ? AND version = ?
    `
        )
        .get(customNodeId, version) as CustomNodeVersionRow | undefined;
}

// Restore a previous version
export function restoreCustomNodeVersion(
    customNodeId: string,
    version: number
): CustomNodeRow | undefined {
    const versionData = getCustomNodeVersion(customNodeId, version);
    if (!versionData) return undefined;

    return updateCustomNode(
        customNodeId,
        {
            label: versionData.label,
            description: versionData.description || undefined,
            inputs: JSON.parse(versionData.inputs),
            outputs: JSON.parse(versionData.outputs),
            configSchema: versionData.config_schema
                ? JSON.parse(versionData.config_schema)
                : undefined,
            defaultConfig: versionData.default_config
                ? JSON.parse(versionData.default_config)
                : undefined,
            code: versionData.code,
        },
        `Restored from version ${version}`
    );
}

// Convert DB row to API response
export function customNodeRowToApi(row: CustomNodeRow) {
    return {
        id: row.id,
        type: row.type,
        label: row.label,
        description: row.description,
        category: row.category,
        icon: row.icon,
        color: row.color,
        inputs: JSON.parse(row.inputs),
        outputs: JSON.parse(row.outputs),
        configSchema: row.config_schema ? JSON.parse(row.config_schema) : null,
        defaultConfig: row.default_config ? JSON.parse(row.default_config) : {},
        code: row.code,
        usesMemory: row.uses_memory === 1,
        usesWorkflowMemory: row.uses_workflow_memory === 1,
        requiresNetwork: row.requires_network === 1,
        credentials: row.credentials ? JSON.parse(row.credentials) : null,
        userId: row.user_id,
        isPublic: row.is_public === 1,
        currentVersion: row.current_version,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
