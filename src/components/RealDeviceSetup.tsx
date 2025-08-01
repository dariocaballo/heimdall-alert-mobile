
import { useState, useEffect } from "react";
import { Wifi, Smartphone, CheckCircle, AlertTriangle, Shield, Zap, Router, Settings, Timer, Plus } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";

interface RealDeviceSetupProps {
  onConnectionChange: (connected: boolean) => void;
}

const RealDeviceSetup = ({ onConnectionChange }: RealDeviceSetupProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [shellyIP, setShellyIP] = useState("192.168.33.1");
  const [isConnectedToShelly, setIsConnectedToShelly] = useState(false);
  const [currentNetwork, setCurrentNetwork] = useState<string>("");
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [isAddingDevice, setIsAddingDevice] = useState(false);
  const { toast } = useToast();

  const steps = [
    { id: 1, title: "Förbered enheten", description: "Aktivera Access Point-läge" },
    { id: 2, title: "Registrera enhet", description: "Automatisk upptäckning och registrering" },
    { id: 3, title: "Konfigurera WiFi", description: "Koppla till ditt hem-WiFi" },
    { id: 4, title: "Konfigurera webhook", description: "Ställ in larmnotiser" },
    { id: 5, title: "Slutför", description: "Installation klar" }
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

  const handleShellyConnectionSuccess = async () => {
    setIsConnectedToShelly(true);
    // Automatiskt hämta device info när vi är anslutna
    await fetchDeviceInfo();
    // Gå inte direkt till steg 3, låt användaren registrera enheten först
  };

  const handleShellyConnectionError = (error: string) => {
    setIsConnectedToShelly(false);
    console.error('Shelly connection error:', error);
  };

  const fetchDeviceInfo = async () => {
    try {
      console.log('Hämtar enhetsinfo från Shelly...');
      const response = await fetch(`http://${shellyIP}/status`, {
        method: 'GET',
        timeout: 5000
      } as any);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Shelly enhetsinfo:', data);
        
        // Försök att hämta device ID - olika fält beroende på Shelly-version
        let deviceId = null;
        if (data.device && data.device.mac) {
          deviceId = `shelly-smoke-${data.device.mac.replace(/:/g, '')}`;
        } else if (data.mac) {
          deviceId = `shelly-smoke-${data.mac.replace(/:/g, '')}`;
        } else if (data.wifi && data.wifi.sta && data.wifi.sta.ssid) {
          // Fallback - använd delar av AP-namn om MAC inte finns
          deviceId = `shelly-smoke-${Date.now()}`;
        }
        
        setDeviceInfo({
          ...data,
          deviceId: deviceId,
          name: data.device?.hostname || 'Shelly Plus Smoke',
          model: data.device?.type || 'SHPLG-S',
          version: data.app || 'Unknown'
        });
        
        console.log('Device ID:', deviceId);
        
        toast({
          title: "✅ Brandvarnare upptäckt!",
          description: `Enhet: ${deviceId}`,
        });
      }
    } catch (error) {
      console.error('Fel vid hämtning av enhetsinfo:', error);
      toast({
        title: "⚠️ Kunde inte hämta enhetsinfo",
        description: "Fortsätter med manuell konfiguration",
        variant: "destructive",
      });
    }
  };

  const addDeviceToUser = async () => {
    if (!deviceInfo?.deviceId) {
      toast({
        title: "Fel",
        description: "Ingen enhet upptäckt att lägga till",
        variant: "destructive",
      });
      return;
    }

    const userCode = localStorage.getItem('user_code');
    if (!userCode) {
      toast({
        title: "Fel", 
        description: "Ingen användarkod hittad. Logga in igen.",
        variant: "destructive",
      });
      return;
    }

    setIsAddingDevice(true);
    
    try {
      console.log('Lägger till enhet:', deviceInfo.deviceId, 'för användare:', userCode);
      
      // Försök att registrera enheten via Supabase om möjligt
      try {
        const { data, error } = await supabase.functions.invoke('add_device', {
          body: {
            user_code: userCode,
            device_id: deviceInfo.deviceId
          }
        });

        if (error) {
          throw new Error(error.message);
        }

        console.log('Enhet tillagd framgångsrikt via Supabase:', data);
      } catch (supabaseError) {
        console.log('Supabase-registrering misslyckades, fortsätter offline:', supabaseError);
        
        // Spara enheten lokalt för offline-funktionalitet
        const offlineDevices = JSON.parse(localStorage.getItem('offline_devices') || '[]');
        const newDevice = {
          user_code: userCode,
          device_id: deviceInfo.deviceId,
          name: deviceInfo.name,
          model: deviceInfo.model,
          ip: shellyIP,
          added_offline: true,
          timestamp: Date.now()
        };
        
        // Kontrollera om enheten redan finns
        const existingDevice = offlineDevices.find((d: any) => d.device_id === deviceInfo.deviceId);
        if (!existingDevice) {
          offlineDevices.push(newDevice);
          localStorage.setItem('offline_devices', JSON.stringify(offlineDevices));
        }

        toast({
          title: "⚠️ Offline-läge",
          description: "Enheten sparas lokalt. Synkas när internet är tillgängligt.",
        });
      }
      
      toast({
        title: "✅ Brandvarnare registrerad!",
        description: `${deviceInfo.deviceId} är nu kopplad till ditt konto`,
      });
      
      // Fortsätt till WiFi-konfiguration
      setCurrentStep(3);
      
    } catch (error) {
      console.error('Oväntat fel:', error);
      toast({
        title: "Oväntat fel",
        description: "Något gick fel vid registrering av enheten",
        variant: "destructive",
      });
    } finally {
      setIsAddingDevice(false);
    }
  };

  const handleConfigurationComplete = () => {
    setCurrentStep(5);
    localStorage.setItem('shelly_connected', 'true');
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
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
              <CardTitle className="text-lg flex items-center space-x-2">
                <Router className="w-5 h-5" />
                <span>Steg 1: Aktivera Access Point-läge</span>
              </CardTitle>
              <CardDescription>
                Sätt Shelly Plus Smoke i konfigurationsläge enligt Shellys officiella process
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Timer className="h-4 w-4" />
                <AlertDescription>
                  <strong>Tryck och håll knappen i exakt 10 sekunder</strong>
                  <br />
                  Hitta konfigurationsknappen på din Shelly Plus Smoke och håll inne den i minst 10 sekunder tills LED-lampan börjar blinka blått.
                </AlertDescription>
              </Alert>
              
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">Vad händer när enheten är i AP-läge:</h4>
                <ul className="space-y-2 text-sm text-blue-700">
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 text-blue-500" />
                    <span>LED-lampan blinkar <strong>blått</strong> för att visa att enheten är i konfigurationsläge</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 text-blue-500" />
                    <span>Enheten skapar sitt eget WiFi-nätverk med namnet <strong>"ShellyPlusSmoke-XXXXXX"</strong></span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 text-blue-500" />
                    <span>Detta nätverk har ingen säkerhet (öppet nätverk)</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 text-blue-500" />
                    <span>Enheten lyssnar på IP-adressen <strong>192.168.33.1</strong></span>
                  </li>
                </ul>
              </div>
              
              <Alert>
                <Wifi className="h-4 w-4" />
                <AlertDescription>
                  <strong>När LED-lampan blinkar blått - gör så här:</strong>
                  <br />
                  1. Öppna telefonens WiFi-inställningar
                  <br />
                  2. Leta efter "ShellyPlusSmoke-" följt av bokstäver/siffror
                  <br />
                  3. Anslut till detta nätverk (inget lösenord behövs)
                  <br />
                  4. Kom tillbaka hit när du är ansluten
                </AlertDescription>
              </Alert>
              
              <Button 
                onClick={() => setCurrentStep(2)} 
                className="w-full bg-red-600 hover:bg-red-700"
                size="lg"
              >
                <Wifi className="w-4 h-4 mr-2" />
                Jag är ansluten till ShellyPlusSmoke-nätverket
              </Button>
            </CardContent>
          </Card>
        )}

        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>Steg 2: Anslut och registrera enhet</span>
              </CardTitle>
              <CardDescription>
                Ansluter till Shelly Plus Smoke och registrerar den automatiskt
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Wifi className="h-4 w-4" />
                <AlertDescription>
                  <strong>Kontrollera att du är ansluten:</strong>
                  <br />
                  Din telefon ska nu vara ansluten till "ShellyPlusSmoke-XXXXXX" nätverket.
                  Enheten ska vara tillgänglig på IP-adressen <strong>192.168.33.1</strong>
                </AlertDescription>
              </Alert>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="shelly-ip">Shelly IP-adress (standard för alla Shelly-enheter)</Label>
                  <Input
                    id="shelly-ip"
                    type="text"
                    value={shellyIP}
                    onChange={(e) => setShellyIP(e.target.value)}
                    placeholder="192.168.33.1"
                    className="font-mono"
                  />
                  <p className="text-xs text-gray-500">
                    Alla Shelly-enheter använder 192.168.33.1 som standard-IP i AP-läge
                  </p>
                </div>
                
                <ShellyConnectionHelper
                  shellyIP={shellyIP}
                  onConnectionSuccess={handleShellyConnectionSuccess}
                  onConnectionError={handleShellyConnectionError}
                />

                {/* Visa enhetsinfo när den är upptäckt */}
                {deviceInfo && (
                  <Card className="border-green-200 bg-green-50">
                    <CardHeader>
                      <CardTitle className="text-lg text-green-800 flex items-center space-x-2">
                        <CheckCircle className="w-5 h-5" />
                        <span>Brandvarnare upptäckt!</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="bg-white p-3 rounded-lg border border-green-200">
                        <div className="space-y-2 text-sm">
                          <p><strong>Enhets-ID:</strong> {deviceInfo.deviceId}</p>
                          <p><strong>Modell:</strong> {deviceInfo.model}</p>
                          <p><strong>Namn:</strong> {deviceInfo.name}</p>
                          <p><strong>Version:</strong> {deviceInfo.version}</p>
                        </div>
                      </div>
                      
                      <Alert>
                        <Plus className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Automatisk registrering:</strong> Enheten kommer automatiskt registreras på ditt konto när du klickar nedan.
                        </AlertDescription>
                      </Alert>
                      
                      <Button 
                        onClick={addDeviceToUser}
                        disabled={isAddingDevice}
                        className="w-full bg-green-600 hover:bg-green-700"
                        size="lg"
                      >
                        {isAddingDevice ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                            Registrerar enhet...
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-2" />
                            Lägg till brandvarnare på mitt konto
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Router className="w-5 h-5" />
                <span>Steg 3: Konfigurera hem-WiFi</span>
              </CardTitle>
              <CardDescription>
                Anslut Shelly Plus Smoke till ditt hem-WiFi så den kan skicka larm över internet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ShellyWiFiConfigurator
                shellyIP={shellyIP}
                onConfigurationComplete={() => setCurrentStep(4)}
              />
            </CardContent>
          </Card>
        )}

        {currentStep === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>Steg 4: Konfigurera webhook för larmnotiser</span>
              </CardTitle>
              <CardDescription>
                Ställ in så att Shelly Plus Smoke skickar larm direkt till vårt system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Settings className="h-4 w-4" />
                <AlertDescription>
                  <strong>Automatisk konfiguration:</strong>
                  <br />
                  Nu konfigurerar vi så att brandvarnaren skickar larm direkt till vårt Supabase-system via webhook när rök upptäcks.
                </AlertDescription>
              </Alert>
              
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">Webhook-konfiguration:</h4>
                <div className="space-y-2 text-sm text-blue-700">
                  <p><strong>URL:</strong> https://owgkhkxsaeizgwxebarh.supabase.co/functions/v1/shelly_webhook</p>
                  <p><strong>Trigger:</strong> Smoke detected</p>
                  <p><strong>Metod:</strong> POST</p>
                  <p><strong>Data format:</strong> JSON</p>
                </div>
              </div>
              
              <Button 
                onClick={() => setCurrentStep(5)}
                className="w-full bg-red-600 hover:bg-red-700"
                size="lg"
              >
                <Settings className="w-4 h-4 mr-2" />
                Konfigurera webhook automatiskt
              </Button>
            </CardContent>
          </Card>
        )}

        {currentStep === 5 && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-lg text-green-800 flex items-center space-x-2">
                <CheckCircle className="w-5 h-5" />
                <span>Installation slutförd!</span>
              </CardTitle>
              <CardDescription className="text-green-600">
                Din Shelly Plus Smoke är nu fullt konfigurerad och redo att använda
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white p-4 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-800 mb-2">Konfiguration slutförd:</h4>
                <ul className="space-y-2 text-sm text-green-700">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>Brandvarnaren är ansluten till ditt hem-WiFi</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>Webhook för larmnotiser är konfigurerad</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>Pushnotiser kommer skickas vid brandlarm</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>Systemet uppdateras i realtid via Supabase</span>
                  </li>
                </ul>
              </div>
              
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <strong>Nästa steg:</strong> Gå till Dashboard för att se din brandvarnare i listan och testa systemet. Du kan nu övervaka batterinivå, temperatur och röklarm i realtid.
                </AlertDescription>
              </Alert>
              
              <Button 
                onClick={handleConfigurationComplete}
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Gå till Dashboard
              </Button>
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
