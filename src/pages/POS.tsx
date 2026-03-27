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
import useEmblaCarousel from 'embla-carousel-react';
import { usePreventVerticalScroll } from '@/hooks/use-prevent-vertical-scroll';

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
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, skipSnaps: false, duration: 20 });

  // Block vertical scroll/swipe on iOS (POS page)
  usePreventVerticalScroll();

  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

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
    return category.name_fr || category.name_en;
  };

  // Sync Tabs -> Carousel
  useEffect(() => {
    if (emblaApi && selectedCategory && categories.length > 0) {
      const index = categories.findIndex(c => c.id === selectedCategory);
      if (index !== -1) {
        emblaApi.scrollTo(index);
      }
    }
  }, [selectedCategory, emblaApi, categories]);

  // Sync Carousel -> Tabs
  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      const index = emblaApi.selectedScrollSnap();
      if (categories[index]) {
        // Only update if different to avoid potential loops, 
        // though setState check handles strict equality usually.
        if (categories[index].id !== selectedCategory) {
          setSelectedCategory(categories[index].id);
        }
      }
    };

    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, categories, selectedCategory]);

  // Force layout recalculation on app resume (visibility change)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Force a complete repaint of the page
        const forceRepaint = () => {
          // Technique 1: Force reflow via offsetHeight
          const root = document.documentElement;
          void root.offsetHeight;

          // Technique 2: Toggle a class to force repaint
          document.body.classList.add('force-repaint');
          requestAnimationFrame(() => {
            document.body.classList.remove('force-repaint');
          });

          // Technique 3: Dispatch resize event
          window.dispatchEvent(new Event('resize'));

          // Technique 4: ReInit Embla carousel if available
          if (emblaApi) {
            emblaApi.reInit();
          }
        };

        // Run immediately
        forceRepaint();

        // Run again after a short delay to catch any delayed rendering issues
        setTimeout(forceRepaint, 50);
        setTimeout(forceRepaint, 150);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [emblaApi]);

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden pos-page">
      <Header />

      <div className="flex-1 grid lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px] overflow-hidden">
        {/* Main content area */}
        <div className="flex flex-col overflow-hidden bg-gradient-to-br from-background via-background to-secondary/5">
          <CategoryTabs
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            getCategoryName={getCategoryName}
          />

          <div className="flex-1 overflow-hidden" ref={emblaRef}>
            <div className="flex touch-pan-y h-full will-change-transform backface-invisible">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex-[0_0_100%] min-w-0 h-full overflow-y-auto"
                >
                  <div className="p-3 md:p-6 pb-24 md:pb-6 min-h-full">
                    <ProductGrid categoryId={category.id} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Desktop Cart - Hidden on mobile/tablet */}
        <div className="hidden lg:block border-l border-border/50 bg-card overflow-hidden">
          <Cart />
        </div>
      </div>

      {/* Mobile/Tablet Cart Button - Fixed at bottom */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-card/95 backdrop-blur-md border-t border-border/50 z-50">
        <Sheet open={cartOpen} onOpenChange={setCartOpen}>
          <SheetTrigger asChild>
            <Button
              size="lg"
              className="w-full h-14 text-base font-semibold gap-3 bg-gradient-primary hover:opacity-90 transition-opacity relative rounded-xl shadow-lg"
            >
              <ShoppingCart className="w-6 h-6" />
              Panier
              {cartItemsCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-8 w-8 rounded-full flex items-center justify-center bg-accent text-accent-foreground font-bold shadow-md">
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
