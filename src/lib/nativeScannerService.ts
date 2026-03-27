import { Capacitor } from '@capacitor/core';
import {
  CapacitorBarcodeScanner,
  CapacitorBarcodeScannerTypeHintALLOption
} from '@capacitor/barcode-scanner';

export interface ScanResult {
  success: boolean;
  content?: string;
  format?: string;
  error?: string;
}

class NativeScannerService {
  private isNative = Capacitor.isNativePlatform();

  async checkPermission(): Promise<boolean> {
    // This plugin handles permissions internally or doesn't expose them in the same way
    return true;
  }

  async startScan(): Promise<ScanResult> {
    if (!this.isNative) {
      return { success: false, error: 'Scanner natif non disponible sur le web' };
    }

    try {
      const result = await CapacitorBarcodeScanner.scanBarcode({
        hint: CapacitorBarcodeScannerTypeHintALLOption.ALL,
        scanInstructions: 'Placez le code dans le cadre',
        scanButton: true,
      });

      if (result && result.ScanResult) {
        return {
          success: true,
          content: result.ScanResult,
          format: String(result.format || '')
        };
      }

      return { success: false, error: 'Aucun code détecté' };
    } catch (error: any) {
      console.error('[NativeScannerService] Scan error:', error);
      // If user cancelled, don't show as error
      if (error?.message?.includes('cancelled')) {
        return { success: false };
      }
      return { success: false, error: error?.message || 'Erreur de scan' };
    }
  }

  async stopScan(): Promise<void> {
    // handled by the plugin's scanBarcode promise completion
  }

  isNativePlatform(): boolean {
    return this.isNative;
  }
}

export const nativeScannerService = new NativeScannerService();
