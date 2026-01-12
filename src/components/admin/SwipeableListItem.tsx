import { useState, useRef, useCallback, createContext, useContext, useEffect } from 'react';
import { cn } from '@/lib/utils';

// Context for communicating drag state between items
interface SwipeContextValue {
  draggingIndex: number | null;
  dragOffset: number;
  itemHeight: number; // Add itemHeight to context
  setDragging: (index: number | null, offset: number) => void;
}

const SwipeContext = createContext<SwipeContextValue>({
  draggingIndex: null,
  dragOffset: 0,
  itemHeight: 72, // Default value, will be overridden
  setDragging: () => {},
});

// Wrapper component to manage swipeable list
interface SwipeableListProps {
  children: React.ReactNode;
  className?: string;
}

export const SwipeableList = ({ children, className }: SwipeableListProps) => {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [measuredItemHeight, setMeasuredItemHeight] = useState(72); // State for dynamic height
  const listRef = useRef<HTMLDivElement>(null);

  // Measure height of the first child once
  useEffect(() => {
    if (listRef.current && listRef.current.firstElementChild) {
      const height = listRef.current.firstElementChild.clientHeight; // Use clientHeight for content + padding
      if (height > 0 && height !== measuredItemHeight) {
        setMeasuredItemHeight(height);
      }
    }
  }, [children, measuredItemHeight]); // Re-measure if children change

  const setDragging = useCallback((index: number | null, offset: number) => {
    setDraggingIndex(index);
    setDragOffset(offset);
  }, []);

  return (
    <SwipeContext.Provider value={{ draggingIndex, dragOffset, itemHeight: measuredItemHeight, setDragging }}>
      <div ref={listRef} className={cn("space-y-2", className)}>
        {children}
      </div>
    </SwipeContext.Provider>
  );
};

interface SwipeableListItemProps {
  children: React.ReactNode;
  index: number;
  /** Total items in the list (used to clamp drag target) */
  listSize?: number;
  /** Preferred: move directly to an index */
  onMoveTo?: (toIndex: number) => void;
  /** Legacy: move one step */
  onMoveUp?: () => void;
  /** Legacy: move one step */
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  className?: string;
  onClick?: () => void;
}

const SwipeableListItem = ({
  children,
  index,
  listSize,
  onMoveTo,
  onMoveUp,
  onMoveDown,
  canMoveUp = true,
  canMoveDown = true,
  className,
  onClick,
}: SwipeableListItemProps) => {
  const { draggingIndex, dragOffset, itemHeight, setDragging } = useContext(SwipeContext); // Use itemHeight from context
  const [localOffset, setLocalOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasMoved = useRef(false);
  const itemRef = useRef<HTMLDivElement>(null);

  const threshold = itemHeight / 2; // Move when past half an item

  const clampDelta = useCallback(
    (delta: number) => {
      if (typeof listSize !== 'number') return delta;
      const minDelta = -index;
      const maxDelta = (listSize - 1) - index;
      return Math.max(minDelta, Math.min(maxDelta, delta));
    },
    [index, listSize]
  );

  // Calculate how many positions the dragged item should move
  const getTargetOffset = useCallback(() => {
    if (dragOffset === 0 || itemHeight === 0) return 0; // Avoid division by zero
    return clampDelta(Math.round(dragOffset / itemHeight));
  }, [dragOffset, itemHeight, clampDelta]);

  // Calculate if this item should be visually displaced
  const getDisplacement = () => {
    if (draggingIndex === null || draggingIndex === index) return 0;

    const positionsToMove = getTargetOffset();
    const targetIndex = draggingIndex + positionsToMove;

    // Dragging DOWN: items between draggingIndex and targetIndex move UP
    if (positionsToMove > 0 && index > draggingIndex && index <= targetIndex) {
      return -itemHeight;
    }

    // Dragging UP: items between targetIndex and draggingIndex move DOWN
    if (positionsToMove < 0 && index < draggingIndex && index >= targetIndex) {
      return itemHeight;
    }

    return 0;
  };

  const displacement = getDisplacement();

  const handleStart = useCallback((clientY: number) => {
    setStartY(clientY);
    hasMoved.current = false;

    longPressTimer.current = setTimeout(() => {
      setIsDragging(true);
      setDragging(index, 0);
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 300); // Increased from 150ms to 300ms for better UX
  }, [index, setDragging]);

  const handleMove = useCallback((clientY: number) => {
    if (!isDragging) {
      if (Math.abs(clientY - startY) > 8) {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
      }
      return;
    }

    hasMoved.current = true;
    const diffY = clientY - startY;
    // No max offset limitation - allow free movement
    setLocalOffset(diffY);
    setDragging(index, diffY);
  }, [isDragging, startY, index, setDragging]);

  const handleEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (isDragging) {
      const deltaRaw = Math.round(localOffset / itemHeight);
      const delta = clampDelta(deltaRaw);

      if (Math.abs(localOffset) > threshold && delta !== 0) {
        if (onMoveTo) {
          const toIndex = index + delta;
          if (toIndex !== index) {
            onMoveTo(toIndex);
          }
        } else {
          // Legacy single-step fallback
          if (delta < 0 && canMoveUp && onMoveUp) onMoveUp();
          if (delta > 0 && canMoveDown && onMoveDown) onMoveDown();
        }
      }
    }

    setLocalOffset(0);
    setIsDragging(false);
    setDragging(null, 0);
  }, [isDragging, localOffset, setDragging, itemHeight, threshold, clampDelta, onMoveTo, index, canMoveUp, canMoveDown, onMoveUp, onMoveDown]);

  const handleClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (hasMoved.current || isDragging) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onClick?.();
  }, [onClick, isDragging]);

  // Touch events
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    handleStart(e.touches[0].clientY);
  }, [handleStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // Empêche le défilement par défaut si un glisser-déposer est en cours ou en attente de déclenchement
    if (longPressTimer.current || isDragging) {
      e.preventDefault();
    }
    handleMove(e.touches[0].clientY);
  }, [handleMove, isDragging]);

  const handleTouchEnd = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  // Mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    handleStart(e.clientY);
  }, [handleStart]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (e.buttons !== 1) return;
    handleMove(e.clientY);
  }, [handleMove]);

  const handleMouseUp = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  const handleMouseLeave = useCallback(() => {
    if (isDragging) {
      handleEnd();
    }
  }, [isDragging, handleEnd]);

  const isBeingDragged = draggingIndex === index;

  return (
    <div
      ref={itemRef}
      className={cn(
        "relative select-none",
        isBeingDragged && "z-20",
        !isBeingDragged && draggingIndex !== null && "z-10",
        className
      )}
      style={{
        transform: isBeingDragged 
          ? `translateY(${localOffset}px) scale(1.02)` 
          : `translateY(${displacement}px)`,
        transition: isBeingDragged ? 'none' : 'transform 0.2s ease-out',
        boxShadow: isBeingDragged ? '0 8px 25px rgba(0,0,0,0.15)' : 'none',
        opacity: isBeingDragged ? 0.8 : 1, // Added opacity for the dragged item
        touchAction: isDragging ? 'none' : 'auto',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {children}
      {isBeingDragged && (
        <>
          <div className="absolute inset-0 bg-primary/10 rounded-lg pointer-events-none border-2 border-primary/30" />
          {Math.abs(localOffset) > threshold && (
            <div className={`absolute ${localOffset < 0 ? '-top-8' : '-bottom-8'} left-1/2 -translate-x-1/2 py-1 px-3 bg-primary text-primary-foreground text-xs rounded-full font-medium shadow-lg animate-fade-in`}>
              {localOffset < 0 ? '↑' : '↓'} {Math.abs(clampDelta(Math.round(localOffset / itemHeight)))} position{Math.abs(clampDelta(Math.round(localOffset / itemHeight))) > 1 ? 's' : ''}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SwipeableListItem;