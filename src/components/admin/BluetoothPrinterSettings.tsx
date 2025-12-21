import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bluetooth, RefreshCw, Printer, Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { BluetoothPrinter, BluetoothDevice } from '@/plugins/bluetooth-printer';
import { isCapacitorNative } from '@/printing/printClient';

const BluetoothPrinterSettings = () => {
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [connectedDevice, setConnectedDevice] = useState<string | null>(null);
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    const native = isCapacitorNative();
    setIsNative(native);
    
    // Only check connection if in native mode
    if (native) {
      checkConnection();
    }
  }, []);

  const checkConnection = async () => {
    try {
      const { connected, deviceName } = await BluetoothPrinter.isConnected();
      if (connected && deviceName) {
        setConnectedDevice(deviceName);
      }
    } catch (error) {
      // Silently ignore - this happens if Bluetooth permissions not yet granted
      console.log('[BluetoothSettings] Connection check skipped:', error);
    }
  };

  const requestPermissions = async (): Promise<boolean> => {
    try {
      const { granted } = await BluetoothPrinter.requestPermissions();
      if (!granted) {
        toast.error('Permissions Bluetooth refusées');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  };

  const loadDevices = async () => {
    setLoading(true);
    try {
      // Check if Bluetooth is available
      const { available } = await BluetoothPrinter.isAvailable();
      if (!available) {
        toast.error('Bluetooth non disponible ou désactivé');
        setLoading(false);
        return;
      }

      // Request permissions
      const granted = await requestPermissions();
      if (!granted) {
        setLoading(false);
        return;
      }

      // Get paired devices
      const { devices: pairedDevices } = await BluetoothPrinter.getPairedDevices();
      setDevices(pairedDevices);

      if (pairedDevices.length === 0) {
        toast.info('Aucun appareil appairé trouvé. Appairez votre imprimante dans les paramètres Bluetooth Android.');
      }
    } catch (error) {
      console.error('Error loading devices:', error);
      toast.error('Erreur lors du chargement des appareils');
    } finally {
      setLoading(false);
    }
  };

  const connectToDevice = async (device: BluetoothDevice) => {
    setConnecting(device.address);
    try {
      const result = await BluetoothPrinter.connect({ address: device.address });
      if (result.success) {
        setConnectedDevice(device.name);
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      const err = error as Error;
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setConnecting(null);
    }
  };

  const disconnectDevice = async () => {
    try {
      const result = await BluetoothPrinter.disconnect();
      if (result.success) {
        setConnectedDevice(null);
        toast.success('Déconnecté');
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  };

  const testPrint = async () => {
    try {
      const result = await BluetoothPrinter.printText({ 
        text: '\n\n*** TEST IMPRESSION ***\n\nLattePOS Bluetooth\nImpression réussie!\n\n\n' 
      });
      if (result.success) {
        toast.success('Test envoyé à l\'imprimante');
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      const err = error as Error;
      toast.error(`Erreur: ${err.message}`);
    }
  };

  if (!isNative) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bluetooth className="h-5 w-5" />
            Imprimante Bluetooth
          </CardTitle>
          <CardDescription>
            Configuration de l'imprimante Bluetooth
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-amber-500 bg-amber-500/10 p-4 text-center">
            <p className="text-muted-foreground">
              L'impression Bluetooth est disponible uniquement sur l'application mobile Android.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bluetooth className="h-5 w-5" />
          Imprimante Bluetooth
        </CardTitle>
        <CardDescription>
          Connectez-vous à une imprimante thermique ESC/POS
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        {connectedDevice && (
          <div className="flex items-center justify-between rounded-lg border border-green-500 bg-green-500/10 p-3">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span>Connecté à: <strong>{connectedDevice}</strong></span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={testPrint}>
                <Printer className="h-4 w-4 mr-1" />
                Test
              </Button>
              <Button variant="outline" size="sm" onClick={disconnectDevice}>
                <X className="h-4 w-4 mr-1" />
                Déconnecter
              </Button>
            </div>
          </div>
        )}

        {/* Scan Button */}
        <Button onClick={loadDevices} disabled={loading} className="w-full">
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          {loading ? 'Recherche...' : 'Rechercher les imprimantes'}
        </Button>

        {/* Device List */}
        {devices.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Appareils appairés</h4>
            {devices.map((device) => (
              <div 
                key={device.address} 
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium">{device.name}</p>
                  <p className="text-xs text-muted-foreground">{device.address}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => connectToDevice(device)}
                  disabled={connecting !== null || connectedDevice === device.name}
                >
                  {connecting === device.address ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : connectedDevice === device.name ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    'Connecter'
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Help Text */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>💡 <strong>Conseil:</strong> Appairez d'abord votre imprimante dans les paramètres Bluetooth d'Android.</p>
          <p>Le code PIN est généralement 1234 ou 0000.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default BluetoothPrinterSettings;
