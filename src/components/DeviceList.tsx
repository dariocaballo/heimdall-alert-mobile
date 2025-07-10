import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertTriangle, CheckCircle, Wifi, WifiOff, Battery, Thermometer, AlarmSmoke, LogOut, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  const [newDeviceId, setNewDeviceId] = useState("");
  const [isAddingDevice, setIsAddingDevice] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
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

  const addDevice = async () => {
    if (!newDeviceId.trim()) {
      toast({
        title: "Felaktig enhet",
        description: "Ange ett giltigt enhets-ID",
        variant: "destructive",
      });
      return;
    }

    setIsAddingDevice(true);
    try {
      const { data, error } = await supabase.functions.invoke('add_device', {
        body: { 
          user_code: userCode, 
          device_id: newDeviceId.trim() 
        }
      });

      if (error) {
        console.error('Error adding device:', error);
        toast({
          title: "Fel vid tillägg",
          description: "Kunde inte lägga till enheten. Försök igen.",
          variant: "destructive",
        });
        return;
      }

      if (data?.success) {
        const updatedDevices = [...devices, newDeviceId.trim()];
        localStorage.setItem('user_devices', JSON.stringify(updatedDevices));
        onDevicesUpdate(updatedDevices);
        
        setNewDeviceId("");
        setShowAddDialog(false);
        fetchDeviceStatuses();
        
        toast({
          title: "Enhet tillagd!",
          description: "Brandvarnaren har lagts till i ditt konto",
        });
      } else {
        toast({
          title: "Fel vid tillägg",
          description: data?.error || "Kunde inte lägga till enheten",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Add device error:', error);
      toast({
        title: "Nätverksfel",
        description: "Kunde inte ansluta till servern",
        variant: "destructive",
      });
    } finally {
      setIsAddingDevice(false);
    }
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <img 
                src="/lovable-uploads/159221d4-8b15-48f1-bec1-aeb59779cbf0.png" 
                alt="ID-Bevakarna Logo" 
                className="h-8 w-auto"
              />
              <div>
                <h1 className="text-xl font-bold text-blue-600">ID-Bevakarna</h1>
                <p className="text-xs text-gray-600">Brandskydd för hemmet</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logga ut
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Mina brandvarnare</h2>
            <p className="text-gray-600">{devices.length} enheter registrerade</p>
          </div>
          
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Lägg till brandvarnare</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Lägg till ny brandvarnare</DialogTitle>
                <DialogDescription>
                  Ange enhets-ID för din Shelly Smoke brandvarnare
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Enhets-ID
                  </label>
                  <Input
                    value={newDeviceId}
                    onChange={(e) => setNewDeviceId(e.target.value)}
                    placeholder="t.ex. shelly-smoke-001"
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Hittar du ID:t på enhetens etikett eller i Shelly-appen
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    onClick={addDevice}
                    disabled={!newDeviceId.trim() || isAddingDevice}
                    className="flex-1"
                  >
                    {isAddingDevice ? "Lägger till..." : "Lägg till"}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowAddDialog(false);
                      setNewDeviceId("");
                    }}
                  >
                    Avbryt
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

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
      </div>
    </div>
  );
};

export default DeviceList;