import { useEffect, useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, X, Globe } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
    title: 'Coffee Shop',
    subtitle: 'Your coffee, our passion',
    orderNumber: 'Order No:',
    date: 'Date:',
    time: 'Time:',
    employee: 'Employee:',
    customer: 'Customer:',
    subtotal: 'Subtotal:',
    discount: 'Discount:',
    total: 'TOTAL:',
    payment: 'Payment method:',
    cash: 'Cash',
    card: 'Card',
    amountPaid: 'Amount paid:',
    change: 'Change:',
    points: 'loyalty points!',
    thanks: 'Thank you for your visit!',
    goodbye: 'See you soon 😊',
    printButton: 'Print receipt',
    skipButton: 'Skip'
  },
  ru: {
    title: 'Coffee Shop',
    subtitle: 'Ваш кофе, наша страсть',
    orderNumber: '№ Заказа:',
    date: 'Дата:',
    time: 'Время:',
    employee: 'Сотрудник:',
    customer: 'Клиент:',
    subtotal: 'Промежуточный итог:',
    discount: 'Скидка:',
    total: 'ИТОГО:',
    payment: 'Способ оплаты:',
    cash: 'Наличные',
    card: 'Карта',
    amountPaid: 'Получено:',
    change: 'Сдача:',
    points: 'баллов!',
    thanks: 'Спасибо за визит!',
    goodbye: 'До скорой встречи 😊',
    printButton: 'Распечатать чек',
    skipButton: 'Пропустить'
  },
  ge: {
    title: 'Coffee Shop',
    subtitle: 'თქვენი ყავა, ჩვენი გატაცება',
    orderNumber: 'შეკვეთის №:',
    date: 'თარიღი:',
    time: 'დრო:',
    employee: 'თანამშრომელი:',
    customer: 'კლიენტი:',
    subtotal: 'შუალედური ჯამი:',
    discount: 'ფასდაკლება:',
    total: 'სულ:',
    payment: 'გადახდის მეთოდი:',
    cash: 'ნაღდი',
    card: 'ბარათი',
    amountPaid: 'მიღებული:',
    change: 'ხურდა:',
    points: 'ქულა!',
    thanks: 'მადლობა თქვენი ვიზიტისთვის!',
    goodbye: 'მალე გნახავთ 😊',
    printButton: 'ბეჭდვა',
    skipButton: 'გამოტოვება'
  }
};

interface PrintReceiptDialogProps {
  open: boolean;
  onClose: () => void;
  receiptData: ReceiptData | null;
}

const PrintReceiptDialog = ({ open, onClose, receiptData }: PrintReceiptDialogProps) => {
  const [language, setLanguage] = useState<Language>('en');
  const printRef = useRef<HTMLDivElement>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  
  const t = translations[language];

  // Generate QR code when receiptData changes
  useEffect(() => {
    if (receiptData?.orderId) {
      QRCode.toDataURL(receiptData.orderId, {
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      }).then(setQrCodeUrl).catch(console.error);
    }
  }, [receiptData?.orderId]);

  const handlePrint = () => {
    // Remove any existing print styles first
    const existingStyles = document.querySelectorAll('[data-print-receipt-style]');
    existingStyles.forEach(el => el.remove());

    // Add print styles for 80mm thermal printer (ESC/POS format)
    const style = document.createElement('style');
    style.setAttribute('data-print-receipt-style', 'true');
    style.textContent = `
      @media print {
        @page {
          size: 80mm auto;
          margin: 0 !important;
          padding: 0 !important;
        }
        html, body {
          visibility: hidden !important;
          margin: 0 !important;
          padding: 0 !important;
          width: 80mm !important;
          min-width: 80mm !important;
          max-width: 80mm !important;
          background: #fff !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body * {
          visibility: hidden !important;
        }
        .print-content,
        .print-content * {
          visibility: visible !important;
        }
        .print-content {
          display: block !important;
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 80mm !important;
          min-width: 80mm !important;
          max-width: 80mm !important;
          margin: 0 !important;
          padding: 2mm !important;
          font-family: 'Courier New', 'Consolas', monospace !important;
          font-size: 9pt !important;
          line-height: 1.3 !important;
          color: #000 !important;
          background: #fff !important;
        }
        .print-content img {
          max-width: 100% !important;
          height: auto !important;
        }
        /* Hide dialog and all UI elements */
        [role="dialog"],
        [data-radix-dialog-overlay],
        .print\\:hidden,
        button,
        header,
        nav {
          display: none !important;
          visibility: hidden !important;
        }
      }
    `;
    document.head.appendChild(style);
    
    window.print();
    
    // Clean up and close after printing
    setTimeout(() => {
      style.remove();
      onClose();
    }, 500);
  };

  if (!receiptData) return null;

  const ReceiptContent = () => (
    <div className="w-[72mm] mx-auto font-mono text-[9px] leading-tight">
      {/* Header - Shop Info */}
      <div className="text-center pb-1">
        <div className="text-[11px] font-bold tracking-wide">{t.title.toUpperCase()}</div>
        <div className="text-[8px]">{t.subtitle}</div>
        <div className="text-[7px]">Tbilisi, Georgia</div>
        <div className="text-[7px]">Tel: +995 XXX XXX XXX</div>
      </div>

      <div className="text-[8px] text-center">{'='.repeat(40)}</div>

      {/* Order Number */}
      <div className="text-center py-0.5">
        <div className="text-[10px] font-bold">#{receiptData.orderNumber}</div>
      </div>

      <div className="text-[8px] text-center">{'='.repeat(40)}</div>

      {/* Order Info */}
      <div className="py-0.5 text-[8px]">
        <div className="flex justify-between">
          <span>{t.date}</span>
          <span>{receiptData.date} {receiptData.time}</span>
        </div>
        <div className="flex justify-between">
          <span>{t.employee}</span>
          <span>{receiptData.employeeName}</span>
        </div>
        {receiptData.customerName && (
          <div className="flex justify-between">
            <span>{t.customer}</span>
            <span>{receiptData.customerName}</span>
          </div>
        )}
      </div>

      <div className="text-[8px] text-center">{'-'.repeat(40)}</div>

      {/* Items List */}
      <div className="py-0.5">
        {receiptData.items.map((item, index) => (
          <div key={index} className="text-[8px] py-0.5">
            <div className="flex justify-between">
              <span>{item.quantity}x {item.productName}</span>
              <span>{item.totalPrice.toFixed(2)}</span>
            </div>
            {(item.selectedSize || item.selectedMilk) && (
              <div className="text-[7px] pl-3 opacity-70">
                {item.selectedSize?.name}
                {item.selectedSize && item.selectedMilk && ', '}
                {item.selectedMilk?.name}
              </div>
            )}
            {item.quantity > 1 && (
              <div className="text-[7px] pl-3 opacity-70">
                @ {item.unitPrice.toFixed(2)} ₾
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="text-[8px] text-center">{'-'.repeat(40)}</div>

      {/* Totals */}
      <div className="py-0.5 text-[8px]">
        <div className="flex justify-between">
          <span>{t.subtotal}</span>
          <span>{receiptData.subtotal.toFixed(2)} ₾</span>
        </div>
        {receiptData.discount > 0 && (
          <div className="flex justify-between">
            <span>{t.discount}</span>
            <span>-{receiptData.discount.toFixed(2)} ₾</span>
          </div>
        )}
      </div>

      <div className="text-[8px] text-center">{'-'.repeat(40)}</div>

      {/* TOTAL */}
      <div className="flex justify-between text-[11px] font-bold py-0.5">
        <span>{t.total}</span>
        <span>{receiptData.total.toFixed(2)} ₾</span>
      </div>

      <div className="text-[8px] text-center">{'='.repeat(40)}</div>

      {/* Payment Info */}
      <div className="py-0.5 text-[8px]">
        <div className="flex justify-between">
          <span>{t.payment}</span>
          <span className="uppercase">{receiptData.paymentMethod === 'cash' ? t.cash : t.card}</span>
        </div>
        {receiptData.amountPaid !== undefined && receiptData.amountPaid > 0 && (
          <div className="flex justify-between">
            <span>{t.amountPaid}</span>
            <span>{receiptData.amountPaid.toFixed(2)} ₾</span>
          </div>
        )}
        {receiptData.change !== undefined && receiptData.change > 0 && (
          <div className="flex justify-between font-bold">
            <span>{t.change}</span>
            <span>{receiptData.change.toFixed(2)} ₾</span>
          </div>
        )}
      </div>

      {/* Loyalty Points */}
      {receiptData.pointsEarned && receiptData.pointsEarned > 0 && (
        <>
          <div className="text-[8px] text-center">{'-'.repeat(40)}</div>
          <div className="text-center text-[8px] font-medium py-0.5">
            ★ +{receiptData.pointsEarned} {t.points} ★
          </div>
        </>
      )}

      <div className="text-[8px] text-center">{'='.repeat(40)}</div>

      {/* Footer */}
      <div className="text-center py-1">
        <div className="text-[9px] font-medium">{t.thanks}</div>
        <div className="text-[8px]">{t.goodbye}</div>
      </div>

      {/* QR Code */}
      {qrCodeUrl && (
        <div className="text-center py-1">
          <img 
            src={qrCodeUrl} 
            alt="QR" 
            className="mx-auto w-20 h-20"
          />
          <div className="text-[7px] opacity-70">Scan for details</div>
        </div>
      )}

      <div className="text-[6px] text-center opacity-50 pt-1">
        Powered by Coffee POS
      </div>
    </div>
  );

  return (
    <>
      <Dialog open={open}>
        <DialogContent 
          className="max-w-md print:hidden" 
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg">Receipt</DialogTitle>
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
            {/* Language Selector */}
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ru">Русский</SelectItem>
                  <SelectItem value="ge">ქართული</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Receipt Preview */}
            <div className="bg-white text-black p-4 rounded-lg max-h-[60vh] overflow-y-auto">
              <ReceiptContent />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={handlePrint}
                className="flex-1 gap-2"
                size="lg"
              >
                <Printer className="h-4 w-4" />
                {t.printButton}
              </Button>
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1"
                size="lg"
              >
                {t.skipButton}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Print-only version */}
      <div className="hidden print:block print-content">
        <ReceiptContent />
      </div>
    </>
  );
};

export default PrintReceiptDialog;
