import { useState, useEffect, useRef } from 'react';
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
  has_temperature_options?: boolean;
  sort_order?: number;
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
  
  // Nouveau state pour bloquer temporairement l'ouverture d'un dialogue
  const [isDialogOpeningBlocked, setIsDialogOpeningBlocked] = useState(false);
  const blockTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Nouvelle fonction pour gérer la fermeture du dialogue d'options
  const handleProductOptionsDialogClose = () => {
    setSelectedProduct(null);
    // Bloquer l'ouverture pour une courte période pour éviter une réouverture immédiate
    setIsDialogOpeningBlocked(true);
    if (blockTimeoutRef.current) {
      clearTimeout(blockTimeoutRef.current);
    }
    blockTimeoutRef.current = setTimeout(() => {
      setIsDialogOpeningBlocked(false);
    }, 100); // Délai de 100ms, ajustez si nécessaire
  };

  const handleProductClick = (product: Product) => {
    // Si le produit cliqué a des options
    if (product.has_size_options || product.has_milk_options || product.has_temperature_options) {
      // Si l'ouverture du dialogue est bloquée, ne rien faire pour les produits avec options.
      // Cela gère le comportement "cliquer en dehors pour fermer, puis recliquer pour ouvrir un nouveau".
      if (isDialogOpeningBlocked) {
        return;
      }
      
      // Cas 1: Cliquer sur le *même* produit qui est actuellement sélectionné
      if (selectedProduct && selectedProduct.id === product.id) {
        handleProductOptionsDialogClose(); // Fermer le dialogue
      }
      // Cas 2: Cliquer sur un *produit différent* (ou aucun produit n'est sélectionné)
      else {
        setSelectedProduct(product); // Ouvrir le dialogue pour le nouveau produit
      }
    } else {
      // Le produit n'a pas d'options, l'ajouter directement au panier
      addToCart({
        productId: product.id,
        productName: getProductName(product),
        quantity: 1,
        basePrice: product.base_price,
        image_url: product.image_url,
      });
      
      // Toujours fermer tout dialogue d'options ouvert lors de l'ajout d'un produit sans option
      if (selectedProduct) {
        handleProductOptionsDialogClose();
      }
      // Pas besoin de bloquer ici, car nous n'ouvrons pas un nouveau dialogue.
    }
  };

  const handleProductLongPress = (product: Product) => {
    if (isAdmin) {
      setEditingProduct(product);
      // Si un dialogue d'options de produit est ouvert, le fermer lors de l'ouverture du dialogue d'édition rapide
      if (selectedProduct) {
        handleProductOptionsDialogClose();
      }
    }
  };

  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 md:gap-3">
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
          onClose={handleProductOptionsDialogClose} // Utiliser le nouveau gestionnaire de fermeture
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