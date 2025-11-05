import { usePOS } from '@/contexts/POSContext';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '@/components/pos/Header';
import ProductsManager from '@/components/admin/ProductsManager';
import CategoriesManager from '@/components/admin/CategoriesManager';
import EmployeesManager from '@/components/admin/EmployeesManager';
import CustomersManager from '@/components/admin/CustomersManager';
import UnifiedStatistics from '@/components/admin/UnifiedStatistics';
import OrdersManager from '@/components/admin/OrdersManager';
import OffersManager from '@/components/admin/OffersManager';

const Admin = () => {
  const { currentEmployee } = usePOS();

  if (!currentEmployee) {
    return <Navigate to="/" replace />;
  }

  if (currentEmployee.role !== 'admin') {
    return <Navigate to="/pos" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto p-6">
        <h2 className="text-3xl font-bold mb-6">Admin Panel</h2>
        
        <Tabs defaultValue="statistics" className="w-full">
          <TabsList className="grid w-full grid-cols-7 max-w-6xl">
            <TabsTrigger value="statistics">Statistiques</TabsTrigger>
            <TabsTrigger value="orders">Tickets</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="offers">Offres</TabsTrigger>
            <TabsTrigger value="employees">Employees</TabsTrigger>
            <TabsTrigger value="customers">Clients</TabsTrigger>
          </TabsList>
          
          <TabsContent value="statistics" className="mt-6">
            <UnifiedStatistics />
          </TabsContent>

          <TabsContent value="orders" className="mt-6">
            <OrdersManager />
          </TabsContent>
          
          <TabsContent value="products" className="mt-6">
            <ProductsManager />
          </TabsContent>
          
          <TabsContent value="categories" className="mt-6">
            <CategoriesManager />
          </TabsContent>

          <TabsContent value="offers" className="mt-6">
            <OffersManager />
          </TabsContent>
          
          <TabsContent value="employees" className="mt-6">
            <EmployeesManager />
          </TabsContent>
          
          <TabsContent value="customers" className="mt-6">
            <CustomersManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
