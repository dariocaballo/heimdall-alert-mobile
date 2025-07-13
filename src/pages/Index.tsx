
import { useState, useEffect } from "react";
import { Bell, Shield, History, Settings, AlertTriangle, CheckCircle, Phone } from "lucide-react";
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
import FirebaseSetup from "@/components/FirebaseSetup";
import { useFirebaseToken } from "@/hooks/useFirebaseToken";

interface AlarmData {
  timestamp: Date;
  deviceId: string;
  location?: string;
}

const Index = () => {
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

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserDevices([]);
    setUserCode("");
    setIsConnected(false);
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

  // Show login screen if not authenticated
  if (!isAuthenticated) {
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

      <div className="min-h-screen bg-background">
        <Tabs defaultValue="status" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="status">Live Status</TabsTrigger>
            <TabsTrigger value="history">Historik</TabsTrigger>
            <TabsTrigger value="devices">Enheter</TabsTrigger>
            <TabsTrigger value="firebase">Firebase</TabsTrigger>
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
            <DeviceList 
              devices={userDevices} 
              userCode={userCode}
              onLogout={handleLogout} 
              onDevicesUpdate={handleDevicesUpdate}
            />
          </TabsContent>

          <TabsContent value="firebase" className="mt-6">
            <div className="container mx-auto px-4">
              <FirebaseSetup />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default Index;
