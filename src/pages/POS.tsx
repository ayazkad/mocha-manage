import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePOS } from '@/contexts/POSContext';
import { supabase } from '@/integrations/supabase/client';
import ProductGrid from '@/components/pos/ProductGrid';
import Cart from '@/components/pos/Cart';
import Header from '@/components/pos/Header';
import CategoryTabs from '@/components/pos/CategoryTabs';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Category {
  id: string;
  name_fr: string;
  name_en: string;
  name_ru: string;
  name_ge: string;
  icon: string;
}

const POS = () => {
  const { currentEmployee, cart } = usePOS();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    if (!currentEmployee) {
      navigate('/');
      return;
    }

    loadCategories();
  }, [currentEmployee, navigate]);

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('active', true)
      .order('sort_order');

    if (data && !error) {
      setCategories(data);
      if (data.length > 0 && !selectedCategory) {
        setSelectedCategory(data[0].id);
      }
    }
  };

  const getCategoryName = (category: Category) => {
    return category.name_en || category.name_fr;
  };

  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <CategoryTabs
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            getCategoryName={getCategoryName}
          />
          
          <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
            <ProductGrid categoryId={selectedCategory} />
          </div>
        </div>

        {/* Desktop Cart - Hidden on mobile/tablet */}
        <div className="hidden lg:block">
          <Cart />
        </div>
      </div>

      {/* Mobile/Tablet Cart Button - Fixed at bottom */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border z-50">
        <Sheet open={cartOpen} onOpenChange={setCartOpen}>
          <SheetTrigger asChild>
            <Button 
              size="lg" 
              className="w-full h-14 text-lg gap-3 bg-gradient-espresso hover:opacity-90 transition-opacity relative"
            >
              <ShoppingCart className="w-6 h-6" />
              Panier
              {cartItemsCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-7 w-7 rounded-full flex items-center justify-center bg-accent text-accent-foreground">
                  {cartItemsCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-lg p-0">
            <Cart onClose={() => setCartOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};

export default POS;
