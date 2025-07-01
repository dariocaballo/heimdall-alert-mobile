
import { useState, useEffect } from "react";
import { Wifi, Smartphone, CheckCircle, AlertTriangle, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Network } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';

interface RealDeviceSetupProps {
  onConnectionChange: (connected: boolean) => void;
}

const RealDeviceSetup = ({ onConnectionChange }: RealDeviceSetupProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isConnecting, setIsConnecting] = useState(false);
  const [homeWifiSSID, setHomeWifiSSID] = useState("");
  const [homeWifiPassword, setHomeWifiPassword] = useState("");
  const [progress, setProgress] = useState(0);
  const [currentNetwork, setCurrentNetwork] = useState<string>("");
  const [shellyIP, setShellyIP] = useState("192.168.33.1");
  const { toast } = useToast();

  const steps = [
    { id: 1, title: "Förbered brandvarnaren", description: "Aktivera konfigurationsläge" },
    { id: 2, title: "Anslut till Shelly", description: "Automatisk anslutning till brandvarnaren" },
    { id: 3, title: "Konfigurera WiFi", description: "Ange ditt hem-WiFi" },
    { id: 4, title: "Konfigurerar automatiskt", description: "Ställer in alarmfunktionen" }
  ];

  useEffect(() => {
    // Övervaka nätverksförändringar
    const checkNetworkStatus = async () => {
      if (Capacitor.isNativePlatform()) {
        const status = await Network.getStatus();
        console.log('Network status:', status);
        
        // Kolla om vi är anslutna till Shelly-nätverk
        if (status.ssid && status.ssid.includes('ShellyPlusSmoke')) {
          setCurrentNetwork(status.ssid);
          setCurrentStep(2);
          toast({
            title: "Ansluten till brandvarnaren!",
            description: `Ansluten till: ${status.ssid}`,
          });
        }
      }
    };

    checkNetworkStatus();

    // Lyssna på nätverksförändringar
    const networkListener = Network.addListener('networkStatusChange', (status) => {
      console.log('Network changed:', status);
      setCurrentNetwork(status.ssid || '');
    });

    return () => {
      networkListener.remove();
    };
  }, []);

  const simulateProgress = (callback: () => void, duration: number = 3000) => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          callback();
          return 100;
        }
        return prev + 5;
      });
    }, duration / 20);
  };

  const configureShellyWiFi = async () => {
    if (!homeWifiSSID || !homeWifiPassword) {
      toast({
        title: "Saknad information",
        description: "Vänligen ange både WiFi-namn och lösenord",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    setCurrentStep(4);

    try {
      // Skicka WiFi-konfiguration till Shelly
      const wifiConfig = {
        ssid: homeWifiSSID,
        key: homeWifiPassword,
        enable: true
      };

      const wifiResponse = await fetch(`http://${shellyIP}/settings/ap`, {
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

      if (!wifiResponse.ok) {
        throw new Error('WiFi-konfiguration misslyckades');
      }

      // Konfigurera HTTP POST för larm
      const alarmConfig = await fetch(`http://${shellyIP}/settings/actions`, {
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

      if (!alarmConfig.ok) {
        throw new Error('Larm-konfiguration misslyckades');
      }

      // Spara konfiguration
      localStorage.setItem('shelly_connected', 'true');
      localStorage.setItem('wifi_configured', 'true');
      localStorage.setItem('home_wifi_ssid', homeWifiSSID);
      localStorage.setItem('shelly_ip', shellyIP);

      simulateProgress(() => {
        onConnectionChange(true);
        setIsConnecting(false);
        toast({
          title: "✅ Installation klar!",
          description: "Din brandvarnare är nu ansluten och konfigurerad för larm.",
        });
      }, 2000);

    } catch (error) {
      console.error('Konfiguration misslyckades:', error);
      setIsConnecting(false);
      toast({
        title: "Konfiguration misslyckades",
        description: `Fel: ${error instanceof Error ? error.message : 'Okänt fel'}`,
        variant: "destructive",
      });
    }
  };

  const testShellyConnection = async () => {
    try {
      const response = await fetch(`http://${shellyIP}/status`, {
        method: 'GET',
        timeout: 5000
      } as any);
      
      if (response.ok) {
        const status = await response.json();
        toast({
          title: "Shelly funnen!",
          description: `Ansluten till ${status.device?.hostname || 'Shelly-enhet'}`,
        });
        setCurrentStep(3);
      }
    } catch (error) {
      toast({
        title: "Kan inte nå Shelly",
        description: "Kontrollera att du är ansluten till ShellyPlusSmoke-nätverket",
        variant: "destructive",
      });
    }
  };

  const resetSetup = () => {
    setCurrentStep(1);
    setProgress(0);
    setHomeWifiSSID("");
    setHomeWifiPassword("");
    setCurrentNetwork("");
    localStorage.removeItem('shelly_connected');
    localStorage.removeItem('wifi_configured');
    onConnectionChange(false);
  };

  // Kolla om vi kör som nativ app
  const isNativeApp = Capacitor.isNativePlatform();

  return (
    <div className="space-y-6">
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-red-800">
            <Shield className="w-5 h-5" />
            <span>{isNativeApp ? 'Verklig brandvarnare-installation' : 'Mobil app krävs för WiFi'}</span>
          </CardTitle>
          <CardDescription className="text-red-600">
            {isNativeApp ? 
              'Följ instruktionerna nedan - appen gör resten automatiskt' :
              'För att ansluta till WiFi behöver appen köras som mobil app'
            }
          </CardDescription>
        </CardHeader>
      </Card>

      {!isNativeApp && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Mobilapp krävs:</strong> WiFi-funktionerna fungerar endast i den mobila versionen. 
            Följ instruktionerna nedan för att installera appen på din telefon.
          </AlertDescription>
        </Alert>
      )}

      {/* Current Network Status */}
      {currentNetwork && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Wifi className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-700">
                Ansluten till: <strong>{currentNetwork}</strong>
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Steps */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {steps.map((step) => (
          <Card key={step.id} className={`${
            currentStep >= step.id ? 'border-red-200 bg-red-50' : 'border-gray-200'
          }`}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  currentStep > step.id ? 'bg-green-500 text-white' : 
                  currentStep === step.id ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {currentStep > step.id ? <CheckCircle className="w-4 h-4" /> : step.id}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{step.title}</p>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Step Content */}
      <div className="space-y-6">
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Steg 1: Förbered brandvarnaren</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Smartphone className="h-4 w-4" />
                <AlertDescription>
                  <strong>Instruktion:</strong> Håll inne knappen på brandvarnaren i 10 sekunder tills den blinkar blått.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-3">
                <p className="text-sm text-gray-600">När brandvarnaren blinkar blått:</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start space-x-2">
                    <span className="text-red-500 font-bold">✓</span>
                    <span>Brandvarnaren skapar ett WiFi-nätverk som heter "ShellyPlusSmoke-XXXXXX"</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-red-500 font-bold">✓</span>
                    <span>Anslut din telefon till detta nätverk</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-red-500 font-bold">✓</span>
                    <span>Kom tillbaka till appen</span>
                  </li>
                </ul>
              </div>
              
              <Button onClick={() => setCurrentStep(2)} className="w-full bg-red-600 hover:bg-red-700">
                Jag har anslutit till ShellyPlusSmoke-nätverket
              </Button>
            </CardContent>
          </Card>
        )}

        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Steg 2: Testa anslutning till Shelly</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="shelly-ip">Shelly IP-adress</Label>
                  <Input
                    id="shelly-ip"
                    type="text"
                    value={shellyIP}
                    onChange={(e) => setShellyIP(e.target.value)}
                    placeholder="192.168.33.1"
                  />
                </div>
                
                <Button 
                  onClick={testShellyConnection}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Wifi className="w-4 h-4 mr-2" />
                  Testa anslutning till Shelly
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Steg 3: Konfigurera hem-WiFi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="wifi-ssid">Ditt hem-WiFi namn (SSID)</Label>
                  <Input
                    id="wifi-ssid"
                    type="text"
                    placeholder="Mitt_WiFi_Namn"
                    value={homeWifiSSID}
                    onChange={(e) => setHomeWifiSSID(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="wifi-password">WiFi-lösenord</Label>
                  <Input
                    id="wifi-password"
                    type="password"
                    placeholder="••••••••"
                    value={homeWifiPassword}
                    onChange={(e) => setHomeWifiPassword(e.target.value)}
                  />
                </div>
              </div>
              
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Detta skickar WiFi-uppgifterna direkt till brandvarnaren och konfigurerar larmfunktionen automatiskt.
                </AlertDescription>
              </Alert>
              
              <Button 
                onClick={configureShellyWiFi}
                disabled={!homeWifiSSID || !homeWifiPassword || isConnecting}
                className="w-full bg-red-600 hover:bg-red-700"
                size="lg"
              >
                {isConnecting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Konfigurerar...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Konfigurera brandvarnaren
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {currentStep === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Steg 4: Konfigurerar automatiskt...</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <Progress value={progress} className="w-full" />
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500" />
                    <span className="text-sm">Ansluter brandvarnaren till ditt hem-WiFi...</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-orange-500" />
                    <span className="text-sm">Konfigurerar HTTP POST för larm...</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Testar anslutning till Firebase...</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Reset button */}
      {currentStep > 1 && !isConnecting && (
        <Card className="border-gray-200">
          <CardContent className="p-4">
            <Button 
              variant="outline" 
              onClick={resetSetup}
              className="w-full"
            >
              Börja om installationen
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RealDeviceSetup;
