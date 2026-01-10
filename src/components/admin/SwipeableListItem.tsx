import { useState, useRef, useCallback, createContext, useContext } from 'react';
import { cn } from '@/lib/utils';

// Context for communicating drag state between items
interface SwipeContextValue {
  draggingIndex: number | null;
  dragOffset: number;
  setDragging: (index: number | null, offset: number) => void;
}

const SwipeContext = createContext<SwipeContextValue>({
  draggingIndex: null,
  dragOffset: 0,
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

  const setDragging = useCallback((index: number | null, offset: number) => {
    setDraggingIndex(index);
    setDragOffset(offset);
  }, []);

  return (
    <SwipeContext.Provider value={{ draggingIndex, dragOffset, setDragging }}>
      <div className={cn("space-y-2", className)}>
        {children}
      </div>
    </SwipeContext.Provider>
  );
};

interface SwipeableListItemProps {
  children: React.ReactNode;
  index: number;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  className?: string;
  onClick?: () => void;
}

const SwipeableListItem = ({
  children,
  index,
  onMoveUp,
  onMoveDown,
  canMoveUp = true,
  canMoveDown = true,
  className,
  onClick,
}: SwipeableListItemProps) => {
  const { draggingIndex, dragOffset, setDragging } = useContext(SwipeContext);
  const [localOffset, setLocalOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasMoved = useRef(false);
  const itemRef = useRef<HTMLDivElement>(null);

  const threshold = 40; // Threshold to trigger visual swap

  // Calculate if this item should be visually displaced
  const getDisplacement = () => {
    if (draggingIndex === null || draggingIndex === index) return 0;
    
    const itemHeight = 72; // Approximate height of item
    
    // If dragging item is above this one and moving down past threshold
    if (draggingIndex < index && dragOffset > threshold) {
      // Check if drag has passed this item's position
      const targetIndex = draggingIndex + Math.floor(dragOffset / threshold);
      if (targetIndex >= index) {
        return -itemHeight; // Move up
      }
    }
    
    // If dragging item is below this one and moving up past threshold
    if (draggingIndex > index && dragOffset < -threshold) {
      const targetIndex = draggingIndex + Math.ceil(dragOffset / threshold);
      if (targetIndex <= index) {
        return itemHeight; // Move down
      }
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
    }, 200);
  }, [index, setDragging]);

  const handleMove = useCallback((clientY: number) => {
    if (!isDragging) {
      if (Math.abs(clientY - startY) > 10) {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
      }
      return;
    }

    hasMoved.current = true;
    const diffY = clientY - startY;
    const maxOffset = 120;
    const newOffset = Math.max(-maxOffset, Math.min(maxOffset, diffY));
    setLocalOffset(newOffset);
    setDragging(index, newOffset);
  }, [isDragging, startY, index, setDragging]);

  const handleEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (isDragging && Math.abs(localOffset) > threshold) {
      if (localOffset < 0 && canMoveUp && onMoveUp) {
        onMoveUp();
      } else if (localOffset > 0 && canMoveDown && onMoveDown) {
        onMoveDown();
      }
    }

    setLocalOffset(0);
    setIsDragging(false);
    setDragging(null, 0);
  }, [isDragging, localOffset, canMoveUp, canMoveDown, onMoveUp, onMoveDown, setDragging]);

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
    handleMove(e.touches[0].clientY);
    if (isDragging) {
      e.preventDefault();
    }
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
          {localOffset < -threshold && canMoveUp && (
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 py-1 px-3 bg-primary text-primary-foreground text-xs rounded-full font-medium shadow-lg animate-fade-in">
              ↑ Release to move up
            </div>
          )}
          {localOffset > threshold && canMoveDown && (
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 py-1 px-3 bg-primary text-primary-foreground text-xs rounded-full font-medium shadow-lg animate-fade-in">
              ↓ Release to move down
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SwipeableListItem;
