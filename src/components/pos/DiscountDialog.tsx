import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import NumPad from '@/components/login/NumPad';
import { Percent } from 'lucide-react';

interface DiscountDialogProps {
  open: boolean;
  onClose: () => void;
  onApply: (percentage: number, applyToAll: boolean) => void;
  hasSelection: boolean;
}

const DiscountDialog = ({ open, onClose, onApply, hasSelection }: DiscountDialogProps) => {
  const [discountValue, setDiscountValue] = useState('');
  // Si aucune sélection, appliquer à tous par défaut
  const [applyToAll, setApplyToAll] = useState(!hasSelection);

  // Réinitialiser l'état quand le dialogue s'ouvre
  useEffect(() => {
    if (open) {
      setDiscountValue('');
      setApplyToAll(!hasSelection);
    }
  }, [open, hasSelection]);

  const handleApply = () => {
    const percentage = parseFloat(discountValue) || 0;
    if (percentage >= 0 && percentage <= 100) {
      console.log('=== DiscountDialog handleApply START ===');
      console.log('Discount value:', percentage);
      console.log('hasSelection:', hasSelection);
      console.log('applyToAll state:', applyToAll);
      
      // RÈGLE SIMPLE: Si hasSelection est false, forcer applyToAll à true
      const shouldApplyToAll = !hasSelection || applyToAll;
      
      console.log('Calculated shouldApplyToAll:', shouldApplyToAll);
      console.log('Calling onApply with:', { percentage, shouldApplyToAll });
      console.log('=== DiscountDialog handleApply END ===');
      
      onApply(percentage, shouldApplyToAll);
      setDiscountValue('');
      onClose();
    }
  };

  const handleClear = () => {
    onApply(0, true);
    setDiscountValue('');
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

          <div className="flex items-center justify-center gap-4 p-3 bg-muted rounded-lg">
            {hasSelection && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!applyToAll}
                  onChange={() => setApplyToAll(false)}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-sm font-medium">Articles sélectionnés</span>
              </label>
            )}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={applyToAll}
                onChange={() => setApplyToAll(true)}
                className="w-4 h-4 accent-primary"
              />
              <span className="text-sm font-medium">Tous les articles</span>
            </label>
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