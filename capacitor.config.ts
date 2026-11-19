import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.caldun.aegis',
  appName: 'Aegis School OS',
  webDir: 'out',
  server: {
    url: 'https://school-management-saas-gamma.vercel.app',
    cleartext: false,
    allowNavigation: [
      'school-management-saas-gamma.vercel.app',
      '*.vercel.app',
      '*.supabase.co',
    ],
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0F172A',
    },
  },
};

export default config;
