import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Globe, Copy, Check, AlertCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import logoLatte from '@/assets/logo-latte.png';
import { getPrintClient, isNativeMode } from '@/printing/printClient';
import QRCode from 'qrcode';

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
  orderId: string;
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
  amountPaid?: number;
  change?: number;
}

type Language = 'en' | 'ru' | 'ge';

const translations = {
  en: {
    title: 'LATTE',
    subtitle: 'Your coffee, our passion',
    orderNumber: 'Order No:',
    date: 'Date:',
    time: 'Time:',
    employee: 'Employee:',
    customer: 'Customer:',
    subtotal: 'Subtotal:',
    discount: 'Discount:',
    total: 'TOTAL:',
    payment: 'Payment:',
    cash: 'CASH',
    card: 'CARD',
    amountPaid: 'Paid:',
    change: 'Change:',
    points: 'loyalty points!',
    thanks: 'Thank you for your visit!',
    goodbye: 'See you soon!',
    printButton: 'Print receipt',
    skipButton: 'Skip',
    copyButton: 'Copy',
    copied: 'Copied!'
  },
  ru: {
    title: 'LATTE',
    subtitle: 'Ваш кофе, наша страсть',
    orderNumber: '№ Заказа:',
    date: 'Дата:',
    time: 'Время:',
    employee: 'Сотрудник:',
    customer: 'Клиент:',
    subtotal: 'Промежуточно:',
    discount: 'Скидка:',
    total: 'ИТОГО:',
    payment: 'Оплата:',
    cash: 'НАЛИЧНЫЕ',
    card: 'КАРТА',
    amountPaid: 'Получено:',
    change: 'Сдача:',
    points: 'баллов!',
    thanks: 'Спасибо за визит!',
    goodbye: 'До скорой встречи!',
    printButton: 'Распечатать',
    skipButton: 'Пропустить',
    copyButton: 'Копировать',
    copied: 'Скопировано!'
  },
  ge: {
    title: 'LATTE',
    subtitle: 'თქვენი ყავა, ჩვენი გატაცება',
    orderNumber: 'შეკვეთა №:',
    date: 'თარიღი:',
    time: 'დრო:',
    employee: 'თანამშრომელი:',
    customer: 'კლიენტი:',
    subtotal: 'შუალედური:',
    discount: 'ფასდაკლება:',
    total: 'სულ:',
    payment: 'გადახდა:',
    cash: 'ნაღდი',
    card: 'ბარათი',
    amountPaid: 'მიღებული:',
    change: 'ხურდა:',
    points: 'ქულა!',
    thanks: 'მადლობა!',
    goodbye: 'მალე გნახავთ!',
    printButton: 'ბეჭდვა',
    skipButton: 'გამოტოვება',
    copyButton: 'კოპირება',
    copied: 'კოპირებულია!'
  }
};

interface PrintReceiptDialogProps {
  open: boolean;
  onClose: () => void;
  receiptData: ReceiptData | null;
}

// Generate pure text receipt (can be sent to ESC/POS printer)
export const generateTextReceipt = (data: ReceiptData, t: typeof translations.en): string => {
  const WIDTH = 42; // Character width for 80mm thermal printer
  const LINE = '='.repeat(WIDTH);
  const DASHED = '-'.repeat(WIDTH);

  const center = (text: string): string => {
    const padding = Math.max(0, Math.floor((WIDTH - text.length) / 2));
    return ' '.repeat(padding) + text;
  };

  const leftRight = (left: string, right: string): string => {
    const spaces = Math.max(1, WIDTH - left.length - right.length);
    return left + ' '.repeat(spaces) + right;
  };

  const formatPrice = (price: number): string => `${price.toFixed(2)} GEL`;

  let receipt = '';

  // Header - Only address info (logo is shown separately)
  receipt += '\n';
  receipt += center('Tbilisi, Georgia') + '\n';
  receipt += center('Tel: +995 XXX XXX XXX') + '\n';
  receipt += '\n';
  receipt += LINE + '\n';

  // Order Number (big and centered)
  receipt += '\n';
  receipt += center('*** ORDER ***') + '\n';
  receipt += center('#' + data.orderNumber) + '\n';
  receipt += '\n';
  receipt += LINE + '\n';

  // Order Info
  receipt += leftRight(t.date, data.date + ' ' + data.time) + '\n';
  receipt += leftRight(t.employee, data.employeeName) + '\n';
  if (data.customerName) {
    receipt += leftRight(t.customer, data.customerName) + '\n';
  }
  receipt += DASHED + '\n';

  // Items
  receipt += '\n';
  data.items.forEach(item => {
    const itemLine = `${item.quantity}x ${item.productName}`;
    const priceLine = formatPrice(item.totalPrice);
    receipt += leftRight(itemLine, priceLine) + '\n';

    // Options (size, milk)
    if (item.selectedSize || item.selectedMilk) {
      const options = [item.selectedSize?.name, item.selectedMilk?.name]
        .filter(Boolean)
        .join(', ');
      receipt += '   -> ' + options + '\n';
    }

    // Unit price if quantity > 1
    if (item.quantity > 1) {
      receipt += `   @ ${item.unitPrice.toFixed(2)} GEL each\n`;
    }
  });
  receipt += '\n';
  receipt += DASHED + '\n';

  // Totals
  receipt += leftRight(t.subtotal, formatPrice(data.subtotal)) + '\n';
  if (data.discount > 0) {
    receipt += leftRight(t.discount, '-' + formatPrice(data.discount)) + '\n';
  }
  receipt += DASHED + '\n';

  // Grand Total (emphasized)
  receipt += '\n';
  receipt += leftRight('>>> ' + t.total, formatPrice(data.total) + ' <<<') + '\n';
  receipt += '\n';
  receipt += LINE + '\n';

  // Payment Info
  const paymentText = data.paymentMethod === 'cash' ? t.cash : t.card;
  receipt += leftRight(t.payment, paymentText) + '\n';

  if (data.amountPaid !== undefined && data.amountPaid > 0) {
    receipt += leftRight(t.amountPaid, formatPrice(data.amountPaid)) + '\n';
  }
  if (data.change !== undefined && data.change > 0) {
    receipt += leftRight('*** ' + t.change, formatPrice(data.change) + ' ***') + '\n';
  }

  // Loyalty Points
  if (data.pointsEarned && data.pointsEarned > 0) {
    receipt += DASHED + '\n';
    receipt += center('* +' + data.pointsEarned + ' ' + t.points + ' *') + '\n';
  }

  receipt += LINE + '\n';

  // Footer
  receipt += '\n';
  receipt += center(t.thanks) + '\n';
  receipt += center(t.goodbye) + '\n';
  receipt += '\n';

  // Order ID for reference
  receipt += center('ID: ' + data.orderId.slice(0, 8)) + '\n';
  receipt += '\n';
  receipt += center('---') + '\n';
  receipt += '\n\n\n'; // Paper feed

  return receipt;
};

const PrintReceiptDialog = ({ open, onClose, receiptData }: PrintReceiptDialogProps) => {
  const [language, setLanguage] = useState<Language>('en');
  const [receiptText, setReceiptText] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  const t = translations[language];
  const isNative = isNativeMode();
  const printClient = getPrintClient();

  // Generate QR code for order ID
  useEffect(() => {
    if (receiptData?.orderId) {
      QRCode.toDataURL(receiptData.orderId, {
        width: 120,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      }).then(url => {
        setQrCodeDataUrl(url);
      }).catch(err => {
        console.error('QR code generation failed:', err);
      });
    }
  }, [receiptData?.orderId]);

  // Generate text receipt when data or language changes
  useEffect(() => {
    if (receiptData) {
      const text = generateTextReceipt(receiptData, t);
      setReceiptText(text);
    }
  }, [receiptData, t]);

  const handlePrint = async () => {
    if (isPrinting) return;

    try {
      setIsPrinting(true);
      console.log('[PrintReceiptDialog] Sending receipt via PrintClient...');
      
      const result = await printClient.printReceipt(receiptText);

      if (result.success) {
        toast.success(result.message);
        onClose();
        return;
      }

      toast.error(result.message);
    } catch (error) {
      const err = error as Error;
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(receiptText);
      setCopied(true);
      toast.success('Copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  if (!receiptData) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-[340px] p-4" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader className="pb-2">
          <DialogTitle className="text-base">Receipt #{receiptData.orderNumber}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Web mode warning */}
          {!isNative && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500 bg-amber-500/10 p-3 text-sm">
              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-muted-foreground">
                Impression non disponible en mode web. Utilisez le client desktop ou l'app mobile.
              </p>
            </div>
          )}

          {/* Language Selector - only affects receipt text */}
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
              <SelectTrigger className="flex-1 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={4}>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ru">Русский</SelectItem>
                <SelectItem value="ge">ქართული</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Receipt Preview with Logo */}
          <div className="bg-white text-black p-3 rounded-lg max-h-[45vh] overflow-auto">
            <div className="mx-auto w-fit">
              <div className="flex justify-center mb-2">
                <img
                  src={logoLatte}
                  alt="Latte logo"
                  className="h-10 w-auto object-contain block"
                />
              </div>
              <pre className="font-mono text-[9px] leading-tight whitespace-pre overflow-x-auto">{receiptText}</pre>
              
              {/* QR Code integrated in receipt */}
              {qrCodeDataUrl && (
                <div className="flex flex-col items-center mt-2">
                  <img 
                    src={qrCodeDataUrl} 
                    alt="Order QR Code" 
                    className="w-20 h-20"
                  />
                  <p className="font-mono text-[8px] text-gray-600 mt-1 text-center">
                    Scan to view order
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Actions - Always in English */}
          <div className="flex gap-2">
            <Button
              onClick={handlePrint}
              className="flex-1 gap-1.5 h-9 text-sm"
              disabled={isPrinting || receiptText.trim().length === 0 || !isNative}
              title={!isNative ? "Disponible uniquement sur le client desktop ou l'app mobile" : undefined}
            >
              <Printer className="h-3.5 w-3.5" />
              {isPrinting ? 'Envoi…' : 'Imprimer'}
            </Button>
            <Button onClick={handleCopy} variant="outline" className="gap-1.5 h-9 text-sm">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              Copier
            </Button>
            <Button onClick={onClose} variant="outline" className="h-9 text-sm">
              Passer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PrintReceiptDialog;
