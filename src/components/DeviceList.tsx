import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertTriangle, CheckCircle, Wifi, WifiOff, Battery, Thermometer, AlarmSmoke, LogOut, Plus, Settings, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ShellyDeviceSetup from "./ShellyDeviceSetup";
import { AlertDialog as AlertDialogComponent, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface DeviceStatus {
  device_id: string;
  last_seen?: string;
  battery?: boolean;
  temperature?: number;
  smoke?: boolean;
  online: boolean;
}

interface DeviceListProps {
  devices: string[];
  userCode: string;
  onLogout: () => void;
  onDevicesUpdate: (devices: string[]) => void;
}

const DeviceList = ({ devices, userCode, onLogout, onDevicesUpdate }: DeviceListProps) => {
  const [deviceStatuses, setDeviceStatuses] = useState<DeviceStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [removingDeviceId, setRemovingDeviceId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchDeviceStatuses = async () => {
    try {
      const statuses: DeviceStatus[] = [];
      
      for (const deviceId of devices) {
        // Get latest alarm data for each device
        const { data: alarmData, error } = await supabase
          .from('alarms')
          .select('*')
          .eq('id', deviceId) // Assuming device_id is stored in id field, adjust if needed
          .order('timestamp', { ascending: false })
          .limit(1);

        if (error) {
          console.error('Error fetching alarm data:', error);
        }

        const latest = alarmData?.[0];
        const status: DeviceStatus = {
          device_id: deviceId,
          last_seen: latest?.timestamp,
          battery: latest?.battery,
          temperature: latest?.temp,
          smoke: latest?.smoke,
          online: latest ? new Date(latest.timestamp).getTime() > Date.now() - 300000 : false // 5 min
        };
        
        statuses.push(status);
      }
      
      setDeviceStatuses(statuses);
    } catch (error) {
      console.error('Error fetching device statuses:', error);
      toast({
        title: "Fel vid hämtning",
        description: "Kunde inte hämta status för brandvarnare",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDeviceStatuses();
    
    // Set up real-time updates
    const channel = supabase
      .channel('alarms-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'alarms'
        },
        () => {
          fetchDeviceStatuses();
        }
      )
      .subscribe();

    // Refresh every 30 seconds
    const interval = setInterval(fetchDeviceStatuses, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [devices]);

  const handleLogout = () => {
    localStorage.removeItem('user_code');
    localStorage.removeItem('user_devices');
    onLogout();
  };

  const removeDevice = async (deviceId: string) => {
    setRemovingDeviceId(deviceId);
    try {
      const { data, error } = await supabase.functions.invoke('remove_device', {
        body: { 
          user_code: userCode, 
          device_id: deviceId 
        }
      });

      if (error) {
        console.error('Error removing device:', error);
        toast({
          title: "Fel vid borttagning",
          description: "Kunde inte ta bort enheten. Försök igen.",
          variant: "destructive",
        });
        return;
      }

      if (data?.success) {
        const updatedDevices = devices.filter(id => id !== deviceId);
        localStorage.setItem('user_devices', JSON.stringify(updatedDevices));
        onDevicesUpdate(updatedDevices);
        
        fetchDeviceStatuses();
        
        toast({
          title: "Enhet borttagen!",
          description: "Brandvarnaren har tagits bort från ditt konto",
        });
      } else {
        toast({
          title: "Fel vid borttagning",
          description: data?.error || "Kunde inte ta bort enheten",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Remove device error:', error);
      toast({
        title: "Nätverksfel",
        description: "Kunde inte ansluta till servern",
        variant: "destructive",
      });
    } finally {
      setRemovingDeviceId(null);
    }
  };

  const handleDeviceAdded = (deviceId: string) => {
    const updatedDevices = [...devices, deviceId];
    localStorage.setItem('user_devices', JSON.stringify(updatedDevices));
    onDevicesUpdate(updatedDevices);
    setShowAddDialog(false);
    fetchDeviceStatuses();
    
    toast({
      title: "Enhet tillagd!",
      description: "Brandvarnaren har lagts till i ditt konto",
    });
  };

  const getDeviceName = (deviceId: string) => {
    const index = devices.indexOf(deviceId) + 1;
    return `Brandvarnare ${index}`;
  };

  const formatLastSeen = (timestamp?: string) => {
    if (!timestamp) return 'Aldrig';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
    
    if (diffMinutes < 1) return 'Nu';
    if (diffMinutes < 60) return `${diffMinutes} min sedan`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} h sedan`;
    return date.toLocaleDateString('sv-SE');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5" />
              <span>Mina brandvarnare</span>
            </CardTitle>
            <CardDescription>Laddar enheter...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center space-x-2">
                <Settings className="w-6 h-6" />
                <span>Mina brandvarnare</span>
              </CardTitle>
              <CardDescription>{devices.length} enheter registrerade</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logga ut
              </Button>
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button className="flex items-center space-x-2">
                    <Plus className="w-4 h-4" />
                    <span>Lägg till brandvarnare</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Lägg till ny brandvarnare</DialogTitle>
                    <DialogDescription>
                      Följ stegen för att ansluta din Shelly Plus Smoke brandvarnare
                    </DialogDescription>
                  </DialogHeader>
                  <div className="pt-4">
                    <ShellyDeviceSetup 
                      onConnectionChange={(connected) => {
                        if (connected) {
                          // Refresh device list when a new device is connected
                          setTimeout(() => {
                            fetchDeviceStatuses();
                          }, 1000);
                        }
                      }}
                      onDeviceAdded={handleDeviceAdded}
                      userCode={userCode}
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
          {deviceStatuses.map((status) => (
            <Card key={status.device_id} className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{getDeviceName(status.device_id)}</CardTitle>
                    <CardDescription className="font-mono text-xs">
                      {status.device_id}
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    {status.online ? (
                      <Badge className="bg-green-100 text-green-800">
                        <Wifi className="w-3 h-3 mr-1" />
                        Online
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <WifiOff className="w-3 h-3 mr-1" />
                        Offline
                      </Badge>
                    )}
                    <AlertDialogComponent>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={removingDeviceId === status.device_id}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Ta bort brandvarnare</AlertDialogTitle>
                          <AlertDialogDescription>
                            Är du säker på att du vill ta bort "{getDeviceName(status.device_id)}"? 
                            Detta kan inte ångras och enheten kommer inte längre att skicka notifikationer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Avbryt</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => removeDevice(status.device_id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            {removingDeviceId === status.device_id ? "Tar bort..." : "Ta bort"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialogComponent>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Smoke Status */}
                  <div className="flex items-center space-x-2">
                    <div className={`p-2 rounded-full ${status.smoke ? 'bg-red-100' : 'bg-green-100'}`}>
                      <AlarmSmoke className={`w-4 h-4 ${status.smoke ? 'text-red-600' : 'text-green-600'}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Rök</p>
                      <p className="text-xs text-gray-600">
                        {status.smoke ? 'Upptäckt!' : 'Ingen rök'}
                      </p>
                    </div>
                  </div>

                  {/* Battery Status */}
                  <div className="flex items-center space-x-2">
                    <div className={`p-2 rounded-full ${status.battery ? 'bg-green-100' : 'bg-yellow-100'}`}>
                      <Battery className={`w-4 h-4 ${status.battery ? 'text-green-600' : 'text-yellow-600'}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Batteri</p>
                      <p className="text-xs text-gray-600">
                        {status.battery ? 'Bra nivå' : 'Låg nivå'}
                      </p>
                    </div>
                  </div>

                  {/* Temperature */}
                  <div className="flex items-center space-x-2">
                    <div className="p-2 rounded-full bg-blue-100">
                      <Thermometer className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Temperatur</p>
                      <p className="text-xs text-gray-600">
                        {status.temperature ? `${status.temperature}°C` : 'Okänd'}
                      </p>
                    </div>
                  </div>

                  {/* Last Seen */}
                  <div className="flex items-center space-x-2">
                    <div className="p-2 rounded-full bg-gray-100">
                      <CheckCircle className="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Senast sedd</p>
                      <p className="text-xs text-gray-600">
                        {formatLastSeen(status.last_seen)}
                      </p>
                    </div>
                  </div>
                </div>

                {status.smoke && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <p className="text-sm font-medium text-red-800">
                        ⚠️ RÖK UPPTÄCKT! Kontrollera området omedelbart.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeviceList;