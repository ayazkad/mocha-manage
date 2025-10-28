import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import NumPad from '@/components/login/NumPad';
import { Percent } from 'lucide-react';

interface DiscountDialogProps {
  open: boolean;
  onClose: () => void;
  onApply: (percentage: number) => void;
  currentDiscount: number;
}

const DiscountDialog = ({ open, onClose, onApply, currentDiscount }: DiscountDialogProps) => {
  const [discountValue, setDiscountValue] = useState(currentDiscount.toString());

  const handleApply = () => {
    const percentage = parseFloat(discountValue) || 0;
    if (percentage >= 0 && percentage <= 100) {
      onApply(percentage);
      onClose();
    }
  };

  const handleClear = () => {
    onApply(0);
    setDiscountValue('0');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Percent className="w-5 h-5" />
            Réduction en pourcentage
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-primary mb-2">
              {discountValue || '0'}%
            </div>
            <p className="text-sm text-muted-foreground">
              Saisissez le pourcentage de réduction
            </p>
          </div>

          <NumPad
            value={discountValue}
            onChange={setDiscountValue}
            maxLength={2}
          />

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleClear}
              variant="outline"
              className="rounded-xl"
            >
              Supprimer
            </Button>
            <Button
              onClick={handleApply}
              className="bg-gradient-primary hover:opacity-90 rounded-xl"
            >
              Appliquer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DiscountDialog;