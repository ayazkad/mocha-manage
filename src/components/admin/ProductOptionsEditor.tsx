import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Trash2, Plus, Save, X } from 'lucide-react';

interface ProductOptionsEditorProps {
  productId: string;
  productName: string;
  open: boolean;
  onClose: () => void;
}

interface ProductOption {
  id: string;
  product_id: string;
  option_type: string;
  name_en: string | null;
  name_fr: string;
  price_modifier: number | null;
  sort_order: number | null;
  active: boolean | null;
}

const ProductOptionsEditor = ({ productId, productName, open, onClose }: ProductOptionsEditorProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingOption, setEditingOption] = useState<ProductOption | null>(null);
  const [newOption, setNewOption] = useState<{ type: 'size' | 'milk'; name: string; price: string } | null>(null);

  const { data: options, isLoading } = useQuery({
    queryKey: ['product-options', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_options')
        .select('*')
        .eq('product_id', productId)
        .order('option_type')
        .order('sort_order');
      if (error) throw error;
      return data as ProductOption[];
    },
    enabled: open && !!productId,
  });

  const updateMutation = useMutation({
    mutationFn: async (option: Partial<ProductOption> & { id: string }) => {
      const { error } = await supabase
        .from('product_options')
        .update({
          name_en: option.name_en,
          name_fr: option.name_en,
          price_modifier: option.price_modifier,
        })
        .eq('id', option.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-options', productId] });
      setEditingOption(null);
      toast({ title: 'Option updated' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (optionId: string) => {
      const { error } = await supabase
        .from('product_options')
        .delete()
        .eq('id', optionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-options', productId] });
      toast({ title: 'Option deleted' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { type: string; name: string; price: number }) => {
      const maxSortOrder = options?.filter(o => o.option_type === data.type).length || 0;
      const { error } = await supabase
        .from('product_options')
        .insert({
          product_id: productId,
          option_type: data.type,
          name_en: data.name,
          name_fr: data.name,
          price_modifier: data.price,
          sort_order: maxSortOrder + 1,
          active: true,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-options', productId] });
      setNewOption(null);
      toast({ title: 'Option created' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const sizeOptions = options?.filter(o => o.option_type === 'size') || [];
  const milkOptions = options?.filter(o => o.option_type === 'milk') || [];

  const handleSaveEdit = () => {
    if (editingOption) {
      updateMutation.mutate(editingOption);
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

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Options for {productName}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Loading options...</div>
        ) : (
          <div className="space-y-6">
            {/* Size Options */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Size Options</h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setNewOption({ type: 'size', name: '', price: '0' })}
                  disabled={!!newOption}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Size
                </Button>
              </div>
              
              {sizeOptions.length === 0 && !newOption?.type?.includes('size') && (
                <p className="text-sm text-muted-foreground">No size options configured</p>
              )}

              {sizeOptions.map((option) => (
                <div key={option.id} className="flex items-center gap-2 p-3 border rounded-lg bg-card">
                  {editingOption?.id === option.id ? (
                    <>
                      <Input
                        value={editingOption.name_en || ''}
                        onChange={(e) => setEditingOption({ ...editingOption, name_en: e.target.value })}
                        placeholder="Option name"
                        className="flex-1"
                      />
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">+</span>
                        <Input
                          type="number"
                          step="0.01"
                          value={editingOption.price_modifier || 0}
                          onChange={(e) => setEditingOption({ ...editingOption, price_modifier: parseFloat(e.target.value) || 0 })}
                          className="w-24"
                        />
                        <span className="text-muted-foreground">₾</span>
                      </div>
                      <Button size="icon" variant="ghost" onClick={handleSaveEdit}>
                        <Save className="w-4 h-4 text-green-600" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setEditingOption(null)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 font-medium">{option.name_en}</span>
                      <span className="text-muted-foreground">
                        {option.price_modifier && option.price_modifier > 0 ? `+${option.price_modifier} ₾` : 'Base price'}
                      </span>
                      <Button size="icon" variant="ghost" onClick={() => setEditingOption(option)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(option.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              ))}

              {newOption?.type === 'size' && (
                <div className="flex items-center gap-2 p-3 border rounded-lg border-dashed bg-muted/50">
                  <Input
                    value={newOption.name}
                    onChange={(e) => setNewOption({ ...newOption, name: e.target.value })}
                    placeholder="New size name"
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
                  <Button size="icon" variant="ghost" onClick={handleCreateOption}>
                    <Save className="w-4 h-4 text-green-600" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setNewOption(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Milk Options */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Milk Options</h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setNewOption({ type: 'milk', name: '', price: '0' })}
                  disabled={!!newOption}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Milk
                </Button>
              </div>
              
              {milkOptions.length === 0 && !newOption?.type?.includes('milk') && (
                <p className="text-sm text-muted-foreground">No milk options configured</p>
              )}

              {milkOptions.map((option) => (
                <div key={option.id} className="flex items-center gap-2 p-3 border rounded-lg bg-card">
                  {editingOption?.id === option.id ? (
                    <>
                      <Input
                        value={editingOption.name_en || ''}
                        onChange={(e) => setEditingOption({ ...editingOption, name_en: e.target.value })}
                        placeholder="Option name"
                        className="flex-1"
                      />
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">+</span>
                        <Input
                          type="number"
                          step="0.01"
                          value={editingOption.price_modifier || 0}
                          onChange={(e) => setEditingOption({ ...editingOption, price_modifier: parseFloat(e.target.value) || 0 })}
                          className="w-24"
                        />
                        <span className="text-muted-foreground">₾</span>
                      </div>
                      <Button size="icon" variant="ghost" onClick={handleSaveEdit}>
                        <Save className="w-4 h-4 text-green-600" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setEditingOption(null)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 font-medium">{option.name_en}</span>
                      <span className="text-muted-foreground">
                        {option.price_modifier && option.price_modifier > 0 ? `+${option.price_modifier} ₾` : 'Base price'}
                      </span>
                      <Button size="icon" variant="ghost" onClick={() => setEditingOption(option)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(option.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              ))}

              {newOption?.type === 'milk' && (
                <div className="flex items-center gap-2 p-3 border rounded-lg border-dashed bg-muted/50">
                  <Input
                    value={newOption.name}
                    onChange={(e) => setNewOption({ ...newOption, name: e.target.value })}
                    placeholder="New milk name"
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
                  <Button size="icon" variant="ghost" onClick={handleCreateOption}>
                    <Save className="w-4 h-4 text-green-600" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setNewOption(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductOptionsEditor;
