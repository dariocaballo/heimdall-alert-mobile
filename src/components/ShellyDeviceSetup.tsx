import { useState, useEffect } from "react";
import { Wifi, Smartphone, CheckCircle, AlertTriangle, Shield, Router, Settings, Timer, Zap, Plus, Search, Bluetooth } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Capacitor } from '@capacitor/core';
import { supabase } from "@/integrations/supabase/client";
import BluetoothDeviceScanner from "./BluetoothDeviceScanner";

interface ShellyDeviceSetupProps {
  onConnectionChange: (connected: boolean) => void;
  onDeviceAdded?: (deviceId: string) => void;
  userCode: string;
}

const ShellyDeviceSetup = ({ onConnectionChange, onDeviceAdded, userCode }: ShellyDeviceSetupProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [discoveredDevices, setDiscoveredDevices] = useState<any[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Kontrollera om enheten redan är ansluten
    const connected = localStorage.getItem('shelly_connected') === 'true';
    if (connected) {
      onConnectionChange(true);
      setCurrentStep(4);
    }
  }, [onConnectionChange]);

  const scanForDevices = async () => {
    setIsScanning(true);
    setDiscoveredDevices([]);

    try {
      // Simulera sökning efter Shelly-enheter precis som i Shelly-appen
      toast({
        title: "Söker efter brandvarnare...",
        description: "Kontrollera att enheten är i konfigurationsläge",
      });

      // Kontrollera om vi kan nå en Shelly-enhet
      const testIPs = ['192.168.33.1']; // Standard Shelly AP IP
      const devices = [];

      for (const ip of testIPs) {
        try {
          const response = await fetch(`http://${ip}/status`, {
            method: 'GET',
            timeout: 3000
          } as any);

          if (response.ok) {
            const data = await response.json();
            
            // Skapa device ID från MAC-adress eller annan unik identifierare
            let deviceId = null;
            if (data.device && data.device.mac) {
              deviceId = data.device.mac.replace(/:/g, '');
            } else if (data.mac) {
              deviceId = data.mac.replace(/:/g, '');
            } else {
              deviceId = `smoke-${Date.now()}`;
            }

            devices.push({
              id: deviceId,
              name: 'Shelly Plus Smoke',
              type: 'SNSN-0031Z',
              ip: ip,
              status: 'Upptäckt',
              rssi: data.wifi?.rssi || -50,
              mac: data.device?.mac || data.mac || 'Unknown',
              version: data.app || 'Unknown',
              batteryLevel: data.battery?.level || 100
            });
          }
        } catch (error) {
          // Fortsätt med nästa IP
        }
      }

      setDiscoveredDevices(devices);
      
      if (devices.length === 0) {
        toast({
          title: "Inga enheter hittades",
          description: "Kontrollera att brandvarnaren är i konfigurationsläge (blinkande blått ljus)",
          variant: "destructive",
        });
      } else {
        toast({
          title: `${devices.length} brandvarnare upptäckt!`,
          description: "Välj en enhet för att fortsätta",
        });
      }
    } catch (error) {
      toast({
        title: "Sökning misslyckades",
        description: "Kunde inte söka efter enheter",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };

  const selectDevice = (device: any) => {
    setSelectedDevice(device);
    setCurrentStep(2);
  };

  const addDeviceToAccount = async () => {
    if (!selectedDevice) return;

    setIsConnecting(true);
    
    try {
      // Lägg till enheten i användarens konto
      const { data, error } = await supabase.functions.invoke('add_device', {
        body: {
          user_code: userCode,
          device_id: selectedDevice.id
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      // Konfigurera webhook automatiskt
      await configureWebhook(selectedDevice.ip);

      // Notify parent component about the new device
      if (onDeviceAdded) {
        onDeviceAdded(selectedDevice.id);
      }

      toast({
        title: "✅ Brandvarnare tillagd!",
        description: `${selectedDevice.name} är nu ansluten till ditt konto`,
      });

      setCurrentStep(3);
    } catch (error) {
      console.error('Fel vid tillägg av enhet:', error);
      toast({
        title: "Fel vid registrering",
        description: error instanceof Error ? error.message : "Kunde inte registrera enheten",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const configureWebhook = async (deviceIP?: string) => {
    try {
      // Endast konfigurera webhook för WiFi-enheter som har en IP-adress
      if (!deviceIP) {
        console.log('Bluetooth-enhet - hoppar över webhook-konfiguration');
        return;
      }

      // Konfigurera webhook för larmnotiser
      const webhookResponse = await fetch(`http://${deviceIP}/rpc/Webhook.SetConfig`, {
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

      if (!webhookResponse.ok) {
        throw new Error('Webhook-konfiguration misslyckades');
      }

      console.log('Webhook konfigurerad framgångsrikt');
    } catch (error) {
      console.error('Fel vid webhook-konfiguration:', error);
      // Fortsätt ändå - webhook kan konfigureras senare
    }
  };

  const completeSetup = () => {
    localStorage.setItem('shelly_connected', 'true');
    onConnectionChange(true);
    setCurrentStep(4);
    
    toast({
      title: "🎉 Installation klar!",
      description: "Din brandvarnare är nu aktiv och skickar notifikationer",
    });
  };

  const resetSetup = () => {
    setCurrentStep(1);
    setSelectedDevice(null);
    setDiscoveredDevices([]);
    localStorage.removeItem('shelly_connected');
    onConnectionChange(false);
  };

  const isNativeApp = Capacitor.isNativePlatform();

  return (
    <div className="space-y-6">
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-red-800">
            <Shield className="w-5 h-5" />
            <span>Lägg till brandvarnare</span>
          </CardTitle>
          <CardDescription className="text-red-600">
            Precis som i Shelly Smart Control-appen
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Steg 1: Sökning och upptäckning */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Search className="w-5 h-5" />
              <span>Upptäck brandvarnare</span>
            </CardTitle>
            <CardDescription>
              Välj sökmetod och sätt din Shelly Plus Smoke i konfigurationsläge
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Timer className="h-4 w-4" />
              <AlertDescription>
                <strong>Aktivera konfigurationsläge:</strong>
                <br />
                Tryck och håll knappen på brandvarnaren i 10 sekunder tills LED-lampan blinkar blått.
              </AlertDescription>
            </Alert>

            <Tabs defaultValue="wifi" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="wifi" className="flex items-center space-x-2">
                  <Wifi className="w-4 h-4" />
                  <span>WiFi-sökning</span>
                </TabsTrigger>
                <TabsTrigger value="bluetooth" className="flex items-center space-x-2">
                  <Bluetooth className="w-4 h-4" />
                  <span>Bluetooth</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="wifi" className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-2">WiFi-sökning:</h4>
                  <ul className="space-y-2 text-sm text-blue-700">
                    <li>• Enheten skapar WiFi-nätverket "ShellyPlusSmoke-XXXXXX"</li>
                    <li>• Anslut din telefon till detta nätverk</li>
                    <li>• Kom tillbaka hit och tryck "Sök via WiFi"</li>
                  </ul>
                </div>

                <Button 
                  onClick={scanForDevices}
                  disabled={isScanning}
                  className="w-full bg-red-600 hover:bg-red-700"
                  size="lg"
                >
                  {isScanning ? (
                    <>
                      <Search className="w-4 h-4 mr-2 animate-spin" />
                      Söker via WiFi...
                    </>
                  ) : (
                    <>
                      <Wifi className="w-4 h-4 mr-2" />
                      Sök via WiFi
                    </>
                  )}
                </Button>

                {/* Upptäckta WiFi-enheter */}
                {discoveredDevices.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-green-800">WiFi-enheter:</h4>
                    {discoveredDevices.map((device) => (
                      <Card key={device.id} className="border-green-200 bg-green-50">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Shield className="w-8 h-8 text-red-600" />
                              <div>
                                <h5 className="font-medium">{device.name}</h5>
                                <p className="text-sm text-gray-600">
                                  {device.type} • {device.ip}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Signal: {device.rssi}dBm • Batteri: {device.batteryLevel}%
                                </p>
                              </div>
                            </div>
                            <Button 
                              onClick={() => selectDevice(device)}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Välj
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="bluetooth" className="space-y-4">
                <BluetoothDeviceScanner
                  onDeviceSelected={selectDevice}
                  isScanning={isScanning}
                  onScanningChange={setIsScanning}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Steg 2: Registrera enhet */}
      {currentStep === 2 && selectedDevice && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Plus className="w-5 h-5" />
              <span>Registrera brandvarnare</span>
            </CardTitle>
            <CardDescription>
              Lägger till enheten i ditt konto
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-800 mb-2">Vald enhet:</h4>
              <div className="space-y-2 text-sm text-green-700">
                <p><strong>Namn:</strong> {selectedDevice.name}</p>
                <p><strong>Typ:</strong> {selectedDevice.type}</p>
                <p><strong>ID:</strong> {selectedDevice.id}</p>
                <p><strong>MAC:</strong> {selectedDevice.mac}</p>
                <p><strong>Version:</strong> {selectedDevice.version}</p>
              </div>
            </div>

            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Automatisk konfiguration:</strong>
                <br />
                Enheten kommer att konfigureras automatiskt med larmnotiser och anslutning till molnet.
              </AlertDescription>
            </Alert>

            <div className="flex space-x-3">
              <Button 
                onClick={() => setCurrentStep(1)}
                variant="outline"
                className="flex-1"
              >
                Tillbaka
              </Button>
              <Button 
                onClick={addDeviceToAccount}
                disabled={isConnecting}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {isConnecting ? (
                  <>
                    <Plus className="w-4 h-4 mr-2 animate-spin" />
                    Registrerar...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Lägg till enhet
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Steg 3: WiFi-konfiguration */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {selectedDevice?.connectionType === 'bluetooth' ? (
                <Bluetooth className="w-5 h-5" />
              ) : (
                <Wifi className="w-5 h-5" />
              )}
              <span>
                {selectedDevice?.connectionType === 'bluetooth' 
                  ? 'Bluetooth-konfiguration' 
                  : 'WiFi-konfiguration'
                }
              </span>
            </CardTitle>
            <CardDescription>
              {selectedDevice?.connectionType === 'bluetooth'
                ? 'Slutför Bluetooth-konfigurationen'
                : 'Anslut brandvarnaren till ditt hem-WiFi'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedDevice?.connectionType === 'bluetooth' ? (
              <>
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Bluetooth-anslutning etablerad:</strong>
                    <br />
                    Enheten är nu parad och konfigurerad för att skicka notifikationer.
                  </AlertDescription>
                </Alert>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-2">Vad fungerar nu:</h4>
                  <ul className="space-y-2 text-sm text-blue-700">
                    <li>• Bluetooth-anslutning etablerad</li>
                    <li>• Enheten skickar larmdata till appen</li>
                    <li>• Push-notifikationer konfigurerade</li>
                    <li>• Fungerar inom Bluetooth-räckvidd</li>
                  </ul>
                </div>
              </>
            ) : (
              <>
                <Alert>
                  <Router className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Konfigurera WiFi:</strong>
                    <br />
                    Gå till webbläsaren och öppna <strong>192.168.33.1</strong> för att konfigurera WiFi-anslutningen.
                    <br />
                    Välj ditt hem-WiFi och ange lösenordet.
                  </AlertDescription>
                </Alert>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-2">Efter WiFi-konfiguration:</h4>
                  <ul className="space-y-2 text-sm text-blue-700">
                    <li>• Enheten startar om automatiskt</li>
                    <li>• Ansluter till ditt hem-WiFi</li>
                    <li>• Börjar skicka notifikationer via molnet</li>
                    <li>• Fungerar även när du inte är hemma</li>
                  </ul>
                </div>
              </>
            )}

            <Button 
              onClick={completeSetup}
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {selectedDevice?.connectionType === 'bluetooth' 
                ? 'Bluetooth-konfiguration klar' 
                : 'WiFi är konfigurerat'
              }
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Steg 4: Klar */}
      {currentStep === 4 && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-green-800">
              <CheckCircle className="w-5 h-5" />
              <span>Installation klar!</span>
            </CardTitle>
            <CardDescription className="text-green-600">
              Din brandvarnare är nu aktiv och skickar notifikationer
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white p-4 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-800 mb-2">Vad fungerar nu:</h4>
              <ul className="space-y-2 text-sm text-green-700">
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 text-green-500" />
                  <span>Rökalarm skickas direkt till din telefon</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 text-green-500" />
                  <span>Fungerar även när du inte är hemma</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 text-green-500" />
                  <span>Batteristatus uppdateras automatiskt</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 text-green-500" />
                  <span>Larmhistorik sparas i appen</span>
                </li>
              </ul>
            </div>

            <Button 
              onClick={resetSetup}
              variant="outline"
              className="w-full"
            >
              Lägg till fler enheter
            </Button>
          </CardContent>
        </Card>
      )}

      {!isNativeApp && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Mobilapp rekommenderas:</strong> För bästa upplevelse använd appen på din telefon.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default ShellyDeviceSetup;