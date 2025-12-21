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
import GlobalOptionsManager from '@/components/admin/GlobalOptionsManager';
import PrinterSettings from '@/components/admin/PrinterSettings';
import BluetoothPrinterSettings from '@/components/admin/BluetoothPrinterSettings';

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
          <div className="overflow-x-auto -mx-6 px-6 pb-2">
            <TabsList className="inline-flex w-auto min-w-full md:grid md:grid-cols-9 md:max-w-7xl">
              <TabsTrigger value="statistics" className="whitespace-nowrap">Statistics</TabsTrigger>
              <TabsTrigger value="orders" className="whitespace-nowrap">Orders</TabsTrigger>
              <TabsTrigger value="products" className="whitespace-nowrap">Products</TabsTrigger>
              <TabsTrigger value="options" className="whitespace-nowrap">Options</TabsTrigger>
              <TabsTrigger value="categories" className="whitespace-nowrap">Categories</TabsTrigger>
              <TabsTrigger value="offers" className="whitespace-nowrap">Offers</TabsTrigger>
              <TabsTrigger value="employees" className="whitespace-nowrap">Employees</TabsTrigger>
              <TabsTrigger value="customers" className="whitespace-nowrap">Customers</TabsTrigger>
              <TabsTrigger value="printer" className="whitespace-nowrap">Impression</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="statistics" className="mt-6">
            <UnifiedStatistics />
          </TabsContent>

          <TabsContent value="orders" className="mt-6">
            <OrdersManager />
          </TabsContent>
          
          <TabsContent value="products" className="mt-6">
            <ProductsManager />
          </TabsContent>

          <TabsContent value="options" className="mt-6">
            <GlobalOptionsManager />
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

          <TabsContent value="printer" className="mt-6 space-y-6">
            <BluetoothPrinterSettings />
            <PrinterSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
