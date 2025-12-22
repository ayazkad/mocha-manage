import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Banknote, Delete, ArrowLeftRight } from 'lucide-react';

interface CashPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  total: number;
  onConfirm: (amountPaid: number) => void;
  processing?: boolean;
  isRefund?: boolean;
}

const CashPaymentDialog = ({ open, onClose, total, onConfirm, processing, isRefund }: CashPaymentDialogProps) => {
  const [amountReceived, setAmountReceived] = useState('');
  
  // Reset amount when dialog opens
  useEffect(() => {
    if (open) {
      setAmountReceived('');
    }
  }, [open]);

  const amount = parseFloat(amountReceived) || 0;
  
  // For refunds, the total is already negative, we just confirm
  // For payments, we need to check amount >= total
  const isRefundMode = isRefund || total < 0;
  const refundAmount = isRefundMode ? Math.abs(total) : 0;
  const change = isRefundMode ? 0 : Math.max(0, amount - total);
  const canConfirm = isRefundMode ? true : amount >= total;

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
      // For refunds, pass 0 as amount paid (we're giving money back)
      onConfirm(isRefundMode ? 0 : amount);
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
          <DialogTitle className="flex items-center gap-2 text-base">
            {isRefundMode ? <ArrowLeftRight className="w-4 h-4" /> : <Banknote className="w-4 h-4" />}
            {isRefundMode ? 'Remboursement' : 'Paiement Espèces'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Display area */}
          <div className="bg-muted rounded-lg p-3 space-y-2">
            {isRefundMode ? (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Montant à rendre</span>
                  <span className="text-xl font-bold text-green-600">{refundAmount.toFixed(2)} ₾</span>
                </div>
                <div className="pt-2 border-t border-border text-center">
                  <p className="text-sm text-muted-foreground">
                    Rendez {refundAmount.toFixed(2)} ₾ au client
                  </p>
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>

          {/* Only show bills and numpad for non-refund payments */}
          {!isRefundMode && (
            <>
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
            </>
          )}

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={handleClose}
              variant="outline"
              className="h-10 rounded-lg text-sm"
              disabled={processing}
            >
              Annuler
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!canConfirm || processing}
              className={`h-10 text-white rounded-lg font-semibold text-sm ${
                isRefundMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {processing ? 'Traitement...' : isRefundMode ? 'Confirmer remboursement' : 'Confirmer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CashPaymentDialog;
