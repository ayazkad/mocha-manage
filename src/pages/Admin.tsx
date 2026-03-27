import { useEffect, useState, useCallback } from 'react';
import { usePOS } from '@/contexts/POSContext';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '@/components/pos/Header';
import ProductsManager from '@/components/admin/ProductsManager';
import CategoriesManager from '@/components/admin/CategoriesManager';
import EmployeesManager from '@/components/admin/EmployeesManager';
import CustomersManager from '@/components/admin/CustomersManager';
import UnifiedStatistics from '@/components/admin/UnifiedStatistics';
import OrdersManager from '@/components/admin/OrdersManager';
import OffersManager from '@/components/admin/OffersManager';
import GlobalOptionsManager from '@/components/admin/GlobalOptionsManager';
import BluetoothPrinterSettings from '@/components/admin/BluetoothPrinterSettings';
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';
import useEmblaCarousel from 'embla-carousel-react';
import { EmblaCarouselType } from 'embla-carousel';

const TABS = [
  'statistics',
  'orders',
  'products',
  'options',
  'categories',
  'offers',
  'employees',
  'customers',
  'printer'
];

// Defined outside component to prevent unnecessary re-initialization
const watchDrag = (emblaApi: EmblaCarouselType, event: TouchEvent | MouseEvent) => {
  if (!event || !event.target) return true;

  const targetElement = event.target as Element;
  const protectedContainer = targetElement.closest('[data-protected-swipe="true"]');

  if (protectedContainer) {
    const clientX = 'touches' in event ? event.touches[0].clientX : (event as MouseEvent).clientX;
    const swipeEdgeZone = 35; // px
    const isEdge = clientX < swipeEdgeZone || clientX > window.innerWidth - swipeEdgeZone;
    return isEdge;
  }
  return true;
};

const Admin = () => {
  const { currentEmployee } = usePOS();
  const [activeTab, setActiveTab] = useState('statistics');

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    skipSnaps: false,
    duration: 20, // Faster snapping for 120Hz feel
    watchDrag: watchDrag
  });

  // Fix for iOS keyboard hiding issue - force viewport recalculation
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const handleKeyboardHide = () => {
        window.scrollTo(0, 0);
        setTimeout(() => {
          window.dispatchEvent(new Event('resize'));
        }, 100);
      };

      Keyboard.addListener('keyboardWillHide', handleKeyboardHide);
      Keyboard.addListener('keyboardDidHide', handleKeyboardHide);

      return () => {
        Keyboard.removeAllListeners();
      };
    }
  }, []);

  // Sync Tabs -> Carousel and Scroll Tabs into view
  useEffect(() => {
    if (activeTab) {
      if (emblaApi) {
        const index = TABS.indexOf(activeTab);
        if (index !== -1) {
          emblaApi.scrollTo(index);
        }
      }

      const tabElement = document.getElementById(`tab-trigger-${activeTab}`);
      if (tabElement) {
        tabElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    }
  }, [activeTab, emblaApi]);

  // Sync Carousel -> Tabs
  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      const index = emblaApi.selectedScrollSnap();
      if (TABS[index]) {
        if (TABS[index] !== activeTab) {
          setActiveTab(TABS[index]);
        }
      }
    };

    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, activeTab]);

  if (!currentEmployee) {
    return <Navigate to="/" replace />;
  }

  if (currentEmployee.role !== 'admin') {
    return <Navigate to="/pos" replace />;
  }

  // Memoizing this function isn't strictly necessary as the managers are heavy
  // but let's ensure renderTabContent is clean.
  const renderTabContent = (tab: string) => {
    switch (tab) {
      case 'statistics': return <UnifiedStatistics />;
      case 'orders': return <OrdersManager />;
      case 'products': return <ProductsManager />;
      case 'options': return <GlobalOptionsManager />;
      case 'categories': return <CategoriesManager />;
      case 'offers': return <OffersManager />;
      case 'employees': return <EmployeesManager />;
      case 'customers': return <CustomersManager />;
      case 'printer': return <BluetoothPrinterSettings />;
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 h-[100dvh] w-full flex flex-col bg-background admin-page overflow-hidden">
      <div className="flex-none">
        <Header />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Fixed Tabs Header */}
        <div className="bg-background z-10 border-b relative">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div
              className="overflow-x-auto px-6 py-2 no-scrollbar"
            >
              <TabsList className="inline-flex w-auto min-w-full md:grid md:grid-cols-9 md:max-w-7xl">
                <TabsTrigger id="tab-trigger-statistics" value="statistics" className="whitespace-nowrap">Statistics</TabsTrigger>
                <TabsTrigger id="tab-trigger-orders" value="orders" className="whitespace-nowrap">Orders</TabsTrigger>
                <TabsTrigger id="tab-trigger-products" value="products" className="whitespace-nowrap">Products</TabsTrigger>
                <TabsTrigger id="tab-trigger-options" value="options" className="whitespace-nowrap">Options</TabsTrigger>
                <TabsTrigger id="tab-trigger-categories" value="categories" className="whitespace-nowrap">Categories</TabsTrigger>
                <TabsTrigger id="tab-trigger-offers" value="offers" className="whitespace-nowrap">Offers</TabsTrigger>
                <TabsTrigger id="tab-trigger-employees" value="employees" className="whitespace-nowrap">Employees</TabsTrigger>
                <TabsTrigger id="tab-trigger-customers" value="customers" className="whitespace-nowrap">Customers</TabsTrigger>
                <TabsTrigger id="tab-trigger-printer" value="printer" className="whitespace-nowrap">Impression</TabsTrigger>
              </TabsList>
            </div>
          </Tabs>
        </div>

        {/* Carousel Content */}
        <div className="flex-1 overflow-hidden" ref={emblaRef}>
          {/* Added transform-gpu and better touch handling for 120Hz smoothness */}
          <div className="flex touch-pan-y h-full will-change-transform backface-invisible">
            {TABS.map((tab) => {
              // Apply protection to ALL tabs for consistency and to prevent UI interference
              const isProtected = true;

              return (
                <div key={tab} className="flex-[0_0_100%] min-w-0 h-full overflow-y-auto admin-scroll-container transform-gpu">
                  <div
                    className="container mx-auto p-6 pb-24"
                    data-protected-swipe={isProtected ? "true" : "false"}
                  >
                    {renderTabContent(tab)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
