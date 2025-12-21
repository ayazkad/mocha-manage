import { supabase } from "@/integrations/supabase/client";

export interface PrinterSettings {
  id: string;
  printer_server_ip: string;
  printer_name: string | null;
}

/**
 * Extracts the path from a URL or returns the path as-is.
 * - Full URL (https://pos.local/print) → /print
 * - Path (/print) → /print
 * - Empty/undefined → /print (default)
 */
export function getPrintBasePath(rawUrl?: string): string {
  if (!rawUrl || !rawUrl.trim()) return "/print";
  
  const trimmed = rawUrl.trim();
  
  try {
    // If it looks like a full URL, extract the pathname
    const url = new URL(trimmed);
    return url.pathname || "/print";
  } catch {
    // Not a valid URL, treat as path
    return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  }
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

/**
 * Tests if the print server is reachable via /health endpoint.
 * Uses relative path to go through Caddy reverse proxy.
 */
export async function testPrintServer(basePath?: string): Promise<PrintResult> {
  const path = getPrintBasePath(basePath);
  const healthUrl = `${path}/health`;
  
  console.log('[PrintService] Testing health endpoint:', healthUrl);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(healthUrl, {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      return {
        success: true,
        message: data.message || data.status || "Serveur accessible",
      };
    } else {
      return {
        success: false,
        message: `Erreur serveur: ${response.status} ${response.statusText}`,
      };
    }
  } catch (error) {
    const err = error as Error;
    console.error('[PrintService] Health check error:', err);
    
    if (err.name === 'AbortError') {
      return {
        success: false,
        message: "Timeout: le serveur ne répond pas (5s)",
      };
    }
    
    return {
      success: false,
      message: `Erreur réseau: ${err.message}`,
    };
  }
}

/**
 * Sends a print request to the local print server.
 * Uses relative path to go through Caddy reverse proxy.
 * 
 * Flow: POST /print → Caddy (handle_path strips /print) → Node receives POST /
 */
export async function sendPrintRequest(text: string): Promise<PrintResult> {
  try {
    const settings = await getPrinterSettings();
    const basePath = getPrintBasePath(settings?.printer_server_ip);
    
    console.log('[PrintService] Sending print request to:', basePath);
    console.log('[PrintService] Request body preview:', text.substring(0, 100) + '...');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(basePath, {
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

/**
 * Sends a test print request with a sample ticket.
 */
export async function sendTestPrint(): Promise<PrintResult> {
  const testTicket = `
========================================
         *** TEST IMPRESSION ***
========================================

Date: ${new Date().toLocaleString('fr-FR')}

Si vous voyez ce message, la connexion
au serveur d'impression fonctionne !

========================================
              LATTE POS
========================================

`;

  console.log('[PrintService] Sending test print...');
  return sendPrintRequest(testTicket);
}
