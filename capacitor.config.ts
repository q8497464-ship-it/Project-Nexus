import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.couple.truthdare',
  appName: 'Couples Truth and Dare',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
