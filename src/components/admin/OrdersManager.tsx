import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Edit, Eye, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import PrintReceiptDialog from '@/components/pos/PrintReceiptDialog';

const OrdersManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    status: '',
    subtotal: '',
    tax_amount: '',
    discount_amount: '',
    tip_amount: '',
    total: '',
    notes: '',
  });

  // Fetch orders with employee and items
  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          employees (name),
          order_items (
            id,
            product_name,
            quantity,
            unit_price,
            total_price,
            selected_options
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Delete order mutation
  const deleteMutation = useMutation({
    mutationFn: async (orderId: string) => {
      // Delete order items first
      const { error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderId);
      
      if (itemsError) throw itemsError;

      // Then delete order
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({
        title: 'Succès',
        description: 'Commande supprimée',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer la commande',
        variant: 'destructive',
      });
      console.error(error);
    },
  });

  // Update order mutation
  const updateMutation = useMutation({
    mutationFn: async ({ orderId, updates }: { orderId: string; updates: any }) => {
      const { error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', orderId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setIsEditDialogOpen(false);
      toast({
        title: 'Succès',
        description: 'Commande mise à jour',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour la commande',
        variant: 'destructive',
      });
      console.error(error);
    },
  });

  const handleEdit = (order: any) => {
    setSelectedOrder(order);
    setEditForm({
      status: order.status,
      subtotal: order.subtotal.toString(),
      tax_amount: order.tax_amount?.toString() || '0',
      discount_amount: order.discount_amount?.toString() || '0',
      tip_amount: order.tip_amount?.toString() || '0',
      total: order.total.toString(),
      notes: order.notes || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleView = (order: any) => {
    setSelectedOrder(order);
    setIsViewDialogOpen(true);
  };

  const handleReprint = (order: any) => {
    const orderDate = new Date(order.created_at);
    const cashReceived = order.cash_received ? Number(order.cash_received) : null;
    const orderTotal = Number(order.total);
    
    const receipt = {
      orderId: order.id,
      orderNumber: order.order_number,
      employeeName: order.employees?.name || 'Unknown',
      date: format(orderDate, 'dd/MM/yyyy'),
      time: format(orderDate, 'HH:mm'),
      items: order.order_items?.map((item: any) => ({
        productName: item.product_name,
        quantity: item.quantity,
        unitPrice: Number(item.unit_price),
        totalPrice: Number(item.total_price),
        selectedSize: item.selected_options?.size ? { name: item.selected_options.size } : undefined,
        selectedMilk: item.selected_options?.milk ? { name: item.selected_options.milk } : undefined,
      })) || [],
      subtotal: Number(order.subtotal),
      discount: Number(order.discount_amount || 0),
      total: orderTotal,
      paymentMethod: order.payment_method || 'card',
      amountPaid: order.payment_method === 'cash' && cashReceived !== null ? cashReceived : orderTotal,
      change: order.payment_method === 'cash' && cashReceived !== null ? Math.max(0, cashReceived - orderTotal) : 0,
    };
    setReceiptData(receipt);
    setIsPrintDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedOrder) return;

    updateMutation.mutate({
      orderId: selectedOrder.id,
      updates: {
        status: editForm.status,
        subtotal: parseFloat(editForm.subtotal),
        tax_amount: parseFloat(editForm.tax_amount),
        discount_amount: parseFloat(editForm.discount_amount),
        tip_amount: parseFloat(editForm.tip_amount),
        total: parseFloat(editForm.total),
        notes: editForm.notes,
      },
    });
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500',
      completed: 'bg-green-500',
      cancelled: 'bg-red-500',
    };
    return (
      <span className={`px-2 py-1 rounded text-white text-xs ${colors[status] || 'bg-gray-500'}`}>
        {status}
      </span>
    );
  };

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestion des tickets</CardTitle>
        <CardDescription>Consulter, modifier ou supprimer les commandes</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N° Ticket</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Vendeur</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders?.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.order_number}</TableCell>
                <TableCell>{format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                <TableCell>{order.employees?.name}</TableCell>
                <TableCell>{getStatusBadge(order.status)}</TableCell>
                <TableCell className="text-right">{Number(order.total).toFixed(2)} ₾</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleReprint(order)}
                      title="Réimprimer le ticket"
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleView(order)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEdit(order)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                          <AlertDialogDescription>
                            Êtes-vous sûr de vouloir supprimer cette commande ? Cette action est irréversible.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate(order.id)}>
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* View Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Détails du ticket {selectedOrder?.order_number}</DialogTitle>
              <DialogDescription>
                Date: {selectedOrder && format(new Date(selectedOrder.created_at), 'dd/MM/yyyy HH:mm')}
              </DialogDescription>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Vendeur</p>
                    <p className="font-medium">{selectedOrder.employees?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Statut</p>
                    {getStatusBadge(selectedOrder.status)}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Mode de paiement</p>
                    <p className="font-medium capitalize">{selectedOrder.payment_method || 'N/A'}</p>
                  </div>
                  {selectedOrder.payment_method === 'cash' && selectedOrder.cash_received && (
                    <div>
                      <p className="text-sm text-muted-foreground">Montant reçu</p>
                      <p className="font-medium">{Number(selectedOrder.cash_received).toFixed(2)} ₾</p>
                    </div>
                  )}
                </div>

                <div>
                  <p className="font-semibold mb-2">Articles</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produit</TableHead>
                        <TableHead>Qté</TableHead>
                        <TableHead className="text-right">Prix unitaire</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrder.order_items?.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.product_name}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell className="text-right">{Number(item.unit_price).toFixed(2)} ₾</TableCell>
                          <TableCell className="text-right">{Number(item.total_price).toFixed(2)} ₾</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <div className="flex justify-between">
                    <span>Sous-total</span>
                    <span>{Number(selectedOrder.subtotal).toFixed(2)} ₾</span>
                  </div>
                  {selectedOrder.tax_amount > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>TVA</span>
                      <span>{Number(selectedOrder.tax_amount).toFixed(2)} ₾</span>
                    </div>
                  )}
                  {selectedOrder.discount_amount > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Remise</span>
                      <span>-{Number(selectedOrder.discount_amount).toFixed(2)} ₾</span>
                    </div>
                  )}
                  {selectedOrder.tip_amount > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Pourboire</span>
                      <span>{Number(selectedOrder.tip_amount).toFixed(2)} ₾</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>Total</span>
                    <span>{Number(selectedOrder.total).toFixed(2)} ₾</span>
                  </div>
                  {selectedOrder.payment_method === 'cash' && selectedOrder.cash_received && (
                    <>
                      <div className="flex justify-between text-green-600 font-medium">
                        <span>Reçu en liquide</span>
                        <span>{Number(selectedOrder.cash_received).toFixed(2)} ₾</span>
                      </div>
                      <div className="flex justify-between text-blue-600 font-medium">
                        <span>Rendu</span>
                        <span>{(Number(selectedOrder.cash_received) - Number(selectedOrder.total)).toFixed(2)} ₾</span>
                      </div>
                    </>
                  )}
                </div>

                {selectedOrder.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p>{selectedOrder.notes}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-h-[90vh] flex flex-col">
            <DialogHeader className="shrink-0">
              <DialogTitle>Modifier le ticket {selectedOrder?.order_number}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 overflow-y-auto flex-1 pr-2">
              <div>
                <Label>Statut</Label>
                <Select value={editForm.status} onValueChange={(value) => setEditForm({ ...editForm, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="completed">Complété</SelectItem>
                    <SelectItem value="cancelled">Annulé</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Sous-total</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editForm.subtotal}
                  onChange={(e) => setEditForm({ ...editForm, subtotal: e.target.value })}
                />
              </div>

              <div>
                <Label>TVA</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editForm.tax_amount}
                  onChange={(e) => setEditForm({ ...editForm, tax_amount: e.target.value })}
                />
              </div>

              <div>
                <Label>Remise</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editForm.discount_amount}
                  onChange={(e) => setEditForm({ ...editForm, discount_amount: e.target.value })}
                />
              </div>

              <div>
                <Label>Pourboire</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editForm.tip_amount}
                  onChange={(e) => setEditForm({ ...editForm, tip_amount: e.target.value })}
                />
              </div>

              <div>
                <Label>Total</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editForm.total}
                  onChange={(e) => setEditForm({ ...editForm, total: e.target.value })}
                />
              </div>

              <div>
                <Label>Notes</Label>
                <Input
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                />
              </div>

              <Button onClick={handleUpdate} className="w-full">
                Enregistrer les modifications
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Print Receipt Dialog */}
        <PrintReceiptDialog
          open={isPrintDialogOpen}
          onClose={() => setIsPrintDialogOpen(false)}
          receiptData={receiptData}
        />
      </CardContent>
    </Card>
  );
};

export default OrdersManager;
