import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Printer, TestTube, Save, Loader2 } from 'lucide-react';
import { getPrinterSettings, updatePrinterSettings, sendPrintRequest } from '@/lib/printService';

const PrinterSettings = () => {
  const [printerServerIp, setPrinterServerIp] = useState('192.168.1.187');
  const [printerName, setPrinterName] = useState('Imprimante POS');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    const settings = await getPrinterSettings();
    if (settings) {
      setPrinterServerIp(settings.printer_server_ip);
      setPrinterName(settings.printer_name || '');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!printerServerIp.trim()) {
      toast({
        title: "Erreur",
        description: "L'adresse IP est requise",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    const success = await updatePrinterSettings(printerServerIp.trim(), printerName.trim());
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

  const handleTestPrint = async () => {
    setTesting(true);
    const result = await sendPrintRequest("TEST IMPRESSION POS");
    setTesting(false);

    if (result.success) {
      toast({
        title: "Test réussi",
        description: "Test d'impression envoyé avec succès au serveur d'impression.",
      });
    } else {
      toast({
        title: "Échec du test",
        description: result.message,
        variant: "destructive",
      });
    }
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Printer className="h-5 w-5" />
          Impression / Serveur d'impression
        </CardTitle>
        <CardDescription>
          Configurez l'adresse IP du serveur d'impression (Android + Termux) sur le réseau local.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="printer-ip">Adresse IP du serveur</Label>
            <Input
              id="printer-ip"
              type="text"
              placeholder="192.168.1.187"
              value={printerServerIp}
              onChange={(e) => setPrinterServerIp(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Le port 3000 est utilisé automatiquement
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

          <Button variant="outline" onClick={handleTestPrint} disabled={testing}>
            {testing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <TestTube className="mr-2 h-4 w-4" />
            )}
            Tester l'impression
          </Button>
        </div>

        <div className="rounded-lg border border-border bg-muted/50 p-4">
          <h4 className="mb-2 font-medium text-sm">Configuration actuelle</h4>
          <p className="text-sm text-muted-foreground">
            Serveur: <code className="text-foreground">{printerServerIp || '(non configuré)'}</code>
          </p>
          {printerName && (
            <p className="text-sm text-muted-foreground">
              Imprimante: <span className="text-foreground">{printerName}</span>
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PrinterSettings;
