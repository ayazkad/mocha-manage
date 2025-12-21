import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Printer, TestTube, Save, Loader2 } from 'lucide-react';
import { getPrinterSettings, updatePrinterSettings, testPrintServer, sendTestPrint, getPrintBasePath } from '@/lib/printService';

const PrinterSettings = () => {
  const [printerServerIp, setPrinterServerIp] = useState('/print');
  const [printerName, setPrinterName] = useState('Imprimante POS');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testingPrint, setTestingPrint] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    const settings = await getPrinterSettings();
    if (settings) {
      setPrinterServerIp(settings.printer_server_ip || '/print');
      setPrinterName(settings.printer_name || '');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const pathToSave = printerServerIp.trim() || '/print';
    const success = await updatePrinterSettings(pathToSave, printerName.trim());
    setSaving(false);

    if (success) {
      toast({
        title: "Paramètres sauvegardés",
        description: "La configuration du serveur d'impression a été mise à jour.",
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
    
    const basePath = getPrintBasePath(printerServerIp);
    console.log('[PrinterSettings] Testing connection with path:', basePath);
    
    const result = await testPrintServer(printerServerIp);
    
    toast({
      title: result.success ? "Serveur accessible" : "Erreur",
      description: result.message,
      variant: result.success ? "default" : "destructive",
    });
    
    setTesting(false);
  };

  const handleTestPrint = async () => {
    setTestingPrint(true);
    
    console.log('[PrinterSettings] Testing print...');
    
    const result = await sendTestPrint();
    
    toast({
      title: result.success ? "Impression envoyée" : "Erreur",
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
            Impression / Serveur d'impression
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const displayPath = getPrintBasePath(printerServerIp);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Printer className="h-5 w-5" />
          Impression / Serveur d'impression
        </CardTitle>
        <CardDescription>
          Configurez le chemin vers le serveur d'impression (via reverse proxy Caddy).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="printer-ip">Chemin du serveur d'impression</Label>
            <Input
              id="printer-ip"
              type="text"
              placeholder="/print"
              value={printerServerIp}
              onChange={(e) => setPrinterServerIp(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Valeur recommandée : <code className="bg-muted px-1 rounded">/print</code><br />
              Test connexion → <code className="bg-muted px-1 rounded">GET /print/health</code><br />
              Impression → <code className="bg-muted px-1 rounded">POST /print/print</code>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="printer-name">Nom de l'imprimante</Label>
            <Input
              id="printer-name"
              type="text"
              placeholder="Imprimante POS"
              value={printerName}
              onChange={(e) => setPrinterName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Pour affichage uniquement
            </p>
          </div>
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

          <Button variant="outline" onClick={handleTestConnection} disabled={testing}>
            {testing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <TestTube className="mr-2 h-4 w-4" />
            )}
            Tester la connexion
          </Button>

          <Button variant="outline" onClick={handleTestPrint} disabled={testingPrint}>
            {testingPrint ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Printer className="mr-2 h-4 w-4" />
            )}
            Tester l'impression
          </Button>
        </div>

        <div className="rounded-lg border border-border bg-muted/50 p-4">
          <h4 className="mb-2 font-medium text-sm">Configuration actuelle</h4>
          <p className="text-sm text-muted-foreground">
            Chemin : <code className="text-foreground">{displayPath}</code>
          </p>
          <p className="text-sm text-muted-foreground">
            Test connexion : <code className="text-foreground">GET {displayPath}/health</code>
          </p>
          <p className="text-sm text-muted-foreground">
            Impression : <code className="text-foreground">POST {displayPath}/print</code>
          </p>
          {printerName && (
            <p className="text-sm text-muted-foreground mt-1">
              Imprimante : <span className="text-foreground">{printerName}</span>
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PrinterSettings;
