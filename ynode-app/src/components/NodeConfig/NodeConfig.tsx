import { useState, useMemo, type DragEvent } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import { useNodeTypesStore } from '../../store/nodeTypesStore';
import { Card, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { nodeRegistry, CategoryMeta } from '@ynode/core';
import type { NodeCategory } from '@ynode/core';
import { Badge } from '../ui/badge';
import { DynamicConfigPanel, hasCustomConfigPanel } from './DynamicConfigPanel';
import {
  Search,
  ChevronRight,
  ArrowLeft,
  Zap,
  Globe,
  Split,
  Play,
  GitBranch,
  Shuffle,
  Plug,
  GripVertical,
  Brain,
  MessageSquare,
  Database,
  Send,
  Sparkles,
  Type,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../../lib/utils';

const iconMap: Record<string, LucideIcon> = {
  Zap,
  Globe,
  Split,
  Play,
  GitBranch,
  Shuffle,
  Plug,
  Brain,
  MessageSquare,
  Database,
  Send,
  Sparkles,
  Type,
};

export const NodeConfig = () => {
  const selectedNode = useWorkflowStore((state) => state.selectedNode);
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const updateNodeConfig = useWorkflowStore((state) => state.updateNodeConfig);
  const addNode = useWorkflowStore((state) => state.addNode);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<NodeCategory | null>(
    null
  );

  // Use store nodes (includes integration nodes from server)
  const storeNodes = useNodeTypesStore((state) => state.nodes);
  const categories = Object.keys(CategoryMeta) as NodeCategory[];

  const nodeTypes = useMemo(
    () =>
      storeNodes.map((def) => ({
        type: def.type,
        label: def.label,
        description: def.description || '',
        icon: iconMap[def.icon] || Zap,
        color: def.color || 'zinc-500',
        category: def.category,
      })),
    [storeNodes]
  );

  const filteredNodes = useMemo(() => {
    if (!searchQuery.trim()) return nodeTypes;
    const query = searchQuery.toLowerCase();
    return nodeTypes.filter(
      (node) =>
        node.label.toLowerCase().includes(query) ||
        (node.description || '').toLowerCase().includes(query)
    );
  }, [nodeTypes, searchQuery]);

  const categoryNodes = useMemo(() => {
    if (!selectedCategory) return [];
    return nodeTypes.filter((n) => n.category === selectedCategory);
  }, [selectedCategory, nodeTypes]);

  const handleAddNode = (nodeType: string) => {
    const centerX = window.innerWidth / 2 - 100;
    const centerY = window.innerHeight / 2 - 50;
    addNode(nodeType, { x: centerX, y: centerY });
  };

  const onDragStart = (event: DragEvent<HTMLDivElement>, nodeType: string) => {
    event.dataTransfer.setData('application/ynodeType', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleBack = () => {
    setSelectedCategory(null);
  };

  if (!selectedNode) {
    return (
      <div className="w-80 border-l border-border bg-[#252526] flex flex-col h-full shadow-xl">
        <div className="p-4 border-b border-border/50 shrink-0">
          <div className="flex items-center justify-between mb-3">
            {selectedCategory ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBack}
                  className="p-1 -ml-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    {CategoryMeta[selectedCategory].label}
                  </h2>
                </div>
              </div>
            ) : (
              <div>
                <h2 className="text-sm font-semibold text-white">Add Nodes</h2>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Drag onto canvas or click to add
                </p>
              </div>
            )}
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-background border border-border rounded-md text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {searchQuery.trim() && (
            <div className="space-y-1">
              {filteredNodes.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground text-xs">No nodes found</p>
                </div>
              ) : (
                filteredNodes.map((node) => (
                  <NodePaletteItem
                    key={node.type}
                    node={node}
                    onDragStart={onDragStart}
                    onClick={() => handleAddNode(node.type)}
                  />
                ))
              )}
            </div>
          )}

          {!searchQuery.trim() && !selectedCategory && (
            <div className="space-y-1">
              {categories.map((category) => {
                const meta = CategoryMeta[category];
                const CategoryIcon = iconMap[meta.icon] || Zap;
                const nodeCount = nodeTypes.filter(
                  (n) => n.category === category
                ).length;

                if (nodeCount === 0) return null;

                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-secondary/50 transition-all group text-left"
                  >
                    <div className="p-2 rounded-md bg-background border border-border/40 text-muted-foreground group-hover:text-primary group-hover:border-primary/40 transition-colors">
                      <CategoryIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground text-xs">
                        {meta.label}
                      </h3>
                      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                        {meta.description}
                      </p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
                  </button>
                );
              })}
            </div>
          )}

          {!searchQuery.trim() && selectedCategory && (
            <div className="space-y-1">
              {categoryNodes.map((node) => (
                <NodePaletteItem
                  key={node.type}
                  node={node}
                  onDragStart={onDragStart}
                  onClick={() => handleAddNode(node.type)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Get definition from store (dynamic) or fallback to registry (builtin)
  const storeDefinition = storeNodes.find((n) => n.type === selectedNode.type);
  const definition =
    storeDefinition || nodeRegistry.get(selectedNode.type || '');
  const config = selectedNode.data.config as Record<string, unknown>;

  const handleConfigChange = (key: string, value: unknown) => {
    updateNodeConfig(selectedNode.id, { [key]: value });
  };

  return (
    <div className="w-80 border-l border-border bg-sidebar flex flex-col h-full shadow-xl">
      <Card className="rounded-none border-0 border-b border-border bg-sidebar">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">{selectedNode.data.label}</CardTitle>
            {definition && (
              <Badge variant="outline" className="text-[10px]">
                {definition.category}
              </Badge>
            )}
          </div>
          {definition && (
            <CardDescription className="text-xs">
              {definition.description}
            </CardDescription>
          )}
        </CardHeader>
      </Card>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="space-y-2">
          <Label>Label</Label>
          <Input
            value={selectedNode.data.label}
            onChange={(e) =>
              updateNodeData(selectedNode.id, { label: e.target.value })
            }
            className="bg-background border-border"
          />
        </div>

        {definition &&
          (definition.inputs.length > 0 || definition.outputs.length > 0) && (
            <div className="space-y-3">
              {definition.inputs.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">
                    Inputs
                  </Label>
                  <div className="flex flex-wrap gap-1">
                    {definition.inputs.map((port) => (
                      <Badge
                        key={port.id}
                        variant="secondary"
                        className="text-[10px] bg-blue-500/10 text-blue-400"
                      >
                        {port.label}
                        {port.required && (
                          <span className="text-red-400 ml-0.5">*</span>
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {definition.outputs.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">
                    Outputs
                  </Label>
                  <div className="flex flex-wrap gap-1">
                    {definition.outputs.map((port) => (
                      <Badge
                        key={port.id}
                        variant="secondary"
                        className="text-[10px] bg-green-500/10 text-green-400"
                      >
                        {port.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        {selectedNode.type === 'httpRequest' &&
          (() => {
            const method = (config.method as string) || 'GET';
            const hasBody = ['POST', 'PUT', 'PATCH'].includes(method);

            return (
              <>
                <div className="space-y-2">
                  <Label>Method</Label>
                  <Select
                    value={method}
                    onValueChange={(value) =>
                      handleConfigChange('method', value)
                    }
                  >
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue placeholder="Select Method" />
                    </SelectTrigger>
                    <SelectContent className="bg-sidebar border-border">
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                      <SelectItem value="PATCH">PATCH</SelectItem>
                      <SelectItem value="DELETE">DELETE</SelectItem>
                      <SelectItem value="HEAD">HEAD</SelectItem>
                      <SelectItem value="OPTIONS">OPTIONS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>URL</Label>
                  <Input
                    value={(config.url as string) || ''}
                    onChange={(e) => handleConfigChange('url', e.target.value)}
                    placeholder="https://api.example.com/endpoint"
                    className="bg-background border-border font-mono text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Use{' '}
                    <code className="bg-secondary px-1 rounded">
                      {'{{data.field}}'}
                    </code>{' '}
                    for dynamic values
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Headers (JSON)</Label>
                  <textarea
                    value={(config.headers as string) || '{\n  \n}'}
                    onChange={(e) =>
                      handleConfigChange('headers', e.target.value)
                    }
                    placeholder='{\n  "Authorization": "Bearer token",\n  "X-Custom-Header": "value"\n}'
                    className="w-full h-24 bg-background border border-border rounded-md p-2 font-mono text-xs text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring outline-none focus:border-ring transition-all"
                  />
                </div>

                {!hasBody && (
                  <div className="space-y-2">
                    <Label>Query Parameters (JSON)</Label>
                    <textarea
                      value={(config.queryParams as string) || '{\n  \n}'}
                      onChange={(e) =>
                        handleConfigChange('queryParams', e.target.value)
                      }
                      placeholder='{\n  "page": 1,\n  "limit": 10\n}'
                      className="w-full h-20 bg-background border border-border rounded-md p-2 font-mono text-xs text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring outline-none focus:border-ring transition-all"
                    />
                  </div>
                )}

                {hasBody && (
                  <>
                    <div className="space-y-2">
                      <Label>Content-Type</Label>
                      <Select
                        value={
                          (config.contentType as string) || 'application/json'
                        }
                        onValueChange={(value) =>
                          handleConfigChange('contentType', value)
                        }
                      >
                        <SelectTrigger className="bg-background border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-sidebar border-border">
                          <SelectItem value="application/json">
                            application/json
                          </SelectItem>
                          <SelectItem value="application/x-www-form-urlencoded">
                            application/x-www-form-urlencoded
                          </SelectItem>
                          <SelectItem value="multipart/form-data">
                            multipart/form-data
                          </SelectItem>
                          <SelectItem value="text/plain">text/plain</SelectItem>
                          <SelectItem value="text/xml">text/xml</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Request Body</Label>
                      <textarea
                        value={(config.body as string) || ''}
                        onChange={(e) =>
                          handleConfigChange('body', e.target.value)
                        }
                        placeholder='{\n  "key": "value"\n}'
                        className="w-full h-32 bg-background border border-border rounded-md p-2 font-mono text-xs text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring outline-none focus:border-ring transition-all"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Use{' '}
                        <code className="bg-secondary px-1 rounded">
                          {'{{data.field}}'}
                        </code>{' '}
                        to include data from previous nodes
                      </p>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label>Authentication</Label>
                  <Select
                    value={(config.authType as string) || 'none'}
                    onValueChange={(value) =>
                      handleConfigChange('authType', value)
                    }
                  >
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-sidebar border-border">
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="bearer">Bearer Token</SelectItem>
                      <SelectItem value="basic">Basic Auth</SelectItem>
                      <SelectItem value="apiKey">API Key</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {config.authType === 'bearer' && (
                  <div className="space-y-2">
                    <Label>Bearer Token</Label>
                    <Input
                      type="password"
                      value={(config.bearerToken as string) || ''}
                      onChange={(e) =>
                        handleConfigChange('bearerToken', e.target.value)
                      }
                      placeholder="your-api-token"
                      className="bg-background border-border font-mono text-xs"
                    />
                  </div>
                )}

                {config.authType === 'basic' && (
                  <>
                    <div className="space-y-2">
                      <Label>Username</Label>
                      <Input
                        value={(config.basicUsername as string) || ''}
                        onChange={(e) =>
                          handleConfigChange('basicUsername', e.target.value)
                        }
                        placeholder="username"
                        className="bg-background border-border text-xs"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Password</Label>
                      <Input
                        type="password"
                        value={(config.basicPassword as string) || ''}
                        onChange={(e) =>
                          handleConfigChange('basicPassword', e.target.value)
                        }
                        placeholder="password"
                        className="bg-background border-border text-xs"
                      />
                    </div>
                  </>
                )}

                {config.authType === 'apiKey' && (
                  <>
                    <div className="space-y-2">
                      <Label>API Key Name</Label>
                      <Input
                        value={(config.apiKeyName as string) || ''}
                        onChange={(e) =>
                          handleConfigChange('apiKeyName', e.target.value)
                        }
                        placeholder="X-API-Key"
                        className="bg-background border-border text-xs"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>API Key Value</Label>
                      <Input
                        type="password"
                        value={(config.apiKeyValue as string) || ''}
                        onChange={(e) =>
                          handleConfigChange('apiKeyValue', e.target.value)
                        }
                        placeholder="your-api-key"
                        className="bg-background border-border font-mono text-xs"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Send In</Label>
                      <Select
                        value={(config.apiKeyLocation as string) || 'header'}
                        onValueChange={(value) =>
                          handleConfigChange('apiKeyLocation', value)
                        }
                      >
                        <SelectTrigger className="bg-background border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-sidebar border-border">
                          <SelectItem value="header">Header</SelectItem>
                          <SelectItem value="query">Query Parameter</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label>Timeout (ms)</Label>
                  <Input
                    type="number"
                    value={(config.timeout as number) || 30000}
                    onChange={(e) =>
                      handleConfigChange(
                        'timeout',
                        parseInt(e.target.value, 10)
                      )
                    }
                    min={1000}
                    max={120000}
                    className="bg-background border-border font-mono text-xs outline-none"
                  />
                </div>

                <details className="group">
                  <summary className="text-xs font-medium text-muted-foreground cursor-pointer hover:text-white transition-colors">
                    Advanced Options
                  </summary>
                  <div className="mt-3 space-y-4 pl-2 border-l border-border">
                    <div className="space-y-2">
                      <Label className="text-xs">Follow Redirects</Label>
                      <Select
                        value={(config.followRedirects as string) || 'true'}
                        onValueChange={(value) =>
                          handleConfigChange('followRedirects', value)
                        }
                      >
                        <SelectTrigger className="bg-background border-border h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-sidebar border-border">
                          <SelectItem value="true">Yes</SelectItem>
                          <SelectItem value="false">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Ignore SSL Errors</Label>
                      <Select
                        value={(config.ignoreSSL as string) || 'false'}
                        onValueChange={(value) =>
                          handleConfigChange('ignoreSSL', value)
                        }
                      >
                        <SelectTrigger className="bg-background border-border h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-sidebar border-border">
                          <SelectItem value="false">
                            No (Recommended)
                          </SelectItem>
                          <SelectItem value="true">Yes (Insecure)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Response Type</Label>
                      <Select
                        value={(config.responseType as string) || 'json'}
                        onValueChange={(value) =>
                          handleConfigChange('responseType', value)
                        }
                      >
                        <SelectTrigger className="bg-background border-border h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-sidebar border-border">
                          <SelectItem value="json">
                            JSON (Auto-parse)
                          </SelectItem>
                          <SelectItem value="text">Plain Text</SelectItem>
                          <SelectItem value="binary">Binary/Buffer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </details>
              </>
            );
          })()}

        {selectedNode.type === 'ifElse' && (
          <div className="space-y-2">
            <Label>Condition (returns boolean)</Label>
            <Input
              value={(config.condition as string) || ''}
              onChange={(e) => handleConfigChange('condition', e.target.value)}
              placeholder="data.value > 10"
              className="bg-background border-border font-mono text-xs"
            />
            <p className="text-[10px] text-muted-foreground">
              Returns true or false. Ex: <code className="bg-secondary px-1 rounded">data.status === 200</code>
            </p>
          </div>
        )}

        {selectedNode.type === 'trigger' && (
          <div className="space-y-2">
            <Label>Trigger Type</Label>
            <Select
              value={(config.triggerType as string) || 'manual'}
              onValueChange={(value) =>
                handleConfigChange('triggerType', value)
              }
            >
              <SelectTrigger className="bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-sidebar border-border">
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="scheduled" disabled>
                  Scheduled (Coming Soon)
                </SelectItem>
                <SelectItem value="webhook" disabled>
                  Webhook (Coming Soon)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">
              Click the ▶ button on the node to run the workflow
            </p>
          </div>
        )}

        {/* Dynamic Config Panel for community/generic nodes */}
        {definition && !hasCustomConfigPanel(selectedNode.type || '') && (
          <DynamicConfigPanel
            definition={definition}
            config={config}
            onConfigChange={handleConfigChange}
          />
        )}
      </div>
    </div>
  );
};

interface NodePaletteItemProps {
  node: {
    type: string;
    label: string;
    description: string;
    icon: LucideIcon;
    color: string;
  };
  onDragStart: (event: DragEvent<HTMLDivElement>, nodeType: string) => void;
  onClick: () => void;
}

function NodePaletteItem({ node, onDragStart, onClick }: NodePaletteItemProps) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, node.type)}
      onClick={onClick}
      className="flex items-center gap-3 p-2.5 rounded-md hover:bg-secondary/50 cursor-grab active:cursor-grabbing transition-all group"
    >
      <div
        className={cn(
          'p-2 rounded-md bg-background border border-border/40 group-hover:bg-secondary transition-colors',
          `text-${node.color}`
        )}
      >
        <node.icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="font-medium text-foreground text-xs group-hover:text-primary transition-colors">
          {node.label}
        </h2>
        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
          {node.description}
        </p>
      </div>
      <GripVertical className="w-3 h-3 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
    </div>
  );
}

