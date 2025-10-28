import { Card } from '@/components/ui/card';
import { Coffee } from 'lucide-react';

interface Product {
  id: string;
  name_fr: string;
  base_price: number;
  image_url: string;
}

interface ProductCardProps {
  product: Product;
  onClick: () => void;
  getProductName: (product: Product) => string;
}

const ProductCard = ({ product, onClick, getProductName }: ProductCardProps) => {
  return (
    <Card
      onClick={onClick}
      className="cursor-pointer hover:shadow-medium transition-all duration-normal hover:scale-[1.02] active:scale-95 overflow-hidden group touch-manipulation border-border/50 bg-card"
    >
      <div className="aspect-square bg-gradient-card flex items-center justify-center relative overflow-hidden min-h-[140px] md:min-h-[200px] lg:min-h-[220px]">
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
      <div className="p-4 md:p-5 space-y-2">
        <h3 className="font-semibold text-sm md:text-base text-card-foreground line-clamp-1">
          {getProductName(product)}
        </h3>
        <p className="text-xl md:text-2xl font-bold text-primary">
          {product.base_price.toFixed(2)} ₾
        </p>
      </div>
    </Card>
  );
};

export default ProductCard;
