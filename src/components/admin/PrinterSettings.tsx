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
    if (!printerServerIp.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer une adresse de serveur.",
        variant: "destructive",
      });
      return;
    }

    setTesting(true);
    
    try {
      // Use the URL exactly as entered, just clean trailing slashes
      const baseUrl = printerServerIp.trim().replace(/\/+$/, '');
      const testUrl = `${baseUrl}/`;
      
      console.log('[PrinterTest] Testing URL:', testUrl);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      // Direct fetch from frontend - no Edge Function, no URL modification
      const response = await fetch(testUrl, { 
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const text = await response.text();
        toast({
          title: "Serveur accessible",
          description: `Le serveur ${baseUrl} répond: "${text.substring(0, 50)}"`,
        });
      } else {
        toast({
          title: "Serveur accessible mais erreur",
          description: `Status: ${response.status} ${response.statusText}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      const err = error as Error;
      console.error('[PrinterTest] Error:', err);
      
      if (err.name === 'AbortError') {
        toast({
          title: "Timeout",
          description: "Le serveur ne répond pas (5s timeout).",
          variant: "destructive",
        });
      } else if (err.message.includes('CORS') || err.message.includes('NetworkError')) {
        // CORS or network error - try with no-cors as fallback
        try {
          const baseUrl = printerServerIp.trim().replace(/\/+$/, '');
          await fetch(`${baseUrl}/`, { method: 'GET', mode: 'no-cors' });
          toast({
            title: "Serveur probablement accessible",
            description: `Réponse reçue de ${baseUrl} (mode no-cors, pas de détails disponibles).`,
          });
        } catch {
          toast({
            title: "Erreur réseau",
            description: "Impossible de joindre le serveur. Vérifiez l'adresse et que vous êtes sur le même réseau.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Erreur",
          description: `Impossible de joindre le serveur: ${err.message}`,
          variant: "destructive",
        });
      }
    } finally {
      setTesting(false);
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
            <Label htmlFor="printer-ip">URL du serveur d'impression</Label>
            <Input
              id="printer-ip"
              type="text"
              placeholder="http://192.168.1.187:3000"
              value={printerServerIp}
              onChange={(e) => setPrinterServerIp(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Entrez l'URL complète (ex: http://192.168.1.187:3000)
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
