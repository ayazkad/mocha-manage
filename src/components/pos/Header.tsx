import { usePOS } from '@/contexts/POSContext';
import { Button } from '@/components/ui/button';
import { Coffee, LogOut, User, Moon, Sun } from 'lucide-react';

const Header = () => {
  const { currentEmployee, logout, language, setLanguage, darkMode, toggleDarkMode } = usePOS();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className="bg-card border-b border-border shadow-soft">
      <div className="flex items-center justify-between px-4 md:px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-espresso flex items-center justify-center shadow-soft">
            <Coffee className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Café POS</h1>
            <p className="text-xs text-muted-foreground">Point de vente</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            <Button
              variant={language === 'fr' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setLanguage('fr')}
              className="text-xs px-3 h-8"
            >
              FR
            </Button>
            <Button
              variant={language === 'en' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setLanguage('en')}
              className="text-xs px-3 h-8"
            >
              EN
            </Button>
            <Button
              variant={language === 'ru' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setLanguage('ru')}
              className="text-xs px-3 h-8"
            >
              RU
            </Button>
            <Button
              variant={language === 'ge' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setLanguage('ge')}
              className="text-xs px-3 h-8"
            >
              GE
            </Button>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={toggleDarkMode}
            className="h-9 w-9"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>

          <div className="hidden md:flex items-center gap-2 bg-muted px-4 py-2 rounded-lg">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">{currentEmployee?.name}</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">Déconnexion</span>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
