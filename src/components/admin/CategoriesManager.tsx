import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Trash2, GripVertical, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import SwipeableListItem, { SwipeableList } from './SwipeableListItem';
import { useAuth } from '@/contexts/AuthContext';

const CategoriesManager = () => {
  const { businessId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name_en: '',
    icon: '',
    active: true,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('business_id', businessId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
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
          .insert([{ ...data, business_id: businessId }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setEditingId(null);
      setFormData({
        name_en: '',
        icon: '',
        active: true,
      });
      setIsDialogOpen(false);
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


  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name_en: '',
      icon: '',
      active: true,
    });
  };

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleEdit = (category: any) => {
    setEditingId(category.id);
    setFormData({
      name_en: category.name_en || '',
      icon: category.icon || '',
      active: category.active,
    });
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    resetForm();
    setIsDialogOpen(true);
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

  const handleMoveTo = async (fromIndex: number, toIndex: number) => {
    if (!categories) return;
    if (fromIndex === toIndex) return;

    const next = [...categories];
    const [moved] = next.splice(fromIndex, 1);
    if (!moved) return;
    next.splice(toIndex, 0, moved);

    try {
      await Promise.all(
        next.map((cat, idx) =>
          supabase
            .from('categories')
            .update({ sort_order: idx })
            .eq('id', cat.id)
            .eq('business_id', businessId)
        )
      );
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    } catch (error: any) {
      console.error('Error updating category order:', error);
      toast({
        title: 'Error updating order',
        description: error?.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Categories List</h2>
          <p className="text-sm text-muted-foreground">Long press and slide to reorder</p>
        </div>
        <Button onClick={handleAdd} size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> Add Category
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[90%] rounded-2xl border-none shadow-xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Category' : 'Add New Category'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
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

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingId ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="space-y-2">
        <SwipeableList>
          {categories?.map((category, index) => (
            <SwipeableListItem
              key={category.id}
              index={index}
              listSize={categories?.length || 0}
              onMoveTo={(toIndex) => handleMoveTo(index, toIndex)}
              onClick={() => handleEdit(category)}
              className="relative"
            >
              <div className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors bg-card">
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
      </div>
    </div>
  );
};

export default CategoriesManager;
