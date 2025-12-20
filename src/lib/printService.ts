import { supabase } from "@/integrations/supabase/client";

export interface PrinterSettings {
  id: string;
  printer_server_ip: string;
  printer_name: string | null;
}

export async function getPrinterSettings(): Promise<PrinterSettings | null> {
  const { data, error } = await supabase
    .from('printer_settings')
    .select('*')
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching printer settings:', error);
    return null;
  }

  return data;
}

export async function updatePrinterSettings(
  printerServerIp: string,
  printerName: string
): Promise<boolean> {
  const { error } = await supabase
    .from('printer_settings')
    .update({
      printer_server_ip: printerServerIp,
      printer_name: printerName,
    })
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all rows

  if (error) {
    console.error('Error updating printer settings:', error);
    return false;
  }

  return true;
}

export interface PrintResult {
  success: boolean;
  message: string;
}

export async function sendPrintRequest(text: string): Promise<PrintResult> {
  try {
    // Get printer settings to get the local server URL
    const settings = await getPrinterSettings();
    
    if (!settings || !settings.printer_server_ip) {
      return {
        success: false,
        message: "Serveur d'impression non configuré. Allez dans Admin → Impression.",
      };
    }

    // Build the print URL - use the configured IP exactly as entered
    const baseUrl = settings.printer_server_ip.trim().replace(/\/+$/, '');
    // Add http:// if not present
    const normalizedUrl = baseUrl.includes('://') ? baseUrl : `http://${baseUrl}`;
    // Add port 3000 if not present
    const urlWithPort = normalizedUrl.includes(':3000') ? normalizedUrl : `${normalizedUrl}:3000`;
    const printUrl = `${urlWithPort}/print`;

    console.log('[PrintService] Sending direct print request to:', printUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(printUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      console.log('[PrintService] Print success:', data);
      return {
        success: true,
        message: data.message || "Impression envoyée avec succès",
      };
    } else {
      const errorText = await response.text().catch(() => '');
      console.error('[PrintService] Print error:', response.status, errorText);
      return {
        success: false,
        message: `Erreur serveur: ${response.status} ${response.statusText}`,
      };
    }
  } catch (error) {
    console.error('[PrintService] Print request error:', error);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          message: "Timeout: le serveur d'impression ne répond pas (10s)",
        };
      }
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        return {
          success: false,
          message: "Impossible de joindre le serveur. Vérifiez que vous êtes sur le même réseau.",
        };
      }
      return {
        success: false,
        message: `Erreur: ${error.message}`,
      };
    }
    return {
      success: false,
      message: "Erreur inconnue lors de l'envoi",
    };
  }
}
