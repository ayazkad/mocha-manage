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
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const itemRef = useRef<HTMLDivElement>(null);

  const minSwipeDistance = 50;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.targetTouches[0];
    setTouchEnd(null);
    setTouchStart({ x: touch.clientX, y: touch.clientY });
    
    longPressTimer.current = setTimeout(() => {
      setIsDragging(true);
    }, 300);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart) return;
    
    const touch = e.targetTouches[0];
    const diffX = Math.abs(touch.clientX - touchStart.x);
    const diffY = touch.clientY - touchStart.y;
    
    // If horizontal movement is greater, don't allow vertical drag
    if (diffX > Math.abs(diffY)) {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      setIsDragging(false);
      return;
    }

    if (isDragging) {
      e.preventDefault();
      // Limit the offset
      const maxOffset = 60;
      const newOffset = Math.max(-maxOffset, Math.min(maxOffset, diffY));
      setOffset(newOffset);
      setTouchEnd({ x: touch.clientX, y: touch.clientY });
    }
  }, [touchStart, isDragging]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (!isDragging) {
      setTouchStart(null);
      setTouchEnd(null);
      setOffset(0);
      return;
    }

    if (!touchStart || !touchEnd) {
      setIsDragging(false);
      setOffset(0);
      return;
    }

    const distanceY = touchEnd.y - touchStart.y;

    if (Math.abs(distanceY) > minSwipeDistance) {
      if (distanceY > 0 && canMoveDown && onMoveDown) {
        onMoveDown();
      } else if (distanceY < 0 && canMoveUp && onMoveUp) {
        onMoveUp();
      }
    }

    setTouchStart(null);
    setTouchEnd(null);
    setOffset(0);
    setIsDragging(false);
  }, [touchStart, touchEnd, isDragging, canMoveUp, canMoveDown, onMoveUp, onMoveDown]);

  return (
    <div
      ref={itemRef}
      className={cn(
        "transition-all duration-150 touch-pan-x select-none",
        isDragging && "z-10 shadow-lg scale-[1.02] bg-background",
        className
      )}
      style={{
        transform: isDragging ? `translateY(${offset}px)` : 'translateY(0)',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={onClick}
    >
      {children}
      {isDragging && (
        <div className="absolute inset-0 pointer-events-none">
          {offset < -20 && canMoveUp && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full py-1 px-2 bg-primary text-primary-foreground text-xs rounded-t">
              ↑ Move Up
            </div>
          )}
          {offset > 20 && canMoveDown && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full py-1 px-2 bg-primary text-primary-foreground text-xs rounded-b">
              ↓ Move Down
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SwipeableListItem;
