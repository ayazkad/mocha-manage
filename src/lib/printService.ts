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
  const settings = await getPrinterSettings();

  if (!settings || !settings.printer_server_ip) {
    return {
      success: false,
      message: "Aucun serveur d'impression configuré",
    };
  }

  const url = `http://${settings.printer_server_ip}:3000/print`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return {
        success: true,
        message: "Impression envoyée avec succès",
      };
    } else {
      return {
        success: false,
        message: `Erreur serveur: ${response.status} ${response.statusText}`,
      };
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          message: "Timeout: le serveur d'impression ne répond pas",
        };
      }
      // Check for Mixed Content / CORS errors
      if (error.message === 'Failed to fetch') {
        return {
          success: false,
          message: "Blocage navigateur: l'app HTTPS ne peut pas appeler un serveur HTTP local. Ouvrez l'app sur le même réseau local ou désactivez la sécurité mixed-content.",
        };
      }
      return {
        success: false,
        message: `Erreur de connexion: ${error.message}`,
      };
    }
    return {
      success: false,
      message: "Erreur inconnue lors de l'envoi",
    };
  }
}
