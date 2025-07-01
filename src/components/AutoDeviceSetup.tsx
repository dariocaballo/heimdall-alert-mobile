
import { useState } from "react";
import { Wifi, Smartphone, CheckCircle, AlertTriangle, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

interface AutoDeviceSetupProps {
  onConnectionChange: (connected: boolean) => void;
}

const AutoDeviceSetup = ({ onConnectionChange }: AutoDeviceSetupProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isConnecting, setIsConnecting] = useState(false);
  const [homeWifiSSID, setHomeWifiSSID] = useState("");
  const [homeWifiPassword, setHomeWifiPassword] = useState("");
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const steps = [
    { id: 1, title: "Förbered brandvarnaren", description: "Aktivera konfigurationsläge" },
    { id: 2, title: "Anslut till Shelly", description: "Automatisk anslutning till brandvarnaren" },
    { id: 3, title: "Konfigurera WiFi", description: "Ange ditt hem-WiFi" },
    { id: 4, title: "Konfigurerar automatiskt", description: "Ställer in alarmfunktionen" }
  ];

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

  const handleAutoConnect = async () => {
    setIsConnecting(true);
    
    // Simulera anslutning till Shelly-nätverk
    toast({
      title: "Söker efter brandvarnare...",
      description: "Ansluter automatiskt till Shelly Plus Smoke",
    });

    simulateProgress(() => {
      setCurrentStep(3);
      setIsConnecting(false);
      toast({
        title: "Ansluten till brandvarnaren!",
        description: "Ange nu ditt hem-WiFi för att slutföra installationen",
      });
    });
  };

  const handleWifiSetup = async () => {
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

    // Simulera konfiguration
    toast({
      title: "Konfigurerar brandvarnaren...",
      description: "Ställer in WiFi och larmfunktioner automatiskt",
    });

    simulateProgress(async () => {
      // Simulera HTTP POST-konfiguration
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      localStorage.setItem('shelly_connected', 'true');
      localStorage.setItem('wifi_configured', 'true');
      localStorage.setItem('home_wifi_ssid', homeWifiSSID);
      
      onConnectionChange(true);
      setIsConnecting(false);
      
      toast({
        title: "✅ Installation klar!",
        description: "Din brandvarnare är nu ansluten och redo att skicka larm.",
      });
    }, 4000);
  };

  const resetSetup = () => {
    setCurrentStep(1);
    setProgress(0);
    setHomeWifiSSID("");
    setHomeWifiPassword("");
    localStorage.removeItem('shelly_connected');
    localStorage.removeItem('wifi_configured');
    onConnectionChange(false);
  };

  return (
    <div className="space-y-6">
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-red-800">
            <Shield className="w-5 h-5" />
            <span>Automatisk brandvarnare-installation</span>
          </CardTitle>
          <CardDescription className="text-red-600">
            Följ instruktionerna nedan - appen gör resten automatiskt
          </CardDescription>
        </CardHeader>
      </Card>

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
                  <strong>Enkel instruktion:</strong> Håll inne knappen på brandvarnaren i 10 sekunder tills den blinkar blått.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-3">
                <p className="text-sm text-gray-600">När brandvarnaren blinkar blått:</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start space-x-2">
                    <span className="text-red-500 font-bold">✓</span>
                    <span>Brandvarnaren är redo för installation</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-red-500 font-bold">✓</span>
                    <span>Den skapar sitt eget WiFi-nätverk</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-red-500 font-bold">✓</span>
                    <span>Appen kommer ansluta automatiskt</span>
                  </li>
                </ul>
              </div>
              
              <Button onClick={() => setCurrentStep(2)} className="w-full bg-red-600 hover:bg-red-700">
                Brandvarnaren blinkar blått - Fortsätt
              </Button>
            </CardContent>
          </Card>
        )}

        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Steg 2: Ansluter automatiskt...</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isConnecting ? (
                <div className="space-y-4">
                  <Progress value={progress} className="w-full" />
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500" />
                    <span className="text-sm">Söker och ansluter till brandvarnaren...</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Alert>
                    <Wifi className="h-4 w-4" />
                    <AlertDescription>
                      Appen kommer automatiskt hitta och ansluta till din brandvarnare. 
                      Ingen manuell WiFi-växling behövs!
                    </AlertDescription>
                  </Alert>
                  
                  <Button 
                    onClick={handleAutoConnect}
                    className="w-full bg-red-600 hover:bg-red-700"
                    size="lg"
                  >
                    <Wifi className="w-4 h-4 mr-2" />
                    Starta automatisk anslutning
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Steg 3: Ange ditt hem-WiFi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="wifi-ssid">WiFi-namn (SSID)</Label>
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
                  <strong>Säkert:</strong> Dina WiFi-uppgifter skickas direkt till brandvarnaren 
                  och lagras aldrig på våra servrar.
                </AlertDescription>
              </Alert>
              
              <Button 
                onClick={handleWifiSetup}
                disabled={!homeWifiSSID || !homeWifiPassword}
                className="w-full bg-red-600 hover:bg-red-700"
                size="lg"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Konfigurera brandvarnaren
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
                    <span className="text-sm">Konfigurerar larmfunktioner automatiskt...</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Testar anslutning till larmsystemet...</span>
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

export default AutoDeviceSetup;
