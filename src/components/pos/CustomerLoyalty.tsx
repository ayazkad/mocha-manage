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
  const { cart } = usePOS();

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
      // Try exact QR code match first
      const { data: qrMatch } = await supabase
        .from('customers')
        .select('*')
        .eq('qr_code', searchTerm)
        .maybeSingle();
      
      if (qrMatch) {
        return [qrMatch as Customer];
      }

      // Search by name or phone
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
      
      if (error) throw error;
      return data as Customer[];
    },
    onSuccess: (customers) => {
      if (customers.length === 0) {
        toast.error('No customer found');
        setSearchResults([]);
        setShowResults(false);
      } else if (customers.length === 1) {
        setSelectedCustomer(customers[0]);
        onCustomerSelected?.(customers[0]);
        setSearchResults([]);
        setShowResults(false);
        toast.success(`Customer found: ${customers[0].name}`);
      } else {
        setSearchResults(customers);
        setShowResults(true);
        toast.info(`${customers.length} customers found`);
      }
    },
    onError: () => {
      toast.error('Search error');
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
    toast.success(`Customer selected: ${customer.name}`);
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
      setShowScanner(false);
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
          Loyalty Program
        </CardTitle>
        <CardDescription className="text-xs">
          Scan customer QR code to accumulate points
        </CardDescription>
      </CardHeader>
      <CardContent className="p-2 space-y-2">
        {!selectedCustomer && !showResults && !showScanner ? (
          <form onSubmit={handleSearch} className="space-y-1.5">
            <div className="flex gap-1.5">
              <Input
                placeholder="Name, phone or QR code..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="flex-1 h-8 text-xs"
              />
...
            </div>
            <p className="text-[10px] text-muted-foreground">
              Search by name, phone number or scan QR code
            </p>
          </form>
        ) : showScanner ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-xs">Scan QR Code</h3>
...
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              Position the QR code in front of the camera
            </p>
          </div>
        ) : showResults ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-xs">Search Results</h3>
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
                       {customer.points} points • {customer.total_purchases} purchases
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
                    <span className="font-medium">Points:</span>{' '}
                    <span className="text-sm font-bold text-primary">
                      {selectedCustomer.points}/10
                    </span>
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Total: {selectedCustomer.total_purchases}
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
                  🎉 Free Drink!
                </p>
                <p className="text-[10px] text-green-700 dark:text-green-300">
                  Free drink available
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