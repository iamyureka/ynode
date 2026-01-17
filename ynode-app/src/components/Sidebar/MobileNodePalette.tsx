import {
  Zap,
  Globe,
  Split,
  Play,
  GitBranch,
  Shuffle,
  Plug,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { NodeCategory } from '@ynode/core';
import { nodeRegistry, registerBuiltinNodes, CategoryMeta } from '@ynode/core';
import { useWorkflowStore } from '../../store/workflowStore';

registerBuiltinNodes();

const iconMap: Record<string, LucideIcon> = {
  Zap,
  Globe,
  Split,
  Play,
  GitBranch,
  Shuffle,
  Plug,
};

const getColorClass = (color: string): string => {
  return `text-${color}`;
};

interface MobileNodePaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNodePalette({ isOpen, onClose }: MobileNodePaletteProps) {
  const addNode = useWorkflowStore((state) => state.addNode);

  if (!isOpen) return null;

  const allNodes = nodeRegistry.getAll();
  const categories = Object.keys(CategoryMeta) as NodeCategory[];

  const nodeTypes = allNodes.map((def) => ({
    type: def.type,
    label: def.label,
    description: def.description,
    icon: iconMap[def.icon] || Zap,
    color: getColorClass(def.color || 'zinc-500'),
    category: def.category,
  }));

  const handleAddNode = (nodeType: string) => {
    const centerX = window.innerWidth / 2 - 100;
    const centerY = window.innerHeight / 2 - 50;
    addNode(nodeType, { x: centerX, y: centerY });
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-sidebar/60 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 border-t border-border rounded-t-3xl max-h-[70vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        <div className="flex justify-center py-3">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        <div className="flex items-center justify-between px-4 pb-4 border-b border-border/50">
          <h2 className="text-lg font-semibold text-white">Add Node</h2>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {categories.map((category) => {
            const categoryNodes = nodeTypes.filter(
              (n) => n.category === category
            );
            if (categoryNodes.length === 0) return null;

            const meta = CategoryMeta[category];
            const CategoryIcon = iconMap[meta.icon] || Zap;

            return (
              <div key={category} className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase">
                  <CategoryIcon className="w-3 h-3" />
                  {meta.label}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {categoryNodes.map((node) => (
                    <button
                      key={node.type}
                      onClick={() => handleAddNode(node.type)}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-border/50 hover:bg-white/10 hover:border-primary/30 transition-all active:scale-95"
                    >
                      <div
                        className={`p-2 rounded-lg bg-white/5 ${node.color}`}
                      >
                        <node.icon className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-medium text-white truncate">
                        {node.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="h-6" />
      </div>
    </>
  );
}

