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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="w-5 h-5" />
              Paiement Espèces
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Display area */}
          <div className="bg-muted rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total à payer</span>
              <span className="text-xl font-bold text-foreground">{total.toFixed(2)} ₾</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Montant reçu</span>
              <span className="text-2xl font-bold text-primary">
                {amountReceived || '0'} ₾
              </span>
            </div>
            {amount >= total && (
              <div className="flex justify-between items-center pt-2 border-t border-border">
                <span className="text-sm font-semibold text-foreground">Rendu monnaie</span>
                <span className="text-2xl font-bold text-green-600">{change.toFixed(2)} ₾</span>
              </div>
            )}
          </div>

          {/* Georgian bills */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-center text-muted-foreground">Billets Lari géorgien</p>
            <div className="grid grid-cols-4 gap-2">
              {bills.map(bill => (
                <Button
                  key={bill}
                  onClick={() => handleBillClick(bill)}
                  variant="outline"
                  className="h-14 text-sm font-bold hover:bg-primary hover:text-primary-foreground transition-colors rounded-xl border-2"
                  disabled={processing}
                >
                  {bill} ₾
                </Button>
              ))}
            </div>
          </div>

          {/* NumPad */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-center text-muted-foreground">Ou saisir manuellement</p>
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'backspace'].map((key) => (
                <Button
                  key={key}
                  onClick={() => handleNumPadClick(key)}
                  variant="outline"
                  className="h-12 text-lg font-semibold rounded-xl"
                  disabled={processing}
                >
                  {key === 'backspace' ? <Delete className="w-5 h-5" /> : key}
                </Button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => setAmountReceived('')}
              variant="outline"
              className="h-12 rounded-xl"
              disabled={processing}
            >
              Effacer
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!canConfirm || processing}
              className="h-12 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold"
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
