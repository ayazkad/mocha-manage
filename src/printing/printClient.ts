/**
 * Print Client Abstraction Layer
 * 
 * This module provides a unified interface for printing that works across:
 * - Web (hosted version): shows "not available" messages
 * - Desktop (Electron/Tauri .exe): uses native printing via window.electronAPI
 * - Capacitor (Android/iOS): uses Bluetooth LE Printer
 * 
 * The desktop client will inject `window.electronAPI` via its preload script,
 * enabling local ESC/POS printing without changing React code.
 */

import { Capacitor } from '@capacitor/core';
import { buildReceipt, buildReceiptWithImages } from '@/plugins/bluetooth-printer/escpos';
import * as BlePrinter from '@/lib/bleprinter';

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

  /**
   * Send receipt with logo and QR code images
   */
  printReceiptWithImages(text: string, logoBase64?: string, qrCodeData?: string): Promise<PrintResult>;

  /**
   * Scan for Bluetooth printers (for Capacitor mode)
   */
  scanForPrinters?(): Promise<{ deviceId: string; name: string } | null>;

  /**
   * Get bonded/paired devices (for Capacitor mode - Android)
   */
  getBondedDevices?(): Promise<{ deviceId: string; name: string }[]>;

  /**
   * Connect to a Bluetooth printer (for Capacitor mode)
   */
  connectToPrinter?(deviceId: string, name?: string): Promise<PrintResult>;

  /**
   * Disconnect from current printer (for Capacitor mode)
   */
  disconnectPrinter?(): Promise<PrintResult>;

  /**
   * Check if connected to a printer (for Capacitor mode)
   */
  isConnectedToPrinter?(): { connected: boolean; deviceName?: string };
}

// Extend Window interface for native APIs (Electron/Tauri)
declare global {
  interface Window {
    electronAPI?: {
      testPrint: () => Promise<void>;
      printReceipt: (text: string) => Promise<void>;
    };
  }
}

/**
 * Check if we're running inside Capacitor native app
 */
export function isCapacitorNative(): boolean {
  return Capacitor.isNativePlatform();
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
      message: "L'impression locale nécessite le client de caisse installé sur PC ou l'app mobile.",
    };
  }

  async printReceipt(_text: string): Promise<PrintResult> {
    return {
      success: false,
      message: "L'impression locale n'est pas disponible sur ce terminal.",
    };
  }

  async printReceiptWithImages(_text: string, _logoBase64?: string, _qrCodeData?: string): Promise<PrintResult> {
    return {
      success: false,
      message: "L'impression locale n'est pas disponible sur ce terminal.",
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

  async printReceiptWithImages(text: string, _logoBase64?: string, _qrCodeData?: string): Promise<PrintResult> {
    // Desktop mode uses the basic text printing for now
    // The desktop client (Electron) would need to implement image support separately
    return this.printReceipt(text);
  }
}

/**
 * Capacitor Bluetooth LE client implementation
 * Uses @capacitor-community/bluetooth-le for iOS/Android
 */
class CapacitorBlePrintClient implements PrintClient {
  private initialized = false;

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      try {
        await BlePrinter.initializeBle();
        this.initialized = true;
      } catch (error) {
        console.error('[CapacitorBlePrintClient] BLE init error:', error);
      }
    }
  }

  isAvailable(): boolean {
    return true;
  }

  async testConnection(): Promise<PrintResult> {
    try {
      await this.ensureInitialized();
      const { connected, deviceName } = BlePrinter.isConnected();
      if (connected) {
        return {
          success: true,
          message: `Connecté à ${deviceName || 'imprimante'}`,
        };
      }
      return {
        success: false,
        message: "Aucune imprimante connectée. Veuillez en sélectionner une.",
      };
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        message: `Erreur: ${err.message}`,
      };
    }
  }

  async printReceipt(text: string): Promise<PrintResult> {
    try {
      await this.ensureInitialized();
      
      const { connected } = BlePrinter.isConnected();
      if (!connected) {
        return {
          success: false,
          message: "Aucune imprimante connectée. Connectez-vous d'abord via les paramètres.",
        };
      }

      console.log('[CapacitorBlePrintClient] Building ESC/POS receipt...');
      const escposData = buildReceipt(text);
      
      console.log('[CapacitorBlePrintClient] Sending to printer...');
      return await BlePrinter.printRaw(escposData);
    } catch (error) {
      const err = error as Error;
      console.error('[CapacitorBlePrintClient] Print error:', err);
      return {
        success: false,
        message: `Erreur d'impression: ${err.message}`,
      };
    }
  }

  async printReceiptWithImages(text: string, logoBase64?: string, qrCodeData?: string): Promise<PrintResult> {
    try {
      await this.ensureInitialized();
      
      const { connected } = BlePrinter.isConnected();
      if (!connected) {
        return {
          success: false,
          message: "Aucune imprimante connectée. Connectez-vous d'abord via les paramètres.",
        };
      }

      console.log('[CapacitorBlePrintClient] Building ESC/POS receipt with images...');
      const escposData = await buildReceiptWithImages(text, logoBase64, qrCodeData);
      
      console.log('[CapacitorBlePrintClient] Sending to printer...');
      return await BlePrinter.printRaw(escposData);
    } catch (error) {
      const err = error as Error;
      console.error('[CapacitorBlePrintClient] Print error:', err);
      return {
        success: false,
        message: `Erreur d'impression: ${err.message}`,
      };
    }
  }

  async scanForPrinters(): Promise<{ deviceId: string; name: string } | null> {
    try {
      await this.ensureInitialized();
      const device = await BlePrinter.scanForPrinters();
      if (device) {
        return { deviceId: device.deviceId, name: device.name || 'Imprimante' };
      }
      return null;
    } catch (error) {
      console.error('[CapacitorBlePrintClient] Scan error:', error);
      return null;
    }
  }

  async getBondedDevices(): Promise<{ deviceId: string; name: string }[]> {
    try {
      await this.ensureInitialized();
      const devices = await BlePrinter.getBondedDevices();
      return devices.map(d => ({ deviceId: d.deviceId, name: d.name || 'Appareil' }));
    } catch (error) {
      console.error('[CapacitorBlePrintClient] Error getting bonded devices:', error);
      return [];
    }
  }

  async connectToPrinter(deviceId: string, name?: string): Promise<PrintResult> {
    try {
      await this.ensureInitialized();
      return await BlePrinter.connectToPrinter({ deviceId, name });
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        message: `Erreur de connexion: ${err.message}`,
      };
    }
  }

  async disconnectPrinter(): Promise<PrintResult> {
    try {
      return await BlePrinter.disconnectPrinter();
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        message: `Erreur: ${err.message}`,
      };
    }
  }

  isConnectedToPrinter(): { connected: boolean; deviceName?: string } {
    return BlePrinter.isConnected();
  }
}

// Singleton instance
let printClientInstance: PrintClient | null = null;

/**
 * Get the appropriate print client based on runtime environment
 * 
 * Detection logic:
 * - If window.electronAPI exists → Desktop mode (Electron/Tauri)
 * - If Capacitor native platform → Bluetooth LE printer mode
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
  // Check for Capacitor native platform
  else if (isCapacitorNative()) {
    console.log('[PrintClient] Capacitor native mode detected - using Bluetooth LE printer');
    printClientInstance = new CapacitorBlePrintClient();
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
 * Check if we're running in any native mode (desktop or Capacitor)
 */
export function isNativeMode(): boolean {
  return isDesktopMode() || isCapacitorNative();
}

/**
 * Reset the client instance (useful for testing or hot reload)
 */
export function resetPrintClient(): void {
  printClientInstance = null;
}
