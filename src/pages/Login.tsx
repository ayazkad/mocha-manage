import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePOS } from '@/contexts/POSContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Coffee } from 'lucide-react';
import { toast } from 'sonner';

const Login = () => {
  const [employeeCode, setEmployeeCode] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = usePOS();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (employeeCode.length !== 4 || pin.length !== 4) {
      toast.error('Le code employé et le PIN doivent comporter 4 chiffres');
      return;
    }

    setLoading(true);
    const success = await login(employeeCode, pin);
    setLoading(false);

    if (success) {
      toast.success('Connexion réussie');
      navigate('/pos');
    } else {
      toast.error('Code employé ou PIN incorrect');
      setEmployeeCode('');
      setPin('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-latte flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-strong p-8 space-y-8">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-espresso shadow-medium">
              <Coffee className="w-10 h-10 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Café POS</h1>
              <p className="text-muted-foreground mt-2">Connexion employé</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Code employé (4 chiffres)
              </label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value.replace(/\D/g, ''))}
                placeholder="0000"
                className="text-center text-2xl tracking-widest h-14"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Code PIN (4 chiffres)
              </label>
              <Input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="text-center text-2xl tracking-widest h-14"
              />
            </div>

            <Button
              type="submit"
              disabled={loading || employeeCode.length !== 4 || pin.length !== 4}
              className="w-full h-14 text-lg bg-gradient-espresso hover:opacity-90 transition-opacity"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>

          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">Compte test : 0000 / 0000</p>
            <p className="text-xs text-muted-foreground">Admin access</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
