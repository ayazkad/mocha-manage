import { usePOS } from '@/contexts/POSContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, Trash2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import CustomerLoyalty from './CustomerLoyalty';

const Cart = () => {
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

  const subtotal = getTotalPrice();
  const total = subtotal;

  const handleCompleteOrder = async () => {
    if (cart.length === 0) {
      toast.error('Le panier est vide');
      return;
    }

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
          total: subtotal,
          payment_method: 'card',
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
    } catch (error) {
      console.error('Error completing order:', error);
      toast.error('Erreur lors de la validation de la commande');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="w-full md:w-96 bg-card border-l border-border flex flex-col shadow-medium">
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Panier</h2>
          <span className="ml-auto text-sm text-muted-foreground">
            {cart.length} article{cart.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-12">
            <ShoppingCart className="w-16 h-16 mb-4 opacity-30" />
            <p>Votre panier est vide</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cart.map((item, index) => (
              <Card key={index} className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm leading-tight">
                      {item.productName}
                    </h3>
                    {item.selectedSize && (
                      <p className="text-xs text-muted-foreground">
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
                    className="h-8 w-8 shrink-0"
                    onClick={() => removeFromCart(index)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Qté: {item.quantity}
                  </span>
                  <span className="font-semibold text-primary">
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
      </ScrollArea>

      <div className="p-4 border-t border-border">
        <CustomerLoyalty onCustomerSelected={setSelectedCustomer} />
      </div>

      {cart.length > 0 && (
        <div className="p-4 border-t border-border bg-muted/30 space-y-4">
          <div className="space-y-2 text-sm">
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-primary">{total.toFixed(2)} ₾</span>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              onClick={handleCompleteOrder}
              disabled={processing}
              className="w-full h-12 bg-gradient-espresso hover:opacity-90 transition-opacity gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              {processing ? 'Traitement...' : 'Valider la commande'}
            </Button>
            <Button
              onClick={clearCart}
              variant="outline"
              className="w-full"
              disabled={processing}
            >
              Vider le panier
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;
