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

interface OriginalOrder {
  orderId: string;
  orderNumber: string;
  originalTotal: number;
  items: CartItem[];
}

interface POSContextType {
  currentEmployee: Employee | null;
  currentSession: Session | null;
  cart: CartItem[];
  darkMode: boolean;
  staffDiscountActive: boolean;
  freeDrinkActive: boolean;
  freeSnackActive: boolean;
  originalOrder: OriginalOrder | null;
  isModifyingOrder: boolean;
  login: (code: string, pin: string) => Promise<boolean>;
  logout: () => Promise<void>;
  addToCart: (item: CartItem) => void;
  removeFromCart: (index: number) => void;
  updateCartItem: (index: number, item: CartItem) => void;
  updateAllCartItems: (items: CartItem[]) => void;
  clearCart: () => void;
  toggleDarkMode: () => void;
  getTotalPrice: () => number;
  setStaffDiscountActive: (active: boolean) => void;
  setFreeDrinkActive: (active: boolean) => void;
  setFreeSnackActive: (active: boolean) => void;
  loadOrderForModification: (order: OriginalOrder, items: CartItem[]) => void;
  cancelOrderModification: () => void;
  getPriceDifference: () => number;
}

const POSContext = createContext<POSContextType | undefined>(undefined);

export const POSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [darkMode, setDarkMode] = useState(false);
  const [staffDiscountActive, setStaffDiscountActive] = useState(false);
  const [freeDrinkActive, setFreeDrinkActive] = useState(false);
  const [freeSnackActive, setFreeSnackActive] = useState(false);
  const [originalOrder, setOriginalOrder] = useState<OriginalOrder | null>(null);

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
    
    // Vérifier si un produit identique existe déjà dans le panier
    const existingItemIndex = cart.findIndex((cartItem) => {
      // Comparer le produit de base
      if (cartItem.productId !== itemWithDiscount.productId) return false;
      
      // Comparer les options de taille
      if (cartItem.selectedSize?.name !== itemWithDiscount.selectedSize?.name) return false;
      
      // Comparer les options de lait
      if (cartItem.selectedMilk?.name !== itemWithDiscount.selectedMilk?.name) return false;
      
      // Comparer les notes
      if (cartItem.notes !== itemWithDiscount.notes) return false;
      
      // Comparer la réduction
      if ((cartItem.discount || 0) !== (itemWithDiscount.discount || 0)) return false;
      
      return true;
    });
    
    if (existingItemIndex !== -1) {
      // Le produit existe déjà, augmenter la quantité
      const newCart = [...cart];
      newCart[existingItemIndex] = {
        ...newCart[existingItemIndex],
        quantity: newCart[existingItemIndex].quantity + itemWithDiscount.quantity
      };
      setCart(newCart);
    } else {
      // Nouveau produit, l'ajouter au panier
      setCart([...cart, itemWithDiscount]);
    }
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const updateCartItem = (index: number, item: CartItem) => {
    const newCart = [...cart];
    newCart[index] = item;
    setCart(newCart);
  };

  const updateAllCartItems = (items: CartItem[]) => {
    setCart(items);
  };

  const clearCart = () => {
    setCart([]);
    setStaffDiscountActive(false);
    setFreeDrinkActive(false);
    setFreeSnackActive(false);
    setOriginalOrder(null);
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

  const loadOrderForModification = (order: OriginalOrder, items: CartItem[]) => {
    setOriginalOrder(order);
    setCart(items);
  };

  const cancelOrderModification = () => {
    setOriginalOrder(null);
    setCart([]);
  };

  const getPriceDifference = () => {
    if (!originalOrder) return 0;
    return getTotalPrice() - originalOrder.originalTotal;
  };

  const isModifyingOrder = originalOrder !== null;

  return (
    <POSContext.Provider
      value={{
        currentEmployee,
        currentSession,
        cart,
        darkMode,
        staffDiscountActive,
        freeDrinkActive,
        freeSnackActive,
        originalOrder,
        isModifyingOrder,
        login,
        logout,
        addToCart,
        removeFromCart,
        updateCartItem,
        updateAllCartItems,
        clearCart,
        toggleDarkMode,
        getTotalPrice,
        setStaffDiscountActive,
        setFreeDrinkActive,
        setFreeSnackActive,
        loadOrderForModification,
        cancelOrderModification,
        getPriceDifference,
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
