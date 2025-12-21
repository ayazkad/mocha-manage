/**
 * ESC/POS Command Builder
 * 
 * Utility to build ESC/POS commands for thermal printers
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
};

/**
 * Convert text to bytes with proper encoding
 */
export function textToBytes(text: string): number[] {
  const encoder = new TextEncoder();
  return Array.from(encoder.encode(text));
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
