import { memo, useCallback, useRef, useState } from 'react';
import type { NodeProps } from '@xyflow/react';
import { NodeResizer } from '@xyflow/react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useWorkflowStore } from '../../store/workflowStore';

interface CommentData {
  text: string;
  width: number;
  height: number;
  color?: string;
  [key: string]: unknown;
}

const COMMENT_COLORS = [
  {
    name: 'Yellow',
    value: 'yellow',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/40',
    text: 'text-yellow-200',
  },
  {
    name: 'Blue',
    value: 'blue',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/40',
    text: 'text-blue-200',
  },
  {
    name: 'Green',
    value: 'green',
    bg: 'bg-green-500/10',
    border: 'border-green-500/40',
    text: 'text-green-200',
  },
  {
    name: 'Purple',
    value: 'purple',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/40',
    text: 'text-purple-200',
  },
  {
    name: 'Red',
    value: 'red',
    bg: 'bg-red-500/10',
    border: 'border-red-500/40',
    text: 'text-red-200',
  },
];

export const CommentNode = memo(({ id, data, selected }: NodeProps) => {
  const commentData = data as CommentData;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isEditing, setIsEditing] = useState(false);

  const updateComment = useWorkflowStore((state) => state.updateComment);
  const deleteComment = useWorkflowStore((state) => state.deleteComment);

  const colorConfig =
    COMMENT_COLORS.find((c) => c.value === (commentData.color || 'yellow')) ||
    COMMENT_COLORS[0];

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateComment(id, { text: e.target.value });
    },
    [id, updateComment]
  );

  const handleResize = useCallback(
    (_: any, params: { width: number; height: number }) => {
      updateComment(id, { width: params.width, height: params.height });
    },
    [id, updateComment]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      deleteComment(id);
    },
    [id, deleteComment]
  );

  const handleColorChange = useCallback(
    (color: string) => {
      updateComment(id, { color });
    },
    [id, updateComment]
  );

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, []);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
  }, []);

  return (
    <div style={{ width: commentData.width, height: commentData.height }}>
      <NodeResizer
        minWidth={150}
        minHeight={80}
        isVisible={selected}
        lineClassName="!border-white/20"
        handleClassName="!w-2.5 !h-2.5 !bg-background !border-2 !border-border/500 !rounded-sm"
        onResize={handleResize}
      />
      <div
        className={cn(
          'w-full h-full rounded-lg border-2 flex flex-col transition-all duration-200 overflow-hidden',
          colorConfig.bg,
          colorConfig.border,
          selected && 'ring-2 ring-white/20 border-white/40'
        )}
        onDoubleClick={handleDoubleClick}
      >
        <div className="flex-1 min-h-0 relative">
          <textarea
            ref={textareaRef}
            className={cn(
              'w-full h-full p-4 bg-transparent outline-none text-sm font-medium leading-relaxed transition-all placeholder:text-muted-foreground',
              colorConfig.text,
              !isEditing && 'cursor-default resize-none overflow-hidden'
            )}
            value={commentData.text}
            onChange={handleTextChange}
            onBlur={handleBlur}
            placeholder="Double-click to add a comment..."
            readOnly={!isEditing}
          />
        </div>
      </div>
      <div className="flex items-center gap-2 p-2">
        {selected && (
          <div className="flex gap-1 items-center px-2 py-1">
            {COMMENT_COLORS.map((color) => (
              <button
                key={color.value}
                className={cn(
                  'w-3 h-3 rounded-full transition-all hover:scale-125',
                  color.bg,
                  'border',
                  color.border,
                  commentData.color === color.value && `scale-125`
                )}
                onClick={() => handleColorChange(color.value)}
                title={color.name}
              />
            ))}
          </div>
        )}

        {selected && (
          <button
            className="p-1.5 rounded-md text-red-400/70 hover:text-red-400 transition-all"
            onClick={handleDelete}
            title="Delete comment"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
});

CommentNode.displayName = 'CommentNode';

