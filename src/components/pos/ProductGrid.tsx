import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePOS } from '@/contexts/POSContext';
import ProductCard from './ProductCard';
import ProductOptionsDialog from './ProductOptionsDialog';
import QuickEditProductDialog from './QuickEditProductDialog';

interface Product {
  id: string;
  name_fr: string;
  name_en: string;
  name_ru: string;
  name_ge: string;
  description_fr: string;
  description_en: string;
  description_ru: string;
  description_ge: string;
  base_price: number;
  image_url: string;
  category_id: string;
  has_size_options: boolean;
  has_milk_options: boolean;
}

interface ProductGridProps {
  categoryId: string | null;
}

const ProductGrid = ({ categoryId }: ProductGridProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const { addToCart, currentEmployee } = usePOS();

  const isAdmin = currentEmployee?.role === 'admin';

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
      .eq('visible_in_categories', true)
      .order('sort_order');

    if (data && !error) {
      setProducts(data);
    }
  };

  const getProductName = (product: Product) => {
    return product.name_en || product.name_fr;
  };

  const handleProductClick = (product: Product) => {
    if (product.has_size_options || product.has_milk_options) {
      setSelectedProduct(product);
    } else {
      // Add directly to cart with no options
      addToCart({
        productId: product.id,
        productName: getProductName(product),
        quantity: 1,
        basePrice: product.base_price,
        image_url: product.image_url,
      });
    }
  };

  const handleProductLongPress = (product: Product) => {
    if (isAdmin) {
      setEditingProduct(product);
    }
  };

  return (
    <>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onClick={() => handleProductClick(product)}
            onLongPress={() => handleProductLongPress(product)}
            getProductName={getProductName}
            isAdmin={isAdmin}
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

      {editingProduct && (
        <QuickEditProductDialog
          product={editingProduct}
          open={!!editingProduct}
          onClose={() => setEditingProduct(null)}
          onSaved={loadProducts}
        />
      )}
    </>
  );
};

export default ProductGrid;
