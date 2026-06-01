import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.feyteknik.app',
  appName: 'Fey Teknik',
  webDir: 'public',
  server: {
    url: 'https://v0-hr-module-dashboard.vercel.app',
    cleartext: false
  }
};

export default config;