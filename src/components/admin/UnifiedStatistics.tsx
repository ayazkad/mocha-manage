import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

const UnifiedStatistics = () => {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [lastClickedDate, setLastClickedDate] = useState<Date | undefined>();

  // Handle date selection with double-click for single day
  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    if (lastClickedDate && format(lastClickedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')) {
      // Double click - select single day
      setDateRange({ from: date, to: date });
      setLastClickedDate(undefined);
    } else {
      // First click or different date
      if (!dateRange.from || (dateRange.from && dateRange.to)) {
        setDateRange({ from: date, to: undefined });
      } else {
        const newRange = date >= dateRange.from 
          ? { from: dateRange.from, to: date }
          : { from: date, to: dateRange.from };
        setDateRange(newRange);
      }
      setLastClickedDate(date);
    }
  };

  // Sales data query
  const { data: salesData, isLoading: loadingSales } = useQuery({
    queryKey: ['sales-period', dateRange.from, dateRange.to],
    queryFn: async () => {
      if (!dateRange.from || !dateRange.to) return null;

      const { data, error } = await supabase
        .from('orders')
        .select('total, created_at, employee_id, employees(name)')
        .eq('status', 'completed')
        .gte('created_at', format(dateRange.from, 'yyyy-MM-dd'))
        .lte('created_at', format(dateRange.to, 'yyyy-MM-dd') + 'T23:59:59');
      
      if (error) throw error;

      const totalSales = data.reduce((sum, order) => sum + Number(order.total), 0);
      const totalOrders = data.length;

      // Group by employee
      const employeeMap = new Map();
      data.forEach((order: any) => {
        const employeeId = order.employee_id;
        const employeeName = order.employees?.name || 'Unknown';
        
        if (!employeeMap.has(employeeId)) {
          employeeMap.set(employeeId, {
            name: employeeName,
            totalSales: 0,
            orderCount: 0,
          });
        }
        
        const stats = employeeMap.get(employeeId);
        stats.totalSales += Number(order.total);
        stats.orderCount += 1;
      });

      // Daily trend data
      const dailyMap = new Map<string, number>();
      data.forEach((order: any) => {
        const day = format(new Date(order.created_at), 'yyyy-MM-dd');
        if (!dailyMap.has(day)) {
          dailyMap.set(day, 0);
        }
        const currentValue = dailyMap.get(day) || 0;
        dailyMap.set(day, currentValue + Number(order.total));
      });

      const dailyData = Array.from(dailyMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, total]) => ({
          date: format(new Date(date), 'dd MMM', { locale: fr }),
          ventes: Number(total.toFixed(2)),
        }));

      return {
        totalSales,
        totalOrders,
        averageOrder: totalOrders > 0 ? totalSales / totalOrders : 0,
        employeeStats: Array.from(employeeMap.values()).sort((a, b) => b.totalSales - a.totalSales),
        dailyData,
      };
    },
    enabled: !!dateRange.from && !!dateRange.to,
  });

  // Losses data query
  const { data: lossesData, isLoading: loadingLosses } = useQuery({
    queryKey: ['losses-period', dateRange.from, dateRange.to],
    queryFn: async () => {
      if (!dateRange.from || !dateRange.to) return null;

      const { data, error } = await supabase
        .from('daily_losses')
        .select('product_name, quantity, total_loss, loss_date, employee_id, employees(name)')
        .gte('loss_date', format(dateRange.from, 'yyyy-MM-dd'))
        .lte('loss_date', format(dateRange.to, 'yyyy-MM-dd'))
        .order('created_at', { ascending: false });

      if (error) throw error;

      const totalLoss = data.reduce((sum, item) => sum + Number(item.total_loss), 0);
      const totalQuantity = data.reduce((sum, item) => sum + item.quantity, 0);

      // Daily trend data
      const dailyMap = new Map<string, number>();
      data.forEach((loss: any) => {
        const day = loss.loss_date;
        if (!dailyMap.has(day)) {
          dailyMap.set(day, 0);
        }
        const currentValue = dailyMap.get(day) || 0;
        dailyMap.set(day, currentValue + Number(loss.total_loss));
      });

      const dailyData = Array.from(dailyMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, total]) => ({
          date: format(new Date(date), 'dd MMM', { locale: fr }),
          pertes: Number(total.toFixed(2)),
        }));

      return {
        totalLoss,
        totalQuantity,
        losses: data.map((item: any) => ({
          product_name: item.product_name,
          quantity: item.quantity,
          total_loss: item.total_loss,
          employee_name: item.employees?.name || 'Unknown',
          loss_date: item.loss_date,
        })),
        dailyData,
      };
    },
    enabled: !!dateRange.from && !!dateRange.to,
  });

  if (loadingSales || loadingLosses) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Range Picker */}
      <Card>
        <CardHeader>
          <CardTitle>Sélectionner une période</CardTitle>
          <CardDescription>Cliquez deux fois sur la même date pour sélectionner un jour unique</CardDescription>
        </CardHeader>
        <CardContent>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'justify-start text-left font-normal w-full md:w-auto',
                  !dateRange.from && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to ? (
                    format(dateRange.from, 'yyyy-MM-dd') === format(dateRange.to, 'yyyy-MM-dd') ? (
                      format(dateRange.from, 'PPP', { locale: fr })
                    ) : (
                      `${format(dateRange.from, 'PPP', { locale: fr })} - ${format(dateRange.to, 'PPP', { locale: fr })}`
                    )
                  ) : (
                    format(dateRange.from, 'PPP', { locale: fr })
                  )
                ) : (
                  <span>Choisir une période</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateRange.from}
                onSelect={handleDateSelect}
                initialFocus
                className="pointer-events-auto"
                locale={fr}
              />
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      {/* Sales Section */}
      <div className="space-y-4">
        <h3 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-primary" />
          Statistiques de Ventes
        </h3>

        {/* Global Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Total des ventes</p>
                <p className="text-3xl font-bold text-primary">
                  {salesData?.totalSales.toFixed(2) || 0} ₾
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Nombre de commandes</p>
                <p className="text-3xl font-bold">{salesData?.totalOrders || 0}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Panier moyen</p>
                <p className="text-3xl font-bold">{salesData?.averageOrder.toFixed(2) || 0} ₾</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sales Trend Chart */}
        {salesData?.dailyData && salesData.dailyData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Évolution des ventes</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={salesData.dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="ventes" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    name="Ventes (₾)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Sales by Employee */}
        {salesData?.employeeStats && salesData.employeeStats.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Ventes par vendeur</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendeur</TableHead>
                    <TableHead className="text-right">Commandes</TableHead>
                    <TableHead className="text-right">Total ventes</TableHead>
                    <TableHead className="text-right">Panier moyen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesData.employeeStats.map((employee, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell className="text-right">{employee.orderCount}</TableCell>
                      <TableCell className="text-right">{employee.totalSales.toFixed(2)} ₾</TableCell>
                      <TableCell className="text-right">
                        {(employee.totalSales / employee.orderCount).toFixed(2)} ₾
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Losses Section */}
      <div className="space-y-4">
        <h3 className="text-2xl font-bold flex items-center gap-2">
          <TrendingDown className="w-6 h-6 text-destructive" />
          Statistiques de Pertes
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-destructive/10 border-destructive/20">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Perte Totale</p>
                <p className="text-3xl font-bold text-destructive">
                  {lossesData?.totalLoss.toFixed(2) || 0} ₾
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Nombre d'articles</p>
                <p className="text-3xl font-bold">{lossesData?.totalQuantity || 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Produits différents</p>
                <p className="text-3xl font-bold">{lossesData?.losses.length || 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Losses Trend Chart */}
        {lossesData?.dailyData && lossesData.dailyData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Évolution des pertes</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={lossesData.dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="pertes" 
                    stroke="hsl(var(--destructive))" 
                    strokeWidth={2}
                    name="Pertes (₾)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Losses Details */}
        {lossesData?.losses && lossesData.losses.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Détail des pertes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {lossesData.losses.map((loss, index) => (
                  <Card key={index} className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{loss.product_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(loss.loss_date), 'PPP', { locale: fr })} • {loss.employee_name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-destructive">
                          {loss.total_loss.toFixed(2)} ₾
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Qté: {loss.quantity}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default UnifiedStatistics;
