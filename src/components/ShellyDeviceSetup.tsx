import { useState, useEffect } from "react";
import { Wifi, Smartphone, CheckCircle, AlertTriangle, Shield, Router, Settings, Timer, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Capacitor } from '@capacitor/core';
import RealDeviceSetup from "./RealDeviceSetup";

interface ShellyDeviceSetupProps {
  onConnectionChange: (connected: boolean) => void;
}

const ShellyDeviceSetup = ({ onConnectionChange }: ShellyDeviceSetupProps) => {
  const [setupMode, setSetupMode] = useState<'guide' | 'real'>('guide');
  const { toast } = useToast();

  useEffect(() => {
    // Kontrollera om enheten redan är ansluten
    const connected = localStorage.getItem('shelly_connected') === 'true';
    if (connected) {
      onConnectionChange(true);
    }
  }, [onConnectionChange]);

  const isNativeApp = Capacitor.isNativePlatform();

  return (
    <div className="space-y-6">
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-red-800">
            <Shield className="w-5 h-5" />
            <span>Anslut Shelly Plus Smoke</span>
          </CardTitle>
          <CardDescription className="text-red-600">
            Koppla din brandvarnare enligt Shellys officiella process
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Setup Mode Selector */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card 
          className={`cursor-pointer transition-all ${setupMode === 'guide' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-red-300'}`}
          onClick={() => setSetupMode('guide')}
        >
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className={`w-4 h-4 rounded-full ${setupMode === 'guide' ? 'bg-red-500' : 'bg-gray-300'}`} />
              <div>
                <h3 className="font-medium">Vägledning</h3>
                <p className="text-sm text-gray-600">Steg-för-steg instruktioner</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${setupMode === 'real' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-red-300'}`}
          onClick={() => setSetupMode('real')}
        >
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className={`w-4 h-4 rounded-full ${setupMode === 'real' ? 'bg-red-500' : 'bg-gray-300'}`} />
              <div>
                <h3 className="font-medium">Direkt anslutning</h3>
                <p className="text-sm text-gray-600">Automatisk konfiguration</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content based on selected mode */}
      {setupMode === 'guide' ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Anslut Shelly Plus Smoke - Vägledning</CardTitle>
            <CardDescription>
              Följ dessa steg för att ansluta din brandvarnare precis som i Shelly-appen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Steg 1: Access Point Mode */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center font-bold">1</div>
                <h3 className="text-lg font-semibold">Aktivera Access Point-läge</h3>
              </div>
              
              <Alert>
                <Timer className="h-4 w-4" />
                <AlertDescription>
                  <strong>Håll inne konfigurationsknappen i 10 sekunder</strong>
                  <br />
                  Tryck och håll knappen på Shelly Plus Smoke tills LED-lampan börjar blinka blått.
                </AlertDescription>
              </Alert>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">När enheten blinkar blått:</h4>
                <ul className="space-y-2 text-sm text-blue-700">
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 text-blue-500" />
                    <span>Enheten skapar WiFi-nätverket <strong>"ShellyPlusSmoke-XXXXXX"</strong></span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 text-blue-500" />
                    <span>Nätverket är öppet (inget lösenord krävs)</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 text-blue-500" />
                    <span>Enheten lyssnar på IP <strong>192.168.33.1</strong></span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Steg 2: Connect to AP */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">2</div>
                <h3 className="text-lg font-semibold">Anslut till Access Point</h3>
              </div>
              
              <Alert>
                <Wifi className="h-4 w-4" />
                <AlertDescription>
                  <strong>Anslut din telefon till Shelly-nätverket:</strong>
                  <br />
                  1. Öppna WiFi-inställningar på telefonen
                  <br />
                  2. Leta efter "ShellyPlusSmoke-" följt av bokstäver/siffror
                  <br />
                  3. Anslut till detta nätverk (inget lösenord)
                </AlertDescription>
              </Alert>
            </div>

            {/* Steg 3: Configure WiFi */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold">3</div>
                <h3 className="text-lg font-semibold">Konfigurera hem-WiFi</h3>
              </div>
              
              <Alert>
                <Router className="h-4 w-4" />
                <AlertDescription>
                  <strong>Använd webbläsaren för att konfigurera:</strong>
                  <br />
                  1. Öppna <code>192.168.33.1</code> i webbläsaren
                  <br />
                  2. Gå till WiFi-inställningar
                  <br />
                  3. Välj ditt hem-WiFi och ange lösenord
                  <br />
                  4. Spara inställningarna
                </AlertDescription>
              </Alert>
            </div>

            {/* Steg 4: Configure Webhook */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold">4</div>
                <h3 className="text-lg font-semibold">Konfigurera larmnotiser</h3>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h4 className="font-semibold text-purple-800 mb-2">Webhook-inställningar:</h4>
                <div className="space-y-2 text-sm text-purple-700">
                  <p><strong>URL:</strong> <code className="bg-white px-2 py-1 rounded">https://owgkhkxsaeizgwxebarh.supabase.co/functions/v1/shelly_webhook</code></p>
                  <p><strong>Event:</strong> smoke.on</p>
                  <p><strong>Metod:</strong> POST</p>
                </div>
              </div>
            </div>

            <Button 
              onClick={() => {
                localStorage.setItem('shelly_connected', 'true');
                onConnectionChange(true);
                toast({
                  title: "✅ Setup markerat som klart",
                  description: "Du kan nu använda Dashboard för att övervaka din brandvarnare",
                });
              }}
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Markera som konfigurerad
            </Button>
          </CardContent>
        </Card>
      ) : (
        <RealDeviceSetup onConnectionChange={onConnectionChange} />
      )}

      {!isNativeApp && setupMode === 'real' && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Mobilapp rekommenderas:</strong> För automatisk konfiguration fungerar appen bäst som mobilapp. 
            Du kan fortfarande använda vägledningsläget ovan för manuell konfiguration.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default ShellyDeviceSetup;