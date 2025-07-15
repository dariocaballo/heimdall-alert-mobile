
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

      // Använd den korrekta Shelly Plus API för WiFi-konfiguration
      const wifiConfigResponse = await fetch(`http://${shellyIP}/rpc/WiFi.SetConfig`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: 1,
          config: {
            sta: {
              ssid: homeWifiSSID,
              pass: homeWifiPassword,
              enable: true
            }
          }
        })
      });

      if (!wifiConfigResponse.ok) {
        throw new Error(`WiFi-konfiguration misslyckades: ${wifiConfigResponse.status}`);
      }

      const wifiResult = await wifiConfigResponse.json();
      console.log('WiFi config result:', wifiResult);

      setConfigurationProgress(50);

      // Steg 2: Konfigurera larm-webhook för Shelly Plus Smoke
      setConfigurationStep("Konfigurerar larmfunktion...");
      
      // Använd Shelly Plus API för att konfigurera webhook
      const webhookConfigResponse = await fetch(`http://${shellyIP}/rpc/Webhook.SetConfig`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: 1,
          config: {
            name: "smoke_alarm_webhook",
            enable: true,
            event: "smoke.on",
            urls: ["https://owgkhkxsaeizgwxebarh.supabase.co/functions/v1/shelly_webhook"],
            ssl_ca: "*",
            active_between: []
          }
        })
      });

      if (!webhookConfigResponse.ok) {
        throw new Error(`Webhook-konfiguration misslyckades: ${webhookConfigResponse.status}`);
      }

      const webhookResult = await webhookConfigResponse.json();
      console.log('Webhook config result:', webhookResult);

      setConfigurationProgress(75);

      // Steg 3: Återstarta enheten för att tillämpa inställningarna
      setConfigurationStep("Startar om enheten...");
      
      try {
        await fetch(`http://${shellyIP}/rpc/Shelly.Reboot`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id: 1 })
        });
      } catch (error) {
        console.log('Reboot command sent, connection will be lost as expected');
      }

      setConfigurationProgress(90);

      // Steg 4: Spara konfiguration lokalt
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
