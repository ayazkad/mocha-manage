import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Barcode, Camera } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';

interface AdminBarcodeScannerProps {
  onBarcodeScanned: (barcode: string) => void;
}

const AdminBarcodeScanner = ({ onBarcodeScanned }: AdminBarcodeScannerProps) => {
  const [open, setOpen] = useState(false);
  const [barcode, setBarcode] = useState('');
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!open) {
      setBarcode('');
      setScanning(false);
    }
  }, [open]);

  const handleScan = () => {
    if (!barcode) return;
    onBarcodeScanned(barcode);
    setBarcode('');
    setOpen(false);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <Camera className="w-4 h-4" />
        Scan with camera
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan barcode</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="camera" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="camera">
                <Camera className="w-4 h-4 mr-2" />
                Camera
              </TabsTrigger>
              <TabsTrigger value="manual">
                <Barcode className="w-4 h-4 mr-2" />
                Manual
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="camera" className="space-y-4">
              <div className="rounded-lg overflow-hidden bg-muted">
                <Scanner
                  onScan={(detectedCodes) => {
                    const code = detectedCodes[0]?.rawValue;
                    if (code && !scanning) {
                      setScanning(true);
                      setBarcode(code);
                      setTimeout(() => {
                        onBarcodeScanned(code);
                        setOpen(false);
                      }, 100);
                    }
                  }}
                  styles={{
                    container: {
                      width: '100%',
                      height: '300px',
                    },
                  }}
                  components={{
                    finder: true,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Position the barcode in front of the camera
              </p>
            </TabsContent>
            
            <TabsContent value="manual" className="space-y-4">
              <div className="flex items-center gap-2">
                <Barcode className="w-5 h-5 text-muted-foreground" />
                <Input
                  autoFocus
                  placeholder="Enter barcode"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleScan();
                    }
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleScan} className="flex-1">
                  Confirm
                </Button>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminBarcodeScanner;
