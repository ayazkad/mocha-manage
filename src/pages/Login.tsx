import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePOS } from '@/contexts/POSContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { LogIn } from 'lucide-react';
import NumPad from '@/components/login/NumPad';
import logoLatte from '@/assets/logo-latte.png';
import { usePreventVerticalScroll } from '@/hooks/use-prevent-vertical-scroll';

const Login = () => {
  const { user, loading: authLoading, signOut: ownerSignOut } = useAuth();
  const [employeeCode, setEmployeeCode] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'code' | 'pin'>('code');
  const { login } = usePOS();
  const navigate = useNavigate();

  // Block vertical scroll/swipe on iOS (numpad page)
  usePreventVerticalScroll();

  const handleNext = () => {
    if (employeeCode.length === 4) {
      setStep('pin');
    }
  };

  const handleBack = () => {
    setStep('code');
    setPin('');
  };

  const handleSubmit = async () => {
    if (employeeCode.length !== 4 || pin.length !== 4) {
      toast.error('Employee code and PIN must contain 4 digits');
      return;
    }

    setLoading(true);
    const success = await login(employeeCode, pin);
    setLoading(false);

    if (success) {
      toast.success('Login successful');
      navigate('/pos');
    } else {
      toast.error('Invalid employee code or PIN');
      setEmployeeCode('');
      setPin('');
      setStep('code');
    }
  };

  // Auto-advance when employee code is complete
  useEffect(() => {
    if (step === 'code' && employeeCode.length === 4) {
      setTimeout(() => setStep('pin'), 300);
    }
  }, [employeeCode, step]);

  // Auto-submit when PIN is complete
  useEffect(() => {
    if (step === 'pin' && pin.length === 4 && !loading) {
      setTimeout(() => handleSubmit(), 300);
    }
  }, [pin, step]);

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });

    if (error) {
      toast.error('Error signing in with Google');
    }
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-latte flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-card rounded-2xl shadow-strong p-8 space-y-8 text-center">
          <div className="flex justify-center">
            <img src={logoLatte} alt="Latte Logo" className="h-24 w-auto object-contain" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Bienvenue sur Latte POS</h1>
            <p className="text-muted-foreground">Veuillez vous connecter pour gérer votre établissement</p>
          </div>
          <Button 
            onClick={handleGoogleLogin} 
            className="w-full flex gap-2 h-12 text-lg"
          >
            <LogIn className="w-5 h-5" />
            Se connecter avec Google
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-latte flex items-center justify-center p-4 login-page">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-strong p-8 space-y-8">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <img
                src={logoLatte}
                alt="Latte Logo"
                className="h-24 w-auto object-contain"
              />
            </div>
            <div className="flex flex-col items-center gap-1">
              <p className="text-muted-foreground">Employee Login</p>
              <button 
                onClick={ownerSignOut}
                className="text-xs text-primary underline"
              >
                Changer de compte
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <div className="text-center">
                <label className="text-lg font-semibold text-foreground">
                  {step === 'code' ? 'Employee Code' : 'PIN Code'}
                </label>
                <p className="text-sm text-muted-foreground mt-1">
                  Enter 4 digits
                </p>
              </div>

              <div className="flex justify-center">
                <div className="flex gap-3">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="w-14 h-14 rounded-lg border-2 border-primary flex items-center justify-center bg-muted"
                    >
                      <span className="text-2xl font-bold">
                        {step === 'code'
                          ? employeeCode[i] || '•'
                          : pin[i] ? '*' : '•'
                        }
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <NumPad
              value={step === 'code' ? employeeCode : pin}
              onChange={step === 'code' ? setEmployeeCode : setPin}
              maxLength={4}
            />
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;
