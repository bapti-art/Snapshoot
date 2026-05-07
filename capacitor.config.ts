import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.snapshoot.app',
  appName: 'Snapshoot',
  webDir: 'dist',
  server: {
    cleartext: true,
  },
};

export default config;
