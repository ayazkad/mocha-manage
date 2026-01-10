import { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface SwipeableListItemProps {
  children: React.ReactNode;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  className?: string;
  onClick?: () => void;
}

const SwipeableListItem = ({
  children,
  onMoveUp,
  onMoveDown,
  canMoveUp = true,
  canMoveDown = true,
  className,
  onClick,
}: SwipeableListItemProps) => {
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasMoved = useRef(false);
  const itemRef = useRef<HTMLDivElement>(null);

  const minSwipeDistance = 40;

  const handleStart = useCallback((clientY: number) => {
    setStartY(clientY);
    hasMoved.current = false;
    
    longPressTimer.current = setTimeout(() => {
      setIsDragging(true);
      // Vibrate on mobile if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 200);
  }, []);

  const handleMove = useCallback((clientY: number) => {
    if (!isDragging) {
      // Check if moving too much before long press completes
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
    const maxOffset = 80;
    const newOffset = Math.max(-maxOffset, Math.min(maxOffset, diffY));
    setOffset(newOffset);
  }, [isDragging, startY]);

  const handleEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (isDragging && Math.abs(offset) > minSwipeDistance) {
      if (offset < 0 && canMoveUp && onMoveUp) {
        onMoveUp();
      } else if (offset > 0 && canMoveDown && onMoveDown) {
        onMoveDown();
      }
    }

    setOffset(0);
    setIsDragging(false);
  }, [isDragging, offset, canMoveUp, canMoveDown, onMoveUp, onMoveDown]);

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

  // Mouse events for desktop testing
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    handleStart(e.clientY);
  }, [handleStart]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (e.buttons !== 1) return; // Only if mouse button is pressed
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

  return (
    <div
      ref={itemRef}
      className={cn(
        "relative select-none",
        isDragging && "z-10",
        className
      )}
      style={{
        transform: isDragging ? `translateY(${offset}px)` : 'translateY(0)',
        transition: isDragging ? 'none' : 'transform 0.2s ease-out',
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
      {isDragging && (
        <>
          <div className="absolute inset-0 bg-primary/5 rounded-lg pointer-events-none" />
          {offset < -20 && canMoveUp && (
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 py-1 px-3 bg-primary text-primary-foreground text-xs rounded-full font-medium shadow-lg">
              ↑ Move Up
            </div>
          )}
          {offset > 20 && canMoveDown && (
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 py-1 px-3 bg-primary text-primary-foreground text-xs rounded-full font-medium shadow-lg">
              ↓ Move Down
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SwipeableListItem;
