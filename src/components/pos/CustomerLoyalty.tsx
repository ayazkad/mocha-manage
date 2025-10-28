import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Gift, Search, X } from 'lucide-react';
import { usePOS } from '@/contexts/POSContext';

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
}

const CustomerLoyalty = ({ onCustomerSelected }: CustomerLoyaltyProps) => {
  const [searchInput, setSearchInput] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [showResults, setShowResults] = useState(false);
  const queryClient = useQueryClient();
  const { cart } = usePOS();

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
        toast.error('Aucun client trouvé');
        setSearchResults([]);
        setShowResults(false);
      } else if (customers.length === 1) {
        setSelectedCustomer(customers[0]);
        onCustomerSelected?.(customers[0]);
        setSearchResults([]);
        setShowResults(false);
        toast.success(`Client trouvé: ${customers[0].name}`);
      } else {
        setSearchResults(customers);
        setShowResults(true);
        toast.info(`${customers.length} clients trouvés`);
      }
    },
    onError: () => {
      toast.error('Erreur lors de la recherche');
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
    toast.success(`Client sélectionné: ${customer.name}`);
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
    setSearchInput('');
    setSearchResults([]);
    setShowResults(false);
    onCustomerSelected?.(null);
  };

  const canRedeemReward = selectedCustomer && selectedCustomer.points >= 10;
  const itemsInCart = cart.length;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5" />
          Programme de fidélité
        </CardTitle>
        <CardDescription>
          Scannez le QR code client pour accumuler des points
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!selectedCustomer && !showResults ? (
          <form onSubmit={handleSearch} className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Nom, téléphone ou QR code..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="flex-1"
              />
              <Button 
                type="submit" 
                disabled={searchCustomerMutation.isPending}
                className="touch-manipulation"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Recherchez par nom, numéro de téléphone ou scannez le QR code
            </p>
          </form>
        ) : showResults ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Résultats de recherche</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowResults(false);
                  setSearchResults([]);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {searchResults.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => handleSelectCustomer(customer)}
                  className="w-full p-4 bg-muted hover:bg-muted/80 rounded-lg text-left transition-colors touch-manipulation"
                >
                  <div className="space-y-1">
                    <p className="font-semibold text-base">{customer.name}</p>
                    <p className="text-sm text-muted-foreground">{customer.email}</p>
                    <p className="text-sm text-muted-foreground">{customer.phone}</p>
                    <p className="text-xs text-primary font-medium">
                      {customer.points} points • {customer.total_purchases} achats
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start justify-between p-4 bg-muted rounded-lg">
              <div className="space-y-1">
                <h3 className="font-semibold text-lg">{selectedCustomer.name}</h3>
                <p className="text-sm text-muted-foreground">{selectedCustomer.email}</p>
                <p className="text-sm text-muted-foreground">{selectedCustomer.phone}</p>
                <div className="mt-2 space-y-1">
                  <p className="text-sm">
                    <span className="font-medium">Points actuels:</span>{' '}
                    <span className="text-lg font-bold text-primary">
                      {selectedCustomer.points}/10
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Total achats: {selectedCustomer.total_purchases}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={clearCustomer}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {canRedeemReward && (
              <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm font-medium text-green-800 dark:text-green-200 flex items-center gap-2">
                  <Gift className="h-4 w-4" />
                  🎉 Boisson offerte disponible !
                </p>
                <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                  Ce client peut bénéficier d'une boisson gratuite
                </p>
              </div>
            )}

            {itemsInCart > 0 && (
              <div className="text-sm text-muted-foreground">
                {itemsInCart === 1 
                  ? '✓ +1 point sera ajouté après validation'
                  : `✓ +${itemsInCart} points seront ajoutés après validation`
                }
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CustomerLoyalty;