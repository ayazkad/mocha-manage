import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QrCode } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

interface OrderLookupDialogProps {
  open: boolean;
  onClose: () => void;
}

const OrderLookupDialog = ({ open, onClose }: OrderLookupDialogProps) => {
  const [scanning, setScanning] = useState(true);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);

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
        toast.error('Order not found');
        setScanning(true);
        setLoading(false);
        return;
      }

      setOrderDetails(order);
      toast.success('Order found!');
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Failed to fetch order details');
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Order Lookup
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {scanning && !orderDetails && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Scan the QR code from a receipt to view order details
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
              <p className="text-sm text-muted-foreground">Loading order details...</p>
            </div>
          )}

          {orderDetails && !scanning && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4">
                {/* Order Header */}
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold">Order #{orderDetails.order_number}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      orderDetails.status === 'completed' 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                    }`}>
                      {orderDetails.status.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Employee</p>
                      <p className="font-medium">{orderDetails.employees?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Date & Time</p>
                      <p className="font-medium">
                        {new Date(orderDetails.created_at).toLocaleString('en-US')}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Payment Method</p>
                      <p className="font-medium capitalize">{orderDetails.payment_method || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Order ID</p>
                      <p className="font-mono text-xs">{orderDetails.id}</p>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div>
                  <h4 className="font-semibold mb-3">Order Items</h4>
                  <div className="space-y-2">
                    {orderDetails.order_items?.map((item: any, index: number) => (
                      <div key={index} className="flex justify-between items-start p-3 bg-muted rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Qty: {item.quantity} × {item.unit_price.toFixed(2)} ₾
                          </p>
                          {item.selected_options && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {JSON.parse(item.selected_options).size?.name && (
                                <span className="mr-2">Size: {JSON.parse(item.selected_options).size.name}</span>
                              )}
                              {JSON.parse(item.selected_options).milk?.name && (
                                <span>Milk: {JSON.parse(item.selected_options).milk.name}</span>
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
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{orderDetails.subtotal.toFixed(2)} ₾</span>
                  </div>
                  {orderDetails.discount_amount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Discount</span>
                      <span className="text-red-600">-{orderDetails.discount_amount.toFixed(2)} ₾</span>
                    </div>
                  )}
                  {orderDetails.tax_amount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax</span>
                      <span>{orderDetails.tax_amount.toFixed(2)} ₾</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>Total</span>
                    <span>{orderDetails.total.toFixed(2)} ₾</span>
                  </div>
                </div>

                {orderDetails.notes && (
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm font-medium mb-1">Notes</p>
                    <p className="text-sm text-muted-foreground">{orderDetails.notes}</p>
                  </div>
                )}

                <Button onClick={handleRescan} variant="outline" className="w-full">
                  Scan Another Receipt
                </Button>
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderLookupDialog;
