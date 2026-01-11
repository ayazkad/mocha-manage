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
  const isTouchDevice = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    isTouchDevice.current = true;
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
    
    // Prevent scrolling when moving horizontally (swipe gesture)
    if (deltaX > 10 && isAdmin && onLongPress) {
      e.preventDefault();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
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
    // Prevent mouse events on touch devices to avoid double-click
    if (isTouchDevice.current) return;
    
    if (!isAdmin || !onLongPress) return;
    
    setIsLongPress(false);
    longPressTimer.current = setTimeout(() => {
      setIsLongPress(true);
      onLongPress();
    }, 500);
  };

  const handleMouseUp = () => {
    // Prevent mouse events on touch devices to avoid double-click
    if (isTouchDevice.current) return;
    
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
    <div
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
      className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-95 overflow-hidden group touch-manipulation rounded-2xl sm:rounded-3xl relative aspect-[3/4] min-h-[120px] sm:min-h-[140px] md:min-h-[180px]"
      style={{ touchAction: 'manipulation' }} // Improve touch response
    >
      {/* Background image or gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/40">
        {product.image_url ? (
          <img 
            src={product.image_url} 
            alt={getProductName(product)} 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            draggable={false} // Prevent image dragging
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-400 to-amber-600">
            <Coffee className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 text-white/60 group-hover:scale-110 transition-transform duration-500" />
          </div>
        )}
      </div>
      
      {/* Overlay gradient for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      
      {/* Content overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3 md:p-4">
        <div className="flex flex-col gap-1">
          <h3 className="font-bold text-xs sm:text-sm md:text-base text-white leading-tight">
            {getProductName(product)}
          </h3>
          <span className="bg-foreground/80 text-background px-2 py-1 sm:px-2.5 sm:py-1.5 md:px-3 md:py-1.5 rounded-full text-[10px] sm:text-xs md:text-sm font-semibold w-fit backdrop-blur-sm">
            {product.base_price.toFixed(2)} ₾
          </span>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;