import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface Category {
  id: string;
  name_fr: string;
  name_ru: string;
  name_ge: string;
  icon: string;
}

interface CategoryTabsProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (id: string) => void;
  getCategoryName: (category: Category) => string;
}

const CategoryTabs = ({
  categories,
  selectedCategory,
  onSelectCategory,
  getCategoryName,
}: CategoryTabsProps) => {
  return (
    <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-40">
      <ScrollArea className="w-full max-h-[400px]">
        <div className="grid grid-cols-4 gap-2 p-4 md:p-6">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? 'default' : 'ghost'}
              onClick={() => onSelectCategory(category.id)}
              className={`h-20 flex-col gap-2 font-medium transition-all text-sm touch-manipulation rounded-xl ${
                selectedCategory === category.id 
                  ? 'bg-primary text-primary-foreground shadow-md' 
                  : 'hover:bg-secondary/80'
              }`}
            >
              <span className="text-2xl">{category.icon}</span>
              <span className="text-xs leading-tight text-center">
                {getCategoryName(category)}
              </span>
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default CategoryTabs;
