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
    const response = await supabase.functions.invoke('print-relay', {
      body: { text },
    });

    if (response.error) {
      console.error('Edge function error:', response.error);
      return {
        success: false,
        message: response.error.message || "Erreur lors de l'appel au serveur d'impression",
      };
    }

    const data = response.data as { success: boolean; message: string };
    return {
      success: data.success,
      message: data.message,
    };
  } catch (error) {
    console.error('Print request error:', error);
    if (error instanceof Error) {
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
