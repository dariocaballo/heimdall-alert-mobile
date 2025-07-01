
import { useState, useEffect } from "react";
import { Bell, Shield, History, Settings, AlertTriangle, CheckCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import AlarmHistory from "@/components/AlarmHistory";
import AutoDeviceSetup from "@/components/AutoDeviceSetup";
import StatusMonitor from "@/components/StatusMonitor";
import AlarmScreen from "@/components/AlarmScreen";

interface AlarmData {
  timestamp: Date;
  deviceId: string;
  location?: string;
}

const Index = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastAlarm, setLastAlarm] = useState<Date | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [showAlarmScreen, setShowAlarmScreen] = useState(false);
  const [currentAlarm, setCurrentAlarm] = useState<AlarmData | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Kontrollera anslutningsstatus vid start
    const checkConnection = () => {
      const connected = localStorage.getItem('shelly_connected') === 'true';
      setIsConnected(connected);
    };
    
    checkConnection();
    
    // Lyssna på push notifications och meddelanden
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'FIRE_ALARM') {
          handleFireAlarm(event.data);
        }
      });
    }

    // Simulera mottagning av larm för test
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Kontrollera om det finns ett väntande larm när appen öppnas
        const pendingAlarm = localStorage.getItem('pending_alarm');
        if (pendingAlarm) {
          const alarmData = JSON.parse(pendingAlarm);
          handleFireAlarm(alarmData);
          localStorage.removeItem('pending_alarm');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const handleFireAlarm = (data?: any) => {
    const alarmData: AlarmData = {
      timestamp: new Date(),
      deviceId: data?.deviceId || 'Shelly Plus Smoke',
      location: data?.location || 'Hemmet'
    };

    setLastAlarm(alarmData.timestamp);
    setCurrentAlarm(alarmData);
    setShowAlarmScreen(true);
    
    // Spara i historik
    const existingAlarms = JSON.parse(localStorage.getItem('alarm_history') || '[]');
    existingAlarms.unshift(alarmData);
    // Behåll endast de senaste 50 larmen
    if (existingAlarms.length > 50) {
      existingAlarms.splice(50);
    }
    localStorage.setItem('alarm_history', JSON.stringify(existingAlarms));

    toast({
      title: "🚨 BRANDLARM AKTIVERAT!",
      description: "Larmskärm visas. Kontrollera området omedelbart!",
      variant: "destructive",
    });
  };

  const testAlarm = async () => {
    setIsTesting(true);
    try {
      const response = await fetch('https://us-central1-id-bevakarna.cloudfunctions.net/sendTestAlarm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceId: 'test_device',
          timestamp: new Date().toISOString(),
        }),
      });
      
      if (response.ok) {
        toast({
          title: "Test skickat",
          description: "Testlarm skickat. Du bör få en pushnotis och larmskärm inom kort.",
        });

        // Simulera mottagning av testlarm efter 2 sekunder
        setTimeout(() => {
          handleFireAlarm({ deviceId: 'Testlarm', type: 'test' });
        }, 2000);
      } else {
        throw new Error('Failed to send test alarm');
      }
    } catch (error) {
      console.error('Test alarm error:', error);
      toast({
        title: "Fel vid test",
        description: "Kunde inte skicka testlarm. Kontrollera internetanslutningen.",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const dismissAlarm = () => {
    setShowAlarmScreen(false);
    setCurrentAlarm(null);
    
    toast({
      title: "Larm avaktiverat",
      description: "Larmskärmen är stängd. Kontrollera att området är säkert.",
    });
  };

  return (
    <>
      {/* Larmskärm - visas över allt annat */}
      {showAlarmScreen && currentAlarm && (
        <AlarmScreen 
          alarmData={currentAlarm} 
          onDismiss={dismissAlarm}
        />
      )}

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 bg-red-600 rounded-lg">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">BrandLarm Pro</h1>
                  <p className="text-sm text-gray-500">Komplett brandskydd för hemmet</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant={isConnected ? "default" : "secondary"} className="flex items-center space-x-1">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <span>{isConnected ? 'Ansluten' : 'Ej ansluten'}</span>
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Tabs defaultValue="dashboard" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="dashboard" className="flex items-center space-x-2">
                <Shield className="w-4 h-4" />
                <span>Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="setup" className="flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span>Installation</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center space-x-2">
                <History className="w-4 h-4" />
                <span>Historik</span>
              </TabsTrigger>
              <TabsTrigger value="status" className="flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span>Status</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-6">
              {/* Status Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">Systemstatus</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-3">
                      {isConnected ? (
                        <>
                          <CheckCircle className="w-8 h-8 text-green-500" />
                          <div>
                            <p className="text-lg font-semibold text-green-600">Aktiv</p>
                            <p className="text-sm text-gray-500">Brandvarnare ansluten</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-8 h-8 text-orange-500" />
                          <div>
                            <p className="text-lg font-semibold text-orange-600">Ej ansluten</p>
                            <p className="text-sm text-gray-500">Gå till Installation</p>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">Senaste larm</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-3">
                      <Bell className="w-8 h-8 text-gray-400" />
                      <div>
                        {lastAlarm ? (
                          <>
                            <p className="text-lg font-semibold text-gray-900">
                              {lastAlarm.toLocaleDateString('sv-SE')}
                            </p>
                            <p className="text-sm text-gray-500">
                              {lastAlarm.toLocaleTimeString('sv-SE')}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-lg font-semibold text-gray-900">Inget larm</p>
                            <p className="text-sm text-gray-500">Allt fungerar normalt</p>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">Nödnummer</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-3">
                      <Phone className="w-8 h-8 text-red-500" />
                      <div>
                        <Button 
                          variant="link" 
                          className="p-0 h-auto text-lg font-semibold text-red-600"
                          onClick={() => window.location.href = 'tel:112'}
                        >
                          112
                        </Button>
                        <p className="text-sm text-gray-500">SOS Alarm</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Test Alarm Button */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Bell className="w-5 h-5" />
                    <span>Testa larm</span>
                  </CardTitle>
                  <CardDescription>
                    Verifiera att hela systemet fungerar - från brandvarnare till pushnotis och larmskärm
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={testAlarm}
                    disabled={isTesting}
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                    size="lg"
                  >
                    {isTesting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Skickar testlarm...
                      </>
                    ) : (
                      <>
                        <Bell className="w-4 h-4 mr-2" />
                        🔔 Testa komplett larm
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Safety Information */}
              <Card className="border-orange-200 bg-orange-50">
                <CardHeader>
                  <CardTitle className="text-orange-800 flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span>Säkerhetsinformation</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-orange-700">
                  <ul className="space-y-2 text-sm">
                    <li>• Vid verkligt brandlarm - ring 112 omedelbart</li>
                    <li>• Testa larmet månadsvis med knappen ovan</li>
                    <li>• Håll utrymningsvägar fria från hinder</li>
                    <li>• Kontrollera att alla i familjen vet hur appen fungerar</li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="setup">
              <AutoDeviceSetup onConnectionChange={setIsConnected} />
            </TabsContent>

            <TabsContent value="history">
              <AlarmHistory />
            </TabsContent>

            <TabsContent value="status">
              <StatusMonitor />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default Index;
