import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LossData {
  product_name: string;
  quantity: number;
  total_loss: number;
  employee_name: string;
}

const LossesStatistics = () => {
  const [date, setDate] = useState<Date>(new Date());
  const [losses, setLosses] = useState<LossData[]>([]);
  const [totalLoss, setTotalLoss] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadLosses();
  }, [date]);

  const loadLosses = async () => {
    setLoading(true);
    try {
      const selectedDate = format(date, 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('daily_losses')
        .select(`
          product_name,
          quantity,
          total_loss,
          employee_id,
          employees(name)
        `)
        .eq('loss_date', selectedDate)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData: LossData[] = (data || []).map((item: any) => ({
        product_name: item.product_name,
        quantity: item.quantity,
        total_loss: item.total_loss,
        employee_name: item.employees?.name || 'Unknown',
      }));

      setLosses(formattedData);
      
      const total = formattedData.reduce((sum, item) => sum + item.total_loss, 0);
      setTotalLoss(total);
    } catch (error) {
      console.error('Error loading losses:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5" />
            Statistiques des Pertes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">Sélectionner une date:</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'justify-start text-left font-normal',
                    !date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(newDate) => newDate && setDate(newDate)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-destructive/10 border-destructive/20">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Perte Totale</p>
                  <p className="text-3xl font-bold text-destructive">
                    {totalLoss.toFixed(2)} ₾
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Nombre d'articles</p>
                  <p className="text-3xl font-bold">
                    {losses.reduce((sum, item) => sum + item.quantity, 0)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Produits différents</p>
                  <p className="text-3xl font-bold">{losses.length}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-base">Détail des pertes</h3>
            
            {loading ? (
              <p className="text-sm text-muted-foreground">Chargement...</p>
            ) : losses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune perte enregistrée pour cette date
              </p>
            ) : (
              <div className="space-y-2">
                {losses.map((loss, index) => (
                  <Card key={index} className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{loss.product_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Enregistré par: {loss.employee_name}
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
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LossesStatistics;