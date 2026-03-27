import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.latte.mocha',
  appName: 'Latte',
  webDir: 'dist',
  ios: {
    useSpm: true,
    contentInset: 'automatic',
    scrollEnabled: false, // Disable native WKWebView scroll — scrolling is handled via CSS overflow
    backgroundColor: '#ffffff' // Light background color to match app theme
  },
  plugins: {
    StatusBar: {
      style: 'light', // Dark text for light background
      backgroundColor: '#ffffff'
    },
    Keyboard: {
      resize: 'native', // Let iOS natively shrink the viewport — triggers visualViewport resize event
      style: 'light',
      resizeOnFullScreen: true,
      accessoryBarVisible: false,
    }
  }
};

export default config;
