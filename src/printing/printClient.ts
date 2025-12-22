/**
 * Print Client Abstraction Layer
 * 
 * This module provides a unified interface for printing that works across:
 * - Web (hosted version): shows "not available" messages
 * - Desktop (Electron/Tauri .exe): uses native printing via window.electronAPI
 * - Capacitor (Android/iOS): uses Bluetooth Printer plugin
 * 
 * The desktop client will inject `window.electronAPI` via its preload script,
 * enabling local ESC/POS printing without changing React code.
 */

import { Capacitor } from '@capacitor/core';
import { BluetoothPrinter } from '@/plugins/bluetooth-printer';
import { buildReceipt, buildReceiptWithImages } from '@/plugins/bluetooth-printer/escpos';

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
   * Get paired Bluetooth devices (for Capacitor mode)
   */
  getPairedDevices?(): Promise<{ name: string; address: string }[]>;

  /**
   * Connect to a Bluetooth printer (for Capacitor mode)
   */
  connectToPrinter?(address: string): Promise<PrintResult>;
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
 * Capacitor Bluetooth client implementation - uses BluetoothPrinter plugin
 */
class CapacitorBluetoothPrintClient implements PrintClient {
  isAvailable(): boolean {
    return true;
  }

  async testConnection(): Promise<PrintResult> {
    try {
      const { connected, deviceName } = await BluetoothPrinter.isConnected();
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
      console.log('[CapacitorBluetoothPrintClient] Checking connection...');
      
      // Check if connected
      const { connected } = await BluetoothPrinter.isConnected();
      if (!connected) {
        return {
          success: false,
          message: "Aucune imprimante connectée. Connectez-vous d'abord via les paramètres.",
        };
      }

      console.log('[CapacitorBluetoothPrintClient] Building ESC/POS receipt...');
      const escposData = buildReceipt(text);
      
      console.log('[CapacitorBluetoothPrintClient] Sending to printer...');
      const result = await BluetoothPrinter.printRaw({ data: escposData });
      
      return result;
    } catch (error) {
      const err = error as Error;
      console.error('[CapacitorBluetoothPrintClient] Print error:', err);
      return {
        success: false,
        message: `Erreur d'impression: ${err.message}`,
      };
    }
  }

  async printReceiptWithImages(text: string, logoBase64?: string, qrCodeData?: string): Promise<PrintResult> {
    try {
      console.log('[CapacitorBluetoothPrintClient] Checking connection...');
      
      // Check if connected
      const { connected } = await BluetoothPrinter.isConnected();
      if (!connected) {
        return {
          success: false,
          message: "Aucune imprimante connectée. Connectez-vous d'abord via les paramètres.",
        };
      }

      console.log('[CapacitorBluetoothPrintClient] Building ESC/POS receipt with images...');
      const escposData = await buildReceiptWithImages(text, logoBase64, qrCodeData);
      
      console.log('[CapacitorBluetoothPrintClient] Sending to printer...');
      const result = await BluetoothPrinter.printRaw({ data: escposData });
      
      return result;
    } catch (error) {
      const err = error as Error;
      console.error('[CapacitorBluetoothPrintClient] Print error:', err);
      return {
        success: false,
        message: `Erreur d'impression: ${err.message}`,
      };
    }
  }

  async getPairedDevices(): Promise<{ name: string; address: string }[]> {
    try {
      // Request permissions first
      const { granted } = await BluetoothPrinter.requestPermissions();
      if (!granted) {
        console.warn('[CapacitorBluetoothPrintClient] Bluetooth permissions not granted');
        return [];
      }

      const { devices } = await BluetoothPrinter.getPairedDevices();
      return devices.map(d => ({ name: d.name, address: d.address }));
    } catch (error) {
      console.error('[CapacitorBluetoothPrintClient] Error getting devices:', error);
      return [];
    }
  }

  async connectToPrinter(address: string): Promise<PrintResult> {
    try {
      return await BluetoothPrinter.connect({ address });
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        message: `Erreur de connexion: ${err.message}`,
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
 * - If Capacitor native platform → Bluetooth printer mode
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
    console.log('[PrintClient] Capacitor native mode detected - using Bluetooth printer');
    printClientInstance = new CapacitorBluetoothPrintClient();
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
