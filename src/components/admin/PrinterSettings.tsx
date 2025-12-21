import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Printer, TestTube, Save, Loader2, Monitor, Globe } from 'lucide-react';
import { getPrinterSettings, updatePrinterSettings } from '@/lib/printService';
import { getPrintClient, isDesktopMode } from '@/printing/printClient';

const PrinterSettings = () => {
  const [printerName, setPrinterName] = useState('Imprimante POS');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testingPrint, setTestingPrint] = useState(false);
  const { toast } = useToast();

  const isDesktop = isDesktopMode();
  const printClient = getPrintClient();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    const settings = await getPrinterSettings();
    if (settings) {
      setPrinterName(settings.printer_name || '');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const success = await updatePrinterSettings('', printerName.trim());
    setSaving(false);

    if (success) {
      toast({
        title: "Paramètres sauvegardés",
        description: "La configuration de l'imprimante a été mise à jour.",
      });
    } else {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les paramètres.",
        variant: "destructive",
      });
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    
    console.log('[PrinterSettings] Testing connection via PrintClient...');
    const result = await printClient.testConnection();
    
    toast({
      title: result.success ? "Connexion réussie" : "Non disponible",
      description: result.message,
      variant: result.success ? "default" : "destructive",
    });
    
    setTesting(false);
  };

  const handleTestPrint = async () => {
    setTestingPrint(true);
    
    console.log('[PrinterSettings] Testing print via PrintClient...');

    const testTicket = `
========================================
         *** TEST IMPRESSION ***
========================================

Date: ${new Date().toLocaleString('fr-FR')}

Si vous voyez ce message, l'impression
locale fonctionne correctement !

========================================
              LATTE POS
========================================

`;
    
    const result = await printClient.printReceipt(testTicket);
    
    toast({
      title: result.success ? "Impression envoyée" : "Non disponible",
      description: result.message,
      variant: result.success ? "default" : "destructive",
    });
    
    setTestingPrint(false);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Impression locale
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Printer className="h-5 w-5" />
          Impression locale
        </CardTitle>
        <CardDescription>
          L'impression est gérée par le client desktop (application .exe).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Mode indicator */}
        <div className={`rounded-lg border p-4 ${isDesktop ? 'border-green-500 bg-green-500/10' : 'border-amber-500 bg-amber-500/10'}`}>
          <div className="flex items-center gap-3">
            {isDesktop ? (
              <>
                <Monitor className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium text-green-700 dark:text-green-400">Mode Desktop</p>
                  <p className="text-sm text-muted-foreground">
                    Client de caisse détecté. L'impression locale est disponible.
                  </p>
                </div>
              </>
            ) : (
              <>
                <Globe className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="font-medium text-amber-700 dark:text-amber-400">Mode Web</p>
                  <p className="text-sm text-muted-foreground">
                    Vous utilisez la version web. Pour imprimer, utilisez le client desktop sur le PC de caisse.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="printer-name">Nom de l'imprimante (affichage)</Label>
          <Input
            id="printer-name"
            type="text"
            placeholder="Imprimante POS"
            value={printerName}
            onChange={(e) => setPrinterName(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Ce nom est utilisé uniquement pour l'affichage dans l'interface.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Sauvegarder
          </Button>

          <Button 
            variant="outline" 
            onClick={handleTestConnection} 
            disabled={testing}
          >
            {testing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <TestTube className="mr-2 h-4 w-4" />
            )}
            Tester la connexion
          </Button>

          <Button 
            variant="outline" 
            onClick={handleTestPrint} 
            disabled={testingPrint}
          >
            {testingPrint ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Printer className="mr-2 h-4 w-4" />
            )}
            Tester l'impression
          </Button>
        </div>

        {printerName && (
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <h4 className="mb-2 font-medium text-sm">Configuration</h4>
            <p className="text-sm text-muted-foreground">
              Imprimante : <span className="text-foreground">{printerName}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Mode : <span className="text-foreground">{isDesktop ? 'Desktop (impression locale)' : 'Web (pas d\'impression)'}</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PrinterSettings;
