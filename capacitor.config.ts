
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'idbevakarna.idbevakarna',
  appName: 'ID-Bevakarna',
  webDir: 'dist',
  bundledWebRuntime: false,
  // server: {
  //   url: 'https://03583b72-47c2-4afa-b1ad-aa0916f6dfda.lovableproject.com?forceHideBadge=true',
  //   cleartext: true
  // },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#dc2626",
      showSpinner: false
    },
    BluetoothLe: {
      displayStrings: {
        scanning: "Söker efter enheter...",
        cancel: "Avbryt",
        availableDevices: "Tillgängliga enheter",
        noDeviceFound: "Inga enheter hittades"
      }
    }
  }
};

export default config;
