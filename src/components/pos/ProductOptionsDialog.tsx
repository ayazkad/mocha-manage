import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePOS } from '@/contexts/POSContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';

interface Product {
  id: string;
  name_fr: string;
  base_price: number;
  has_size_options: boolean;
  has_milk_options: boolean;
}

interface ProductOption {
  id: string;
  option_type: string;
  name_fr: string;
  name_en: string;
  name_ru: string;
  name_ge: string;
  price_modifier: number;
}

interface ProductOptionsDialogProps {
  product: Product;
  open: boolean;
  onClose: () => void;
  getProductName: (product: Product) => string;
}

const ProductOptionsDialog = ({
  product,
  open,
  onClose,
  getProductName,
}: ProductOptionsDialogProps) => {
  const [sizeOptions, setSizeOptions] = useState<ProductOption[]>([]);
  const [milkOptions, setMilkOptions] = useState<ProductOption[]>([]);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedMilk, setSelectedMilk] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const { addToCart } = usePOS();

  useEffect(() => {
    if (open && product) {
      loadOptions();
    }
  }, [open, product]);

  const loadOptions = async () => {
    const { data, error } = await supabase
      .from('product_options')
      .select('*')
      .eq('product_id', product.id)
      .eq('active', true)
      .order('sort_order');

    if (data && !error) {
      const sizes = data.filter((opt) => opt.option_type === 'size');
      const milks = data.filter((opt) => opt.option_type === 'milk');

      setSizeOptions(sizes);
      setMilkOptions(milks);

      // Set default selections
      if (sizes.length > 0 && !selectedSize) setSelectedSize(sizes[0].id);
      if (milks.length > 0 && !selectedMilk) setSelectedMilk(milks[0].id);
    }
  };

  const getOptionName = (option: ProductOption) => {
    return option.name_en || option.name_fr;
  };

  const calculateTotal = () => {
    let total = product.base_price;
    
    const size = sizeOptions.find((opt) => opt.id === selectedSize);
    if (size) total += size.price_modifier;

    const milk = milkOptions.find((opt) => opt.id === selectedMilk);
    if (milk) total += milk.price_modifier;

    return total * quantity;
  };

  const handleAddToCart = () => {
    const size = sizeOptions.find((opt) => opt.id === selectedSize);
    const milk = milkOptions.find((opt) => opt.id === selectedMilk);

    addToCart({
      productId: product.id,
      productName: getProductName(product),
      quantity,
      basePrice: product.base_price,
      selectedSize: size ? {
        id: size.id,
        name: getOptionName(size),
        priceModifier: size.price_modifier,
      } : undefined,
      selectedMilk: milk ? {
        id: milk.id,
        name: getOptionName(milk),
        priceModifier: milk.price_modifier,
      } : undefined,
      notes: notes || undefined,
    });

    toast.success('Added to cart');
    onClose();
    
    // Reset form
    setQuantity(1);
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl md:text-2xl">{getProductName(product)}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {product.has_size_options && sizeOptions.length > 0 && (
            <div className="space-y-3">
              <Label className="text-base md:text-lg font-semibold">Taille</Label>
              <RadioGroup value={selectedSize} onValueChange={setSelectedSize} className="space-y-3">
                {sizeOptions.map((option) => (
                  <label
                    key={option.id}
                    htmlFor={option.id}
                    className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all touch-manipulation ${
                      selectedSize === option.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <RadioGroupItem value={option.id} id={option.id} />
                      <span className="font-medium text-base">{getOptionName(option)}</span>
                    </div>
                    {option.price_modifier > 0 && (
                      <span className="text-primary font-semibold text-base">
                        +{option.price_modifier.toFixed(2)} ₾
                      </span>
                    )}
                  </label>
                ))}
              </RadioGroup>
            </div>
          )}

          {product.has_milk_options && milkOptions.length > 0 && (
            <div className="space-y-3">
              <Label className="text-base md:text-lg font-semibold">Lait</Label>
              <RadioGroup value={selectedMilk} onValueChange={setSelectedMilk} className="space-y-3">
                {milkOptions.map((option) => (
                  <label
                    key={option.id}
                    htmlFor={`milk-${option.id}`}
                    className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all touch-manipulation ${
                      selectedMilk === option.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <RadioGroupItem value={option.id} id={`milk-${option.id}`} />
                      <span className="font-medium text-base">{getOptionName(option)}</span>
                    </div>
                    {option.price_modifier > 0 && (
                      <span className="text-primary font-semibold text-base">
                        +{option.price_modifier.toFixed(2)} ₾
                      </span>
                    )}
                  </label>
                ))}
              </RadioGroup>
            </div>
          )}

          <div className="space-y-3">
            <Label className="text-base md:text-lg font-semibold">Quantité</Label>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="h-12 w-12 touch-manipulation"
              >
                <Minus className="w-5 h-5" />
              </Button>
              <span className="text-3xl font-bold w-16 text-center">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(quantity + 1)}
                className="h-12 w-12 touch-manipulation"
              >
                <Plus className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-base md:text-lg font-semibold">Notes (optionnel)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Instructions spéciales..."
              className="resize-none min-h-[100px] text-base"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-4">
          <div className="flex items-center justify-between w-full gap-3">
            <div className="text-left">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-3xl md:text-2xl font-bold text-primary">
                {calculateTotal().toFixed(2)} ₾
              </p>
            </div>
            <Button
              onClick={handleAddToCart}
              size="lg"
              className="bg-gradient-primary hover:opacity-90 transition-opacity h-14 px-8 text-lg touch-manipulation shadow-md"
            >
              Ajouter au panier
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProductOptionsDialog;
