import { useWorkflowStore } from '../../store/workflowStore';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { nodeRegistry, registerBuiltinNodes } from '@ynode/core';
import { Badge } from '../ui/badge';
import { X, Trash2 } from 'lucide-react';

registerBuiltinNodes();

export function MobileNodeConfig() {
  const selectedNode = useWorkflowStore((state) => state.selectedNode);
  const setSelectedNode = useWorkflowStore((state) => state.setSelectedNode);
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const updateNodeConfig = useWorkflowStore((state) => state.updateNodeConfig);
  const deleteSelectedNodes = useWorkflowStore(
    (state) => state.deleteSelectedNodes
  );

  if (!selectedNode) return null;

  const definition = nodeRegistry.get(selectedNode.type || '');
  const config = selectedNode.data.config as Record<string, unknown>;

  const handleConfigChange = (key: string, value: unknown) => {
    updateNodeConfig(selectedNode.id, { [key]: value });
  };

  const handleClose = () => {
    setSelectedNode(null);
  };

  const handleDelete = () => {
    deleteSelectedNodes();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <div className="flex items-center justify-between px-4 h-14 border-b border-border/50 shrink-0">
        <button
          onClick={handleClose}
          className="p-2 -ml-2 text-muted-foreground hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <span className="font-medium text-white">
            {selectedNode.data.label}
          </span>
          {definition && (
            <Badge variant="outline" className="text-[10px]">
              {definition.category}
            </Badge>
          )}
        </div>
        <button
          onClick={handleDelete}
          className="p-2 -mr-2 text-red-400 hover:text-red-300 transition-colors"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {definition && (
        <div className="px-4 py-3 border-b border-border/50 bg-white/[0.02]">
          <p className="text-sm text-muted-foreground">{definition.description}</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="space-y-2">
          <Label>Label</Label>
          <Input
            value={selectedNode.data.label}
            onChange={(e) =>
              updateNodeData(selectedNode.id, { label: e.target.value })
            }
            className="bg-white/5 border-border h-12 text-base"
          />
        </div>

        {definition &&
          (definition.inputs.length > 0 || definition.outputs.length > 0) && (
            <div className="space-y-3">
              {definition.inputs.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">
                    Inputs
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {definition.inputs.map((port) => (
                      <Badge
                        key={port.id}
                        variant="secondary"
                        className="text-xs bg-blue-500/10 text-blue-400 py-1"
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
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">
                    Outputs
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {definition.outputs.map((port) => (
                      <Badge
                        key={port.id}
                        variant="secondary"
                        className="text-xs bg-green-500/10 text-green-400 py-1"
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
                    <SelectTrigger className="bg-white/5 border-border h-12 text-base">
                      <SelectValue placeholder="Select Method" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-border">
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
                    className="bg-white/5 border-border font-mono text-sm h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Headers (JSON)</Label>
                  <textarea
                    value={(config.headers as string) || '{\n  \n}'}
                    onChange={(e) =>
                      handleConfigChange('headers', e.target.value)
                    }
                    placeholder='{"Authorization": "Bearer token"}'
                    className="w-full h-28 bg-white/5 border border-border rounded-md p-3 font-mono text-sm text-white resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                      placeholder='{"page": 1, "limit": 10}'
                      className="w-full h-24 bg-white/5 border border-border rounded-md p-3 font-mono text-sm text-white resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                        <SelectTrigger className="bg-white/5 border-border h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-border">
                          <SelectItem value="application/json">
                            application/json
                          </SelectItem>
                          <SelectItem value="application/x-www-form-urlencoded">
                            form-urlencoded
                          </SelectItem>
                          <SelectItem value="multipart/form-data">
                            multipart/form-data
                          </SelectItem>
                          <SelectItem value="text/plain">text/plain</SelectItem>
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
                        placeholder='{"key": "value"}'
                        className="w-full h-36 bg-white/5 border border-border rounded-md p-3 font-mono text-sm text-white resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
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
                    <SelectTrigger className="bg-white/5 border-border h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-border">
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
                      className="bg-white/5 border-border font-mono text-sm h-12"
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
                        className="bg-white/5 border-border h-12"
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
                        className="bg-white/5 border-border h-12"
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
                        className="bg-white/5 border-border h-12"
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
                        className="bg-white/5 border-border font-mono h-12"
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
                        <SelectTrigger className="bg-white/5 border-border h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-border">
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
                    className="bg-white/5 outline-none border-border font-mono text-sm h-12"
                  />
                </div>
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
              className="bg-white/5 border-border font-mono text-sm h-12"
            />
            <p className="text-xs text-muted-foreground">
              Returns true or false. Ex:{' '}
              <code className="bg-white/5 px-1 rounded">
                data.status === 200
              </code>
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
              <SelectTrigger className="bg-white/5 border-border h-12 text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-border">
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="scheduled" disabled>
                  Scheduled (Coming Soon)
                </SelectItem>
                <SelectItem value="webhook" disabled>
                  Webhook (Coming Soon)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Click the ▶ button on the node to run the workflow
            </p>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border/50 shrink-0">
        <button
          onClick={handleClose}
          className="w-full py-3 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl transition-colors active:scale-[0.98]"
        >
          Done
        </button>
      </div>
    </div>
  );
}

