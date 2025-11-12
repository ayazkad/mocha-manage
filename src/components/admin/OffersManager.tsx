import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, Gift } from 'lucide-react';

interface Offer {
  id: string;
  name: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  active: boolean;
  min_items: number;
  min_amount: number;
  applicable_categories: string[];
  applicable_products: string[];
}

interface Product {
  id: string;
  name_fr: string;
  name_en: string;
  category_id: string;
}

const OffersManager = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: 0,
    active: true,
    min_items: 0,
    min_amount: 0,
  });

  useEffect(() => {
    loadOffers();
    loadCategories();
    loadProducts();
  }, []);

  const loadOffers = async () => {
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Error loading offers');
      return;
    }

    setOffers((data || []) as Offer[]);
  };

  const loadCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('active', true)
      .order('sort_order');

    setCategories(data || []);
  };

  const loadProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('id, name_fr, name_en, category_id')
      .eq('active', true)
      .order('name_fr');

    setProducts(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const offerData = {
      ...formData,
      applicable_categories: [],
      applicable_products: selectedProducts,
    };

    if (editingOffer) {
      const { error } = await supabase
        .from('offers')
        .update(offerData)
        .eq('id', editingOffer.id);

      if (error) {
        toast.error('Error updating offer');
        return;
      }

      toast.success('Offer updated');
    } else {
      const { error } = await supabase
        .from('offers')
        .insert([offerData]);

      if (error) {
        toast.error('Error creating offer');
        return;
      }

      toast.success('Offer created');
    }

    resetForm();
    loadOffers();
  };

  const handleEdit = (offer: Offer) => {
    setEditingOffer(offer);
    setSelectedProducts(offer.applicable_products || []);
    setFormData({
      name: offer.name,
      discount_type: offer.discount_type,
      discount_value: offer.discount_value,
      active: offer.active,
      min_items: offer.min_items,
      min_amount: offer.min_amount,
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this offer?')) return;

    const { error } = await supabase
      .from('offers')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Error deleting offer');
      return;
    }

    toast.success('Offer deleted');
    loadOffers();
  };

  const resetForm = () => {
    setEditingOffer(null);
    setSelectedProducts([]);
    setFormData({
      name: '',
      discount_type: 'percentage',
      discount_value: 0,
      active: true,
      min_items: 0,
      min_amount: 0,
    });
  };

  const toggleProductSelection = (productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const getProductName = (product: Product) => {
    return product.name_en || product.name_fr;
  };

  const toggleActive = async (offer: Offer) => {
    const { error } = await supabase
      .from('offers')
      .update({ active: !offer.active })
      .eq('id', offer.id);

    if (error) {
      toast.error('Error updating offer');
      return;
    }

    loadOffers();
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Gift className="w-5 h-5" />
          {editingOffer ? 'Edit Offer' : 'Create Offer'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Offer Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="discount_type">Discount Type</Label>
              <Select
                value={formData.discount_type}
                onValueChange={(value: 'percentage' | 'fixed') =>
                  setFormData({ ...formData, discount_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="discount_value">
                Value {formData.discount_type === 'percentage' ? '(%)' : '(₾)'}
              </Label>
              <Input
                id="discount_value"
                type="number"
                min="0"
                step="0.01"
                value={formData.discount_value}
                onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="min_items">Minimum Items</Label>
              <Input
                id="min_items"
                type="number"
                min="0"
                value={formData.min_items}
                onChange={(e) => setFormData({ ...formData, min_items: parseInt(e.target.value) })}
              />
            </div>

            <div>
              <Label htmlFor="min_amount">Minimum Amount (₾)</Label>
              <Input
                id="min_amount"
                type="number"
                min="0"
                step="0.01"
                value={formData.min_amount}
                onChange={(e) => setFormData({ ...formData, min_amount: parseFloat(e.target.value) })}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={formData.active}
              onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
            />
            <Label>Active Offer</Label>
          </div>

          <div className="space-y-2">
            <Label>Applicable Products</Label>
            <ScrollArea className="h-48 border rounded-lg p-3">
              <div className="space-y-2">
                {products.map((product) => (
                  <div key={product.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`product-${product.id}`}
                      checked={selectedProducts.includes(product.id)}
                      onCheckedChange={() => toggleProductSelection(product.id)}
                    />
                    <Label
                      htmlFor={`product-${product.id}`}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {getProductName(product)}
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <p className="text-xs text-muted-foreground">
              {selectedProducts.length === 0
                ? "No products selected - offer will apply to all products"
                : `${selectedProducts.length} product(s) selected`}
            </p>
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              <Plus className="w-4 h-4 mr-2" />
              {editingOffer ? 'Update' : 'Create'}
            </Button>
            {editingOffer && (
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </Card>

      <div className="space-y-3">
        <h3 className="text-xl font-semibold">Existing Offers</h3>
        {offers.map((offer) => (
          <Card key={offer.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold">{offer.name}</h4>
                  <Switch
                    checked={offer.active}
                    onCheckedChange={() => toggleActive(offer)}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  {offer.discount_type === 'percentage'
                    ? `${offer.discount_value}% discount`
                    : `${offer.discount_value}₾ discount`}
                </p>
                {(offer.min_items > 0 || offer.min_amount > 0 || offer.applicable_products?.length > 0) && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {offer.applicable_products?.length > 0 && (
                      <span>{offer.applicable_products.length} product(s) • </span>
                    )}
                    {offer.min_items > 0 && `${offer.min_items} items min`}
                    {offer.min_items > 0 && offer.min_amount > 0 && ' • '}
                    {offer.min_amount > 0 && `${offer.min_amount}₾ min`}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(offer)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(offer.id)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default OffersManager;