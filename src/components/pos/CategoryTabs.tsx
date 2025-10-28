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
    <div className="border-b border-border bg-card sticky top-0 z-40">
      <ScrollArea className="w-full">
        <div className="flex gap-2 px-4 md:px-6 py-3 md:py-4">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? 'default' : 'ghost'}
              onClick={() => onSelectCategory(category.id)}
              className="whitespace-nowrap h-12 md:h-11 px-6 md:px-8 font-medium transition-all text-base md:text-sm touch-manipulation"
            >
              {getCategoryName(category)}
            </Button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};

export default CategoryTabs;
