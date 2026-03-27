import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

const SalesStatistics = () => {
  // Global sales statistics
  const { data: globalStats, isLoading: loadingGlobal } = useQuery({
    queryKey: ['global-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('total, created_at, status')
        .eq('status', 'completed');
      
      if (error) throw error;
      
      const totalSales = data.reduce((sum, order) => sum + Number(order.total), 0);
      const totalOrders = data.length;
      const averageOrder = totalOrders > 0 ? totalSales / totalOrders : 0;
      
      return { totalSales, totalOrders, averageOrder };
    },
  });

  // Sales by employee
  const { data: employeeStats, isLoading: loadingEmployees } = useQuery({
    queryKey: ['employee-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          total,
          employee_id,
          employees (name)
        `)
        .eq('status', 'completed');
      
      if (error) throw error;
      
      const statsMap = new Map();
      data.forEach((order: any) => {
        const employeeId = order.employee_id;
        const employeeName = order.employees?.name || 'Unknown';
        
        if (!statsMap.has(employeeId)) {
          statsMap.set(employeeId, {
            name: employeeName,
            totalSales: 0,
            orderCount: 0,
          });
        }
        
        const stats = statsMap.get(employeeId);
        stats.totalSales += Number(order.total);
        stats.orderCount += 1;
      });
      
      return Array.from(statsMap.values()).sort((a, b) => b.totalSales - a.totalSales);
    },
  });

  // Top 3 most sold products overall
  const { data: topSoldProducts, isLoading: loadingTopSold } = useQuery({
    queryKey: ['top-sold-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_items')
        .select('product_id, product_name, quantity');
      
      if (error) throw error;
      
      const productMap = new Map<string, { name: string; quantity: number }>();
      
      data.forEach((item: any) => {
        const key = item.product_id || item.product_name;
        if (!productMap.has(key)) {
          productMap.set(key, { name: item.product_name, quantity: 0 });
        }
        productMap.get(key)!.quantity += item.quantity;
      });
      
      const sorted = Array.from(productMap.values()).sort((a, b) => b.quantity - a.quantity);
      return {
        top3: sorted.slice(0, 3),
        least3: sorted.slice(-3).reverse(),
      };
    },
  });

  // Top 3 products by category
  const { data: topProducts, isLoading: loadingProducts } = useQuery({
    queryKey: ['top-products-by-category'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          product_id,
          product_name,
          quantity,
          products (
            category_id,
            categories (name_fr)
          )
        `);
      
      if (error) throw error;
      
      const categoryMap = new Map();
      
      data.forEach((item: any) => {
        const categoryName = item.products?.categories?.name_fr || 'Sans catégorie';
        const categoryId = item.products?.category_id || 'uncategorized';
        
        if (!categoryMap.has(categoryId)) {
          categoryMap.set(categoryId, {
            categoryName,
            products: new Map(),
          });
        }
        
        const category = categoryMap.get(categoryId);
        const productId = item.product_id || item.product_name;
        
        if (!category.products.has(productId)) {
          category.products.set(productId, {
            name: item.product_name,
            quantity: 0,
          });
        }
        
        category.products.get(productId).quantity += item.quantity;
      });
      
      const result: any[] = [];
      categoryMap.forEach((category) => {
        const topThree = Array.from(category.products.values())
          .sort((a: any, b: any) => b.quantity - a.quantity)
          .slice(0, 3);
        
        result.push({
          categoryName: category.categoryName,
          topProducts: topThree,
        });
      });
      
      return result;
    },
  });

  if (loadingGlobal || loadingEmployees || loadingProducts || loadingTopSold) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Global Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total des ventes</CardTitle>
            <CardDescription>Commandes complétées</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{globalStats?.totalSales.toFixed(2)} ₾</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Nombre de commandes</CardTitle>
            <CardDescription>Total complété</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{globalStats?.totalOrders}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Panier moyen</CardTitle>
            <CardDescription>Par commande</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{globalStats?.averageOrder.toFixed(2)} ₾</p>
          </CardContent>
        </Card>
      </div>

      {/* Sales by Employee */}
      <Card>
        <CardHeader>
          <CardTitle>Ventes par vendeur</CardTitle>
          <CardDescription>Performance des employés</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendeur</TableHead>
                <TableHead className="text-right">Nombre de commandes</TableHead>
                <TableHead className="text-right">Total des ventes</TableHead>
                <TableHead className="text-right">Panier moyen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employeeStats?.map((employee, index) => (
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

      {/* Top 3 Most Sold and Least Sold Products */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">🔥 Top 3 produits les plus vendus</CardTitle>
            <CardDescription>Tous les temps</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Position</TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead className="text-right">Quantité</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topSoldProducts?.top3.map((product, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">#{index + 1}</TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell className="text-right font-semibold text-green-600">{product.quantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-orange-600">📉 Top 3 produits les moins vendus</CardTitle>
            <CardDescription>Tous les temps</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Position</TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead className="text-right">Quantité</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topSoldProducts?.least3.map((product, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">#{index + 1}</TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell className="text-right font-semibold text-orange-600">{product.quantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top 3 produits par catégorie</CardTitle>
          <CardDescription>Les produits les plus vendus</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {topProducts?.map((category, index) => (
            <div key={index}>
              <h3 className="font-semibold text-lg mb-3">{category.categoryName}</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Position</TableHead>
                    <TableHead>Produit</TableHead>
                    <TableHead className="text-right">Quantité vendue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {category.topProducts.map((product: { name: string; quantity: number }, pIndex: number) => (
                    <TableRow key={pIndex}>
                      <TableCell className="font-medium">#{pIndex + 1}</TableCell>
                      <TableCell>{product.name}</TableCell>
                      <TableCell className="text-right">{product.quantity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesStatistics;
