import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePOS } from '@/contexts/POSContext';
import { supabase } from '@/integrations/supabase/client';
import ProductGrid from '@/components/pos/ProductGrid';
import Cart from '@/components/pos/Cart';
import Header from '@/components/pos/Header';
import CategoryTabs from '@/components/pos/CategoryTabs';

interface Category {
  id: string;
  name_fr: string;
  name_ru: string;
  name_ge: string;
  icon: string;
}

const POS = () => {
  const { currentEmployee } = usePOS();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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
    return category.name_fr;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <CategoryTabs
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            getCategoryName={getCategoryName}
          />
          
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <ProductGrid categoryId={selectedCategory} />
          </div>
        </div>

        <Cart />
      </div>
    </div>
  );
};

export default POS;
