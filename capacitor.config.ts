import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.latte.pos',
  appName: 'LattePOS',
  webDir: 'dist',
  server: {
    // Enables hot-reload / remote web app loading inside the native shell
    url: 'https://09f0d9a8-18c1-4b46-9de1-b12f3cc2e32f.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
};

export default config;
