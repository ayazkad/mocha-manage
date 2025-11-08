import { Card } from '@/components/ui/card';
import { Coffee } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface Product {
  id: string;
  name_fr: string;
  base_price: number;
  image_url: string;
}

interface ProductCardProps {
  product: Product;
  onClick: () => void;
  onLongPress?: () => void;
  getProductName: (product: Product) => string;
  isAdmin?: boolean;
}

const ProductCard = ({ product, onClick, onLongPress, getProductName, isAdmin }: ProductCardProps) => {
  const [isLongPress, setIsLongPress] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const hasMovedRef = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    hasMovedRef.current = false;
    setIsLongPress(false);
    
    if (!isAdmin || !onLongPress) return;

    longPressTimer.current = setTimeout(() => {
      setIsLongPress(true);
      onLongPress();
      // Vibration feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 500); // 500ms for long press
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPos.current) return;

    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartPos.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartPos.current.y);

    // Mark as moved if user moves finger more than 10px
    if (deltaX > 10 || deltaY > 10) {
      hasMovedRef.current = true;
    }

    // Cancel long press if user moves finger more than 30px (scroll detection)
    if (deltaX > 30 || deltaY > 30) {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    // Only trigger onClick if user didn't move (not a scroll) and not a long press
    if (!isLongPress && !hasMovedRef.current) {
      onClick();
    }
    
    setIsLongPress(false);
    touchStartPos.current = null;
    hasMovedRef.current = false;
  };

  const handleMouseDown = () => {
    if (!isAdmin || !onLongPress) return;
    
    setIsLongPress(false);
    longPressTimer.current = setTimeout(() => {
      setIsLongPress(true);
      onLongPress();
    }, 500);
  };

  const handleMouseUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (!isLongPress) {
      onClick();
    }
    
    setIsLongPress(false);
  };

  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  return (
    <Card
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
      }}
      className="cursor-pointer hover:shadow-medium transition-all duration-normal hover:scale-[1.02] active:scale-95 overflow-hidden group touch-manipulation border-border/50 bg-card"
    >
      <div className="aspect-square bg-gradient-card flex items-center justify-center relative overflow-hidden min-h-[100px] md:min-h-[120px]">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={getProductName(product)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-slow"
          />
        ) : (
          <Coffee className="w-14 h-14 md:w-20 md:h-20 text-muted-foreground/40 group-hover:scale-105 transition-transform duration-slow" />
        )}
      </div>
      <div className="p-2 md:p-3 space-y-1">
        <h3 className="font-semibold text-xs md:text-sm text-card-foreground line-clamp-1">
          {getProductName(product)}
        </h3>
        <p className="text-base md:text-lg font-bold text-primary">
          {product.base_price.toFixed(2)} ₾
        </p>
      </div>
    </Card>
  );
};

export default ProductCard;
