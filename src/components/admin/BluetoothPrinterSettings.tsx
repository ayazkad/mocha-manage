import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bluetooth, RefreshCw, Printer, Check, X, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { isCapacitorNative, getPrintClient, PrintClient } from '@/printing/printClient';
import * as BlePrinter from '@/lib/bleprinter';

interface DeviceInfo {
  deviceId: string;
  name: string;
}

const BluetoothPrinterSettings = () => {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [connectedDevice, setConnectedDevice] = useState<string | null>(null);
  const [isNative, setIsNative] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [printClient, setPrintClient] = useState<PrintClient | null>(null);

  useEffect(() => {
    const native = isCapacitorNative();
    setIsNative(native);
    
    if (native) {
      const client = getPrintClient();
      setPrintClient(client);
      checkConnection(client);
    }
  }, []);

  const checkConnection = async (client?: PrintClient) => {
    try {
      const c = client || printClient;
      if (c?.isConnectedToPrinter) {
        const { connected, deviceName } = c.isConnectedToPrinter();
        if (connected && deviceName) {
          setConnectedDevice(deviceName);
        }
      }
    } catch (error) {
      console.log('[BluetoothSettings] Connection check skipped:', error);
    }
  };

  const loadBondedDevices = async () => {
    setLastError(null);
    setLoading(true);
    try {
      // Check if Bluetooth is available
      const available = await BlePrinter.isBleAvailable();
      if (!available) {
        toast.error('Bluetooth non disponible ou désactivé');
        await BlePrinter.requestBluetoothEnable();
        return;
      }

      // Get bonded devices (Android only)
      if (printClient?.getBondedDevices) {
        const bondedDevices = await printClient.getBondedDevices();
        setDevices(bondedDevices);

        if (bondedDevices.length === 0) {
          toast.info(
            'Aucun appareil appairé trouvé. Utilisez le bouton "Scanner" pour rechercher des imprimantes.'
          );
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Error loading devices:', error);
      setLastError(message);
      toast.error(`Erreur lors du chargement: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const scanForDevices = async () => {
    setLastError(null);
    setScanning(true);
    try {
      const available = await BlePrinter.isBleAvailable();
      if (!available) {
        toast.error('Bluetooth non disponible ou désactivé');
        await BlePrinter.requestBluetoothEnable();
        return;
      }

      if (printClient?.scanForPrinters) {
        const device = await printClient.scanForPrinters();
        if (device) {
          // Auto-connect to the selected device
          await connectToDevice(device);
        } else {
          toast.info('Aucun appareil sélectionné');
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Error scanning:', error);
      setLastError(message);
      toast.error(`Erreur lors du scan: ${message}`);
    } finally {
      setScanning(false);
    }
  };

  const connectToDevice = async (device: DeviceInfo) => {
    setConnecting(device.deviceId);
    try {
      if (printClient?.connectToPrinter) {
        const result = await printClient.connectToPrinter(device.deviceId, device.name);
        if (result.success) {
          setConnectedDevice(device.name);
          toast.success(result.message);
        } else {
          toast.error(result.message);
        }
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
      if (printClient?.disconnectPrinter) {
        const result = await printClient.disconnectPrinter();
        if (result.success) {
          setConnectedDevice(null);
          toast.success('Déconnecté');
        }
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
      setConnectedDevice(null);
    }
  };

  const testPrint = async () => {
    try {
      const result = await BlePrinter.testPrint();
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
              L'impression Bluetooth est disponible uniquement sur l'application mobile (iOS/Android).
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
          Connectez-vous à une imprimante thermique ESC/POS via Bluetooth LE
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

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={scanForDevices} disabled={scanning} className="w-full">
            {scanning ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            {scanning ? 'Scan...' : 'Scanner'}
          </Button>
          <Button onClick={loadBondedDevices} disabled={loading} variant="outline" className="w-full">
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {loading ? 'Chargement...' : 'Appairés'}
          </Button>
        </div>

        {lastError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs">
            <p className="font-medium text-foreground">Détail de l'erreur :</p>
            <p className="mt-1 break-words text-muted-foreground">{lastError}</p>
          </div>
        )}

        {/* Device List */}
        {devices.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Appareils appairés</h4>
            {devices.map((device) => (
              <div 
                key={device.deviceId} 
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium">{device.name}</p>
                  <p className="text-xs text-muted-foreground">{device.deviceId}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => connectToDevice(device)}
                  disabled={connecting !== null || connectedDevice === device.name}
                >
                  {connecting === device.deviceId ? (
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
          <p>💡 <strong>Scanner:</strong> Recherche les imprimantes Bluetooth à proximité.</p>
          <p>💡 <strong>Appairés:</strong> Liste les appareils déjà appairés (Android seulement).</p>
          <p>Le code PIN est généralement 1234 ou 0000.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default BluetoothPrinterSettings;
