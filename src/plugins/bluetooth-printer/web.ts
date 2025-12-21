import { WebPlugin } from '@capacitor/core';
import type { BluetoothPrinterPlugin, BluetoothDevice, PrintResult } from './definitions';

/**
 * Web implementation - returns "not available" for all methods
 * Bluetooth printing is only available on native platforms
 */
export class BluetoothPrinterWeb extends WebPlugin implements BluetoothPrinterPlugin {
  async isAvailable(): Promise<{ available: boolean }> {
    console.log('[BluetoothPrinter] Web platform - Bluetooth not available');
    return { available: false };
  }

  async requestPermissions(): Promise<{ granted: boolean }> {
    console.log('[BluetoothPrinter] Web platform - permissions not applicable');
    return { granted: false };
  }

  async getPairedDevices(): Promise<{ devices: BluetoothDevice[] }> {
    console.log('[BluetoothPrinter] Web platform - no paired devices');
    return { devices: [] };
  }

  async connect(_options: { address: string }): Promise<PrintResult> {
    return {
      success: false,
      message: "L'impression Bluetooth n'est pas disponible en mode web.",
    };
  }

  async disconnect(): Promise<PrintResult> {
    return {
      success: false,
      message: "Pas de connexion active.",
    };
  }

  async isConnected(): Promise<{ connected: boolean; deviceName?: string }> {
    return { connected: false };
  }

  async printText(_options: { text: string }): Promise<PrintResult> {
    return {
      success: false,
      message: "L'impression Bluetooth n'est pas disponible en mode web.",
    };
  }

  async printRaw(_options: { data: number[] }): Promise<PrintResult> {
    return {
      success: false,
      message: "L'impression Bluetooth n'est pas disponible en mode web.",
    };
  }

  async feedPaper(_options: { lines: number }): Promise<PrintResult> {
    return {
      success: false,
      message: "L'impression Bluetooth n'est pas disponible en mode web.",
    };
  }

  async cutPaper(): Promise<PrintResult> {
    return {
      success: false,
      message: "L'impression Bluetooth n'est pas disponible en mode web.",
    };
  }
}
