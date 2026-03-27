import { BleClient } from '@capacitor-community/bluetooth-le';

export const testBluetooth = async () => {
  try {
    await BleClient.initialize();
    console.log('✅ BLE OK');
    
    const devices = [];
    const scan = BleClient.requestLEScan(
      { services: [], allowDuplicates: false },
      (result) => {
        if (result.device.name) {
          devices.push(result.device.name);
          console.log('🖨️', result.device.name);
        }
      }
    );
    
    setTimeout(() => {
      scan();
      console.log('Imprimantes:', devices);
    }, 8000);
    
  } catch (e) {
    console.log('❌ Bluetooth erreur:', e);
  }
};
