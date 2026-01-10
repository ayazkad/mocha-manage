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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Wrench, Percent, Coffee, Cookie, Trash2, Moon, Sun } from 'lucide-react';
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
  const { currentEmployee, currentSession, cart, clearCart, setStaffDiscountActive, updateCartItem, setFreeDrinkActive, setFreeSnackActive, darkMode, toggleDarkMode } = usePOS();
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
      toast.error('Please add items to cart first');
      return;
    }

    // Apply 30% to all existing items that don't have 100% discount
    cart.forEach((item, index) => {
      if (item.discount !== 100) {
        updateCartItem(index, { ...item, discount: 30 });
      }
    });

    // Activate discount for future items
    setStaffDiscountActive(true);
    toast.success('30% staff discount applied to all items');
    onClose();
  };

  const applyFreeDrink = async () => {
    if (!currentEmployee || benefits.free_drink_used) return;

    if (cart.length === 0) {
      toast.error('Please add a drink to cart first');
      return;
    }

    setLoading(true);
    try {
      // Find the last item in cart that doesn't have 100% discount
      let drinkIndex = -1;
      for (let i = cart.length - 1; i >= 0; i--) {
        if (cart[i].discount !== 100) {
          drinkIndex = i;
          break;
        }
      }

      if (drinkIndex === -1) {
        toast.error('All items already have 100% discount');
        setLoading(false);
        return;
      }

      const item = cart[drinkIndex];
      
      // Apply 100% discount
      updateCartItem(drinkIndex, { ...item, discount: 100 });

      setFreeDrinkActive(true);
      
      toast.success('Free drink applied (100% discount)');
      onClose();
    } catch (error) {
      console.error('Error applying free drink:', error);
      toast.error('Error applying benefit');
    } finally {
      setLoading(false);
    }
  };

  const applyFreeSnack = async () => {
    if (!currentEmployee || benefits.free_snack_used) return;

    if (cart.length === 0) {
      toast.error('Please add a snack to cart first');
      return;
    }

    setLoading(true);
    try {
      // Look for a Sweet or Salt category product
      const categories = await supabase
        .from('categories')
        .select('id, name_en')
        .in('name_en', ['Sweet', 'Salt']);

      const sweetSaltCategoryIds = categories.data?.map(cat => cat.id) || [];

      // Find the last Sweet/Salt product in cart that doesn't have 100% discount
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
        toast.error('No Sweet/Salt product available without 100% discount');
        setLoading(false);
        return;
      }

      const item = cart[snackIndex];
      
      // Apply 100% discount
      updateCartItem(snackIndex, { ...item, discount: 100 });

      setFreeSnackActive(true);

      toast.success('Free snack applied (100% discount)');
      onClose();
    } catch (error) {
      console.error('Error applying free snack:', error);
      toast.error('Error applying benefit');
    } finally {
      setLoading(false);
    }
  };

  const recordLosses = async () => {
    if (!currentEmployee || !currentSession || cart.length === 0) {
      toast.error('Cart is empty');
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
      toast.success(`${losses.length} loss(es) recorded`);
      onClose();
    } catch (error) {
      console.error('Error recording losses:', error);
      toast.error('Error recording losses');
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
            Tools
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Dark Mode Toggle */}
          <div className="space-y-3">
            <h3 className="font-semibold text-base">Display</h3>
            
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {darkMode ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
                  <div>
                    <p className="font-medium">Dark Mode</p>
                    <p className="text-xs text-muted-foreground">
                      Switch between light and dark theme
                    </p>
                  </div>
                </div>
                <Switch
                  checked={darkMode}
                  onCheckedChange={toggleDarkMode}
                />
              </div>
            </Card>
          </div>

          {/* Staff Benefits */}
          <div className="space-y-3">
            <h3 className="font-semibold text-base">Staff Benefits</h3>
            
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Percent className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">30% Discount</p>
                    <p className="text-xs text-muted-foreground">
                      Max 3 tickets per day ({discountTicketsCount}/3)
                    </p>
                  </div>
                </div>
                {discountTicketsCount >= 3 ? (
                  <Badge variant="secondary">Limit reached</Badge>
                ) : (
                  <Button
                    size="sm"
                    onClick={applyStaffDiscount}
                    disabled={loading || cart.length === 0}
                    className="rounded-xl"
                  >
                    Apply
                  </Button>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Coffee className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">Free Drink</p>
                    <p className="text-xs text-muted-foreground">Once per day</p>
                  </div>
                </div>
                {benefits.free_drink_used ? (
                  <Badge variant="secondary">Used</Badge>
                ) : (
                  <Button
                    size="sm"
                    onClick={applyFreeDrink}
                    disabled={loading}
                    className="rounded-xl"
                  >
                    Apply
                  </Button>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Cookie className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">Free Sweet/Salt</p>
                    <p className="text-xs text-muted-foreground">Once per day</p>
                  </div>
                </div>
                {benefits.free_snack_used ? (
                  <Badge variant="secondary">Used</Badge>
                ) : (
                  <Button
                    size="sm"
                    onClick={applyFreeSnack}
                    disabled={loading}
                    className="rounded-xl"
                  >
                    Apply
                  </Button>
                )}
              </div>
            </Card>
          </div>

          {/* Loss Management */}
          <div className="space-y-3">
            <h3 className="font-semibold text-base">Loss Management</h3>
            
            <Card className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Trash2 className="w-5 h-5 text-destructive mt-1" />
                  <div>
                    <p className="font-medium">Record Losses</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Products currently in cart will be recorded as losses
                    </p>
                    {cart.length > 0 && (
                      <p className="text-xs text-primary mt-2">
                        {cart.length} product(s) in cart
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
                  Record
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