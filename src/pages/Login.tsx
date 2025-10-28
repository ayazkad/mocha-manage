import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePOS } from '@/contexts/POSContext';
import { Button } from '@/components/ui/button';
import { Coffee } from 'lucide-react';
import { toast } from 'sonner';
import NumPad from '@/components/login/NumPad';

const Login = () => {
  const [employeeCode, setEmployeeCode] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'code' | 'pin'>('code');
  const { login } = usePOS();
  const navigate = useNavigate();

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
      toast.error('Code employé et PIN doivent contenir 4 chiffres');
      return;
    }

    setLoading(true);
    const success = await login(employeeCode, pin);
    setLoading(false);

    if (success) {
      toast.success('Connexion réussie');
      navigate('/pos');
    } else {
      toast.error('Code employé ou PIN invalide');
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
              <p className="text-muted-foreground mt-2">Employee Login</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <div className="text-center">
                <label className="text-lg font-semibold text-foreground">
                  {step === 'code' ? 'Code Employé' : 'Code PIN'}
                </label>
                <p className="text-sm text-muted-foreground mt-1">
                  Entrez 4 chiffres
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
                          : pin[i] ? '•' : '•'
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

          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">Test account: 0000 / 0000</p>
            <p className="text-xs text-muted-foreground">Admin access</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
