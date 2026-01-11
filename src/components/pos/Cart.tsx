import { usePOS } from '@/contexts/POSContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, Trash2, CheckCircle, CreditCard, Banknote, Percent, Gift, Edit2, Plus, Minus, AlertTriangle, X, UserPlus, ScanLine } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import CustomerLoyalty from './CustomerLoyalty';
import DiscountDialog from './DiscountDialog';
import PrintReceiptDialog from './PrintReceiptDialog';
import CashPaymentDialog from './CashPaymentDialog';
import AddCustomerDialog from './AddCustomerDialog';
import UnifiedScanner from './UnifiedScanner';

interface CartProps {
  onClose?: () => void;
}

const Cart = ({ onClose }: CartProps) => {
  const { cart, removeFromCart, updateCartItem, updateAllCartItems, clearCart, getTotalPrice, currentSession, currentEmployee, staffDiscountActive, freeDrinkActive, freeSnackActive, isModifyingOrder, originalOrder, cancelOrderModification, getPriceDifference } = usePOS();
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
  const [showPrintReceipt, setShowPrintReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

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
        const applicableOffer = offers.find(offer => {
          if (!offer.applicable_products || offer.applicable_products.length === 0) {
            return true;
          }
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

  const automaticDiscount = appliedOffer ? appliedOffer.discount_type === 'percentage' ? (subtotal * appliedOffer.discount_value) / 100 : appliedOffer.discount_value : 0;

  const itemDiscounts = cart.reduce((sum, item) => {
    const itemPrice = (item.basePrice + (item.selectedSize?.priceModifier || 0) + (item.selectedMilk?.priceModifier || 0)) * item.quantity;
    const discount = item.discount || 0;
    return sum + (itemPrice * discount / 100);
  }, 0);

  const [drinkProductIds, setDrinkProductIds] = useState<string[]>([]);

  useEffect(() => {
    const loadDrinkCategories = async () => {
      const productIds = cart.map(item => item.productId).filter(Boolean);
      if (productIds.length === 0) {
        setDrinkProductIds([]);
        return;
      }

      const { data: products } = await supabase
        .from('products')
        .select(`id, category_id, categories!inner ( name_en, name_fr )`)
        .in('id', productIds);

      if (products) {
        const drinkIds = products
          .filter((p: any) => {
            const categoryNameEn = (p.categories?.name_en || '').trim().toLowerCase();
            const categoryNameFr = (p.categories?.name_fr || '').trim().toLowerCase();
            return categoryNameEn === 'coffee' || categoryNameEn === 'non coffee' ||
              categoryNameFr === 'coffee' || categoryNameFr === 'non coffee';
          })
          .map((p: any) => p.id);
        setDrinkProductIds(drinkIds);
      }
    };

    loadDrinkCategories();
  }, [cart]);

  const freeDrinkDiscount = selectedCustomer && selectedCustomer.points >= 10 ? (() => {
    const drinks = cart
      .filter(item => drinkProductIds.includes(item.productId))
      .map((item, index) => ({
        index,
        item,
        unitPrice: item.basePrice + (item.selectedSize?.priceModifier || 0) + (item.selectedMilk?.priceModifier || 0)
      }));

    if (drinks.length === 0) return 0;

    const cheapestDrink = drinks.reduce((cheapest, current) => {
      if (!cheapest || current.unitPrice < cheapest.unitPrice) {
        return current;
      }
      return cheapest;
    }, null as { index: number; item: any; unitPrice: number } | null);

    return cheapestDrink ? cheapestDrink.unitPrice : 0;
  })() : 0;

  const totalDiscount = automaticDiscount + itemDiscounts + freeDrinkDiscount;
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
    setSelectedItems(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]);
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === cart.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(cart.map((_, index) => index));
    }
  };

  const applyDiscountToItems = (percentage: number, applyToAll: boolean) => {
    if (applyToAll) {
      const updatedCart = cart.map(item => ({ ...item, discount: percentage }));
      updateAllCartItems(updatedCart);
    } else if (selectedItems.length > 0) {
      const updatedCart = cart.map((item, index) =>
        selectedItems.includes(index) ? { ...item, discount: percentage } : item
      );
      updateAllCartItems(updatedCart);
    }
    setSelectedItems([]);
  };

  const handlePaymentMethodClick = () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    setShowPaymentMethod(true);
  };

  const handleCashPayment = () => {
    setShowPaymentMethod(false);
    setShowCashCalculator(true);
  };

  const handleCashConfirm = (amountPaid: number) => {
    setAmountReceived(amountPaid);
    handleCompleteOrder('cash', amountPaid);
  };

  const handleCardPayment = () => {
    handleCompleteOrder('card', 0);
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
      handleCompleteOrder('cash', amountReceived);
    }
  };

  const handleUpdateModifiedOrder = async (paymentMethod: 'cash' | 'card', cashAmount: number = 0) => {
    if (!originalOrder || !currentSession || !currentEmployee) return;

    try {
      const priceDiff = getPriceDifference();

      await supabase
        .from('order_items')
        .delete()
        .eq('order_id', originalOrder.orderId);

      const orderItems = cart.map((item) => ({
        order_id: originalOrder.orderId,
        product_id: item.productId,
        product_name: item.productName,
        quantity: item.quantity,
        unit_price: item.basePrice + (item.selectedSize?.priceModifier || 0) + (item.selectedMilk?.priceModifier || 0),
        total_price: (item.basePrice + (item.selectedSize?.priceModifier || 0) + (item.selectedMilk?.priceModifier || 0)) * item.quantity,
        selected_options: JSON.stringify({
          size: item.selectedSize,
          milk: item.selectedMilk,
        }),
        notes: item.notes,
      }));

      await supabase.from('order_items').insert(orderItems);

      await supabase
        .from('orders')
        .update({
          subtotal,
          discount_amount: totalDiscount,
          total,
          notes: `Modifié: différence ${priceDiff >= 0 ? '+' : ''}${priceDiff.toFixed(2)} ₾`,
        })
        .eq('id', originalOrder.orderId);

      if (priceDiff !== 0) {
        const { data: sessionData } = await supabase
          .from('sessions')
          .select('total_sales')
          .eq('id', currentSession.id)
          .single();

        if (sessionData) {
          await supabase
            .from('sessions')
            .update({
              total_sales: (sessionData.total_sales || 0) + priceDiff,
            })
            .eq('id', currentSession.id);
        }
      }

      const now = new Date();
      const receiptInfo = {
        orderId: originalOrder.orderId,
        orderNumber: originalOrder.orderNumber,
        employeeName: currentEmployee.name,
        date: now.toLocaleDateString('en-US'),
        time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        items: cart.map(item => ({
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.basePrice + (item.selectedSize?.priceModifier || 0) + (item.selectedMilk?.priceModifier || 0),
          totalPrice: (item.basePrice + (item.selectedSize?.priceModifier || 0) + (item.selectedMilk?.priceModifier || 0)) * item.quantity,
          selectedSize: item.selectedSize,
          selectedMilk: item.selectedMilk,
          discount: item.discount
        })),
        subtotal,
        discount: totalDiscount,
        total,
        paymentMethod: paymentMethod,
        amountPaid: priceDiff >= 0 ? cashAmount : 0,
        change: priceDiff >= 0 && paymentMethod === 'cash' ? Math.max(0, cashAmount - priceDiff) : Math.abs(priceDiff)
      };

      if (priceDiff < 0) {
        toast.success(`Remboursement: ${Math.abs(priceDiff).toFixed(2)} ₾ à rendre`);
      } else if (priceDiff > 0) {
        toast.success(`Encaissé: ${priceDiff.toFixed(2)} ₾`);
      } else {
        toast.success('Ticket modifié (pas de différence)');
      }

      setReceiptData(receiptInfo);
      setShowPrintReceipt(true);
      setAppliedOffer(null);
      setSelectedItems([]);
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Erreur lors de la modification');
    } finally {
      setProcessing(false);
    }
  };

  const handleCompleteOrder = async (paymentMethod: 'cash' | 'card', cashAmount: number = 0) => {
    if (!currentSession || !currentEmployee) {
      toast.error('Invalid session');
      return;
    }

    setProcessing(true);

    try {
      if (isModifyingOrder && originalOrder) {
        await handleUpdateModifiedOrder(paymentMethod, cashAmount);
        return;
      }

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
          cash_received: paymentMethod === 'cash' ? cashAmount : null,
          notes: appliedOffer ? `Offre appliquée: ${appliedOffer.name}` : undefined,
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = cart.map((item) => ({
        order_id: orderData.id,
        product_id: item.productId,
        product_name: item.productName,
        quantity: item.quantity,
        unit_price: item.basePrice + (item.selectedSize?.priceModifier || 0) + (item.selectedMilk?.priceModifier || 0),
        total_price: (item.basePrice + (item.selectedSize?.priceModifier || 0) + (item.selectedMilk?.priceModifier || 0)) * item.quantity,
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

      const { error: completeError } = await supabase
        .from('orders')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', orderData.id);

      if (completeError) throw completeError;

      let drinkCount = 0;

      if (selectedCustomer) {
        const productIds = cart.map(item => item.productId);
        const { data: products } = await supabase
          .from('products')
          .select(`id, category_id, categories!inner ( name_en, name_fr )`)
          .in('id', productIds);

        drinkCount = cart.reduce((sum, item) => {
          const product = products?.find((p: any) => p.id === item.productId);
          if (product?.categories) {
            const categoryNameEn = (product.categories.name_en || '').trim().toLowerCase();
            const categoryNameFr = (product.categories.name_fr || '').trim().toLowerCase();
            const isCoffeeCategory = categoryNameEn === 'coffee' || categoryNameFr === 'coffee';
            const isNonCoffeeCategory = categoryNameEn === 'non coffee' || categoryNameFr === 'non coffee';
            if (isCoffeeCategory || isNonCoffeeCategory) {
              return sum + item.quantity;
            }
          }
          return sum;
        }, 0);

        const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
        const shouldRedeem = selectedCustomer.points >= 10;

        if (shouldRedeem) {
          const newPoints = selectedCustomer.points - 10 + drinkCount;
          await supabase
            .from('customers')
            .update({
              points: newPoints,
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
          if (drinkCount > 0) {
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
            await supabase
              .from('customers')
              .update({
                total_purchases: selectedCustomer.total_purchases + totalItemsCount
              })
              .eq('id', selectedCustomer.id);
          }
        }
      }

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

      if (freeDrinkActive) {
        const today = new Date().toISOString().split('T')[0];
        await supabase
          .from('employee_daily_benefits')
          .update({
            free_drink_used: true
          })
          .eq('employee_id', currentEmployee.id)
          .eq('benefit_date', today);
      }

      if (freeSnackActive) {
        const today = new Date().toISOString().split('T')[0];
        await supabase
          .from('employee_daily_benefits')
          .update({
            free_snack_used: true
          })
          .eq('employee_id', currentEmployee.id)
          .eq('benefit_date', today);
      }

      toast.success(`Order ${orderData.order_number} completed`);

      const now = new Date();
      const receiptInfo = {
        orderId: orderData.id,
        orderNumber: orderData.order_number,
        employeeName: currentEmployee.name,
        date: now.toLocaleDateString('en-US'),
        time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        items: cart.map(item => ({
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.basePrice + (item.selectedSize?.priceModifier || 0) + (item.selectedMilk?.priceModifier || 0),
          totalPrice: (item.basePrice + (item.selectedSize?.priceModifier || 0) + (item.selectedMilk?.priceModifier || 0)) * item.quantity,
          selectedSize: item.selectedSize,
          selectedMilk: item.selectedMilk,
          discount: item.discount
        })),
        subtotal,
        discount: totalDiscount,
        total,
        paymentMethod: paymentMethod || 'cash',
        customerName: selectedCustomer?.name,
        pointsEarned: selectedCustomer ? drinkCount : undefined,
        amountPaid: paymentMethod === 'cash' ? cashAmount : total,
        change: paymentMethod === 'cash' ? Math.max(0, cashAmount - total) : 0
      };

      setReceiptData(receiptInfo);
      setShowPrintReceipt(true);

      clearCart();
      setSelectedCustomer(null);
      setShowPaymentMethod(false);
      setSelectedPaymentMethod(null);
      setShowCashCalculator(false);
      setAmountReceived(0);
      setManualDiscountPercent(0);
      setAppliedOffer(null);
      setSelectedItems([]);
    } catch (error) {
      console.error('Error completing order:', error);
      toast.error('Error completing order');
    } finally {
      setProcessing(false);
    }
  };

  const handleReceiptClose = () => {
    setShowPrintReceipt(false);
    onClose?.();
  };

  return (
    <>
      <PrintReceiptDialog open={showPrintReceipt} onClose={handleReceiptClose} receiptData={receiptData} />
      <CashPaymentDialog open={showCashCalculator} onClose={() => {
        setShowCashCalculator(false);
        setShowPaymentMethod(true);
      }} total={isModifyingOrder ? getPriceDifference() : total} onConfirm={handleCashConfirm} processing={processing} isRefund={isModifyingOrder && getPriceDifference() < 0} />
      <AddCustomerDialog open={showAddCustomer} onClose={() => setShowAddCustomer(false)} />
      <UnifiedScanner open={showScanner} onClose={() => setShowScanner(false)} />
      <DiscountDialog open={showDiscountDialog} onClose={() => setShowDiscountDialog(false)} onApply={applyDiscountToItems} hasSelection={selectedItems.length > 0} />

      <div className="w-full h-full bg-card/95 backdrop-blur-sm flex flex-col border-l border-border/50">
        {/* Header */}
        <div className="p-3 border-b border-border/50 bg-secondary/30 shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-primary" />
            <h2 className="text-base font-semibold text-card-foreground">
              {isModifyingOrder ? 'Modification' : 'Cart'}
            </h2>
            <span className="ml-auto text-xs text-muted-foreground">
              {cart.length} item{cart.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Modification Mode Banner - CORRECTION 1: Supprimer le bouton X */}
          {isModifyingOrder && originalOrder && (
            <div className="mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/50">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                  Modif. #{originalOrder.orderNumber}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Original: {originalOrder.originalTotal.toFixed(2)} ₾
              </p>
            </div>
          )}
        </div>

        {/* Cart Items - CORRECTION 3: Réduire la hauteur pour le bouton jaune */}
        <ScrollArea className="flex-1 max-h-[60vh]">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground py-12 min-h-[300px]">
              <ShoppingCart className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm">Your cart is empty</p>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {/* Cart items list */}
              {cart.map((item, index) => {
                const itemPrice = item.basePrice + (item.selectedSize?.priceModifier || 0) + (item.selectedMilk?.priceModifier || 0);
                const itemTotal = itemPrice * item.quantity;
                const itemDiscount = item.discount || 0;
                const discountedTotal = itemTotal * (1 - itemDiscount / 100);

                return (
                  <div key={index} className={`bg-card/50 rounded-lg p-2 border-2 transition-colors cursor-pointer ${selectedItems.includes(index) ? 'border-primary bg-primary/10' : 'border-border/30 hover:border-primary/50'}`} onClick={() => toggleItemSelection(index)}>
                    <div className="flex gap-2">
                      {/* Product image */}
                      <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.productName} className="w-full h-full object-cover" />
                        ) : (
                          <ShoppingCart className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1 mb-0.5">
                          <h3 className="font-semibold text-xs leading-tight text-card-foreground">
                            {item.productName}
                          </h3>
                          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-destructive hover:bg-destructive/10 rounded-md" onClick={(e) => {
                            e.stopPropagation();
                            removeFromCart(index);
                          }}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>

                        {(item.selectedSize || item.selectedMilk) && (
                          <p className="text-[10px] text-muted-foreground mb-1">
                            {[item.selectedSize?.name, item.selectedMilk?.name].filter(Boolean).join(', ')}
                          </p>
                        )}

                        {item.notes && (
                          <p className="text-[10px] text-muted-foreground italic mb-1">
                            Note: {item.notes}
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

                          <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                            <Button variant="outline" size="icon" className="h-6 w-6 rounded-md" onClick={() => handleQuantityChange(index, item.quantity - 1)}>
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-7 text-center font-medium text-xs">
                              {item.quantity}
                            </span>
                            <Button variant="outline" size="icon" className="h-6 w-6 rounded-md" onClick={() => handleQuantityChange(index, item.quantity + 1)}>
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

        {/* Footer - CORRECTION 3: S'assurer qu'il reste visible */}
        <div className="mt-auto border-t border-border/50 bg-secondary/30 shrink-0 min-h-[200px]">
          {/* Customer Loyalty */}
          <div className="p-2 border-b border-border/50">
            <div className="flex gap-2 mb-2">
              {/* CORRECTION 2: Bouton Discount fonctionnel */}
              <Button variant="outline" size="sm" className="flex-1 gap-2 text-xs h-8" onClick={() => setShowAddCustomer(true)}>
                <UserPlus className="w-3 h-3" />
                Nouveau client
              </Button>
              <Button variant="outline" size="sm" className="flex-1 gap-2 text-xs h-8" onClick={() => setShowScanner(true)}>
                <ScanLine className="w-3 h-3" />
                Scanner
              </Button>
            </div>
            <CustomerLoyalty onCustomerSelected={setSelectedCustomer} selectedCustomer={selectedCustomer} />
          </div>

          <div className="p-3 space-y-2">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold text-card-foreground">{subtotal.toFixed(2)} ₾</span>
              </div>

              {(appliedOffer || itemDiscounts > 0 || freeDrinkDiscount > 0) && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    {appliedOffer && <Gift className="w-3 h-3" />}
                    {itemDiscounts > 0 && <Percent className="w-3 h-3" />}
                    {freeDrinkDiscount > 0 && <Gift className="w-3 h-3 text-green-600" />}
                    Discount
                    {freeDrinkDiscount > 0 && (
                      <span className="text-green-600 font-medium">
                        (Free Drink!)
                      </span>
                    )}
                  </span>
                  <span className="font-semibold text-destructive">-{totalDiscount.toFixed(2)} ₾</span>
                </div>
              )}

              <Separator />

              <div className="flex justify-between text-base font-bold">
                <span className="text-card-foreground">Total Payment</span>
                <span className="text-primary">{total.toFixed(2)} ₾</span>
              </div>

              {isModifyingOrder && originalOrder && (
                <div className={`p-2 rounded-lg ${getPriceDifference() > 0 ? 'bg-red-500/10 border border-red-500/50' : getPriceDifference() < 0 ? 'bg-green-500/10 border border-green-500/50' : 'bg-muted border border-border'}`}>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium">
                      {getPriceDifference() > 0 ? '💰 À encaisser' : getPriceDifference() < 0 ? '💵 À rendre' : '✓ Pas de différence'}
                    </span>
                    <span className={`text-sm font-bold ${getPriceDifference() > 0 ? 'text-red-600' : getPriceDifference() < 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {getPriceDifference() > 0 ? '+' : ''}{getPriceDifference().toFixed(2)} ₾
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                {/* CORRECTION 2: Bouton Discount fonctionnel */}
                <Button variant="outline" onClick={() => setShowDiscountDialog(true)} className="justify-between rounded-lg h-9 text-xs" disabled={cart.length === 0}>
                  <span className="flex items-center gap-1.5">
                    <Percent className="w-3 h-3" />
                    {selectedItems.length > 0 ? `Discount (${selectedItems.length})` : 'Discount'}
                  </span>
                </Button>
                <Button variant="outline" onClick={() => {
                  if (selectedItems.length > 0) {
                    selectedItems.forEach(index => {
                      const item = cart[index];
                      updateCartItem(index, { ...item, discount: 0 });
                    });
                    setSelectedItems([]);
                  } else {
                    applyDiscountToItems(0, true);
                  }
                }} className="rounded-lg h-9 text-xs text-destructive hover:text-destructive" disabled={cart.length === 0 || itemDiscounts === 0}>
                  Remove
                </Button>
              </div>
            </div>

            {!showPaymentMethod && (
              <Button 
                onClick={handlePaymentMethodClick} 
                disabled={processing}
                className="w-full h-11 bg-[#F5A623] hover:bg-[#E09612] text-white transition-colors gap-2 text-base font-semibold rounded-lg shadow-md"
              >
                Pay Now
              </Button>
            )}

            {showPaymentMethod && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-center text-muted-foreground">
                  Choose payment method
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    onClick={handleCashPayment} 
                    disabled={processing}
                    className="h-16 flex-col gap-1.5 bg-card hover:bg-accent border-2 border-border hover:border-primary transition-all rounded-lg"
                    variant="outline"
                  >
                    <Banknote className="w-6 h-6" />
                    <span className="text-xs font-semibold">Cash</span>
                  </Button>
                  <Button 
                    onClick={handleCardPayment} 
                    disabled={processing}
                    className="h-16 flex-col gap-1.5 bg-card hover:bg-accent border-2 border-border hover:border-primary transition-all rounded-lg"
                    variant="outline"
                  >
                    <CreditCard className="w-6 h-6" />
                    <span className="text-xs font-semibold">Card</span>
                  </Button>
                </div>
                <Button 
                  onClick={() => setShowPaymentMethod(false)} 
                  variant="ghost" 
                  className="w-full rounded-lg h-8 text-xs"
                  disabled={processing}
                >
                  Back
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Cart;