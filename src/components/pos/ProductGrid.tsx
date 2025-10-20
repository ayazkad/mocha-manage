import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePOS } from '@/contexts/POSContext';
import ProductCard from './ProductCard';
import ProductOptionsDialog from './ProductOptionsDialog';

interface Product {
  id: string;
  name_fr: string;
  name_ru: string;
  name_ge: string;
  description_fr: string;
  description_ru: string;
  description_ge: string;
  base_price: number;
  image_url: string;
  has_size_options: boolean;
  has_milk_options: boolean;
}

interface ProductGridProps {
  categoryId: string | null;
}

const ProductGrid = ({ categoryId }: ProductGridProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { language } = usePOS();

  useEffect(() => {
    if (categoryId) {
      loadProducts();
    }
  }, [categoryId]);

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('category_id', categoryId)
      .eq('active', true)
      .order('sort_order');

    if (data && !error) {
      setProducts(data);
    }
  };

  const getProductName = (product: Product) => {
    switch (language) {
      case 'ru':
        return product.name_ru || product.name_fr;
      case 'ge':
        return product.name_ge || product.name_fr;
      default:
        return product.name_fr;
    }
  };

  const handleProductClick = (product: Product) => {
    if (product.has_size_options || product.has_milk_options) {
      setSelectedProduct(product);
    } else {
      // Add directly to cart with no options
      const { addToCart } = usePOS();
      addToCart({
        productId: product.id,
        productName: getProductName(product),
        quantity: 1,
        basePrice: product.base_price,
      });
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onClick={() => handleProductClick(product)}
            getProductName={getProductName}
          />
        ))}
      </div>

      {selectedProduct && (
        <ProductOptionsDialog
          product={selectedProduct}
          open={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
          getProductName={getProductName}
        />
      )}
    </>
  );
};

export default ProductGrid;
