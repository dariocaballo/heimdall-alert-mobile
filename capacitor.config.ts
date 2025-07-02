
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.idbevakarna.app',
  appName: 'ID-Bevakarna',
  webDir: 'dist',
  server: {
    url: 'https://03583b72-47c2-4afa-b1ad-aa0916f6dfda.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#dc2626",
      showSpinner: false
    }
  }
};

export default config;
