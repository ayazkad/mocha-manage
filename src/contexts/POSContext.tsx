import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Employee {
  id: string;
  employee_code: string;
  name: string;
  role: 'employee' | 'admin';
}

interface Session {
  id: string;
  employee_id: string;
  start_time: string;
}

interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  basePrice: number;
  selectedSize?: { id: string; name: string; priceModifier: number };
  selectedMilk?: { id: string; name: string; priceModifier: number };
  notes?: string;
  image_url?: string;
  discount?: number; // Discount percentage for this item
  selected?: boolean; // Whether this item is selected for bulk operations
}

interface POSContextType {
  currentEmployee: Employee | null;
  currentSession: Session | null;
  cart: CartItem[];
  darkMode: boolean;
  staffDiscountActive: boolean;
  activeBenefitType: 'discount' | 'free_drink' | 'free_snack' | null;
  login: (code: string, pin: string) => Promise<boolean>;
  logout: () => Promise<void>;
  addToCart: (item: CartItem) => void;
  removeFromCart: (index: number) => void;
  updateCartItem: (index: number, item: CartItem) => void;
  clearCart: () => void;
  toggleDarkMode: () => void;
  getTotalPrice: () => number;
  setStaffDiscountActive: (active: boolean) => void;
  setActiveBenefitType: (type: 'discount' | 'free_drink' | 'free_snack' | null) => void;
}

const POSContext = createContext<POSContextType | undefined>(undefined);

export const POSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [darkMode, setDarkMode] = useState(false);
  const [staffDiscountActive, setStaffDiscountActive] = useState(false);
  const [activeBenefitType, setActiveBenefitType] = useState<'discount' | 'free_drink' | 'free_snack' | null>(null);

  useEffect(() => {
    // Apply dark mode class to document
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    // Check for existing session in localStorage
    const savedEmployee = localStorage.getItem('pos_employee');
    const savedSession = localStorage.getItem('pos_session');
    
    if (savedEmployee && savedSession) {
      setCurrentEmployee(JSON.parse(savedEmployee));
      setCurrentSession(JSON.parse(savedSession));
    }
  }, []);

  const login = async (code: string, pin: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('employee_code', code)
        .eq('pin_code', pin)
        .eq('active', true)
        .single();

      if (error || !data) {
        return false;
      }

      // Create new session
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          employee_id: data.id,
          start_time: new Date().toISOString(),
        })
        .select()
        .single();

      if (sessionError || !sessionData) {
        return false;
      }

      const employee: Employee = {
        id: data.id,
        employee_code: data.employee_code,
        name: data.name,
        role: data.role,
      };

      setCurrentEmployee(employee);
      setCurrentSession(sessionData);
      
      localStorage.setItem('pos_employee', JSON.stringify(employee));
      localStorage.setItem('pos_session', JSON.stringify(sessionData));

      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = async () => {
    if (currentSession) {
      // Close the session
      await supabase
        .from('sessions')
        .update({ end_time: new Date().toISOString() })
        .eq('id', currentSession.id);
    }

    setCurrentEmployee(null);
    setCurrentSession(null);
    setCart([]);
    
    localStorage.removeItem('pos_employee');
    localStorage.removeItem('pos_session');
  };

  const addToCart = (item: CartItem) => {
    // Si la réduction personnel est active, appliquer 30% automatiquement
    const itemWithDiscount = staffDiscountActive 
      ? { ...item, discount: 30 }
      : item;
    setCart([...cart, itemWithDiscount]);
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const updateCartItem = (index: number, item: CartItem) => {
    const newCart = [...cart];
    newCart[index] = item;
    setCart(newCart);
  };

  const clearCart = () => {
    setCart([]);
    setStaffDiscountActive(false);
    setActiveBenefitType(null);
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => {
      const sizeModifier = item.selectedSize?.priceModifier || 0;
      const milkModifier = item.selectedMilk?.priceModifier || 0;
      const itemPrice = (item.basePrice + sizeModifier + milkModifier) * item.quantity;
      const discount = item.discount || 0;
      const discountedPrice = itemPrice * (1 - discount / 100);
      return total + discountedPrice;
    }, 0);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <POSContext.Provider
      value={{
        currentEmployee,
        currentSession,
        cart,
        darkMode,
        staffDiscountActive,
        activeBenefitType,
        login,
        logout,
        addToCart,
        removeFromCart,
        updateCartItem,
        clearCart,
        toggleDarkMode,
        getTotalPrice,
        setStaffDiscountActive,
        setActiveBenefitType,
      }}
    >
      {children}
    </POSContext.Provider>
  );
};

export const usePOS = () => {
  const context = useContext(POSContext);
  if (context === undefined) {
    throw new Error('usePOS must be used within a POSProvider');
  }
  return context;
};
