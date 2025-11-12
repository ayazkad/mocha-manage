import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Loader2, Mail, QrCode, Trash2 } from 'lucide-react';
import QRCode from 'qrcode';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  qr_code: string;
  points: number;
  total_purchases: number;
}

const CustomersManager = () => {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Customer[];
    },
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (newCustomer: { name: string; email: string; phone: string }) => {
      const { data, error } = await supabase
        .from('customers')
        .insert([newCustomer])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: async (customer) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setName('');
      setEmail('');
      setPhone('');
      toast.success('Customer created successfully');
      
      // Send welcome email with QR code
      await sendQRCodeEmail(customer);
    },
    onError: (error: any) => {
      toast.error('Error creating customer: ' + error.message);
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer deleted');
    },
    onError: (error: any) => {
      toast.error('Error deleting: ' + error.message);
    },
  });

  const sendQRCodeEmail = async (customer: Customer) => {
    try {
      // Generate QR code as data URL
      const qrCodeDataUrl = await QRCode.toDataURL(customer.qr_code, {
        width: 300,
        margin: 2,
      });

      const { error } = await supabase.functions.invoke('send-loyalty-qr', {
        body: {
          customerName: customer.name,
          customerEmail: customer.email,
          qrCode: customer.qr_code,
          qrCodeImage: qrCodeDataUrl,
        },
      });

      if (error) throw error;
      toast.success('QR code sent by email');
    } catch (error: any) {
      toast.error('Error sending email: ' + error.message);
    }
  };

  const resendQRCodeMutation = useMutation({
    mutationFn: async (customer: Customer) => {
      await sendQRCodeEmail(customer);
    },
    onSuccess: () => {
      toast.success('QR code resent by email');
    },
  });

  const downloadQRCode = async (customer: Customer) => {
    try {
      setIsGeneratingQR(true);
      const qrCodeDataUrl = await QRCode.toDataURL(customer.qr_code, {
        width: 500,
        margin: 2,
      });

      const link = document.createElement('a');
      link.href = qrCodeDataUrl;
      link.download = `qr-${customer.name}.png`;
      link.click();
      toast.success('QR code downloaded');
    } catch (error) {
      toast.error('Error downloading');
    } finally {
      setIsGeneratingQR(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone) {
      toast.error('All fields are required');
      return;
    }
    createCustomerMutation.mutate({ name, email, phone });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Customer</CardTitle>
          <CardDescription>
            Create a customer account with loyalty QR code (10 drinks = 1 free)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Customer name"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+995 555 12 34 56"
                />
              </div>
            </div>
            <Button 
              type="submit" 
              disabled={createCustomerMutation.isPending}
            >
              {createCustomerMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Customer
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Customer List</CardTitle>
          <CardDescription>
            Manage customers and their loyalty points
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Purchases</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers?.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>{customer.email}</TableCell>
                    <TableCell>{customer.phone}</TableCell>
                    <TableCell>
                      <span className="font-bold text-primary">
                        {customer.points}/10
                      </span>
                    </TableCell>
                    <TableCell>{customer.total_purchases}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => downloadQRCode(customer)}
                          disabled={isGeneratingQR}
                          title="Download QR code"
                        >
                          <QrCode className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => resendQRCodeMutation.mutate(customer)}
                          disabled={resendQRCodeMutation.isPending}
                          title="Resend QR code by email"
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => deleteCustomerMutation.mutate(customer.id)}
                          disabled={deleteCustomerMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomersManager;