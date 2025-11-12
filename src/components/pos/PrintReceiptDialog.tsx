import { useEffect, useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, X, Globe } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  
  const t = translations[language];

  const handlePrint = () => {
    // Add print styles for full page portrait
    const style = document.createElement('style');
    style.textContent = `
      @media print {
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          visibility: hidden;
          margin: 0;
          padding: 0;
        }
        .print-content {
          visibility: visible;
          position: fixed;
          left: 0;
          top: 0;
          width: 100% !important;
          height: 100vh !important;
          max-width: 100% !important;
          margin: 0 !important;
          padding: 10mm 15mm !important;
          font-family: 'Courier New', monospace !important;
          font-size: 11pt !important;
          line-height: 1.4 !important;
          color: #000 !important;
          background: #fff !important;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
        }
        .print-content * {
          visibility: visible;
        }
        @page {
          size: A4 portrait;
          margin: 0;
        }
      }
    `;
    document.head.appendChild(style);
    
    window.print();
    
    // Clean up and close after printing
    setTimeout(() => {
      document.head.removeChild(style);
      onClose();
    }, 500);
  };

  if (!receiptData) return null;

  const ReceiptContent = () => (
    <div className="w-full max-w-[80mm] mx-auto font-mono text-xs leading-tight">
      {/* Header */}
      <div className="text-center space-y-0 pb-1">
        <h2 className="text-base font-bold tracking-wide">{t.title.toUpperCase()}</h2>
        <p className="text-[9px]">{t.subtitle}</p>
        <div className="border-t border-dashed border-gray-400 my-1"></div>
      </div>

      {/* Order Info */}
      <div className="space-y-0 text-[9px] leading-tight">
        <div className="flex justify-between">
          <span>{t.orderNumber}</span>
          <span className="font-bold">{receiptData.orderNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>{t.date}</span>
          <span>{receiptData.date}</span>
        </div>
        <div className="flex justify-between">
          <span>{t.time}</span>
          <span>{receiptData.time}</span>
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

      <div className="border-t border-dashed border-gray-400 my-1"></div>

      {/* Items */}
      <div className="space-y-1">
        {receiptData.items.map((item, index) => (
          <div key={index} className="text-[9px] leading-tight">
            <div className="flex justify-between items-start">
              <span className="flex-1 pr-2">
                {item.quantity}x {item.productName}
                {(item.selectedSize || item.selectedMilk) && (
                  <span className="block text-[8px] opacity-70 ml-2">
                    {item.selectedSize?.name}
                    {item.selectedSize && item.selectedMilk && ', '}
                    {item.selectedMilk?.name}
                  </span>
                )}
              </span>
              <span className="font-medium whitespace-nowrap">
                {item.unitPrice.toFixed(2)} ₾  {item.totalPrice.toFixed(2)} ₾
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-dashed border-gray-400 my-1"></div>

      {/* Totals */}
      <div className="space-y-0 text-[9px] leading-tight">
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
        <div className="flex justify-between font-bold text-[11px] mt-0.5">
          <span>{t.total}</span>
          <span>{receiptData.total.toFixed(2)} ₾</span>
        </div>
      </div>

      <div className="border-t border-dashed border-gray-400 my-1"></div>

      {/* Payment */}
      <div className="space-y-0 text-[9px] leading-tight">
        <div className="flex justify-between">
          <span>{t.payment}</span>
          <span>{receiptData.paymentMethod === 'cash' ? t.cash : t.card}</span>
        </div>
        {receiptData.amountPaid !== undefined && receiptData.amountPaid > 0 && (
          <div className="flex justify-between">
            <span>{t.amountPaid}</span>
            <span>{receiptData.amountPaid.toFixed(2)} ₾</span>
          </div>
        )}
        {receiptData.change !== undefined && receiptData.change > 0 && (
          <div className="flex justify-between font-medium">
            <span>{t.change}</span>
            <span>{receiptData.change.toFixed(2)} ₾</span>
          </div>
        )}
      </div>

      {/* Loyalty Points */}
      {receiptData.pointsEarned && receiptData.pointsEarned > 0 && (
        <>
          <div className="border-t border-dashed border-gray-400 my-1"></div>
          <div className="text-center text-[9px]">
            <p>+{receiptData.pointsEarned} {t.points}</p>
          </div>
        </>
      )}

      {/* Footer */}
      <div className="text-center pt-1 space-y-0">
        <div className="border-t border-dashed border-gray-400 my-1"></div>
        <p className="text-[9px]">{t.thanks}</p>
        <p className="text-[8px]">{t.goodbye}</p>
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
            <div className="bg-muted p-4 rounded-lg max-h-[60vh] overflow-y-auto">
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
      <div className="hidden print:block print-content p-4">
        <ReceiptContent />
      </div>
    </>
  );
};

export default PrintReceiptDialog;
