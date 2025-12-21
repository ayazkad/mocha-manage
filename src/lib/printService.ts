import { supabase } from "@/integrations/supabase/client";

export interface PrinterSettings {
  id: string;
  printer_server_ip: string;
  printer_name: string | null;
}

/**
 * Fetches printer settings from the database.
 * Note: printer_server_ip is now deprecated (no HTTP print server).
 * Only printer_name is used for display purposes.
 */
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

/**
 * Updates printer settings in the database.
 * @param _printerServerIp - Deprecated, kept for compatibility
 * @param printerName - Display name for the printer
 */
export async function updatePrinterSettings(
  _printerServerIp: string,
  printerName: string
): Promise<boolean> {
  const { error } = await supabase
    .from('printer_settings')
    .update({
      printer_name: printerName,
    })
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all rows

  if (error) {
    console.error('Error updating printer settings:', error);
    return false;
  }

  return true;
}
