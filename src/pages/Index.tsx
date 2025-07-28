
import { useState, useEffect } from "react";
import { Bell, Shield, History, Settings, AlertTriangle, CheckCircle, Phone, Users, Activity, LogOut } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import AlarmHistory from "@/components/AlarmHistory";
import LiveStatus from "@/components/LiveStatus";
import AlarmScreen from "@/components/AlarmScreen";
import CodeLogin from "@/components/CodeLogin";
import DeviceList from "@/components/DeviceList";
import CloudStatus from "@/components/FleetManager";
import { useFirebaseToken } from "@/hooks/useFirebaseToken";

interface AlarmData {
  timestamp: Date;
  deviceId: string;
  location?: string;
}

const Index = () => {
  const { user, loading, signOut } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userDevices, setUserDevices] = useState<string[]>([]);
  const [userCode, setUserCode] = useState<string>("");
  const [isConnected, setIsConnected] = useState(false);
  const [lastAlarm, setLastAlarm] = useState<Date | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [showAlarmScreen, setShowAlarmScreen] = useState(false);
  const [currentAlarm, setCurrentAlarm] = useState<AlarmData | null>(null);
  const [showFirebaseSetup, setShowFirebaseSetup] = useState(false);
  const { toast } = useToast();
  const { requestPermission, saveFcmTokenToSupabase, isSupported } = useFirebaseToken();

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuthentication = () => {
      const storedUserCode = localStorage.getItem('user_code');
      const devices = localStorage.getItem('user_devices');
      
      if (storedUserCode && devices) {
        try {
          const parsedDevices = JSON.parse(devices);
          setUserCode(storedUserCode);
          setUserDevices(parsedDevices);
          setIsAuthenticated(true);
          setIsConnected(true);
          
          // Request FCM permission for authenticated users
          requestPermission().then(token => {
            if (token) {
              saveFcmTokenToSupabase(token, storedUserCode);
            }
          });
        } catch (error) {
          console.error('Error parsing stored devices:', error);
          localStorage.removeItem('user_code');
          localStorage.removeItem('user_devices');
        }
      }
    };
    
    checkAuthentication();
    
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

  const handleLoginSuccess = (devices: string[], code: string) => {
    setUserDevices(devices);
    setUserCode(code);
    setIsAuthenticated(true);
    setIsConnected(true);
    
    // Request FCM permission after successful login
    requestPermission().then(token => {
      if (token) {
        saveFcmTokenToSupabase(token, code);
      }
    });
  };

  const handleLogout = async () => {
    await signOut();
    setIsAuthenticated(false);
    setUserDevices([]);
    setUserCode("");
    setIsConnected(false);
    localStorage.clear();
  };

  const handleDevicesUpdate = (newDevices: string[]) => {
    setUserDevices(newDevices);
  };

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

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Laddar...</p>
        </div>
      </div>
    );
  }

  // Show code login if not authenticated with Supabase OR with user code
  if (!user || !isAuthenticated) {
    return <CodeLogin onLoginSuccess={handleLoginSuccess} />;
  }

  // Show device list if authenticated
  return (
    <>
      {/* Larmskärm - visas över allt annat */}
      {showAlarmScreen && currentAlarm && (
        <AlarmScreen 
          alarmData={currentAlarm} 
          onDismiss={dismissAlarm}
        />
      )}

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-3">
                <img 
                  src="/lovable-uploads/159221d4-8b15-48f1-bec1-aeb59779cbf0.png" 
                  alt="ID-Bevakarna" 
                  className="h-10 w-auto"
                />
                <div>
                  <h1 className="text-2xl font-bold text-primary">ID-Bevakarna</h1>
                  <p className="text-sm text-muted-foreground">Professionellt Brandskydd</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Badge variant="outline" className="text-green-700 border-green-300">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Ansluten
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center space-x-1"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logga ut</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="status" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-white shadow-sm">
            <TabsTrigger value="status" className="flex items-center space-x-2">
              <Activity className="w-4 h-4" />
              <span>Live Status</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center space-x-2">
              <History className="w-4 h-4" />
              <span>Historik</span>
            </TabsTrigger>
            <TabsTrigger value="devices" className="flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Enheter</span>
            </TabsTrigger>
            <TabsTrigger value="fleet" className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>System</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="status" className="mt-6">
            <div className="container mx-auto px-4">
              <LiveStatus userCode={userCode} devices={userDevices} />
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <div className="container mx-auto px-4">
              <AlarmHistory userCode={userCode} />
            </div>
          </TabsContent>
          
          <TabsContent value="devices" className="mt-6">
            <div className="container mx-auto px-4">
              <DeviceList 
                devices={userDevices} 
                userCode={userCode}
                onLogout={handleLogout} 
                onDevicesUpdate={handleDevicesUpdate}
              />
            </div>
          </TabsContent>

          <TabsContent value="fleet" className="mt-6">
            <div className="container mx-auto px-4">
              <CloudStatus userCode={userCode} />
            </div>
          </TabsContent>

        </Tabs>
      </div>
    </>
  );
};

export default Index;
