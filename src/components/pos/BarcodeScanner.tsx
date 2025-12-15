import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Barcode, Camera } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { supabase } from '@/integrations/supabase/client';
import { usePOS } from '@/contexts/POSContext';
import { useToast } from '@/hooks/use-toast';

interface BarcodeScannerProps {
  externalOpen?: boolean;
  onExternalClose?: () => void;
}

const BarcodeScanner = ({ externalOpen, onExternalClose }: BarcodeScannerProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [barcode, setBarcode] = useState('');
  const [scanning, setScanning] = useState(false);
  const { addToCart } = usePOS();
  const { toast } = useToast();

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
    }
  }, [open]);

  useEffect(() => {
    // Auto-submit when barcode is long enough (typical barcodes are 8-13 digits)
    if (barcode.length >= 8) {
      handleScan();
    }
  }, [barcode]);

  const handleScan = async () => {
    if (!barcode) return;

    try {
      const { data: product, error } = await supabase
        .from('products')
        .select('*')
        .eq('barcode', barcode)
        .eq('active', true)
        .maybeSingle();

      if (error) throw error;

      if (!product) {
        toast({
          title: 'Produit non trouvé',
          description: `Aucun produit avec le code-barres ${barcode}`,
          variant: 'destructive',
        });
        setBarcode('');
        return;
      }

      // If product has options, we need to show the options dialog
      // For now, we'll add it directly without options
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scanner un code-barres</DialogTitle>
          </DialogHeader>
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
                        handleScan();
                      }, 100);
                    }
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
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BarcodeScanner;
