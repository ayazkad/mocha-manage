import { Capacitor } from '@capacitor/core';
import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning';

export interface ScanResult {
  success: boolean;
  content?: string;
  format?: string;
  error?: string;
}

class NativeScannerService {
  private isNative = Capacitor.isNativePlatform();

  async checkPermission(): Promise<boolean> {
    if (!this.isNative) return true;

    try {
      const { camera } = await BarcodeScanner.checkPermissions();

      if (camera === 'granted') return true;

      if (camera === 'denied') {
        const shouldOpenSettings = confirm(
          "Pour utiliser le scanner, veuillez autoriser l'accès à la caméra dans les paramètres."
        );
        if (shouldOpenSettings) {
          await BarcodeScanner.openSettings();
        }
        return false;
      }

      const { camera: requested } = await BarcodeScanner.requestPermissions();
      return requested === 'granted';
    } catch (error) {
      console.error('[NativeScannerService] Permission error:', error);
      return false;
    }
  }

  async startScan(): Promise<ScanResult> {
    if (!this.isNative) {
      return { success: false, error: 'Scanner natif non disponible sur le web' };
    }

    try {
      const hasPermission = await this.checkPermission();
      if (!hasPermission) {
        return { success: false, error: 'Permission caméra refusée' };
      }

      const { barcodes } = await BarcodeScanner.scan({
        formats: [
          BarcodeFormat.QrCode,
          BarcodeFormat.Ean13,
          BarcodeFormat.Ean8,
          BarcodeFormat.Code128,
          BarcodeFormat.Code39,
          BarcodeFormat.UpcA,
          BarcodeFormat.UpcE,
        ],
      });

      const first = barcodes?.[0] as any;
      const content: string | undefined = first?.rawValue ?? first?.displayValue;

      if (content) {
        return { success: true, content, format: String(first?.format ?? '') };
      }

      return { success: false, error: 'Aucun code détecté' };
    } catch (error: any) {
      console.error('[NativeScannerService] Scan error:', error);
      return { success: false, error: error?.message || 'Erreur de scan' };
    }
  }

  async stopScan(): Promise<void> {
    if (!this.isNative) return;

    try {
      // scan() stops automatically, but keep this safe for cancellation paths
      await BarcodeScanner.removeAllListeners();
      await BarcodeScanner.stopScan();
    } catch {
      // ignore
    }
  }

  isNativePlatform(): boolean {
    return this.isNative;
  }
}

export const nativeScannerService = new NativeScannerService();
