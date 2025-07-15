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
    
    // Set up real-time updates every 30 seconds
    const interval = setInterval(loadDeviceStatuses, 30000);
    
    // Set up Shelly Cloud API polling as backup every 2 minutes
    const pollInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('shelly_cloud_api', {
          body: { user_code: userCode }
        });
        
        if (!error && data?.success) {
          console.log('Shelly Cloud API polling successful:', data);
          loadDeviceStatuses();
        }
      } catch (error) {
        console.log('Shelly Cloud API polling failed:', error);
      }
    }, 120000); // Every 2 minutes
    
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
      clearInterval(pollInterval);
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
            <Card key={device.deviceId} className={`relative overflow-hidden ${device.smoke ? 'border-2 border-red-500 bg-red-50' : 'border border-gray-200 bg-white'}`}>
              {device.smoke && (
                <div className="absolute top-0 right-0 w-full h-1 bg-red-500 animate-pulse"></div>
              )}
              
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      device.smoke ? 'bg-red-100' : device.online ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      {device.smoke ? (
                        <Flame className="w-6 h-6 text-red-600" />
                      ) : device.online ? (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      ) : (
                        <Activity className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold">{device.deviceName}</CardTitle>
                      <CardDescription className="text-xs font-mono">{device.deviceId.slice(-8)}</CardDescription>
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-full ${getStatusColor(device)} ${device.smoke ? 'animate-pulse' : ''}`}></div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Status Badge - Shelly Style */}
                <div className="flex items-center justify-center">
                  <Badge className={`px-4 py-2 text-sm font-medium ${
                    device.smoke 
                      ? 'bg-red-500 text-white border-red-500' 
                      : device.online 
                        ? 'bg-green-500 text-white border-green-500' 
                        : 'bg-gray-500 text-white border-gray-500'
                  }`}>
                    {getStatusText(device)}
                  </Badge>
                </div>

                {/* Critical Alert for Smoke */}
                {device.smoke && (
                  <div className="bg-red-500 text-white p-3 rounded-lg text-center animate-pulse">
                    <div className="flex items-center justify-center space-x-2">
                      <Flame className="w-5 h-5" />
                      <span className="font-bold">BRANDLARM!</span>
                    </div>
                    <p className="text-sm mt-1">Kontrollera området omedelbart</p>
                  </div>
                )}

                {/* Sensor Data Grid - Shelly Style */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Temperature */}
                  <div className="bg-blue-50 p-3 rounded-lg text-center">
                    <Thermometer className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                    <div className="text-lg font-semibold text-blue-900">
                      {device.temperature ? `${device.temperature}°C` : '---'}
                    </div>
                    <div className="text-xs text-blue-600">Temperatur</div>
                  </div>

                  {/* Battery */}
                  <div className={`p-3 rounded-lg text-center ${
                    device.batteryLevel && device.batteryLevel > 50 ? 'bg-green-50' : 'bg-yellow-50'
                  }`}>
                    <div className="flex justify-center mb-1">
                      {getBatteryIcon(device.batteryLevel)}
                    </div>
                    <div className={`text-lg font-semibold ${
                      device.batteryLevel && device.batteryLevel > 50 ? 'text-green-900' : 'text-yellow-900'
                    }`}>
                      {device.batteryLevel ? `${device.batteryLevel}%` : '---'}
                    </div>
                    <div className={`text-xs ${
                      device.batteryLevel && device.batteryLevel > 50 ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      Batteri
                    </div>
                  </div>

                  {/* Signal Strength */}
                  <div className="bg-purple-50 p-3 rounded-lg text-center">
                    <div className="flex justify-center mb-1">
                      {getSignalIcon(device.signalStrength)}
                    </div>
                    <div className="text-lg font-semibold text-purple-900">
                      {device.signalStrength ? `${device.signalStrength}%` : '---'}
                    </div>
                    <div className="text-xs text-purple-600">Signal</div>
                  </div>

                  {/* Last Seen */}
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <Activity className="w-5 h-5 text-gray-600 mx-auto mb-1" />
                    <div className="text-sm font-semibold text-gray-900">
                      {formatLastSeen(device.lastSeen)}
                    </div>
                    <div className="text-xs text-gray-600">Senast sedd</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800 flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>Realtidsövervakning</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Statusindikationer:</h4>
              <ul className="space-y-1">
                <li className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Online och fungerar</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>BRANDLARM AKTIVERAT</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                  <span>Offline eller inte tillgänglig</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Uppdateringsfrekvens:</h4>
              <ul className="space-y-1">
                <li>• Realtidsdata via webhook</li>
                <li>• Backup-polling var 2:a minut</li>
                <li>• Automatisk uppdatering var 30:e sekund</li>
                <li>• Fungerar även när du inte är hemma</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LiveStatus;