/**
 * Print Client Abstraction Layer
 * 
 * This module provides a unified interface for printing that works across:
 * - Web (hosted version): shows "not available" messages
 * - Desktop (Electron/Tauri .exe): uses native printing via window.electronAPI
 * 
 * The desktop client will inject `window.electronAPI` via its preload script,
 * enabling local ESC/POS printing without changing React code.
 */

export interface PrintResult {
  success: boolean;
  message: string;
}

export interface PrintClient {
  /**
   * Check if printing is available on this client
   */
  isAvailable(): boolean;

  /**
   * Test connection to the local printer
   */
  testConnection(): Promise<PrintResult>;

  /**
   * Send text to be printed (receipt text, not ESC/POS commands)
   */
  printReceipt(text: string): Promise<PrintResult>;
}

// Extend Window interface for native APIs (Electron/Tauri/Capacitor)
declare global {
  interface Window {
    electronAPI?: {
      testPrint: () => Promise<void>;
      printReceipt: (text: string) => Promise<void>;
    };
    // Capacitor Android native bridge for printing
    CapacitorPrintBridge?: {
      testPrint: () => Promise<void>;
      printReceipt: (text: string) => Promise<void>;
    };
  }
}

/**
 * Web client implementation - shows "not available" messages
 */
class WebPrintClient implements PrintClient {
  isAvailable(): boolean {
    return false;
  }

  async testConnection(): Promise<PrintResult> {
    return {
      success: false,
      message: "L'impression locale nécessite le client de caisse installé sur PC.",
    };
  }

  async printReceipt(_text: string): Promise<PrintResult> {
    return {
      success: false,
      message: "L'impression locale n'est pas disponible sur ce terminal. Utilisez le client desktop.",
    };
  }
}

/**
 * Desktop client implementation - uses window.electronAPI
 */
class DesktopPrintClient implements PrintClient {
  isAvailable(): boolean {
    return true;
  }

  async testConnection(): Promise<PrintResult> {
    try {
      await window.electronAPI!.testPrint();
      return {
        success: true,
        message: "Connexion à l'imprimante réussie.",
      };
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        message: `Erreur de connexion: ${err.message}`,
      };
    }
  }

  async printReceipt(text: string): Promise<PrintResult> {
    try {
      console.log('[DesktopPrintClient] Sending receipt to local printer...');
      await window.electronAPI!.printReceipt(text);
      return {
        success: true,
        message: "Ticket envoyé à l'imprimante.",
      };
    } catch (error) {
      const err = error as Error;
      console.error('[DesktopPrintClient] Print error:', err);
      return {
        success: false,
        message: `Erreur d'impression: ${err.message}`,
      };
    }
  }
}

/**
 * Capacitor Android client implementation - uses window.CapacitorPrintBridge
 */
class CapacitorPrintClient implements PrintClient {
  isAvailable(): boolean {
    return true;
  }

  async testConnection(): Promise<PrintResult> {
    try {
      await window.CapacitorPrintBridge!.testPrint();
      return {
        success: true,
        message: "Connexion à l'imprimante réussie.",
      };
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        message: `Erreur de connexion: ${err.message}`,
      };
    }
  }

  async printReceipt(text: string): Promise<PrintResult> {
    try {
      console.log('[CapacitorPrintClient] Sending receipt to printer...');
      await window.CapacitorPrintBridge!.printReceipt(text);
      return {
        success: true,
        message: "Ticket envoyé à l'imprimante.",
      };
    } catch (error) {
      const err = error as Error;
      console.error('[CapacitorPrintClient] Print error:', err);
      return {
        success: false,
        message: `Erreur d'impression: ${err.message}`,
      };
    }
  }
}

// Singleton instance
let printClientInstance: PrintClient | null = null;

/**
 * Get the appropriate print client based on runtime environment
 * 
 * Detection logic:
 * - If window.electronAPI exists → Desktop mode (Electron/Tauri)
 * - If window.CapacitorPrintBridge exists → Capacitor Android mode
 * - Otherwise → Web mode (no-op client)
 */
export function getPrintClient(): PrintClient {
  if (printClientInstance) {
    return printClientInstance;
  }

  // Check for desktop API (Electron/Tauri)
  if (typeof window !== 'undefined' && window.electronAPI) {
    console.log('[PrintClient] Desktop mode detected (electronAPI found)');
    printClientInstance = new DesktopPrintClient();
  } 
  // Check for Capacitor Android API
  else if (typeof window !== 'undefined' && window.CapacitorPrintBridge) {
    console.log('[PrintClient] Capacitor mode detected (CapacitorPrintBridge found)');
    printClientInstance = new CapacitorPrintClient();
  } 
  // Fallback to web mode
  else {
    console.log('[PrintClient] Web mode (no native API)');
    printClientInstance = new WebPrintClient();
  }

  return printClientInstance;
}

/**
 * Check if we're running in desktop mode (Electron/Tauri)
 */
export function isDesktopMode(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI;
}

/**
 * Check if we're running in Capacitor Android mode
 */
export function isCapacitorMode(): boolean {
  return typeof window !== 'undefined' && !!window.CapacitorPrintBridge;
}

/**
 * Check if we're running in any native mode (desktop or mobile)
 */
export function isNativeMode(): boolean {
  return isDesktopMode() || isCapacitorMode();
}

/**
 * Reset the client instance (useful for testing or hot reload)
 */
export function resetPrintClient(): void {
  printClientInstance = null;
}
