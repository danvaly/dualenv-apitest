import { useCallback, useEffect, useRef, useState } from 'react';

interface ResizeHandleProps {
  direction: 'horizontal' | 'vertical';
  onResize: (delta: number) => void;
  onResizeEnd?: () => void;
}

export default function ResizeHandle({ direction, onResize, onResizeEnd }: ResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const lastPositionRef = useRef<number>(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    lastPositionRef.current = direction === 'horizontal' ? e.clientX : e.clientY;
  }, [direction]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const currentPosition = direction === 'horizontal' ? e.clientX : e.clientY;
      const delta = currentPosition - lastPositionRef.current;
      lastPositionRef.current = currentPosition;
      onResize(delta);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      onResizeEnd?.();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Prevent text selection while dragging
    document.body.style.userSelect = 'none';
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging, direction, onResize, onResizeEnd]);

  const isHorizontal = direction === 'horizontal';

  return (
    <div
      onMouseDown={handleMouseDown}
      className={`
        group relative flex-shrink-0 z-10
        ${isHorizontal ? 'w-1 cursor-col-resize hover:w-1' : 'h-1 cursor-row-resize hover:h-1'}
        ${isDragging ? 'bg-accent-primary' : 'bg-dark-border hover:bg-accent-primary/50'}
        transition-colors
      `}
    >
      {/* Larger hit area */}
      <div
        className={`
          absolute
          ${isHorizontal ? '-left-1 -right-1 top-0 bottom-0' : '-top-1 -bottom-1 left-0 right-0'}
        `}
      />
      {/* Visual indicator dots */}
      <div
        className={`
          absolute opacity-0 group-hover:opacity-100 transition-opacity
          ${isHorizontal
            ? 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-1'
            : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-row gap-1'
          }
        `}
      >
        <div className="w-1 h-1 rounded-full bg-text-muted" />
        <div className="w-1 h-1 rounded-full bg-text-muted" />
        <div className="w-1 h-1 rounded-full bg-text-muted" />
      </div>
    </div>
  );
}
