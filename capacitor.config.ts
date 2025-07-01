
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.03583b7247c24afab1adaa0916f6dfda',
  appName: 'heimdall-alert-mobile',
  webDir: 'dist',
  server: {
    url: 'https://03583b72-47c2-4afa-b1ad-aa0916f6dfda.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    }
  }
};

export default config;
