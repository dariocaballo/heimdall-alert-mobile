import { useState } from "react";
import { Wifi, Smartphone, Router, CheckCircle, ArrowRight, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

interface DeviceSetupProps {
  onConnectionChange: (connected: boolean) => void;
}

const DeviceSetup = ({ onConnectionChange }: DeviceSetupProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  const steps = [
    {
      id: 1,
      title: "Förbered brandvarnaren",
      description: "Aktivera konfigurationsläge på din Shelly Plus Smoke"
    },
    {
      id: 2,
      title: "Anslut till WiFi",
      description: "Anslut din telefon till Shelly-nätverket"
    },
    {
      id: 3,
      title: "Konfigurera nätverket",
      description: "Ange dina hem-WiFi uppgifter"
    },
    {
      id: 4,
      title: "Ställ in HTTP POST",
      description: "Konfigurera larmnotiser till Firebase"
    }
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Kopierat",
      description: "Text kopierad till urklipp",
    });
  };

  const handleComplete = () => {
    setIsConnecting(true);
    setTimeout(() => {
      localStorage.setItem('shelly_connected', 'true');
      onConnectionChange(true);
      setIsConnecting(false);
      toast({
        title: "Anslutning klar!",
        description: "Din Shelly Plus Smoke är nu ansluten och redo att skicka larm.",
      });
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Wifi className="w-5 h-5" />
            <span>Anslut Shelly Plus Smoke</span>
          </CardTitle>
          <CardDescription>
            Följ dessa steg för att ansluta din brandvarnare till systemet
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Progress Steps */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <Card className={`w-full ${currentStep >= step.id ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
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
            {index < steps.length - 1 && (
              <ArrowRight className="w-4 h-4 text-gray-400 mx-2 hidden md:block" />
            )}
          </div>
        ))}
      </div>

      {/* Step Details */}
      <div className="space-y-6">
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Steg 1: Förbered brandvarnaren</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Sätt din Shelly Plus Smoke i konfigurationsläge:
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start space-x-2">
                    <span className="text-red-500 font-bold">1.</span>
                    <span>Håll inne konfigurationsknappen på brandvarnaren i 10 sekunder</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-red-500 font-bold">2.</span>
                    <span>LED-lampan ska börja blinka blått (konfigurationsläge aktiverat)</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-red-500 font-bold">3.</span>
                    <span>Brandvarnaren skapar nu ett WiFi-nätverk som börjar med "ShellyPlusSmoke"</span>
                  </li>
                </ul>
              </div>
              <Alert>
                <Smartphone className="h-4 w-4" />
                <AlertDescription>
                  <strong>Tips:</strong> Konfigurationsknappen finns vanligtvis på baksidan eller sidan av enheten. 
                  Se bruksanvisningen för exakt placering.
                </AlertDescription>
              </Alert>
              <Button onClick={() => setCurrentStep(2)} className="w-full">
                Brandvarnaren är i konfigurationsläge
              </Button>
            </CardContent>
          </Card>
        )}

        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Steg 2: Anslut till WiFi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Anslut din telefon till Shelly-nätverket:
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start space-x-2">
                    <span className="text-red-500 font-bold">1.</span>
                    <span>Gå till WiFi-inställningar på din telefon</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-red-500 font-bold">2.</span>
                    <span>Leta efter nätverk som börjar med "ShellyPlusSmoke-"</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-red-500 font-bold">3.</span>
                    <span>Anslut till detta nätverk (inget lösenord krävs)</span>
                  </li>
                </ul>
              </div>
              <Alert>
                <Wifi className="h-4 w-4" />
                <AlertDescription>
                  <strong>Observera:</strong> Det kan ta upp till 2 minuter innan nätverket visas i listan. 
                  Om det inte syns, kontrollera att brandvarnaren fortfarande blinkar blått.
                </AlertDescription>
              </Alert>
              <Button onClick={() => setCurrentStep(3)} className="w-full">
                Ansluten till Shelly-nätverket
              </Button>
            </CardContent>
          </Card>
        )}

        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Steg 3: Konfigurera hem-WiFi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Anslut brandvarnaren till ditt hem-WiFi:
                </p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Shelly konfigurationssida:</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard('192.168.33.1')}
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Kopiera
                    </Button>
                  </div>
                  <code className="text-sm bg-white p-2 rounded border block">192.168.33.1</code>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start space-x-2">
                    <span className="text-red-500 font-bold">1.</span>
                    <span>Öppna en webbläsare och gå till <strong>192.168.33.1</strong></span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-red-500 font-bold">2.</span>
                    <span>Välj "WiFi Mode" eller "Internet & Security"</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-red-500 font-bold">3.</span>
                    <span>Välj ditt hem-WiFi och ange lösenordet</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-red-500 font-bold">4.</span>
                    <span>Klicka "Connect" och vänta på bekräftelse</span>
                  </li>
                </ul>
              </div>
              <Button 
                onClick={() => window.open('http://192.168.33.1', '_blank')}
                variant="outline"
                className="w-full"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Öppna Shelly konfiguration
              </Button>
              <Button onClick={() => setCurrentStep(4)} className="w-full">
                WiFi-konfiguration klar
              </Button>
            </CardContent>
          </Card>
        )}

        {currentStep === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Steg 4: Konfigurera HTTP POST (Larmnotiser)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Konfigurera brandvarnaren att skicka larm till vårt system:
                </p>
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Firebase Cloud Function URL:</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard('https://us-central1-id-bevakarna.cloudfunctions.net/sendTestAlarm')}
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        Kopiera
                      </Button>
                    </div>
                    <code className="text-xs bg-white p-2 rounded border block break-all">
                      https://us-central1-id-bevakarna.cloudfunctions.net/sendTestAlarm
                    </code>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-3">
                    <p className="font-medium">Konfigurationssteg:</p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start space-x-2">
                        <span className="text-red-500 font-bold">1.</span>
                        <span>Gå till "Actions" eller "Settings" → "Actions" i Shelly-gränssnittet</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="text-red-500 font-bold">2.</span>
                        <span>Välj "Smoke" som trigger (utlösare)</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="text-red-500 font-bold">3.</span>
                        <span>Välj "HTTP Request" som action</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="text-red-500 font-bold">4.</span>
                        <span>Ange URL (se ovan) och välj "POST" som metod</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="text-red-500 font-bold">5.</span>
                        <span>Lägg till Content-Type: application/json i headers</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="text-red-500 font-bold">6.</span>
                        <span>Body: {'"{"deviceId": "{{device_id}}", "timestamp": "{{timestamp}}"}"'}</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Viktigt:</strong> Testa konfigurationen genom att använda "Test" funktionen i Shelly-gränssnittet 
                  innan du avslutar installationen.
                </AlertDescription>
              </Alert>
              
              <Button 
                onClick={handleComplete}
                disabled={isConnecting}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {isConnecting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Slutför installation...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Installation klar
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Reset Button */}
      {currentStep > 1 && (
        <Card className="border-gray-200">
          <CardContent className="p-4">
            <Button 
              variant="outline" 
              onClick={() => setCurrentStep(1)}
              className="w-full"
            >
              Börja om från början
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DeviceSetup;
