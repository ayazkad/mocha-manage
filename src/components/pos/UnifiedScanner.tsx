import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScanLine, Camera, Keyboard } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { supabase } from '@/integrations/supabase/client';
import { usePOS } from '@/contexts/POSContext';
import { toast } from 'sonner';

interface UnifiedScannerProps {
  open: boolean;
  onClose: () => void;
}

const UnifiedScanner = ({ open, onClose }: UnifiedScannerProps) => {
  const [code, setCode] = useState('');
  const [processing, setProcessing] = useState(false);
  const { addToCart, clearCart } = usePOS();

  useEffect(() => {
    if (!open) {
      setCode('');
      setProcessing(false);
    }
  }, [open]);

  const isUUID = (str: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  const handleScan = async (scannedCode: string) => {
    if (!scannedCode || processing) return;
    
    setProcessing(true);
    setCode(scannedCode);

    try {
      if (isUUID(scannedCode)) {
        // It's a UUID - likely an order QR code
        await handleOrderScan(scannedCode);
      } else {
        // It's a barcode - product lookup
        await handleBarcodeScan(scannedCode);
      }
    } catch (error: any) {
      console.error('Scan error:', error);
      toast.error(error.message || 'Erreur lors du scan');
    } finally {
      setProcessing(false);
      setCode('');
    }
  };

  const handleOrderScan = async (orderId: string) => {
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .eq('id', orderId)
      .single();

    if (error || !order) {
      toast.error('Commande non trouvée');
      return;
    }

    // Clear current cart and add all items from the order
    clearCart();

    for (const item of order.order_items) {
      const options = item.selected_options 
        ? (typeof item.selected_options === 'string' ? JSON.parse(item.selected_options) : item.selected_options) 
        : null;
      
      addToCart({
        productId: item.product_id || '',
        productName: item.product_name,
        quantity: item.quantity,
        basePrice: item.unit_price,
        selectedSize: options?.size,
        selectedMilk: options?.milk,
        notes: item.notes || undefined,
      });
    }

    toast.success(`Ticket #${order.order_number} chargé dans le panier`);
    onClose();
  };

  const handleBarcodeScan = async (barcode: string) => {
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('barcode', barcode)
      .eq('active', true)
      .maybeSingle();

    if (error) throw error;

    if (!product) {
      toast.error(`Aucun produit avec le code-barres ${barcode}`);
      return;
    }

    const productName = product.name_en || product.name_fr;
    
    addToCart({
      productId: product.id,
      productName: productName,
      quantity: 1,
      basePrice: product.base_price,
      image_url: product.image_url,
    });

    toast.success(`${productName} ajouté au panier`);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="w-5 h-5" />
            Scanner
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="camera" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="camera">
              <Camera className="w-4 h-4 mr-2" />
              Caméra
            </TabsTrigger>
            <TabsTrigger value="manual">
              <Keyboard className="w-4 h-4 mr-2" />
              Manuel
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="camera" className="space-y-4">
            <div className="rounded-lg overflow-hidden bg-muted aspect-square max-w-sm mx-auto">
              <Scanner
                onScan={(detectedCodes) => {
                  const scannedCode = detectedCodes[0]?.rawValue;
                  if (scannedCode && !processing) {
                    handleScan(scannedCode);
                  }
                }}
                constraints={{
                  facingMode: 'environment'
                }}
                styles={{
                  container: {
                    width: '100%',
                    height: '100%',
                  },
                }}
                components={{
                  finder: true,
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Scannez un QR code (ticket) ou un code-barres (produit)
            </p>
          </TabsContent>
          
          <TabsContent value="manual" className="space-y-4">
            <div className="space-y-2">
              <Input
                autoFocus
                placeholder="Saisissez le code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && code) {
                    handleScan(code);
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                UUID pour un ticket, code-barres pour un produit
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => handleScan(code)} 
                className="flex-1"
                disabled={!code || processing}
              >
                {processing ? 'Recherche...' : 'Rechercher'}
              </Button>
              <Button variant="outline" onClick={onClose}>
                Annuler
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default UnifiedScanner;
