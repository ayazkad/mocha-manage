import { Capacitor } from '@capacitor/core';
import { BarcodeScanner, SupportedFormat } from '@capacitor-community/barcode-scanner';

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
      const status = await BarcodeScanner.checkPermission({ force: false });
      
      if (status.granted) {
        return true;
      }

      if (status.denied) {
        // User denied permanently, redirect to settings
        const shouldOpenSettings = confirm(
          'Pour utiliser le scanner, veuillez activer la caméra dans les paramètres de l\'application.'
        );
        if (shouldOpenSettings) {
          await BarcodeScanner.openAppSettings();
        }
        return false;
      }

      // Request permission
      const requestStatus = await BarcodeScanner.checkPermission({ force: true });
      return requestStatus.granted === true;
    } catch (error) {
      console.error('Error checking camera permission:', error);
      return false;
    }
  }

  async startScan(): Promise<ScanResult> {
    if (!this.isNative) {
      return { success: false, error: 'Scanner natif non disponible sur le web' };
    }

    try {
      // Check permission first
      const hasPermission = await this.checkPermission();
      if (!hasPermission) {
        return { success: false, error: 'Permission caméra refusée' };
      }

      // Make the webview transparent to show camera
      await BarcodeScanner.hideBackground();
      document.body.classList.add('scanner-active');

      // Start scanning
      const result = await BarcodeScanner.startScan({
        targetedFormats: [
          SupportedFormat.QR_CODE,
          SupportedFormat.EAN_13,
          SupportedFormat.EAN_8,
          SupportedFormat.CODE_128,
          SupportedFormat.CODE_39,
          SupportedFormat.UPC_A,
          SupportedFormat.UPC_E,
        ],
      });

      // Restore webview
      await this.stopScan();

      if (result.hasContent && result.content) {
        return {
          success: true,
          content: result.content,
          format: result.format,
        };
      }

      return { success: false, error: 'Aucun code détecté' };
    } catch (error: any) {
      await this.stopScan();
      console.error('Scan error:', error);
      return { success: false, error: error.message || 'Erreur de scan' };
    }
  }

  async stopScan(): Promise<void> {
    if (!this.isNative) return;

    try {
      await BarcodeScanner.showBackground();
      await BarcodeScanner.stopScan();
      document.body.classList.remove('scanner-active');
    } catch (error) {
      console.error('Error stopping scan:', error);
    }
  }

  isNativePlatform(): boolean {
    return this.isNative;
  }
}

export const nativeScannerService = new NativeScannerService();
