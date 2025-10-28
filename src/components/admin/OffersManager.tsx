import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
}

const OffersManager = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
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
  }, []);

  const loadOffers = async () => {
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Erreur lors du chargement des offres');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const offerData = {
      ...formData,
      applicable_categories: [],
    };

    if (editingOffer) {
      const { error } = await supabase
        .from('offers')
        .update(offerData)
        .eq('id', editingOffer.id);

      if (error) {
        toast.error('Erreur lors de la modification');
        return;
      }

      toast.success('Offre modifiée');
    } else {
      const { error } = await supabase
        .from('offers')
        .insert([offerData]);

      if (error) {
        toast.error('Erreur lors de la création');
        return;
      }

      toast.success('Offre créée');
    }

    resetForm();
    loadOffers();
  };

  const handleEdit = (offer: Offer) => {
    setEditingOffer(offer);
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
    if (!confirm('Supprimer cette offre ?')) return;

    const { error } = await supabase
      .from('offers')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erreur lors de la suppression');
      return;
    }

    toast.success('Offre supprimée');
    loadOffers();
  };

  const resetForm = () => {
    setEditingOffer(null);
    setFormData({
      name: '',
      discount_type: 'percentage',
      discount_value: 0,
      active: true,
      min_items: 0,
      min_amount: 0,
    });
  };

  const toggleActive = async (offer: Offer) => {
    const { error } = await supabase
      .from('offers')
      .update({ active: !offer.active })
      .eq('id', offer.id);

    if (error) {
      toast.error('Erreur lors de la modification');
      return;
    }

    loadOffers();
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Gift className="w-5 h-5" />
          {editingOffer ? 'Modifier l\'offre' : 'Créer une offre'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nom de l'offre</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="discount_type">Type de réduction</Label>
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
                  <SelectItem value="percentage">Pourcentage</SelectItem>
                  <SelectItem value="fixed">Montant fixe</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="discount_value">
                Valeur {formData.discount_type === 'percentage' ? '(%)' : '(₾)'}
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
              <Label htmlFor="min_items">Articles minimum</Label>
              <Input
                id="min_items"
                type="number"
                min="0"
                value={formData.min_items}
                onChange={(e) => setFormData({ ...formData, min_items: parseInt(e.target.value) })}
              />
            </div>

            <div>
              <Label htmlFor="min_amount">Montant minimum (₾)</Label>
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
            <Label>Offre active</Label>
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              <Plus className="w-4 h-4 mr-2" />
              {editingOffer ? 'Modifier' : 'Créer'}
            </Button>
            {editingOffer && (
              <Button type="button" variant="outline" onClick={resetForm}>
                Annuler
              </Button>
            )}
          </div>
        </form>
      </Card>

      <div className="space-y-3">
        <h3 className="text-xl font-semibold">Offres existantes</h3>
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
                    ? `${offer.discount_value}% de réduction`
                    : `${offer.discount_value}₾ de réduction`}
                </p>
                {(offer.min_items > 0 || offer.min_amount > 0) && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Conditions: {offer.min_items > 0 && `${offer.min_items} articles min`}
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