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
  const [qrCodeInput, setQrCodeInput] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const queryClient = useQueryClient();
  const { cart } = usePOS();

  const searchCustomerMutation = useMutation({
    mutationFn: async (qrCode: string) => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('qr_code', qrCode)
        .single();
      
      if (error) throw error;
      return data as Customer;
    },
    onSuccess: (customer) => {
      setSelectedCustomer(customer);
      onCustomerSelected?.(customer);
      toast.success(`Client trouvé: ${customer.name}`);
    },
    onError: () => {
      toast.error('Client introuvable. Vérifiez le QR code.');
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrCodeInput.trim()) return;
    searchCustomerMutation.mutate(qrCodeInput.trim());
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
    setQrCodeInput('');
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
        {!selectedCustomer ? (
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder="Entrez ou scannez le QR code..."
              value={qrCodeInput}
              onChange={(e) => setQrCodeInput(e.target.value)}
              className="flex-1"
            />
            <Button 
              type="submit" 
              disabled={searchCustomerMutation.isPending}
            >
              <Search className="h-4 w-4" />
            </Button>
          </form>
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