/**
 * Bluetooth LE Printer Service
 * 
 * Uses @capacitor-community/bluetooth-le for iOS/Android ESC/POS printing.
 * Replaces the custom BluetoothPrinter plugin with the official community plugin.
 */

import { BleClient, BleDevice, numbersToDataView } from '@capacitor-community/bluetooth-le';
import { Capacitor } from '@capacitor/core';

// Common ESC/POS printer service UUIDs
// Most thermal printers use these standard UUIDs
const PRINTER_SERVICE_UUIDS = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Common ESC/POS service
  '0000ff00-0000-1000-8000-00805f9b34fb', // Alternative service
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC Transparent UART
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Nordic UART
];

// Common characteristic UUIDs for writing
const WRITE_CHARACTERISTIC_UUIDS = [
  '00002af1-0000-1000-8000-00805f9b34fb', // Common write characteristic
  '0000ff02-0000-1000-8000-00805f9b34fb', // Alternative write
  '49535343-8841-43f4-a8d4-ecbe34729bb3', // ISSC write
  '6e400002-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART TX
];

export interface BleDeviceInfo {
  deviceId: string;
  name: string;
  serviceUuid?: string;
  characteristicUuid?: string;
}

export interface PrintResult {
  success: boolean;
  message: string;
}

// Store connected device info
let connectedDevice: BleDeviceInfo | null = null;
let isInitialized = false;

/**
 * Check if Bluetooth LE is available
 */
export async function isBleAvailable(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }
  
  try {
    await initializeBle();
    const result = await BleClient.isEnabled();
    return result.value;
  } catch (error) {
    console.error('[BLEPrinter] Error checking availability:', error);
    return false;
  }
}

/**
 * Initialize BLE - must be called before other operations
 */
export async function initializeBle(): Promise<void> {
  if (isInitialized) return;
  
  try {
    await BleClient.initialize();
    isInitialized = true;
    console.log('[BLEPrinter] BLE initialized');
  } catch (error) {
    console.error('[BLEPrinter] Failed to initialize BLE:', error);
    throw error;
  }
}

/**
 * Request Bluetooth to be enabled (Android only)
 */
export async function requestBluetoothEnable(): Promise<boolean> {
  try {
    await initializeBle();
    await BleClient.requestEnable();
    return true;
  } catch (error) {
    console.log('[BLEPrinter] Bluetooth enable request failed or denied');
    return false;
  }
}

/**
 * Scan for available printers
 * Shows native device picker dialog
 */
export async function scanForPrinters(): Promise<BleDevice | null> {
  try {
    await initializeBle();
    
    // Check if Bluetooth is enabled
    const enabledResult = await BleClient.isEnabled();
    if (!enabledResult.value) {
      await requestBluetoothEnable();
    }
    
    console.log('[BLEPrinter] Requesting device...');
    
    // Request device - shows native picker on iOS/Android
    const device = await BleClient.requestDevice({
      // Accept all devices since ESC/POS printers don't always advertise standard services
      services: [],
      optionalServices: PRINTER_SERVICE_UUIDS,
      namePrefix: '', // Accept any name
    });
    
    console.log('[BLEPrinter] Device selected:', device);
    return device;
  } catch (error) {
    console.error('[BLEPrinter] Error scanning for printers:', error);
    return null;
  }
}

/**
 * Get bonded (paired) devices - Android only
 */
export async function getBondedDevices(): Promise<BleDevice[]> {
  try {
    await initializeBle();
    const result = await BleClient.getBondedDevices();
    console.log('[BLEPrinter] Bonded devices:', result.devices);
    return result.devices || [];
  } catch (error) {
    console.error('[BLEPrinter] Error getting bonded devices:', error);
    return [];
  }
}

/**
 * Connect to a printer device
 */
export async function connectToPrinter(device: BleDevice): Promise<PrintResult> {
  try {
    await initializeBle();
    
    console.log('[BLEPrinter] Connecting to:', device.deviceId);
    
    // Connect with timeout
    await BleClient.connect(device.deviceId, (deviceId) => {
      console.log('[BLEPrinter] Device disconnected:', deviceId);
      if (connectedDevice?.deviceId === deviceId) {
        connectedDevice = null;
      }
    }, { timeout: 10000 });
    
    console.log('[BLEPrinter] Connected, discovering services...');
    
    // Discover services and find the write characteristic
    const servicesResult = await BleClient.getServices(device.deviceId);
    console.log('[BLEPrinter] Services discovered:', servicesResult);
    
    let foundService: string | undefined;
    let foundCharacteristic: string | undefined;
    
    // Look for a writable characteristic
    for (const service of servicesResult.services) {
      for (const char of service.characteristics) {
        if (char.properties.write || char.properties.writeWithoutResponse) {
          // Prefer known printer characteristics
          if (WRITE_CHARACTERISTIC_UUIDS.some(uuid => 
            char.uuid.toLowerCase().includes(uuid.replace(/-/g, '').toLowerCase().substring(0, 8))
          )) {
            foundService = service.uuid;
            foundCharacteristic = char.uuid;
            break;
          }
          // Use first writable characteristic as fallback
          if (!foundCharacteristic) {
            foundService = service.uuid;
            foundCharacteristic = char.uuid;
          }
        }
      }
      if (foundCharacteristic) break;
    }
    
    if (!foundService || !foundCharacteristic) {
      await BleClient.disconnect(device.deviceId);
      return {
        success: false,
        message: "Aucune caractéristique d'écriture trouvée sur cet appareil.",
      };
    }
    
    connectedDevice = {
      deviceId: device.deviceId,
      name: device.name || 'Imprimante',
      serviceUuid: foundService,
      characteristicUuid: foundCharacteristic,
    };
    
    console.log('[BLEPrinter] Connected to printer:', connectedDevice);
    
    return {
      success: true,
      message: `Connecté à ${device.name || 'imprimante'}`,
    };
  } catch (error) {
    console.error('[BLEPrinter] Connection error:', error);
    const err = error as Error;
    return {
      success: false,
      message: `Erreur de connexion: ${err.message}`,
    };
  }
}

/**
 * Disconnect from current printer
 */
export async function disconnectPrinter(): Promise<PrintResult> {
  if (!connectedDevice) {
    return { success: true, message: 'Aucune imprimante connectée.' };
  }
  
  try {
    await BleClient.disconnect(connectedDevice.deviceId);
    connectedDevice = null;
    return { success: true, message: 'Déconnecté.' };
  } catch (error) {
    console.error('[BLEPrinter] Disconnect error:', error);
    connectedDevice = null;
    return { success: true, message: 'Déconnecté.' };
  }
}

/**
 * Check if connected to a printer
 */
export function isConnected(): { connected: boolean; deviceName?: string } {
  return {
    connected: connectedDevice !== null,
    deviceName: connectedDevice?.name,
  };
}

/**
 * Get connected device info
 */
export function getConnectedDevice(): BleDeviceInfo | null {
  return connectedDevice;
}

/**
 * Send raw bytes to the printer
 * Splits data into chunks if needed (BLE has MTU limits)
 */
export async function printRaw(data: number[]): Promise<PrintResult> {
  if (!connectedDevice) {
    return {
      success: false,
      message: "Aucune imprimante connectée.",
    };
  }
  
  try {
    const { serviceUuid, characteristicUuid, deviceId } = connectedDevice;
    
    if (!serviceUuid || !characteristicUuid) {
      return {
        success: false,
        message: "Configuration de l'imprimante incomplète.",
      };
    }
    
    console.log(`[BLEPrinter] Sending ${data.length} bytes to printer...`);
    
    // Get MTU for chunking (default to 20 if not available)
    let mtu = 20;
    try {
      const mtuResult = await BleClient.getMtu(deviceId);
      mtu = Math.min(mtuResult.value - 3, 512); // Leave room for BLE overhead
    } catch {
      // Some devices don't support getMtu
    }
    
    // Split data into chunks
    const chunkSize = Math.max(20, mtu);
    const chunks: number[][] = [];
    for (let i = 0; i < data.length; i += chunkSize) {
      chunks.push(data.slice(i, i + chunkSize));
    }
    
    console.log(`[BLEPrinter] Sending ${chunks.length} chunks (MTU: ${mtu})`);
    
    // Send each chunk with writeWithoutResponse for speed
    for (let i = 0; i < chunks.length; i++) {
      const dataView = numbersToDataView(chunks[i]);
      
      try {
        await BleClient.writeWithoutResponse(deviceId, serviceUuid, characteristicUuid, dataView);
      } catch {
        // Fallback to regular write if writeWithoutResponse fails
        await BleClient.write(deviceId, serviceUuid, characteristicUuid, dataView);
      }
      
      // Small delay between chunks to prevent buffer overflow
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 20));
      }
    }
    
    console.log('[BLEPrinter] Print complete');
    
    return {
      success: true,
      message: 'Impression envoyée.',
    };
  } catch (error) {
    console.error('[BLEPrinter] Print error:', error);
    const err = error as Error;
    
    // Check if device disconnected
    if (err.message?.includes('disconnect') || err.message?.includes('not connected')) {
      connectedDevice = null;
    }
    
    return {
      success: false,
      message: `Erreur d'impression: ${err.message}`,
    };
  }
}

/**
 * Print text (converts to ESC/POS commands internally)
 */
export async function printText(text: string): Promise<PrintResult> {
  // Import ESC/POS builder
  const { buildReceipt } = await import('@/plugins/bluetooth-printer/escpos');
  const data = buildReceipt(text);
  return printRaw(data);
}

/**
 * Send test print
 */
export async function testPrint(): Promise<PrintResult> {
  return printText('\n\n*** TEST IMPRESSION ***\n\nLattePOS Bluetooth LE\nImpression réussie!\n\n\n');
}
