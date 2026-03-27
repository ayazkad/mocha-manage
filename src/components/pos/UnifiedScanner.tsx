import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScanLine, Camera, Keyboard, Loader2 } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { supabase } from '@/integrations/supabase/client';
import { usePOS } from '@/contexts/POSContext';
import { toast } from 'sonner';
import { nativeScannerService } from '@/lib/nativeScannerService';

interface UnifiedScannerProps {
  open: boolean;
  onClose: () => void;
}

import { useNavigate } from 'react-router-dom';

const UnifiedScanner = ({ open, onClose }: UnifiedScannerProps) => {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [processing, setProcessing] = useState(false);
  const [nativeScanning, setNativeScanning] = useState(false);
  const { addToCart, clearCart, loadOrderForModification } = usePOS();
  const isNative = nativeScannerService.isNativePlatform();

  useEffect(() => {
    if (!open) {
      setCode('');
      setProcessing(false);
      setNativeScanning(false);
    }
  }, [open]);

  // Auto-start native scanner when dialog opens on native platform
  useEffect(() => {
    if (open && isNative && !nativeScanning) {
      startNativeScan();
    }
  }, [open, isNative]);

  const startNativeScan = async () => {
    setNativeScanning(true);
    const result = await nativeScannerService.startScan();
    setNativeScanning(false);

    if (result.success && result.content) {
      await handleScan(result.content);
    } else if (result.error) {
      toast.error(result.error);
    }
  };

  const stopNativeScan = async () => {
    await nativeScannerService.stopScan();
    setNativeScanning(false);
    onClose();
  };

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
        await handleOrderScan(scannedCode);
      } else {
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

    // 1. Reconstruct cart items and correct base price
    // We must subtract modifiers from unit_price because POSContext will re-add them based on selected options
    const cartItems = order.order_items.map((item: any) => {
      const options = item.selected_options
        ? (typeof item.selected_options === 'string' ? JSON.parse(item.selected_options) : item.selected_options)
        : null;

      const sizeMod = options?.size?.priceModifier || 0;
      const milkMod = options?.milk?.priceModifier || 0;

      // The unit_price in DB includes modifiers, so we subtract them to get the clean basePrice
      const correctedBasePrice = item.unit_price - sizeMod - milkMod;

      return {
        productId: item.product_id || '',
        productName: item.product_name,
        quantity: item.quantity,
        basePrice: correctedBasePrice,
        selectedSize: options?.size,
        selectedMilk: options?.milk,
        notes: item.notes || undefined,
        discount: 0, // Will be calculated below
      };
    });

    // 2. Calculate Theoretical Total (what POS would calculate without any discount)
    const theoreticalTotal = cartItems.reduce((acc: number, item: any) => {
      const qs = item.quantity;
      const price = item.basePrice +
        (item.selectedSize?.priceModifier || 0) +
        (item.selectedMilk?.priceModifier || 0);
      return acc + (price * qs);
    }, 0);

    // 3. Compare with Actual Paid Total to find the missing discount
    const actualTotal = Number(order.total) || 0;

    let impliedDiscountPercent = 0;

    // REVERSE ENGINEERING: Force actualTotal to match theoreticalTotal via discount
    // If Theoretical (3.50) > Actual (1.75) -> Discount needed
    if (theoreticalTotal > actualTotal + 0.005) {
      // Discount % = (Diff / Total) * 100
      impliedDiscountPercent = ((theoreticalTotal - actualTotal) / theoreticalTotal) * 100;
      // Round to 2 decimals e.g. 50.00
      impliedDiscountPercent = Math.round(impliedDiscountPercent * 100) / 100;
    }

    console.log('REVERSE DISC CALC:', {
      theoreticalTotal,
      actualTotal,
      impliedDiscountPercent
    });

    if (impliedDiscountPercent > 0.1) {
      toast.info(`Discount restauré: ${impliedDiscountPercent.toFixed(1)}%`);
    }

    // 4. Apply the calculated discount to all items
    const finalCartItems = cartItems.map((item: any) => ({
      ...item,
      discount: impliedDiscountPercent > 0.01 ? Number(impliedDiscountPercent.toFixed(2)) : 0
    }));

    // Load order for modification - this sets originalOrder and isModifyingOrder
    const originalOrderData = {
      orderId: order.id,
      orderNumber: order.order_number,
      originalTotal: Number(order.total),
      items: finalCartItems,
    };

    loadOrderForModification(originalOrderData, finalCartItems);

    toast.success(`Ticket #${order.order_number} chargé pour modification`);
    onClose();
    navigate('/pos');
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

  // Native platform: show fullscreen scanner overlay
  if (isNative && nativeScanning) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-end bg-black/50 pb-20">
        <div className="text-center text-white mb-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p>Scannez un code-barres ou QR code</p>
        </div>
        <Button
          variant="secondary"
          onClick={stopNativeScan}
          className="px-8"
        >
          Annuler
        </Button>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen && isNative) {
        stopNativeScan();
      } else {
        onClose();
      }
    }}>
      <DialogContent className="w-[90%] sm:max-w-md rounded-2xl border-none shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="w-5 h-5" />
            Scanner
          </DialogTitle>
        </DialogHeader>

        {isNative ? (
          // Native platform: show scan button and manual input
          <div className="space-y-4">
            <Button
              onClick={startNativeScan}
              className="w-full h-32 flex flex-col gap-2"
              disabled={processing}
            >
              <Camera className="w-8 h-8" />
              <span>Ouvrir la caméra</span>
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">ou</span>
              </div>
            </div>

            <div className="space-y-2">
              <Input
                placeholder="Saisissez le code manuellement"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && code) {
                    handleScan(code);
                  }
                }}
              />
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
            </div>
          </div>
        ) : (
          // Web platform: use react-qr-scanner
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
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UnifiedScanner;
