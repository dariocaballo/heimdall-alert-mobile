
import { useState } from "react";
import { Wifi, Settings, CheckCircle, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

interface ShellyWiFiConfiguratorProps {
  shellyIP: string;
  onConfigurationComplete: () => void;
}

export const ShellyWiFiConfigurator = ({ shellyIP, onConfigurationComplete }: ShellyWiFiConfiguratorProps) => {
  const [homeWifiSSID, setHomeWifiSSID] = useState("");
  const [homeWifiPassword, setHomeWifiPassword] = useState("");
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [configurationProgress, setConfigurationProgress] = useState(0);
  const [configurationStep, setConfigurationStep] = useState<string>("");
  const [lastError, setLastError] = useState<string>("");
  const { toast } = useToast();

  const configureShellyWiFi = async () => {
    if (!homeWifiSSID.trim() || !homeWifiPassword.trim()) {
      toast({
        title: "Ofullständig information",
        description: "Vänligen ange både WiFi-namn och lösenord",
        variant: "destructive",
      });
      return;
    }

    setIsConfiguring(true);
    setConfigurationProgress(0);
    setLastError("");

    try {
      // Steg 1: Konfigurera WiFi-inställningar
      setConfigurationStep("Skickar WiFi-inställningar till brandvarnaren...");
      setConfigurationProgress(20);

      console.log(`Configuring Shelly WiFi: SSID=${homeWifiSSID}`);

      const wifiConfigResponse = await fetch(`http://${shellyIP}/settings/ap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          'wifi_ap.ssid': homeWifiSSID,
          'wifi_ap.key': homeWifiPassword,
          'wifi_ap.enable': 'true'
        })
      });

      if (!wifiConfigResponse.ok) {
        throw new Error(`WiFi-konfiguration misslyckades: ${wifiConfigResponse.status}`);
      }

      setConfigurationProgress(50);

      // Steg 2: Konfigurera larm-webhook
      setConfigurationStep("Konfigurerar larmfunktion...");
      
      const alarmConfigResponse = await fetch(`http://${shellyIP}/settings/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          'actions.smoke_detected.enabled': 'true',
          'actions.smoke_detected.urls[]': 'https://us-central1-id-bevakarna.cloudfunctions.net/sendTestAlarm',
          'actions.smoke_detected.method': 'POST',
          'actions.smoke_detected.body': JSON.stringify({
            deviceId: 'Shelly Plus Smoke',
            timestamp: '${timestamp}',
            alarm_type: 'smoke_detected'
          })
        })
      });

      if (!alarmConfigResponse.ok) {
        throw new Error(`Larm-konfiguration misslyckades: ${alarmConfigResponse.status}`);
      }

      setConfigurationProgress(80);

      // Steg 3: Spara konfiguration
      setConfigurationStep("Sparar inställningar...");
      
      localStorage.setItem('shelly_connected', 'true');
      localStorage.setItem('wifi_configured', 'true');
      localStorage.setItem('home_wifi_ssid', homeWifiSSID);
      localStorage.setItem('shelly_ip', shellyIP);

      setConfigurationProgress(100);
      setConfigurationStep("Konfiguration klar!");

      // Kort paus innan avslut
      setTimeout(() => {
        onConfigurationComplete();
        toast({
          title: "✅ Installation klar!",
          description: "Brandvarnaren är nu ansluten och konfigurerad för larm.",
        });
      }, 1000);

    } catch (error) {
      console.error('WiFi configuration error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Okänt fel uppstod';
      setLastError(errorMessage);
      
      toast({
        title: "❌ Konfiguration misslyckades",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsConfiguring(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="wifi-ssid">Ditt hem-WiFi namn (SSID)</Label>
          <Input
            id="wifi-ssid"
            type="text"
            placeholder="Mitt_WiFi_Namn"
            value={homeWifiSSID}
            onChange={(e) => setHomeWifiSSID(e.target.value)}
            disabled={isConfiguring}
          />
          <p className="text-xs text-gray-500">
            Exakt som det visas i dina WiFi-inställningar
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="wifi-password">WiFi-lösenord</Label>
          <Input
            id="wifi-password"
            type="password"
            placeholder="••••••••"
            value={homeWifiPassword}
            onChange={(e) => setHomeWifiPassword(e.target.value)}
            disabled={isConfiguring}
          />
          <p className="text-xs text-gray-500">
            Ditt hemma WiFi-lösenord
          </p>
        </div>
      </div>

      {isConfiguring && (
        <div className="space-y-3">
          <Progress value={configurationProgress} className="w-full" />
          <div className="flex items-center space-x-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            <span className="text-sm text-gray-600">{configurationStep}</span>
          </div>
        </div>
      )}

      {lastError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Konfiguration misslyckades:</strong> {lastError}
            <br />
            <br />
            <strong>Försök igen:</strong>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• Kontrollera att WiFi-namnet och lösenordet är korrekt</li>
              <li>• Se till att du fortfarande är ansluten till Shelly-nätverket</li>
              <li>• Kontrollera att ditt hem-WiFi fungerar normalt</li>
            </ul>
          </AlertDescription>
        </Alert>
      )}
      
      <Alert>
        <Settings className="h-4 w-4" />
        <AlertDescription>
          <strong>Vad händer nu:</strong>
          <br />
          Brandvarnaren kommer att ansluta sig till ditt hem-WiFi och automatiskt skicka larm till din telefon när rök upptäcks.
        </AlertDescription>
      </Alert>
      
      <Button 
        onClick={configureShellyWiFi}
        disabled={!homeWifiSSID.trim() || !homeWifiPassword.trim() || isConfiguring}
        className="w-full bg-red-600 hover:bg-red-700"
        size="lg"
      >
        {isConfiguring ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Konfigurerar...
          </>
        ) : (
          <>
            <CheckCircle className="w-4 h-4 mr-2" />
            Konfigurera brandvarnaren
          </>
        )}
      </Button>
    </div>
  );
};
