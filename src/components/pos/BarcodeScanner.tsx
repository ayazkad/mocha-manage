import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Barcode } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePOS } from '@/contexts/POSContext';
import { useToast } from '@/hooks/use-toast';

const BarcodeScanner = () => {
  const [open, setOpen] = useState(false);
  const [barcode, setBarcode] = useState('');
  const { addToCart } = usePOS();
  const { toast } = useToast();

  useEffect(() => {
    if (!open) {
      setBarcode('');
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
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2 rounded-xl border-border/50"
      >
        <Barcode className="w-4 h-4" />
        <span className="hidden md:inline">Scanner</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scanner un code-barres</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Barcode className="w-5 h-5 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Scannez ou saisissez le code-barres"
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
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BarcodeScanner;
