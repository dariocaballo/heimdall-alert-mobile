import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Wifi, 
  WifiOff, 
  Battery, 
  Thermometer, 
  AlertTriangle, 
  Smartphone,
  Router,
  Cloud,
  Zap,
  Settings,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ShellyDevice {
  device_id: string;
  online: boolean;
  smoke: boolean;
  temperature?: number;
  battery_level?: number;
  signal_strength?: number;
  last_seen: string;
  raw_data?: any;
  generation?: 1 | 2;
  model?: string;
}

interface ShellyDeviceManagerProps {
  userCode: string;
}

export const ShellyDeviceManager = ({ userCode }: ShellyDeviceManagerProps) => {
  const [devices, setDevices] = useState<ShellyDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<ShellyDevice | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadDevices();
    // Set up real-time subscription for device status updates
    const subscription = supabase
      .channel('device_status_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'device_status',
          filter: `user_code=eq.${userCode}`
        },
        (payload) => {
          console.log('Device status change:', payload);
          loadDevices(); // Reload devices when status changes
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [userCode]);

  const loadDevices = async () => {
    try {
      const { data, error } = await supabase
        .from('device_status')
        .select('*')
        .eq('user_code', userCode)
        .order('last_seen', { ascending: false });

      if (error) throw error;

      const formattedDevices: ShellyDevice[] = data.map(device => ({
        device_id: device.device_id,
        online: device.online || false,
        smoke: device.smoke || false,
        temperature: device.temperature,
        battery_level: device.battery_level,
        signal_strength: device.signal_strength,
        last_seen: device.last_seen,
        raw_data: device.raw_data,
        generation: (device.raw_data as any)?.gen || 2,
        model: (device.raw_data as any)?.model || 'Unknown'
      }));

      setDevices(formattedDevices);
    } catch (error) {
      console.error('Error loading devices:', error);
      toast({
        title: "Fel vid laddning",
        description: "Kunde inte ladda enheter",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testDevice = async (deviceId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('test_alarm', {
        body: { deviceId, userCode }
      });

      if (error) throw error;

      toast({
        title: "Test skickat",
        description: `Testlarm skickat till enhet ${deviceId}`,
      });
    } catch (error) {
      console.error('Error testing device:', error);
      toast({
        title: "Test misslyckades",
        description: "Kunde inte skicka testlarm",
        variant: "destructive",
      });
    }
  };

  const getDeviceStatusBadge = (device: ShellyDevice) => {
    if (!device.online) {
      return <Badge variant="destructive"><WifiOff className="w-3 h-3 mr-1" />Offline</Badge>;
    }
    if (device.smoke) {
      return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />LARM!</Badge>;
    }
    return <Badge variant="default" className="bg-green-500"><Wifi className="w-3 h-3 mr-1" />Online</Badge>;
  };

  const getGenerationIcon = (generation?: number) => {
    switch (generation) {
      case 1:
        return <Router className="w-4 h-4" />;
      case 2:
        return <Cloud className="w-4 h-4" />;
      default:
        return <Smartphone className="w-4 h-4" />;
    }
  };

  const formatLastSeen = (lastSeen: string) => {
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just nu';
    if (diffMins < 60) return `${diffMins} min sedan`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} tim sedan`;
    return `${Math.floor(diffMins / 1440)} dagar sedan`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Laddar enheter...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Shelly-enheter ({devices.length})
          </CardTitle>
          <CardDescription>
            Hantera och övervaka dina Shelly-enheter i realtid
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {devices.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Inga enheter hittades. Konfigurera dina Shelly-enheter först genom att:
                <br />
                <br />
                <strong>För Gen1-enheter:</strong>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>• Aktivera CoIoT i enhetsinställningarna</li>
                  <li>• Sätt peer till din servers IP och port 5683</li>
                </ul>
                <br />
                <strong>För Gen2+ enheter:</strong>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>• Konfigurera Outbound WebSocket</li>
                  <li>• Anslut via Fleet Manager eller direkt WebSocket</li>
                </ul>
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {devices.map((device) => (
                <Card key={device.device_id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getGenerationIcon(device.generation)}
                        <span className="font-medium truncate">
                          {device.device_id}
                        </span>
                      </div>
                      {getDeviceStatusBadge(device)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {device.model} • Gen{device.generation}
                    </p>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {device.temperature !== undefined && (
                        <div className="flex items-center gap-1">
                          <Thermometer className="w-3 h-3" />
                          <span>{device.temperature}°C</span>
                        </div>
                      )}
                      
                      {device.battery_level !== undefined && (
                        <div className="flex items-center gap-1">
                          <Battery className="w-3 h-3" />
                          <span>{device.battery_level}%</span>
                        </div>
                      )}
                      
                      {device.signal_strength !== undefined && (
                        <div className="flex items-center gap-1">
                          <Wifi className="w-3 h-3" />
                          <span>{device.signal_strength} dBm</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1 col-span-2">
                        <span className="text-xs text-muted-foreground">
                          Senast sedd: {formatLastSeen(device.last_seen)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => testDevice(device.device_id)}
                        disabled={!device.online}
                        className="flex-1"
                      >
                        <Zap className="w-3 h-3 mr-1" />
                        Test
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedDevice(device)}
                        className="flex-1"
                      >
                        <Settings className="w-3 h-3 mr-1" />
                        Info
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedDevice && (
        <Card>
          <CardHeader>
            <CardTitle>Enhetsinformation: {selectedDevice.device_id}</CardTitle>
            <CardDescription>Detaljerad information och rådata</CardDescription>
          </CardHeader>
          
          <CardContent>
            <Tabs defaultValue="status" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="status">Status</TabsTrigger>
                <TabsTrigger value="raw">Rådata</TabsTrigger>
              </TabsList>
              
              <TabsContent value="status" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Grundläggande status</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Online:</span>
                        <span>{selectedDevice.online ? '✅' : '❌'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Röklarm:</span>
                        <span>{selectedDevice.smoke ? '🚨 LARM' : '✅ OK'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Generation:</span>
                        <span>Gen{selectedDevice.generation}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Modell:</span>
                        <span>{selectedDevice.model}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Sensorer</h4>
                    <div className="space-y-1 text-sm">
                      {selectedDevice.temperature !== undefined && (
                        <div className="flex justify-between">
                          <span>Temperatur:</span>
                          <span>{selectedDevice.temperature}°C</span>
                        </div>
                      )}
                      {selectedDevice.battery_level !== undefined && (
                        <div className="flex justify-between">
                          <span>Batteri:</span>
                          <span>{selectedDevice.battery_level}%</span>
                        </div>
                      )}
                      {selectedDevice.signal_strength !== undefined && (
                        <div className="flex justify-between">
                          <span>Signalstyrka:</span>
                          <span>{selectedDevice.signal_strength} dBm</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Senast sedd:</span>
                        <span>{formatLastSeen(selectedDevice.last_seen)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="raw">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Rådata från enhet</h4>
                  <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-64">
                    {JSON.stringify(selectedDevice.raw_data, null, 2)}
                  </pre>
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="mt-4 flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setSelectedDevice(null)}
                className="flex-1"
              >
                Stäng
              </Button>
              <Button 
                onClick={() => testDevice(selectedDevice.device_id)}
                disabled={!selectedDevice.online}
                className="flex-1"
              >
                <Zap className="w-4 h-4 mr-2" />
                Testa enhet
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};