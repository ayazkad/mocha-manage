import { useEffect, useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, X } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface OrderItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  selectedSize?: { name: string };
  selectedMilk?: { name: string };
  discount?: number;
}

interface ReceiptData {
  orderNumber: string;
  employeeName: string;
  date: string;
  time: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  customerName?: string;
  pointsEarned?: number;
}

interface PrintReceiptDialogProps {
  open: boolean;
  onClose: () => void;
  receiptData: ReceiptData | null;
}

const PrintReceiptDialog = ({ open, onClose, receiptData }: PrintReceiptDialogProps) => {
  const [countdown, setCountdown] = useState(5);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);

      return () => clearInterval(timer);
    } else if (countdown === 0) {
      onClose();
    }
  }, [open, countdown, onClose]);

  useEffect(() => {
    if (open) {
      setCountdown(5);
    }
  }, [open]);

  const handlePrint = () => {
    window.print();
  };

  if (!receiptData) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md print:hidden">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg">Ticket de caisse</DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Receipt Preview */}
            <div className="bg-muted p-4 rounded-lg max-h-[60vh] overflow-y-auto">
              <div className="text-center space-y-1">
                <h2 className="text-xl font-bold">Coffee Shop</h2>
                <p className="text-xs text-muted-foreground">Votre café, notre passion</p>
                <Separator className="my-2" />
              </div>

              <div className="space-y-1 text-xs mb-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">N° Commande:</span>
                  <span className="font-mono font-bold">{receiptData.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span>{receiptData.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Heure:</span>
                  <span>{receiptData.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Employé:</span>
                  <span>{receiptData.employeeName}</span>
                </div>
                {receiptData.customerName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Client:</span>
                    <span>{receiptData.customerName}</span>
                  </div>
                )}
              </div>

              <Separator className="my-2" />

              <div className="space-y-2 mb-3">
                {receiptData.items.map((item, index) => (
                  <div key={index} className="space-y-0.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium">
                        {item.quantity}x {item.productName}
                      </span>
                      <span className="font-mono">
                        {item.totalPrice.toFixed(2)} ₾
                      </span>
                    </div>
                    {(item.selectedSize || item.selectedMilk) && (
                      <div className="text-[10px] text-muted-foreground ml-4">
                        {item.selectedSize && <span>{item.selectedSize.name}</span>}
                        {item.selectedSize && item.selectedMilk && <span>, </span>}
                        {item.selectedMilk && <span>{item.selectedMilk.name}</span>}
                      </div>
                    )}
                    {item.discount && item.discount > 0 && (
                      <div className="text-[10px] text-destructive ml-4">
                        Réduction: -{item.discount}%
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <Separator className="my-2" />

              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sous-total:</span>
                  <span className="font-mono">{receiptData.subtotal.toFixed(2)} ₾</span>
                </div>
                {receiptData.discount > 0 && (
                  <div className="flex justify-between text-destructive">
                    <span>Réduction:</span>
                    <span className="font-mono">-{receiptData.discount.toFixed(2)} ₾</span>
                  </div>
                )}
                <Separator className="my-1" />
                <div className="flex justify-between text-base font-bold">
                  <span>TOTAL:</span>
                  <span className="font-mono">{receiptData.total.toFixed(2)} ₾</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Mode de paiement:</span>
                  <span className="capitalize">{receiptData.paymentMethod === 'cash' ? 'Espèces' : 'Carte'}</span>
                </div>
              </div>

              {receiptData.pointsEarned && receiptData.pointsEarned > 0 && (
                <>
                  <Separator className="my-2" />
                  <div className="text-center text-xs bg-primary/10 p-2 rounded">
                    <p className="font-medium text-primary">
                      🎁 +{receiptData.pointsEarned} point{receiptData.pointsEarned > 1 ? 's' : ''} de fidélité!
                    </p>
                  </div>
                </>
              )}

              <div className="text-center mt-4 space-y-1">
                <p className="text-xs text-muted-foreground">Merci de votre visite!</p>
                <p className="text-[10px] text-muted-foreground">À bientôt 😊</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={handlePrint}
                className="flex-1 gap-2"
                size="lg"
              >
                <Printer className="h-4 w-4" />
                Imprimer le ticket
              </Button>
              <Button
                onClick={onClose}
                variant="outline"
                size="lg"
                className="gap-2"
              >
                Passer ({countdown}s)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Print-only version */}
      <div className="hidden print:block">
        <div className="max-w-[80mm] mx-auto p-4 font-mono text-xs">
          <div className="text-center space-y-1 mb-4">
            <h2 className="text-lg font-bold">Coffee Shop</h2>
            <p className="text-[10px]">Votre café, notre passion</p>
            <div className="border-t border-dashed border-black my-2"></div>
          </div>

          <div className="space-y-0.5 mb-3 text-[10px]">
            <div className="flex justify-between">
              <span>N° Commande:</span>
              <span className="font-bold">{receiptData.orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{receiptData.date}</span>
            </div>
            <div className="flex justify-between">
              <span>Heure:</span>
              <span>{receiptData.time}</span>
            </div>
            <div className="flex justify-between">
              <span>Employé:</span>
              <span>{receiptData.employeeName}</span>
            </div>
            {receiptData.customerName && (
              <div className="flex justify-between">
                <span>Client:</span>
                <span>{receiptData.customerName}</span>
              </div>
            )}
          </div>

          <div className="border-t border-dashed border-black my-2"></div>

          <div className="space-y-1.5 mb-3">
            {receiptData.items.map((item, index) => (
              <div key={index} className="text-[10px]">
                <div className="flex justify-between">
                  <span>{item.quantity}x {item.productName}</span>
                  <span>{item.totalPrice.toFixed(2)} ₾</span>
                </div>
                {(item.selectedSize || item.selectedMilk) && (
                  <div className="text-[9px] ml-3">
                    {item.selectedSize && <span>{item.selectedSize.name}</span>}
                    {item.selectedSize && item.selectedMilk && <span>, </span>}
                    {item.selectedMilk && <span>{item.selectedMilk.name}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-black my-2"></div>

          <div className="space-y-0.5 text-[10px]">
            <div className="flex justify-between">
              <span>Sous-total:</span>
              <span>{receiptData.subtotal.toFixed(2)} ₾</span>
            </div>
            {receiptData.discount > 0 && (
              <div className="flex justify-between">
                <span>Réduction:</span>
                <span>-{receiptData.discount.toFixed(2)} ₾</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm mt-1">
              <span>TOTAL:</span>
              <span>{receiptData.total.toFixed(2)} ₾</span>
            </div>
            <div className="flex justify-between">
              <span>Paiement:</span>
              <span>{receiptData.paymentMethod === 'cash' ? 'Espèces' : 'Carte'}</span>
            </div>
          </div>

          {receiptData.pointsEarned && receiptData.pointsEarned > 0 && (
            <>
              <div className="border-t border-dashed border-black my-2"></div>
              <div className="text-center text-[10px]">
                <p>+{receiptData.pointsEarned} point(s) de fidélité!</p>
              </div>
            </>
          )}

          <div className="text-center mt-4 space-y-0.5">
            <div className="border-t border-dashed border-black my-2"></div>
            <p className="text-[10px]">Merci de votre visite!</p>
            <p className="text-[9px]">À bientôt</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default PrintReceiptDialog;
