import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Barcode, Camera, Loader2 } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { supabase } from '@/integrations/supabase/client';
import { usePOS } from '@/contexts/POSContext';
import { useToast } from '@/hooks/use-toast';
import { nativeScannerService } from '@/lib/nativeScannerService';

interface BarcodeScannerProps {
  externalOpen?: boolean;
  onExternalClose?: () => void;
}

const BarcodeScanner = ({ externalOpen, onExternalClose }: BarcodeScannerProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [barcode, setBarcode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [nativeScanning, setNativeScanning] = useState(false);
  const { addToCart } = usePOS();
  const { toast } = useToast();
  const isNative = nativeScannerService.isNativePlatform();

  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = (value: boolean) => {
    if (externalOpen !== undefined) {
      if (!value && onExternalClose) onExternalClose();
    } else {
      setInternalOpen(value);
    }
  };

  useEffect(() => {
    if (!open) {
      setBarcode('');
      setScanning(false);
      setNativeScanning(false);
    }
  }, [open]);

  useEffect(() => {
    // Auto-submit when barcode is long enough (typical barcodes are 8-13 digits)
    if (barcode.length >= 8 && !isNative) {
      handleScan();
    }
  }, [barcode]);

  const startNativeScan = async () => {
    setNativeScanning(true);
    const result = await nativeScannerService.startScan();
    setNativeScanning(false);

    if (result.success && result.content) {
      setBarcode(result.content);
      await handleScanWithCode(result.content);
    } else if (result.error) {
      toast({
        title: 'Erreur',
        description: result.error,
        variant: 'destructive',
      });
    }
  };

  const stopNativeScan = async () => {
    await nativeScannerService.stopScan();
    setNativeScanning(false);
    setOpen(false);
  };

  const handleScanWithCode = async (code: string) => {
    if (!code) return;

    try {
      const { data: product, error } = await supabase
        .from('products')
        .select('*')
        .eq('barcode', code)
        .eq('active', true)
        .maybeSingle();

      if (error) throw error;

      if (!product) {
        toast({
          title: 'Produit non trouvé',
          description: `Aucun produit avec le code-barres ${code}`,
          variant: 'destructive',
        });
        setBarcode('');
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

      toast({
        title: 'Produit ajouté',
        description: `${productName} ajouté au panier`,
      });

      setBarcode('');
      setOpen(false);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
      setBarcode('');
    }
  };

  const handleScan = async () => {
    await handleScanWithCode(barcode);
  };

  // Native platform: show fullscreen scanner overlay
  if (isNative && nativeScanning) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-end bg-black/50 pb-20">
        <div className="text-center text-white mb-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p>Scannez un code-barres</p>
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
    <>
      {externalOpen === undefined && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className="gap-2 rounded-xl border-border/50"
        >
          <Barcode className="w-4 h-4" />
          <span className="hidden md:inline">Scanner</span>
        </Button>
      )}

      <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isOpen && isNative && nativeScanning) {
          stopNativeScan();
        } else {
          setOpen(isOpen);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scanner un code-barres</DialogTitle>
          </DialogHeader>
          
          {isNative ? (
            // Native platform: show scan button and manual input
            <div className="space-y-4">
              <Button 
                onClick={startNativeScan} 
                className="w-full h-32 flex flex-col gap-2"
                disabled={scanning}
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
                <div className="flex items-center gap-2">
                  <Barcode className="w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="Saisissez le code-barres"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleScan();
                      }
                    }}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleScan} className="flex-1" disabled={!barcode}>
                    Rechercher
                  </Button>
                  <Button variant="outline" onClick={() => setOpen(false)}>
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
                  <Barcode className="w-4 h-4 mr-2" />
                  Manuel
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="camera" className="space-y-4">
                <div className="rounded-lg overflow-hidden bg-muted">
                  <Scanner
                    onScan={(detectedCodes) => {
                      const code = detectedCodes[0]?.rawValue;
                      if (code && !scanning) {
                        setScanning(true);
                        setBarcode(code);
                        setTimeout(() => {
                          handleScanWithCode(code);
                        }, 100);
                      }
                    }}
                    constraints={{
                      facingMode: 'environment'
                    }}
                    styles={{
                      container: {
                        width: '100%',
                        height: '300px',
                      },
                    }}
                    components={{
                      finder: true,
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Positionnez le code-barres devant la caméra
                </p>
              </TabsContent>
              
              <TabsContent value="manual" className="space-y-4">
                <div className="flex items-center gap-2">
                  <Barcode className="w-5 h-5 text-muted-foreground" />
                  <Input
                    autoFocus
                    placeholder="Saisissez le code-barres"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleScan();
                      }
                    }}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleScan} className="flex-1">
                    Rechercher
                  </Button>
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Annuler
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BarcodeScanner;
