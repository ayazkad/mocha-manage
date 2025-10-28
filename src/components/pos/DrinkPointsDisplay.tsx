import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePOS } from '@/contexts/POSContext';

const DrinkPointsDisplay = ({ cart }: { cart: any[] }) => {
  const { data: drinkCount, isLoading } = useQuery({
    queryKey: ['drink-points', cart.map(item => item.productId).join(',')],
    queryFn: async () => {
      if (cart.length === 0) return 0;
      
      const productIds = cart.map(item => item.productId);
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

      // Compter seulement les produits des catégories Coffee et Non Coffee
      const count = cart.reduce((sum, item) => {
        const product = products?.find((p: any) => p.id === item.productId);
        if (product?.categories) {
          const categoryNameEn = (product.categories.name_en || '').trim().toLowerCase();
          const categoryNameFr = (product.categories.name_fr || '').trim().toLowerCase();
          
          const isCoffeeCategory = categoryNameEn === 'coffee' || categoryNameFr === 'coffee';
          const isNonCoffeeCategory = categoryNameEn === 'non coffee' || categoryNameFr === 'non coffee';
          
          if (isCoffeeCategory || isNonCoffeeCategory) {
            return sum + item.quantity;
          }
        }
        return sum;
      }, 0);

      return count;
    },
    enabled: cart.length > 0
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
