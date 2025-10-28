import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';

const AddCustomerDialog = () => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const queryClient = useQueryClient();

  const addCustomerMutation = useMutation({
    mutationFn: async (customerData: { name: string; email: string; phone: string }) => {
      const { data, error } = await supabase
        .from('customers')
        .insert([customerData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (customer) => {
      toast.success(`Client ${customer.name} ajouté avec succès!`);
      
      // Send QR code email
      try {
        const { data, error: functionError } = await supabase.functions.invoke('send-loyalty-qr', {
          body: {
            customerId: customer.id,
            customerEmail: customer.email,
            customerName: customer.name,
            qrCode: customer.qr_code,
            language: navigator.language.startsWith('ru') ? 'ru' : 
                     navigator.language.startsWith('ka') ? 'ge' : 'en',
          },
        });

        if (functionError) {
          console.error('Error sending QR code:', functionError);
          const errorMessage = functionError.message || 'Unknown error';
          
          // Check if it's a Resend domain verification error
          if (errorMessage.includes('verify a domain') || errorMessage.includes('validation_error')) {
            toast.error('Email non envoyé : domaine non vérifié sur Resend. Veuillez vérifier votre domaine sur resend.com/domains');
          } else {
            toast.error('Client ajouté mais erreur lors de l\'envoi de l\'email');
          }
        } else {
          toast.success('Email avec QR code envoyé!');
        }
      } catch (error) {
        console.error('Error invoking function:', error);
        toast.error('Erreur lors de l\'envoi de l\'email');
      }

      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      console.error('Error adding customer:', error);
      if (error.code === '23505') {
        toast.error('Un client avec cet email existe déjà');
      } else {
        toast.error('Erreur lors de l\'ajout du client');
      }
    },
  });

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !email.trim() || !phone.trim()) {
      toast.error('Tous les champs sont requis');
      return;
    }

    addCustomerMutation.mutate({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <UserPlus className="w-4 h-4" />
          <span className="hidden md:inline">Nouveau client</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un nouveau client</DialogTitle>
          <DialogDescription>
            Créez un compte fidélité pour un nouveau client
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom complet</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jean Dupont"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jean.dupont@example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+33 6 12 34 56 78"
              required
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                resetForm();
              }}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={addCustomerMutation.isPending}
            >
              {addCustomerMutation.isPending ? 'Ajout...' : 'Ajouter'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddCustomerDialog;
