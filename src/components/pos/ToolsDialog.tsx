import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePOS } from '@/contexts/POSContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wrench, Percent, Coffee, Cookie, Trash2, Printer, Bluetooth, Wifi } from 'lucide-react';
import { toast } from 'sonner';

interface ToolsDialogProps {
  open: boolean;
  onClose: () => void;
}

interface DailyBenefits {
  discount_used: boolean;
  free_drink_used: boolean;
  free_snack_used: boolean;
}

const ToolsDialog = ({ open, onClose }: ToolsDialogProps) => {
  const { currentEmployee, currentSession, cart, clearCart, setStaffDiscountActive, updateCartItem, setFreeDrinkActive, setFreeSnackActive } = usePOS();
  const [benefits, setBenefits] = useState<DailyBenefits>({
    discount_used: false,
    free_drink_used: false,
    free_snack_used: false,
  });
  const [loading, setLoading] = useState(false);
  const [discountTicketsCount, setDiscountTicketsCount] = useState(0);

  useEffect(() => {
    if (open && currentEmployee) {
      loadBenefits();
    }
  }, [open, currentEmployee]);

  const loadBenefits = async () => {
    if (!currentEmployee) return;

    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('employee_daily_benefits')
      .select('*')
      .eq('employee_id', currentEmployee.id)
      .eq('benefit_date', today)
      .single();

    if (data) {
      setBenefits({
        discount_used: data.discount_used,
        free_drink_used: data.free_drink_used,
        free_snack_used: data.free_snack_used,
      });
      setDiscountTicketsCount(data.discount_tickets_count || 0);
    } else if (error && error.code !== 'PGRST116') {
      // Create entry for today if it doesn't exist
      const { data: newData } = await supabase
        .from('employee_daily_benefits')
        .insert([{
          employee_id: currentEmployee.id,
          benefit_date: today,
        }])
        .select()
        .single();

      if (newData) {
        setBenefits({
          discount_used: false,
          free_drink_used: false,
          free_snack_used: false,
        });
      }
    }
  };

  const applyStaffDiscount = async () => {
    if (!currentEmployee || discountTicketsCount >= 3) return;

    if (cart.length === 0) {
      toast.error('Veuillez ajouter des articles au panier d\'abord');
      return;
    }

    // Appliquer 30% à tous les articles existants qui n'ont pas déjà 100% de réduction
    cart.forEach((item, index) => {
      if (item.discount !== 100) {
        updateCartItem(index, { ...item, discount: 30 });
      }
    });

    // Active la réduction pour les futurs articles
    setStaffDiscountActive(true);
    toast.success('Réduction personnel de 30% appliquée sur tous les articles');
    onClose();
  };

  const applyFreeDrink = async () => {
    if (!currentEmployee || benefits.free_drink_used) return;

    if (cart.length === 0) {
      toast.error('Veuillez ajouter une boisson au panier d\'abord');
      return;
    }

    setLoading(true);
    try {
      // Trouver le dernier article dans le panier qui n'a pas déjà 100% de réduction
      let drinkIndex = -1;
      for (let i = cart.length - 1; i >= 0; i--) {
        if (cart[i].discount !== 100) {
          drinkIndex = i;
          break;
        }
      }

      if (drinkIndex === -1) {
        toast.error('Tous les articles ont déjà une réduction de 100%');
        setLoading(false);
        return;
      }

      const item = cart[drinkIndex];
      
      // Appliquer 100% de réduction
      updateCartItem(drinkIndex, { ...item, discount: 100 });

      setFreeDrinkActive(true);
      
      toast.success('Boisson offerte appliquée (100% de réduction)');
      onClose();
    } catch (error) {
      console.error('Error applying free drink:', error);
      toast.error('Erreur lors de l\'application');
    } finally {
      setLoading(false);
    }
  };

  const applyFreeSnack = async () => {
    if (!currentEmployee || benefits.free_snack_used) return;

    if (cart.length === 0) {
      toast.error('Veuillez ajouter un snack au panier d\'abord');
      return;
    }

    setLoading(true);
    try {
      // Chercher un produit de catégorie Sweet ou Salt
      const categories = await supabase
        .from('categories')
        .select('id, name_en')
        .in('name_en', ['Sweet', 'Salt']);

      const sweetSaltCategoryIds = categories.data?.map(cat => cat.id) || [];

      // Trouver le dernier produit Sweet/Salt dans le panier qui n'a pas déjà 100% de réduction
      let snackIndex = -1;
      for (let i = cart.length - 1; i >= 0; i--) {
        if (cart[i].discount === 100) continue; // Skip items already at 100%
        
        const { data: product } = await supabase
          .from('products')
          .select('category_id')
          .eq('id', cart[i].productId)
          .single();
        
        if (product && sweetSaltCategoryIds.includes(product.category_id)) {
          snackIndex = i;
          break;
        }
      }

      if (snackIndex === -1) {
        toast.error('Aucun produit Sweet/Salt disponible sans réduction de 100%');
        setLoading(false);
        return;
      }

      const item = cart[snackIndex];
      
      // Appliquer 100% de réduction
      updateCartItem(snackIndex, { ...item, discount: 100 });

      setFreeSnackActive(true);

      toast.success('Snack offert appliqué (100% de réduction)');
      onClose();
    } catch (error) {
      console.error('Error applying free snack:', error);
      toast.error('Erreur lors de l\'application');
    } finally {
      setLoading(false);
    }
  };

  const recordLosses = async () => {
    if (!currentEmployee || !currentSession || cart.length === 0) {
      toast.error('Le panier est vide');
      return;
    }

    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const losses = cart.map(item => {
        const itemPrice = item.basePrice +
          (item.selectedSize?.priceModifier || 0) +
          (item.selectedMilk?.priceModifier || 0);
        
        return {
          employee_id: currentEmployee.id,
          session_id: currentSession.id,
          product_id: item.productId,
          product_name: item.productName,
          quantity: item.quantity,
          unit_price: itemPrice,
          total_loss: itemPrice * item.quantity,
          loss_date: today,
        };
      });

      const { error } = await supabase
        .from('daily_losses')
        .insert(losses);

      if (error) throw error;

      clearCart();
      toast.success(`${losses.length} perte(s) enregistrée(s)`);
      onClose();
    } catch (error) {
      console.error('Error recording losses:', error);
      toast.error('Erreur lors de l\'enregistrement des pertes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Wrench className="w-5 h-5" />
            Outils
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Avantages employés */}
          <div className="space-y-3">
            <h3 className="font-semibold text-base">Avantages Personnel</h3>
            
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Percent className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">Réduction 30%</p>
                    <p className="text-xs text-muted-foreground">
                      Max 3 tickets par jour ({discountTicketsCount}/3)
                    </p>
                  </div>
                </div>
                {discountTicketsCount >= 3 ? (
                  <Badge variant="secondary">Limite atteinte</Badge>
                ) : (
                  <Button
                    size="sm"
                    onClick={applyStaffDiscount}
                    disabled={loading || cart.length === 0}
                    className="rounded-xl"
                  >
                    Appliquer
                  </Button>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Coffee className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">Boisson offerte</p>
                    <p className="text-xs text-muted-foreground">1 fois par jour</p>
                  </div>
                </div>
                {benefits.free_drink_used ? (
                  <Badge variant="secondary">Utilisé</Badge>
                ) : (
                  <Button
                    size="sm"
                    onClick={applyFreeDrink}
                    disabled={loading}
                    className="rounded-xl"
                  >
                    Appliquer
                  </Button>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Cookie className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">Sweet/Salt offert</p>
                    <p className="text-xs text-muted-foreground">1 fois par jour</p>
                  </div>
                </div>
                {benefits.free_snack_used ? (
                  <Badge variant="secondary">Utilisé</Badge>
                ) : (
                  <Button
                    size="sm"
                    onClick={applyFreeSnack}
                    disabled={loading}
                    className="rounded-xl"
                  >
                    Appliquer
                  </Button>
                )}
              </div>
            </Card>
          </div>

          {/* Configuration imprimante */}
          <div className="space-y-3">
            <h3 className="font-semibold text-base">Configuration Imprimante</h3>
            
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bluetooth className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="font-medium">Imprimante Bluetooth</p>
                    <p className="text-xs text-muted-foreground">
                      Connexion aux imprimantes thermiques 80mm
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled
                  className="rounded-xl"
                >
                  Configurer
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Wifi className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="font-medium">Imprimante WiFi</p>
                    <p className="text-xs text-muted-foreground">
                      Connexion réseau aux imprimantes
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled
                  className="rounded-xl"
                >
                  Configurer
                </Button>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-xs text-amber-900 dark:text-amber-100">
                  <strong>Note:</strong> La connexion directe aux imprimantes Bluetooth/WiFi nécessite une application native. 
                  En PWA, vous devrez utiliser le dialogue d'impression du système.
                </p>
              </div>
            </Card>
          </div>

          {/* Comptage des pertes */}
          <div className="space-y-3">
            <h3 className="font-semibold text-base">Gestion des Pertes</h3>
            
            <Card className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Trash2 className="w-5 h-5 text-destructive mt-1" />
                  <div>
                    <p className="font-medium">Enregistrer les pertes</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Les produits actuellement dans le panier seront enregistrés comme pertes
                    </p>
                    {cart.length > 0 && (
                      <p className="text-xs text-primary mt-2">
                        {cart.length} produit(s) dans le panier
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={recordLosses}
                  disabled={loading || cart.length === 0}
                  className="rounded-xl whitespace-nowrap"
                >
                  Enregistrer
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ToolsDialog;