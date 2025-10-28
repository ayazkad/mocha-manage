import { usePOS } from '@/contexts/POSContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, Trash2, CheckCircle, CreditCard, Banknote, Percent, Gift } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import CustomerLoyalty from './CustomerLoyalty';
import DiscountDialog from './DiscountDialog';

interface CartProps {
  onClose?: () => void;
}

const Cart = ({ onClose }: CartProps) => {
  const {
    cart,
    removeFromCart,
    clearCart,
    getTotalPrice,
    currentSession,
    currentEmployee,
  } = usePOS();
  const [processing, setProcessing] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showPaymentMethod, setShowPaymentMethod] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'cash' | 'card' | null>(null);
  const [showCashCalculator, setShowCashCalculator] = useState(false);
  const [amountReceived, setAmountReceived] = useState(0);
  const [showDiscountDialog, setShowDiscountDialog] = useState(false);
  const [manualDiscountPercent, setManualDiscountPercent] = useState(0);
  const [appliedOffer, setAppliedOffer] = useState<any>(null);

  const subtotal = getTotalPrice();
  const itemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  
  // Calculer la réduction automatique des offres
  useEffect(() => {
    const checkOffers = async () => {
      const { data: offers } = await supabase
        .from('offers')
        .select('*')
        .eq('active', true)
        .lte('min_items', itemsCount)
        .lte('min_amount', subtotal)
        .order('discount_value', { ascending: false })
        .limit(1);

      if (offers && offers.length > 0) {
        setAppliedOffer(offers[0]);
      } else {
        setAppliedOffer(null);
      }
    };

    if (cart.length > 0) {
      checkOffers();
    } else {
      setAppliedOffer(null);
    }
  }, [cart, subtotal, itemsCount]);

  // Calculer les réductions
  const automaticDiscount = appliedOffer
    ? appliedOffer.discount_type === 'percentage'
      ? (subtotal * appliedOffer.discount_value) / 100
      : appliedOffer.discount_value
    : 0;
  
  const manualDiscount = (subtotal * manualDiscountPercent) / 100;
  const totalDiscount = automaticDiscount + manualDiscount;
  const total = Math.max(0, subtotal - totalDiscount);

  const handlePaymentMethodClick = () => {
    if (cart.length === 0) {
      toast.error('Le panier est vide');
      return;
    }
    setShowPaymentMethod(true);
  };

  const handleCashPayment = () => {
    setShowPaymentMethod(false);
    setShowCashCalculator(true);
    setAmountReceived(0);
  };

  const handleCardPayment = () => {
    handleCompleteOrder('card');
  };

  const addBill = (amount: number) => {
    setAmountReceived(prev => prev + amount);
  };

  const resetCash = () => {
    setAmountReceived(0);
  };

  const getChange = () => {
    return Math.max(0, amountReceived - total);
  };

  const canCompleteCashPayment = () => {
    return amountReceived >= total;
  };

  const completeCashPayment = () => {
    if (canCompleteCashPayment()) {
      handleCompleteOrder('cash');
    }
  };

  const handleCompleteOrder = async (paymentMethod: 'cash' | 'card') => {
    if (!currentSession || !currentEmployee) {
      toast.error('Session invalide');
      return;
    }

    setProcessing(true);

    try {
      // Create order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{
          order_number: '',
          session_id: currentSession.id,
          employee_id: currentEmployee.id,
          status: 'pending',
          subtotal,
          tax_amount: 0,
          discount_amount: totalDiscount,
          total,
          payment_method: paymentMethod,
          notes: appliedOffer ? `Offre appliquée: ${appliedOffer.name}` : undefined,
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cart.map((item) => ({
        order_id: orderData.id,
        product_id: item.productId,
        product_name: item.productName,
        quantity: item.quantity,
        unit_price: item.basePrice +
          (item.selectedSize?.priceModifier || 0) +
          (item.selectedMilk?.priceModifier || 0),
        total_price: (item.basePrice +
          (item.selectedSize?.priceModifier || 0) +
          (item.selectedMilk?.priceModifier || 0)) * item.quantity,
        selected_options: JSON.stringify({
          size: item.selectedSize,
          milk: item.selectedMilk,
        }),
        notes: item.notes,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Complete order
      const { error: completeError } = await supabase
        .from('orders')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', orderData.id);

      if (completeError) throw completeError;

      // Update customer loyalty points if customer selected
      if (selectedCustomer) {
        const itemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
        const shouldRedeem = selectedCustomer.points >= 10;

        if (shouldRedeem) {
          // Redeem reward (reset points to 0, add transaction)
          await supabase
            .from('customers')
            .update({ 
              points: 0,
              total_purchases: selectedCustomer.total_purchases + itemsCount 
            })
            .eq('id', selectedCustomer.id);

          await supabase
            .from('customer_transactions')
            .insert([{
              customer_id: selectedCustomer.id,
              order_id: orderData.id,
              points_redeemed: 10,
              notes: 'Boisson offerte utilisée'
            }]);

          toast.success('🎁 Boisson offerte appliquée!');
        } else {
          // Add points
          await supabase
            .from('customers')
            .update({ 
              points: selectedCustomer.points + itemsCount,
              total_purchases: selectedCustomer.total_purchases + itemsCount 
            })
            .eq('id', selectedCustomer.id);

          await supabase
            .from('customer_transactions')
            .insert([{
              customer_id: selectedCustomer.id,
              order_id: orderData.id,
              points_added: itemsCount,
            }]);
        }
      }

      // Update session totals
      const { data: sessionData } = await supabase
        .from('sessions')
        .select('total_sales, total_orders')
        .eq('id', currentSession.id)
        .single();

      if (sessionData) {
        await supabase
          .from('sessions')
          .update({
            total_sales: (sessionData.total_sales || 0) + total,
            total_orders: (sessionData.total_orders || 0) + 1,
          })
          .eq('id', currentSession.id);
      }

      toast.success(`Commande ${orderData.order_number} validée`);
      clearCart();
      setSelectedCustomer(null);
      setShowPaymentMethod(false);
      setSelectedPaymentMethod(null);
      setShowCashCalculator(false);
      setAmountReceived(0);
      setManualDiscountPercent(0);
      setAppliedOffer(null);
      onClose?.();
    } catch (error) {
      console.error('Error completing order:', error);
      toast.error('Erreur lors de la validation de la commande');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="w-full h-full bg-card/95 backdrop-blur-sm flex flex-col border-l border-border/50">
      <div className="p-4 md:p-6 border-b border-border/50 bg-secondary/30 shrink-0">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-card-foreground">Panier</h2>
          <span className="ml-auto text-sm text-muted-foreground">
            {cart.length} article{cart.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-6">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-12">
            <ShoppingCart className="w-16 h-16 mb-4 opacity-20" />
            <p>Votre panier est vide</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {cart.map((item, index) => (
              <Card key={index} className="p-3.5 space-y-2 border-border/50 bg-card/50 hover:bg-card/80 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm leading-tight text-card-foreground">
                      {item.productName}
                    </h3>
                    {item.selectedSize && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.selectedSize.name}
                      </p>
                    )}
                    {item.selectedMilk && (
                      <p className="text-xs text-muted-foreground">
                        {item.selectedMilk.name}
                      </p>
                    )}
                    {item.notes && (
                      <p className="text-xs text-muted-foreground italic mt-1">
                        {item.notes}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 hover:bg-destructive/10 rounded-lg"
                    onClick={() => removeFromCart(index)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>

                <div className="flex items-center justify-between text-sm pt-1">
                  <span className="text-muted-foreground">
                    Qté: {item.quantity}
                  </span>
                  <span className="font-bold text-primary">
                    {(
                      (item.basePrice +
                        (item.selectedSize?.priceModifier || 0) +
                        (item.selectedMilk?.priceModifier || 0)) *
                      item.quantity
                    ).toFixed(2)}{' '}
                    ₾
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
        </div>

        {cart.length > 0 && (
          <div className="p-4 md:p-6 border-t border-border/50 bg-secondary/30 shrink-0">
            <CustomerLoyalty onCustomerSelected={setSelectedCustomer} />
          </div>
        )}

        {cart.length > 0 && (
          <div className="p-4 md:p-6 border-t border-border/50 bg-secondary/30 shrink-0 space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sous-total</span>
                <span className="text-card-foreground">{subtotal.toFixed(2)} ₾</span>
              </div>
              
              {appliedOffer && (
                <div className="flex justify-between items-center text-green-600">
                  <span className="flex items-center gap-1">
                    <Gift className="w-4 h-4" />
                    {appliedOffer.name}
                  </span>
                  <span>-{automaticDiscount.toFixed(2)} ₾</span>
                </div>
              )}
              
              {manualDiscountPercent > 0 && (
                <div className="flex justify-between items-center text-orange-600">
                  <span className="flex items-center gap-1">
                    <Percent className="w-4 h-4" />
                    Réduction {manualDiscountPercent}%
                  </span>
                  <span>-{manualDiscount.toFixed(2)} ₾</span>
                </div>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDiscountDialog(true)}
                className="w-full mt-2"
              >
                <Percent className="w-4 h-4 mr-2" />
                {manualDiscountPercent > 0 ? 'Modifier la réduction' : 'Appliquer une réduction'}
              </Button>
              
              <Separator />
              <div className="flex justify-between text-xl font-bold pt-2">
                <span className="text-card-foreground">Total</span>
                <span className="text-primary">{total.toFixed(2)} ₾</span>
              </div>
            </div>

            {!showPaymentMethod && !showCashCalculator && (
              <Button
                onClick={handlePaymentMethodClick}
                disabled={processing}
                className="w-full h-12 bg-gradient-primary hover:opacity-90 transition-opacity gap-2 text-base font-semibold rounded-xl shadow-md"
              >
                <CheckCircle className="w-5 h-5" />
                Valider la commande
              </Button>
            )}

            {showPaymentMethod && !showCashCalculator && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-center text-muted-foreground mb-2">
                  Choisissez le mode de paiement
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={handleCashPayment}
                    disabled={processing}
                    className="h-20 flex-col gap-2 bg-card hover:bg-accent border-2 border-border hover:border-primary transition-all rounded-xl"
                    variant="outline"
                  >
                    <Banknote className="w-8 h-8" />
                    <span className="text-sm font-semibold">Espèces</span>
                  </Button>
                  <Button
                    onClick={handleCardPayment}
                    disabled={processing}
                    className="h-20 flex-col gap-2 bg-card hover:bg-accent border-2 border-border hover:border-primary transition-all rounded-xl"
                    variant="outline"
                  >
                    <CreditCard className="w-8 h-8" />
                    <span className="text-sm font-semibold">Carte</span>
                  </Button>
                </div>
                <Button
                  onClick={() => setShowPaymentMethod(false)}
                  variant="ghost"
                  className="w-full rounded-xl"
                  disabled={processing}
                >
                  Retour
                </Button>
              </div>
            )}

            {showCashCalculator && (
              <div className="space-y-4">
                <div className="space-y-3 p-4 bg-muted/50 rounded-xl">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total à payer</span>
                    <span className="text-lg font-bold text-card-foreground">{total.toFixed(2)} ₾</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Montant reçu</span>
                    <span className="text-lg font-bold text-primary">{amountReceived.toFixed(2)} ₾</span>
                  </div>
                  {amountReceived >= total && (
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-sm font-semibold text-card-foreground">Rendu à donner</span>
                      <span className="text-2xl font-bold text-green-600">{getChange().toFixed(2)} ₾</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-center text-muted-foreground">Billets géorgiens</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[200, 100, 50, 20, 10, 5, 2, 1].map((bill) => (
                      <Button
                        key={bill}
                        onClick={() => addBill(bill)}
                        variant="outline"
                        className="h-14 text-base font-semibold hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        {bill} ₾
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={resetCash}
                    variant="outline"
                    className="rounded-xl"
                    disabled={processing}
                  >
                    Effacer
                  </Button>
                  <Button
                    onClick={completeCashPayment}
                    disabled={!canCompleteCashPayment() || processing}
                    className="bg-gradient-primary hover:opacity-90 transition-opacity rounded-xl"
                  >
                    {processing ? 'Traitement...' : 'Valider'}
                  </Button>
                </div>

                <Button
                  onClick={() => {
                    setShowCashCalculator(false);
                    setShowPaymentMethod(true);
                    setAmountReceived(0);
                  }}
                  variant="ghost"
                  className="w-full rounded-xl"
                  disabled={processing}
                >
                  ← Retour aux modes de paiement
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <DiscountDialog
        open={showDiscountDialog}
        onClose={() => setShowDiscountDialog(false)}
        onApply={setManualDiscountPercent}
        currentDiscount={manualDiscountPercent}
      />
    </div>
  );
};

export default Cart;
