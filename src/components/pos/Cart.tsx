import { usePOS } from '@/contexts/POSContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, Trash2, CheckCircle, CreditCard, Banknote, Percent, Gift, Edit2, Plus, Minus } from 'lucide-react';
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
    updateCartItem,
    clearCart,
    getTotalPrice,
    currentSession,
    currentEmployee,
    staffDiscountActive,
    freeDrinkActive,
    freeSnackActive,
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
  const [selectedItems, setSelectedItems] = useState<number[]>([]);

  const getRawSubtotal = () => {
    return cart.reduce((total, item) => {
      const sizeModifier = item.selectedSize?.priceModifier || 0;
      const milkModifier = item.selectedMilk?.priceModifier || 0;
      const itemPrice = (item.basePrice + sizeModifier + milkModifier) * item.quantity;
      return total + itemPrice;
    }, 0);
  };

  const subtotal = getRawSubtotal();
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
        .order('discount_value', { ascending: false });

      if (offers && offers.length > 0) {
        // Filtrer les offres applicables selon les produits du panier
        const applicableOffer = offers.find(offer => {
          // Si aucun produit spécifique n'est défini, l'offre s'applique à tous
          if (!offer.applicable_products || offer.applicable_products.length === 0) {
            return true;
          }
          // Vérifier si au moins un produit du panier est dans la liste des produits applicables
          return cart.some(item => offer.applicable_products.includes(item.productId));
        });

        setAppliedOffer(applicableOffer || null);
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

  // Calculer les réductions et total sans TVA
  const automaticDiscount = appliedOffer
    ? appliedOffer.discount_type === 'percentage'
      ? (subtotal * appliedOffer.discount_value) / 100
      : appliedOffer.discount_value
    : 0;
  
  // Calculate manual discount from items
  const itemDiscounts = cart.reduce((sum, item) => {
    const itemPrice = (item.basePrice +
      (item.selectedSize?.priceModifier || 0) +
      (item.selectedMilk?.priceModifier || 0)) * item.quantity;
    const discount = item.discount || 0;
    return sum + (itemPrice * discount / 100);
  }, 0);
  
  const totalDiscount = automaticDiscount + itemDiscounts;
  const total = Math.max(0, subtotal - totalDiscount);

  const handleQuantityChange = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(index);
      setSelectedItems(selectedItems.filter(i => i !== index));
    } else {
      const item = cart[index];
      updateCartItem(index, { ...item, quantity: newQuantity });
    }
  };

  const toggleItemSelection = (index: number) => {
    setSelectedItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === cart.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(cart.map((_, index) => index));
    }
  };

  const applyDiscountToItems = (percentage: number, applyToAll: boolean) => {
    console.log('applyDiscountToItems called:', { percentage, applyToAll, selectedItemsLength: selectedItems.length });
    
    if (applyToAll || selectedItems.length === 0) {
      // Apply to all items if applyToAll is true OR if no items are selected
      console.log('Applying discount to ALL items');
      cart.forEach((item, index) => {
        updateCartItem(index, { ...item, discount: percentage });
      });
      setSelectedItems([]);
    } else if (selectedItems.length > 0) {
      // Apply only to selected items
      console.log('Applying discount to SELECTED items:', selectedItems);
      selectedItems.forEach(index => {
        const item = cart[index];
        updateCartItem(index, { ...item, discount: percentage });
      });
      setSelectedItems([]);
    }
  };

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
        // Calculer uniquement les produits Coffee et Non Coffee pour les points de fidélité
        const productIds = cart.map(item => item.productId);
        const { data: products } = await supabase
          .from('products')
          .select(`
            id,
            category_id,
            categories!inner (
              name_en,
              name_fr
            )
          `)
          .in('id', productIds);

        console.log('Products with categories:', products);

        // Compter seulement les produits des catégories Coffee et Non Coffee
        const drinkCount = cart.reduce((sum, item) => {
          const product = products?.find((p: any) => p.id === item.productId);
          if (product?.categories) {
            // Bien nettoyer les espaces
            const categoryNameEn = (product.categories.name_en || '').trim().toLowerCase();
            const categoryNameFr = (product.categories.name_fr || '').trim().toLowerCase();
            
            console.log(`Product ${item.productName}: EN="${categoryNameEn}", FR="${categoryNameFr}"`);
            
            // Vérifier si c'est Coffee ou Non Coffee (exactement, après trim)
            const isCoffeeCategory = categoryNameEn === 'coffee' || categoryNameFr === 'coffee';
            const isNonCoffeeCategory = categoryNameEn === 'non coffee' || categoryNameFr === 'non coffee';
            
            console.log(`Is coffee: ${isCoffeeCategory}, Is non-coffee: ${isNonCoffeeCategory}`);
            
            if (isCoffeeCategory || isNonCoffeeCategory) {
              console.log(`✅ Adding ${item.quantity} points for ${item.productName}`);
              return sum + item.quantity;
            } else {
              console.log(`❌ Skipping ${item.productName} (category: ${categoryNameEn})`);
            }
          }
          return sum;
        }, 0);

        console.log(`Total drinks count: ${drinkCount}`);

        const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
        const shouldRedeem = selectedCustomer.points >= 10;

        if (shouldRedeem) {
          // Redeem reward (reset points to 0, add transaction)
          await supabase
            .from('customers')
            .update({ 
              points: 0,
              total_purchases: selectedCustomer.total_purchases + totalItemsCount 
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
          // Add points only for Coffee and Non Coffee products
          if (drinkCount > 0) {
            console.log(`Adding ${drinkCount} points to customer`);
            await supabase
              .from('customers')
              .update({ 
                points: selectedCustomer.points + drinkCount,
                total_purchases: selectedCustomer.total_purchases + totalItemsCount 
              })
              .eq('id', selectedCustomer.id);

            await supabase
              .from('customer_transactions')
              .insert([{
                customer_id: selectedCustomer.id,
                order_id: orderData.id,
                points_added: drinkCount,
              }]);
          } else {
            console.log('No drinks in cart, only updating total purchases');
            // Update only total purchases if no drinks
            await supabase
              .from('customers')
              .update({ 
                total_purchases: selectedCustomer.total_purchases + totalItemsCount 
              })
              .eq('id', selectedCustomer.id);
          }
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

      // Incrémenter le compteur de tickets avec réduction personnel si applicable et marquer comme utilisé
      if (staffDiscountActive) {
        const today = new Date().toISOString().split('T')[0];
        const { data: benefitsData } = await supabase
          .from('employee_daily_benefits')
          .select('discount_tickets_count, discount_used')
          .eq('employee_id', currentEmployee.id)
          .eq('benefit_date', today)
          .maybeSingle();

        if (benefitsData) {
          await supabase
            .from('employee_daily_benefits')
            .update({ 
              discount_tickets_count: (benefitsData.discount_tickets_count || 0) + 1,
              discount_used: true
            })
            .eq('employee_id', currentEmployee.id)
            .eq('benefit_date', today);
        } else {
          await supabase
            .from('employee_daily_benefits')
            .insert({
              employee_id: currentEmployee.id,
              benefit_date: today,
              discount_tickets_count: 1,
              discount_used: true
            });
        }
      }
      
      // Marquer la boisson gratuite comme utilisée si applicable
      if (freeDrinkActive) {
        const today = new Date().toISOString().split('T')[0];
        await supabase
          .from('employee_daily_benefits')
          .update({ free_drink_used: true })
          .eq('employee_id', currentEmployee.id)
          .eq('benefit_date', today);
      }
      
      // Marquer le snack gratuit comme utilisé si applicable
      if (freeSnackActive) {
        const today = new Date().toISOString().split('T')[0];
        await supabase
          .from('employee_daily_benefits')
          .update({ free_snack_used: true })
          .eq('employee_id', currentEmployee.id)
          .eq('benefit_date', today);
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
      setSelectedItems([]);
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
      {/* Header */}
      <div className="p-3 border-b border-border/50 bg-secondary/30 shrink-0">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-primary" />
          <h2 className="text-base font-semibold text-card-foreground">Panier</h2>
          <span className="ml-auto text-xs text-muted-foreground">
            {cart.length} article{cart.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Cart Items */}
      <ScrollArea className="flex-1 max-h-[400px]">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground py-12 min-h-[300px]">
            <ShoppingCart className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm">Votre panier est vide</p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {/* Select All checkbox */}
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-border/30">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                <input
                  type="checkbox"
                  checked={selectedItems.length === cart.length && cart.length > 0}
                  onChange={toggleSelectAll}
                  className="w-3.5 h-3.5 rounded border-border accent-primary"
                />
                <span>Tout sélectionner</span>
              </label>
              {selectedItems.length > 0 && (
                <span className="text-xs text-primary font-medium">
                  {selectedItems.length} sélectionné{selectedItems.length > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Cart items list */}
            {cart.map((item, index) => {
              const itemPrice = item.basePrice +
                (item.selectedSize?.priceModifier || 0) +
                (item.selectedMilk?.priceModifier || 0);
              const itemTotal = itemPrice * item.quantity;
              const itemDiscount = item.discount || 0;
              const discountedTotal = itemTotal * (1 - itemDiscount / 100);

              return (
                <div key={index} className={`bg-card/50 rounded-lg p-2 border-2 transition-colors ${
                  selectedItems.includes(index) ? 'border-primary' : 'border-border/30'
                }`}>
                  <div className="flex gap-2">
                    <label className="flex items-center shrink-0 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(index)}
                        onChange={() => toggleItemSelection(index)}
                        className="w-3.5 h-3.5 rounded border-border accent-primary"
                      />
                    </label>

                    {/* Product image */}
                    <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.productName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ShoppingCart className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1 mb-0.5">
                        <h3 className="font-semibold text-xs leading-tight text-card-foreground">
                          {item.productName}
                        </h3>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 text-destructive hover:bg-destructive/10 rounded-md"
                          onClick={() => removeFromCart(index)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>

                      {(item.selectedSize || item.selectedMilk) && (
                        <p className="text-[10px] text-muted-foreground mb-1">
                          {[item.selectedSize?.name, item.selectedMilk?.name]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          {itemDiscount > 0 ? (
                            <>
                              <span className="text-[10px] text-muted-foreground line-through">
                                {itemTotal.toFixed(2)} ₾
                              </span>
                              <span className="font-bold text-sm text-primary">
                                {discountedTotal.toFixed(2)} ₾
                              </span>
                              <span className="text-[9px] text-green-600">
                                -{itemDiscount}%
                              </span>
                            </>
                          ) : (
                            <span className="font-bold text-sm text-card-foreground">
                              {itemTotal.toFixed(2)} ₾
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-0.5">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6 rounded-md"
                            onClick={() => handleQuantityChange(index, item.quantity - 1)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-7 text-center font-medium text-xs">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6 rounded-md"
                            onClick={() => handleQuantityChange(index, item.quantity + 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Customer Loyalty - always visible */}
      <div className="p-2 border-t border-border/50 bg-secondary/30 shrink-0">
        <CustomerLoyalty onCustomerSelected={setSelectedCustomer} />
      </div>

      {/* Footer - always visible */}
      <div className="p-3 border-t border-border/50 bg-secondary/30 shrink-0 space-y-2">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Sub Total</span>
              <span className="font-semibold text-card-foreground">{subtotal.toFixed(2)} ₾</span>
            </div>
            
            {(appliedOffer || itemDiscounts > 0) && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  {appliedOffer && <Gift className="w-3 h-3" />}
                  {itemDiscounts > 0 && <Percent className="w-3 h-3" />}
                  Discount
                </span>
                <span className="font-semibold text-destructive">
                  -{totalDiscount.toFixed(2)} ₾
                </span>
              </div>
            )}
            
            <Separator />
            
            <div className="flex justify-between text-base font-bold">
              <span className="text-card-foreground">Total Payment</span>
              <span className="text-primary">{total.toFixed(2)} ₾</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDiscountDialog(true)}
                className="justify-between rounded-lg h-9 text-xs"
                disabled={cart.length === 0}
              >
                <span className="flex items-center gap-1.5">
                  <Percent className="w-3 h-3" />
                  {selectedItems.length > 0 
                    ? `Réduction (${selectedItems.length})`
                    : 'Réduction'
                  }
                </span>
              </Button>
              <Button
                variant="outline"
                onClick={() => applyDiscountToItems(0, true)}
                className="rounded-lg h-9 text-xs text-destructive hover:text-destructive"
                disabled={cart.length === 0 || itemDiscounts === 0}
              >
                Retirer
              </Button>
            </div>
          </div>

          {!showPaymentMethod && !showCashCalculator && (
            <Button
              onClick={handlePaymentMethodClick}
              disabled={processing}
              className="w-full h-11 bg-[#F5A623] hover:bg-[#E09612] text-white transition-colors gap-2 text-base font-semibold rounded-lg shadow-md"
            >
              Pay Now
            </Button>
          )}

          {showPaymentMethod && !showCashCalculator && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-center text-muted-foreground">
                Choisissez le mode de paiement
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={handleCashPayment}
                  disabled={processing}
                  className="h-16 flex-col gap-1.5 bg-card hover:bg-accent border-2 border-border hover:border-primary transition-all rounded-lg"
                  variant="outline"
                >
                  <Banknote className="w-6 h-6" />
                  <span className="text-xs font-semibold">Espèces</span>
                </Button>
                <Button
                  onClick={handleCardPayment}
                  disabled={processing}
                  className="h-16 flex-col gap-1.5 bg-card hover:bg-accent border-2 border-border hover:border-primary transition-all rounded-lg"
                  variant="outline"
                >
                  <CreditCard className="w-6 h-6" />
                  <span className="text-xs font-semibold">Carte</span>
                </Button>
              </div>
              <Button
                onClick={() => setShowPaymentMethod(false)}
                variant="ghost"
                className="w-full rounded-lg h-8 text-xs"
                disabled={processing}
              >
                Retour
              </Button>
            </div>
          )}

          {showCashCalculator && (
            <div className="space-y-2">
              <div className="space-y-2 p-2 bg-muted/50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Total à payer</span>
                  <span className="text-sm font-bold text-card-foreground">{total.toFixed(2)} ₾</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Montant reçu</span>
                  <span className="text-sm font-bold text-primary">{amountReceived.toFixed(2)} ₾</span>
                </div>
                {amountReceived >= total && (
                  <div className="flex justify-between items-center pt-1 border-t">
                    <span className="text-xs font-semibold text-card-foreground">Rendu à donner</span>
                    <span className="text-base font-bold text-green-600">{getChange().toFixed(2)} ₾</span>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-center text-muted-foreground">Billets géorgiens</p>
                <div className="grid grid-cols-4 gap-1">
                  {[200, 100, 50, 20, 10, 5, 2, 1].map((bill) => (
                    <Button
                      key={bill}
                      onClick={() => addBill(bill)}
                      variant="outline"
                      className="h-10 text-xs font-semibold hover:bg-primary hover:text-primary-foreground transition-colors"
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
                  className="rounded-lg h-9 text-xs"
                  disabled={processing}
                >
                  Effacer
                </Button>
                <Button
                  onClick={completeCashPayment}
                  disabled={!canCompleteCashPayment() || processing}
                  className="bg-gradient-primary hover:opacity-90 transition-opacity rounded-lg h-9 text-xs"
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
                className="w-full rounded-lg h-8 text-xs"
                disabled={processing}
              >
                ← Retour aux modes de paiement
              </Button>
            </div>
          )}
        </div>

      <DiscountDialog
        open={showDiscountDialog}
        onClose={() => setShowDiscountDialog(false)}
        onApply={applyDiscountToItems}
        hasSelection={selectedItems.length > 0}
      />
    </div>
  );
};

export default Cart;
