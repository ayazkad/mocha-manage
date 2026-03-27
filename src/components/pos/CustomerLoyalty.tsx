import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Gift, Search, X, ScanLine } from 'lucide-react';
import { usePOS } from '@/contexts/POSContext';
import { Scanner } from '@yudiel/react-qr-scanner';
import DrinkPointsDisplay from './DrinkPointsDisplay';
import { useNavigate } from 'react-router-dom';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  qr_code: string;
  points: number;
  total_purchases: number;
}

interface CustomerLoyaltyProps {
  onCustomerSelected?: (customer: Customer | null) => void;
  selectedCustomer?: Customer | null;
}

const CustomerLoyalty = ({ onCustomerSelected, selectedCustomer: externalCustomer }: CustomerLoyaltyProps) => {
  const [searchInput, setSearchInput] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const queryClient = useQueryClient();
  // Added loadOrderForModification to destructuring
  const { cart, addToCart, loadOrderForModification } = usePOS();
  const navigate = useNavigate();

  // Sync with external selectedCustomer prop
  useEffect(() => {
    if (externalCustomer === null && selectedCustomer !== null) {
      setSelectedCustomer(null);
      setSearchInput('');
      setSearchResults([]);
      setShowResults(false);
      setShowScanner(false);
    }
  }, [externalCustomer]);

  const searchCustomerMutation = useMutation({
    mutationFn: async (searchTerm: string) => {
      // 1. Try exact QR code match for customer
      const { data: qrMatch } = await supabase
        .from('customers')
        .select('*')
        .eq('qr_code', searchTerm)
        .maybeSingle();

      if (qrMatch) {
        return { type: 'customer', data: [qrMatch as Customer] };
      }

      // 2. Try to find an ORDER by UUID (for ticket reloading)
      // Basic UUID regex check to avoid unnecessary queries
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(searchTerm)) {
        const { data: order } = await supabase
          .from('orders')
          .select(`
            *,
            order_items (*)
          `)
          .eq('id', searchTerm)
          .maybeSingle();

        if (order) {
          return { type: 'order', data: order };
        }
      }

      // 3. Search by name or phone for customer
      const { data: customerData } = await supabase
        .from('customers')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);

      if (customerData && customerData.length > 0) {
        return { type: 'customer', data: customerData as Customer[] };
      }

      // 4. If no customer/order found, try to find a PRODUCT by barcode
      const { data: productData } = await supabase
        .from('products')
        .select('*')
        .eq('barcode', searchTerm)
        .eq('active', true)
        .maybeSingle();

      if (productData) {
        return { type: 'product', data: productData };
      }

      return { type: 'none', data: [] };
    },
    onSuccess: (result: any) => {
      if (result.type === 'none') {
        toast.error('Aucun client, commande ou produit trouvé');
        setSearchResults([]);
        setShowResults(false);
      } else if (result.type === 'customer') {
        const customers = result.data;
        if (customers.length === 1) {
          setSelectedCustomer(customers[0]);
          onCustomerSelected?.(customers[0]);
          setSearchResults([]);
          setShowResults(false);
          setShowScanner(false);
          setSearchInput(''); // clear input on success
          toast.success(`Client trouvé : ${customers[0].name}`);
        } else {
          setSearchResults(customers);
          setShowResults(true);
          toast.info(`${customers.length} clients trouvés`);
        }
      } else if (result.type === 'product') {
        const product = result.data;
        // Add product to cart
        addToCart({
          productId: product.id,
          productName: product.name_fr || product.name_en, // Default to French name
          quantity: 1,
          basePrice: product.base_price,
          image_url: product.image_url,
          notes: '',
        });
        toast.success(`Ajouté ${product.name_fr || product.name_en} au panier`);
        setSearchResults([]);
        setShowResults(false);
        setShowScanner(false); // Close scanner after product scan too
        setSearchInput('');
      } else if (result.type === 'order') {
        const order = result.data;

        // Reconstruct cart items from order items
        const cartItems = order.order_items.map((item: any) => {
          const options = item.selected_options
            ? (typeof item.selected_options === 'string' ? JSON.parse(item.selected_options) : item.selected_options)
            : null;

          return {
            productId: item.product_id || '',
            productName: item.product_name,
            quantity: item.quantity,
            basePrice: item.unit_price,
            selectedSize: options?.size,
            selectedMilk: options?.milk,
            notes: item.notes || undefined,
          };
        });

        const originalOrderData = {
          orderId: order.id,
          orderNumber: order.order_number,
          originalTotal: Number(order.total),
          items: cartItems,
        };

        loadOrderForModification(originalOrderData, cartItems);

        toast.success(`Ticket #${order.order_number} chargé pour modification`);
        setSearchResults([]);
        setShowResults(false);
        setShowScanner(false);
        setSearchInput('');
        navigate('/pos'); // Ensure we are on POS page
      }
    },
    onError: () => {
      toast.error('Erreur de recherche');
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    searchCustomerMutation.mutate(searchInput.trim());
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    onCustomerSelected?.(customer);
    setSearchResults([]);
    setShowResults(false);
    setSearchInput('');
    toast.success(`Client sélectionné : ${customer.name}`);
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
    setSearchInput('');
    setSearchResults([]);
    setShowResults(false);
    setShowScanner(false);
    onCustomerSelected?.(null);
  };

  const handleScan = (result: string) => {
    if (result) {
      // Don't close scanner immediately, let mutation success close it
      // so users can see feedback if error
      searchCustomerMutation.mutate(result);
    }
  };

  const canRedeemReward = selectedCustomer && selectedCustomer.points >= 10;
  const itemsInCart = cart.length;

  return (
    <Card className="w-full border-0 shadow-none">
      <CardHeader className="p-2 pb-1">
        <CardTitle className="flex items-center gap-1.5 text-sm">
          <Gift className="h-3.5 w-3.5" />
          Programme de fidélité
        </CardTitle>
        <CardDescription className="text-xs">
          Scannez le code QR du client pour accumuler des points
        </CardDescription>
      </CardHeader>
      <CardContent className="p-2 space-y-2">
        {!selectedCustomer && !showResults && !showScanner ? (
          <form onSubmit={handleSearch} className="space-y-1.5">
            <div className="flex gap-1.5">
              <Input
                placeholder="Nom, téléphone ou code QR..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="flex-1 h-8 text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setShowScanner(true)}
              >
                <ScanLine className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Recherchez par nom, téléphone ou scannez le code QR
            </p>
          </form>
        ) : showScanner ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-xs">Scanner le code QR</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowScanner(false)}
                className="h-6 w-6"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="rounded-lg overflow-hidden bg-muted aspect-square max-h-[200px]">
              <Scanner
                onScan={(detectedCodes) => {
                  const code = detectedCodes[0]?.rawValue;
                  if (code) {
                    handleScan(code);
                  }
                }}
                styles={{
                  container: {
                    width: '100%',
                    height: '100%',
                  },
                }}
                components={{
                  finder: true,
                }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              Placez le code QR devant la caméra
            </p>
          </div>
        ) : showResults ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-xs">Résultats de recherche</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowResults(false);
                  setSearchResults([]);
                }}
                className="h-6 w-6"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
              {searchResults.map((customer) => (
                <div
                  key={customer.id}
                  onClick={() => handleSelectCustomer(customer)}
                  className="w-full p-2 bg-muted hover:bg-muted/80 rounded-md text-left transition-colors touch-manipulation cursor-pointer"
                >
                  <div className="space-y-0.5">
                    <p className="font-semibold text-xs">{customer.name}</p>
                    <p className="text-[10px] text-muted-foreground">{customer.email}</p>
                    <p className="text-[10px] text-muted-foreground">{customer.phone}</p>
                    <p className="text-[10px] text-primary font-medium">
                      {customer.points} points • {customer.total_purchases} achats
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-start justify-between p-2 bg-muted rounded-md">
              <div className="space-y-0.5 flex-1 min-w-0">
                <h3 className="font-semibold text-xs">{selectedCustomer.name}</h3>
                <p className="text-[10px] text-muted-foreground truncate">{selectedCustomer.email}</p>
                <p className="text-[10px] text-muted-foreground">{selectedCustomer.phone}</p>
                <div className="mt-1 space-y-0.5">
                  <p className="text-[10px]">
                    <span className="font-medium">Points :</span>{' '}
                    <span className="text-sm font-bold text-primary">
                      {selectedCustomer.points}/10
                    </span>
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Total : {selectedCustomer.total_purchases} achats
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={clearCustomer}
                className="touch-manipulation h-6 w-6 shrink-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>

            {canRedeemReward && (
              <div className="p-2 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md">
                <p className="text-[10px] font-medium text-green-800 dark:text-green-200 flex items-center gap-1">
                  <Gift className="h-3 w-3" />
                  🎉 Boisson offerte !
                </p>
                <p className="text-[10px] text-green-700 dark:text-green-300">
                  Boisson gratuite disponible
                </p>
              </div>
            )}

            {itemsInCart > 0 && (
              <DrinkPointsDisplay cart={cart} />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CustomerLoyalty;