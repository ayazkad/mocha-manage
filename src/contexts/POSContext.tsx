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
}

interface POSContextType {
  currentEmployee: Employee | null;
  currentSession: Session | null;
  cart: CartItem[];
  language: 'fr' | 'ru' | 'ge' | 'en';
  darkMode: boolean;
  login: (code: string, pin: string) => Promise<boolean>;
  logout: () => Promise<void>;
  addToCart: (item: CartItem) => void;
  removeFromCart: (index: number) => void;
  updateCartItem: (index: number, item: CartItem) => void;
  clearCart: () => void;
  setLanguage: (lang: 'fr' | 'ru' | 'ge' | 'en') => void;
  toggleDarkMode: () => void;
  getTotalPrice: () => number;
}

const POSContext = createContext<POSContextType | undefined>(undefined);

export const POSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [language, setLanguage] = useState<'fr' | 'ru' | 'ge' | 'en'>('fr');
  const [darkMode, setDarkMode] = useState(false);

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
    setCart([...cart, item]);
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
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => {
      const sizeModifier = item.selectedSize?.priceModifier || 0;
      const milkModifier = item.selectedMilk?.priceModifier || 0;
      return total + (item.basePrice + sizeModifier + milkModifier) * item.quantity;
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
        language,
        darkMode,
        login,
        logout,
        addToCart,
        removeFromCart,
        updateCartItem,
        clearCart,
        setLanguage,
        toggleDarkMode,
        getTotalPrice,
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
