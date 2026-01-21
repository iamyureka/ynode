import type {
  NodeTypesResponse,
  SerializedNodeDefinition,
  CategoryMetadata,
} from '../types/nodeTypes';
import { getAuthHeaders } from '../store/authStore';

const API_BASE = 'http://localhost:3001/api';

// Cache for node types - disabled during development
let nodeTypesCache: NodeTypesResponse | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 0; // Disabled

/**
 * Fetch all available node types from the server.
 * This includes built-in nodes and any loaded community plugins.
 * If authenticated, also includes user's custom nodes.
 */
export async function fetchNodeTypes(
  forceRefresh = false
): Promise<NodeTypesResponse> {
  const now = Date.now();

  // Return cached data if valid
  if (!forceRefresh && nodeTypesCache && now - cacheTimestamp < CACHE_TTL) {
    return nodeTypesCache;
  }

  const response = await fetch(`${API_BASE}/node-types`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch node types');
  }

  const data = (await response.json()) as NodeTypesResponse;

  // Update cache
  nodeTypesCache = data;
  cacheTimestamp = now;

  return data;
}

/**
 * Get a specific node definition by type
 */
export function getNodeDefinition(
  type: string
): SerializedNodeDefinition | undefined {
  if (!nodeTypesCache) return undefined;
  return nodeTypesCache.nodes.find((node) => node.type === type);
}

/**
 * Get all node definitions
 */
export function getAllNodeDefinitions(): SerializedNodeDefinition[] {
  return nodeTypesCache?.nodes || [];
}

/**
 * Get category metadata
 */
export function getCategoryMetadata(): Record<string, CategoryMetadata> {
  return nodeTypesCache?.categories || {};
}

/**
 * Check if node types are loaded
 */
export function hasNodeTypes(): boolean {
  return nodeTypesCache !== null;
}

/**
 * Clear the node types cache
 */
export function clearNodeTypesCache(): void {
  nodeTypesCache = null;
  cacheTimestamp = 0;
}
