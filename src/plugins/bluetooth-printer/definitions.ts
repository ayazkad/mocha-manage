/**
 * Bluetooth ESC/POS Printer Plugin Definitions
 */

export interface BluetoothDevice {
  name: string;
  address: string;
  paired: boolean;
}

export interface PrintResult {
  success: boolean;
  message: string;
}

export interface BluetoothPrinterPlugin {
  /**
   * Check if Bluetooth is available and enabled
   */
  isAvailable(): Promise<{ available: boolean }>;

  /**
   * Request Bluetooth permissions (Android 12+)
   */
  requestPermissions(): Promise<{ granted: boolean }>;

  /**
   * Get list of paired Bluetooth devices
   */
  getPairedDevices(): Promise<{ devices: BluetoothDevice[] }>;

  /**
   * Connect to a Bluetooth printer by address
   */
  connect(options: { address: string }): Promise<PrintResult>;

  /**
   * Disconnect from the current printer
   */
  disconnect(): Promise<PrintResult>;

  /**
   * Check if currently connected to a printer
   */
  isConnected(): Promise<{ connected: boolean; deviceName?: string }>;

  /**
   * Print raw text (will be converted to ESC/POS commands)
   */
  printText(options: { text: string }): Promise<PrintResult>;

  /**
   * Print raw ESC/POS bytes
   */
  printRaw(options: { data: number[] }): Promise<PrintResult>;

  /**
   * Feed paper (advance paper)
   */
  feedPaper(options: { lines: number }): Promise<PrintResult>;

  /**
   * Cut paper (if printer supports it)
   */
  cutPaper(): Promise<PrintResult>;
}
