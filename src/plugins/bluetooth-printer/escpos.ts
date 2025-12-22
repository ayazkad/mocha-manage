/**
 * ESC/POS Command Builder
 * 
 * Utility to build ESC/POS commands for thermal printers
 * Supports text, images (bitmap), and QR codes
 */

// ESC/POS Commands
export const ESC = 0x1B;
export const GS = 0x1D;
export const LF = 0x0A;
export const CR = 0x0D;

export const ESCPOS = {
  // Initialize printer
  INIT: [ESC, 0x40],
  
  // Text alignment
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_RIGHT: [ESC, 0x61, 0x02],
  
  // Text style
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  UNDERLINE_ON: [ESC, 0x2D, 0x01],
  UNDERLINE_OFF: [ESC, 0x2D, 0x00],
  DOUBLE_HEIGHT_ON: [ESC, 0x21, 0x10],
  DOUBLE_WIDTH_ON: [ESC, 0x21, 0x20],
  DOUBLE_SIZE_ON: [ESC, 0x21, 0x30],
  NORMAL_SIZE: [ESC, 0x21, 0x00],
  
  // Paper feed
  FEED_LINE: [LF],
  FEED_LINES: (n: number) => [ESC, 0x64, n],
  
  // Cut paper
  CUT_PARTIAL: [GS, 0x56, 0x01],
  CUT_FULL: [GS, 0x56, 0x00],
  
  // Beep (if supported)
  BEEP: [ESC, 0x42, 0x02, 0x02],

  // QR Code commands (GS ( k)
  QR_MODEL: [GS, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00], // Model 2
  QR_SIZE: (size: number) => [GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, size], // Size 1-16
  QR_ERROR: [GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x31], // Error correction L
  QR_STORE: (data: string) => {
    const bytes = new TextEncoder().encode(data);
    const len = bytes.length + 3;
    const pL = len % 256;
    const pH = Math.floor(len / 256);
    return [GS, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30, ...Array.from(bytes)];
  },
  QR_PRINT: [GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30],
};

/**
 * Convert text to bytes with proper encoding
 */
export function textToBytes(text: string): number[] {
  const encoder = new TextEncoder();
  return Array.from(encoder.encode(text));
}

/**
 * Build QR code ESC/POS commands
 */
export function buildQRCode(data: string, size: number = 6): number[] {
  const commands: number[] = [];
  
  // Center the QR code
  commands.push(...ESCPOS.ALIGN_CENTER);
  
  // Set QR code model
  commands.push(...ESCPOS.QR_MODEL);
  
  // Set QR code size (1-16, 6 is a good default)
  commands.push(...ESCPOS.QR_SIZE(size));
  
  // Set error correction level
  commands.push(...ESCPOS.QR_ERROR);
  
  // Store QR code data
  commands.push(...ESCPOS.QR_STORE(data));
  
  // Print QR code
  commands.push(...ESCPOS.QR_PRINT);
  
  // Add line feed after QR
  commands.push(...ESCPOS.FEED_LINE);
  
  return commands;
}

/**
 * Convert base64 image to ESC/POS bitmap commands
 * This creates a monochrome bitmap suitable for thermal printers
 */
export async function imageToBitmap(
  base64Image: string,
  maxWidth: number = 384 // 48mm * 8 dots/mm for 80mm paper
): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        // Calculate dimensions (maintain aspect ratio)
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = Math.floor(height * (maxWidth / width));
          width = maxWidth;
        }
        
        // Width must be multiple of 8 for byte alignment
        width = Math.floor(width / 8) * 8;
        if (width === 0) width = 8;
        
        // Create canvas and draw image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        
        // White background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        
        // Draw image centered
        ctx.drawImage(img, 0, 0, width, height);
        
        // Get pixel data
        const imageData = ctx.getImageData(0, 0, width, height);
        const pixels = imageData.data;
        
        // Convert to monochrome bitmap (1 bit per pixel)
        const bytesPerRow = width / 8;
        const bitmapData: number[] = [];
        
        for (let y = 0; y < height; y++) {
          for (let byteX = 0; byteX < bytesPerRow; byteX++) {
            let byte = 0;
            for (let bit = 0; bit < 8; bit++) {
              const x = byteX * 8 + bit;
              const idx = (y * width + x) * 4;
              
              // Calculate grayscale value
              const r = pixels[idx];
              const g = pixels[idx + 1];
              const b = pixels[idx + 2];
              const a = pixels[idx + 3];
              
              // Apply alpha (assume white background)
              const gray = (r * 0.299 + g * 0.587 + b * 0.114) * (a / 255) + 255 * (1 - a / 255);
              
              // Threshold: if dark, set bit (black = 1)
              if (gray < 128) {
                byte |= (0x80 >> bit);
              }
            }
            bitmapData.push(byte);
          }
        }
        
        // Build ESC/POS bitmap command
        // Using GS v 0 (raster bit image)
        const commands: number[] = [];
        
        // GS v 0 m xL xH yL yH d1...dk
        // m = 0 (normal mode)
        const xL = bytesPerRow % 256;
        const xH = Math.floor(bytesPerRow / 256);
        const yL = height % 256;
        const yH = Math.floor(height / 256);
        
        commands.push(GS, 0x76, 0x30, 0x00, xL, xH, yL, yH);
        commands.push(...bitmapData);
        
        resolve(commands);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = base64Image;
  });
}

/**
 * Build a complete receipt with ESC/POS commands
 */
export function buildReceipt(text: string): number[] {
  const commands: number[] = [];
  
  // Initialize printer
  commands.push(...ESCPOS.INIT);
  
  // Set normal size and left alignment
  commands.push(...ESCPOS.NORMAL_SIZE);
  commands.push(...ESCPOS.ALIGN_LEFT);
  
  // Add the text content
  commands.push(...textToBytes(text));
  
  // Feed paper
  commands.push(...ESCPOS.FEED_LINES(4));
  
  // Cut paper (partial)
  commands.push(...ESCPOS.CUT_PARTIAL);
  
  return commands;
}

/**
 * Build receipt with logo and QR code
 */
export async function buildReceiptWithImages(
  text: string,
  logoBase64?: string,
  qrCodeData?: string
): Promise<number[]> {
  const commands: number[] = [];
  
  // Initialize printer
  commands.push(...ESCPOS.INIT);
  
  // Print logo if provided
  if (logoBase64) {
    try {
      commands.push(...ESCPOS.ALIGN_CENTER);
      const logoCommands = await imageToBitmap(logoBase64, 200);
      commands.push(...logoCommands);
      commands.push(...ESCPOS.FEED_LINE);
    } catch (err) {
      console.warn('[ESC/POS] Failed to print logo:', err);
    }
  }
  
  // Set normal size and left alignment for text
  commands.push(...ESCPOS.NORMAL_SIZE);
  commands.push(...ESCPOS.ALIGN_LEFT);
  
  // Add the text content
  commands.push(...textToBytes(text));
  
  // Print QR code if provided
  if (qrCodeData) {
    commands.push(...ESCPOS.FEED_LINE);
    commands.push(...buildQRCode(qrCodeData, 6));
    commands.push(...ESCPOS.ALIGN_CENTER);
    commands.push(...textToBytes('Scan to view order\n'));
  }
  
  // Feed paper
  commands.push(...ESCPOS.FEED_LINES(4));
  
  // Cut paper (partial)
  commands.push(...ESCPOS.CUT_PARTIAL);
  
  return commands;
}

/**
 * Build formatted receipt with logo placeholder and styling
 */
export function buildFormattedReceipt(
  storeName: string,
  storeInfo: string,
  content: string
): number[] {
  const commands: number[] = [];
  
  // Initialize
  commands.push(...ESCPOS.INIT);
  
  // Store name - centered, double size
  commands.push(...ESCPOS.ALIGN_CENTER);
  commands.push(...ESCPOS.DOUBLE_SIZE_ON);
  commands.push(...textToBytes(storeName));
  commands.push(...ESCPOS.FEED_LINE);
  
  // Reset to normal
  commands.push(...ESCPOS.NORMAL_SIZE);
  
  // Store info - centered
  commands.push(...textToBytes(storeInfo));
  commands.push(...ESCPOS.FEED_LINES(2));
  
  // Content - left aligned
  commands.push(...ESCPOS.ALIGN_LEFT);
  commands.push(...textToBytes(content));
  
  // Footer
  commands.push(...ESCPOS.FEED_LINES(3));
  commands.push(...ESCPOS.CUT_PARTIAL);
  
  return commands;
}
