import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jexi.app',
  appName: 'Jexi',          // ← capital J
  webDir: '../backend/public',
  server: {
    allowNavigation: ['jexi.onrender.com'],
    cleartext: false,
  },
  android: {
    mediaPlaybackRequiresUserAction: false,
  },
};

export default config;
