import { usePOS } from '@/contexts/POSContext';
import { Button } from '@/components/ui/button';
import { LogOut, User, Moon, Sun, Settings, ArrowLeft, Wrench, ScanLine } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { toast } from 'sonner';
import AddCustomerDialog from './AddCustomerDialog';
import ToolsDialog from './ToolsDialog';
import UnifiedScanner from './UnifiedScanner';
import logoLatte from '@/assets/logo-latte.png';

const Header = () => {
  const { currentEmployee, logout, darkMode, toggleDarkMode, isModifyingOrder } = usePOS();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminPage = location.pathname === '/admin';
  const [showTools, setShowTools] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const handleLogout = async () => {
    // Block logout for non-admin employees when modifying an order
    if (isModifyingOrder && currentEmployee?.role !== 'admin') {
      toast.error('Vous devez terminer la modification du ticket avant de vous déconnecter');
      return;
    }
    await logout();
  };

  return (
    <header className="bg-card border-b border-border/50 shadow-soft backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4">
        <div className="flex items-center gap-3">
          <img 
            src={logoLatte} 
            alt="Latte Logo" 
            className="h-10 w-auto object-contain"
          />
        </div>

        <div className="flex items-center gap-2">
          {isAdminPage && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/pos')}
              className="gap-2 rounded-xl border-border/50"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden md:inline">Back to POS</span>
            </Button>
          )}

          {!isAdminPage && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowScanner(true)}
              className="gap-2 rounded-xl border-border/50"
            >
              <ScanLine className="w-4 h-4" />
              <span className="hidden md:inline">Scanner</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="icon"
            onClick={toggleDarkMode}
            className="h-9 w-9 rounded-xl border-border/50"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>

          {!isAdminPage && <AddCustomerDialog />}

          {!isAdminPage && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTools(true)}
              className="gap-2 rounded-xl border-border/50"
            >
              <Wrench className="w-4 h-4" />
              <span className="hidden md:inline">Outils</span>
            </Button>
          )}

          <div className="hidden md:flex items-center gap-2 bg-secondary/50 px-4 py-2 rounded-xl border border-border/30">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{currentEmployee?.name}</span>
          </div>

          {!isAdminPage && currentEmployee?.role === 'admin' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin')}
              className="gap-2 rounded-xl border-border/50"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden md:inline">Admin</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="gap-2 rounded-xl border-border/50"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">Logout</span>
          </Button>
        </div>
      </div>

      <ToolsDialog open={showTools} onClose={() => setShowTools(false)} />
      <UnifiedScanner open={showScanner} onClose={() => setShowScanner(false)} />
    </header>
  );
};

export default Header;