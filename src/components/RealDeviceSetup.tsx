
import { useState, useEffect } from "react";
import { Wifi, Smartphone, CheckCircle, AlertTriangle, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Network } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';
import { ShellyConnectionHelper } from "./ShellyConnectionHelper";
import { ShellyWiFiConfigurator } from "./ShellyWiFiConfigurator";

interface RealDeviceSetupProps {
  onConnectionChange: (connected: boolean) => void;
}

const RealDeviceSetup = ({ onConnectionChange }: RealDeviceSetupProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [shellyIP, setShellyIP] = useState("192.168.33.1");
  const [isConnectedToShelly, setIsConnectedToShelly] = useState(false);
  const [currentNetwork, setCurrentNetwork] = useState<string>("");
  const { toast } = useToast();

  const steps = [
    { id: 1, title: "Förbered brandvarnaren", description: "Aktivera konfigurationsläge" },
    { id: 2, title: "Anslut till Shelly", description: "Testa anslutning till brandvarnaren" },
    { id: 3, title: "Konfigurera WiFi", description: "Ange ditt hem-WiFi" },
    { id: 4, title: "Klart!", description: "Brandvarnaren är ansluten" }
  ];

  useEffect(() => {
    // Kontrollera befintlig anslutning vid start
    const checkExistingConnection = () => {
      const connected = localStorage.getItem('shelly_connected') === 'true';
      if (connected) {
        setCurrentStep(4);
        onConnectionChange(true);
      }
    };
    
    checkExistingConnection();

    // Lyssna på nätverksförändringar endast på mobila enheter
    let networkListener: any;
    const setupNetworkListener = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const status = await Network.getStatus();
          console.log('Initial network status:', status);
          
          networkListener = await Network.addListener('networkStatusChange', async (status) => {
            console.log('Network changed:', status);
            if (status.connected && status.connectionType === 'wifi') {
              // Ge lite tid för nätverket att etableras
              setTimeout(async () => {
                // Försök att upptäcka om vi är på Shelly-nätverket
                try {
                  const response = await fetch(`http://${shellyIP}/status`, {
                    method: 'GET',
                    timeout: 3000
                  } as any);
                  
                  if (response.ok) {
                    setIsConnectedToShelly(true);
                    setCurrentNetwork('ShellyPlusSmoke (upptäckt)');
                    if (currentStep === 1) {
                      setCurrentStep(2);
                      toast({
                        title: "✅ Shelly-nätverk upptäckt!",
                        description: "Du kan nu fortsätta till nästa steg.",
                      });
                    }
                  }
                } catch (error) {
                  // Ignorera fel - användaren kan manuellt testa anslutningen
                  console.log('Auto-detection failed, user can test manually');
                }
              }, 2000);
            }
          });
        } catch (error) {
          console.error('Network listener setup failed:', error);
        }
      }
    };

    setupNetworkListener();

    return () => {
      if (networkListener) {
        networkListener.remove();
      }
    };
  }, [currentStep, shellyIP, onConnectionChange]);

  const handleShellyConnectionSuccess = () => {
    setIsConnectedToShelly(true);
    setCurrentStep(3);
  };

  const handleShellyConnectionError = (error: string) => {
    setIsConnectedToShelly(false);
    console.error('Shelly connection error:', error);
  };

  const handleConfigurationComplete = () => {
    setCurrentStep(4);
    onConnectionChange(true);
  };

  const resetSetup = () => {
    setCurrentStep(1);
    setIsConnectedToShelly(false);
    setCurrentNetwork("");
    localStorage.removeItem('shelly_connected');
    localStorage.removeItem('wifi_configured');
    localStorage.removeItem('home_wifi_ssid');
    onConnectionChange(false);
    
    toast({
      title: "Setup återställd",
      description: "Du kan nu börja installationen från början.",
    });
  };

  const isNativeApp = Capacitor.isNativePlatform();

  return (
    <div className="space-y-6">
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-red-800">
            <Shield className="w-5 h-5" />
            <span>Anslut din Shelly Plus Smoke brandvarnare</span>
          </CardTitle>
          <CardDescription className="text-red-600">
            {isNativeApp ? 
              'Följ stegen nedan - appen gör resten automatiskt' :
              'Denna funktion kräver att appen körs som mobilapp'
            }
          </CardDescription>
        </CardHeader>
      </Card>

      {!isNativeApp && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Mobilapp krävs:</strong> För att ansluta till Shelly-enheter behöver appen köras som mobilapp. 
            Öppna appen på din telefon för att fortsätta med installationen.
          </AlertDescription>
        </Alert>
      )}

      {/* Nuvarande nätverksstatus */}
      {(currentNetwork || isConnectedToShelly) && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Wifi className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-700">
                {isConnectedToShelly ? 
                  <strong>✅ Shelly-enhet funnen på {shellyIP}</strong> :
                  `Ansluten till: ${currentNetwork}`
                }
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Steg-indikator */}
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

      {/* Steg-innehåll */}
      <div className="space-y-6">
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Steg 1: Förbered brandvarnaren</CardTitle>
              <CardDescription>
                Sätt brandvarnaren i konfigurationsläge så att appen kan ansluta till den
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Smartphone className="h-4 w-4" />
                <AlertDescription>
                  <strong>Gör så här:</strong>
                  <br />
                  1. Håll inne knappen på brandvarnaren i <strong>10 sekunder</strong>
                  <br />
                  2. Vänta tills den blinkar <strong>blått</strong>
                  <br />
                  3. När den blinkar blått skapar den ett WiFi-nätverk
                </AlertDescription>
              </Alert>
              
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">När brandvarnaren blinkar blått:</h4>
                <ul className="space-y-2 text-sm text-blue-700">
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-500 font-bold">1.</span>
                    <span>Gå till telefonens <strong>WiFi-inställningar</strong></span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-500 font-bold">2.</span>
                    <span>Leta efter nätverket <strong>"ShellyPlusSmoke-XXXXXX"</strong></span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-500 font-bold">3.</span>
                    <span>Anslut till detta nätverk (inget lösenord krävs)</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-500 font-bold">4.</span>
                    <span>Kom tillbaka till appen</span>
                  </li>
                </ul>
              </div>
              
              <Button 
                onClick={() => setCurrentStep(2)} 
                className="w-full bg-red-600 hover:bg-red-700"
                size="lg"
              >
                Jag har anslutit till ShellyPlusSmoke-nätverket
              </Button>
            </CardContent>
          </Card>
        )}

        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Steg 2: Testa anslutning till brandvarnaren</CardTitle>
              <CardDescription>
                Nu testar vi om appen kan kommunicera med din brandvarnare
              </CardDescription>
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
                  <p className="text-xs text-gray-500">
                    Vanligtvis 192.168.33.1 för Shelly-enheter
                  </p>
                </div>
                
                <ShellyConnectionHelper
                  shellyIP={shellyIP}
                  onConnectionSuccess={handleShellyConnectionSuccess}
                  onConnectionError={handleShellyConnectionError}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Steg 3: Konfigurera hem-WiFi</CardTitle>
              <CardDescription>
                Nu skickar vi dina WiFi-uppgifter till brandvarnaren så den kan ansluta till ditt hemma-nätverk
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ShellyWiFiConfigurator
                shellyIP={shellyIP}
                onConfigurationComplete={handleConfigurationComplete}
              />
            </CardContent>
          </Card>
        )}

        {currentStep === 4 && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-lg text-green-800">✅ Installation klar!</CardTitle>
              <CardDescription className="text-green-600">
                Din brandvarnare är nu ansluten och konfigurerad
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white p-4 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-800 mb-2">Vad händer nu:</h4>
                <ul className="space-y-2 text-sm text-green-700">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>Brandvarnaren är ansluten till ditt hem-WiFi</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>Larmfunktionen är aktiverad</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>Du får pushnotiser vid brandlarm</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>Testa gärna systemet med knappen på Dashboard</span>
                  </li>
                </ul>
              </div>
              
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <strong>Tips:</strong> Gå till Dashboard och tryck på "Testa komplett larm" för att kontrollera att allt fungerar som det ska.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Återställningsknapp */}
      {currentStep > 1 && (
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
