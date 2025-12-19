import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Banknote, X, Delete } from 'lucide-react';

interface CashPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  total: number;
  onConfirm: (amountPaid: number) => void;
  processing?: boolean;
}

const CashPaymentDialog = ({ open, onClose, total, onConfirm, processing }: CashPaymentDialogProps) => {
  const [amountReceived, setAmountReceived] = useState('');

  const amount = parseFloat(amountReceived) || 0;
  const change = Math.max(0, amount - total);
  const canConfirm = amount >= total;

  const handleNumPadClick = (value: string) => {
    if (value === 'clear') {
      setAmountReceived('');
    } else if (value === 'backspace') {
      setAmountReceived(prev => prev.slice(0, -1));
    } else if (value === '.') {
      if (!amountReceived.includes('.')) {
        setAmountReceived(prev => prev + '.');
      }
    } else {
      // Limit decimal places to 2
      const parts = amountReceived.split('.');
      if (parts[1] && parts[1].length >= 2) return;
      setAmountReceived(prev => prev + value);
    }
  };

  const handleBillClick = (billAmount: number) => {
    const currentAmount = parseFloat(amountReceived) || 0;
    setAmountReceived((currentAmount + billAmount).toString());
  };

  const handleConfirm = () => {
    if (canConfirm) {
      onConfirm(amount);
      setAmountReceived('');
    }
  };

  const handleClose = () => {
    setAmountReceived('');
    onClose();
  };

  // Georgian Lari bills
  const bills = [1, 2, 5, 10, 20, 50, 100, 200];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[340px] p-4">
        <DialogHeader className="pb-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Banknote className="w-4 h-4" />
              Paiement Espèces
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleClose} className="h-7 w-7">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-3">
          {/* Display area */}
          <div className="bg-muted rounded-lg p-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Total à payer</span>
              <span className="text-lg font-bold text-foreground">{total.toFixed(2)} ₾</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Montant reçu</span>
              <span className="text-xl font-bold text-primary">
                {amountReceived || '0'} ₾
              </span>
            </div>
            {amount >= total && (
              <div className="flex justify-between items-center pt-2 border-t border-border">
                <span className="text-xs font-semibold text-foreground">Rendu monnaie</span>
                <span className="text-xl font-bold text-green-600">{change.toFixed(2)} ₾</span>
              </div>
            )}
          </div>

          {/* Georgian bills */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium text-center text-muted-foreground">Billets Lari géorgien</p>
            <div className="grid grid-cols-4 gap-1.5">
              {bills.map(bill => (
                <Button
                  key={bill}
                  onClick={() => handleBillClick(bill)}
                  variant="outline"
                  className="h-10 text-xs font-bold hover:bg-primary hover:text-primary-foreground transition-colors rounded-lg border"
                  disabled={processing}
                >
                  {bill} ₾
                </Button>
              ))}
            </div>
          </div>

          {/* NumPad */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium text-center text-muted-foreground">Ou saisir manuellement</p>
            <div className="grid grid-cols-3 gap-1.5">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'backspace'].map((key) => (
                <Button
                  key={key}
                  onClick={() => handleNumPadClick(key)}
                  variant="outline"
                  className="h-10 text-base font-semibold rounded-lg"
                  disabled={processing}
                >
                  {key === 'backspace' ? <Delete className="w-4 h-4" /> : key}
                </Button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => setAmountReceived('')}
              variant="outline"
              className="h-10 rounded-lg text-sm"
              disabled={processing}
            >
              Effacer
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!canConfirm || processing}
              className="h-10 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm"
            >
              {processing ? 'Traitement...' : 'Confirmer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CashPaymentDialog;
