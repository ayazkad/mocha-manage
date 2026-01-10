import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Trash2, GripVertical } from 'lucide-react';
import SwipeableListItem, { SwipeableList } from './SwipeableListItem';

const CategoriesManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name_en: '',
    icon: '',
    active: true,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingId) {
        const { error } = await supabase
          .from('categories')
          .update(data)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('categories')
          .insert([data]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      resetForm();
      toast({ title: editingId ? 'Category updated' : 'Category created' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({ title: 'Category deleted' });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async ({ categoryId, newOrder }: { categoryId: string; newOrder: number }) => {
      const { error } = await supabase
        .from('categories')
        .update({ sort_order: newOrder })
        .eq('id', categoryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name_en: '',
      icon: '',
      active: true,
    });
  };

  const handleEdit = (category: any) => {
    setEditingId(category.id);
    setFormData({
      name_en: category.name_en || '',
      icon: category.icon || '',
      active: category.active,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const maxSortOrder = categories?.reduce((max, cat) => Math.max(max, cat.sort_order || 0), 0) || 0;
    saveMutation.mutate({
      name_en: formData.name_en,
      name_fr: formData.name_en,
      icon: formData.icon || null,
      active: formData.active,
      sort_order: editingId ? undefined : maxSortOrder + 1,
    });
  };

  const handleMoveUp = (index: number) => {
    if (!categories || index === 0) return;
    
    const currentCategory = categories[index];
    const previousCategory = categories[index - 1];
    
    reorderMutation.mutate({ categoryId: currentCategory.id, newOrder: previousCategory.sort_order || 0 });
    reorderMutation.mutate({ categoryId: previousCategory.id, newOrder: currentCategory.sort_order || 0 });
  };

  const handleMoveDown = (index: number) => {
    if (!categories || index === categories.length - 1) return;
    
    const currentCategory = categories[index];
    const nextCategory = categories[index + 1];
    
    reorderMutation.mutate({ categoryId: currentCategory.id, newOrder: nextCategory.sort_order || 0 });
    reorderMutation.mutate({ categoryId: nextCategory.id, newOrder: currentCategory.sort_order || 0 });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? 'Edit Category' : 'Add New Category'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name_en">Category Name</Label>
                <Input
                  id="name_en"
                  value={formData.name_en}
                  onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="icon">Icon (emoji)</Label>
                <Input
                  id="icon"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="☕"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
              <Label htmlFor="active">Active</Label>
            </div>

            <div className="flex gap-2">
              <Button type="submit">
                {editingId ? 'Update' : 'Create'}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Categories List</CardTitle>
          <p className="text-sm text-muted-foreground">Long press and slide to reorder</p>
        </CardHeader>
        <CardContent>
          <SwipeableList>
            {categories?.map((category, index) => (
              <SwipeableListItem
                key={category.id}
                index={index}
                onMoveUp={() => handleMoveUp(index)}
                onMoveDown={() => handleMoveDown(index)}
                canMoveUp={index > 0}
                canMoveDown={index < (categories?.length || 0) - 1}
                onClick={() => handleEdit(category)}
                className="relative"
              >
                <div className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors bg-background">
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <h3 className="font-semibold flex items-center gap-2">
                        {category.icon && <span>{category.icon}</span>}
                        {category.name_en}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {!category.active && 'Inactive'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMutation.mutate(category.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </SwipeableListItem>
            ))}
          </SwipeableList>
        </CardContent>
      </Card>
    </div>
  );
};

export default CategoriesManager;
