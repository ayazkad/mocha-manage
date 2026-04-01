import { useEffect, useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Globe, Copy, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import logoLatte from '@/assets/logo-latte.png';
import { getPrintClient, isNativeMode } from '@/printing/printClient';
import { supabase } from '@/integrations/supabase/client';
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

interface BusinessInfo {
  business_name: string;
  ice: string;
  identifiant_fiscal: string;
  patente: string;
  rc: string;
  address: string;
  city: string;
  phone: string;
  tva_rate: number;
  currency: string;
  footer_message: string;
}

interface TicketHashInfo {
  ticket_hash: string | null;
  previous_hash: string | null;
}

type Language = 'fr' | 'en';

const translations = {
  fr: {
    title: 'LATTE',
    subtitle: 'Votre café, notre passion',
    orderNumber: 'N° Commande :',
    date: 'Date :',
    time: 'Heure :',
    employee: 'Serveur :',
    customer: 'Client :',
    subtotal: 'Sous-total :',
    discount: 'Remise :',
    total: 'TOTAL :',
    totalHT: 'Total HT :',
    tva: 'TVA',
    totalTTC: 'Total TTC :',
    payment: 'Paiement :',
    cash: 'ESPÈCES',
    card: 'CARTE',
    amountPaid: 'Payé :',
    change: 'Rendu :',
    points: 'points fidélité !',
    thanks: 'Merci de votre visite !',
    goodbye: 'À bientôt !',
    printButton: 'Imprimer ticket',
    skipButton: 'Passer',
    copyButton: 'Copier',
    copied: 'Copié !'
  },
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
    totalHT: 'Total excl. tax:',
    tva: 'VAT',
    totalTTC: 'Total incl. tax:',
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
  }
};

interface PrintReceiptDialogProps {
  open: boolean;
  onClose: () => void;
  receiptData: ReceiptData | null;
}

// Generate pure text receipt with legal mentions
export const generateTextReceipt = (
  data: ReceiptData,
  t: typeof translations.en,
  business?: BusinessInfo | null,
  hashInfo?: TicketHashInfo | null
): string => {
  const WIDTH = 42;
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

  const currency = business?.currency || 'MAD';
  const formatPrice = (price: number): string => `${price.toFixed(2)} ${currency}`;

  let receipt = '';

  // Header with business info
  if (business && business.business_name) {
    receipt += '\n';
    if (business.address) receipt += center(business.address) + '\n';
    if (business.city) receipt += center(business.city) + '\n';
    if (business.phone) receipt += center('Tel: ' + business.phone) + '\n';
    receipt += '\n';

    // Legal mentions
    if (business.ice) receipt += center('ICE: ' + business.ice) + '\n';
    if (business.identifiant_fiscal) receipt += center('IF: ' + business.identifiant_fiscal) + '\n';
    if (business.patente) receipt += center('Patente: ' + business.patente) + '\n';
    if (business.rc) receipt += center('RC: ' + business.rc) + '\n';
  } else {
    receipt += '\n';
    receipt += center('Casablanca, Maroc') + '\n';
    receipt += center('Tel: +212 6XX XX XX XX') + '\n';
  }

  receipt += '\n';
  receipt += LINE + '\n';

  // Order Number
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

    if (item.selectedSize || item.selectedMilk) {
      const options = [item.selectedSize?.name, item.selectedMilk?.name]
        .filter(Boolean)
        .join(', ');
      receipt += '   -> ' + options + '\n';
    }

    if (item.quantity > 1) {
      receipt += `   @ ${item.unitPrice.toFixed(2)} ${currency} each\n`;
    }
  });
  receipt += '\n';
  receipt += DASHED + '\n';

  // Totals with TVA
  const tvaRate = business?.tva_rate || 20;
  const totalTTC = data.total;
  const totalHT = totalTTC / (1 + tvaRate / 100);
  const tvaAmount = totalTTC - totalHT;

  receipt += leftRight(t.subtotal, formatPrice(data.subtotal)) + '\n';
  if (data.discount > 0) {
    receipt += leftRight(t.discount, '-' + formatPrice(data.discount)) + '\n';
  }
  receipt += DASHED + '\n';

  receipt += leftRight(t.totalHT, formatPrice(totalHT)) + '\n';
  receipt += leftRight(`${t.tva} (${tvaRate}%) :`, formatPrice(tvaAmount)) + '\n';
  receipt += '\n';
  receipt += leftRight('>>> ' + t.totalTTC, formatPrice(totalTTC) + ' <<<') + '\n';
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
  if (business?.footer_message) {
    receipt += center(business.footer_message) + '\n';
  } else {
    receipt += center(t.thanks) + '\n';
    receipt += center(t.goodbye) + '\n';
  }
  receipt += '\n';

  // Ticket hash for anti-fraud (DGI compliance)
  if (hashInfo?.ticket_hash) {
    receipt += center('Hash: ' + hashInfo.ticket_hash.slice(0, 16)) + '\n';
  }

  // Order ID for reference
  receipt += center('ID: ' + data.orderId.slice(0, 8)) + '\n';
  receipt += '\n';
  receipt += center('---') + '\n';
  receipt += '\n\n\n';

  return receipt;
};

const PrintReceiptDialog = ({ open, onClose, receiptData }: PrintReceiptDialogProps) => {
  const [receiptText, setReceiptText] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const [hashInfo, setHashInfo] = useState<TicketHashInfo | null>(null);
  const logoBase64Ref = useRef<string>('');

  const t = translations['fr'];
  const isNative = isNativeMode();
  const printClient = getPrintClient();

  // Fetch business settings
  useEffect(() => {
    const fetchBusiness = async () => {
      const { data } = await supabase
        .from('business_settings')
        .select('*')
        .limit(1)
        .single();
      if (data) setBusinessInfo(data as BusinessInfo);
    };
    fetchBusiness();
  }, []);

  // Fetch ticket hash when receipt opens
  useEffect(() => {
    if (receiptData?.orderId && open) {
      const fetchHash = async () => {
        const { data } = await supabase
          .from('orders')
          .select('ticket_hash, previous_hash')
          .eq('id', receiptData.orderId)
          .single();
        if (data) setHashInfo(data as TicketHashInfo);
      };
      fetchHash();
    }
  }, [receiptData?.orderId, open]);

  // Convert logo to base64 on mount
  useEffect(() => {
    const loadLogo = async () => {
      try {
        const response = await fetch(logoLatte);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          logoBase64Ref.current = reader.result as string;
        };
        reader.readAsDataURL(blob);
      } catch (err) {
        console.warn('Failed to load logo for printing:', err);
      }
    };
    loadLogo();
  }, []);

  // Generate QR code for order ID
  useEffect(() => {
    if (receiptData?.orderId) {
      QRCode.toDataURL(receiptData.orderId, {
        width: 120,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' }
      }).then(url => setQrCodeDataUrl(url))
        .catch(err => console.error('QR code generation failed:', err));
    }
  }, [receiptData?.orderId]);

  // Generate text receipt when data or business info changes
  useEffect(() => {
    if (receiptData) {
      const text = generateTextReceipt(receiptData, t, businessInfo, hashInfo);
      setReceiptText(text);
    }
  }, [receiptData, t, businessInfo, hashInfo]);

  const handlePrint = async () => {
    if (isPrinting || !receiptData) return;

    try {
      setIsPrinting(true);
      const result = await printClient.printReceiptWithImages(
        receiptText,
        logoBase64Ref.current || undefined,
        receiptData.orderId
      );

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
      <DialogContent className="w-[90%] max-w-[340px] p-4 rounded-2xl border-none shadow-xl" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader className="pb-2">
          <DialogTitle className="text-base">Ticket #{receiptData.orderNumber}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {!isNative && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500 bg-amber-500/10 p-3 text-sm">
              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-muted-foreground">
                Impression non disponible en mode web. Utilisez le client desktop ou l'app mobile.
              </p>
            </div>
          )}

          {/* Receipt Preview with Logo */}
          <div className="bg-white text-black p-3 rounded-lg max-h-[45vh] overflow-auto">
            <div className="mx-auto w-fit">
              <div className="flex justify-center mb-2">
                <img src={logoLatte} alt="Latte logo" className="h-10 w-auto object-contain block" />
              </div>
              <pre className="font-mono text-[9px] leading-tight whitespace-pre overflow-x-auto">{receiptText}</pre>

              {qrCodeDataUrl && (
                <div className="flex flex-col items-center mt-2">
                  <img src={qrCodeDataUrl} alt="Order QR Code" className="w-20 h-20" />
                  <p className="font-mono text-[8px] text-gray-600 mt-1 text-center">
                    Scan to view order
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
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
