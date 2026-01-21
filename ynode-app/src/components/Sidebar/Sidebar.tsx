import type { DragEvent } from 'react';
import {
  Zap,
  Globe,
  Split,
  GripVertical,
  Play,
  GitBranch,
  Shuffle,
  Plug,
  Timer,
  Code2,
  Code,
  FileText,
  Variable,
  Combine,
  Clock,
  Webhook,
  Box,
  Brain,
  MessageSquare,
  Database,
  Wrench,
  Sparkles,
  Send,
  Type,
  Puzzle,
  Search,
  Filter,
  Calculator,
  Image,
  Music,
  Video,
  Cloud,
  Server,
  Lock,
  Unlock,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { Card } from '../ui/card';
import { cn } from '../../lib/utils';
import { useNodeTypesStore } from '../../store/nodeTypesStore';

const iconMap: Record<string, LucideIcon> = {
  Zap,
  Globe,
  Split,
  Play,
  GitBranch,
  Shuffle,
  Plug,
  Timer,
  Code2,
  Code,
  FileText,
  Variable,
  Combine,
  Clock,
  Webhook,
  Box,
  Brain,
  MessageSquare,
  Database,
  Wrench,
  Sparkles,
  Send,
  Type,
  Puzzle,
  Search,
  Filter,
  Calculator,
  Image,
  Music,
  Video,
  Cloud,
  Server,
  Lock,
  Unlock,
  Settings,
};

const getColorClass = (color: string): string => {
  return `text-${color}`;
};

export function Sidebar() {
  const { nodes: allNodes, categories } = useNodeTypesStore();

  const onDragStart = (event: DragEvent<HTMLDivElement>, nodeType: string) => {
    event.dataTransfer.setData('application/ynodeType', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const nodeTypes = allNodes.map((def) => ({
    type: def.type,
    label: def.label,
    description: def.description,
    icon: iconMap[def.icon] || Zap,
    color: getColorClass(def.color || 'zinc-500'),
    category: def.category,
  }));

  const categoryKeys = Object.keys(categories);

  return (
    <aside className="w-64 border-r border-border bg-sidebar p-2 flex flex-col gap-4 z-20">
      <div className="flex items-center gap-2 px-2 pb-4 border-b border-border">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          Node Palette
        </span>
      </div>

      <div className="flex pl-1 pr-3 flex-col gap-3 overflow-y-auto flex-1 scrollbar-thin">
        {categoryKeys.map((category) => {
          const categoryNodes = nodeTypes.filter(
            (n) => n.category === category
          );
          if (categoryNodes.length === 0) return null;

          const meta = categories[category];
          if (!meta) return null;
          const CategoryIcon = iconMap[meta.icon] || Zap;

          return (
            <div key={category} className="space-y-1.5">
              <div className="flex items-center gap-2 px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 opacity-60">
                <CategoryIcon className="w-3 h-3" />
                {meta.label}
              </div>
              {categoryNodes.map((node) => (
                <div
                  key={node.type}
                  onDragStart={(event) => onDragStart(event, node.type)}
                  draggable
                  className="group relative"
                  title={node.description}
                >
                  <Card className="p-2.5 flex items-center gap-3 cursor-grab active:cursor-grabbing hover:border-primary/50 hover:bg-secondary/30 transition-all duration-200 bg-background border-border shadow-sm">
                    <div
                      className={cn(
                        'p-1.5 rounded bg-sidebar border border-border group-hover:border-primary/30 transition-all',
                        node.color
                      )}
                    >
                      <node.icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                      {node.label}
                    </span>
                    <GripVertical className="ml-auto w-3.5 h-3.5 text-muted-foreground/20 group-hover:text-muted-foreground/50 transition-colors" />
                  </Card>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

