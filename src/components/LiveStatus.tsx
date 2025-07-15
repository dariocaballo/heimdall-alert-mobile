import { useState, useEffect } from "react";
import { Activity, Thermometer, Battery, Wifi, AlertTriangle, CheckCircle, Flame, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface DeviceStatus {
  deviceId: string;
  deviceName: string;
  online: boolean;
  smoke: boolean;
  temperature?: number;
  batteryLevel?: number;
  signalStrength?: number;
  lastSeen: string;
  rawData?: any;
}

interface LiveStatusProps {
  userCode: string;
  devices: string[];
}

const LiveStatus = ({ userCode, devices }: LiveStatusProps) => {
  const [deviceStatuses, setDeviceStatuses] = useState<DeviceStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadDeviceStatuses();
    // Set up real-time updates
    const interval = setInterval(loadDeviceStatuses, 30000); // Update every 30 seconds
    
    // Set up Supabase real-time subscription for device status
    const deviceChannel = supabase
      .channel('device-status-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'device_status',
          filter: `user_code=eq.${userCode}`
        },
        (payload) => {
          console.log('Real-time device status update:', payload);
          loadDeviceStatuses();
        }
      )
      .subscribe();

    // Set up real-time subscription for alarms
    const alarmChannel = supabase
      .channel('alarm-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alarms',
          filter: `user_code=eq.${userCode}`
        },
        (payload) => {
          console.log('New alarm detected:', payload);
          const newAlarm = payload.new as any;
          if (newAlarm.smoke) {
            toast({
              title: "🚨 BRANDLARM AKTIVERAT!",
              description: `Rök upptäckt på ${newAlarm.device_id}`,
              variant: "destructive",
            });
          }
          loadDeviceStatuses();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(deviceChannel);
      supabase.removeChannel(alarmChannel);
    };
  }, [userCode]);

  const loadDeviceStatuses = async () => {
    if (!devices.length) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('get_device_status', {
        body: { user_code: userCode }
      });

      if (error) {
        console.error('Error loading device statuses:', error);
        toast({
          title: "Fel vid hämtning",
          description: "Kunde inte hämta enhetsstatus. Försök igen.",
          variant: "destructive",
        });
        return;
      }

      const statuses = data?.devices?.map((device: any) => ({
        deviceId: device.device_id,
        deviceName: device.name || device.device_id?.slice(-4) || 'Unknown',
        online: device.online || false,
        smoke: device.smoke || false,
        temperature: device.temperature,
        batteryLevel: device.battery,
        signalStrength: device.signal,
        lastSeen: device.last_seen,
        rawData: device.raw_data
      })) || [];

      setDeviceStatuses(statuses);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading device statuses:', error);
      toast({
        title: "Nätverksfel",
        description: "Kunde inte ansluta till servern",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (device: DeviceStatus) => {
    if (device.smoke) return 'bg-red-500';
    if (!device.online) return 'bg-gray-500';
    return 'bg-green-500';
  };

  const getStatusText = (device: DeviceStatus) => {
    if (device.smoke) return 'RÖK UPPTÄCKT!';
    if (!device.online) return 'Offline';
    return 'Online';
  };

  const getBatteryIcon = (level?: number) => {
    if (!level) return <Battery className="w-4 h-4 text-gray-400" />;
    if (level < 20) return <Battery className="w-4 h-4 text-red-500" />;
    if (level < 50) return <Battery className="w-4 h-4 text-yellow-500" />;
    return <Battery className="w-4 h-4 text-green-500" />;
  };

  const getSignalIcon = (strength?: number) => {
    if (!strength) return <Wifi className="w-4 h-4 text-gray-400" />;
    if (strength < 30) return <Wifi className="w-4 h-4 text-red-500" />;
    if (strength < 70) return <Wifi className="w-4 h-4 text-yellow-500" />;
    return <Wifi className="w-4 h-4 text-green-500" />;
  };

  const formatLastSeen = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Nu';
    if (diffMins < 60) return `${diffMins} min sedan`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h sedan`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} dagar sedan`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="w-5 h-5" />
              <span>Live Status</span>
            </CardTitle>
            <CardDescription>Laddar enhetsstatus...</CardDescription>
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
              <CardTitle className="flex items-center space-x-2">
                <Activity className="w-5 h-5" />
                <span>Live Status</span>
              </CardTitle>
              <CardDescription>
                Aktuell status för dina brandvarnare
                {lastUpdate && (
                  <span className="block text-xs text-gray-500 mt-1">
                    Senast uppdaterad: {lastUpdate.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadDeviceStatuses}
              className="text-blue-600 hover:text-blue-700"
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Uppdatera
            </Button>
          </div>
        </CardHeader>
      </Card>

      {deviceStatuses.length === 0 ? (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Inga enheter hittades.</strong> Kontrollera att dina brandvarnare är kopplade och skickar data.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {deviceStatuses.map((device) => (
            <Card key={device.deviceId} className={`border-l-4 ${device.smoke ? 'border-l-red-500' : device.online ? 'border-l-green-500' : 'border-l-gray-500'}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{device.deviceName}</CardTitle>
                    <CardDescription className="text-xs">{device.deviceId}</CardDescription>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(device)}`}></div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2">
                  {device.smoke ? (
                    <Flame className="w-5 h-5 text-red-500" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  <Badge className={device.smoke ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                    {getStatusText(device)}
                  </Badge>
                </div>

                {device.temperature && (
                  <div className="flex items-center space-x-2 text-sm">
                    <Thermometer className="w-4 h-4 text-blue-500" />
                    <span>{device.temperature}°C</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-sm">
                  {device.batteryLevel !== undefined && (
                    <div className="flex items-center space-x-1">
                      {getBatteryIcon(device.batteryLevel)}
                      <span>{device.batteryLevel}%</span>
                    </div>
                  )}
                  
                  {device.signalStrength !== undefined && (
                    <div className="flex items-center space-x-1">
                      {getSignalIcon(device.signalStrength)}
                      <span>{device.signalStrength}%</span>
                    </div>
                  )}
                </div>

                <div className="text-xs text-gray-500 border-t pt-2">
                  Senast sedd: {formatLastSeen(device.lastSeen)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-green-800 flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>Om live status</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-green-700">
          <ul className="space-y-2 text-sm">
            <li>• <strong>Grön</strong> - Enheten är online och fungerar normalt</li>
            <li>• <strong>Röd</strong> - RÖK UPPTÄCKT! Omedelbar åtgärd krävs</li>
            <li>• <strong>Grå</strong> - Enheten är offline eller svarar inte</li>
            <li>• <strong>Automatisk uppdatering</strong> - Status uppdateras var 30:e sekund</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default LiveStatus;