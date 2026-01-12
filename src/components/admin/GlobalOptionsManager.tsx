import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Save, X, Plus, Trash2, GripVertical } from 'lucide-react';
import SwipeableListItem, { SwipeableList } from './SwipeableListItem';

interface OptionGroup {
  name_en: string;
  option_type: string;
  price_modifier: number;
  count: number;
  sort_order: number;
}

const GlobalOptionsManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingOption, setEditingOption] = useState<OptionGroup | null>(null);
  const [editedValues, setEditedValues] = useState({ name: '', price: '' });
  const [newOption, setNewOption] = useState<{ type: 'size' | 'milk'; name: string; price: string } | null>(null);

  // Fetch unique options grouped by name and type
  const { data: options, isLoading } = useQuery({
    queryKey: ['global-options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_options')
        .select('name_en, option_type, price_modifier, sort_order')
        .order('option_type')
        .order('sort_order');
      
      if (error) throw error;

      // Group by name and type to get unique options
      const grouped = data.reduce((acc: Record<string, OptionGroup>, item) => {
        const key = `${item.option_type}-${item.name_en}`;
        if (!acc[key]) {
          acc[key] = {
            name_en: item.name_en || '',
            option_type: item.option_type,
            price_modifier: item.price_modifier || 0,
            count: 0,
            sort_order: item.sort_order || 0,
          };
        }
        acc[key].count++;
        return acc;
      }, {});

      return Object.values(grouped);
    },
  });

  // Update all options with the same name and type
  const updateMutation = useMutation({
    mutationFn: async ({ oldName, oldType, newName, newPrice }: { oldName: string; oldType: string; newName: string; newPrice: number }) => {
      const { error } = await supabase
        .from('product_options')
        .update({
          name_en: newName,
          name_fr: newName,
          price_modifier: newPrice,
        })
        .eq('name_en', oldName)
        .eq('option_type', oldType);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-options'] });
      queryClient.invalidateQueries({ queryKey: ['product-options'] });
      setEditingOption(null);
      toast({ title: 'Options updated for all products' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });


  // Delete all options with the same name and type
  const deleteMutation = useMutation({
    mutationFn: async ({ name, type }: { name: string; type: string }) => {
      const { error } = await supabase
        .from('product_options')
        .delete()
        .eq('name_en', name)
        .eq('option_type', type);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-options'] });
      queryClient.invalidateQueries({ queryKey: ['product-options'] });
      toast({ title: 'Option deleted from all products' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Add new option to all products with size/milk options
  const createMutation = useMutation({
    mutationFn: async ({ type, name, price }: { type: string; name: string; price: number }) => {
      const column = type === 'size' ? 'has_size_options' : 'has_milk_options';
      const { data: products, error: fetchError } = await supabase
        .from('products')
        .select('id')
        .eq(column, true);
      
      if (fetchError) throw fetchError;
      if (!products || products.length === 0) {
        throw new Error('No products with this option type enabled');
      }

      const { data: existingOptions } = await supabase
        .from('product_options')
        .select('sort_order')
        .eq('option_type', type)
        .order('sort_order', { ascending: false })
        .limit(1);
      
      const maxSortOrder = existingOptions?.[0]?.sort_order || 0;

      const inserts = products.map(product => ({
        product_id: product.id,
        option_type: type,
        name_en: name,
        name_fr: name,
        price_modifier: price,
        sort_order: maxSortOrder + 1,
        active: true,
      }));

      const { error } = await supabase.from('product_options').insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-options'] });
      queryClient.invalidateQueries({ queryKey: ['product-options'] });
      setNewOption(null);
      toast({ title: 'Option added to all products' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleStartEdit = (option: OptionGroup) => {
    setEditingOption(option);
    setEditedValues({ name: option.name_en, price: option.price_modifier.toString() });
  };

  const handleSaveEdit = () => {
    if (editingOption && editedValues.name.trim()) {
      updateMutation.mutate({
        oldName: editingOption.name_en,
        oldType: editingOption.option_type,
        newName: editedValues.name.trim(),
        newPrice: parseFloat(editedValues.price) || 0,
      });
    }
  };

  const handleCreateOption = () => {
    if (newOption && newOption.name.trim()) {
      createMutation.mutate({
        type: newOption.type,
        name: newOption.name.trim(),
        price: parseFloat(newOption.price) || 0,
      });
    }
  };

  const handleMoveOptionTo = async (optionsList: OptionGroup[], fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    const next = [...optionsList];
    const [moved] = next.splice(fromIndex, 1);
    if (!moved) return;
    next.splice(toIndex, 0, moved);

    try {
      await Promise.all(
        next.map((opt, idx) =>
          supabase
            .from('product_options')
            .update({ sort_order: idx })
            .eq('name_en', opt.name_en)
            .eq('option_type', opt.option_type)
        )
      );
      queryClient.invalidateQueries({ queryKey: ['global-options'] });
      queryClient.invalidateQueries({ queryKey: ['product-options'] });
    } catch (error: any) {
      console.error('Error updating option order:', error);
      toast({ title: 'Error', description: error?.message, variant: 'destructive' });
    }
  };

  const sizeOptions = options?.filter(o => o.option_type === 'size').sort((a, b) => a.sort_order - b.sort_order) || [];
  const milkOptions = options?.filter(o => o.option_type === 'milk').sort((a, b) => a.sort_order - b.sort_order) || [];

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading options...</div>;
  }

  const renderOptionsList = (optionsList: OptionGroup[], type: 'size' | 'milk') => (
    <>
      {optionsList.length === 0 && !newOption?.type?.includes(type) && (
        <p className="text-sm text-muted-foreground">No {type} options configured</p>
      )}

      <SwipeableList>
        {optionsList.map((option, index) => (
          <SwipeableListItem
            key={`${option.option_type}-${option.name_en}`}
            index={index}
            listSize={optionsList.length}
            onMoveTo={(toIndex) => handleMoveOptionTo(optionsList, index, toIndex)}
            onClick={() => handleStartEdit(option)}
            className="relative"
          >
            <div className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors bg-background">
              {editingOption?.name_en === option.name_en && editingOption?.option_type === option.option_type ? (
                <>
                  <Input
                    value={editedValues.name}
                    onChange={(e) => setEditedValues({ ...editedValues, name: e.target.value })}
                    placeholder="Option name"
                    className="flex-1"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">+</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={editedValues.price}
                      onChange={(e) => setEditedValues({ ...editedValues, price: e.target.value })}
                      className="w-24"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="text-muted-foreground">₾</span>
                  </div>
                  <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); handleSaveEdit(); }} disabled={updateMutation.isPending}>
                    <Save className="w-4 h-4 text-green-600" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditingOption(null); }}>
                    <X className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <>
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                  <span className="flex-1 font-medium">{option.name_en}</span>
                  <span className="text-muted-foreground">
                    {option.price_modifier > 0 ? `+${option.price_modifier} ₾` : 'Base price'}
                  </span>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                    {option.count} products
                  </span>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMutation.mutate({ name: option.name_en, type: option.option_type });
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </>
              )}
            </div>
          </SwipeableListItem>
        ))}
      </SwipeableList>

      {newOption?.type === type && (
        <div className="flex items-center gap-2 p-3 border rounded-lg border-dashed bg-muted/50">
          <Input
            value={newOption.name}
            onChange={(e) => setNewOption({ ...newOption, name: e.target.value })}
            placeholder={`New ${type} name`}
            className="flex-1"
            autoFocus
          />
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">+</span>
            <Input
              type="number"
              step="0.01"
              value={newOption.price}
              onChange={(e) => setNewOption({ ...newOption, price: e.target.value })}
              className="w-24"
            />
            <span className="text-muted-foreground">₾</span>
          </div>
          <Button size="icon" variant="ghost" onClick={handleCreateOption} disabled={createMutation.isPending}>
            <Save className="w-4 h-4 text-green-600" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setNewOption(null)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
    </>
  );

  return (
    <div className="space-y-6">
      {/* Size Options */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Size Options</CardTitle>
            <p className="text-sm text-muted-foreground">Long press and slide to reorder</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setNewOption({ type: 'size', name: '', price: '0' })}
            disabled={!!newOption}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Size
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {renderOptionsList(sizeOptions, 'size')}
        </CardContent>
      </Card>

      {/* Milk Options */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Milk Options</CardTitle>
            <p className="text-sm text-muted-foreground">Long press and slide to reorder</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setNewOption({ type: 'milk', name: '', price: '0' })}
            disabled={!!newOption}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Milk
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {renderOptionsList(milkOptions, 'milk')}
        </CardContent>
      </Card>
    </div>
  );
};

export default GlobalOptionsManager;