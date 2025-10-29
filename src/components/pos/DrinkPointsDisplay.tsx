import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePOS } from '@/contexts/POSContext';

const DrinkPointsDisplay = ({ cart }: { cart: any[] }) => {
  // Créer une clé qui change à chaque modification du panier (produits ET quantités)
  const cartKey = cart.map(item => `${item.productId}-${item.quantity}`).join('|');
  
  const { data: drinkCount, isLoading } = useQuery({
    queryKey: ['drink-points', cartKey],
    queryFn: async () => {
      if (cart.length === 0) return 0;
      
      const productIds = [...new Set(cart.map(item => item.productId))];
      const { data: products } = await supabase
        .from('products')
        .select(`
          id,
          category_id,
          categories!inner (
            name_en,
            name_fr
          )
        `)
        .in('id', productIds);

      // Compter TOUS les produits (avec leurs quantités) des catégories Coffee et Non Coffee
      const count = cart.reduce((sum, item) => {
        const product = products?.find((p: any) => p.id === item.productId);
        if (product?.categories) {
          const categoryNameEn = (product.categories.name_en || '').trim().toLowerCase();
          const categoryNameFr = (product.categories.name_fr || '').trim().toLowerCase();
          
          const isCoffeeCategory = categoryNameEn === 'coffee' || categoryNameFr === 'coffee';
          const isNonCoffeeCategory = categoryNameEn === 'non coffee' || categoryNameFr === 'non coffee';
          
          if (isCoffeeCategory || isNonCoffeeCategory) {
            // IMPORTANT: Ajouter la quantité complète de cet item
            return sum + item.quantity;
          }
        }
        return sum;
      }, 0);

      return count;
    },
    enabled: cart.length > 0,
    staleTime: 0, // Toujours refetch pour avoir les données fraîches
  });

  if (isLoading || !drinkCount) return null;

  return (
    <div className="text-[10px] text-muted-foreground">
      {drinkCount === 1 
        ? '✓ +1 point après validation'
        : `✓ +${drinkCount} points après validation`
      }
    </div>
  );
};

export default DrinkPointsDisplay;
