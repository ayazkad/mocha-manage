import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Building2, Save, Loader2 } from 'lucide-react';

interface BusinessSettings {
  id: string;
  business_name: string;
  ice: string;
  identifiant_fiscal: string;
  patente: string;
  rc: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  tva_rate: number;
  currency: string;
  footer_message: string;
}

const BusinessSettingsManager = () => {
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('business_settings')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching business settings:', error);
      toast.error('Erreur de chargement des paramètres');
    } else {
      setSettings(data);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);

    const { error } = await supabase
      .from('business_settings')
      .update({
        business_name: settings.business_name,
        ice: settings.ice,
        identifiant_fiscal: settings.identifiant_fiscal,
        patente: settings.patente,
        rc: settings.rc,
        address: settings.address,
        city: settings.city,
        phone: settings.phone,
        email: settings.email,
        tva_rate: settings.tva_rate,
        currency: settings.currency,
        footer_message: settings.footer_message,
      })
      .eq('id', settings.id);

    if (error) {
      toast.error('Erreur lors de la sauvegarde');
      console.error(error);
    } else {
      toast.success('Paramètres enregistrés');
    }
    setSaving(false);
  };

  const updateField = (field: keyof BusinessSettings, value: string | number) => {
    if (!settings) return;
    setSettings({ ...settings, [field]: value });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="space-y-6 p-4" data-protected-swipe="true">
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Paramètres du commerce</h2>
      </div>

      <p className="text-sm text-muted-foreground">
        Ces informations apparaîtront sur vos tickets de caisse (obligatoire DGI Maroc).
      </p>

      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="business_name">Nom du commerce</Label>
          <Input
            id="business_name"
            value={settings.business_name}
            onChange={(e) => updateField('business_name', e.target.value)}
            placeholder="Mon Commerce"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="ice">ICE</Label>
            <Input
              id="ice"
              value={settings.ice}
              onChange={(e) => updateField('ice', e.target.value)}
              placeholder="000000000000000"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="identifiant_fiscal">IF (Identifiant Fiscal)</Label>
            <Input
              id="identifiant_fiscal"
              value={settings.identifiant_fiscal}
              onChange={(e) => updateField('identifiant_fiscal', e.target.value)}
              placeholder="00000000"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="patente">Patente</Label>
            <Input
              id="patente"
              value={settings.patente}
              onChange={(e) => updateField('patente', e.target.value)}
              placeholder="00000000"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="rc">RC (Registre de Commerce)</Label>
            <Input
              id="rc"
              value={settings.rc}
              onChange={(e) => updateField('rc', e.target.value)}
              placeholder="00000"
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="address">Adresse</Label>
          <Input
            id="address"
            value={settings.address}
            onChange={(e) => updateField('address', e.target.value)}
            placeholder="123 Rue Example"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="city">Ville</Label>
            <Input
              id="city"
              value={settings.city}
              onChange={(e) => updateField('city', e.target.value)}
              placeholder="Casablanca"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              value={settings.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              placeholder="+212 6XX XX XX XX"
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={settings.email}
            onChange={(e) => updateField('email', e.target.value)}
            placeholder="contact@moncommerce.ma"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="tva_rate">Taux TVA (%)</Label>
            <Input
              id="tva_rate"
              type="number"
              value={settings.tva_rate}
              onChange={(e) => updateField('tva_rate', parseFloat(e.target.value) || 0)}
              placeholder="20"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="currency">Devise</Label>
            <Input
              id="currency"
              value={settings.currency}
              onChange={(e) => updateField('currency', e.target.value)}
              placeholder="MAD"
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="footer_message">Message de pied de ticket</Label>
          <Textarea
            id="footer_message"
            value={settings.footer_message}
            onChange={(e) => updateField('footer_message', e.target.value)}
            placeholder="Merci pour votre visite!"
            rows={2}
          />
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {saving ? 'Enregistrement...' : 'Enregistrer'}
      </Button>
    </div>
  );
};

export default BusinessSettingsManager;
