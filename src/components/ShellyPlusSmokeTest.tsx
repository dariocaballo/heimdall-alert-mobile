import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, AlertTriangle, Wifi, Battery, Thermometer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ShellyDeviceStatus {
  deviceId: string;
  online: boolean;
  smoke: boolean;
  temperature?: number;
  battery_level?: number;
  signal_strength?: number;
  last_seen: string;
}

interface ShellyPlusSmokeTestProps {
  userCode: string;
}

export const ShellyPlusSmokeTest = ({ userCode }: ShellyPlusSmokeTestProps) => {
  const [testing, setTesting] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState<ShellyDeviceStatus | null>(null);
  const [lastTest, setLastTest] = useState<string>("");
  const { toast } = useToast();

  const testConnection = async () => {
    setTesting(true);
    try {
      // Test direkt anslutning till enheten via lokalt nätverk
      const savedIP = localStorage.getItem('shelly_ip');
      if (savedIP) {
        await testDirectConnection(savedIP);
      } else {
        // Om ingen IP sparad, försök hitta enheten automatiskt
        await scanForShelly();
      }
    } catch (error) {
      console.error('Test failed:', error);
      toast({
        title: "❌ Test misslyckades",
        description: "Kunde inte ansluta till brandvarnaren",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const testDirectConnection = async (ip: string) => {
    try {
      // Test Shelly device info
      const deviceInfoResponse = await fetch(`http://${ip}/rpc/Shelly.GetDeviceInfo`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!deviceInfoResponse.ok) {
        throw new Error('Kunde inte hämta enhetsinformation');
      }

      const deviceInfo = await deviceInfoResponse.json();
      console.log('Device info:', deviceInfo);

      // Test smoke detector status
      const statusResponse = await fetch(`http://${ip}/rpc/Smoke.GetStatus`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (statusResponse.ok) {
        const smokeStatus = await statusResponse.json();
        console.log('Smoke status:', smokeStatus);
        
        setDeviceStatus({
          deviceId: deviceInfo.id || 'Unknown',
          online: true,
          smoke: smokeStatus.alarm || false,
          temperature: smokeStatus.temp?.tC,
          battery_level: smokeStatus.battery?.percent,
          signal_strength: -50, // Mock value
          last_seen: new Date().toISOString()
        });

        toast({
          title: "✅ Anslutning lyckades",
          description: `Brandvarnare ${deviceInfo.id} svarar`,
        });
      } else {
        throw new Error('Kunde inte hämta rökdetektorstatus');
      }

    } catch (error) {
      console.error('Direct connection failed:', error);
      throw error;
    }
  };

  const scanForShelly = async () => {
    // Simulera scanning av lokalt nätverk för Shelly-enheter
    toast({
      title: "🔍 Söker efter enheter",
      description: "Scannar lokalt nätverk...",
    });

    // I verklig implementation skulle detta scanna nätverket
    // För nu, visa att ingen enhet hittades
    setTimeout(() => {
      toast({
        title: "⚠️ Ingen enhet hittad",
        description: "Kontrollera att brandvarnaren är ansluten till WiFi",
        variant: "destructive",
      });
    }, 3000);
  };

  const testAlarm = async () => {
    const userCode = localStorage.getItem('user_code');
    if (!userCode) {
      toast({
        title: "❌ Användarkod saknas",
        description: "Logga in på nytt",
        variant: "destructive",
      });
      return;
    }

    const testDeviceId = deviceStatus?.deviceId || 'test_device_' + Date.now();

    try {
      // Använd Supabase klient istället för direkt fetch
      const { data: result, error: functionError } = await supabase.functions.invoke('test_alarm', {
        body: {
          deviceId: testDeviceId,
          userCode: userCode,
          user_code: userCode,
          smoke: true,
          temperature: deviceStatus?.temperature || 25,
          battery: deviceStatus?.battery_level || 85
        }
      });

      if (functionError) {
        throw new Error(`Supabase function error: ${functionError.message}`);
      }
      
      toast({
        title: "✅ Testalarm skickat",
        description: "Du borde få en notifikation inom kort",
      });
      setLastTest(new Date().toLocaleString('sv-SE'));
      
      // Uppdatera device status med test data
      setDeviceStatus({
        deviceId: testDeviceId,
        online: true,
        smoke: true,
        temperature: deviceStatus?.temperature || 25,
        battery_level: deviceStatus?.battery_level || 85,
        signal_strength: -45,
        last_seen: new Date().toISOString()
      });
    } catch (error) {
      console.error('Test alarm failed:', error);
      toast({
        title: "❌ Testalarm misslyckades",
        description: error instanceof Error ? error.message : "Kunde inte skicka testalarm",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wifi className="w-5 h-5" />
          Test Shelly Plus Smoke
        </CardTitle>
        <CardDescription>
          Testa anslutning och funktionalitet
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {deviceStatus && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Status:</span>
              <Badge variant={deviceStatus.online ? "default" : "destructive"}>
                {deviceStatus.online ? "Online" : "Offline"}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Battery className="w-4 h-4" />
                <span className="text-sm">
                  Batteri: {deviceStatus.battery_level || "N/A"}%
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Thermometer className="w-4 h-4" />
                <span className="text-sm">
                  Temp: {deviceStatus.temperature || "N/A"}°C
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-medium">Röklarm:</span>
              <Badge variant={deviceStatus.smoke ? "destructive" : "secondary"}>
                {deviceStatus.smoke ? "AKTIVT" : "Normalt"}
              </Badge>
            </div>

            <div className="text-xs text-gray-500">
              Senast sedd: {new Date(deviceStatus.last_seen).toLocaleString('sv-SE')}
            </div>
          </div>
        )}

        {lastTest && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Senaste testalarm: {lastTest}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button 
            onClick={testConnection}
            disabled={testing}
            className="flex-1"
          >
            {testing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testar...
              </>
            ) : (
              <>
                <Wifi className="w-4 h-4 mr-2" />
                Testa anslutning
              </>
            )}
          </Button>

          {deviceStatus && (
            <Button 
              onClick={testAlarm}
              variant="destructive"
              disabled={!deviceStatus.online}
            >
              Testa larm
            </Button>
          )}
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Viktigt:</strong> Säkerställ att din brandvarnare är ansluten till samma WiFi-nätverk som din telefon för optimal prestanda.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};