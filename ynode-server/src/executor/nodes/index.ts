import type { ExecutionContext, NodeOutput, NodeDefinition } from '@ynode/core';
import { nodeRegistry, registerBuiltinNodes } from '@ynode/core';
import { getCustomNodeByType } from '../../db/customNodes.js';
import { executeCustomNodeCode } from '../customNodeExecutor.js';

registerBuiltinNodes();

type NodeExecutor = (context: ExecutionContext) => Promise<NodeOutput>;

export function getNodeExecutor(nodeType: string): NodeExecutor | undefined {
  const definition = nodeRegistry.get(nodeType) as NodeDefinition | undefined;
  if (definition) {
    return (context: ExecutionContext) => definition.execute(context);
  }

  const customNode = getCustomNodeByType(nodeType);
  if (customNode) {
    return async (context: ExecutionContext): Promise<NodeOutput> => {
      const result = await executeCustomNodeCode({
        code: customNode.code,
        inputs: context.inputs,
        config: context.config as Record<string, unknown>,
        usesMemory: customNode.uses_memory === 1,
        usesWorkflowMemory: customNode.uses_workflow_memory === 1,
        requiresNetwork: customNode.requires_network === 1,
        memory: context.memory,
        workflowMemory: context.workflowMemory,
        credentials: context.credentials,
        log: (msg) => context.log(msg),
      });

      if (!result.success) {
        return {
          data: result.outputs,
          error: result.error ? new Error(result.error) : undefined,
        };
      }

      return {
        data: result.outputs,
      };
    };
  }

  return undefined;
}

export function getSupportedNodeTypes(): string[] {
  return nodeRegistry.getAll().map((def) => def.type);
}
