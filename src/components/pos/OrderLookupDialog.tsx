import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QrCode, ShoppingCart, AlertTriangle } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePOS } from '@/contexts/POSContext';

interface OrderLookupDialogProps {
  open: boolean;
  onClose: () => void;
}

const OrderLookupDialog = ({ open, onClose }: OrderLookupDialogProps) => {
  const [scanning, setScanning] = useState(true);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  const { loadOrderForModification, cart } = usePOS();

  const handleScan = async (result: string) => {
    if (!result || loading) return;
    
    setLoading(true);
    setScanning(false);

    try {
      // Fetch order details
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *
          ),
          employees (
            name
          )
        `)
        .eq('id', result)
        .single();

      if (orderError) throw orderError;

      if (!order) {
        toast.error('Commande non trouvée');
        setScanning(true);
        setLoading(false);
        return;
      }

      setOrderDetails(order);
      toast.success('Commande trouvée!');
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Erreur lors de la récupération de la commande');
      setScanning(true);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setScanning(true);
    setOrderDetails(null);
    onClose();
  };

  const handleRescan = () => {
    setOrderDetails(null);
    setScanning(true);
  };

  const handleLoadToCart = () => {
    if (!orderDetails) return;

    // Check if cart already has items
    if (cart.length > 0) {
      toast.error('Videz d\'abord le panier avant de charger une commande');
      return;
    }

    // Convert order items to cart items
    const cartItems = orderDetails.order_items.map((item: any) => {
      const options = item.selected_options ? JSON.parse(item.selected_options) : {};
      
      return {
        productId: item.product_id || '',
        productName: item.product_name,
        quantity: item.quantity,
        basePrice: item.unit_price - 
          (options.size?.priceModifier || 0) - 
          (options.milk?.priceModifier || 0),
        selectedSize: options.size || undefined,
        selectedMilk: options.milk || undefined,
        notes: item.notes || undefined,
      };
    });

    // Load the original order info
    const originalOrder = {
      orderId: orderDetails.id,
      orderNumber: orderDetails.order_number,
      originalTotal: orderDetails.total,
      items: [...cartItems],
    };

    loadOrderForModification(originalOrder, cartItems);
    
    toast.success('Commande chargée dans le panier - Modifiez et validez');
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Recherche de commande
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {scanning && !orderDetails && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Scannez le QR code du ticket pour charger la commande
              </p>
              <div className="aspect-square max-w-md mx-auto rounded-lg overflow-hidden border-2 border-border">
                <Scanner
                  onScan={(result) => {
                    if (result && result[0]?.rawValue) {
                      handleScan(result[0].rawValue);
                    }
                  }}
                  constraints={{
                    facingMode: 'environment'
                  }}
                  styles={{
                    container: { width: '100%', height: '100%' }
                  }}
                />
              </div>
            </div>
          )}

          {loading && (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">Chargement de la commande...</p>
            </div>
          )}

          {orderDetails && !scanning && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4">
                {/* Order Header */}
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold">Commande #{orderDetails.order_number}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      orderDetails.status === 'completed' 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                    }`}>
                      {orderDetails.status === 'completed' ? 'TERMINÉE' : orderDetails.status.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Employé</p>
                      <p className="font-medium">{orderDetails.employees?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Date & Heure</p>
                      <p className="font-medium">
                        {new Date(orderDetails.created_at).toLocaleString('fr-FR')}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Paiement</p>
                      <p className="font-medium capitalize">
                        {orderDetails.payment_method === 'cash' ? 'Espèces' : 
                         orderDetails.payment_method === 'card' ? 'Carte' : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total payé</p>
                      <p className="font-medium text-primary">{orderDetails.total.toFixed(2)} ₾</p>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div>
                  <h4 className="font-semibold mb-3">Articles de la commande</h4>
                  <div className="space-y-2">
                    {orderDetails.order_items?.map((item: any, index: number) => (
                      <div key={index} className="flex justify-between items-start p-3 bg-muted rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Qté: {item.quantity} × {item.unit_price.toFixed(2)} ₾
                          </p>
                          {item.selected_options && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {JSON.parse(item.selected_options).size?.name && (
                                <span className="mr-2">Taille: {JSON.parse(item.selected_options).size.name}</span>
                              )}
                              {JSON.parse(item.selected_options).milk?.name && (
                                <span>Lait: {JSON.parse(item.selected_options).milk.name}</span>
                              )}
                            </div>
                          )}
                          {item.notes && (
                            <p className="text-xs text-muted-foreground mt-1">Note: {item.notes}</p>
                          )}
                        </div>
                        <p className="font-semibold">{item.total_price.toFixed(2)} ₾</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Totals */}
                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Sous-total</span>
                    <span>{orderDetails.subtotal.toFixed(2)} ₾</span>
                  </div>
                  {orderDetails.discount_amount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Réduction</span>
                      <span className="text-red-600">-{orderDetails.discount_amount.toFixed(2)} ₾</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>Total</span>
                    <span>{orderDetails.total.toFixed(2)} ₾</span>
                  </div>
                </div>

                {/* Warning about cart */}
                {cart.length > 0 && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-500 bg-amber-500/10 p-3 text-sm">
                    <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-muted-foreground">
                      Le panier n'est pas vide. Videz-le avant de charger cette commande.
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Button 
                    onClick={handleLoadToCart} 
                    className="flex-1 gap-2"
                    disabled={cart.length > 0}
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Charger dans le panier
                  </Button>
                  <Button onClick={handleRescan} variant="outline">
                    Scanner un autre
                  </Button>
                </div>
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderLookupDialog;